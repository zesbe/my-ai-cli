import boxen from 'boxen';
import chalk from 'chalk';
import figlet from 'figlet';
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

// Create ASCII art logo
function createLogo() {
  const logo = `
     * ▐▛███▜▌ *
    * ▝▜█████▛▘ *
     *  ▘▘ ▝▝  *
`;
  return chalk.cyan(logo);
}

// Create welcome box
export function showWelcome(options = {}) {
  const username = getUsername();
  const cwd = getCurrentDir();
  const model = options.model || 'gpt-4o';
  const provider = options.provider || 'openai';

  // Left side content
  const leftContent = [
    '',
    chalk.bold.white(`        Welcome back ${username}!`),
    '',
    createLogo(),
    chalk.gray(`${model} · ${provider}`),
    chalk.gray(`        ${cwd}`),
    ''
  ].join('\n');

  // Right side content
  const rightContent = [
    chalk.bold.white('Tips for getting'),
    chalk.bold.white('started'),
    chalk.gray('Run /help to see all...'),
    chalk.gray('commands available'),
    chalk.gray('────────────────────'),
    chalk.bold.white('Tools available'),
    chalk.gray('bash, read, write,'),
    chalk.gray('edit, glob, grep')
  ].join('\n');

  // Create the box
  const title = gradient.pastel(`─── My AI CLI v${VERSION} `);

  const box = boxen(leftContent, {
    padding: 1,
    margin: 0,
    borderStyle: 'round',
    borderColor: 'cyan',
    title: title,
    titleAlignment: 'left',
    width: 75
  });

  console.log(box);

  // Status line
  if (options.yolo) {
    console.log(chalk.yellow('\n  ⚠️  YOLO mode enabled - auto-approving all actions\n'));
  }

  // Prompt hint
  console.log(chalk.gray('─'.repeat(75)));
  console.log(chalk.gray('> Try "help me with coding" or use /tools to see available tools'));
  console.log(chalk.gray('─'.repeat(75)));

  if (options.yolo) {
    console.log(chalk.green('  ⏵⏵ bypass permissions on') + chalk.gray(' (shift+tab to cycle)'));
  } else {
    console.log(chalk.gray('  ⏵⏵ bypass permissions off') + chalk.gray(' (use --yolo to enable)'));
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
    chalk.cyan('\n  👋 Goodbye! See you next time.\n'),
    {
      padding: 0,
      margin: { top: 1, bottom: 1 },
      borderStyle: 'round',
      borderColor: 'gray'
    }
  ));
}
