import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const globTool = {
  type: 'function',
  function: {
    name: 'glob',
    description: 'Find files matching a glob pattern',
    parameters: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'Glob pattern to match files (e.g., "**/*.js", "src/**/*.ts")'
        },
        path: {
          type: 'string',
          description: 'Directory to search in (default: current directory)'
        }
      },
      required: ['pattern']
    }
  }
};

export async function executeGlob(args) {
  const { pattern, path: searchPath = '.' } = args;

  try {
    // Use find command for glob-like behavior
    const { stdout } = await execAsync(
      `find ${searchPath} -type f -name "${pattern.replace('**/', '')}" 2>/dev/null | head -100`,
      { timeout: 10000 }
    );

    const files = stdout.trim().split('\n').filter(f => f);

    if (files.length === 0) {
      return 'No files found matching pattern';
    }

    return files.join('\n');
  } catch (err) {
    return `Error searching files: ${err.message}`;
  }
}
