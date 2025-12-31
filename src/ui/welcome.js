import boxen from 'boxen';
import chalk from 'chalk';
import gradient from 'gradient-string';
import os from 'os';

const VERSION = '1.0.0';

// Get username
function getUsername() {
  return os.userInfo().username || process.env.USER || 'User';
}

// Get current directory
function getCurrentDir() {
  return process.cwd();
}

// Create ZESBE ASCII art logo
function createLogo() {
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
function createCompactLogo() {
  return gradient.cristal('  ⚡ ZESBE AI CLI ⚡');
}

// Create welcome box
export function showWelcome(options = {}) {
  const username = getUsername();
  const cwd = getCurrentDir();
  const model = options.model || 'gpt-4o';
  const provider = options.provider || 'openai';

  // Check terminal width
  const termWidth = process.stdout.columns || 80;
  const useCompact = termWidth < 60;

  // Content
  const content = [
    '',
    useCompact ? createCompactLogo() : createLogo(),
    '',
    chalk.white(`  Welcome back, ${chalk.cyan.bold(username)}!`),
    '',
    chalk.gray(`  🤖 Provider: ${chalk.white(provider)}`),
    chalk.gray(`  📦 Model: ${chalk.white(model)}`),
    chalk.gray(`  📁 ${cwd}`),
    ''
  ].join('\n');

  // Create the box
  const title = gradient.pastel(`─── Zesbe AI CLI v${VERSION} `);

  const box = boxen(content, {
    padding: { top: 0, bottom: 0, left: 1, right: 1 },
    margin: 0,
    borderStyle: 'round',
    borderColor: 'cyan',
    title: title,
    titleAlignment: 'left'
  });

  console.log(box);

  // Status line
  if (options.yolo) {
    console.log(chalk.yellow('\n  ⚡ YOLO mode enabled - auto-approving all actions\n'));
  }

  // Prompt hints
  console.log(chalk.gray('─'.repeat(Math.min(termWidth - 2, 70))));
  console.log(chalk.gray('  💡 Type a message or use /help for commands'));
  console.log(chalk.gray('─'.repeat(Math.min(termWidth - 2, 70))));

  if (options.yolo) {
    console.log(chalk.green('  ⚡ bypass permissions ON'));
  }

  console.log('');
}

// Show compact header for subsequent prompts
export function showHeader(model, provider) {
  const header = chalk.cyan(`[${provider}/${model}]`);
  return header;
}

// Show goodbye message
export function showGoodbye() {
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
