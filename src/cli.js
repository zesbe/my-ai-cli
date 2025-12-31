import readline from 'readline';
import chalk from 'chalk';
import ora from 'ora';
import { showGoodbye } from './ui/welcome.js';

// Filter out <think>...</think> tags from streaming output
class ThinkingFilter {
  constructor() {
    this.buffer = '';
    this.inThinking = false;
  }

  process(token) {
    this.buffer += token;
    let output = '';

    // Check for opening tag
    while (this.buffer.includes('<think>')) {
      const start = this.buffer.indexOf('<think>');
      output += this.buffer.substring(0, start);
      this.buffer = this.buffer.substring(start + 7);
      this.inThinking = true;
    }

    // Check for closing tag
    while (this.inThinking && this.buffer.includes('</think>')) {
      const end = this.buffer.indexOf('</think>');
      this.buffer = this.buffer.substring(end + 8);
      this.inThinking = false;
    }

    // If not in thinking mode and no pending tags
    if (!this.inThinking && !this.buffer.includes('<')) {
      output += this.buffer;
      this.buffer = '';
    } else if (!this.inThinking && this.buffer.length > 20) {
      // Flush buffer if it's getting too long and no tag started
      if (!this.buffer.includes('<')) {
        output += this.buffer;
        this.buffer = '';
      }
    }

    return output;
  }

  flush() {
    const remaining = this.inThinking ? '' : this.buffer;
    this.buffer = '';
    this.inThinking = false;
    return remaining;
  }
}

export async function startInteractiveMode(agent, initialPrompt) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true
  });

  // Prevent readline from closing on Ctrl+C, handle it gracefully
  rl.on('close', () => {
    showGoodbye();
    process.exit(0);
  });

  // Handle SIGINT (Ctrl+C)
  process.on('SIGINT', () => {
    console.log('');
    showGoodbye();
    rl.close();
    process.exit(0);
  });

  // Show input prompt like Claude CLI - fixed at bottom
  const showPrompt = () => {
    console.log('');
    console.log(chalk.gray('╭─') + chalk.cyan(' User ') + chalk.gray('──────────────────────────────────────────────────────────────────'));
    process.stdout.write(chalk.cyan('│ ') + chalk.bold('> '));
  };

  const prompt = () => {
    showPrompt();
    rl.question('', async (input) => {
      input = input.trim();

      // Handle special commands
      if (input === '/exit' || input === '/quit' || input === '/q') {
        showGoodbye();
        rl.close();
        process.exit(0);
      }

      if (input === '/help' || input === '/h') {
        showHelp();
        setImmediate(() => prompt());
        return;
      }

      if (input === '/clear' || input === '/c') {
        agent.clearHistory();
        console.log(chalk.gray('  ✓ Conversation cleared.\n'));
        setImmediate(() => prompt());
        return;
      }

      if (input === '/tools') {
        showTools();
        setImmediate(() => prompt());
        return;
      }

      if (input === '/model') {
        console.log(chalk.cyan(`  Current model: ${agent.model}\n`));
        setImmediate(() => prompt());
        return;
      }

      if (input.startsWith('/model ')) {
        const newModel = input.replace('/model ', '').trim();
        agent.model = newModel;
        console.log(chalk.green(`  ✓ Model changed to: ${newModel}\n`));
        setImmediate(() => prompt());
        return;
      }

      if (input === '/yolo') {
        agent.yolo = !agent.yolo;
        if (agent.yolo) {
          console.log(chalk.yellow('  ⏵⏵ bypass permissions ON\n'));
        } else {
          console.log(chalk.gray('  ⏵⏵ bypass permissions OFF\n'));
        }
        setImmediate(() => prompt());
        return;
      }

      if (!input) {
        setImmediate(() => prompt());
        return;
      }

      // Process user input
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
            console.log(chalk.gray('╭─') + chalk.magenta(' Assistant ') + chalk.gray('─────────────────────────────────────────────────────────────'));
            process.stdout.write(chalk.magenta('│ '));
          },
          onToken: (token) => {
            // Filter thinking tags
            const filtered = filter.process(token);
            if (filtered) {
              const withBar = filtered.replace(/\n/g, '\n' + chalk.magenta('│ '));
              process.stdout.write(withBar);
            }
          },
          onToolCall: async (tool, args) => {
            if (spinner.isSpinning) spinner.stop();
            console.log('\n' + chalk.magenta('│ ') + chalk.yellow(`🔧 Tool: ${tool}`));
            const argsStr = JSON.stringify(args, null, 2).replace(/\n/g, '\n' + chalk.magenta('│ ') + '  ');
            console.log(chalk.magenta('│ ') + chalk.gray('  ' + argsStr));

            if (!agent.yolo) {
              process.stdout.write(chalk.magenta('│ ') + chalk.yellow('Approve? [y/N]: '));
              const approved = await new Promise(resolve => {
                rl.question('', (answer) => {
                  resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
                });
              });
              return approved;
            }
            console.log(chalk.magenta('│ ') + chalk.green('✓ Auto-approved (YOLO mode)'));
            return true;
          },
          onToolResult: (tool, result) => {
            console.log(chalk.magenta('│ ') + chalk.green(`✓ ${tool} completed`));
            if (result && result.length < 300) {
              const resStr = String(result).substring(0, 300).replace(/\n/g, '\n' + chalk.magenta('│ ') + '  ');
              console.log(chalk.magenta('│ ') + chalk.gray('  ' + resStr));
            }
          },
          onEnd: () => {
            console.log('\n' + chalk.gray('╰─────────────────────────────────────────────────────────────────────────'));
          },
          onError: (err) => {
            if (spinner.isSpinning) spinner.stop();
            console.log('\n' + chalk.magenta('│ ') + chalk.red(`✗ Error: ${err.message}\n`));
          }
        });
      } catch (err) {
        if (spinner.isSpinning) spinner.stop();
        console.log(chalk.red(`\n  ✗ Error: ${err.message}`));
      } finally {
        // Continue the prompt loop
        setImmediate(() => prompt());
      }
    });
  };

  // Handle initial prompt
  if (initialPrompt) {
    console.log('');
    console.log(chalk.gray('╭─') + chalk.cyan(' User ') + chalk.gray('──────────────────────────────────────────────────────────────────'));
    console.log(chalk.cyan('│ ') + chalk.bold('> ') + initialPrompt);

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
          console.log(chalk.gray('╭─') + chalk.magenta(' Assistant ') + chalk.gray('─────────────────────────────────────────────────────────────'));
          process.stdout.write(chalk.magenta('│ '));
        },
        onToken: (token) => {
          const filtered = filter.process(token);
          if (filtered) {
            const withBar = filtered.replace(/\n/g, '\n' + chalk.magenta('│ '));
            process.stdout.write(withBar);
          }
        },
        onToolCall: async (tool, args) => {
          if (spinner.isSpinning) spinner.stop();
          console.log('\n' + chalk.magenta('│ ') + chalk.yellow(`🔧 Tool: ${tool}`));
          const argsStr = JSON.stringify(args, null, 2).replace(/\n/g, '\n' + chalk.magenta('│ ') + '  ');
          console.log(chalk.magenta('│ ') + chalk.gray('  ' + argsStr));

          if (!agent.yolo) {
            process.stdout.write(chalk.magenta('│ ') + chalk.yellow('Approve? [y/N]: '));
            const approved = await new Promise(resolve => {
              rl.question('', (answer) => {
                resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
              });
            });
            return approved;
          }
          console.log(chalk.magenta('│ ') + chalk.green('✓ Auto-approved'));
          return true;
        },
        onEnd: () => {
          console.log('\n' + chalk.gray('╰─────────────────────────────────────────────────────────────────────────'));
        }
      });
    } catch (err) {
      if (spinner.isSpinning) spinner.stop();
      console.log('\n' + chalk.magenta('│ ') + chalk.red(`✗ Error: ${err.message}`));
      console.log(chalk.gray('╰─────────────────────────────────────────────────────────────────────────'));
    }

  }

  // Start interactive loop - always continue
  prompt();
}

function showHelp() {
  console.log(chalk.cyan('\n  📚 Commands:\n'));
  console.log(chalk.white('  /help, /h      ') + chalk.gray('Show this help'));
  console.log(chalk.white('  /clear, /c     ') + chalk.gray('Clear conversation history'));
  console.log(chalk.white('  /tools         ') + chalk.gray('List available tools'));
  console.log(chalk.white('  /model         ') + chalk.gray('Show current model'));
  console.log(chalk.white('  /model <name>  ') + chalk.gray('Change model'));
  console.log(chalk.white('  /yolo          ') + chalk.gray('Toggle bypass permissions'));
  console.log(chalk.white('  /exit, /q      ') + chalk.gray('Exit'));
  console.log('');
}

function showTools() {
  console.log(chalk.cyan('\n  🔧 Available Tools:\n'));
  console.log(chalk.white('  bash     ') + chalk.gray('Execute shell commands'));
  console.log(chalk.white('  read     ') + chalk.gray('Read file contents'));
  console.log(chalk.white('  write    ') + chalk.gray('Write to files'));
  console.log(chalk.white('  edit     ') + chalk.gray('Edit files (search & replace)'));
  console.log(chalk.white('  glob     ') + chalk.gray('Find files by pattern'));
  console.log(chalk.white('  grep     ') + chalk.gray('Search in files'));
  console.log('');
}

function askApproval(rl) {
  return new Promise((resolve) => {
    rl.question(chalk.yellow('\n  Approve? [y/N]: '), (answer) => {
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}
