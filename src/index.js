#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import readline from 'readline';
import dotenv from 'dotenv';
import { startInteractiveMode } from './cli.js';
import { Agent } from './agent.js';
import { showWelcome } from './ui/welcome.js';
import { loadConfig, getApiKey, getProviderConfig, saveApiKey } from './config.js';

dotenv.config();

const program = new Command();

// Load saved configuration
const config = loadConfig();

program
  .name('zesbe')
  .description('Zesbe AI CLI - Your Personal AI Coding Assistant')
  .version('1.0.0')
  .option('-m, --model <model>', 'Model to use', config.model)
  .option('-p, --provider <provider>', 'Provider: minimax, openai, anthropic, gemini, ollama, glm', config.provider)
  .option('-b, --base-url <url>', 'Custom API base URL')
  .option('-k, --api-key <key>', 'API key (auto-loads from config if not provided)')
  .option('-s, --system <prompt>', 'Custom system prompt')
  .option('-y, --yolo', 'Auto-approve all actions (bypass permissions)', config.yolo)
  .option('-q, --quiet', 'Skip welcome screen')
  .option('--no-stream', 'Disable streaming output')
  .option('--setup', 'Run setup wizard')
  .argument('[prompt...]', 'Initial prompt')
  .action(async (promptArgs, options) => {
    // Run setup if requested
    if (options.setup) {
      await runSetup();
      return;
    }

    // Get provider configuration
    const providerConfig = getProviderConfig(options.provider, config);

    if (!providerConfig) {
      console.error(chalk.red(`Error: Unknown provider '${options.provider}'`));
      console.log(chalk.gray('Available providers: minimax, openai, anthropic, gemini, ollama, glm'));
      process.exit(1);
    }

    // Get API key (auto-load from config/file)
    let apiKey = options.apiKey || getApiKey(options.provider, config);
    let baseUrl = options.baseUrl || providerConfig.baseUrl;

    // If no API key found, prompt for it
    if (!apiKey && options.provider !== 'ollama') {
      console.log(chalk.yellow(`\n  No API key found for ${options.provider}.`));
      console.log(chalk.gray('  Run "zesbe --setup" to configure, or provide with -k flag.\n'));

      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      apiKey = await new Promise((resolve) => {
        rl.question(chalk.cyan('  Enter API key (will be saved): '), (answer) => {
          rl.close();
          resolve(answer.trim());
        });
      });

      if (apiKey) {
        saveApiKey(options.provider, apiKey);
        console.log(chalk.green('  ✓ API key saved!\n'));
      } else {
        console.error(chalk.red('  Error: API key is required.'));
        process.exit(1);
      }
    }

    // Show welcome screen
    if (!options.quiet) {
      console.clear();
      showWelcome({
        model: options.model,
        provider: options.provider,
        yolo: options.yolo
      });
    }

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

// Setup wizard
async function runSetup() {
  console.clear();
  console.log(chalk.cyan.bold('\n  🔧 Zesbe AI CLI Setup Wizard\n'));
  console.log(chalk.gray('  Configure your AI providers and preferences.\n'));

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (q) => new Promise((resolve) => {
    rl.question(q, resolve);
  });

  // Choose default provider
  console.log(chalk.white('  Available providers:'));
  console.log(chalk.gray('    1) MiniMax (Recommended - Free tier available)'));
  console.log(chalk.gray('    2) OpenAI (GPT-4)'));
  console.log(chalk.gray('    3) Anthropic (Claude)'));
  console.log(chalk.gray('    4) Google Gemini'));
  console.log(chalk.gray('    5) Ollama (Local)'));
  console.log(chalk.gray('    6) GLM/ZhipuAI'));
  console.log('');

  const providerChoice = await question(chalk.cyan('  Select default provider [1-6, default: 1]: '));
  const providers = ['minimax', 'openai', 'anthropic', 'gemini', 'ollama', 'glm'];
  const selectedProvider = providers[parseInt(providerChoice) - 1] || 'minimax';

  config.provider = selectedProvider;
  console.log(chalk.green(`  ✓ Default provider: ${selectedProvider}\n`));

  // API Key
  if (selectedProvider !== 'ollama') {
    const existingKey = getApiKey(selectedProvider, config);
    if (existingKey) {
      console.log(chalk.green(`  ✓ API key already configured for ${selectedProvider}`));
      const updateKey = await question(chalk.cyan('  Update API key? [y/N]: '));
      if (updateKey.toLowerCase() === 'y') {
        const newKey = await question(chalk.cyan('  Enter new API key: '));
        if (newKey.trim()) {
          saveApiKey(selectedProvider, newKey.trim());
          console.log(chalk.green('  ✓ API key updated!\n'));
        }
      }
    } else {
      console.log(chalk.yellow(`  No API key found for ${selectedProvider}`));
      const apiKey = await question(chalk.cyan('  Enter API key: '));
      if (apiKey.trim()) {
        saveApiKey(selectedProvider, apiKey.trim());
        console.log(chalk.green('  ✓ API key saved!\n'));
      }
    }
  }

  // Choose default model
  const providerConfig = config.providers[selectedProvider];
  if (providerConfig && providerConfig.models) {
    console.log(chalk.white(`  Available models for ${selectedProvider}:`));
    providerConfig.models.forEach((m, i) => {
      console.log(chalk.gray(`    ${i + 1}) ${m}`));
    });
    const modelChoice = await question(chalk.cyan(`  Select default model [1-${providerConfig.models.length}, default: 1]: `));
    config.model = providerConfig.models[parseInt(modelChoice) - 1] || providerConfig.models[0];
    console.log(chalk.green(`  ✓ Default model: ${config.model}\n`));
  }

  // YOLO mode
  const yoloChoice = await question(chalk.cyan('  Enable YOLO mode (auto-approve actions)? [Y/n]: '));
  config.yolo = yoloChoice.toLowerCase() !== 'n';
  console.log(chalk.green(`  ✓ YOLO mode: ${config.yolo ? 'ON' : 'OFF'}\n`));

  // Save config
  const { saveConfig } = await import('./config.js');
  saveConfig(config);

  console.log(chalk.green.bold('  ✓ Setup complete!\n'));
  console.log(chalk.white('  Now you can run:'));
  console.log(chalk.cyan('    zesbe') + chalk.gray('              # Start interactive mode'));
  console.log(chalk.cyan('    zesbe "prompt"') + chalk.gray('     # Start with a prompt'));
  console.log(chalk.cyan('    zesbe --help') + chalk.gray('       # Show all options'));
  console.log('');

  rl.close();
}

program.parse();
