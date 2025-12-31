import { exec, ExecException } from 'child_process';
import { promisify } from 'util';
import type { Tool } from '../types/index.js';

const execAsync = promisify(exec);

export const bashTool: Tool = {
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

interface BashArgs {
  command: string;
  timeout?: number;
}

interface ExecError extends ExecException {
  killed?: boolean;
  stderr?: string;
}

export async function executeBash(args: BashArgs): Promise<string> {
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
    const error = err as ExecError;
    if (error.killed) {
      return `Command timed out after ${timeout}ms`;
    }
    return `Error: ${error.message}\n${error.stderr || ''}`;
  }
}
