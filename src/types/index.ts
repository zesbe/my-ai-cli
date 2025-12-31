/**
 * Core Type Definitions for Zesbe CLI
 */

// ============================================================================
// TOOL TYPES
// ============================================================================

export interface ToolParameter {
  type: string;
  description: string;
  enum?: string[];
  items?: { type: string };
}

export interface ToolFunction {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, ToolParameter>;
    required?: string[];
  };
}

export interface Tool {
  type: 'function';
  function: ToolFunction;
}

export type ToolExecutor = (args: Record<string, any>) => Promise<string | object>;

// ============================================================================
// AGENT TYPES
// ============================================================================

export interface AgentOptions {
  provider: string;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  systemPrompt?: string;
  yolo?: boolean;
  stream?: boolean;
  cwd?: string;
  maxSteps?: number; // 0 = unlimited
}

export interface AgentStats {
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  requests: number;
  toolCalls: number;
  startTime: number;
}

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  timestamp?: Date;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ChatCallbacks {
  onStart?: () => void;
  onToken?: (token: string) => void;
  onToolCall?: (toolName: string, args: Record<string, any>) => Promise<boolean>;
  onToolResult?: (toolName: string, result: string | object) => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

// ============================================================================
// PROVIDER TYPES
// ============================================================================

export interface Provider {
  name: string;
  description: string;
  baseUrl: string;
  models: ModelInfo[];
  envVar?: string;
  apiKeyFile?: string;
  free?: boolean;
}

export interface ModelInfo {
  id: string;
  description: string;
  contextWindow?: number;
  pricing?: {
    input: number;
    output: number;
  };
  recommended?: boolean;
}

// ============================================================================
// MCP TYPES
// ============================================================================

export interface MCPServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export interface MCPConfig {
  mcpServers: Record<string, MCPServerConfig>;
}

export interface MCPServer {
  name: string;
  tools: number;
  toolNames: string[];
}

export interface MCPMarketplaceServer {
  id: string;
  name: string;
  author: string;
  description: string;
  category: string;
  install: {
    command: string;
    args: string[];
    env?: Record<string, string>;
    requiresPath?: boolean;
    requiresToken?: string;
  };
  stars: number;
  official: boolean;
}

// ============================================================================
// SKILLS TYPES
// ============================================================================

export interface Skill {
  id: string;
  name: string;
  description: string;
  instructions: string;
  files: SkillFile[];
  path: string;
}

export interface SkillFile {
  name: string;
  path: string;
}

export interface SkillMetadata {
  id: string;
  path: string;
  name: string;
  description: string;
  source: 'user' | 'project';
}

// ============================================================================
// SESSION TYPES
// ============================================================================

export interface Session {
  savedAt: string;
  cwd: string;
  provider: string;
  model: string;
  history: Message[];
  stats: AgentStats;
  summary: string;
}

// ============================================================================
// TEMPLATE TYPES (Phase 3)
// ============================================================================

export interface Template {
  id: string;
  name: string;
  description: string;
  language: string;
  files: TemplateFile[];
  variables: TemplateVariable[];
}

export interface TemplateFile {
  path: string;
  content: string;
}

export interface TemplateVariable {
  name: string;
  description: string;
  default?: string;
  required: boolean;
}

// ============================================================================
// PIPING TYPES (Phase 3)
// ============================================================================

export interface PipedInput {
  content: string;
  prompt?: string;
  context?: Record<string, any>;
}

// ============================================================================
// GITHUB ACTIONS TYPES (Phase 3)
// ============================================================================

export interface GitHubContext {
  event: string;
  sha: string;
  ref: string;
  repository: string;
  actor: string;
}

export interface GitHubPRContext extends GitHubContext {
  prNumber: number;
  prTitle: string;
  prBody: string;
  files: string[];
}
