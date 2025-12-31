/**
 * Diff Viewer Module
 * Shows beautiful diffs for code changes
 */

import chalk from 'chalk';
import { diffLines, diffWords, diffChars, Change } from 'diff';

// Diff display options
export interface DiffOptions {
  context?: number;        // Lines of context around changes
  wordDiff?: boolean;      // Show word-level changes
  showLineNumbers?: boolean;
  unified?: boolean;       // Unified diff format
  colorOnly?: boolean;     // Only highlight changes, don't show +/-
}

const DEFAULT_OPTIONS: DiffOptions = {
  context: 3,
  wordDiff: false,
  showLineNumbers: true,
  unified: true,
  colorOnly: false,
};

/**
 * Create a unified diff display
 */
export function createDiff(
  oldText: string,
  newText: string,
  options: DiffOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const changes = diffLines(oldText, newText);

  if (opts.unified) {
    return formatUnifiedDiff(changes, opts);
  }

  return formatSideBySideDiff(oldText, newText, opts);
}

/**
 * Format as unified diff
 */
function formatUnifiedDiff(changes: Change[], options: DiffOptions): string {
  const lines: string[] = [];
  let oldLineNum = 1;
  let newLineNum = 1;

  for (const change of changes) {
    const changeLines = change.value.split('\n');
    // Remove last empty line from split
    if (changeLines[changeLines.length - 1] === '') {
      changeLines.pop();
    }

    for (const line of changeLines) {
      if (change.added) {
        const prefix = options.showLineNumbers
          ? chalk.dim(`   ${String(newLineNum).padStart(4)} `)
          : '';
        lines.push(prefix + chalk.green('+ ' + line));
        newLineNum++;
      } else if (change.removed) {
        const prefix = options.showLineNumbers
          ? chalk.dim(`${String(oldLineNum).padStart(4)}    `)
          : '';
        lines.push(prefix + chalk.red('- ' + line));
        oldLineNum++;
      } else {
        const prefix = options.showLineNumbers
          ? chalk.dim(`${String(oldLineNum).padStart(4)} ${String(newLineNum).padStart(4)} `)
          : '';
        lines.push(prefix + chalk.gray('  ' + line));
        oldLineNum++;
        newLineNum++;
      }
    }
  }

  return lines.join('\n');
}

/**
 * Format as side-by-side diff (simplified)
 */
function formatSideBySideDiff(oldText: string, newText: string, options: DiffOptions): string {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const maxLen = Math.max(oldLines.length, newLines.length);
  const colWidth = 40;

  const lines: string[] = [];
  lines.push(chalk.dim('─'.repeat(colWidth * 2 + 3)));
  lines.push(
    chalk.bold.red('OLD'.padEnd(colWidth)) +
    ' │ ' +
    chalk.bold.green('NEW')
  );
  lines.push(chalk.dim('─'.repeat(colWidth * 2 + 3)));

  for (let i = 0; i < maxLen; i++) {
    const oldLine = oldLines[i] || '';
    const newLine = newLines[i] || '';

    const oldDisplay = truncate(oldLine, colWidth - 2).padEnd(colWidth);
    const newDisplay = truncate(newLine, colWidth - 2);

    if (oldLine !== newLine) {
      lines.push(
        chalk.red(oldDisplay) +
        chalk.dim(' │ ') +
        chalk.green(newDisplay)
      );
    } else {
      lines.push(
        chalk.gray(oldDisplay) +
        chalk.dim(' │ ') +
        chalk.gray(newDisplay)
      );
    }
  }

  lines.push(chalk.dim('─'.repeat(colWidth * 2 + 3)));
  return lines.join('\n');
}

/**
 * Truncate string with ellipsis
 */
function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}

/**
 * Create inline diff (for single lines)
 */
export function createInlineDiff(oldText: string, newText: string): string {
  const changes = diffWords(oldText, newText);

  return changes.map(change => {
    if (change.added) {
      return chalk.bgGreen.black(change.value);
    }
    if (change.removed) {
      return chalk.bgRed.black(change.value);
    }
    return change.value;
  }).join('');
}

/**
 * Create character-level diff
 */
export function createCharDiff(oldText: string, newText: string): string {
  const changes = diffChars(oldText, newText);

  return changes.map(change => {
    if (change.added) {
      return chalk.green.underline(change.value);
    }
    if (change.removed) {
      return chalk.red.strikethrough(change.value);
    }
    return chalk.gray(change.value);
  }).join('');
}

/**
 * Get diff statistics
 */
export function getDiffStats(oldText: string, newText: string): {
  additions: number;
  deletions: number;
  changes: number;
  unchanged: number;
} {
  const changes = diffLines(oldText, newText);

  let additions = 0;
  let deletions = 0;
  let unchanged = 0;

  for (const change of changes) {
    const lineCount = (change.value.match(/\n/g) || []).length;
    if (change.added) {
      additions += lineCount || 1;
    } else if (change.removed) {
      deletions += lineCount || 1;
    } else {
      unchanged += lineCount || 1;
    }
  }

  return {
    additions,
    deletions,
    changes: additions + deletions,
    unchanged,
  };
}

/**
 * Format diff statistics for display
 */
export function formatDiffStats(stats: ReturnType<typeof getDiffStats>): string {
  const parts: string[] = [];

  if (stats.additions > 0) {
    parts.push(chalk.green(`+${stats.additions}`));
  }
  if (stats.deletions > 0) {
    parts.push(chalk.red(`-${stats.deletions}`));
  }

  const total = stats.additions + stats.deletions + stats.unchanged;
  const changePercent = total > 0
    ? Math.round((stats.changes / total) * 100)
    : 0;

  return `${parts.join(' ')} (${changePercent}% changed)`;
}

/**
 * Create a file diff header
 */
export function createDiffHeader(
  oldPath: string,
  newPath: string,
  stats?: ReturnType<typeof getDiffStats>
): string {
  const lines: string[] = [];

  lines.push(chalk.bold.yellow('diff --ai'));
  lines.push(chalk.red(`--- a/${oldPath}`));
  lines.push(chalk.green(`+++ b/${newPath}`));

  if (stats) {
    lines.push(chalk.dim(formatDiffStats(stats)));
  }

  return lines.join('\n');
}

/**
 * Create a complete file diff with header
 */
export function createFileDiff(
  oldPath: string,
  newPath: string,
  oldContent: string,
  newContent: string,
  options: DiffOptions = {}
): string {
  const stats = getDiffStats(oldContent, newContent);
  const header = createDiffHeader(oldPath, newPath, stats);
  const diff = createDiff(oldContent, newContent, options);

  return `${header}\n${chalk.dim('─'.repeat(60))}\n${diff}`;
}

/**
 * Apply a simple patch (for demonstration)
 * Note: This is simplified and doesn't handle all edge cases
 */
export function applySimplePatch(original: string, patch: string): string {
  const lines = original.split('\n');
  const patchLines = patch.split('\n');

  const result: string[] = [];
  let lineIndex = 0;

  for (const patchLine of patchLines) {
    if (patchLine.startsWith('+') && !patchLine.startsWith('+++')) {
      // Add line
      result.push(patchLine.slice(2));
    } else if (patchLine.startsWith('-') && !patchLine.startsWith('---')) {
      // Remove line - skip in original
      lineIndex++;
    } else if (patchLine.startsWith(' ')) {
      // Context line - copy from original
      if (lineIndex < lines.length) {
        result.push(lines[lineIndex]);
        lineIndex++;
      }
    }
  }

  // Add remaining lines
  while (lineIndex < lines.length) {
    result.push(lines[lineIndex]);
    lineIndex++;
  }

  return result.join('\n');
}

/**
 * Highlight changes in a code block
 */
export function highlightChanges(
  code: string,
  additions: number[],  // Line numbers that were added
  deletions: number[]   // Line numbers that were deleted
): string {
  const lines = code.split('\n');
  const addSet = new Set(additions);
  const delSet = new Set(deletions);

  return lines.map((line, i) => {
    const lineNum = i + 1;
    if (addSet.has(lineNum)) {
      return chalk.bgGreen.black(line);
    }
    if (delSet.has(lineNum)) {
      return chalk.bgRed.black(line);
    }
    return line;
  }).join('\n');
}

export default {
  createDiff,
  createInlineDiff,
  createCharDiff,
  getDiffStats,
  formatDiffStats,
  createDiffHeader,
  createFileDiff,
  applySimplePatch,
  highlightChanges,
};
