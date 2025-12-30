import fs from 'fs/promises';
import path from 'path';

export const writeTool = {
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

export async function executeWrite(args) {
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
    return `Error writing file: ${err.message}`;
  }
}
