/**
 * Token Counting Utility
 * Uses tiktoken for accurate token counting like Claude Code
 */

import { get_encoding, encoding_for_model, Tiktoken } from 'tiktoken';

// Cache encodings for performance
const encodingCache: Map<string, Tiktoken> = new Map();

// Model to encoding mapping
const MODEL_ENCODINGS: Record<string, string> = {
  // OpenAI models
  'gpt-4': 'cl100k_base',
  'gpt-4o': 'o200k_base',
  'gpt-4o-mini': 'o200k_base',
  'gpt-4-turbo': 'cl100k_base',
  'gpt-3.5-turbo': 'cl100k_base',
  // Default for other models
  'default': 'cl100k_base'
};

/**
 * Get or create encoding for a model
 */
function getEncoding(model?: string): Tiktoken {
  const encodingName = MODEL_ENCODINGS[model || 'default'] || MODEL_ENCODINGS['default'];

  if (!encodingCache.has(encodingName)) {
    try {
      const encoding = get_encoding(encodingName as any);
      encodingCache.set(encodingName, encoding);
    } catch {
      // Fallback to cl100k_base
      const encoding = get_encoding('cl100k_base');
      encodingCache.set(encodingName, encoding);
    }
  }

  return encodingCache.get(encodingName)!;
}

/**
 * Count tokens in a string
 */
export function countTokens(text: string, model?: string): number {
  if (!text) return 0;

  try {
    const encoding = getEncoding(model);
    return encoding.encode(text).length;
  } catch {
    // Fallback: rough estimate (1 token ≈ 4 chars for English)
    return Math.ceil(text.length / 4);
  }
}

/**
 * Count tokens in messages array
 */
export function countMessagesTokens(messages: Array<{ role: string; content: string }>, model?: string): number {
  let total = 0;

  for (const message of messages) {
    // Each message has overhead: role + formatting
    total += 4; // <|im_start|>role\n ... <|im_end|>
    total += countTokens(message.role, model);
    total += countTokens(message.content, model);
  }

  // Add 2 for the assistant reply priming
  total += 2;

  return total;
}

/**
 * Truncate text to fit within token limit
 */
export function truncateToTokenLimit(text: string, maxTokens: number, model?: string): string {
  const encoding = getEncoding(model);
  const tokens = encoding.encode(text);

  if (tokens.length <= maxTokens) {
    return text;
  }

  const truncatedTokens = tokens.slice(0, maxTokens);
  const decoded = encoding.decode(truncatedTokens);
  return new TextDecoder().decode(decoded);
}

/**
 * Get context window size for a model
 */
export function getContextWindow(model: string): number {
  const contextWindows: Record<string, number> = {
    // OpenAI
    'gpt-4o': 128000,
    'gpt-4o-mini': 128000,
    'gpt-4-turbo': 128000,
    'gpt-4': 8192,
    'gpt-3.5-turbo': 16385,
    // Anthropic
    'claude-3-opus': 200000,
    'claude-3-sonnet': 200000,
    'claude-3-haiku': 200000,
    'claude-3.5-sonnet': 200000,
    // GLM
    'glm-4-plus': 128000,
    'glm-4-flash': 128000,
    'glm-4-long': 1000000,
    // MiniMax
    'minimax-m2.1': 128000,
    // Gemini
    'gemini-pro': 32000,
    'gemini-1.5-pro': 1000000,
    'gemini-1.5-flash': 1000000,
    // Default
    'default': 8192
  };

  return contextWindows[model] || contextWindows['default'];
}

/**
 * Calculate remaining tokens in context
 */
export function getRemainingTokens(
  usedTokens: number,
  model: string,
  reserveForOutput: number = 4096
): number {
  const contextWindow = getContextWindow(model);
  return Math.max(0, contextWindow - usedTokens - reserveForOutput);
}

/**
 * Format token count for display
 */
export function formatTokenCount(count: number): string {
  if (count < 1000) return count.toString();
  if (count < 1000000) return `${(count / 1000).toFixed(1)}k`;
  return `${(count / 1000000).toFixed(2)}M`;
}

/**
 * Estimate cost based on tokens (rough estimates in USD)
 */
export function estimateCost(
  inputTokens: number,
  outputTokens: number,
  model: string
): { input: number; output: number; total: number } {
  // Pricing per 1M tokens (as of late 2024)
  const pricing: Record<string, { input: number; output: number }> = {
    'gpt-4o': { input: 2.5, output: 10 },
    'gpt-4o-mini': { input: 0.15, output: 0.6 },
    'gpt-4-turbo': { input: 10, output: 30 },
    'claude-3.5-sonnet': { input: 3, output: 15 },
    'claude-3-opus': { input: 15, output: 75 },
    'glm-4-plus': { input: 0.5, output: 0.5 },
    'glm-4-flash': { input: 0.01, output: 0.01 },
    'default': { input: 1, output: 2 }
  };

  const price = pricing[model] || pricing['default'];
  const inputCost = (inputTokens / 1000000) * price.input;
  const outputCost = (outputTokens / 1000000) * price.output;

  return {
    input: inputCost,
    output: outputCost,
    total: inputCost + outputCost
  };
}

// Cleanup function to free encoding resources
export function cleanup(): void {
  for (const encoding of encodingCache.values()) {
    encoding.free();
  }
  encodingCache.clear();
}
