import readline from 'readline';
import chalk from 'chalk';
import ora from 'ora';
import { showGoodbye } from './ui/welcome.js';

export async function startInteractiveMode(agent, initialPrompt) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const prompt = () => {
    rl.question(chalk.green('> '), async (input) => {
      input = input.trim();

      // Handle special commands
      if (input === '/exit' || input === '/quit' || input === '/q') {
        showGoodbye();
        rl.close();
        process.exit(0);
      }

      if (input === '/help' || input === '/h') {
        showHelp();
        prompt();
        return;
      }

      if (input === '/clear' || input === '/c') {
        agent.clearHistory();
        console.log(chalk.gray('  ✓ Conversation cleared.\n'));
        prompt();
        return;
      }

      if (input === '/tools') {
        showTools();
        prompt();
        return;
      }

      if (input === '/model') {
        console.log(chalk.cyan(`  Current model: ${agent.model}\n`));
        prompt();
        return;
      }

      if (input.startsWith('/model ')) {
        const newModel = input.replace('/model ', '').trim();
        agent.model = newModel;
        console.log(chalk.green(`  ✓ Model changed to: ${newModel}\n`));
        prompt();
        return;
      }

      if (input === '/yolo') {
        agent.yolo = !agent.yolo;
        if (agent.yolo) {
          console.log(chalk.yellow('  ⏵⏵ bypass permissions ON\n'));
        } else {
          console.log(chalk.gray('  ⏵⏵ bypass permissions OFF\n'));
        }
        prompt();
        return;
      }

      if (!input) {
        prompt();
        return;
      }

      // Process user input
      const spinner = ora({
        text: 'Thinking...',
        color: 'cyan'
      }).start();

      try {
        await agent.chat(input, {
          onStart: () => {
            spinner.stop();
            console.log(chalk.cyan('\n  📝 Assistant:\n'));
          },
          onToken: (token) => {
            process.stdout.write(token);
          },
          onToolCall: async (tool, args) => {
            console.log(chalk.yellow(`\n\n  🔧 Tool: ${tool}`));
            console.log(chalk.gray('  ' + JSON.stringify(args, null, 2).replace(/\n/g, '\n  ')));

            if (!agent.yolo) {
              const approved = await askApproval(rl);
              return approved;
            }
            console.log(chalk.green('  ✓ Auto-approved (YOLO mode)'));
            return true;
          },
          onToolResult: (tool, result) => {
            console.log(chalk.green(`  ✓ ${tool} completed`));
            if (result && result.length < 300) {
              console.log(chalk.gray('  ' + result.substring(0, 300)));
            }
          },
          onEnd: () => {
            console.log('\n');
          },
          onError: (err) => {
            spinner.stop();
            console.error(chalk.red(`\n  ✗ Error: ${err.message}\n`));
          }
        });
      } catch (err) {
        spinner.stop();
        console.error(chalk.red(`\n  ✗ Error: ${err.message}\n`));
      }

      prompt();
    });
  };

  // Handle initial prompt
  if (initialPrompt) {
    console.log(chalk.green(`> ${initialPrompt}`));
    const spinner = ora({
      text: 'Thinking...',
      color: 'cyan'
    }).start();

    try {
      await agent.chat(initialPrompt, {
        onStart: () => {
          spinner.stop();
          console.log(chalk.cyan('\n  📝 Assistant:\n'));
        },
        onToken: (token) => {
          process.stdout.write(token);
        },
        onToolCall: async (tool, args) => {
          console.log(chalk.yellow(`\n\n  🔧 Tool: ${tool}`));
          if (!agent.yolo) {
            const approved = await askApproval(rl);
            return approved;
          }
          console.log(chalk.green('  ✓ Auto-approved'));
          return true;
        },
        onEnd: () => {
          console.log('\n');
        }
      });
    } catch (err) {
      spinner.stop();
      console.error(chalk.red(`\n  ✗ Error: ${err.message}\n`));
    }

    // Exit after one-shot prompt (non-interactive)
    if (!process.stdin.isTTY) {
      rl.close();
      process.exit(0);
    }
  }

  // Start interactive loop
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
