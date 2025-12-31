/**
 * Tab Completion Module
 * Provides intelligent auto-completion for commands, files, and more
 */

import fs from 'fs';
import path from 'path';
import { getAllCommands } from './commands.js';

// Completion types
export type CompletionType = 'command' | 'file' | 'directory' | 'model' | 'provider' | 'history';

// Completion item
export interface CompletionItem {
  value: string;
  display: string;
  type: CompletionType;
  description?: string;
}

// Completion context
export interface CompletionContext {
  cwd: string;
  providers: string[];
  models: Record<string, string[]>;
  history: string[];
  currentProvider: string;
}

/**
 * Get completions for input
 */
export function getCompletions(
  input: string,
  cursorPosition: number,
  context: CompletionContext
): CompletionItem[] {
  const beforeCursor = input.slice(0, cursorPosition);
  const words = beforeCursor.split(/\s+/);
  const currentWord = words[words.length - 1] || '';
  const isFirstWord = words.length === 1;

  // Command completion (starts with /)
  if (currentWord.startsWith('/')) {
    return getCommandCompletions(currentWord.slice(1));
  }

  // After a command, provide context-specific completions
  if (words[0]?.startsWith('/')) {
    const command = words[0].slice(1).toLowerCase();
    return getCommandArgumentCompletions(command, currentWord, context);
  }

  // File path completion
  if (currentWord.includes('/') || currentWord.startsWith('.')) {
    return getFileCompletions(currentWord, context.cwd);
  }

  // History completion for empty or partial input
  if (isFirstWord && currentWord.length > 0) {
    return getHistoryCompletions(currentWord, context.history);
  }

  return [];
}

/**
 * Get command completions
 */
function getCommandCompletions(partial: string): CompletionItem[] {
  const commands = getAllCommands();
  const lower = partial.toLowerCase();

  return commands
    .filter(cmd => cmd.name.startsWith(lower) || cmd.aliases.some(a => a.startsWith(lower)))
    .map(cmd => ({
      value: '/' + cmd.name,
      display: '/' + cmd.name,
      type: 'command' as CompletionType,
      description: cmd.description
    }))
    .slice(0, 10);
}

/**
 * Get command argument completions
 */
function getCommandArgumentCompletions(
  command: string,
  partial: string,
  context: CompletionContext
): CompletionItem[] {
  switch (command) {
    case 'provider':
    case 'p':
      return getProviderCompletions(partial, context.providers);

    case 'model':
    case 'm':
      return getModelCompletions(partial, context.models[context.currentProvider] || []);

    case 'attach':
    case 'a':
    case 'add':
    case 'detach':
    case 'd':
    case 'remove':
      return getFileCompletions(partial, context.cwd);

    case 'template':
    case 'tmpl':
      return getTemplateCompletions(partial);

    default:
      return [];
  }
}

/**
 * Get provider completions
 */
function getProviderCompletions(partial: string, providers: string[]): CompletionItem[] {
  const lower = partial.toLowerCase();

  return providers
    .filter(p => p.toLowerCase().startsWith(lower))
    .map(p => ({
      value: p,
      display: p,
      type: 'provider' as CompletionType,
      description: `Switch to ${p} provider`
    }));
}

/**
 * Get model completions
 */
function getModelCompletions(partial: string, models: string[]): CompletionItem[] {
  const lower = partial.toLowerCase();

  return models
    .filter(m => m.toLowerCase().startsWith(lower))
    .map(m => ({
      value: m,
      display: m,
      type: 'model' as CompletionType,
      description: `Use ${m} model`
    }));
}

/**
 * Get file/directory completions
 */
function getFileCompletions(partial: string, cwd: string): CompletionItem[] {
  try {
    let searchDir: string;
    let prefix: string;

    if (partial.includes('/')) {
      const lastSlash = partial.lastIndexOf('/');
      prefix = partial.slice(lastSlash + 1);
      const dirPath = partial.slice(0, lastSlash) || '/';
      searchDir = path.isAbsolute(dirPath) ? dirPath : path.join(cwd, dirPath);
    } else {
      searchDir = cwd;
      prefix = partial;
    }

    if (!fs.existsSync(searchDir)) {
      return [];
    }

    const entries = fs.readdirSync(searchDir, { withFileTypes: true });
    const lower = prefix.toLowerCase();

    return entries
      .filter(entry => entry.name.toLowerCase().startsWith(lower))
      .filter(entry => !entry.name.startsWith('.') || prefix.startsWith('.'))
      .map(entry => {
        const isDir = entry.isDirectory();
        const fullPath = path.join(searchDir, entry.name);
        const relativePath = path.relative(cwd, fullPath);

        return {
          value: relativePath + (isDir ? '/' : ''),
          display: entry.name + (isDir ? '/' : ''),
          type: (isDir ? 'directory' : 'file') as CompletionType,
          description: isDir ? 'Directory' : getFileDescription(fullPath)
        };
      })
      .slice(0, 15);
  } catch {
    return [];
  }
}

/**
 * Get file description (size, type)
 */
function getFileDescription(filePath: string): string {
  try {
    const stats = fs.statSync(filePath);
    const size = formatFileSize(stats.size);
    const ext = path.extname(filePath).slice(1).toUpperCase() || 'File';
    return `${ext} - ${size}`;
  } catch {
    return 'File';
  }
}

/**
 * Format file size
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * Get template completions
 */
function getTemplateCompletions(partial: string): CompletionItem[] {
  const templates = [
    { name: 'api', desc: 'REST API endpoint template' },
    { name: 'component', desc: 'React component template' },
    { name: 'cli', desc: 'CLI command template' },
    { name: 'test', desc: 'Unit test template' },
    { name: 'readme', desc: 'README documentation' },
    { name: 'dockerfile', desc: 'Docker configuration' },
  ];

  const lower = partial.toLowerCase();

  return templates
    .filter(t => t.name.startsWith(lower))
    .map(t => ({
      value: t.name,
      display: t.name,
      type: 'command' as CompletionType,
      description: t.desc
    }));
}

/**
 * Get history completions
 */
function getHistoryCompletions(partial: string, history: string[]): CompletionItem[] {
  const lower = partial.toLowerCase();
  const seen = new Set<string>();

  return history
    .filter(h => h.toLowerCase().startsWith(lower) && !seen.has(h) && (seen.add(h), true))
    .slice(-10)
    .reverse()
    .map(h => ({
      value: h,
      display: h.length > 50 ? h.slice(0, 50) + '...' : h,
      type: 'history' as CompletionType,
      description: 'From history'
    }));
}

/**
 * Apply completion to input
 */
export function applyCompletion(
  input: string,
  cursorPosition: number,
  completion: CompletionItem
): { newInput: string; newCursor: number } {
  const beforeCursor = input.slice(0, cursorPosition);
  const afterCursor = input.slice(cursorPosition);

  // Find the word being completed
  const wordMatch = beforeCursor.match(/(\S*)$/);
  const wordStart = wordMatch ? cursorPosition - wordMatch[1].length : cursorPosition;

  const newInput = input.slice(0, wordStart) + completion.value + afterCursor;
  const newCursor = wordStart + completion.value.length;

  return { newInput, newCursor };
}

/**
 * Cycle through completions
 */
export class CompletionCycler {
  private completions: CompletionItem[] = [];
  private currentIndex = -1;
  private originalInput = '';
  private originalCursor = 0;

  reset(): void {
    this.completions = [];
    this.currentIndex = -1;
    this.originalInput = '';
    this.originalCursor = 0;
  }

  setCompletions(
    completions: CompletionItem[],
    originalInput: string,
    originalCursor: number
  ): void {
    this.completions = completions;
    this.currentIndex = -1;
    this.originalInput = originalInput;
    this.originalCursor = originalCursor;
  }

  hasCompletions(): boolean {
    return this.completions.length > 0;
  }

  next(): { input: string; cursor: number; completion: CompletionItem | null } {
    if (this.completions.length === 0) {
      return { input: this.originalInput, cursor: this.originalCursor, completion: null };
    }

    this.currentIndex = (this.currentIndex + 1) % this.completions.length;
    const completion = this.completions[this.currentIndex];
    const { newInput, newCursor } = applyCompletion(
      this.originalInput,
      this.originalCursor,
      completion
    );

    return { input: newInput, cursor: newCursor, completion };
  }

  previous(): { input: string; cursor: number; completion: CompletionItem | null } {
    if (this.completions.length === 0) {
      return { input: this.originalInput, cursor: this.originalCursor, completion: null };
    }

    this.currentIndex = this.currentIndex <= 0
      ? this.completions.length - 1
      : this.currentIndex - 1;

    const completion = this.completions[this.currentIndex];
    const { newInput, newCursor } = applyCompletion(
      this.originalInput,
      this.originalCursor,
      completion
    );

    return { input: newInput, cursor: newCursor, completion };
  }

  current(): CompletionItem | null {
    if (this.currentIndex < 0 || this.currentIndex >= this.completions.length) {
      return null;
    }
    return this.completions[this.currentIndex];
  }

  getAll(): CompletionItem[] {
    return this.completions;
  }
}

export default {
  getCompletions,
  applyCompletion,
  CompletionCycler,
};
