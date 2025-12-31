/**
 * Slash Commands System
 * Handles /command style shortcuts for common operations
 */

import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

// Command handler type
export type CommandHandler = (args: string[], context: CommandContext) => Promise<CommandResult> | CommandResult;

// Command context passed to handlers
export interface CommandContext {
  cwd: string;
  history: Array<{ role: string; content: string }>;
  provider: string;
  model: string;
  attachedFiles: string[];
  onProviderChange?: (provider: string) => void;
  onModelChange?: (model: string) => void;
  onClear?: () => void;
  onExit?: () => void;
  onAttach?: (file: string) => void;
  onDetach?: (file: string) => void;
}

// Command result
export interface CommandResult {
  success: boolean;
  message?: string;
  prompt?: string;  // Optional prompt to send to AI
  action?: 'clear' | 'exit' | 'provider' | 'model' | 'attach' | 'detach' | 'none';
  data?: any;
}

// Command definition
export interface Command {
  name: string;
  aliases: string[];
  description: string;
  usage: string;
  examples: string[];
  handler: CommandHandler;
}

// Built-in commands
const commands: Map<string, Command> = new Map();

// Register a command
export function registerCommand(command: Command): void {
  commands.set(command.name, command);
  command.aliases.forEach(alias => {
    commands.set(alias, command);
  });
}

// Get command by name
export function getCommand(name: string): Command | undefined {
  return commands.get(name.toLowerCase());
}

// Get all commands (unique, no aliases)
export function getAllCommands(): Command[] {
  const unique = new Map<string, Command>();
  commands.forEach(cmd => unique.set(cmd.name, cmd));
  return Array.from(unique.values());
}

// Check if input is a command
export function isCommand(input: string): boolean {
  return input.trim().startsWith('/');
}

// Parse command from input
export function parseCommand(input: string): { name: string; args: string[] } | null {
  if (!isCommand(input)) return null;

  const trimmed = input.trim().slice(1); // Remove leading /
  const parts = trimmed.split(/\s+/);
  const name = parts[0]?.toLowerCase() || '';
  const args = parts.slice(1);

  return { name, args };
}

// Execute a command
export async function executeCommand(input: string, context: CommandContext): Promise<CommandResult> {
  const parsed = parseCommand(input);
  if (!parsed) {
    return { success: false, message: 'Invalid command format' };
  }

  const command = getCommand(parsed.name);
  if (!command) {
    return {
      success: false,
      message: `Unknown command: /${parsed.name}\nType /help for available commands.`
    };
  }

  try {
    return await command.handler(parsed.args, context);
  } catch (error) {
    return {
      success: false,
      message: `Error executing /${parsed.name}: ${(error as Error).message}`
    };
  }
}

// ============================================================================
// BUILT-IN COMMANDS
// ============================================================================

// /help - Show help
registerCommand({
  name: 'help',
  aliases: ['h', '?'],
  description: 'Show available commands',
  usage: '/help [command]',
  examples: ['/help', '/help fix'],
  handler: (args) => {
    if (args.length > 0) {
      const cmd = getCommand(args[0]);
      if (cmd) {
        const help = [
          chalk.bold.cyan(`/${cmd.name}`),
          chalk.gray(cmd.description),
          '',
          chalk.yellow('Usage:') + ' ' + cmd.usage,
          '',
          chalk.yellow('Examples:'),
          ...cmd.examples.map(e => '  ' + chalk.dim(e)),
        ].join('\n');
        return { success: true, message: help };
      }
      return { success: false, message: `Unknown command: ${args[0]}` };
    }

    const cmds = getAllCommands();
    const help = [
      chalk.bold.cyan('Available Commands:'),
      '',
      ...cmds.map(cmd => {
        const aliases = cmd.aliases.length > 0
          ? chalk.dim(` (${cmd.aliases.map(a => '/' + a).join(', ')})`)
          : '';
        return `  ${chalk.green('/' + cmd.name)}${aliases} - ${cmd.description}`;
      }),
      '',
      chalk.gray('Type /help <command> for detailed help'),
    ].join('\n');

    return { success: true, message: help };
  }
});

// /clear - Clear chat history
registerCommand({
  name: 'clear',
  aliases: ['c', 'cls'],
  description: 'Clear chat history and screen',
  usage: '/clear',
  examples: ['/clear'],
  handler: (_args, context) => {
    if (context.onClear) context.onClear();
    return { success: true, message: chalk.green('Chat cleared'), action: 'clear' };
  }
});

// /exit - Exit CLI
registerCommand({
  name: 'exit',
  aliases: ['quit', 'q'],
  description: 'Exit the CLI',
  usage: '/exit',
  examples: ['/exit'],
  handler: (_args, context) => {
    if (context.onExit) context.onExit();
    return { success: true, action: 'exit' };
  }
});

// /provider - Change provider
registerCommand({
  name: 'provider',
  aliases: ['p'],
  description: 'Change AI provider',
  usage: '/provider <name>',
  examples: ['/provider glm', '/provider openai', '/p anthropic'],
  handler: (args, context) => {
    if (args.length === 0) {
      return {
        success: true,
        message: `Current provider: ${chalk.cyan(context.provider)}\n` +
          chalk.gray('Available: openai, anthropic, glm, gemini, groq, deepseek, ollama')
      };
    }
    const provider = args[0].toLowerCase();
    if (context.onProviderChange) context.onProviderChange(provider);
    return {
      success: true,
      message: chalk.green(`Provider changed to: ${provider}`),
      action: 'provider',
      data: { provider }
    };
  }
});

// /model - Change model
registerCommand({
  name: 'model',
  aliases: ['m'],
  description: 'Change AI model',
  usage: '/model <name>',
  examples: ['/model gpt-4o', '/model claude-3-5-sonnet', '/m glm-4-plus'],
  handler: (args, context) => {
    if (args.length === 0) {
      return { success: true, message: `Current model: ${chalk.cyan(context.model)}` };
    }
    const model = args[0];
    if (context.onModelChange) context.onModelChange(model);
    return {
      success: true,
      message: chalk.green(`Model changed to: ${model}`),
      action: 'model',
      data: { model }
    };
  }
});

// /attach - Attach file to context
registerCommand({
  name: 'attach',
  aliases: ['a', 'add'],
  description: 'Attach file to chat context',
  usage: '/attach <file>',
  examples: ['/attach src/index.ts', '/a package.json'],
  handler: (args, context) => {
    if (args.length === 0) {
      if (context.attachedFiles.length === 0) {
        return { success: true, message: chalk.gray('No files attached') };
      }
      return {
        success: true,
        message: chalk.cyan('Attached files:\n') +
          context.attachedFiles.map(f => '  ' + chalk.green('✓') + ' ' + f).join('\n')
      };
    }

    const filePath = path.resolve(context.cwd, args[0]);
    if (!fs.existsSync(filePath)) {
      return { success: false, message: `File not found: ${args[0]}` };
    }

    if (context.onAttach) context.onAttach(filePath);
    return {
      success: true,
      message: chalk.green(`Attached: ${args[0]}`),
      action: 'attach',
      data: { file: filePath }
    };
  }
});

// /detach - Remove file from context
registerCommand({
  name: 'detach',
  aliases: ['d', 'remove'],
  description: 'Remove file from chat context',
  usage: '/detach <file|all>',
  examples: ['/detach src/index.ts', '/detach all'],
  handler: (args, context) => {
    if (args.length === 0) {
      return { success: false, message: 'Usage: /detach <file|all>' };
    }

    if (args[0] === 'all') {
      context.attachedFiles.forEach(f => {
        if (context.onDetach) context.onDetach(f);
      });
      return { success: true, message: chalk.green('All files detached'), action: 'detach' };
    }

    const filePath = path.resolve(context.cwd, args[0]);
    if (context.onDetach) context.onDetach(filePath);
    return {
      success: true,
      message: chalk.green(`Detached: ${args[0]}`),
      action: 'detach',
      data: { file: filePath }
    };
  }
});

// /fix - Quick fix command
registerCommand({
  name: 'fix',
  aliases: ['f'],
  description: 'Ask AI to fix code or error',
  usage: '/fix [description]',
  examples: ['/fix the type error', '/fix this function'],
  handler: (args) => {
    const description = args.join(' ') || 'the issue';
    return {
      success: true,
      prompt: `Please fix ${description}. Analyze the problem and provide a corrected solution.`
    };
  }
});

// /explain - Explain code
registerCommand({
  name: 'explain',
  aliases: ['e', 'what'],
  description: 'Ask AI to explain code or concept',
  usage: '/explain [topic]',
  examples: ['/explain this code', '/explain async/await'],
  handler: (args) => {
    const topic = args.join(' ') || 'the code above';
    return {
      success: true,
      prompt: `Please explain ${topic} in detail. Break down how it works step by step.`
    };
  }
});

// /refactor - Refactor code
registerCommand({
  name: 'refactor',
  aliases: ['r', 'improve'],
  description: 'Ask AI to refactor or improve code',
  usage: '/refactor [focus]',
  examples: ['/refactor for performance', '/refactor to use async/await'],
  handler: (args) => {
    const focus = args.join(' ') || 'for better readability and maintainability';
    return {
      success: true,
      prompt: `Please refactor this code ${focus}. Explain the improvements you make.`
    };
  }
});

// /test - Generate tests
registerCommand({
  name: 'test',
  aliases: ['t'],
  description: 'Ask AI to generate tests',
  usage: '/test [framework]',
  examples: ['/test', '/test jest', '/test mocha'],
  handler: (args) => {
    const framework = args[0] || 'appropriate testing framework';
    return {
      success: true,
      prompt: `Please write comprehensive tests using ${framework} for the code. Include edge cases and error handling tests.`
    };
  }
});

// /review - Code review
registerCommand({
  name: 'review',
  aliases: ['cr'],
  description: 'Ask AI to review code',
  usage: '/review',
  examples: ['/review'],
  handler: () => {
    return {
      success: true,
      prompt: 'Please review this code. Check for bugs, security issues, performance problems, and suggest improvements. Be thorough but constructive.'
    };
  }
});

// /doc - Generate documentation
registerCommand({
  name: 'doc',
  aliases: ['docs'],
  description: 'Ask AI to generate documentation',
  usage: '/doc [style]',
  examples: ['/doc', '/doc jsdoc', '/doc markdown'],
  handler: (args) => {
    const style = args[0] || 'comprehensive';
    return {
      success: true,
      prompt: `Please generate ${style} documentation for this code. Include function descriptions, parameters, return values, and examples.`
    };
  }
});

// /history - Show chat history
registerCommand({
  name: 'history',
  aliases: ['hist'],
  description: 'Show chat history',
  usage: '/history [count]',
  examples: ['/history', '/history 5'],
  handler: (args, context) => {
    const count = parseInt(args[0]) || 10;
    const history = context.history.slice(-count * 2);

    if (history.length === 0) {
      return { success: true, message: chalk.gray('No chat history') };
    }

    const formatted = history.map((msg, i) => {
      const role = msg.role === 'user' ? chalk.cyan('You') : chalk.green('AI');
      const content = msg.content.length > 100
        ? msg.content.slice(0, 100) + '...'
        : msg.content;
      return `${chalk.dim(i + 1 + '.')} ${role}: ${content}`;
    }).join('\n');

    return { success: true, message: formatted };
  }
});

// /status - Show current status
registerCommand({
  name: 'status',
  aliases: ['s', 'info'],
  description: 'Show current session status',
  usage: '/status',
  examples: ['/status'],
  handler: (_args, context) => {
    const status = [
      chalk.bold.cyan('Session Status:'),
      '',
      `  ${chalk.yellow('Provider:')} ${context.provider}`,
      `  ${chalk.yellow('Model:')} ${context.model}`,
      `  ${chalk.yellow('Directory:')} ${context.cwd}`,
      `  ${chalk.yellow('History:')} ${context.history.length} messages`,
      `  ${chalk.yellow('Attached:')} ${context.attachedFiles.length} files`,
    ].join('\n');

    return { success: true, message: status };
  }
});

// /compact - Summarize conversation
registerCommand({
  name: 'compact',
  aliases: ['sum', 'summarize'],
  description: 'Ask AI to summarize the conversation',
  usage: '/compact',
  examples: ['/compact'],
  handler: () => {
    return {
      success: true,
      prompt: 'Please provide a brief summary of our conversation so far. What have we discussed and accomplished?'
    };
  }
});

// /template - Quick templates
registerCommand({
  name: 'template',
  aliases: ['tmpl'],
  description: 'Use a quick prompt template',
  usage: '/template <name>',
  examples: ['/template api', '/template component', '/template cli'],
  handler: (args) => {
    const templates: Record<string, string> = {
      'api': 'Create a REST API endpoint with proper error handling, validation, and documentation.',
      'component': 'Create a React component with TypeScript, proper props interface, and good practices.',
      'cli': 'Create a CLI command with argument parsing, help text, and error handling.',
      'test': 'Write comprehensive unit tests with good coverage and edge cases.',
      'readme': 'Generate a professional README.md with installation, usage, and API documentation.',
      'dockerfile': 'Create an optimized Dockerfile with multi-stage builds and security best practices.',
    };

    if (args.length === 0) {
      const list = Object.keys(templates).map(t => `  ${chalk.green(t)}`).join('\n');
      return { success: true, message: chalk.cyan('Available templates:\n') + list };
    }

    const template = templates[args[0].toLowerCase()];
    if (!template) {
      return { success: false, message: `Unknown template: ${args[0]}` };
    }

    return { success: true, prompt: template };
  }
});

export default {
  registerCommand,
  getCommand,
  getAllCommands,
  isCommand,
  parseCommand,
  executeCommand,
};
