import OpenAI from 'openai';
import { getAllTools, executeTool } from './tools/index.js';
import { getSkillsManager } from './skills/manager.js';
import fs from 'fs';
import path from 'path';

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

// Load project context from ZESBE.md, CLAUDE.md, or GEMINI.md
function loadProjectContext(cwd: string = process.cwd()): { file: string; content: string } | null {
  const contextFiles = ['ZESBE.md', 'CLAUDE.md', 'GEMINI.md', 'AI.md', '.ai/context.md'];
  
  for (const file of contextFiles) {
    const filePath = path.join(cwd, file);
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        return { file, content };
      } catch (e) {
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

export class Agent {
  provider: string;
  model: string;
  yolo: boolean;
  stream: boolean;
  history: Message[];
  cwd: string;
  stats: AgentStats;
  projectContext: { file: string; content: string } | null;
  systemPrompt: string;
  client: OpenAI;
  private _apiKey?: string;
  private _baseUrl?: string;
  private _baseSystemPrompt: string;

  constructor(options: AgentOptions = {}) {
    this.provider = options.provider || 'openai';
    this.model = options.model || 'gpt-4o';
    this._apiKey = options.apiKey;
    this._baseUrl = options.baseUrl;
    this.yolo = options.yolo || false;
    this.stream = options.stream !== false;
    this.history = [];
    this.cwd = options.cwd || process.cwd();
    
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

  // Build system prompt with project context and skills
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

  // Refresh system prompt (call after loading/unloading skills)
  refreshSystemPrompt(): void {
    this._buildSystemPrompt();
  }

  private _initClient(): void {
    this.client = new OpenAI({
      apiKey: this._apiKey,
      baseURL: this._baseUrl
    });
  }

  // Getters and setters to reinitialize client when config changes
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

  clearHistory(): void {
    this.history = [];
  }

  // Save session to file
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
    } catch (e: unknown) {
      return { success: false, error: (e as Error).message };
    }
  }

  // Load session from file
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
    } catch (e: unknown) {
      return { success: false, error: (e as Error).message };
    }
  }

  // Generate conversation summary
  generateSummary(): string {
    if (this.history.length === 0) return 'Empty session';
    
    const userMessages = this.history.filter(m => m.role === 'user');
    const lastMessages = userMessages.slice(-3).map(m => 
      m.content.substring(0, 50) + (m.content.length > 50 ? '...' : '')
    );
    
    return lastMessages.join(' → ') || 'No user messages';
  }

  // List saved sessions
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
          } catch (e) {}
          return {
            name: f.replace('.json', ''),
            modified: stat.mtime,
            summary
          };
        })
        .sort((a, b) => b.modified - a.modified);
      return files;
    } catch (e) {
      return [];
    }
  }

  // Limit history to prevent token overflow
  trimHistory(maxMessages: number = 20): void {
    if (this.history.length > maxMessages) {
      // Keep system context and recent messages
      this.history = this.history.slice(-maxMessages);
    }
  }

  // Continue after tool calls without adding empty user message
  async continueAfterTools(callbacks: ChatCallbacks = {}): Promise<void> {
    const { onStart, onToken, onToolCall, onToolResult, onEnd, onError } = callbacks;

    try {
      this.trimHistory();
      
      const messages = [
        { role: 'system', content: this.systemPrompt },
        ...this.history
      ];

      if (onStart) onStart();

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages,
        tools: getAllTools(),
        tool_choice: 'auto',
        stream: this.stream
      });

      let assistantMessage = '';
      let toolCalls = [];

      if (this.stream) {
        for await (const chunk of response) {
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
                    id: tc.id || `call_${tc.index}`,
                    type: 'function',
                    function: { name: '', arguments: '' }
                  };
                }
                if (tc.function?.name) toolCalls[tc.index].function.name = tc.function.name;
                if (tc.function?.arguments) toolCalls[tc.index].function.arguments += tc.function.arguments;
                if (tc.id) toolCalls[tc.index].id = tc.id;
              }
            }
          }
        }
      } else {
        const choice = response.choices[0];
        assistantMessage = choice.message.content || '';
        toolCalls = choice.message.tool_calls || [];
        if (assistantMessage && onToken) onToken(assistantMessage);
      }

      const historyEntry = { role: 'assistant', content: assistantMessage };
      if (toolCalls.length > 0) historyEntry.tool_calls = toolCalls;
      this.history.push(historyEntry);

      // Handle more tool calls
      if (toolCalls.length > 0) {
        for (const toolCall of toolCalls) {
          if (!toolCall.function?.name) continue;
          const toolName = toolCall.function.name;
          let toolArgs = {};
          try { toolArgs = JSON.parse(toolCall.function.arguments || '{}'); } catch (e) {}

          let approved = true;
          if (onToolCall) approved = await onToolCall(toolName, toolArgs);

          if (approved) {
            const result = await executeTool(toolName, toolArgs);
            if (onToolResult) onToolResult(toolName, result);
            this.history.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: typeof result === 'string' ? result : JSON.stringify(result)
            });
          } else {
            this.history.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: 'Tool rejected by user.'
            });
          }
        }
        await this.continueAfterTools(callbacks);
        return;
      }

      if (onEnd) onEnd();
    } catch (err) {
      if (onError) onError(err);
      else throw err;
    }
  }

  async chat(userMessage: string, callbacks: ChatCallbacks = {}): Promise<void> {
    const { onStart, onToken, onToolCall, onToolResult, onEnd, onError } = callbacks;

    // Add user message to history
    this.history.push({
      role: 'user',
      content: userMessage
    });

    // Trim history to prevent token overflow
    this.trimHistory();

    try {
      // Build messages array
      const messages = [
        { role: 'system', content: this.systemPrompt },
        ...this.history
      ];

      if (onStart) onStart();

      // Make API call with tools
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages,
        tools: getAllTools(),
        tool_choice: 'auto',
        stream: this.stream
      });

      let assistantMessage = '';
      let toolCalls = [];

      if (this.stream) {
        // Handle streaming response
        for await (const chunk of response) {
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
                    id: tc.id || `call_${tc.index}`,
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
        const choice = response.choices[0];
        assistantMessage = choice.message.content || '';
        toolCalls = choice.message.tool_calls || [];

        if (assistantMessage && onToken) {
          onToken(assistantMessage);
        }
      }

      // Add assistant message to history
      const historyEntry = {
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
          if (!toolCall.function?.name) continue;

          const toolName = toolCall.function.name;
          let toolArgs = {};

          try {
            toolArgs = JSON.parse(toolCall.function.arguments || '{}');
          } catch (e) {
            toolArgs = {};
          }

          // Ask for approval
          let approved = true;
          if (onToolCall) {
            approved = await onToolCall(toolName, toolArgs);
          }

          if (approved) {
            // Execute the tool
            const result = await executeTool(toolName, toolArgs);

            if (onToolResult) {
              onToolResult(toolName, result);
            }

            // Add tool result to history
            this.history.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: typeof result === 'string' ? result : JSON.stringify(result)
            });
          } else {
            // Tool was rejected
            this.history.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: 'Tool execution was rejected by user.'
            });
          }
        }

        // Continue conversation after tool execution
        await this.continueAfterTools(callbacks);
        return;
      }

      if (onEnd) onEnd();

    } catch (err) {
      if (onError) {
        onError(err);
      } else {
        throw err;
      }
    }
  }
}
