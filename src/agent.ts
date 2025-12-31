import OpenAI from 'openai';
import { getAllTools, executeTool } from './tools/index.js';
import { getSkillsManager } from './skills/manager.js';
import fs from 'fs';
import path from 'path';
import type { AgentOptions, AgentStats, Message, ChatCallbacks, Session, ToolCall } from './types/index.js';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

// Providers that need special message handling (no native tool support)
const PROVIDERS_NO_TOOL_MESSAGES = ['glm', 'gemini'];

// Default max steps for agentic loop (like AI SDK's stopWhen)
const DEFAULT_MAX_STEPS = 20;

const DEFAULT_SYSTEM_PROMPT = `You are a helpful AI coding assistant running in a CLI environment.
You have access to tools to help accomplish tasks:
- bash: Execute shell commands
- read: Read file contents
- write: Write content to files
- edit: Edit files using search and replace
- glob: Find files matching patterns
- grep: Search for patterns in files

When the user asks you to perform tasks, use the appropriate tools.
Always explain what you're doing before using tools.
Be concise and helpful.`;

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

// Load project context from ZESBE.md, CLAUDE.md, or GEMINI.md
function loadProjectContext(cwd: string = process.cwd()): { file: string; content: string } | null {
  const contextFiles = ['ZESBE.md', 'CLAUDE.md', 'GEMINI.md', 'AI.md', '.ai/context.md'];

  for (const file of contextFiles) {
    const filePath = path.join(cwd, file);
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        return { file, content };
      } catch (_e) {
        // Ignore read errors
      }
    }
  }
  return null;
}

// Session storage directory
const SESSION_DIR = path.join(process.env.HOME || '~', '.zesbe', 'sessions');

function ensureSessionDir(): void {
  if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
  }
}

function getSessionPath(name: string = 'last'): string {
  ensureSessionDir();
  return path.join(SESSION_DIR, `${name}.json`);
}

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface StepResult {
  response: string;
  toolCalls: ToolCall[];
  hasToolCalls: boolean;
}

interface StepFinishInfo {
  stepNumber: number;
  text: string;
  toolCalls: ToolCall[];
  hasMoreSteps: boolean;
}

interface ExecuteStepParams {
  stepNumber: number;
  onStart?: (() => void) | null;
  onToken?: (token: string) => void;
  onToolCall?: (name: string, args: Record<string, any>) => Promise<boolean>;
  onToolResult?: (name: string, result: string | object) => void;
}

// Extended callbacks with onStepFinish
interface ExtendedChatCallbacks extends ChatCallbacks {
  onStepFinish?: (info: StepFinishInfo) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// AGENT CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class Agent {
  provider: string;
  model: string;
  yolo: boolean;
  stream: boolean;
  history: Message[];
  cwd: string;
  maxSteps: number;
  stats: AgentStats;
  projectContext: { file: string; content: string } | null;
  systemPrompt!: string;
  client!: OpenAI;
  private _apiKey?: string;
  private _baseUrl?: string;
  private _baseSystemPrompt: string;

  constructor(options: Partial<AgentOptions> = {}) {
    this.provider = options.provider || 'openai';
    this.model = options.model || 'gpt-4o';
    this._apiKey = options.apiKey;
    this._baseUrl = options.baseUrl;
    this.yolo = options.yolo || false;
    this.stream = options.stream !== false;
    this.history = [];
    this.cwd = options.cwd || process.cwd();

    // Agentic loop settings (like AI SDK)
    this.maxSteps = (options as any).maxSteps || DEFAULT_MAX_STEPS;

    // Stats tracking
    this.stats = {
      totalTokens: 0,
      promptTokens: 0,
      completionTokens: 0,
      requests: 0,
      toolCalls: 0,
      startTime: Date.now()
    };

    // Load project context
    this.projectContext = loadProjectContext(this.cwd);

    // Store base system prompt
    this._baseSystemPrompt = options.systemPrompt || DEFAULT_SYSTEM_PROMPT;

    // Build full system prompt
    this._buildSystemPrompt();

    // Initialize OpenAI client (works with any OpenAI-compatible API)
    this._initClient();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SYSTEM PROMPT
  // ═══════════════════════════════════════════════════════════════════════════

  private _buildSystemPrompt(): void {
    let systemPrompt = this._baseSystemPrompt;

    // Add project context
    if (this.projectContext) {
      systemPrompt += `\n\n## Project Context (from ${this.projectContext.file}):\n${this.projectContext.content}`;
    }

    // Add loaded skills
    const skillsManager = getSkillsManager();
    const skillsContext = skillsManager.getSkillsContext();
    if (skillsContext) {
      systemPrompt += skillsContext;
    }

    this.systemPrompt = systemPrompt;
  }

  refreshSystemPrompt(): void {
    this._buildSystemPrompt();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PROVIDER-SPECIFIC MESSAGE FORMATTING
  // ═══════════════════════════════════════════════════════════════════════════

  // Check if current provider supports native tool calling
  private _supportsTools(): boolean {
    return !PROVIDERS_NO_TOOL_MESSAGES.includes(this.provider);
  }

  // Format messages for providers that don't support tool messages (GLM, Gemini)
  private _formatMessagesForProvider(messages: any[]): any[] {
    if (this._supportsTools()) {
      return messages;
    }

    // For GLM/Gemini: Convert tool messages to user messages
    const formatted: any[] = [];

    for (const msg of messages) {
      if (msg.role === 'tool') {
        // Convert tool message to user message with tool result context
        formatted.push({
          role: 'user',
          content: `[Tool Result: ${msg.tool_call_id || 'unknown'}]\n${msg.content}`
        });
      } else if (msg.role === 'assistant' && msg.tool_calls) {
        // For assistant messages with tool_calls, add info about tool calls
        const toolCallInfo = msg.tool_calls.map((tc: any) =>
          `[Calling tool: ${tc.function?.name || 'unknown'}(${tc.function?.arguments || '{}'})]`
        ).join('\n');

        formatted.push({
          role: 'assistant',
          content: (msg.content || '') + (msg.content ? '\n' : '') + toolCallInfo
        });
      } else {
        // Pass through other messages unchanged
        formatted.push({ role: msg.role, content: msg.content });
      }
    }

    // GLM requires at least one user message
    const hasUserMessage = formatted.some(m => m.role === 'user');
    if (!hasUserMessage && formatted.length > 0) {
      formatted.push({ role: 'user', content: 'Continue.' });
    }

    return formatted;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CLIENT INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════

  private _initClient(): void {
    this.client = new OpenAI({
      apiKey: this._apiKey,
      baseURL: this._baseUrl
    });
  }

  get apiKey(): string | undefined { return this._apiKey; }
  set apiKey(value: string | undefined) {
    this._apiKey = value;
    this._initClient();
  }

  get baseUrl(): string | undefined { return this._baseUrl; }
  set baseUrl(value: string | undefined) {
    this._baseUrl = value;
    this._initClient();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SESSION MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  clearHistory(): void {
    this.history = [];
  }

  saveSession(name: string = 'last'): { success: boolean; path?: string; error?: string } {
    const sessionPath = getSessionPath(name);
    const session: Session = {
      savedAt: new Date().toISOString(),
      cwd: this.cwd,
      provider: this.provider,
      model: this.model,
      history: this.history,
      stats: this.stats,
      summary: this.generateSummary()
    };

    try {
      fs.writeFileSync(sessionPath, JSON.stringify(session, null, 2));
      return { success: true, path: sessionPath };
    } catch (e) {
      const error = e as Error;
      return { success: false, error: error.message };
    }
  }

  loadSession(name: string = 'last'): { success: boolean; savedAt?: string; summary?: string; messageCount?: number; error?: string } {
    const sessionPath = getSessionPath(name);

    if (!fs.existsSync(sessionPath)) {
      return { success: false, error: 'No saved session found' };
    }

    try {
      const data = JSON.parse(fs.readFileSync(sessionPath, 'utf-8')) as Session;
      this.history = data.history || [];
      this.stats = { ...this.stats, ...data.stats };
      return {
        success: true,
        savedAt: data.savedAt,
        summary: data.summary,
        messageCount: this.history.length
      };
    } catch (e) {
      const error = e as Error;
      return { success: false, error: error.message };
    }
  }

  generateSummary(): string {
    if (this.history.length === 0) return 'Empty session';

    const userMessages = this.history.filter(m => m.role === 'user');
    const lastMessages = userMessages.slice(-3).map(m =>
      m.content.substring(0, 50) + (m.content.length > 50 ? '...' : '')
    );

    return lastMessages.join(' -> ') || 'No user messages';
  }

  static listSessions(): Array<{ name: string; modified: Date; summary: string }> {
    ensureSessionDir();
    try {
      const files = fs.readdirSync(SESSION_DIR)
        .filter(f => f.endsWith('.json'))
        .map(f => {
          const filePath = path.join(SESSION_DIR, f);
          const stat = fs.statSync(filePath);
          let summary = '';
          try {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Session;
            summary = data.summary || '';
          } catch (_e) {
            // Ignore parse errors
          }
          return {
            name: f.replace('.json', ''),
            modified: stat.mtime,
            summary
          };
        })
        .sort((a, b) => b.modified.getTime() - a.modified.getTime());
      return files;
    } catch (_e) {
      return [];
    }
  }

  trimHistory(maxMessages: number = 20): void {
    if (this.history.length > maxMessages) {
      this.history = this.history.slice(-maxMessages);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AGENTIC LOOP - Core chat with automatic tool execution
  // Inspired by AI SDK's generateText with maxSteps/stopWhen pattern
  // ═══════════════════════════════════════════════════════════════════════════

  async chat(userMessage: string, callbacks: ExtendedChatCallbacks = {}): Promise<void> {
    const {
      onStart,
      onToken,
      onToolCall,
      onToolResult,
      onStepFinish,  // NEW: Called after each step (like AI SDK)
      onEnd,
      onError
    } = callbacks;

    // Add user message to history
    this.history.push({
      role: 'user',
      content: userMessage
    });

    this.trimHistory();
    this.stats.requests++;

    try {
      // Start the agentic loop
      let currentStep = 0;
      let continueLoop = true;
      let _finalResponse = '';

      while (continueLoop && currentStep < this.maxSteps) {
        currentStep++;

        const stepResult = await this._executeStep({
          stepNumber: currentStep,
          onStart: currentStep === 1 ? onStart : null,
          onToken,
          onToolCall,
          onToolResult,
        });

        _finalResponse = stepResult.response;

        // Call onStepFinish callback (like AI SDK)
        if (onStepFinish) {
          onStepFinish({
            stepNumber: currentStep,
            text: stepResult.response,
            toolCalls: stepResult.toolCalls,
            hasMoreSteps: stepResult.hasToolCalls
          });
        }

        // Continue loop only if there were tool calls
        continueLoop = stepResult.hasToolCalls;

        // Safety check: if no tool calls and no response, break
        if (!stepResult.hasToolCalls && !stepResult.response) {
          break;
        }
      }

      // Warn if max steps reached
      if (currentStep >= this.maxSteps && continueLoop) {
        console.warn(`[Agent] Max steps (${this.maxSteps}) reached`);
      }

      if (onEnd) onEnd();

    } catch (err) {
      if (onError) {
        onError(err as Error);
      } else {
        throw err;
      }
    }
  }

  // Execute a single step in the agentic loop
  private async _executeStep({ stepNumber, onStart, onToken, onToolCall, onToolResult }: ExecuteStepParams): Promise<StepResult> {
    const rawMessages = [
      { role: 'system', content: this.systemPrompt },
      ...this.history
    ];
    const messages = this._formatMessagesForProvider(rawMessages);

    if (onStart) onStart();

    // Build request params
    const requestParams: any = {
      model: this.model,
      messages,
      stream: this.stream
    };

    // Only add tools if provider supports them
    if (this._supportsTools()) {
      requestParams.tools = getAllTools();
      requestParams.tool_choice = 'auto';
    }

    const response = await this.client.chat.completions.create(requestParams);

    let assistantMessage = '';
    let toolCalls: ToolCall[] = [];

    if (this.stream) {
      // Handle streaming response
      for await (const chunk of response as unknown as AsyncIterable<any>) {
        const delta = chunk.choices[0]?.delta;

        if (delta?.content) {
          assistantMessage += delta.content;
          if (onToken) onToken(delta.content);
        }

        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            if (tc.index !== undefined) {
              if (!toolCalls[tc.index]) {
                toolCalls[tc.index] = {
                  id: tc.id || `call_${Date.now()}_${tc.index}`,
                  type: 'function',
                  function: { name: '', arguments: '' }
                };
              }
              if (tc.function?.name) {
                toolCalls[tc.index].function.name = tc.function.name;
              }
              if (tc.function?.arguments) {
                toolCalls[tc.index].function.arguments += tc.function.arguments;
              }
              if (tc.id) {
                toolCalls[tc.index].id = tc.id;
              }
            }
          }
        }
      }
    } else {
      // Handle non-streaming response
      const choice = (response as any).choices[0];
      assistantMessage = choice.message.content || '';
      toolCalls = choice.message.tool_calls || [];

      if (assistantMessage && onToken) {
        onToken(assistantMessage);
      }
    }

    // Filter out any undefined entries from toolCalls
    toolCalls = toolCalls.filter(tc => tc && tc.function?.name);

    // Add assistant message to history
    const historyEntry: any = {
      role: 'assistant',
      content: assistantMessage
    };

    if (toolCalls.length > 0) {
      historyEntry.tool_calls = toolCalls;
    }

    this.history.push(historyEntry);

    // Execute tool calls if any
    if (toolCalls.length > 0) {
      for (const toolCall of toolCalls) {
        const toolName = toolCall.function.name;
        let toolArgs: Record<string, unknown> = {};

        try {
          toolArgs = JSON.parse(toolCall.function.arguments || '{}');
        } catch (_e) {
          toolArgs = {};
        }

        // Ask for approval (unless yolo mode)
        let approved = this.yolo;
        if (!approved && onToolCall) {
          approved = await onToolCall(toolName, toolArgs);
        }

        if (approved) {
          this.stats.toolCalls++;
          const result = await executeTool(toolName, toolArgs);

          if (onToolResult) {
            onToolResult(toolName, result);
          }

          // Add tool result to history
          this.history.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: typeof result === 'string' ? result : JSON.stringify(result)
          } as Message);
        } else {
          // Tool was rejected
          this.history.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: 'Tool execution was rejected by user.'
          } as Message);
        }
      }
    }

    return {
      response: assistantMessage,
      toolCalls: toolCalls,
      hasToolCalls: toolCalls.length > 0
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LEGACY: continueAfterTools (for backward compatibility)
  // ═══════════════════════════════════════════════════════════════════════════

  async continueAfterTools(callbacks: ChatCallbacks = {}): Promise<void> {
    // This is now handled by the agentic loop in chat()
    // Keeping for backward compatibility
    const stepResult = await this._executeStep({
      stepNumber: 0,
      onStart: callbacks.onStart,
      onToken: callbacks.onToken,
      onToolCall: callbacks.onToolCall,
      onToolResult: callbacks.onToolResult,
    });

    if (stepResult.hasToolCalls) {
      return this.continueAfterTools(callbacks);
    }

    if (callbacks.onEnd) callbacks.onEnd();
  }
}
