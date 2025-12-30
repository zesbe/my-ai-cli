import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const grepTool = {
  type: 'function',
  function: {
    name: 'grep',
    description: 'Search for a pattern in files',
    parameters: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'Regular expression pattern to search for'
        },
        path: {
          type: 'string',
          description: 'File or directory to search in (default: current directory)'
        },
        include: {
          type: 'string',
          description: 'File pattern to include (e.g., "*.js")'
        },
        ignore_case: {
          type: 'boolean',
          description: 'Case insensitive search'
        }
      },
      required: ['pattern']
    }
  }
};

export async function executeGrep(args) {
  const { pattern, path: searchPath = '.', include, ignore_case = false } = args;

  try {
    let cmd = 'grep -rn';
    if (ignore_case) cmd += ' -i';
    if (include) cmd += ` --include="${include}"`;
    cmd += ` "${pattern}" ${searchPath} 2>/dev/null | head -50`;

    const { stdout } = await execAsync(cmd, { timeout: 10000 });

    if (!stdout.trim()) {
      return 'No matches found';
    }

    return stdout.trim();
  } catch (err) {
    if (err.code === 1) {
      return 'No matches found';
    }
    return `Error searching: ${err.message}`;
  }
}
