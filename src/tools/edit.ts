import fs from 'fs/promises';
import path from 'path';
import type { Tool } from '../types/index.js';

export const editTool: Tool = {
  type: 'function',
  function: {
    name: 'edit',
    description: 'Edit a file by replacing text (search and replace)',
    parameters: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: 'Path to the file to edit'
        },
        old_string: {
          type: 'string',
          description: 'The exact text to find and replace'
        },
        new_string: {
          type: 'string',
          description: 'The text to replace with'
        },
        replace_all: {
          type: 'boolean',
          description: 'Replace all occurrences (default: false)'
        }
      },
      required: ['file_path', 'old_string', 'new_string']
    }
  }
};

interface EditArgs {
  file_path: string;
  old_string: string;
  new_string: string;
  replace_all?: boolean;
}

interface NodeError extends Error {
  code?: string;
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function executeEdit(args: EditArgs): Promise<string> {
  const { file_path, old_string, new_string, replace_all = false } = args;

  try {
    const resolvedPath = path.resolve(file_path);
    let content = await fs.readFile(resolvedPath, 'utf-8');

    // Check if old_string exists
    if (!content.includes(old_string)) {
      return `Error: Could not find the specified text in ${file_path}`;
    }

    // Count occurrences
    const occurrences = (content.match(new RegExp(escapeRegExp(old_string), 'g')) || []).length;

    // Replace
    if (replace_all) {
      content = content.split(old_string).join(new_string);
    } else {
      content = content.replace(old_string, new_string);
    }

    // Write back
    await fs.writeFile(resolvedPath, content, 'utf-8');

    const replaced = replace_all ? occurrences : 1;
    return `File edited: ${file_path} (${replaced} replacement${replaced > 1 ? 's' : ''})`;
  } catch (err) {
    const error = err as NodeError;
    if (error.code === 'ENOENT') {
      return `File not found: ${file_path}`;
    }
    return `Error editing file: ${error.message}`;
  }
}
