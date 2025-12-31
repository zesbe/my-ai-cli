/**
 * Markdown Rendering Module
 * Renders markdown to terminal-friendly output
 */

import { marked } from 'marked';
import TerminalRenderer from 'marked-terminal';
import chalk from 'chalk';
import { highlightCode } from './syntax.js';

// Configure marked with terminal renderer
marked.setOptions({
  renderer: new TerminalRenderer({
    // Code blocks
    code: (code: string, lang?: string) => {
      const highlighted = highlightCode(code, lang || undefined);
      const header = lang ? chalk.dim.bgGray(` ${lang.toUpperCase()} `) + '\n' : '';
      const border = chalk.dim('─'.repeat(50));
      return `\n${border}\n${header}${highlighted}\n${border}\n`;
    },
    // Inline code
    codespan: (code: string) => chalk.bgGray.white(` ${code} `),
    // Headers
    heading: (text: string, level: number) => {
      const prefix = chalk.cyan('#'.repeat(level));
      const content = chalk.bold.white(text);
      return `\n${prefix} ${content}\n`;
    },
    // Bold
    strong: (text: string) => chalk.bold(text),
    // Italic
    em: (text: string) => chalk.italic(text),
    // Strikethrough
    del: (text: string) => chalk.strikethrough.dim(text),
    // Links
    link: (href: string, _title: string, text: string) => {
      return `${chalk.blue.underline(text)} ${chalk.dim(`(${href})`)}`;
    },
    // Lists
    list: (body: string, ordered: boolean) => {
      return '\n' + body + '\n';
    },
    listitem: (text: string) => {
      return `  ${chalk.cyan('•')} ${text}\n`;
    },
    // Blockquote
    blockquote: (text: string) => {
      const lines = text.split('\n').map(line =>
        chalk.dim('│ ') + chalk.italic(line)
      ).join('\n');
      return `\n${lines}\n`;
    },
    // Horizontal rule
    hr: () => chalk.dim('\n' + '─'.repeat(50) + '\n'),
    // Paragraph
    paragraph: (text: string) => text + '\n\n',
    // Table
    table: (header: string, body: string) => {
      return `\n${header}${body}\n`;
    },
    tablerow: (content: string) => {
      return content + '\n';
    },
    tablecell: (content: string, flags: { header?: boolean; align?: string }) => {
      const text = flags.header ? chalk.bold.cyan(content) : content;
      return text.padEnd(20) + ' │ ';
    },
  }) as any,
  gfm: true,
  breaks: true,
});

/**
 * Render markdown to terminal
 */
export function renderMarkdown(text: string): string {
  try {
    return marked(text) as string;
  } catch {
    // Fallback to plain text
    return text;
  }
}

/**
 * Simple markdown processing without full parsing
 * Useful for streaming where we can't wait for complete markdown
 */
export function processSimpleMarkdown(text: string): string {
  let result = text;

  // Bold: **text** or __text__
  result = result.replace(/\*\*([^*]+)\*\*/g, chalk.bold('$1'));
  result = result.replace(/__([^_]+)__/g, chalk.bold('$1'));

  // Italic: *text* or _text_
  result = result.replace(/\*([^*]+)\*/g, chalk.italic('$1'));
  result = result.replace(/_([^_]+)_/g, chalk.italic('$1'));

  // Inline code: `code`
  result = result.replace(/`([^`]+)`/g, chalk.bgGray.white(' $1 '));

  // Headers: # text
  result = result.replace(/^(#{1,6})\s+(.+)$/gm, (_match, hashes, text) => {
    return chalk.cyan(hashes) + ' ' + chalk.bold.white(text);
  });

  // Lists: - item or * item
  result = result.replace(/^[-*]\s+(.+)$/gm, chalk.cyan('  • ') + '$1');

  // Numbered lists: 1. item
  result = result.replace(/^(\d+)\.\s+(.+)$/gm, chalk.cyan('  $1.') + ' $2');

  // Links: [text](url)
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g,
    chalk.blue.underline('$1') + chalk.dim(' ($2)')
  );

  // Blockquotes: > text
  result = result.replace(/^>\s+(.+)$/gm, chalk.dim('│ ') + chalk.italic('$1'));

  // Horizontal rule: --- or ***
  result = result.replace(/^[-*]{3,}$/gm, chalk.dim('─'.repeat(50)));

  return result;
}

/**
 * Check if text contains markdown
 */
export function containsMarkdown(text: string): boolean {
  const markdownPatterns = [
    /```[\s\S]*?```/,      // Code blocks
    /`[^`]+`/,             // Inline code
    /\*\*[^*]+\*\*/,       // Bold
    /\*[^*]+\*/,           // Italic
    /^#{1,6}\s/m,          // Headers
    /^\s*[-*]\s/m,         // Lists
    /\[.+\]\(.+\)/,        // Links
    /^>\s/m,               // Blockquotes
  ];

  return markdownPatterns.some(pattern => pattern.test(text));
}

/**
 * Strip markdown formatting
 */
export function stripMarkdown(text: string): string {
  let result = text;

  // Remove code blocks
  result = result.replace(/```[\s\S]*?```/g, '');
  // Remove inline code
  result = result.replace(/`([^`]+)`/g, '$1');
  // Remove bold/italic
  result = result.replace(/\*\*([^*]+)\*\*/g, '$1');
  result = result.replace(/\*([^*]+)\*/g, '$1');
  result = result.replace(/__([^_]+)__/g, '$1');
  result = result.replace(/_([^_]+)_/g, '$1');
  // Remove headers
  result = result.replace(/^#{1,6}\s+/gm, '');
  // Remove links
  result = result.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  // Remove blockquotes
  result = result.replace(/^>\s+/gm, '');

  return result;
}

export default {
  renderMarkdown,
  processSimpleMarkdown,
  containsMarkdown,
  stripMarkdown,
};
