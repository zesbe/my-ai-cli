#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import dotenv from 'dotenv';
import { startInteractiveMode } from './cli.js';
import { Agent } from './agent.js';

dotenv.config();

const program = new Command();

program
  .name('my-ai')
  .description('Custom AI CLI Agent - Like Claude Code but with your own model')
  .version('1.0.0')
  .option('-m, --model <model>', 'Model to use (default: gpt-4o)', 'gpt-4o')
  .option('-p, --provider <provider>', 'Provider: openai, anthropic, ollama, custom', 'openai')
  .option('-b, --base-url <url>', 'Custom API base URL')
  .option('-k, --api-key <key>', 'API key (or use env var)')
  .option('-s, --system <prompt>', 'Custom system prompt')
  .option('-y, --yolo', 'Auto-approve all actions (bypass permissions)')
  .option('--no-stream', 'Disable streaming output')
  .argument('[prompt...]', 'Initial prompt')
  .action(async (promptArgs, options) => {
    console.log(chalk.blue.bold('\n🤖 My AI CLI Agent\n'));

    // Get API key from options or environment
    let apiKey = options.apiKey;
    let baseUrl = options.baseUrl;

    switch (options.provider) {
      case 'openai':
        apiKey = apiKey || process.env.OPENAI_API_KEY;
        baseUrl = baseUrl || 'https://api.openai.com/v1';
        break;
      case 'anthropic':
        apiKey = apiKey || process.env.ANTHROPIC_API_KEY;
        baseUrl = baseUrl || 'https://api.anthropic.com/v1';
        break;
      case 'ollama':
        apiKey = apiKey || 'ollama';
        baseUrl = baseUrl || 'http://localhost:11434/v1';
        break;
      case 'custom':
        apiKey = apiKey || process.env.API_KEY;
        if (!baseUrl) {
          console.error(chalk.red('Error: --base-url required for custom provider'));
          process.exit(1);
        }
        break;
    }

    if (!apiKey && options.provider !== 'ollama') {
      console.error(chalk.red(`Error: API key required. Set ${options.provider.toUpperCase()}_API_KEY or use --api-key`));
      process.exit(1);
    }

    // Show config
    console.log(chalk.gray(`Provider: ${options.provider}`));
    console.log(chalk.gray(`Model: ${options.model}`));
    console.log(chalk.gray(`Base URL: ${baseUrl}`));
    if (options.yolo) {
      console.log(chalk.yellow('⚠️  YOLO mode enabled - auto-approving all actions'));
    }
    console.log('');

    // Create agent
    const agent = new Agent({
      provider: options.provider,
      model: options.model,
      apiKey,
      baseUrl,
      systemPrompt: options.system,
      yolo: options.yolo,
      stream: options.stream !== false
    });

    // Start CLI
    const initialPrompt = promptArgs.join(' ');
    await startInteractiveMode(agent, initialPrompt);
  });

program.parse();
