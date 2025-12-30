import { bashTool, executeBash } from './bash.js';
import { readTool, executeRead } from './read.js';
import { writeTool, executeWrite } from './write.js';
import { editTool, executeEdit } from './edit.js';
import { globTool, executeGlob } from './glob.js';
import { grepTool, executeGrep } from './grep.js';

// Tool definitions for OpenAI API
export const tools = [
  bashTool,
  readTool,
  writeTool,
  editTool,
  globTool,
  grepTool
];

// Tool executors
const executors = {
  bash: executeBash,
  read: executeRead,
  write: executeWrite,
  edit: executeEdit,
  glob: executeGlob,
  grep: executeGrep
};

export async function executeTool(name, args) {
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
