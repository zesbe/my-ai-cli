/**
 * Syntax Highlighting Module
 * Highlights code blocks with language-aware coloring
 */

import { highlight, supportsLanguage } from 'cli-highlight';
import chalk from 'chalk';

// Language aliases for better detection
const LANGUAGE_ALIASES: Record<string, string> = {
  'js': 'javascript',
  'ts': 'typescript',
  'py': 'python',
  'rb': 'ruby',
  'sh': 'bash',
  'shell': 'bash',
  'zsh': 'bash',
  'yml': 'yaml',
  'md': 'markdown',
  'jsx': 'javascript',
  'tsx': 'typescript',
  'json5': 'json',
  'dockerfile': 'docker',
};

// Get normalized language name
function normalizeLanguage(lang: string): string {
  const lower = lang.toLowerCase().trim();
  return LANGUAGE_ALIASES[lower] || lower;
}

/**
 * Highlight a code block
 */
export function highlightCode(code: string, language?: string): string {
  try {
    const lang = language ? normalizeLanguage(language) : undefined;

    if (lang && supportsLanguage(lang)) {
      return highlight(code, { language: lang, ignoreIllegals: true });
    }

    // Auto-detect or fallback
    return highlight(code, { ignoreIllegals: true });
  } catch {
    // If highlighting fails, return original with basic styling
    return chalk.gray(code);
  }
}

/**
 * Extract and highlight code blocks from text
 * Handles ```language\ncode\n``` format
 */
export function highlightCodeBlocks(text: string): string {
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;

  return text.replace(codeBlockRegex, (_match, lang, code) => {
    const language = lang || '';
    const highlighted = highlightCode(code.trim(), language);
    const header = language
      ? chalk.dim.bgGray(` ${language.toUpperCase()} `) + '\n'
      : '';
    const border = chalk.dim('─'.repeat(40));

    return `\n${border}\n${header}${highlighted}\n${border}\n`;
  });
}

/**
 * Highlight inline code (single backticks)
 */
export function highlightInlineCode(text: string): string {
  const inlineCodeRegex = /`([^`]+)`/g;
  return text.replace(inlineCodeRegex, (_match, code) => {
    return chalk.bgGray.white(` ${code} `);
  });
}

/**
 * Full syntax processing for response text
 */
export function processCodeSyntax(text: string): string {
  let result = text;

  // First process code blocks
  result = highlightCodeBlocks(result);

  // Then process inline code (but not inside already processed blocks)
  result = highlightInlineCode(result);

  return result;
}

/**
 * Get language icon/emoji
 */
export function getLanguageIcon(language: string): string {
  const icons: Record<string, string> = {
    'javascript': '🟨',
    'typescript': '🔷',
    'python': '🐍',
    'rust': '🦀',
    'go': '🐹',
    'java': '☕',
    'ruby': '💎',
    'php': '🐘',
    'c': '©️',
    'cpp': '➕',
    'csharp': '♯',
    'swift': '🐦',
    'kotlin': '🎯',
    'bash': '💻',
    'sql': '🗄️',
    'html': '🌐',
    'css': '🎨',
    'json': '📋',
    'yaml': '📄',
    'markdown': '📝',
    'docker': '🐳',
  };

  const lang = normalizeLanguage(language);
  return icons[lang] || '📄';
}

export default {
  highlightCode,
  highlightCodeBlocks,
  highlightInlineCode,
  processCodeSyntax,
  getLanguageIcon,
};
