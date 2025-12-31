import { bashTool, executeBash } from './bash.js';
import { readTool, executeRead } from './read.js';
import { writeTool, executeWrite } from './write.js';
import { editTool, executeEdit } from './edit.js';
import { globTool, executeGlob } from './glob.js';
import { grepTool, executeGrep } from './grep.js';
import { webTool, executeWebFetch } from './web.js';
import { getMCPManager } from '../mcp/client.js';

// Built-in tool definitions
export const builtInTools = [
  bashTool,
  readTool,
  writeTool,
  editTool,
  globTool,
  grepTool,
  webTool
];

// Get all tools (built-in + MCP)
export function getAllTools() {
  const mcpManager = getMCPManager();
  const mcpTools = mcpManager.getToolsForAI();
  return [...builtInTools, ...mcpTools];
}

// For backward compatibility
export const tools = builtInTools;

// Tool executors
const executors = {
  bash: executeBash,
  read: executeRead,
  write: executeWrite,
  edit: executeEdit,
  glob: executeGlob,
  grep: executeGrep,
  web_fetch: executeWebFetch
};

export async function executeTool(name, args) {
  // Check if it's an MCP tool
  if (name.startsWith('mcp_')) {
    const mcpManager = getMCPManager();
    try {
      return await mcpManager.executeTool(name, args);
    } catch (err) {
      return `Error executing MCP tool ${name}: ${err.message}`;
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
    return `Error executing ${name}: ${err.message}`;
  }
}
