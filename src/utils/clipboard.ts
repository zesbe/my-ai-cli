/**
 * Clipboard Module
 * Handles copy/paste operations with fallback for different environments
 */

import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Clipboard history
const clipboardHistory: string[] = [];
const MAX_HISTORY = 20;

/**
 * Detect available clipboard tool
 */
function detectClipboardTool(): 'termux' | 'xclip' | 'xsel' | 'pbcopy' | 'clip' | 'none' {
  // Termux environment
  if (process.env.TERMUX_VERSION || fs.existsSync('/data/data/com.termux')) {
    try {
      execSync('which termux-clipboard-set', { stdio: 'ignore' });
      return 'termux';
    } catch {
      // termux-api not installed
    }
  }

  // macOS
  if (process.platform === 'darwin') {
    return 'pbcopy';
  }

  // Windows
  if (process.platform === 'win32') {
    return 'clip';
  }

  // Linux - try xclip first, then xsel
  try {
    execSync('which xclip', { stdio: 'ignore' });
    return 'xclip';
  } catch {
    try {
      execSync('which xsel', { stdio: 'ignore' });
      return 'xsel';
    } catch {
      return 'none';
    }
  }
}

const clipboardTool = detectClipboardTool();

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // Add to history
    addToHistory(text);

    switch (clipboardTool) {
      case 'termux':
        execSync('termux-clipboard-set', { input: text });
        return true;

      case 'pbcopy':
        execSync('pbcopy', { input: text });
        return true;

      case 'clip':
        execSync('clip', { input: text });
        return true;

      case 'xclip':
        execSync('xclip -selection clipboard', { input: text });
        return true;

      case 'xsel':
        execSync('xsel --clipboard --input', { input: text });
        return true;

      case 'none':
        // Fallback: save to temp file
        const tempFile = path.join(os.tmpdir(), 'ai-cli-clipboard.txt');
        fs.writeFileSync(tempFile, text);
        return true;

      default:
        return false;
    }
  } catch (error) {
    console.error('Clipboard copy failed:', error);
    return false;
  }
}

/**
 * Read from clipboard
 */
export async function readFromClipboard(): Promise<string | null> {
  try {
    switch (clipboardTool) {
      case 'termux':
        return execSync('termux-clipboard-get').toString();

      case 'pbcopy':
        return execSync('pbpaste').toString();

      case 'clip':
        // Windows doesn't have a native paste command, use PowerShell
        return execSync('powershell.exe Get-Clipboard').toString();

      case 'xclip':
        return execSync('xclip -selection clipboard -o').toString();

      case 'xsel':
        return execSync('xsel --clipboard --output').toString();

      case 'none':
        // Fallback: read from temp file
        const tempFile = path.join(os.tmpdir(), 'ai-cli-clipboard.txt');
        if (fs.existsSync(tempFile)) {
          return fs.readFileSync(tempFile, 'utf-8');
        }
        return null;

      default:
        return null;
    }
  } catch (error) {
    console.error('Clipboard read failed:', error);
    return null;
  }
}

/**
 * Add text to clipboard history
 */
function addToHistory(text: string): void {
  // Remove duplicates
  const index = clipboardHistory.indexOf(text);
  if (index > -1) {
    clipboardHistory.splice(index, 1);
  }

  // Add to front
  clipboardHistory.unshift(text);

  // Trim if too long
  while (clipboardHistory.length > MAX_HISTORY) {
    clipboardHistory.pop();
  }
}

/**
 * Get clipboard history
 */
export function getClipboardHistory(): string[] {
  return [...clipboardHistory];
}

/**
 * Clear clipboard history
 */
export function clearClipboardHistory(): void {
  clipboardHistory.length = 0;
}

/**
 * Check if clipboard is available
 */
export function isClipboardAvailable(): boolean {
  return clipboardTool !== 'none';
}

/**
 * Get clipboard tool name
 */
export function getClipboardToolName(): string {
  return clipboardTool;
}

// Keyboard shortcut definitions
export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  description: string;
  action: string;
}

// Default keyboard shortcuts
export const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  // Navigation
  { key: 'up', description: 'Previous message in history', action: 'historyPrev' },
  { key: 'down', description: 'Next message in history', action: 'historyNext' },
  { key: 'tab', description: 'Auto-complete', action: 'complete' },
  { key: 'tab', shift: true, description: 'Previous completion', action: 'completePrev' },

  // Editing
  { key: 'c', ctrl: true, description: 'Copy selection / Cancel', action: 'copy' },
  { key: 'v', ctrl: true, description: 'Paste from clipboard', action: 'paste' },
  { key: 'x', ctrl: true, description: 'Cut selection', action: 'cut' },
  { key: 'a', ctrl: true, description: 'Select all', action: 'selectAll' },
  { key: 'z', ctrl: true, description: 'Undo', action: 'undo' },
  { key: 'y', ctrl: true, description: 'Redo', action: 'redo' },

  // Line editing
  { key: 'u', ctrl: true, description: 'Clear line', action: 'clearLine' },
  { key: 'k', ctrl: true, description: 'Delete to end of line', action: 'deleteToEnd' },
  { key: 'w', ctrl: true, description: 'Delete word before cursor', action: 'deleteWord' },

  // Search
  { key: 'r', ctrl: true, description: 'Search history', action: 'searchHistory' },
  { key: 'f', ctrl: true, description: 'Find in output', action: 'find' },

  // Actions
  { key: 'l', ctrl: true, description: 'Clear screen', action: 'clearScreen' },
  { key: 'd', ctrl: true, description: 'Exit', action: 'exit' },
  { key: 'n', ctrl: true, description: 'New conversation', action: 'newChat' },
  { key: 's', ctrl: true, description: 'Save conversation', action: 'save' },

  // Quick commands
  { key: 'p', ctrl: true, description: 'Switch provider', action: 'switchProvider' },
  { key: 'm', ctrl: true, description: 'Switch model', action: 'switchModel' },
  { key: 'h', ctrl: true, description: 'Show help', action: 'help' },
];

/**
 * Match a key event to a shortcut
 */
export function matchShortcut(
  key: string,
  modifiers: { ctrl?: boolean; alt?: boolean; shift?: boolean; meta?: boolean },
  shortcuts: KeyboardShortcut[] = DEFAULT_SHORTCUTS
): KeyboardShortcut | null {
  return shortcuts.find(shortcut => {
    if (shortcut.key !== key.toLowerCase()) return false;
    if (!!shortcut.ctrl !== !!modifiers.ctrl) return false;
    if (!!shortcut.alt !== !!modifiers.alt) return false;
    if (!!shortcut.shift !== !!modifiers.shift) return false;
    if (!!shortcut.meta !== !!modifiers.meta) return false;
    return true;
  }) || null;
}

/**
 * Format shortcut for display
 */
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];
  if (shortcut.ctrl) parts.push('Ctrl');
  if (shortcut.alt) parts.push('Alt');
  if (shortcut.shift) parts.push('Shift');
  if (shortcut.meta) parts.push('Cmd');

  const keyDisplay = shortcut.key.length === 1
    ? shortcut.key.toUpperCase()
    : shortcut.key.charAt(0).toUpperCase() + shortcut.key.slice(1);

  parts.push(keyDisplay);
  return parts.join('+');
}

/**
 * Get all shortcuts grouped by category
 */
export function getShortcutsByCategory(): Record<string, KeyboardShortcut[]> {
  const categories: Record<string, KeyboardShortcut[]> = {
    'Navigation': [],
    'Editing': [],
    'Search': [],
    'Actions': [],
    'Quick Commands': [],
  };

  for (const shortcut of DEFAULT_SHORTCUTS) {
    switch (shortcut.action) {
      case 'historyPrev':
      case 'historyNext':
      case 'complete':
      case 'completePrev':
        categories['Navigation'].push(shortcut);
        break;

      case 'copy':
      case 'paste':
      case 'cut':
      case 'selectAll':
      case 'undo':
      case 'redo':
      case 'clearLine':
      case 'deleteToEnd':
      case 'deleteWord':
        categories['Editing'].push(shortcut);
        break;

      case 'searchHistory':
      case 'find':
        categories['Search'].push(shortcut);
        break;

      case 'clearScreen':
      case 'exit':
      case 'newChat':
      case 'save':
        categories['Actions'].push(shortcut);
        break;

      case 'switchProvider':
      case 'switchModel':
      case 'help':
        categories['Quick Commands'].push(shortcut);
        break;
    }
  }

  return categories;
}

export default {
  copyToClipboard,
  readFromClipboard,
  getClipboardHistory,
  clearClipboardHistory,
  isClipboardAvailable,
  getClipboardToolName,
  matchShortcut,
  formatShortcut,
  getShortcutsByCategory,
  DEFAULT_SHORTCUTS,
};
