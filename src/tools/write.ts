import fs from 'fs/promises';
import path from 'path';
import type { Tool } from '../types/index.js';

export const writeTool: Tool = {
  type: 'function',
  function: {
    name: 'write',
    description: 'Write content to a file (creates or overwrites)',
    parameters: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: 'Path to the file to write'
        },
        content: {
          type: 'string',
          description: 'Content to write to the file'
        }
      },
      required: ['file_path', 'content']
    }
  }
};

interface WriteArgs {
  file_path: string;
  content: string;
}

export async function executeWrite(args: WriteArgs): Promise<string> {
  const { file_path, content } = args;

  try {
    const resolvedPath = path.resolve(file_path);
    const dir = path.dirname(resolvedPath);

    // Create directory if it doesn't exist
    await fs.mkdir(dir, { recursive: true });

    // Write file
    await fs.writeFile(resolvedPath, content, 'utf-8');

    const lines = content.split('\n').length;
    return `File written: ${file_path} (${lines} lines)`;
  } catch (err) {
    const error = err as Error;
    return `Error writing file: ${error.message}`;
  }
}
