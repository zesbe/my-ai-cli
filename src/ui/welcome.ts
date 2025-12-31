import boxen from 'boxen';
import chalk from 'chalk';
import gradient from 'gradient-string';
import os from 'os';

const VERSION = '1.0.0';

// Get username
function getUsername(): string {
  return os.userInfo().username || process.env.USER || 'User';
}

// Get current directory
function getCurrentDir(): string {
  return process.cwd();
}

// Create ZESBE ASCII art logo
function createLogo(): string {
  const logo = `
  ███████╗███████╗███████╗██████╗ ███████╗
  ╚══███╔╝██╔════╝██╔════╝██╔══██╗██╔════╝
    ███╔╝ █████╗  ███████╗██████╔╝█████╗
   ███╔╝  ██╔══╝  ╚════██║██╔══██╗██╔══╝
  ███████╗███████╗███████║██████╔╝███████╗
  ╚══════╝╚══════╝╚══════╝╚═════╝ ╚══════╝`;

  return gradient.pastel(logo);
}

// Simple compact logo for smaller screens
function createCompactLogo(): string {
  return gradient.cristal('  ⚡ ZESBE AI CLI ⚡');
}

interface WelcomeOptions {
  model?: string;
  provider?: string;
  yolo?: boolean;
}

// Create welcome box
export function showWelcome(options: WelcomeOptions = {}): void {
  const cwd = getCurrentDir();
  const model = options.model || 'gpt-4o';
  const provider = options.provider || 'openai';

  // Check terminal width
  const termWidth = process.stdout.columns || 80;
  const useCompact = termWidth < 60;

  // Clean ASCII style - no box
  console.log('');
  console.log(useCompact ? createCompactLogo() : createLogo());
  console.log('');

  // Single status line
  const statusParts = [
    chalk.cyan(provider),
    chalk.white('•'),
    chalk.magenta(model)
  ];

  if (options.yolo) {
    statusParts.push(chalk.white('•'));
    statusParts.push(chalk.yellow('⚡ YOLO'));
  }

  console.log('  ' + statusParts.join(' '));
  console.log(chalk.gray(`  📁 ${cwd}`));
  console.log('');
}

// Show compact header for subsequent prompts
export function showHeader(model: string, provider: string): string {
  const header = chalk.cyan(`[${provider}/${model}]`);
  return header;
}

// Show goodbye message
export function showGoodbye(): void {
  console.log(boxen(
    gradient.pastel('\n  👋 Goodbye! Session saved.\n'),
    {
      padding: 0,
      margin: { top: 1, bottom: 1 },
      borderStyle: 'round',
      borderColor: 'gray'
    }
  ));
}

export { VERSION };
