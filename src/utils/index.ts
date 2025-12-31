/**
 * Utils Module Index
 * Re-exports all utility modules
 */

// Syntax highlighting
export {
  highlightCode,
  highlightCodeBlocks,
  highlightInlineCode,
  processCodeSyntax,
  getLanguageIcon,
} from './syntax.js';

// Markdown rendering
export {
  renderMarkdown,
  processSimpleMarkdown,
  containsMarkdown,
  stripMarkdown,
} from './markdown.js';

// Slash commands
export {
  registerCommand,
  getCommand,
  getAllCommands,
  isCommand,
  parseCommand,
  executeCommand,
  findMatchingCommands,
  getBestMatch,
} from './commands.js';

export type {
  CommandHandler,
  CommandContext,
  CommandResult,
  Command,
} from './commands.js';

// Tab completion
export {
  getCompletions,
  applyCompletion,
  CompletionCycler,
} from './completion.js';

export type {
  CompletionType,
  CompletionItem,
  CompletionContext,
} from './completion.js';

// Clipboard and shortcuts
export {
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
} from './clipboard.js';

export type {
  KeyboardShortcut,
} from './clipboard.js';

// Diff viewer
export {
  createDiff,
  createInlineDiff,
  createCharDiff,
  getDiffStats,
  formatDiffStats,
  createDiffHeader,
  createFileDiff,
  applySimplePatch,
  highlightChanges,
} from './diff.js';

export type {
  DiffOptions,
} from './diff.js';

// Context management
export {
  ContextManager,
  contextManager,
  createFilePreview,
  formatContextInfo,
  detectFileType,
} from './context.js';

export type {
  AttachedFile,
  ContextInfo,
} from './context.js';

// Export and history
export {
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
} from './export.js';

export type {
  ChatMessage,
  Conversation,
  ExportFormat,
} from './export.js';

// Token counting (from existing)
export { countTokens, countMessagesTokens, truncateToTokenLimit, getContextWindow, getRemainingTokens, formatTokenCount, estimateCost } from './tokens.js';
