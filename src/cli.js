import readline from 'readline';
import chalk from 'chalk';
import ora from 'ora';

export async function startInteractiveMode(agent, initialPrompt) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const prompt = () => {
    rl.question(chalk.green('\n> '), async (input) => {
      input = input.trim();

      // Handle special commands
      if (input === '/exit' || input === '/quit' || input === '/q') {
        console.log(chalk.blue('\nGoodbye! 👋\n'));
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
        console.log(chalk.gray('Conversation cleared.'));
        prompt();
        return;
      }

      if (input === '/tools') {
        showTools();
        prompt();
        return;
      }

      if (input === '/model') {
        console.log(chalk.gray(`Current model: ${agent.model}`));
        prompt();
        return;
      }

      if (input.startsWith('/model ')) {
        const newModel = input.replace('/model ', '').trim();
        agent.model = newModel;
        console.log(chalk.green(`Model changed to: ${newModel}`));
        prompt();
        return;
      }

      if (!input) {
        prompt();
        return;
      }

      // Process user input
      const spinner = ora('Thinking...').start();

      try {
        await agent.chat(input, {
          onStart: () => {
            spinner.stop();
            console.log(chalk.cyan('\n📝 Assistant:\n'));
          },
          onToken: (token) => {
            process.stdout.write(token);
          },
          onToolCall: async (tool, args) => {
            console.log(chalk.yellow(`\n\n🔧 Using tool: ${tool}`));
            console.log(chalk.gray(JSON.stringify(args, null, 2)));

            if (!agent.yolo) {
              const approved = await askApproval(rl);
              return approved;
            }
            return true;
          },
          onToolResult: (tool, result) => {
            console.log(chalk.green(`\n✓ ${tool} completed`));
            if (result && result.length < 500) {
              console.log(chalk.gray(result));
            }
          },
          onEnd: () => {
            console.log('\n');
          },
          onError: (err) => {
            spinner.stop();
            console.error(chalk.red(`\nError: ${err.message}`));
          }
        });
      } catch (err) {
        spinner.stop();
        console.error(chalk.red(`\nError: ${err.message}`));
      }

      prompt();
    });
  };

  // Handle initial prompt
  if (initialPrompt) {
    console.log(chalk.green(`> ${initialPrompt}`));
    const spinner = ora('Thinking...').start();

    try {
      await agent.chat(initialPrompt, {
        onStart: () => {
          spinner.stop();
          console.log(chalk.cyan('\n📝 Assistant:\n'));
        },
        onToken: (token) => {
          process.stdout.write(token);
        },
        onToolCall: async (tool, args) => {
          console.log(chalk.yellow(`\n\n🔧 Using tool: ${tool}`));
          if (!agent.yolo) {
            const approved = await askApproval(rl);
            return approved;
          }
          return true;
        },
        onEnd: () => {
          console.log('\n');
        }
      });
    } catch (err) {
      spinner.stop();
      console.error(chalk.red(`\nError: ${err.message}`));
    }

    // Exit after one-shot prompt (non-interactive)
    if (!process.stdin.isTTY) {
      rl.close();
      process.exit(0);
    }
  }

  // Start interactive loop
  showHelp();
  prompt();
}

function showHelp() {
  console.log(chalk.blue('\n📚 Commands:'));
  console.log(chalk.gray('  /help, /h     - Show this help'));
  console.log(chalk.gray('  /clear, /c    - Clear conversation history'));
  console.log(chalk.gray('  /tools        - List available tools'));
  console.log(chalk.gray('  /model        - Show current model'));
  console.log(chalk.gray('  /model <name> - Change model'));
  console.log(chalk.gray('  /exit, /q     - Exit'));
  console.log('');
}

function showTools() {
  console.log(chalk.blue('\n🔧 Available Tools:'));
  console.log(chalk.gray('  • bash     - Execute shell commands'));
  console.log(chalk.gray('  • read     - Read file contents'));
  console.log(chalk.gray('  • write    - Write to files'));
  console.log(chalk.gray('  • edit     - Edit files (search & replace)'));
  console.log(chalk.gray('  • glob     - Find files by pattern'));
  console.log(chalk.gray('  • grep     - Search in files'));
  console.log('');
}

function askApproval(rl) {
  return new Promise((resolve) => {
    rl.question(chalk.yellow('\nApprove? [y/N]: '), (answer) => {
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}
