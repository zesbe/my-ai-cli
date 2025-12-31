import readline from 'readline';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { showGoodbye } from './ui/welcome.js';
import { handleMCPCommand } from './mcp-cli.js';
import { PROVIDERS, getProviderList, getModelsForProvider } from './models-db.js';
import { PROVIDER_INFO, formatProviderGuide, getAllProvidersQuickRef, getFreeProviders } from './provider-info.js';
import type { Agent as AgentType } from './agent.js';

// Filter out <think>...</think> tags from streaming output
class ThinkingFilter {
  private buffer: string;
  private inThinking: boolean;

  constructor() {
    this.buffer = '';
    this.inThinking = false;
  }

  process(token: string): string {
    this.buffer += token;
    let output = '';

    while (this.buffer.includes('<think>')) {
      const start = this.buffer.indexOf('<think>');
      output += this.buffer.substring(0, start);
      this.buffer = this.buffer.substring(start + 7);
      this.inThinking = true;
    }

    while (this.inThinking && this.buffer.includes('</think>')) {
      const end = this.buffer.indexOf('</think>');
      this.buffer = this.buffer.substring(end + 8);
      this.inThinking = false;
    }

    if (!this.inThinking && !this.buffer.includes('<')) {
      output += this.buffer;
      this.buffer = '';
    } else if (!this.inThinking && this.buffer.length > 20) {
      if (!this.buffer.includes('<')) {
        output += this.buffer;
        this.buffer = '';
      }
    }

    return output;
  }

  flush(): string {
    const remaining = this.inThinking ? '' : this.buffer;
    this.buffer = '';
    this.inThinking = false;
    return remaining;
  }
}

interface ApiKeyPromptResult {
  needInput: 'apikey';
  keyFile: string;
  providerInfo: typeof PROVIDER_INFO[keyof typeof PROVIDER_INFO];
}

export async function startInteractiveMode(agent: AgentType, initialPrompt?: string): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true
  });

  let tokenCount = 0;
  let messageCount = 0;

  rl.on('close', () => {
    showGoodbye();
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('');
    showGoodbye();
    rl.close();
    process.exit(0);
  });

  const showPrompt = (): void => {
    console.log('');
    console.log(chalk.gray('─'.repeat(70)));
    process.stdout.write(chalk.cyan.bold('> '));
  };

  const showHelp = (): void => {
    console.log(chalk.cyan(`
📚 MY AI CLI - COMMAND REFERENCE (Classic Mode)

🔑 SETUP & API KEYS:
  /setup <provider>   Panduan setup API key (contoh: /setup gemini)
  /providers          List semua providers + pricing
  /free               Tampilkan provider GRATIS
  /apikey [key]       Set/lihat API key

🤖 MODEL & PROVIDER:
  /model              Lihat model saat ini
  /model <name>       Ganti model
  /provider <name>    Ganti provider
  /models             List model untuk provider aktif

🔧 MCP & TOOLS:
  /mcp                Buka MCP Marketplace (Interactive)
  /mcp -l             List installed MCP servers
  /tools              Lihat daftar tools yang tersedia

💬 CONVERSATION:
  /clear              Hapus history
  /context            Lihat stats (tokens, messages)

⚙️ SETTINGS:
  /yolo               Toggle auto-approve
  /config             Lihat konfigurasi

🔧 SESSION:
  /save [file]        Simpan session
  /load <file>        Load session
  /exit               Keluar

💡 TIPS:
  • Gunakan Ink mode (tanpa --classic) untuk UI lebih bagus
  • /free untuk lihat provider gratis
  • /setup gemini untuk panduan Gemini (gratis!)
`));
  };

  const showTools = (): void => {
    console.log(chalk.cyan(`
🔧 AVAILABLE TOOLS:

System:
  • bash       Execute shell commands

File:
  • read       Read file contents
  • write      Write to files
  • edit       Edit files (search & replace)

Search:
  • glob       Find files by pattern
  • grep       Search in files
`));
  };

  const handleCommand = async (input: string): Promise<boolean | ApiKeyPromptResult> => {
    const parts = input.split(' ');
    const cmd = parts[0];
    const args = parts.slice(1).join(' ');

    switch (cmd) {
      case '/exit':
      case '/quit':
      case '/q':
        showGoodbye();
        rl.close();
        process.exit(0);

      case '/help':
      case '/h':
        showHelp();
        return true;

      case '/clear':
      case '/c':
        agent.clearHistory();
        tokenCount = 0;
        messageCount = 0;
        console.log(chalk.green('  ✓ Conversation cleared.\n'));
        return true;

      case '/tools':
        showTools();
        return true;

      case '/model':
        if (args) {
          agent.model = args;
          console.log(chalk.green(`  ✓ Model changed to: ${args}\n`));
        } else {
          console.log(chalk.cyan(`  Current model: ${agent.model}`));
          console.log(chalk.gray(`  Provider: ${agent.provider}`));
          console.log(chalk.gray(`\n  Available models for ${agent.provider}:`));
          const models = getModelsForProvider(agent.provider);
          models.forEach(m => {
            const marker = m.id === agent.model ? chalk.green(' ✓') : '  ';
            const star = m.recommended ? chalk.yellow(' ⭐') : '';
            console.log(chalk.gray(`  ${marker} ${m.id}${star} - ${m.description}`));
          });
          console.log(chalk.gray(`\n  Usage: /model <model_name>\n`));
        }
        return true;

      case '/provider':
        if (args) {
          const provider = PROVIDERS[args];
          if (provider) {
            agent.provider = args;
            agent.baseUrl = provider.baseUrl;
            const recommended = provider.models.find(m => m.recommended) || provider.models[0];
            if (recommended) agent.model = recommended.id;
            console.log(chalk.green(`  ✓ Provider changed to: ${provider.name}`));
            console.log(chalk.gray(`  Model: ${agent.model}\n`));
          } else {
            console.log(chalk.red(`  ✗ Provider not found: ${args}`));
            console.log(chalk.gray(`  Available: ${Object.keys(PROVIDERS).join(', ')}\n`));
          }
        } else {
          console.log(chalk.cyan(`  Current provider: ${PROVIDERS[agent.provider]?.name || agent.provider}`));
          console.log(chalk.gray(`\n  Available providers:`));
          Object.entries(PROVIDERS).forEach(([id, p]) => {
            const marker = id === agent.provider ? chalk.green(' ✓') : '  ';
            console.log(chalk.gray(`  ${marker} ${id.padEnd(12)} ${p.name} - ${p.description}`));
          });
          console.log(chalk.gray(`\n  Usage: /provider <name>\n`));
        }
        return true;

      case '/models':
        const models = getModelsForProvider(agent.provider);
        console.log(chalk.cyan(`\n  🤖 Models for ${PROVIDERS[agent.provider]?.name || agent.provider}:\n`));
        models.forEach(m => {
          const star = m.recommended ? chalk.yellow('⭐ ') : '   ';
          console.log(chalk.gray(`  ${star}${m.id.padEnd(25)} ${m.description}`));
        });
        console.log('');
        return true;

      case '/mcp':
        const mcpOptions: any = {};
        if (args === '-l' || args === '--list') mcpOptions.list = true;
        if (args === '-r' || args === '--remove') mcpOptions.remove = true;
        
        await handleMCPCommand(mcpOptions);
        return true;

      case '/providers':
        console.log(getAllProvidersQuickRef());
        return true;

      case '/free':
        const freeProviders = getFreeProviders();
        console.log(chalk.cyan('\n  🆓 PROVIDER GRATIS / FREE TIER:\n'));
        freeProviders.forEach(p => {
          console.log(chalk.white(`  ▸ ${p.name.toUpperCase()}`));
          console.log(chalk.gray(`    ${p.description}`));
          console.log(chalk.green(`    ${p.pricing}`));
          console.log(chalk.blue(`    ${p.signupUrl}\n`));
        });
        return true;

      case '/setup':
        if (args) {
          const guide = formatProviderGuide(args);
          if (guide) {
            console.log(guide);
          } else {
            console.log(chalk.red(`  ✗ Provider "${args}" not found.`));
            console.log(chalk.gray(`  Available: ${Object.keys(PROVIDER_INFO).join(', ')}\n`));
          }
        } else {
          console.log(chalk.cyan('\n  🔑 SETUP - Pilih provider:\n'));
          Object.entries(PROVIDER_INFO).forEach(([id, info]) => {
            const free = info.pricing.toLowerCase().includes('free') ? chalk.green(' [FREE]') : '';
            console.log(chalk.gray(`  • ${id.padEnd(12)} ${info.name}${free}`));
          });
          console.log(chalk.gray(`\n  Usage: /setup <provider>`));
          console.log(chalk.gray(`  Example: /setup gemini\n`));
        }
        return true;

      case '/apikey':
        const providerInfo = PROVIDER_INFO[agent.provider];
        if (!providerInfo) {
          console.log(chalk.red(`  ✗ No info for provider: ${agent.provider}\n`));
          return true;
        }

        if (!providerInfo.envVar) {
          console.log(chalk.yellow(`  Provider ${providerInfo.name} tidak memerlukan API key (local)\n`));
          return true;
        }

        const homeDir = os.homedir();
        const keyFile = path.join(homeDir, `.${agent.provider}_api_key`);
        const exists = fs.existsSync(keyFile);

        if (args) {
          // Direct set from argument
          try {
            fs.writeFileSync(keyFile, args.trim());
            fs.chmodSync(keyFile, 0o600);
            agent.apiKey = args.trim();
            console.log(chalk.green(`  ✓ API key saved to ${keyFile}\n`));
          } catch (e) {
            const error = e as Error;
            console.log(chalk.red(`  ✗ Failed to save: ${error.message}\n`));
          }
        } else {
          // Interactive prompt for API key
          console.log(chalk.cyan(`\n  🔐 API KEY untuk ${providerInfo.name}\n`));
          console.log(chalk.blue(`  📍 Get key: ${providerInfo.apiKeyUrl}\n`));
          console.log(chalk.gray(`  Current: ${exists ? 'Key exists ✓' : 'Not set ✗'}`));
          console.log('');

          // Return special value to trigger interactive input
          return { needInput: 'apikey', keyFile, providerInfo };
        }
        return true;

      case '/yolo':
        agent.yolo = !agent.yolo;
        if (agent.yolo) {
          console.log(chalk.yellow('  ⏵⏵ Auto-approve ON (YOLO mode)\n'));
        } else {
          console.log(chalk.gray('  ⏵⏵ Auto-approve OFF\n'));
        }
        return true;

      case '/context':
        console.log(chalk.cyan(`\n  📊 CONTEXT STATS:\n`));
        console.log(chalk.gray(`  Messages: ${messageCount}`));
        console.log(chalk.gray(`  Tokens (approx): ${tokenCount}`));
        console.log(chalk.gray(`  Provider: ${PROVIDERS[agent.provider]?.name || agent.provider}`));
        console.log(chalk.gray(`  Model: ${agent.model}`));
        console.log(chalk.gray(`  YOLO: ${agent.yolo ? 'ON' : 'OFF'}\n`));
        return true;

      case '/config':
        console.log(chalk.cyan(`\n  ⚙️ CONFIGURATION:\n`));
        console.log(chalk.gray(`  Provider: ${agent.provider}`));
        console.log(chalk.gray(`  Model: ${agent.model}`));
        console.log(chalk.gray(`  Base URL: ${agent.baseUrl || 'default'}`));
        console.log(chalk.gray(`  YOLO: ${agent.yolo}`));
        console.log(chalk.gray(`  Stream: ${agent.stream}\n`));
        return true;

      case '/save':
        const saveFile = args || `session-${Date.now()}.json`;
        const saveData = {
          saved: new Date().toISOString(),
          provider: agent.provider,
          model: agent.model,
          tokenCount,
          messageCount
        };
        try {
          fs.writeFileSync(saveFile, JSON.stringify(saveData, null, 2));
          console.log(chalk.green(`  ✓ Session saved to ${saveFile}\n`));
        } catch (e) {
          const error = e as Error;
          console.log(chalk.red(`  ✗ Save failed: ${error.message}\n`));
        }
        return true;

      case '/load':
        if (!args) {
          console.log(chalk.red('  Usage: /load <filename>\n'));
          return true;
        }
        try {
          const data = JSON.parse(fs.readFileSync(args, 'utf8'));
          if (data.provider) agent.provider = data.provider;
          if (data.model) agent.model = data.model;
          tokenCount = data.tokenCount || 0;
          messageCount = data.messageCount || 0;
          console.log(chalk.green(`  ✓ Session loaded from ${args}\n`));
        } catch (e) {
          const error = e as Error;
          console.log(chalk.red(`  ✗ Load failed: ${error.message}\n`));
        }
        return true;

      default:
        if (cmd.startsWith('/')) {
          console.log(chalk.red(`  ✗ Unknown command: ${cmd}`));
          console.log(chalk.gray('  Type /help for available commands\n'));
          return true;
        }
        return false;
    }
  };

  const prompt = (): void => {
    showPrompt();
    rl.question('', async (input: string) => {
      input = input.trim();

      if (!input) {
        setImmediate(() => prompt());
        return;
      }

      // Handle commands
      if (input.startsWith('/')) {
        const handled = await handleCommand(input);

        // Check if command needs interactive input
        if (handled && typeof handled === 'object' && handled.needInput === 'apikey') {
          console.log(chalk.cyan('  Masukkan API key (atau ketik "cancel" untuk batal):'));
          process.stdout.write(chalk.yellow('  > '));

          rl.question('', (apiKeyInput: string) => {
            apiKeyInput = apiKeyInput.trim();

            if (apiKeyInput && apiKeyInput.toLowerCase() !== 'cancel') {
              try {
                fs.writeFileSync(handled.keyFile, apiKeyInput);
                fs.chmodSync(handled.keyFile, 0o600);
                agent.apiKey = apiKeyInput;
                console.log(chalk.green(`\n  ✓ API key saved!`));
                console.log(chalk.gray(`  File: ${handled.keyFile}\n`));
              } catch (e) {
                const error = e as Error;
                console.log(chalk.red(`\n  ✗ Failed: ${error.message}\n`));
              }
            } else {
              console.log(chalk.gray('\n  Cancelled.\n'));
            }
            setImmediate(() => prompt());
          });
          return;
        }

        if (handled) {
          setImmediate(() => prompt());
          return;
        }
      }

      // Process user input
      messageCount++;
      console.log('');
      const spinner = ora({
        text: chalk.gray('Thinking...'),
        color: 'cyan',
        spinner: 'dots'
      }).start();

      const filter = new ThinkingFilter();

      try {
        await agent.chat(input, {
          onStart: () => {
            if (spinner.isSpinning) spinner.stop();
            console.log(chalk.gray('─'.repeat(70)));
            process.stdout.write(chalk.magenta(''));
          },
          onToken: (token: string) => {
            const filtered = filter.process(token);
            if (filtered) {
              process.stdout.write(filtered);
              tokenCount++;
            }
          },
          onToolCall: async (tool: string, args: Record<string, unknown>) => {
            if (spinner.isSpinning) spinner.stop();
            console.log('\n' + chalk.yellow(`🔧 Tool: ${tool}`));
            const argsStr = JSON.stringify(args, null, 2);
            console.log(chalk.gray(argsStr));

            if (!agent.yolo) {
              process.stdout.write(chalk.yellow('Approve? [y/N]: '));
              const approved = await new Promise<boolean>(resolve => {
                rl.question('', (answer: string) => {
                  resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
                });
              });
              return approved;
            }
            console.log(chalk.green('✓ Auto-approved (YOLO mode)'));
            return true;
          },
          onToolResult: (tool: string, result: unknown) => {
            console.log(chalk.green(`✓ ${tool} completed`));
            if (result && String(result).length < 300) {
              console.log(chalk.gray(String(result).substring(0, 300)));
            }
          },
          onEnd: () => {
            console.log('\n');
          },
          onError: (err: Error) => {
            if (spinner.isSpinning) spinner.stop();
            console.log(chalk.red(`\n✗ Error: ${err.message}\n`));
          }
        });
      } catch (err) {
        if (spinner.isSpinning) spinner.stop();
        const error = err as Error;
        console.log(chalk.red(`\n✗ Error: ${error.message}`));
      } finally {
        setImmediate(() => prompt());
      }
    });
  };

  // Handle initial prompt
  if (initialPrompt) {
    console.log('');
    console.log(chalk.gray('─'.repeat(70)));
    console.log(chalk.cyan.bold('> ') + initialPrompt);

    messageCount++;
    const spinner = ora({
      text: chalk.gray('Thinking...'),
      color: 'cyan',
      spinner: 'dots'
    }).start();

    const filter = new ThinkingFilter();

    try {
      await agent.chat(initialPrompt, {
        onStart: () => {
          if (spinner.isSpinning) spinner.stop();
          console.log(chalk.gray('─'.repeat(70)));
        },
        onToken: (token: string) => {
          const filtered = filter.process(token);
          if (filtered) {
            process.stdout.write(filtered);
            tokenCount++;
          }
        },
        onToolCall: async (tool: string, _args: Record<string, unknown>) => {
          if (spinner.isSpinning) spinner.stop();
          console.log('\n' + chalk.yellow(`🔧 Tool: ${tool}`));
          if (!agent.yolo) {
            process.stdout.write(chalk.yellow('Approve? [y/N]: '));
            const approved = await new Promise<boolean>(resolve => {
              rl.question('', (answer: string) => {
                resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
              });
            });
            return approved;
          }
          console.log(chalk.green('✓ Auto-approved'));
          return true;
        },
        onEnd: () => {
          console.log('\n');
        }
      });
    } catch (err) {
      if (spinner.isSpinning) spinner.stop();
      const error = err as Error;
      console.log(chalk.red(`\n✗ Error: ${error.message}`));
    }
  }

  // Start interactive loop
  prompt();
}
