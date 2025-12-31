/**
 * Agent - Powered by Vercel AI SDK
 * Unified multi-provider API with built-in agentic loop
 */

import { streamText, generateText, tool, stepCountIs } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { executeTool } from './tools/index.js';
import type { ToolExecutionOptions } from '@ai-sdk/provider-utils';
import { getSkillsManager } from './skills/manager.js';
import { countTokens } from './utils/tokens.js';
import fs from 'fs';
import path from 'path';
import type { AgentOptions, AgentStats, Message, ChatCallbacks, Session, ToolCall } from './types/index.js';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_MAX_STEPS = 0; // 0 = unlimited (no step limit)

const DEFAULT_SYSTEM_PROMPT = `You are a helpful AI coding assistant running in a CLI environment.
You have access to tools to help accomplish tasks:
- bash: Execute shell commands
- read: Read file contents
- write: Write content to files
- edit: Edit files using search and replace
- glob: Find files matching patterns
- grep: Search for patterns in files
- git_status, git_diff, git_log, git_commit: Git operations

When the user asks you to perform tasks, use the appropriate tools.
Always explain what you're doing before using tools.
Be concise and helpful.`;

// ═══════════════════════════════════════════════════════════════════════════
// PROVIDER FACTORY
// ═══════════════════════════════════════════════════════════════════════════

type ProviderType = 'openai' | 'anthropic' | 'glm' | 'gemini' | 'groq' | 'together' | 'deepseek' | 'openrouter' | string;

interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
}

function createModel(provider: ProviderType, model: string, config: ProviderConfig) {
  const { apiKey, baseUrl } = config;

  switch (provider) {
    case 'anthropic':
      return createAnthropic({ apiKey })(model);

    case 'openai':
      // Use .chat() for chat completions API (not responses API)
      return createOpenAI({ apiKey, baseURL: baseUrl }).chat(model);

    case 'glm':
      // GLM uses OpenAI-compatible chat completions API
      return createOpenAI({
        apiKey,
        baseURL: baseUrl || 'https://api.z.ai/api/coding/paas/v4/'
      }).chat(model);

    case 'gemini':
      // Gemini via OpenAI-compatible endpoint
      return createOpenAI({
        apiKey,
        baseURL: baseUrl || 'https://generativelanguage.googleapis.com/v1beta/openai/'
      }).chat(model);

    case 'groq':
      return createOpenAI({
        apiKey,
        baseURL: 'https://api.groq.com/openai/v1'
      }).chat(model);

    case 'together':
      return createOpenAI({
        apiKey,
        baseURL: 'https://api.together.xyz/v1'
      }).chat(model);

    case 'deepseek':
      return createOpenAI({
        apiKey,
        baseURL: 'https://api.deepseek.com/v1'
      }).chat(model);

    case 'openrouter':
      return createOpenAI({
        apiKey,
        baseURL: 'https://openrouter.ai/api/v1'
      }).chat(model);

    default:
      return createOpenAI({
        apiKey,
        baseURL: baseUrl
      }).chat(model);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// AI SDK TOOLS - Zod schema validation with execute functions
// ═══════════════════════════════════════════════════════════════════════════

function createAiSdkTools(onToolCall?: (name: string, args: any) => Promise<boolean>, onToolResult?: (name: string, result: any) => void) {
  return {
    bash: tool({
      description: 'Execute a shell command',
      inputSchema: z.object({
        command: z.string().describe('The command to execute'),
        cwd: z.string().optional().describe('Working directory')
      }),
      execute: async (args, _options: ToolExecutionOptions) => {
        if (onToolCall) await onToolCall('bash', args);
        const result = await executeTool('bash', args);
        if (onToolResult) onToolResult('bash', result);
        return typeof result === 'string' ? result : JSON.stringify(result);
      }
    }),

    read: tool({
      description: 'Read the contents of a file',
      inputSchema: z.object({
        path: z.string().describe('Path to the file to read'),
        encoding: z.string().optional().describe('File encoding (default: utf-8)')
      }),
      execute: async (args, _options: ToolExecutionOptions) => {
        if (onToolCall) await onToolCall('read', args);
        const result = await executeTool('read', args);
        if (onToolResult) onToolResult('read', result);
        return typeof result === 'string' ? result : JSON.stringify(result);
      }
    }),

    write: tool({
      description: 'Write content to a file',
      inputSchema: z.object({
        path: z.string().describe('Path to the file to write'),
        content: z.string().describe('Content to write')
      }),
      execute: async (args, _options: ToolExecutionOptions) => {
        if (onToolCall) await onToolCall('write', args);
        const result = await executeTool('write', args);
        if (onToolResult) onToolResult('write', result);
        return typeof result === 'string' ? result : JSON.stringify(result);
      }
    }),

    edit: tool({
      description: 'Edit a file by replacing text',
      inputSchema: z.object({
        path: z.string().describe('Path to the file to edit'),
        search: z.string().describe('Text to search for'),
        replace: z.string().describe('Text to replace with')
      }),
      execute: async (args, _options: ToolExecutionOptions) => {
        if (onToolCall) await onToolCall('edit', args);
        const result = await executeTool('edit', args);
        if (onToolResult) onToolResult('edit', result);
        return typeof result === 'string' ? result : JSON.stringify(result);
      }
    }),

    glob: tool({
      description: 'Find files matching a glob pattern',
      inputSchema: z.object({
        pattern: z.string().describe('Glob pattern (e.g., **/*.ts)'),
        cwd: z.string().optional().describe('Base directory')
      }),
      execute: async (args, _options: ToolExecutionOptions) => {
        if (onToolCall) await onToolCall('glob', args);
        const result = await executeTool('glob', args);
        if (onToolResult) onToolResult('glob', result);
        return typeof result === 'string' ? result : JSON.stringify(result);
      }
    }),

    grep: tool({
      description: 'Search for a pattern in files',
      inputSchema: z.object({
        pattern: z.string().describe('Search pattern (regex)'),
        path: z.string().optional().describe('File or directory to search'),
        include: z.string().optional().describe('File pattern to include')
      }),
      execute: async (args, _options: ToolExecutionOptions) => {
        if (onToolCall) await onToolCall('grep', args);
        const result = await executeTool('grep', args);
        if (onToolResult) onToolResult('grep', result);
        return typeof result === 'string' ? result : JSON.stringify(result);
      }
    }),

    web_fetch: tool({
      description: 'Fetch content from a URL',
      inputSchema: z.object({
        url: z.string().describe('URL to fetch')
      }),
      execute: async (args, _options: ToolExecutionOptions) => {
        if (onToolCall) await onToolCall('web_fetch', args);
        const result = await executeTool('web_fetch', args);
        if (onToolResult) onToolResult('web_fetch', result);
        return typeof result === 'string' ? result : JSON.stringify(result);
      }
    }),

    git_status: tool({
      description: 'Get git repository status',
      inputSchema: z.object({
        cwd: z.string().optional().describe('Working directory')
      }),
      execute: async (args, _options: ToolExecutionOptions) => {
        if (onToolCall) await onToolCall('git_status', args);
        const result = await executeTool('git_status', args);
        if (onToolResult) onToolResult('git_status', result);
        return typeof result === 'string' ? result : JSON.stringify(result);
      }
    }),

    git_diff: tool({
      description: 'Show git diff',
      inputSchema: z.object({
        staged: z.boolean().optional().describe('Show staged changes only'),
        file: z.string().optional().describe('Specific file to diff'),
        cwd: z.string().optional().describe('Working directory')
      }),
      execute: async (args, _options: ToolExecutionOptions) => {
        if (onToolCall) await onToolCall('git_diff', args);
        const result = await executeTool('git_diff', args);
        if (onToolResult) onToolResult('git_diff', result);
        return typeof result === 'string' ? result : JSON.stringify(result);
      }
    }),

    git_log: tool({
      description: 'Show git commit history',
      inputSchema: z.object({
        maxCount: z.number().optional().describe('Max commits to show'),
        file: z.string().optional().describe('File to show history for'),
        cwd: z.string().optional().describe('Working directory')
      }),
      execute: async (args, _options: ToolExecutionOptions) => {
        if (onToolCall) await onToolCall('git_log', args);
        const result = await executeTool('git_log', args);
        if (onToolResult) onToolResult('git_log', result);
        return typeof result === 'string' ? result : JSON.stringify(result);
      }
    }),

    git_commit: tool({
      description: 'Create a git commit',
      inputSchema: z.object({
        message: z.string().describe('Commit message'),
        files: z.array(z.string()).optional().describe('Files to commit'),
        cwd: z.string().optional().describe('Working directory')
      }),
      execute: async (args, _options: ToolExecutionOptions) => {
        if (onToolCall) await onToolCall('git_commit', args);
        const result = await executeTool('git_commit', args);
        if (onToolResult) onToolResult('git_commit', result);
        return typeof result === 'string' ? result : JSON.stringify(result);
      }
    })
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

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
// EXTENDED CALLBACKS
// ═══════════════════════════════════════════════════════════════════════════

interface StepFinishInfo {
  stepNumber: number;
  text: string;
  toolCalls: ToolCall[];
  hasMoreSteps: boolean;
}

interface ExtendedChatCallbacks extends ChatCallbacks {
  onStepFinish?: (info: StepFinishInfo) => void;
}

// Message type for AI SDK
interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// AGENT CLASS - AI SDK Powered
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
    this.maxSteps = (options as any).maxSteps || DEFAULT_MAX_STEPS;

    this.stats = {
      totalTokens: 0,
      promptTokens: 0,
      completionTokens: 0,
      requests: 0,
      toolCalls: 0,
      startTime: Date.now()
    };

    this.projectContext = loadProjectContext(this.cwd);
    this._baseSystemPrompt = options.systemPrompt || DEFAULT_SYSTEM_PROMPT;
    this._buildSystemPrompt();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GETTERS/SETTERS
  // ═══════════════════════════════════════════════════════════════════════════

  get apiKey(): string | undefined { return this._apiKey; }
  set apiKey(value: string | undefined) { this._apiKey = value; }

  get baseUrl(): string | undefined { return this._baseUrl; }
  set baseUrl(value: string | undefined) { this._baseUrl = value; }

  // ═══════════════════════════════════════════════════════════════════════════
  // SYSTEM PROMPT
  // ═══════════════════════════════════════════════════════════════════════════

  private _buildSystemPrompt(): void {
    let systemPrompt = this._baseSystemPrompt;

    if (this.projectContext) {
      systemPrompt += `\n\n## Project Context (from ${this.projectContext.file}):\n${this.projectContext.content}`;
    }

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
  // HISTORY MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  clearHistory(): void {
    this.history = [];
  }

  trimHistory(maxMessages: number = 20): void {
    if (this.history.length > maxMessages) {
      this.history = this.history.slice(-maxMessages);
    }
  }

  private _convertToAIMessages(): AIMessage[] {
    return this.history
      .filter(msg => msg.role === 'user' || msg.role === 'assistant')
      .map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SESSION MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

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
          return { name: f.replace('.json', ''), modified: stat.mtime, summary };
        })
        .sort((a, b) => b.modified.getTime() - a.modified.getTime());
      return files;
    } catch (_e) {
      return [];
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CHAT - AI SDK Powered
  // ═══════════════════════════════════════════════════════════════════════════

  async chat(userMessage: string, callbacks: ExtendedChatCallbacks = {}): Promise<void> {
    const {
      onStart,
      onToken,
      onToolCall,
      onToolResult,
      onEnd,
      onError
    } = callbacks;

    // Add user message to history
    this.history.push({ role: 'user', content: userMessage });
    this.trimHistory();
    this.stats.requests++;

    try {
      // Count input tokens
      const inputTokens = countTokens(userMessage + this.systemPrompt, this.model);
      this.stats.promptTokens += inputTokens;

      // Create model for this request
      const model = createModel(this.provider, this.model, {
        apiKey: this._apiKey,
        baseUrl: this._baseUrl
      });

      // Create tools with callbacks
      const tools = createAiSdkTools(
        async (name, args) => {
          if (onToolCall) {
            return await onToolCall(name, args);
          }
          return this.yolo; // Auto-approve if yolo mode
        },
        onToolResult
      );

      const messages = this._convertToAIMessages();

      if (this.stream) {
        await this._streamChat(model, messages, tools, callbacks);
      } else {
        await this._generateChat(model, messages, tools, callbacks);
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

  // Streaming chat with AI SDK
  private async _streamChat(
    model: ReturnType<typeof createModel>,
    messages: AIMessage[],
    tools: ReturnType<typeof createAiSdkTools>,
    callbacks: ExtendedChatCallbacks
  ): Promise<void> {
    const { onStart, onToken } = callbacks;

    let fullResponse = '';
    let streamError: Error | null = null;

    const result = streamText({
      model,
      system: this.systemPrompt,
      messages,
      tools,
      // maxSteps = 0 means unlimited, use high number (1000)
      // Default to 50 if not specified for safety
      stopWhen: stepCountIs(this.maxSteps === 0 ? 1000 : this.maxSteps || 50),
      onStepFinish: ({ toolCalls }) => {
        // Track tool calls
        if (toolCalls && toolCalls.length > 0) {
          this.stats.toolCalls += toolCalls.length;
        }
      }
    });

    // Signal start
    if (onStart) onStart();

    // Stream tokens - AI SDK doesn't throw, just completes silently on error
    for await (const chunk of result.textStream) {
      fullResponse += chunk;
      if (onToken) onToken(chunk);
    }

    // Check for errors - AI SDK stream may complete without throwing
    try {
      // Access internal state to check for errors
      const resultAny = result as unknown as { _steps?: { status?: { type: string; error?: Error } } };
      if (resultAny._steps?.status?.type === 'rejected' && resultAny._steps.status.error) {
        streamError = resultAny._steps.status.error;
      } else if (!fullResponse) {
        // No response generated - likely an error occurred
        const finishReason = await result.finishReason;
        if (finishReason !== 'stop') {
          streamError = new Error(`No response generated (${finishReason || 'unknown'})`);
        }
      }
    } catch (e) {
      streamError = e as Error;
    }

    // Throw if there was an error
    if (streamError) {
      throw streamError;
    }

    // Update stats
    const outputTokens = countTokens(fullResponse, this.model);
    this.stats.completionTokens += outputTokens;
    this.stats.totalTokens += outputTokens;

    // Add to history
    if (fullResponse) {
      this.history.push({ role: 'assistant', content: fullResponse });
    }
  }

  // Non-streaming chat with AI SDK
  private async _generateChat(
    model: ReturnType<typeof createModel>,
    messages: AIMessage[],
    tools: ReturnType<typeof createAiSdkTools>,
    callbacks: ExtendedChatCallbacks
  ): Promise<void> {
    const { onStart, onToken } = callbacks;

    if (onStart) onStart();

    const result = await generateText({
      model,
      system: this.systemPrompt,
      messages,
      tools,
      // maxSteps = 0 means unlimited, use high number (1000)
      // Default to 50 if not specified for safety
      stopWhen: stepCountIs(this.maxSteps === 0 ? 1000 : this.maxSteps || 50),
      onStepFinish: ({ toolCalls }) => {
        if (toolCalls && toolCalls.length > 0) {
          this.stats.toolCalls += toolCalls.length;
        }
      }
    });

    const fullResponse = result.text;

    if (onToken && fullResponse) {
      onToken(fullResponse);
    }

    // Update stats
    const outputTokens = countTokens(fullResponse, this.model);
    this.stats.completionTokens += outputTokens;
    this.stats.totalTokens += outputTokens;

    // Add to history
    if (fullResponse) {
      this.history.push({ role: 'assistant', content: fullResponse });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LEGACY COMPATIBILITY
  // ═══════════════════════════════════════════════════════════════════════════

  get client(): any {
    console.warn('[Agent] Direct client access is deprecated. Use chat() method instead.');
    return null;
  }

  async continueAfterTools(callbacks: ChatCallbacks = {}): Promise<void> {
    console.warn('[Agent] continueAfterTools is deprecated. AI SDK handles tool loops automatically.');
    if (callbacks.onEnd) callbacks.onEnd();
  }
}
