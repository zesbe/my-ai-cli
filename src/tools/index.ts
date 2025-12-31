import { bashTool, executeBash } from './bash.js';
import { readTool, executeRead } from './read.js';
import { writeTool, executeWrite } from './write.js';
import { editTool, executeEdit } from './edit.js';
import { globTool, executeGlob } from './glob.js';
import { grepTool, executeGrep } from './grep.js';
import { webTool, executeWebFetch } from './web.js';
import { getMCPManager } from '../mcp/client.js';
import type { Tool, ToolExecutor } from '../types/index.js';

// Built-in tool definitions
export const builtInTools: Tool[] = [
  bashTool,
  readTool,
  writeTool,
  editTool,
  globTool,
  grepTool,
  webTool
];

// Get all tools (built-in + MCP)
export function getAllTools(): Tool[] {
  const mcpManager = getMCPManager();
  const mcpTools = mcpManager.getToolsForAI();
  return [...builtInTools, ...mcpTools];
}

// For backward compatibility
export const tools = builtInTools;

// Tool executors map
const executors: Record<string, ToolExecutor> = {
  bash: executeBash as ToolExecutor,
  read: executeRead as ToolExecutor,
  write: executeWrite as ToolExecutor,
  edit: executeEdit as ToolExecutor,
  glob: executeGlob as ToolExecutor,
  grep: executeGrep as ToolExecutor,
  web_fetch: executeWebFetch as ToolExecutor
};

export async function executeTool(name: string, args: Record<string, unknown>): Promise<string | object> {
  // Check if it's an MCP tool
  if (name.startsWith('mcp_')) {
    const mcpManager = getMCPManager();
    try {
      return await mcpManager.executeTool(name, args);
    } catch (err) {
      const error = err as Error;
      return `Error executing MCP tool ${name}: ${error.message}`;
    }
  }

  // Built-in tool
  const executor = executors[name];
  if (!executor) {
    return `Unknown tool: ${name}`;
  }

  try {
    return await executor(args);
  } catch (err) {
    const error = err as Error;
    return `Error executing ${name}: ${error.message}`;
  }
}

// Re-export individual tools
export { bashTool, executeBash };
export { readTool, executeRead };
export { writeTool, executeWrite };
export { editTool, executeEdit };
export { globTool, executeGlob };
export { grepTool, executeGrep };
export { webTool, executeWebFetch };
