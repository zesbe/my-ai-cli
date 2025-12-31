/**
 * Context Management Module
 * Handles file attachments, context windows, and file previews
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { countTokens } from './tokens.js';
import { highlightCode } from './syntax.js';

// File attachment
export interface AttachedFile {
  path: string;
  name: string;
  content: string;
  language: string;
  tokens: number;
  size: number;
  lastModified: Date;
}

// Context window info
export interface ContextInfo {
  totalTokens: number;
  maxTokens: number;
  usedPercent: number;
  attachedFiles: AttachedFile[];
  historyTokens: number;
  systemTokens: number;
}

// File type detection
const LANGUAGE_EXTENSIONS: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.py': 'python',
  '.rb': 'ruby',
  '.rs': 'rust',
  '.go': 'go',
  '.java': 'java',
  '.kt': 'kotlin',
  '.swift': 'swift',
  '.c': 'c',
  '.cpp': 'cpp',
  '.h': 'c',
  '.hpp': 'cpp',
  '.cs': 'csharp',
  '.php': 'php',
  '.sh': 'bash',
  '.bash': 'bash',
  '.zsh': 'bash',
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.xml': 'xml',
  '.html': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.less': 'less',
  '.sql': 'sql',
  '.md': 'markdown',
  '.txt': 'text',
  '.env': 'bash',
  '.toml': 'toml',
  '.ini': 'ini',
  '.conf': 'ini',
  '.dockerfile': 'dockerfile',
};

// Context manager class
export class ContextManager {
  private attachedFiles: Map<string, AttachedFile> = new Map();
  private maxTokens: number;
  private reservedTokens: number; // For system prompt and response

  constructor(maxTokens: number = 128000, reservedTokens: number = 8000) {
    this.maxTokens = maxTokens;
    this.reservedTokens = reservedTokens;
  }

  /**
   * Attach a file to context
   */
  attachFile(filePath: string): AttachedFile | null {
    try {
      const absolutePath = path.resolve(filePath);

      if (!fs.existsSync(absolutePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const stats = fs.statSync(absolutePath);
      if (stats.isDirectory()) {
        throw new Error(`Cannot attach directory: ${filePath}`);
      }

      // Check file size (max 1MB)
      if (stats.size > 1024 * 1024) {
        throw new Error(`File too large (max 1MB): ${filePath}`);
      }

      const content = fs.readFileSync(absolutePath, 'utf-8');
      const ext = path.extname(absolutePath).toLowerCase();
      const language = LANGUAGE_EXTENSIONS[ext] || 'text';
      const tokens = countTokens(content);

      const file: AttachedFile = {
        path: absolutePath,
        name: path.basename(absolutePath),
        content,
        language,
        tokens,
        size: stats.size,
        lastModified: stats.mtime,
      };

      this.attachedFiles.set(absolutePath, file);
      return file;
    } catch (error) {
      console.error(chalk.red(`Error attaching file: ${(error as Error).message}`));
      return null;
    }
  }

  /**
   * Detach a file
   */
  detachFile(filePath: string): boolean {
    const absolutePath = path.resolve(filePath);
    return this.attachedFiles.delete(absolutePath);
  }

  /**
   * Detach all files
   */
  detachAll(): void {
    this.attachedFiles.clear();
  }

  /**
   * Get all attached files
   */
  getAttachedFiles(): AttachedFile[] {
    return Array.from(this.attachedFiles.values());
  }

  /**
   * Check if file is attached
   */
  isAttached(filePath: string): boolean {
    const absolutePath = path.resolve(filePath);
    return this.attachedFiles.has(absolutePath);
  }

  /**
   * Get context info
   */
  getContextInfo(historyTokens: number = 0, systemTokens: number = 0): ContextInfo {
    const files = this.getAttachedFiles();
    const fileTokens = files.reduce((sum, f) => sum + f.tokens, 0);
    const totalTokens = fileTokens + historyTokens + systemTokens;

    return {
      totalTokens,
      maxTokens: this.maxTokens,
      usedPercent: (totalTokens / this.maxTokens) * 100,
      attachedFiles: files,
      historyTokens,
      systemTokens,
    };
  }

  /**
   * Get available tokens
   */
  getAvailableTokens(historyTokens: number = 0, systemTokens: number = 0): number {
    const info = this.getContextInfo(historyTokens, systemTokens);
    return Math.max(0, this.maxTokens - info.totalTokens - this.reservedTokens);
  }

  /**
   * Build context message from attached files
   */
  buildContextMessage(): string {
    const files = this.getAttachedFiles();
    if (files.length === 0) return '';

    const parts: string[] = ['Here are the attached files for context:\n'];

    for (const file of files) {
      parts.push(`\n### File: ${file.name}`);
      parts.push(`Path: ${file.path}`);
      parts.push(`Language: ${file.language}`);
      parts.push('```' + file.language);
      parts.push(file.content);
      parts.push('```\n');
    }

    return parts.join('\n');
  }

  /**
   * Refresh file content (re-read from disk)
   */
  refreshFile(filePath: string): AttachedFile | null {
    const absolutePath = path.resolve(filePath);
    if (!this.attachedFiles.has(absolutePath)) {
      return null;
    }

    this.attachedFiles.delete(absolutePath);
    return this.attachFile(filePath);
  }

  /**
   * Refresh all files
   */
  refreshAll(): void {
    const paths = Array.from(this.attachedFiles.keys());
    for (const p of paths) {
      this.refreshFile(p);
    }
  }
}

/**
 * Create a file preview
 */
export function createFilePreview(
  filePath: string,
  options: {
    maxLines?: number;
    showLineNumbers?: boolean;
    highlight?: boolean;
  } = {}
): string {
  const { maxLines = 20, showLineNumbers = true, highlight = true } = options;

  try {
    const absolutePath = path.resolve(filePath);
    const stats = fs.statSync(absolutePath);
    const content = fs.readFileSync(absolutePath, 'utf-8');
    const lines = content.split('\n');
    const ext = path.extname(absolutePath).toLowerCase();
    const language = LANGUAGE_EXTENSIONS[ext] || 'text';

    // Header
    const header = [
      chalk.bold.cyan(path.basename(absolutePath)),
      chalk.dim(`${formatFileSize(stats.size)} • ${language} • ${lines.length} lines`),
    ].join('\n');

    // Preview content
    let preview = lines.slice(0, maxLines).join('\n');
    const truncated = lines.length > maxLines;

    if (highlight) {
      preview = highlightCode(preview, language);
    }

    if (showLineNumbers) {
      preview = addLineNumbers(preview);
    }

    // Footer
    let footer = '';
    if (truncated) {
      footer = chalk.dim(`\n... ${lines.length - maxLines} more lines`);
    }

    return `${header}\n${chalk.dim('─'.repeat(40))}\n${preview}${footer}`;
  } catch (error) {
    return chalk.red(`Error reading file: ${(error as Error).message}`);
  }
}

/**
 * Add line numbers to code
 */
function addLineNumbers(code: string): string {
  const lines = code.split('\n');
  const width = String(lines.length).length;

  return lines.map((line, i) => {
    const num = String(i + 1).padStart(width);
    return chalk.dim(`${num} │ `) + line;
  }).join('\n');
}

/**
 * Format file size
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Format context info for display
 */
export function formatContextInfo(info: ContextInfo): string {
  const lines: string[] = [];

  lines.push(chalk.bold.cyan('Context Status'));
  lines.push(chalk.dim('─'.repeat(40)));

  // Token usage bar
  const barWidth = 30;
  const filledWidth = Math.round((info.usedPercent / 100) * barWidth);
  const bar = chalk.green('█'.repeat(filledWidth)) + chalk.gray('░'.repeat(barWidth - filledWidth));
  const color = info.usedPercent > 80 ? chalk.red : info.usedPercent > 60 ? chalk.yellow : chalk.green;

  lines.push(`Tokens: ${bar} ${color(`${info.usedPercent.toFixed(1)}%`)}`);
  lines.push(chalk.dim(`  ${info.totalTokens.toLocaleString()} / ${info.maxTokens.toLocaleString()}`));

  // Breakdown
  lines.push('');
  lines.push(chalk.yellow('Token Breakdown:'));

  const fileTokens = info.attachedFiles.reduce((sum, f) => sum + f.tokens, 0);
  lines.push(`  Files:   ${fileTokens.toLocaleString()}`);
  lines.push(`  History: ${info.historyTokens.toLocaleString()}`);
  lines.push(`  System:  ${info.systemTokens.toLocaleString()}`);

  // Attached files
  if (info.attachedFiles.length > 0) {
    lines.push('');
    lines.push(chalk.yellow('Attached Files:'));
    for (const file of info.attachedFiles) {
      lines.push(`  ${chalk.green('✓')} ${file.name} (${file.tokens} tokens)`);
    }
  }

  return lines.join('\n');
}

/**
 * Detect file type from content (for paste detection)
 */
export function detectFileType(content: string): string {
  // Check for common patterns
  if (content.includes('import ') && (content.includes(' from ') || content.includes('require('))) {
    if (content.includes(': ') && content.includes('interface ')) return 'typescript';
    return 'javascript';
  }
  if (content.includes('def ') && content.includes(':')) return 'python';
  if (content.includes('func ') && content.includes('package ')) return 'go';
  if (content.includes('fn ') && content.includes('let ')) return 'rust';
  if (content.includes('public class ') || content.includes('private ')) return 'java';
  if (content.includes('<?php')) return 'php';
  if (content.includes('#!/bin/bash') || content.includes('#!/bin/sh')) return 'bash';
  if (content.startsWith('{') || content.startsWith('[')) {
    try {
      JSON.parse(content);
      return 'json';
    } catch {}
  }
  if (content.includes('<html') || content.includes('<!DOCTYPE')) return 'html';
  if (content.includes('SELECT ') || content.includes('INSERT ')) return 'sql';

  return 'text';
}

// Export singleton instance
export const contextManager = new ContextManager();

export default {
  ContextManager,
  contextManager,
  createFilePreview,
  formatContextInfo,
  detectFileType,
};
