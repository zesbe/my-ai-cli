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
    chalk.white(`  Selamat datang kembali, ${chalk.cyan.bold(username)}!`),
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
    console.log(chalk.yellow('\n  ⚡ Mode YOLO aktif - semua tindakan disetujui otomatis\n'));
  }

  // Prompt hints
  console.log(chalk.gray('─'.repeat(Math.min(termWidth - 2, 70))));
  console.log(chalk.gray('  💡 Ketik pesan atau gunakan /help untuk perintah'));
  console.log(chalk.gray('─'.repeat(Math.min(termWidth - 2, 70))));

  if (options.yolo) {
    console.log(chalk.green('  ⚡ izin akses: OTOMATIS (ON)'));
  }

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
    gradient.pastel('\n  👋 Sampai jumpa! Sesi telah disimpan.\n'),
    {
      padding: 0,
      margin: { top: 1, bottom: 1 },
      borderStyle: 'round',
      borderColor: 'gray'
    }
  ));
}

export { VERSION };
