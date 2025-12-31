import fs from 'fs/promises';
import path from 'path';
import type { Tool } from '../types/index.js';

export const readTool: Tool = {
  type: 'function',
  function: {
    name: 'read',
    description: 'Read the contents of a file',
    parameters: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: 'Path to the file to read'
        },
        offset: {
          type: 'number',
          description: 'Line number to start reading from (1-based)'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of lines to read'
        }
      },
      required: ['file_path']
    }
  }
};

interface ReadArgs {
  file_path: string;
  offset?: number;
  limit?: number;
}

interface NodeError extends Error {
  code?: string;
}

export async function executeRead(args: ReadArgs): Promise<string> {
  const { file_path, offset = 1, limit } = args;

  try {
    const resolvedPath = path.resolve(file_path);
    const content = await fs.readFile(resolvedPath, 'utf-8');
    const lines = content.split('\n');

    // Apply offset and limit
    const startLine = Math.max(0, offset - 1);
    const endLine = limit ? startLine + limit : lines.length;
    const selectedLines = lines.slice(startLine, endLine);

    // Add line numbers
    const numberedLines = selectedLines.map((line, i) => {
      const lineNum = startLine + i + 1;
      return `${lineNum.toString().padStart(5)}\t${line}`;
    });

    return numberedLines.join('\n');
  } catch (err) {
    const error = err as NodeError;
    if (error.code === 'ENOENT') {
      return `File not found: ${file_path}`;
    }
    return `Error reading file: ${error.message}`;
  }
}
