import chalk from 'chalk';
import enquirer from 'enquirer';
import { MCPManager } from './mcp/client.js';
import {
  POPULAR_MCP_SERVERS,
  searchServers,
  getServersByCategory,
  generateInstallConfig,
  MCP_CATEGORIES,
  MARKETPLACE_LINKS
} from './mcp/marketplace.js';
import type { MCPServerDefinition } from './mcp/marketplace.js';

const { Select, Input, Confirm } = enquirer as any;

export async function handleMCPCommand(options: any) {
  const manager = new MCPManager();
  const config = manager.loadConfig();

  // If list command
  if (options.list) {
    console.log(chalk.cyan.bold('\n📦 Installed MCP Servers:\n'));
    const servers = Object.keys(config.mcpServers || {});
    
    if (servers.length === 0) {
      console.log(chalk.gray('  No servers installed.'));
      console.log(chalk.gray('  Run "zesbe mcp install" to browse the marketplace.\n'));
    } else {
      for (const name of servers) {
        const server = config.mcpServers![name];
        console.log(chalk.green(`  • ${name}`));
        console.log(chalk.gray(`    ${server.command} ${server.args?.join(' ')}`));
        console.log('');
      }
    }
    return;
  }

  // If remove command
  if (options.remove) {
    const servers = Object.keys(config.mcpServers || {});
    if (servers.length === 0) {
      console.log(chalk.yellow('No servers to remove.'));
      return;
    }

    const prompt = new Select({
      name: 'server',
      message: 'Select server to remove:',
      choices: servers
    });

    try {
      const serverName = await prompt.run();
      delete config.mcpServers![serverName];
      manager.saveConfig(config);
      console.log(chalk.green(`\n✓ Server "${serverName}" removed successfully.\n`));
    } catch (e) {
      console.log(''); // Cancelled
    }
    return;
  }

  // Default: Install / Browse Marketplace
  await showMarketplace(manager);
}

async function showMarketplace(manager: MCPManager) {
  console.clear();
  console.log(chalk.cyan.bold('\n🏪 MCP Marketplace\n'));

  // Main menu
  const menuPrompt = new Select({
    name: 'action',
    message: 'What would you like to do?',
    choices: [
      { name: 'browse', message: 'Browse by Category' },
      { name: 'search', message: 'Search Servers' },
      { name: 'popular', message: 'View Popular Servers' },
      { name: 'links', message: 'External Marketplaces' },
      { name: 'exit', message: 'Exit' }
    ]
  });

  try {
    const action = await menuPrompt.run();

    if (action === 'exit') return;

    if (action === 'links') {
      console.log(chalk.cyan('\n🔗 External Resources:\n'));
      MARKETPLACE_LINKS.forEach(link => {
        console.log(`${link.icon} ${chalk.bold(link.name)} - ${link.url}`);
        console.log(chalk.gray(`   ${link.description}\n`));
      });
      return;
    }

    let servers: MCPServerDefinition[] = [];

    if (action === 'popular') {
      servers = POPULAR_MCP_SERVERS;
    } else if (action === 'browse') {
      const catPrompt = new Select({
        name: 'category',
        message: 'Select Category:',
        choices: MCP_CATEGORIES
      });
      const category = await catPrompt.run();
      servers = getServersByCategory(category);
    } else if (action === 'search') {
      const searchPrompt = new Input({
        message: 'Search query:'
      });
      const query = await searchPrompt.run();
      servers = searchServers(query);
    }

    if (servers.length === 0) {
      console.log(chalk.yellow('\nNo servers found matching your criteria.\n'));
      return;
    }

    // Server selection
    const serverChoices = servers.map(s => ({
      name: s.id,
      message: `${s.name} ${chalk.gray(`(${s.stars}★)`)}`,
      value: s
    }));

    const serverPrompt = new Select({
      name: 'serverId',
      message: 'Select a server to install:',
      choices: [...serverChoices, { name: 'back', message: '⬅ Back' }]
    });

    const selectedId = await serverPrompt.run();
    if (selectedId === 'back') return showMarketplace(manager);

    const selectedServer = servers.find(s => s.id === selectedId);
    if (selectedServer) {
      await installServer(manager, selectedServer);
    }

  } catch (e) {
    console.log(''); // Exit gracefully
  }
}

async function installServer(manager: MCPManager, server: MCPServerDefinition) {
  console.log(chalk.cyan(`\n📦 Installing ${server.name}...`));
  console.log(chalk.gray(server.description));
  console.log('');

  const installOptions: any = {};

  // Check requirements
  if (server.install.requiresPath) {
    const pathPrompt = new Input({
      message: 'Enter path (absolute path):',
      initial: process.cwd()
    });
    installOptions.path = await pathPrompt.run();
  }

  if (server.install.requiresToken) {
    const tokenPrompt = new Input({
      message: `Enter ${server.install.requiresToken}:`,
      type: 'password'
    });
    installOptions.token = await tokenPrompt.run();
  }

  if (server.install.env?.SLACK_TEAM_ID) {
    const teamPrompt = new Input({
      message: 'Enter Slack Team ID:'
    });
    installOptions.teamId = await teamPrompt.run();
  }

  // Confirm installation
  const confirmPrompt = new Confirm({
    name: 'confirm',
    message: 'Proceed with installation?'
  });

  if (await confirmPrompt.run()) {
    const config = manager.loadConfig();
    const installConfig = generateInstallConfig(server, installOptions);

    config.mcpServers = config.mcpServers || {};
    config.mcpServers[server.id] = {
      command: installConfig.command,
      args: installConfig.args,
      env: installConfig.env
    };

    manager.saveConfig(config);
    console.log(chalk.green(`\n✓ ${server.name} installed successfully!`));
    console.log(chalk.gray('Restart Zesbe to apply changes.\n'));
  } else {
    console.log(chalk.yellow('\nInstallation cancelled.\n'));
  }
}
