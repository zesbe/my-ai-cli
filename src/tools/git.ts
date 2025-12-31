/**
 * Git Tools - Powered by simple-git
 * Provides git operations similar to Claude Code
 */

import { simpleGit, SimpleGit, StatusResult, LogResult } from 'simple-git';
import { z } from 'zod';
import type { Tool } from '../types/index.js';

// Initialize git instance
function getGit(cwd?: string): SimpleGit {
  return simpleGit(cwd || process.cwd());
}

// ============================================================================
// SCHEMAS (Zod validation like Claude Code)
// ============================================================================

export const GitStatusSchema = z.object({
  cwd: z.string().optional().describe('Working directory path')
});

export const GitDiffSchema = z.object({
  staged: z.boolean().optional().default(false).describe('Show staged changes only'),
  file: z.string().optional().describe('Specific file to diff'),
  cwd: z.string().optional().describe('Working directory path')
});

export const GitLogSchema = z.object({
  maxCount: z.number().optional().default(10).describe('Maximum number of commits to show'),
  file: z.string().optional().describe('Show commits for specific file'),
  cwd: z.string().optional().describe('Working directory path')
});

export const GitCommitSchema = z.object({
  message: z.string().describe('Commit message'),
  files: z.array(z.string()).optional().describe('Specific files to commit (default: all staged)'),
  cwd: z.string().optional().describe('Working directory path')
});

export const GitBranchSchema = z.object({
  name: z.string().optional().describe('Branch name to create/switch to'),
  delete: z.boolean().optional().describe('Delete the branch'),
  list: z.boolean().optional().default(true).describe('List all branches'),
  cwd: z.string().optional().describe('Working directory path')
});

export const GitCheckoutSchema = z.object({
  branch: z.string().describe('Branch name to checkout'),
  create: z.boolean().optional().default(false).describe('Create new branch'),
  cwd: z.string().optional().describe('Working directory path')
});

export const GitStashSchema = z.object({
  action: z.enum(['push', 'pop', 'list', 'drop', 'apply']).default('push').describe('Stash action'),
  message: z.string().optional().describe('Stash message (for push)'),
  index: z.number().optional().describe('Stash index (for pop/drop/apply)'),
  cwd: z.string().optional().describe('Working directory path')
});

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type GitStatusArgs = z.infer<typeof GitStatusSchema>;
export type GitDiffArgs = z.infer<typeof GitDiffSchema>;
export type GitLogArgs = z.infer<typeof GitLogSchema>;
export type GitCommitArgs = z.infer<typeof GitCommitSchema>;
export type GitBranchArgs = z.infer<typeof GitBranchSchema>;
export type GitCheckoutArgs = z.infer<typeof GitCheckoutSchema>;
export type GitStashArgs = z.infer<typeof GitStashSchema>;

// ============================================================================
// TOOL EXECUTORS
// ============================================================================

export async function executeGitStatus(args: GitStatusArgs): Promise<string> {
  const validated = GitStatusSchema.parse(args);
  const git = getGit(validated.cwd);

  try {
    const status: StatusResult = await git.status();

    const lines: string[] = [];
    lines.push(`Branch: ${status.current || 'detached HEAD'}`);

    if (status.tracking) {
      lines.push(`Tracking: ${status.tracking}`);
      if (status.ahead > 0) lines.push(`  Ahead: ${status.ahead} commits`);
      if (status.behind > 0) lines.push(`  Behind: ${status.behind} commits`);
    }

    if (status.staged.length > 0) {
      lines.push(`\nStaged (${status.staged.length}):`);
      status.staged.forEach(f => lines.push(`  + ${f}`));
    }

    if (status.modified.length > 0) {
      lines.push(`\nModified (${status.modified.length}):`);
      status.modified.forEach(f => lines.push(`  M ${f}`));
    }

    if (status.not_added.length > 0) {
      lines.push(`\nUntracked (${status.not_added.length}):`);
      status.not_added.forEach(f => lines.push(`  ? ${f}`));
    }

    if (status.deleted.length > 0) {
      lines.push(`\nDeleted (${status.deleted.length}):`);
      status.deleted.forEach(f => lines.push(`  D ${f}`));
    }

    if (status.conflicted.length > 0) {
      lines.push(`\nConflicted (${status.conflicted.length}):`);
      status.conflicted.forEach(f => lines.push(`  ! ${f}`));
    }

    if (status.isClean()) {
      lines.push('\nWorking tree clean');
    }

    return lines.join('\n');
  } catch (err) {
    const error = err as Error;
    return `Git status error: ${error.message}`;
  }
}

export async function executeGitDiff(args: GitDiffArgs): Promise<string> {
  const validated = GitDiffSchema.parse(args);
  const git = getGit(validated.cwd);

  try {
    let diff: string;

    if (validated.staged) {
      diff = await git.diff(['--cached', ...(validated.file ? [validated.file] : [])]);
    } else {
      diff = await git.diff([...(validated.file ? [validated.file] : [])]);
    }

    if (!diff) {
      return validated.staged ? 'No staged changes' : 'No changes';
    }

    return diff;
  } catch (err) {
    const error = err as Error;
    return `Git diff error: ${error.message}`;
  }
}

export async function executeGitLog(args: GitLogArgs): Promise<string> {
  const validated = GitLogSchema.parse(args);
  const git = getGit(validated.cwd);

  try {
    const options: any = { maxCount: validated.maxCount };
    if (validated.file) {
      options.file = validated.file;
    }

    const log: LogResult = await git.log(options);

    const lines: string[] = [];
    for (const commit of log.all) {
      const date = new Date(commit.date).toLocaleDateString();
      const shortHash = commit.hash.slice(0, 7);
      lines.push(`${shortHash} - ${commit.message} (${commit.author_name}, ${date})`);
    }

    return lines.join('\n') || 'No commits found';
  } catch (err) {
    const error = err as Error;
    return `Git log error: ${error.message}`;
  }
}

export async function executeGitCommit(args: GitCommitArgs): Promise<string> {
  const validated = GitCommitSchema.parse(args);
  const git = getGit(validated.cwd);

  try {
    // Add files if specified
    if (validated.files && validated.files.length > 0) {
      await git.add(validated.files);
    }

    // Commit
    const result = await git.commit(validated.message);

    if (result.commit) {
      return `Committed: ${result.commit}\n${result.summary.changes} file(s) changed, ${result.summary.insertions} insertion(s), ${result.summary.deletions} deletion(s)`;
    } else {
      return 'Nothing to commit';
    }
  } catch (err) {
    const error = err as Error;
    return `Git commit error: ${error.message}`;
  }
}

export async function executeGitBranch(args: GitBranchArgs): Promise<string> {
  const validated = GitBranchSchema.parse(args);
  const git = getGit(validated.cwd);

  try {
    if (validated.delete && validated.name) {
      await git.deleteLocalBranch(validated.name);
      return `Deleted branch: ${validated.name}`;
    }

    if (validated.name && !validated.list) {
      await git.checkoutLocalBranch(validated.name);
      return `Created and switched to branch: ${validated.name}`;
    }

    // List branches
    const branches = await git.branchLocal();
    const lines: string[] = ['Branches:'];
    for (const branch of branches.all) {
      const isCurrent = branch === branches.current;
      lines.push(`  ${isCurrent ? '* ' : '  '}${branch}`);
    }
    return lines.join('\n');
  } catch (err) {
    const error = err as Error;
    return `Git branch error: ${error.message}`;
  }
}

export async function executeGitCheckout(args: GitCheckoutArgs): Promise<string> {
  const validated = GitCheckoutSchema.parse(args);
  const git = getGit(validated.cwd);

  try {
    if (validated.create) {
      await git.checkoutLocalBranch(validated.branch);
      return `Created and switched to branch: ${validated.branch}`;
    } else {
      await git.checkout(validated.branch);
      return `Switched to branch: ${validated.branch}`;
    }
  } catch (err) {
    const error = err as Error;
    return `Git checkout error: ${error.message}`;
  }
}

export async function executeGitStash(args: GitStashArgs): Promise<string> {
  const validated = GitStashSchema.parse(args);
  const git = getGit(validated.cwd);

  try {
    switch (validated.action) {
      case 'push':
        if (validated.message) {
          await git.stash(['push', '-m', validated.message]);
        } else {
          await git.stash(['push']);
        }
        return 'Changes stashed';

      case 'pop':
        await git.stash(['pop', ...(validated.index !== undefined ? [`stash@{${validated.index}}`] : [])]);
        return 'Stash popped';

      case 'apply':
        await git.stash(['apply', ...(validated.index !== undefined ? [`stash@{${validated.index}}`] : [])]);
        return 'Stash applied';

      case 'drop':
        await git.stash(['drop', ...(validated.index !== undefined ? [`stash@{${validated.index}}`] : [])]);
        return 'Stash dropped';

      case 'list':
        const list = await git.stashList();
        if (list.all.length === 0) {
          return 'No stashes';
        }
        return list.all.map((s, i) => `${i}: ${s.message}`).join('\n');
    }
  } catch (err) {
    const error = err as Error;
    return `Git stash error: ${error.message}`;
  }
}

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

export const gitStatusTool: Tool = {
  type: 'function',
  function: {
    name: 'git_status',
    description: 'Get git repository status including staged, modified, untracked files and branch info',
    parameters: {
      type: 'object',
      properties: {
        cwd: {
          type: 'string',
          description: 'Working directory path'
        }
      },
      required: []
    }
  }
};

export const gitDiffTool: Tool = {
  type: 'function',
  function: {
    name: 'git_diff',
    description: 'Show git diff for changes in the repository',
    parameters: {
      type: 'object',
      properties: {
        staged: {
          type: 'string',
          description: 'Show only staged changes (true/false)'
        },
        file: {
          type: 'string',
          description: 'Specific file to show diff for'
        },
        cwd: {
          type: 'string',
          description: 'Working directory path'
        }
      },
      required: []
    }
  }
};

export const gitLogTool: Tool = {
  type: 'function',
  function: {
    name: 'git_log',
    description: 'Show git commit history',
    parameters: {
      type: 'object',
      properties: {
        maxCount: {
          type: 'string',
          description: 'Maximum number of commits to show (default: 10)'
        },
        file: {
          type: 'string',
          description: 'Show commits for specific file'
        },
        cwd: {
          type: 'string',
          description: 'Working directory path'
        }
      },
      required: []
    }
  }
};

export const gitCommitTool: Tool = {
  type: 'function',
  function: {
    name: 'git_commit',
    description: 'Create a git commit with staged changes',
    parameters: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'Commit message'
        },
        files: {
          type: 'array',
          description: 'Specific files to add and commit',
          items: { type: 'string' }
        },
        cwd: {
          type: 'string',
          description: 'Working directory path'
        }
      },
      required: ['message']
    }
  }
};

export const gitBranchTool: Tool = {
  type: 'function',
  function: {
    name: 'git_branch',
    description: 'List, create, or delete git branches',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Branch name to create or delete'
        },
        delete: {
          type: 'string',
          description: 'Delete the branch (true/false)'
        },
        list: {
          type: 'string',
          description: 'List all branches (true/false)'
        },
        cwd: {
          type: 'string',
          description: 'Working directory path'
        }
      },
      required: []
    }
  }
};

export const gitCheckoutTool: Tool = {
  type: 'function',
  function: {
    name: 'git_checkout',
    description: 'Switch to a different git branch',
    parameters: {
      type: 'object',
      properties: {
        branch: {
          type: 'string',
          description: 'Branch name to checkout'
        },
        create: {
          type: 'string',
          description: 'Create new branch (true/false)'
        },
        cwd: {
          type: 'string',
          description: 'Working directory path'
        }
      },
      required: ['branch']
    }
  }
};

export const gitStashTool: Tool = {
  type: 'function',
  function: {
    name: 'git_stash',
    description: 'Stash changes in the working directory',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          description: 'Stash action: push, pop, list, drop, apply',
          enum: ['push', 'pop', 'list', 'drop', 'apply']
        },
        message: {
          type: 'string',
          description: 'Stash message (for push action)'
        },
        index: {
          type: 'string',
          description: 'Stash index (for pop/drop/apply)'
        },
        cwd: {
          type: 'string',
          description: 'Working directory path'
        }
      },
      required: []
    }
  }
};

// Export all git tools
export const gitTools: Tool[] = [
  gitStatusTool,
  gitDiffTool,
  gitLogTool,
  gitCommitTool,
  gitBranchTool,
  gitCheckoutTool,
  gitStashTool
];
