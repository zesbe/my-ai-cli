/**
 * Export and History Module
 * Handles conversation export, history search, and persistence
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import { stripMarkdown } from './markdown.js';

// Message type
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  model?: string;
  provider?: string;
  tokens?: number;
}

// Conversation type
export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  provider: string;
  model: string;
  totalTokens: number;
}

// Export formats
export type ExportFormat = 'json' | 'markdown' | 'text' | 'html';

// History directory
const HISTORY_DIR = path.join(os.homedir(), '.my-ai-cli', 'history');

// Ensure history directory exists
function ensureHistoryDir(): void {
  if (!fs.existsSync(HISTORY_DIR)) {
    fs.mkdirSync(HISTORY_DIR, { recursive: true });
  }
}

/**
 * Generate conversation ID
 */
function generateId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Generate conversation title from first message
 */
function generateTitle(messages: ChatMessage[]): string {
  const firstUserMsg = messages.find(m => m.role === 'user');
  if (!firstUserMsg) return 'Untitled Conversation';

  const content = stripMarkdown(firstUserMsg.content);
  const title = content.slice(0, 50).trim();
  return title.length < content.length ? title + '...' : title;
}

/**
 * Save conversation to history
 */
export function saveConversation(
  messages: ChatMessage[],
  provider: string,
  model: string
): Conversation {
  ensureHistoryDir();

  const conversation: Conversation = {
    id: generateId(),
    title: generateTitle(messages),
    messages,
    createdAt: new Date(messages[0]?.timestamp || Date.now()),
    updatedAt: new Date(),
    provider,
    model,
    totalTokens: messages.reduce((sum, m) => sum + (m.tokens || 0), 0),
  };

  const filePath = path.join(HISTORY_DIR, `${conversation.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(conversation, null, 2));

  return conversation;
}

/**
 * Load conversation from history
 */
export function loadConversation(id: string): Conversation | null {
  try {
    const filePath = path.join(HISTORY_DIR, `${id}.json`);
    if (!fs.existsSync(filePath)) return null;

    const data = fs.readFileSync(filePath, 'utf-8');
    const conv = JSON.parse(data) as Conversation;

    // Convert date strings back to Date objects
    conv.createdAt = new Date(conv.createdAt);
    conv.updatedAt = new Date(conv.updatedAt);
    conv.messages.forEach(m => {
      m.timestamp = new Date(m.timestamp);
    });

    return conv;
  } catch {
    return null;
  }
}

/**
 * List all conversations
 */
export function listConversations(limit: number = 20): Conversation[] {
  ensureHistoryDir();

  try {
    const files = fs.readdirSync(HISTORY_DIR)
      .filter(f => f.endsWith('.json'))
      .sort((a, b) => b.localeCompare(a)); // Newest first

    const conversations: Conversation[] = [];

    for (const file of files.slice(0, limit)) {
      const id = file.replace('.json', '');
      const conv = loadConversation(id);
      if (conv) conversations.push(conv);
    }

    return conversations;
  } catch {
    return [];
  }
}

/**
 * Search conversations
 */
export function searchConversations(
  query: string,
  options: { limit?: number; provider?: string; model?: string } = {}
): Conversation[] {
  const { limit = 10, provider, model } = options;
  const conversations = listConversations(100); // Load more for searching
  const lowerQuery = query.toLowerCase();

  return conversations
    .filter(conv => {
      // Filter by provider/model if specified
      if (provider && conv.provider !== provider) return false;
      if (model && conv.model !== model) return false;

      // Search in title and messages
      if (conv.title.toLowerCase().includes(lowerQuery)) return true;
      return conv.messages.some(m =>
        m.content.toLowerCase().includes(lowerQuery)
      );
    })
    .slice(0, limit);
}

/**
 * Delete conversation
 */
export function deleteConversation(id: string): boolean {
  try {
    const filePath = path.join(HISTORY_DIR, `${id}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Clear all history
 */
export function clearHistory(): number {
  ensureHistoryDir();

  try {
    const files = fs.readdirSync(HISTORY_DIR).filter(f => f.endsWith('.json'));
    for (const file of files) {
      fs.unlinkSync(path.join(HISTORY_DIR, file));
    }
    return files.length;
  } catch {
    return 0;
  }
}

/**
 * Export conversation to different formats
 */
export function exportConversation(
  conversation: Conversation,
  format: ExportFormat = 'markdown'
): string {
  switch (format) {
    case 'json':
      return exportToJson(conversation);
    case 'markdown':
      return exportToMarkdown(conversation);
    case 'text':
      return exportToText(conversation);
    case 'html':
      return exportToHtml(conversation);
    default:
      return exportToMarkdown(conversation);
  }
}

/**
 * Export to JSON
 */
function exportToJson(conversation: Conversation): string {
  return JSON.stringify(conversation, null, 2);
}

/**
 * Export to Markdown
 */
function exportToMarkdown(conversation: Conversation): string {
  const lines: string[] = [];

  lines.push(`# ${conversation.title}`);
  lines.push('');
  lines.push(`**Date:** ${conversation.createdAt.toLocaleString()}`);
  lines.push(`**Provider:** ${conversation.provider}`);
  lines.push(`**Model:** ${conversation.model}`);
  lines.push(`**Total Tokens:** ${conversation.totalTokens}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  for (const msg of conversation.messages) {
    const role = msg.role === 'user' ? '**You:**' : '**AI:**';
    lines.push(role);
    lines.push('');
    lines.push(msg.content);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Export to plain text
 */
function exportToText(conversation: Conversation): string {
  const lines: string[] = [];

  lines.push(conversation.title);
  lines.push('='.repeat(conversation.title.length));
  lines.push('');
  lines.push(`Date: ${conversation.createdAt.toLocaleString()}`);
  lines.push(`Provider: ${conversation.provider}`);
  lines.push(`Model: ${conversation.model}`);
  lines.push('');
  lines.push('-'.repeat(40));
  lines.push('');

  for (const msg of conversation.messages) {
    const role = msg.role === 'user' ? 'You:' : 'AI:';
    lines.push(role);
    lines.push(stripMarkdown(msg.content));
    lines.push('');
    lines.push('-'.repeat(40));
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Export to HTML
 */
function exportToHtml(conversation: Conversation): string {
  const messages = conversation.messages.map(msg => {
    const role = msg.role === 'user' ? 'user' : 'assistant';
    const content = escapeHtml(msg.content).replace(/\n/g, '<br>');
    return `
      <div class="message ${role}">
        <div class="role">${role === 'user' ? 'You' : 'AI'}</div>
        <div class="content">${content}</div>
      </div>
    `;
  }).join('\n');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(conversation.title)}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #333; }
    .meta { color: #666; font-size: 14px; margin-bottom: 20px; }
    .message { margin: 20px 0; padding: 15px; border-radius: 8px; }
    .message.user { background: #e3f2fd; }
    .message.assistant { background: #f5f5f5; }
    .role { font-weight: bold; margin-bottom: 5px; }
    .content { white-space: pre-wrap; }
    code { background: #eee; padding: 2px 6px; border-radius: 3px; }
    pre { background: #1e1e1e; color: #d4d4d4; padding: 15px; border-radius: 5px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>${escapeHtml(conversation.title)}</h1>
  <div class="meta">
    <p>Date: ${conversation.createdAt.toLocaleString()}</p>
    <p>Provider: ${conversation.provider} | Model: ${conversation.model}</p>
    <p>Total Tokens: ${conversation.totalTokens}</p>
  </div>
  ${messages}
</body>
</html>
  `.trim();
}

/**
 * Escape HTML characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Save export to file
 */
export function saveExport(
  conversation: Conversation,
  format: ExportFormat,
  outputPath?: string
): string {
  const content = exportConversation(conversation, format);
  const ext = format === 'markdown' ? 'md' : format;
  const fileName = `${conversation.id}.${ext}`;
  const filePath = outputPath || path.join(process.cwd(), fileName);

  fs.writeFileSync(filePath, content);
  return filePath;
}

/**
 * Format conversation list for display
 */
export function formatConversationList(conversations: Conversation[]): string {
  if (conversations.length === 0) {
    return chalk.gray('No conversations found');
  }

  const lines: string[] = [];
  lines.push(chalk.bold.cyan('Recent Conversations'));
  lines.push(chalk.dim('─'.repeat(60)));

  for (const conv of conversations) {
    const date = conv.updatedAt.toLocaleDateString();
    const msgCount = conv.messages.length;
    const title = conv.title.length > 40
      ? conv.title.slice(0, 40) + '...'
      : conv.title;

    lines.push(
      `${chalk.dim(date)} ${chalk.white(title)} ` +
      chalk.dim(`(${msgCount} messages, ${conv.provider})`)
    );
  }

  return lines.join('\n');
}

/**
 * Format search results
 */
export function formatSearchResults(
  results: Conversation[],
  query: string
): string {
  if (results.length === 0) {
    return chalk.yellow(`No results found for "${query}"`);
  }

  const lines: string[] = [];
  lines.push(chalk.bold.cyan(`Search Results for "${query}"`));
  lines.push(chalk.dim('─'.repeat(60)));

  for (const conv of results) {
    const date = conv.updatedAt.toLocaleDateString();

    // Find matching message snippet
    const matchingMsg = conv.messages.find(m =>
      m.content.toLowerCase().includes(query.toLowerCase())
    );

    let snippet = '';
    if (matchingMsg) {
      const content = matchingMsg.content;
      const idx = content.toLowerCase().indexOf(query.toLowerCase());
      const start = Math.max(0, idx - 30);
      const end = Math.min(content.length, idx + query.length + 30);
      snippet = (start > 0 ? '...' : '') +
        content.slice(start, end) +
        (end < content.length ? '...' : '');
      snippet = snippet.replace(/\n/g, ' ');
    }

    lines.push(chalk.dim(date) + ' ' + chalk.white(conv.title));
    if (snippet) {
      // Highlight query in snippet
      const highlighted = snippet.replace(
        new RegExp(query, 'gi'),
        match => chalk.bgYellow.black(match)
      );
      lines.push(chalk.gray('  ' + highlighted));
    }
    lines.push('');
  }

  return lines.join('\n');
}

export default {
  saveConversation,
  loadConversation,
  listConversations,
  searchConversations,
  deleteConversation,
  clearHistory,
  exportConversation,
  saveExport,
  formatConversationList,
  formatSearchResults,
};
