import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const bashTool = {
  type: 'function',
  function: {
    name: 'bash',
    description: 'Execute a shell command and return the output',
    parameters: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'The shell command to execute'
        },
        timeout: {
          type: 'number',
          description: 'Timeout in milliseconds (default: 30000)'
        }
      },
      required: ['command']
    }
  }
};

export async function executeBash(args) {
  const { command, timeout = 30000 } = args;

  try {
    const { stdout, stderr } = await execAsync(command, {
      timeout,
      maxBuffer: 1024 * 1024 * 10, // 10MB
      shell: '/bin/bash'
    });

    let output = '';
    if (stdout) output += stdout;
    if (stderr) output += stderr;

    return output.trim() || '(no output)';
  } catch (err) {
    if (err.killed) {
      return `Command timed out after ${timeout}ms`;
    }
    return `Error: ${err.message}\n${err.stderr || ''}`;
  }
}
