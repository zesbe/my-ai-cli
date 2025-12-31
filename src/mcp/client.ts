/**
 * MCP (Model Context Protocol) Client for Zesbe CLI
 * Connects to MCP servers and provides their tools to the AI
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import fs from 'fs';
import path from 'path';
import os from 'os';
import type { MCPServerConfig, MCPConfig, Tool } from '../types/index.js';

const CONFIG_DIR = path.join(os.homedir(), '.zesbe');
const MCP_CONFIG_FILE = path.join(CONFIG_DIR, 'mcp.json');

// Default MCP config template
const DEFAULT_MCP_CONFIG: MCPConfig = {
  mcpServers: {
    // Example:
    // "filesystem": {
    //   "command": "npx",
    //   "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed/dir"],
    //   "env": {}
    // }
  }
};

interface MCPTool {
  name: string;
  description?: string;
  inputSchema?: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
  _mcpServer?: string;
}

interface MCPClientInfo {
  client: Client;
  transport: StdioClientTransport;
  tools: MCPTool[];
  config: MCPServerConfig;
}

interface ConnectResult {
  success: boolean;
  tools?: MCPTool[];
  error?: string;
}

export class MCPManager {
  private clients: Map<string, MCPClientInfo>;
  private allTools: MCPTool[];

  constructor() {
    this.clients = new Map();
    this.allTools = [];
  }

  // Load MCP configuration
  loadConfig(): MCPConfig {
    try {
      if (fs.existsSync(MCP_CONFIG_FILE)) {
        return JSON.parse(fs.readFileSync(MCP_CONFIG_FILE, 'utf-8')) as MCPConfig;
      }
    } catch (e) {
      const error = e as Error;
      console.error('Error loading MCP config:', error.message);
    }
    return DEFAULT_MCP_CONFIG;
  }

  // Save MCP configuration
  saveConfig(config: MCPConfig): boolean {
    try {
      if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
      }
      fs.writeFileSync(MCP_CONFIG_FILE, JSON.stringify(config, null, 2));
      return true;
    } catch (e) {
      const error = e as Error;
      console.error('Error saving MCP config:', error.message);
      return false;
    }
  }

  // Connect to a single MCP server
  async connectToServer(name: string, serverConfig: MCPServerConfig): Promise<ConnectResult> {
    try {
      const { command, args = [], env = {} } = serverConfig;

      // Create transport
      const transport = new StdioClientTransport({
        command,
        args,
        env: { ...process.env, ...env } as Record<string, string>
      });

      // Create and connect client
      const client = new Client({
        name: 'zesbe-cli',
        version: '1.0.0'
      });

      await client.connect(transport);

      // List available tools
      const toolsResult = await client.listTools();
      const tools = (toolsResult.tools || []) as MCPTool[];

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
      const error = e as Error;
      console.error(`❌ Failed to connect to MCP server ${name}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  // Connect to all configured servers
  async connectAll(): Promise<Array<{ name: string } & ConnectResult>> {
    const config = this.loadConfig();
    const servers = config.mcpServers || {};
    const results: Array<{ name: string } & ConnectResult> = [];

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
  async disconnectServer(name: string): Promise<boolean> {
    const info = this.clients.get(name);
    if (info) {
      try {
        await info.client.close();
        this.clients.delete(name);
        return true;
      } catch (e) {
        const error = e as Error;
        console.error(`Error disconnecting from ${name}:`, error.message);
      }
    }
    return false;
  }

  // Disconnect from all servers
  async disconnectAll(): Promise<void> {
    for (const name of this.clients.keys()) {
      await this.disconnectServer(name);
    }
  }

  // Get tools in OpenAI format for AI
  getToolsForAI(): Tool[] {
    return this.allTools.map(tool => ({
      type: 'function' as const,
      function: {
        name: `mcp_${tool._mcpServer}_${tool.name}`,
        description: `[MCP:${tool._mcpServer}] ${tool.description || ''}`,
        parameters: {
          type: 'object' as const,
          properties: (tool.inputSchema?.properties || {}) as Record<string, { type: string; description: string }>,
          required: tool.inputSchema?.required
        }
      }
    }));
  }

  // Execute an MCP tool
  async executeTool(fullName: string, args: Record<string, unknown>): Promise<string | { error: string }> {
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
        return (result.content as Array<{ text?: string }>).map(c => c.text || JSON.stringify(c)).join('\n');
      }
      return JSON.stringify(result);
    } catch (e) {
      const error = e as Error;
      return { error: error.message };
    }
  }

  // List connected servers
  listServers(): Array<{ name: string; tools: number; toolNames: string[] }> {
    const servers: Array<{ name: string; tools: number; toolNames: string[] }> = [];
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
  addServer(name: string, command: string, args: string[] = [], env: Record<string, string> = {}): boolean {
    const config = this.loadConfig();
    config.mcpServers[name] = { command, args, env };
    return this.saveConfig(config);
  }

  // Remove a server from config
  removeServer(name: string): boolean {
    const config = this.loadConfig();
    delete config.mcpServers[name];
    return this.saveConfig(config);
  }
}

// Singleton instance
let mcpManager: MCPManager | null = null;

export function getMCPManager(): MCPManager {
  if (!mcpManager) {
    mcpManager = new MCPManager();
  }
  return mcpManager;
}
