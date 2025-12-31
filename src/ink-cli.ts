/**
 * CLI Interface - readline + chalk + enquirer version
 * No Ink/React - Direct terminal control for zero flicker
 */

import readline from 'readline';
import chalk from 'chalk';
import ora, { Ora } from 'ora';
import Enquirer from 'enquirer';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { PROVIDERS, getProviderList, getModelsForProvider } from './models-db.js';
import { PROVIDER_INFO, formatProviderGuide, getAllProvidersQuickRef, getFreeProviders } from './provider-info.js';
import { getMCPManager } from './mcp/client.js';
import { getSkillsManager } from './skills/manager.js';
import { POPULAR_MCP_SERVERS, searchServers, getServerById, generateInstallConfig, MARKETPLACE_LINKS } from './mcp/marketplace.js';
import { highlightCodeBlocks } from './utils/index.js';
import { ContextManager, createFilePreview, formatContextInfo } from './utils/context.js';
import { saveConversation, listConversations, searchConversations, exportConversation, formatConversationList, formatSearchResults } from './utils/export.js';
import type { ChatMessage, ExportFormat } from './utils/export.js';
import { copyToClipboard, readFromClipboard, isClipboardAvailable, formatShortcut, getShortcutsByCategory } from './utils/clipboard.js';
import { createFileDiff } from './utils/diff.js';
import type { Agent as AgentType } from './agent.js';

// Session directory
const SESSION_DIR = path.join(os.homedir(), '.zesbe', 'sessions');

// ANSI escape codes for cursor control
const CLEAR_LINE = '\r\x1b[K';
const CURSOR_UP = '\x1b[A';
const CURSOR_HIDE = '\x1b[?25l';
const CURSOR_SHOW = '\x1b[?25h';

// Tool icons
const TOOL_ICONS: Record<string, string> = {
  bash: '⚡',
  read: '📖',
  write: '📝',
  edit: '✏️',
  glob: '🔍',
  grep: '🔎',
  web_fetch: '🌐',
  git_status: '📊',
  git_diff: '📋',
  default: '🔧'
};

interface ChatState {
  messages: Array<{ role: string; content: string; tokens?: number }>;
  totalTokens: number;
  lastResponse: string;
  attachedFiles: string[];
  inputHistory: string[];
  historyIndex: number;
}

// All supported commands with descriptions for suggestions
const COMMAND_LIST = [
  { cmd: '/help', desc: 'Show all commands', cat: '💬' },
  { cmd: '/setup', desc: 'Setup provider API key', cat: '🔌' },
  { cmd: '/providers', desc: 'List all providers', cat: '🔌' },
  { cmd: '/provider', desc: 'Switch provider', cat: '🔌' },
  { cmd: '/model', desc: 'Switch model', cat: '🔌' },
  { cmd: '/apikey', desc: 'Set API key', cat: '🔌' },
  { cmd: '/free', desc: 'Show FREE providers', cat: '🔌' },
  { cmd: '/clear', desc: 'Clear conversation', cat: '💬' },
  { cmd: '/yolo', desc: 'Toggle auto-approve', cat: '💬' },
  { cmd: '/stats', desc: 'Session statistics', cat: '💬' },
  { cmd: '/context', desc: 'Show project context', cat: '💬' },
  { cmd: '/config', desc: 'Show configuration', cat: '💬' },
  { cmd: '/save', desc: 'Save session', cat: '💾' },
  { cmd: '/load', desc: 'Load session', cat: '💾' },
  { cmd: '/resume', desc: 'Resume last session', cat: '💾' },
  { cmd: '/sessions', desc: 'List saved sessions', cat: '💾' },
  { cmd: '/attach', desc: 'Attach file to context', cat: '📎' },
  { cmd: '/detach', desc: 'Remove file from context', cat: '📎' },
  { cmd: '/files', desc: 'List attached files', cat: '📎' },
  { cmd: '/preview', desc: 'Preview file content', cat: '📎' },
  { cmd: '/diff', desc: 'Show diff between files', cat: '📎' },
  { cmd: '/export', desc: 'Export chat history', cat: '📤' },
  { cmd: '/history', desc: 'Search conversation history', cat: '📤' },
  { cmd: '/copy', desc: 'Copy last response', cat: '📤' },
  { cmd: '/paste', desc: 'Paste from clipboard', cat: '📤' },
  { cmd: '/shortcuts', desc: 'Show keyboard shortcuts', cat: '📤' },
  { cmd: '/mcp', desc: 'MCP server management', cat: '🔌' },
  { cmd: '/skills', desc: 'Skills management', cat: '📚' },
  { cmd: '/exit', desc: 'Exit the CLI', cat: '🚪' },
];

const ALL_COMMANDS = COMMAND_LIST.map(c => c.cmd);

/**
 * Main CLI Class
 */
class ChatCLI {
  private agent: AgentType;
  private rl: readline.Interface;
  private state: ChatState;
  private contextManager: ContextManager;
  private currentSpinner: Ora | null = null;
  private isProcessing = false;
  private stdinClosed = false;
  private originalStderr: typeof process.stderr.write;
  private isInteractive: boolean;
  private inputQueue: string[] = [];

  constructor(agent: AgentType) {
    // Suppress verbose AI SDK error output (printed to stderr)
    this.originalStderr = process.stderr.write.bind(process.stderr);
    process.stderr.write = ((...args: Parameters<typeof process.stderr.write>) => {
      const msg = String(args[0]);
      // Filter out verbose AI SDK errors - we handle these cleanly
      if (msg.includes('RetryError') || msg.includes('AI_APICallError') || msg.includes('Symbol(vercel')) {
        return true;
      }
      return this.originalStderr(...args);
    }) as typeof process.stderr.write;
    this.agent = agent;
    this.contextManager = new ContextManager();
    this.state = {
      messages: [],
      totalTokens: 0,
      lastResponse: '',
      attachedFiles: [],
      inputHistory: [],
      historyIndex: -1
    };

    // Create readline interface
    // Use terminal mode only for interactive TTY, not for piped input
    this.isInteractive = !!process.stdin.isTTY;
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: this.isInteractive
    });

    // For piped input, collect all lines into a queue
    if (!this.isInteractive) {
      this.rl.on('line', (line) => {
        this.inputQueue.push(line);
      });
    }

    // Handle readline close - but NOT while processing or if we have queued input
    this.rl.on('close', () => {
      this.stdinClosed = true;
      // For piped mode with queued input, don't exit yet
      if (!this.isInteractive && this.inputQueue.length > 0) {
        return;
      }
      // If we're in the middle of processing, don't exit yet - let processing complete
      if (this.isProcessing) {
        return;
      }
      this.cleanup();
      process.exit(0);
    });

    // Handle SIGINT
    process.on('SIGINT', () => {
      if (this.isProcessing && this.currentSpinner) {
        this.currentSpinner.stop();
        console.log(chalk.yellow('\n⚠️ Interrupted'));
        this.isProcessing = false;
        this.prompt();
      } else {
        this.cleanup();
        process.exit(0);
      }
    });
  }

  /**
   * Cleanup before exit
   */
  private cleanup(): void {
    // Restore original stderr
    process.stderr.write = this.originalStderr;
    process.stdout.write(CURSOR_SHOW);
    console.log(chalk.cyan('\n👋 Goodbye!\n'));
    this.agent.saveSession('last');
  }

  /**
   * Print header
   */
  private printHeader(): void {
    const providerName = PROVIDERS[this.agent.provider]?.name || this.agent.provider;
    const yoloIndicator = this.agent.yolo ? chalk.yellow(' ⚡ YOLO') : '';

    console.log('');
    console.log(chalk.cyan.bold('╭────────────────────────────────────────────────────────────╮'));
    console.log(chalk.cyan.bold('│') + chalk.white.bold('  🚀 ZESBE AI CLI                                          ') + chalk.cyan.bold('│'));
    console.log(chalk.cyan.bold('├────────────────────────────────────────────────────────────┤'));
    console.log(chalk.cyan.bold('│') + chalk.gray(`  Provider: ${providerName.padEnd(20)}Model: ${this.agent.model.substring(0, 15).padEnd(15)}`) + yoloIndicator.padEnd(7) + chalk.cyan.bold('│'));
    console.log(chalk.cyan.bold('╰────────────────────────────────────────────────────────────╯'));
    console.log('');
    console.log(chalk.gray('  💡 Type ') + chalk.cyan('/') + chalk.gray(' to see commands • ') + chalk.cyan('/help') + chalk.gray(' for full guide • ') + chalk.cyan('/exit') + chalk.gray(' to quit'));
    console.log('');
  }

  /**
   * Print prompt
   */
  private prompt(): void {
    // If stdin was closed while we were processing, exit gracefully now
    if (this.stdinClosed && this.inputQueue.length === 0) {
      this.cleanup();
      process.exit(0);
    }

    // Show separator line and prompt like Claude Code
    console.log(chalk.gray('─────────────────────────────────────────────────────────────────────────────'));
    const promptStr = chalk.cyan.bold('> ');

    if (this.isInteractive) {
      // Interactive mode: use question() for prompt
      this.rl.question(promptStr, async (input) => {
        await this.handleInput(input);
      });
    } else {
      // Piped mode: process from queue
      if (this.inputQueue.length > 0) {
        const input = this.inputQueue.shift()!;
        process.stdout.write(promptStr + input + '\n');
        this.handleInput(input).then(() => {
          // Continue processing queue
        });
      } else if (this.stdinClosed) {
        this.cleanup();
        process.exit(0);
      }
      // If queue is empty but stdin not closed, wait for more input
    }
  }

  /**
   * Handle user input
   */
  private async handleInput(input: string): Promise<void> {
    const trimmed = input.trim();

    if (!trimmed) {
      this.prompt();
      return;
    }

    // Pause readline while processing (interactive mode only)
    if (this.isInteractive) {
      this.rl.pause();
    }

    // Save to history
    if (trimmed !== this.state.inputHistory[this.state.inputHistory.length - 1]) {
      this.state.inputHistory.push(trimmed);
      if (this.state.inputHistory.length > 100) {
        this.state.inputHistory.shift();
      }
    }
    this.state.historyIndex = -1;

    // Check for commands
    if (trimmed.startsWith('/')) {
      await this.handleCommand(trimmed);
    } else {
      await this.chat(trimmed);
    }

    // Resume readline and prompt for next input
    if (this.isInteractive && !this.stdinClosed) {
      this.rl.resume();
    }
    this.prompt();
  }

  /**
   * Show command suggestions
   */
  private showCommandSuggestions(filter?: string): void {
    const filtered = filter
      ? COMMAND_LIST.filter(c => c.cmd.startsWith(filter.toLowerCase()))
      : COMMAND_LIST;

    if (filtered.length === 0) {
      console.log(chalk.red(`❌ No commands match: ${filter}`));
      console.log(chalk.gray('Type /help to see all commands'));
      return;
    }

    // Group by category
    const categories = new Map<string, typeof COMMAND_LIST>();
    filtered.forEach(c => {
      const list = categories.get(c.cat) || [];
      list.push(c);
      categories.set(c.cat, list);
    });

    console.log('');
    console.log(chalk.cyan.bold('╭─────────────────────────────────────────╮'));
    console.log(chalk.cyan.bold('│') + chalk.white.bold('           📋 COMMANDS                   ') + chalk.cyan.bold('│'));
    console.log(chalk.cyan.bold('├─────────────────────────────────────────┤'));

    categories.forEach((cmds, cat) => {
      cmds.forEach(c => {
        const cmdPad = c.cmd.padEnd(14);
        console.log(chalk.cyan.bold('│') + ` ${cat} ${chalk.green(cmdPad)} ${chalk.gray(c.desc.substring(0, 20).padEnd(20))} ` + chalk.cyan.bold('│'));
      });
    });

    console.log(chalk.cyan.bold('╰─────────────────────────────────────────╯'));
    console.log(chalk.gray('  Type command or partial (e.g., /pro → /providers)'));
    console.log('');
  }

  /**
   * Partial command matching
   */
  private matchCommand(input: string): string | null {
    const cmd = input.toLowerCase();

    // Just "/" - show suggestions
    if (cmd === '/') {
      this.showCommandSuggestions();
      return null;
    }

    // Exact match
    if (ALL_COMMANDS.includes(cmd)) {
      return cmd;
    }

    // Prefix match
    const matches = ALL_COMMANDS.filter(c => c.startsWith(cmd));
    if (matches.length === 1) {
      console.log(chalk.gray(`  → ${matches[0]}`)); // Show expanded command
      return matches[0];
    } else if (matches.length > 1) {
      this.showCommandSuggestions(cmd);
      return null;
    }

    return cmd; // Let it fall through to unknown command handling
  }

  /**
   * Handle slash commands
   */
  private async handleCommand(input: string): Promise<void> {
    const [rawCmd, ...argParts] = input.split(' ');
    const args = argParts.join(' ');

    const command = this.matchCommand(rawCmd);
    if (!command) return;

    switch (command) {
      case '/help':
        this.showHelp();
        break;

      case '/clear':
        console.clear();
        this.state.messages = [];
        this.agent.clearHistory();
        this.state.totalTokens = 0;
        this.printHeader();
        console.log(chalk.green('✅ Conversation cleared'));
        break;

      case '/exit':
        this.cleanup();
        process.exit(0);

      case '/provider':
        if (args) {
          this.setProvider(args);
        } else {
          await this.selectProvider();
        }
        break;

      case '/model':
        if (args) {
          this.agent.model = args;
          console.log(chalk.green(`✅ Model: ${args}`));
        } else {
          await this.selectModel();
        }
        break;

      case '/providers':
        console.log(getAllProvidersQuickRef());
        break;

      case '/free':
        const free = getFreeProviders();
        console.log(chalk.cyan.bold('🆓 FREE PROVIDERS:'));
        free.forEach(p => console.log(`  • ${p.name}: ${p.signupUrl}`));
        break;

      case '/setup':
        if (args) {
          const guide = formatProviderGuide(args);
          console.log(guide || chalk.red(`Provider "${args}" not found`));
        } else {
          console.log(chalk.gray('Usage: /setup <provider>\nExample: /setup gemini'));
        }
        break;

      case '/apikey':
        await this.handleApiKey(args);
        break;

      case '/yolo':
        this.agent.yolo = !this.agent.yolo;
        console.log(chalk.green(`✅ Auto-approve: ${this.agent.yolo ? 'ON ⚡' : 'OFF'}`));
        break;

      case '/config':
        this.showConfig();
        break;

      case '/stats':
        this.showStats();
        break;

      case '/context':
        this.showContext();
        break;

      case '/save':
        this.saveSession(args || 'last');
        break;

      case '/load':
        this.loadSession(args || 'last');
        break;

      case '/resume':
        this.loadSession('last');
        break;

      case '/sessions':
        this.listSessions();
        break;

      case '/attach':
        this.attachFile(args);
        break;

      case '/detach':
        this.detachFile(args);
        break;

      case '/files':
        this.showFiles();
        break;

      case '/preview':
        if (args) {
          console.log(createFilePreview(args, { maxLines: 30 }));
        } else {
          console.log(chalk.gray('Usage: /preview <file-path>'));
        }
        break;

      case '/diff':
        this.showDiff(args);
        break;

      case '/export':
        await this.exportChat(args);
        break;

      case '/history':
        this.searchHistory(args);
        break;

      case '/copy':
        await this.copyLastResponse();
        break;

      case '/paste':
        const text = await readFromClipboard();
        if (text) {
          console.log(chalk.green(`📋 Pasted ${text.length} characters`));
          await this.chat(text);
        } else {
          console.log(chalk.gray('Clipboard is empty'));
        }
        break;

      case '/shortcuts':
        this.showShortcuts();
        break;

      case '/mcp':
        await this.handleMCP(args);
        break;

      case '/skills':
        await this.handleSkills(args);
        break;

      default:
        console.log(chalk.red(`❌ Unknown command: ${rawCmd}`));
        console.log(chalk.gray('Type /help for available commands'));
    }
  }

  /**
   * Output token with simple formatting (like Claude Code)
   */
  private outputTokenSimple(token: string): void {
    // Handle newlines with proper indentation like Claude Code
    if (token.includes('\n')) {
      const parts = token.split('\n');
      parts.forEach((part, i) => {
        process.stdout.write(part);
        if (i < parts.length - 1) {
          process.stdout.write('\n  '); // Indent continuation with 2 spaces
        }
      });
    } else {
      // Skip leading newlines to keep bullet connected to text
      const trimmedStart = token.replace(/^\n+/, '');
      if (trimmedStart) {
        process.stdout.write(trimmedStart);
      }
    }
  }

  /**
   * Format user message - Claude Code style with separator after
   */
  private formatUserMessage(message: string): void {
    // Add separator after user input like Claude Code
    console.log(chalk.gray('─────────────────────────────────────────────────────────────────────────────'));
  }

  /**
   * Chat with AI
   */
  private async chat(message: string): Promise<void> {
    this.isProcessing = true;

    // Print user message in a nice box
    this.formatUserMessage(message);

    // Add to state
    this.state.messages.push({ role: 'user', content: message });

    // Start spinner only (like Claude Code - minimal)
    this.currentSpinner = ora({
      text: '',
      spinner: 'dots',
      color: 'yellow',
      stream: process.stdout,
      discardStdin: false
    }).start();

    try {
      let fullResponse = '';
      let tokens = 0;
      let isFirstChunk = true;
      let responseStarted = false;
      let inThinkBlock = false;
      let thinkBuffer = '';

      await this.agent.chat(message, {
        onStart: () => {
          this.currentSpinner?.stop();
          responseStarted = true;
          // Claude Code style: bullet point directly followed by text
          process.stdout.write(chalk.green('● '));
        },
        onToken: (token: string) => {
          // Track think block state
          thinkBuffer += token;

          // Check for think tags in accumulated buffer
          if (thinkBuffer.includes('<think>')) {
            inThinkBlock = true;
            thinkBuffer = thinkBuffer.split('<think>').pop() || '';
          }

          if (thinkBuffer.includes('</think>')) {
            inThinkBlock = false;
            const afterThink = thinkBuffer.split('</think>').pop() || '';
            thinkBuffer = '';
            // Output the part after </think> if any (trim leading whitespace)
            const trimmed = afterThink.replace(/^[\s\n]+/, '');
            if (trimmed) {
              fullResponse += trimmed;
              tokens++;
              this.outputTokenSimple(trimmed);
            }
            return;
          }

          // Skip if inside think block
          if (inThinkBlock) {
            return;
          }

          // Skip raw think tags
          if (token.includes('<think>') || token.includes('</think>')) {
            return;
          }

          fullResponse += token;
          tokens++;
          this.outputTokenSimple(token);
        },
        onToolCall: async (tool: string, args: Record<string, unknown>) => {
          // Claude Code style: bullet point for tool
          console.log('');
          const icon = TOOL_ICONS[tool] || TOOL_ICONS.default;
          const argsStr = Object.entries(args)
            .map(([k, v]) => `${k}=${typeof v === 'string' ? v.substring(0, 30) : v}`)
            .join(', ')
            .substring(0, 50);
          this.currentSpinner = ora({
            text: `${chalk.yellow(tool)}(${chalk.gray(argsStr)})`,
            spinner: 'dots',
            color: 'yellow',
            prefixText: chalk.green('●')
          }).start();
          return true;
        },
        onToolResult: (tool: string, result: unknown) => {
          this.currentSpinner?.stopAndPersist({
            symbol: chalk.green('●'),
            text: `${chalk.cyan(tool)} ${chalk.gray('completed')}`
          });
          this.currentSpinner = null;
        },
        onEnd: () => {
          this.state.totalTokens += tokens;
          this.state.lastResponse = fullResponse;

          if (fullResponse) {
            this.state.messages.push({ role: 'assistant', content: fullResponse, tokens });
          }

          // Simple newline to separate
          console.log('');
        },
        onError: (err: Error) => {
          this.currentSpinner?.fail('Error');
          const error = err as Error & { lastError?: { message?: string }; statusCode?: number };

          // Extract meaningful error message
          let errorMsg = err.message;
          if (error.lastError?.message) {
            errorMsg = error.lastError.message;
          }

          // Format based on error type
          if (error.statusCode === 429 || errorMsg.includes('limit') || errorMsg.includes('429')) {
            console.log(chalk.yellow(`\n⚠️ Rate limit: ${errorMsg}\n`));
          } else if (error.statusCode === 401 || errorMsg.includes('api key') || errorMsg.includes('401')) {
            console.log(chalk.red(`\n🔑 Auth error: ${errorMsg}\n`));
            console.log(chalk.gray('  Use /apikey <key> to set API key'));
          } else {
            console.log(chalk.red(`\n❌ ${errorMsg}\n`));
          }
        }
      });
    } catch (err) {
      this.currentSpinner?.fail('Error');
      const error = err as Error & { cause?: { message?: string }; statusCode?: number; lastError?: { message?: string } };

      // Extract the most meaningful error message
      let errorMsg = error.message;

      // For AI SDK RetryError, extract the last error message
      if (error.lastError?.message) {
        errorMsg = error.lastError.message;
      }
      // For nested errors with cause
      if (error.cause?.message) {
        errorMsg = error.cause.message;
      }

      // Format rate limit errors nicely
      if (error.statusCode === 429 || errorMsg.includes('limit') || errorMsg.includes('429')) {
        console.log(chalk.yellow(`\n⚠️ Rate limit: ${errorMsg}\n`));
      } else if (error.statusCode === 401 || errorMsg.includes('api key') || errorMsg.includes('401')) {
        console.log(chalk.red(`\n🔑 Auth error: ${errorMsg}\n`));
        console.log(chalk.gray('  Use /apikey <key> to set API key'));
      } else {
        console.log(chalk.red(`\n❌ Error: ${errorMsg}\n`));
      }
    }

    this.isProcessing = false;
    this.currentSpinner = null;
  }

  /**
   * Select provider using enquirer
   */
  private async selectProvider(): Promise<void> {
    const providers = getProviderList();
    const enquirer = new Enquirer();

    try {
      const response = await enquirer.prompt({
        type: 'select',
        name: 'provider',
        message: '🔌 Select Provider',
        choices: providers.map(p => ({
          name: p.id,
          message: `${p.name}${p.id === this.agent.provider ? chalk.green(' ✓') : ''}`
        }))
      }) as { provider: string };

      this.setProvider(response.provider);
    } catch {
      // User cancelled
    }
  }

  /**
   * Set provider
   */
  private setProvider(id: string): void {
    const p = PROVIDERS[id];
    if (p) {
      this.agent.provider = id;
      this.agent.baseUrl = p.baseUrl;

      // Load API key
      const keyFile = path.join(os.homedir(), p.apiKeyFile || `.${id}_api_key`);
      if (fs.existsSync(keyFile)) {
        try {
          this.agent.apiKey = fs.readFileSync(keyFile, 'utf-8').trim();
        } catch {}
      }

      const firstModel = p.models?.[0];
      this.agent.model = typeof firstModel === 'object' ? firstModel.id : firstModel;
      console.log(chalk.green(`✅ Provider: ${p.name}, Model: ${this.agent.model}`));
    } else {
      console.log(chalk.red(`❌ Provider not found: ${id}`));
    }
  }

  /**
   * Select model using enquirer
   */
  private async selectModel(): Promise<void> {
    const models = getModelsForProvider(this.agent.provider);
    const enquirer = new Enquirer();

    try {
      const response = await enquirer.prompt({
        type: 'select',
        name: 'model',
        message: '🤖 Select Model',
        choices: models.map(m => ({
          name: m.id,
          message: `${m.name}${m.recommended ? chalk.yellow(' ⭐') : ''}${m.id === this.agent.model ? chalk.green(' ✓') : ''}`
        }))
      }) as { model: string };

      this.agent.model = response.model;
      console.log(chalk.green(`✅ Model: ${response.model}`));
    } catch {
      // User cancelled
    }
  }

  /**
   * Handle API key
   */
  private async handleApiKey(key: string): Promise<void> {
    const info = PROVIDER_INFO[this.agent.provider];
    if (key && info) {
      const keyFile = path.join(os.homedir(), `.${this.agent.provider}_api_key`);
      try {
        fs.writeFileSync(keyFile, key.trim());
        fs.chmodSync(keyFile, 0o600);
        this.agent.apiKey = key.trim();
        console.log(chalk.green(`✅ API key saved for ${info.name}`));
      } catch (e) {
        console.log(chalk.red(`❌ ${(e as Error).message}`));
      }
    } else if (info) {
      console.log(chalk.cyan(`🔐 Set API key:`));
      console.log(chalk.gray(`  /apikey YOUR_KEY`));
      console.log(chalk.gray(`  Get key: ${info.apiKeyUrl}`));
    }
  }

  /**
   * Show help
   */
  private showHelp(): void {
    console.log(`
${chalk.cyan.bold('📚 COMMANDS:')}

${chalk.yellow('🔌 PROVIDER:')}
  /setup <name>    Setup API key with guide
  /providers       List all providers
  /provider        Switch provider
  /model           Switch model
  /apikey <key>    Set API key
  /free            Show FREE providers

${chalk.yellow('💬 CHAT:')}
  /clear           Clear conversation
  /yolo            Toggle auto-approve
  /stats           Session statistics
  /context         Show project context
  /config          Show configuration

${chalk.yellow('💾 SESSION:')}
  /save [name]     Save current session
  /load [name]     Load saved session
  /resume          Resume last session
  /sessions        List all saved sessions

${chalk.yellow('📎 FILES:')}
  /attach <file>   Attach file to context
  /detach <file>   Remove file from context
  /files           List attached files
  /preview <file>  Preview file content
  /diff <f1> <f2>  Show diff between files

${chalk.yellow('📤 EXPORT:')}
  /export [fmt]    Export chat (markdown/json/html/text)
  /history [query] Search conversation history
  /copy            Copy last response
  /paste           Paste from clipboard

${chalk.yellow('🔌 MCP:')}
  /mcp             MCP server management

${chalk.yellow('📚 SKILLS:')}
  /skills          Skills management

${chalk.gray('Press Ctrl+C to exit')}
`);
  }

  /**
   * Show config
   */
  private showConfig(): void {
    const providerName = PROVIDERS[this.agent.provider]?.name || this.agent.provider;
    console.log(chalk.cyan.bold('⚙️ CONFIG:'));
    console.log(`  Provider: ${providerName}`);
    console.log(`  Model: ${this.agent.model}`);
    console.log(`  YOLO: ${this.agent.yolo ? 'ON' : 'OFF'}`);
    console.log(`  Tokens: ${this.state.totalTokens}`);
    console.log(`  Context: ${this.agent.projectContext?.file || 'None'}`);
  }

  /**
   * Show stats
   */
  private showStats(): void {
    const uptime = Math.floor((Date.now() - this.agent.stats.startTime) / 1000);
    const mins = Math.floor(uptime / 60);
    const secs = uptime % 60;

    console.log(chalk.cyan.bold('📊 SESSION STATS:'));
    console.log(`  ├─ Requests: ${this.agent.stats.requests}`);
    console.log(`  ├─ Tool Calls: ${this.agent.stats.toolCalls}`);
    console.log(`  ├─ Total Tokens: ${this.agent.stats.totalTokens}`);
    console.log(`  ├─ Uptime: ${mins}m ${secs}s`);
    console.log(`  └─ Model: ${this.agent.model}`);
  }

  /**
   * Show context
   */
  private showContext(): void {
    if (this.agent.projectContext) {
      console.log(chalk.cyan.bold(`📄 PROJECT CONTEXT (${this.agent.projectContext.file}):`));
      console.log(this.agent.projectContext.content.substring(0, 500));
      if (this.agent.projectContext.content.length > 500) {
        console.log(chalk.gray('... (truncated)'));
      }
    } else {
      console.log(chalk.gray('📄 No project context file found.'));
      console.log(chalk.gray('\nCreate one of: ZESBE.md, CLAUDE.md, GEMINI.md, AI.md'));
    }
  }

  /**
   * Save session
   */
  private saveSession(name: string): void {
    const result = this.agent.saveSession(name);
    if (result.success) {
      console.log(chalk.green(`✅ Session saved: ${name}`));
      console.log(chalk.gray(`   Path: ${result.path}`));
    } else {
      console.log(chalk.red(`❌ Save failed: ${result.error}`));
    }
  }

  /**
   * Load session
   */
  private loadSession(name: string): void {
    const result = this.agent.loadSession(name);
    if (result.success) {
      console.log(chalk.green(`✅ Session loaded: ${name}`));
      console.log(chalk.gray(`   Messages: ${result.messageCount}`));
      console.log(chalk.gray(`   Summary: ${result.summary}`));
    } else {
      console.log(chalk.yellow(`No session found: ${name}`));
    }
  }

  /**
   * List sessions
   */
  private listSessions(): void {
    if (!fs.existsSync(SESSION_DIR)) {
      console.log(chalk.gray('No saved sessions'));
      return;
    }

    const sessions = fs.readdirSync(SESSION_DIR)
      .filter(f => f.endsWith('.json'))
      .slice(0, 10);

    if (sessions.length === 0) {
      console.log(chalk.gray('No saved sessions'));
      return;
    }

    console.log(chalk.cyan.bold('📚 SAVED SESSIONS:'));
    sessions.forEach(s => {
      console.log(`  • ${s.replace('.json', '')}`);
    });
    console.log(chalk.gray('\nUse /load <name> to load'));
  }

  /**
   * Attach file
   */
  private attachFile(filePath: string): void {
    if (!filePath) {
      console.log(chalk.gray('Usage: /attach <file-path>'));
      return;
    }

    const file = this.contextManager.attachFile(filePath);
    if (file) {
      this.state.attachedFiles = this.contextManager.getAttachedFiles().map(f => f.path);
      console.log(chalk.green(`📎 Attached: ${file.name} (${file.tokens} tokens, ${file.language})`));
    } else {
      console.log(chalk.red(`❌ Failed to attach: ${filePath}`));
    }
  }

  /**
   * Detach file
   */
  private detachFile(filePath: string): void {
    if (!filePath) {
      console.log(chalk.gray('Usage: /detach <file-path|all>'));
      return;
    }

    if (filePath === 'all') {
      this.contextManager.detachAll();
      this.state.attachedFiles = [];
      console.log(chalk.green('📎 All files detached'));
    } else if (this.contextManager.detachFile(filePath)) {
      this.state.attachedFiles = this.contextManager.getAttachedFiles().map(f => f.path);
      console.log(chalk.green(`📎 Detached: ${filePath}`));
    } else {
      console.log(chalk.red(`❌ File not attached: ${filePath}`));
    }
  }

  /**
   * Show files
   */
  private showFiles(): void {
    const files = this.contextManager.getAttachedFiles();
    if (files.length === 0) {
      console.log(chalk.gray('📁 No files attached'));
      console.log(chalk.gray('Use /attach <file> to add files'));
    } else {
      const info = this.contextManager.getContextInfo();
      console.log(formatContextInfo(info));
    }
  }

  /**
   * Show diff
   */
  private showDiff(args: string): void {
    const parts = args.split(' ');
    if (parts.length < 2) {
      console.log(chalk.gray('Usage: /diff <file1> <file2>'));
      return;
    }

    try {
      const old = fs.readFileSync(parts[0], 'utf-8');
      const newContent = fs.readFileSync(parts[1], 'utf-8');
      console.log(createFileDiff(parts[0], parts[1], old, newContent));
    } catch (e) {
      console.log(chalk.red(`❌ ${(e as Error).message}`));
    }
  }

  /**
   * Export chat
   */
  private async exportChat(format: string): Promise<void> {
    const fmt = (format || 'markdown') as ExportFormat;
    const chatMessages: ChatMessage[] = this.state.messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
        timestamp: new Date(),
        tokens: m.tokens
      }));

    if (chatMessages.length === 0) {
      console.log(chalk.gray('No conversation to export'));
      return;
    }

    const conv = saveConversation(chatMessages, this.agent.provider, this.agent.model);
    const exported = exportConversation(conv, fmt);
    const ext = fmt === 'markdown' ? 'md' : fmt;
    const exportPath = path.join(process.cwd(), `chat-${Date.now()}.${ext}`);
    fs.writeFileSync(exportPath, exported);
    console.log(chalk.green(`📤 Exported to: ${exportPath}`));
  }

  /**
   * Search history
   */
  private searchHistory(query: string): void {
    if (query) {
      const results = searchConversations(query);
      console.log(formatSearchResults(results, query));
    } else {
      const convList = listConversations(10);
      console.log(formatConversationList(convList));
    }
  }

  /**
   * Copy last response
   */
  private async copyLastResponse(): Promise<void> {
    if (!this.state.lastResponse) {
      console.log(chalk.gray('No response to copy'));
      return;
    }

    const success = await copyToClipboard(this.state.lastResponse);
    if (success) {
      console.log(chalk.green('📋 Last response copied to clipboard'));
    } else {
      console.log(chalk.red('❌ Failed to copy to clipboard'));
    }
  }

  /**
   * Show shortcuts
   */
  private showShortcuts(): void {
    console.log(chalk.cyan.bold('⌨️ KEYBOARD SHORTCUTS:'));
    console.log('');
    console.log('  Ctrl+C      Exit / Interrupt');
    console.log('  /copy       Copy last response');
    console.log('  /paste      Paste from clipboard');
    console.log('');
    console.log(chalk.gray('Note: Up/Down history not available in this mode'));
  }

  /**
   * Handle MCP commands
   */
  private async handleMCP(args: string): Promise<void> {
    const mcpManager = getMCPManager();
    const [cmd, ...rest] = args.split(' ');
    const mcpArgs = rest.join(' ');

    switch (cmd) {
      case '':
      case 'list':
        const servers = mcpManager.listServers();
        if (servers.length === 0) {
          console.log(chalk.gray('🔌 No MCP servers connected'));
          console.log(chalk.gray('Edit ~/.zesbe/mcp.json, then /mcp connect'));
        } else {
          console.log(chalk.cyan.bold('🔌 MCP SERVERS:'));
          servers.forEach(s => {
            console.log(`  • ${s.name} (${s.tools} tools)`);
          });
        }
        break;

      case 'connect':
        const spinner = ora('Connecting to MCP servers...').start();
        const results = await mcpManager.connectAll();
        spinner.stop();
        results.forEach(r => {
          if (r.success) {
            console.log(chalk.green(`✅ ${r.name}: ${r.tools?.length || 0} tools`));
          } else {
            console.log(chalk.red(`❌ ${r.name}: ${r.error}`));
          }
        });
        break;

      case 'disconnect':
        await mcpManager.disconnectAll();
        console.log(chalk.green('✅ Disconnected from all MCP servers'));
        break;

      case 'tools':
        const tools = mcpManager.getToolsForAI();
        if (tools.length === 0) {
          console.log(chalk.gray('No MCP tools. Run /mcp connect first'));
        } else {
          console.log(chalk.cyan.bold('🔧 MCP TOOLS:'));
          tools.forEach(t => console.log(`  • ${t.function.name}`));
        }
        break;

      case 'browse':
        console.log(chalk.cyan.bold('🏪 POPULAR MCP SERVERS:'));
        POPULAR_MCP_SERVERS.slice(0, 8).forEach(s => {
          console.log(`  ${s.official ? '⭐' : '•'} ${s.id} - ${s.name}`);
          console.log(chalk.gray(`    ${s.description}`));
        });
        console.log(chalk.gray('\nUse /mcp install <id> to add'));
        break;

      case 'search':
        if (!mcpArgs) {
          console.log(chalk.gray('Usage: /mcp search <query>'));
          return;
        }
        const searchResults = searchServers(mcpArgs);
        if (searchResults.length === 0) {
          console.log(chalk.yellow(`No servers found for "${mcpArgs}"`));
        } else {
          console.log(chalk.cyan.bold(`🔍 RESULTS (${searchResults.length}):`));
          searchResults.slice(0, 5).forEach(s => {
            console.log(`  • ${s.id} - ${s.name}`);
          });
        }
        break;

      case 'install':
        if (!mcpArgs) {
          console.log(chalk.gray('Usage: /mcp install <server-id>'));
          return;
        }
        const server = getServerById(mcpArgs);
        if (!server) {
          console.log(chalk.red(`Server not found: ${mcpArgs}`));
          return;
        }
        if (server.install.requiresPath || server.install.requiresToken) {
          console.log(chalk.yellow(`⚠️ This server requires manual config`));
          console.log(chalk.gray(`Edit ~/.zesbe/mcp.json`));
        } else {
          const config = mcpManager.loadConfig();
          config.mcpServers[server.id] = generateInstallConfig(server);
          mcpManager.saveConfig(config);
          console.log(chalk.green(`✅ ${server.name} added! Run /mcp connect`));
        }
        break;

      default:
        console.log(chalk.gray('Usage: /mcp [list|connect|disconnect|tools|browse|search|install]'));
    }
  }

  /**
   * Handle skills commands
   */
  private async handleSkills(args: string): Promise<void> {
    const skillsManager = getSkillsManager();
    const [cmd, ...rest] = args.split(' ');
    const skillArgs = rest.join(' ');

    switch (cmd) {
      case '':
      case 'list':
        skillsManager.scanSkills();
        const available = skillsManager.getAvailableSkills();
        const loaded = skillsManager.getLoadedSkills();

        if (available.length === 0) {
          console.log(chalk.gray('📚 No skills found'));
          console.log(chalk.gray('Create skills in ~/.zesbe/skills/ or .skills/'));
        } else {
          console.log(chalk.cyan.bold('📚 SKILLS:'));
          available.forEach(s => {
            const isLoaded = loaded.find(l => l.id === s.id);
            console.log(`  ${isLoaded ? '✅' : '⬚'} ${s.id} - ${s.description || s.name}`);
          });
        }
        break;

      case 'load':
        if (!skillArgs) {
          console.log(chalk.gray('Usage: /skills load <id>'));
          return;
        }
        const loadResult = skillsManager.loadSkill(skillArgs);
        if (loadResult.success) {
          this.agent.refreshSystemPrompt();
          console.log(chalk.green(`✅ Loaded: ${loadResult.skill?.name}`));
        } else {
          console.log(chalk.red(`❌ ${loadResult.error}`));
        }
        break;

      case 'unload':
        if (!skillArgs) {
          console.log(chalk.gray('Usage: /skills unload <id>'));
          return;
        }
        if (skillsManager.unloadSkill(skillArgs)) {
          this.agent.refreshSystemPrompt();
          console.log(chalk.green(`✅ Unloaded: ${skillArgs}`));
        } else {
          console.log(chalk.red(`❌ Skill not loaded: ${skillArgs}`));
        }
        break;

      case 'loaded':
        const loadedSkills = skillsManager.getLoadedSkills();
        if (loadedSkills.length === 0) {
          console.log(chalk.gray('No skills loaded'));
        } else {
          console.log(chalk.cyan.bold('📚 LOADED SKILLS:'));
          loadedSkills.forEach(s => console.log(`  • ${s.name}`));
        }
        break;

      default:
        console.log(chalk.gray('Usage: /skills [list|load|unload|loaded]'));
    }
  }

  /**
   * Start the CLI
   */
  async start(initialPrompt?: string): Promise<void> {
    this.printHeader();

    if (initialPrompt) {
      await this.chat(initialPrompt);
    }

    if (!this.isInteractive) {
      // For piped input, wait for all input to be collected before processing
      await new Promise<void>((resolve) => {
        if (this.stdinClosed) {
          resolve();
        } else {
          // Wait for close event
          this.rl.once('close', () => resolve());
        }
      });
    }

    this.prompt();
  }
}

/**
 * Export start function
 */
export async function startInkMode(agent: AgentType, initialPrompt?: string): Promise<void> {
  const cli = new ChatCLI(agent);
  await cli.start(initialPrompt);
}
