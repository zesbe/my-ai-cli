/**
 * MCP (Model Context Protocol) Client for Zesbe CLI
 * Connects to MCP servers and provides their tools to the AI
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const CONFIG_DIR = path.join(os.homedir(), '.zesbe');
const MCP_CONFIG_FILE = path.join(CONFIG_DIR, 'mcp.json');

// Default MCP config template
const DEFAULT_MCP_CONFIG = {
  mcpServers: {
    // Example:
    // "filesystem": {
    //   "command": "npx",
    //   "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed/dir"],
    //   "env": {}
    // }
  }
};

export class MCPManager {
  constructor() {
    this.clients = new Map(); // server name -> { client, transport, tools }
    this.allTools = [];
  }

  // Load MCP configuration
  loadConfig() {
    try {
      if (fs.existsSync(MCP_CONFIG_FILE)) {
        return JSON.parse(fs.readFileSync(MCP_CONFIG_FILE, 'utf-8'));
      }
    } catch (e) {
      console.error('Error loading MCP config:', e.message);
    }
    return DEFAULT_MCP_CONFIG;
  }

  // Save MCP configuration
  saveConfig(config) {
    try {
      if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
      }
      fs.writeFileSync(MCP_CONFIG_FILE, JSON.stringify(config, null, 2));
      return true;
    } catch (e) {
      console.error('Error saving MCP config:', e.message);
      return false;
    }
  }

  // Connect to a single MCP server
  async connectToServer(name, serverConfig) {
    try {
      const { command, args = [], env = {} } = serverConfig;
      
      // Create transport
      const transport = new StdioClientTransport({
        command,
        args,
        env: { ...process.env, ...env }
      });

      // Create and connect client
      const client = new Client({
        name: 'zesbe-cli',
        version: '1.0.0'
      });

      await client.connect(transport);

      // List available tools
      const toolsResult = await client.listTools();
      const tools = toolsResult.tools || [];

      // Store client info
      this.clients.set(name, {
        client,
        transport,
        tools,
        config: serverConfig
      });

      console.log(`✅ Connected to MCP server: ${name} (${tools.length} tools)`);
      return { success: true, tools };
    } catch (e) {
      console.error(`❌ Failed to connect to MCP server ${name}:`, e.message);
      return { success: false, error: e.message };
    }
  }

  // Connect to all configured servers
  async connectAll() {
    const config = this.loadConfig();
    const servers = config.mcpServers || {};
    const results = [];

    for (const [name, serverConfig] of Object.entries(servers)) {
      const result = await this.connectToServer(name, serverConfig);
      results.push({ name, ...result });
    }

    // Aggregate all tools
    this.allTools = [];
    for (const [name, info] of this.clients) {
      for (const tool of info.tools) {
        this.allTools.push({
          ...tool,
          _mcpServer: name // Track which server this tool belongs to
        });
      }
    }

    return results;
  }

  // Disconnect from a server
  async disconnectServer(name) {
    const info = this.clients.get(name);
    if (info) {
      try {
        await info.client.close();
        this.clients.delete(name);
        return true;
      } catch (e) {
        console.error(`Error disconnecting from ${name}:`, e.message);
      }
    }
    return false;
  }

  // Disconnect from all servers
  async disconnectAll() {
    for (const name of this.clients.keys()) {
      await this.disconnectServer(name);
    }
  }

  // Get tools in OpenAI format for AI
  getToolsForAI() {
    return this.allTools.map(tool => ({
      type: 'function',
      function: {
        name: `mcp_${tool._mcpServer}_${tool.name}`,
        description: `[MCP:${tool._mcpServer}] ${tool.description || ''}`,
        parameters: tool.inputSchema || { type: 'object', properties: {} }
      }
    }));
  }

  // Execute an MCP tool
  async executeTool(fullName, args) {
    // Parse tool name: mcp_servername_toolname
    const parts = fullName.replace('mcp_', '').split('_');
    const serverName = parts[0];
    const toolName = parts.slice(1).join('_');

    const info = this.clients.get(serverName);
    if (!info) {
      return { error: `MCP server ${serverName} not connected` };
    }

    try {
      const result = await info.client.callTool({
        name: toolName,
        arguments: args
      });
      
      // Extract text content
      if (result.content) {
        return result.content.map(c => c.text || JSON.stringify(c)).join('\n');
      }
      return JSON.stringify(result);
    } catch (e) {
      return { error: e.message };
    }
  }

  // List connected servers
  listServers() {
    const servers = [];
    for (const [name, info] of this.clients) {
      servers.push({
        name,
        tools: info.tools.length,
        toolNames: info.tools.map(t => t.name)
      });
    }
    return servers;
  }

  // Add a new server to config
  addServer(name, command, args = [], env = {}) {
    const config = this.loadConfig();
    config.mcpServers[name] = { command, args, env };
    return this.saveConfig(config);
  }

  // Remove a server from config
  removeServer(name) {
    const config = this.loadConfig();
    delete config.mcpServers[name];
    return this.saveConfig(config);
  }
}

// Singleton instance
let mcpManager = null;

export function getMCPManager() {
  if (!mcpManager) {
    mcpManager = new MCPManager();
  }
  return mcpManager;
}
