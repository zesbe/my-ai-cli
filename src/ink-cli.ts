import React, { useState, useEffect, useRef } from 'react';
import { render, Box, Text, useInput, useApp } from 'ink';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import { PROVIDERS, getProviderList, getModelsForProvider } from './models-db.js';
import { PROVIDER_INFO, formatProviderGuide, getAllProvidersQuickRef, getFreeProviders } from './provider-info.js';
import { getMCPManager } from './mcp/client.js';
import { getSkillsManager } from './skills/manager.js';
import { POPULAR_MCP_SERVERS, searchServers, getServerById, generateInstallConfig, MARKETPLACE_LINKS } from './mcp/marketplace.js';
import fs from 'fs';
import path from 'path';
import os from 'os';
import type { Agent as AgentType } from './agent.js';

// Session helper
const SESSION_DIR = path.join(os.homedir(), '.zesbe', 'sessions');

interface SavedSession {
  name: string;
  modified: Date;
  summary: string;
}

function listSavedSessions(): SavedSession[] {
  if (!fs.existsSync(SESSION_DIR)) return [];
  try {
    return fs.readdirSync(SESSION_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const filePath = path.join(SESSION_DIR, f);
        const stat = fs.statSync(filePath);
        let summary = '';
        try {
          const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          summary = data.summary || '';
        } catch (_e) {
          // Ignore parsing errors
        }
        return { name: f.replace('.json', ''), modified: stat.mtime, summary };
      })
      .sort((a, b) => b.modified.getTime() - a.modified.getTime());
  } catch (_e) {
    return [];
  }
}

const { createElement: h } = React;

// Ink Key type for useInput
interface InkKey {
  upArrow: boolean;
  downArrow: boolean;
  leftArrow: boolean;
  rightArrow: boolean;
  pageDown: boolean;
  pageUp: boolean;
  return: boolean;
  escape: boolean;
  ctrl: boolean;
  shift: boolean;
  tab: boolean;
  backspace: boolean;
  delete: boolean;
  meta: boolean;
}

// Type definitions
interface SlashCommand {
  value: string;
  label: string;
  description: string;
}

interface MessageData {
  role: 'user' | 'assistant' | 'system' | 'tool' | 'error' | 'success';
  content: string;
  timestamp?: string;
  tokens?: number;
}

interface SelectItem {
  label: string;
  value: string;
  desc?: string;
  isCurrent?: boolean;
  recommended?: boolean;
}

// Constants
const SLASH_COMMANDS: SlashCommand[] = [
  { value: '/help', label: '/help', description: 'Show all available commands' },
  { value: '/setup', label: '/setup', description: '🔑 Setup API key for provider' },
  { value: '/providers', label: '/providers', description: '📋 List all providers with pricing' },
  { value: '/model', label: '/model', description: 'Switch AI model' },
  { value: '/provider', label: '/provider', description: 'Switch AI provider' },
  { value: '/apikey', label: '/apikey', description: '🔐 Set API key' },
  { value: '/free', label: '/free', description: '🆓 Show FREE providers' },
  { value: '/clear', label: '/clear', description: 'Clear conversation' },
  { value: '/save', label: '/save', description: '💾 Save session' },
  { value: '/load', label: '/load', description: '📂 Load session' },
  { value: '/resume', label: '/resume', description: '♻️ Resume last session' },
  { value: '/sessions', label: '/sessions', description: '📚 List saved sessions' },
  { value: '/stats', label: '/stats', description: '📊 Session statistics' },
  { value: '/context', label: '/context', description: '📄 Show project context' },
  { value: '/yolo', label: '/yolo', description: 'Toggle auto-approve' },
  { value: '/config', label: '/config', description: 'Show configuration' },
  { value: '/skills', label: '/skills', description: '📚 Skills management' },
  { value: '/mcp', label: '/mcp', description: '🔌 MCP server management' },
  { value: '/exit', label: '/exit', description: 'Exit CLI' },
];

const TYPING_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const BRAIN_FRAMES = ['🧠', '💭', '💡', '✨'];
const ASSESS_FRAMES = ['◐', '◓', '◑', '◒'];

// Components
interface AssessingIndicatorProps {
  agentName?: string;
}

const AssessingIndicator: React.FC<AssessingIndicatorProps> = ({ agentName = 'Zesbe' }) => {
  const [frame, setFrame] = useState(0);
  const [dots, setDots] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame(f => (f + 1) % ASSESS_FRAMES.length);
      setDots(d => d.length >= 3 ? '' : d + '.');
    }, 200);
    return () => clearInterval(timer);
  }, []);

  return h(Box, {
    justifyContent: 'center',
    marginY: 1,
    paddingX: 2
  },
    h(Text, { color: 'yellow' }, ASSESS_FRAMES[frame]),
    h(Text, { color: 'gray' }, ` ${agentName} is assessing${dots}`),
    h(Text, { color: 'gray', dimColor: true }, '  (esc to interrupt)')
  );
};

interface TypingIndicatorProps {
  type?: 'dots' | 'brain';
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ type = 'dots' }) => {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame(f => (f + 1) % (type === 'brain' ? BRAIN_FRAMES.length : TYPING_FRAMES.length));
    }, 120);
    return () => clearInterval(timer);
  }, [type]);

  if (type === 'brain') {
    return h(Text, { color: 'cyan' }, `${BRAIN_FRAMES[frame]} AI is thinking...`);
  }

  return h(Box, null,
    h(Text, { color: 'cyan' }, TYPING_FRAMES[frame]),
    h(Text, { color: 'gray' }, ' AI is typing...')
  );
};

interface StatusBarProps {
  provider: string;
  model: string;
  tokens: number;
  responseTime: string | null;
  yolo: boolean;
  skillsCount: number;
}

const StatusBar: React.FC<StatusBarProps> = ({ provider, model, tokens, responseTime, yolo, skillsCount }) => {
  const providerName = PROVIDERS[provider]?.name || provider;

  return h(Box, {
    borderStyle: 'single',
    borderColor: 'gray',
    paddingX: 1,
    justifyContent: 'space-between',
    marginTop: 1
  },
    h(Box, { gap: 2 },
      h(Text, { color: 'cyan', bold: true }, `🤖 ${providerName}`),
      h(Text, { color: 'magenta' }, `📦 ${model}`),
      skillsCount > 0 && h(Text, { color: 'blue', bold: true }, `📚 ${skillsCount} skill${skillsCount > 1 ? 's' : ''}`),
      yolo && h(Text, { color: 'yellow' }, '⚡ YOLO')
    ),
    h(Box, { gap: 2 },
      tokens > 0 && h(Text, { color: 'gray' }, `🎯 ${tokens} tokens`),
      responseTime && h(Text, { color: 'green' }, `⏱️ ${responseTime}`)
    )
  );
};

interface MessageProps extends MessageData {}

const Message: React.FC<MessageProps> = ({ role, content, timestamp, tokens }) => {
  const time = timestamp ? new Date(timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';

  if (role === 'user') {
    return h(Box, { flexDirection: 'column', marginY: 1 },
      h(Box, { gap: 2 },
        h(Text, { color: 'cyan', bold: true }, '┌─ You'),
        h(Text, { color: 'gray', dimColor: true }, time)
      ),
      h(Box, { marginLeft: 2 },
        h(Text, null, content)
      )
    );
  }

  if (role === 'assistant') {
    return h(Box, { flexDirection: 'column', marginY: 1 },
      h(Box, { gap: 2 },
        h(Text, { color: 'green', bold: true }, '┌─ Assistant'),
        h(Text, { color: 'gray', dimColor: true }, time),
        tokens && h(Text, { color: 'gray', dimColor: true }, `(${tokens} tokens)`)
      ),
      h(Box, { marginLeft: 2 },
        h(Text, { color: 'white' }, content)
      )
    );
  }

  if (role === 'system') {
    return h(Box, { marginY: 1, marginLeft: 2 },
      h(Text, { color: 'gray' }, content)
    );
  }

  if (role === 'tool') {
    return h(Box, { marginLeft: 2 },
      h(Text, { color: 'yellow' }, content)
    );
  }

  if (role === 'error') {
    return h(Box, { marginY: 1 },
      h(Text, { color: 'red', bold: true }, `❌ ${content}`)
    );
  }

  if (role === 'success') {
    return h(Box, { marginY: 1 },
      h(Text, { color: 'green', bold: true }, `✅ ${content}`)
    );
  }

  return null;
};

interface SlashMenuProps {
  query: string;
  onSelect: (value: string) => void;
  onCancel: () => void;
}

const SlashMenu: React.FC<SlashMenuProps> = ({ query, onSelect, onCancel }) => {
  const searchTerm = query.toLowerCase().replace('/', '');
  const filtered = SLASH_COMMANDS.filter(cmd =>
    cmd.value.includes(searchTerm) || cmd.description.toLowerCase().includes(searchTerm)
  );

  useInput((_input: string, key: InkKey) => {
    if (key.escape) onCancel();
  });

  if (filtered.length === 0) return null;

  return h(Box, {
    flexDirection: 'column',
    borderStyle: 'round',
    borderColor: 'cyan',
    paddingX: 1,
    marginTop: 1
  },
    h(Text, { color: 'cyan', bold: true }, '📋 Commands:'),
    h(SelectInput, {
      items: filtered.map(c => ({ label: c.value, value: c.value, desc: c.description })),
      onSelect: (item: any) => onSelect(item.value),
      itemComponent: ({ isSelected, label, desc }: any) =>
        h(Box, null,
          h(Text, { color: isSelected ? 'cyan' : 'white', bold: isSelected },
            `${isSelected ? '▸ ' : '  '}${label.padEnd(15)}`),
          h(Text, { color: 'gray' }, desc || '')
        )
    } as any)
  );
};

interface ProviderMenuProps {
  onSelect: (value: string) => void;
  onCancel: () => void;
  current: string;
}

const ProviderMenu: React.FC<ProviderMenuProps> = ({ onSelect, onCancel, current }) => {
  const providers = getProviderList();

  useInput((_input: string, key: InkKey) => {
    if (key.escape) onCancel();
  });

  return h(Box, {
    flexDirection: 'column',
    borderStyle: 'round',
    borderColor: 'magenta',
    paddingX: 1
  },
    h(Text, { color: 'magenta', bold: true }, '🔌 Select Provider:'),
    h(SelectInput, {
      items: providers.map(p => ({
        label: p.name,
        value: p.id,
        isCurrent: p.id === current
      })),
      onSelect: (item: any) => onSelect(item.value),
      itemComponent: ({ isSelected, label, isCurrent }: any) =>
        h(Text, {
          color: isSelected ? 'magenta' : (isCurrent ? 'green' : 'white'),
          bold: isSelected
        }, `${isSelected ? '▸ ' : '  '}${label}${isCurrent ? ' ✓' : ''}`)
    } as any)
  );
};

interface ModelMenuProps {
  provider: string;
  onSelect: (value: string) => void;
  onCancel: () => void;
  current: string;
}

const ModelMenu: React.FC<ModelMenuProps> = ({ provider, onSelect, onCancel, current }) => {
  const models = getModelsForProvider(provider);

  useInput((_input: string, key: InkKey) => {
    if (key.escape) onCancel();
  });

  return h(Box, {
    flexDirection: 'column',
    borderStyle: 'round',
    borderColor: 'blue',
    paddingX: 1
  },
    h(Text, { color: 'blue', bold: true }, `🤖 Models for ${PROVIDERS[provider]?.name}:`),
    h(SelectInput, {
      items: models.map(m => ({
        label: m.name,
        value: m.id,
        desc: m.description,
        recommended: m.recommended,
        isCurrent: m.id === current
      })),
      onSelect: (item: any) => onSelect(item.value),
      itemComponent: ({ isSelected, label, desc, recommended, isCurrent }: any) =>
        h(Box, { flexDirection: 'column' },
          h(Box, null,
            h(Text, {
              color: isSelected ? 'blue' : (isCurrent ? 'green' : 'white'),
              bold: isSelected
            }, `${isSelected ? '▸ ' : '  '}${label}`),
            recommended && h(Text, { color: 'yellow' }, ' ⭐'),
            isCurrent && h(Text, { color: 'green' }, ' ✓')
          ),
          h(Text, { color: 'gray', dimColor: true }, `    ${desc || ''}`)
        )
    } as any)
  );
};

// Main App
interface ChatAppProps {
  agent: AgentType;
  initialPrompt?: string;
}

const ChatApp: React.FC<ChatAppProps> = ({ agent, initialPrompt }) => {
  const { exit } = useApp();
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [_tokenCount, setTokenCount] = useState(0);
  const [totalTokens, setTotalTokens] = useState(0);
  const [responseTime, setResponseTime] = useState<string | null>(null);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [showProviderMenu, setShowProviderMenu] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [loadedSkillsCount, setLoadedSkillsCount] = useState(0);
  const startTime = useRef<number | null>(null);

  // Buffered response for smoother rendering (reduce flicker)
  const responseBuffer = useRef('');
  const tokenBuffer = useRef(0);
  const updateTimer = useRef<NodeJS.Timeout | null>(null);

  // Abort controller for interrupting requests
  const abortController = useRef<AbortController | null>(null);

  // Keyboard shortcuts
  useInput((input: string, key: InkKey) => {
    if (key.ctrl && input === 'c') {
      console.log('\n👋 Goodbye!\n');
      exit();
    }
    if (key.ctrl && input === 'l') {
      setMessages([]);
      agent.clearHistory();
      setTotalTokens(0);
    }
    // ESC to interrupt
    if (key.escape && (isLoading || isTyping)) {
      if (abortController.current) {
        abortController.current.abort();
      }
      setIsLoading(false);
      setIsTyping(false);
      setCurrentResponse('');
      addMessage('system', '⚠️ Interrupted by user');
    }
  });

  useEffect(() => {
    if (initialPrompt) {
      setTimeout(() => handleSubmit(initialPrompt), 100);
    }
  }, []);

  useEffect(() => {
    setShowSlashMenu(query.startsWith('/') && !showProviderMenu && !showModelMenu);
  }, [query, showProviderMenu, showModelMenu]);

  const addMessage = (role: MessageData['role'], content: string, extra: Partial<MessageData> = {}): void => {
    setMessages(prev => [...prev, {
      role,
      content,
      timestamp: new Date().toISOString(),
      ...extra
    }]);
  };

  const handleSubmit = async (input: string): Promise<void> => {
    if (!input.trim()) return;

    if (input.startsWith('/')) {
      await executeCommand(input.trim());
      setQuery('');
      return;
    }

    setShowSlashMenu(false);
    addMessage('user', input);
    setQuery('');
    setIsLoading(true);
    setIsTyping(false);
    setCurrentResponse('');
    setTokenCount(0);
    startTime.current = Date.now();

    try {
      let fullResponse = '';
      let tokens = 0;

      // Reset buffers
      responseBuffer.current = '';
      tokenBuffer.current = 0;

      // Flush buffer to UI (throttled updates reduce flicker)
      const flushBuffer = (): void => {
        if (responseBuffer.current) {
          setCurrentResponse(responseBuffer.current);
          setTokenCount(tokenBuffer.current);
        }
      };

      await agent.chat(input, {
        onStart: () => {
          setIsLoading(false);
          setIsTyping(true);
        },
        onToken: (token: string) => {
          if (!token.includes('<think>') && !token.includes('</think>')) {
            fullResponse += token;
            tokens++;

            // Buffer tokens, update UI every 80ms (reduces flicker)
            responseBuffer.current = fullResponse;
            tokenBuffer.current = tokens;

            if (!updateTimer.current) {
              updateTimer.current = setTimeout(() => {
                flushBuffer();
                updateTimer.current = null;
              }, 80);
            }
          }
        },
        onToolCall: async (tool: string, args: Record<string, unknown>) => {
          // Flush before tool call
          if (updateTimer.current) {
            clearTimeout(updateTimer.current);
            updateTimer.current = null;
          }
          flushBuffer();
          addMessage('tool', `🔧 ${tool}: ${JSON.stringify(args).substring(0, 100)}...`);
          return true;
        },
        onToolResult: (tool: string, _result: unknown) => {
          addMessage('tool', `✓ ${tool} completed`);
        },
        onEnd: () => {
          // Clear timer and final flush
          if (updateTimer.current) {
            clearTimeout(updateTimer.current);
            updateTimer.current = null;
          }

          const elapsed = ((Date.now() - (startTime.current || Date.now())) / 1000).toFixed(1);
          setResponseTime(`${elapsed}s`);
          setTotalTokens(prev => prev + tokens);
          if (fullResponse) {
            addMessage('assistant', fullResponse, { tokens });
          }
          setCurrentResponse('');
          setIsLoading(false);
          setIsTyping(false);
        },
        onError: (err: Error) => {
          if (updateTimer.current) {
            clearTimeout(updateTimer.current);
            updateTimer.current = null;
          }
          addMessage('error', err.message);
          setIsLoading(false);
          setIsTyping(false);
        }
      });
    } catch (err) {
      const error = err as Error;
      addMessage('error', error.message);
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const executeCommand = async (cmd: string): Promise<void> => {
    const [command, ...argParts] = cmd.split(' ');
    const args = argParts.join(' ');

    switch (command) {
      case '/help':
        addMessage('system', `
📚 COMMANDS:

🔌 PROVIDER:
  /setup <name>    Setup API key with guide
  /providers       List all providers
  /provider        Switch provider
  /model           Switch model
  /apikey <key>    Set API key
  /free            Show FREE providers

💬 CHAT:
  /clear           Clear conversation
  /yolo            Toggle auto-approve
  /stats           Session statistics
  /context         Show project context
  /config          Show configuration

💾 SESSION (Memory):
  /save [name]     Save current session
  /load [name]     Load saved session
  /resume          Resume last session
  /sessions        List all saved sessions

🛠️ TOOLS (AI can use):
  bash, read, write, edit, glob, grep, web_fetch
  + MCP tools from connected servers

🔌 MCP (Model Context Protocol):
  /mcp              List connected servers
  /mcp connect      Connect to configured servers
  /mcp disconnect   Disconnect all
  /mcp tools        List MCP tools
  /mcp browse       Browse popular MCP servers 🆕
  /mcp search <q>   Search MCP servers 🆕
  /mcp install <id> Install MCP server 🆕
  /mcp marketplace  View online marketplaces 🆕

📚 SKILLS:
  /skills           List available skills
  /skills load <id> Load a skill
  /skills create    Create new skill

📄 PROJECT CONTEXT:
  Create ZESBE.md in project root for custom instructions

⌨️ SHORTCUTS:
  Ctrl+C  Exit
  Ctrl+L  Clear screen
  ESC     Close menus
        `);
        break;

      case '/clear':
        setMessages([]);
        agent.clearHistory();
        setTotalTokens(0);
        setResponseTime(null);
        addMessage('success', 'Conversation cleared');
        break;

      case '/model':
        if (args) {
          agent.model = args;
          addMessage('success', `Model: ${args}`);
        } else {
          setShowModelMenu(true);
        }
        break;

      case '/provider':
        if (args) {
          const p = PROVIDERS[args];
          if (p) {
            agent.provider = args;
            agent.baseUrl = p.baseUrl;
            agent.model = p.models?.[0]?.id || agent.model;
            addMessage('success', `Provider: ${p.name}, Model: ${agent.model}`);
          }
        } else {
          setShowProviderMenu(true);
        }
        break;

      case '/providers':
        addMessage('system', getAllProvidersQuickRef());
        break;

      case '/free':
        const free = getFreeProviders();
        addMessage('system', `🆓 FREE PROVIDERS:\n${free.map(p =>
          `• ${p.name}: ${p.signupUrl}`
        ).join('\n')}`);
        break;

      case '/setup':
        if (args) {
          const guide = formatProviderGuide(args);
          addMessage('system', guide || `Provider "${args}" not found`);
        } else {
          addMessage('system', 'Usage: /setup <provider>\nExample: /setup gemini');
        }
        break;

      case '/apikey':
        const info = PROVIDER_INFO[agent.provider];
        if (args && info) {
          const keyFile = path.join(os.homedir(), `.${agent.provider}_api_key`);
          try {
            fs.writeFileSync(keyFile, args.trim());
            fs.chmodSync(keyFile, 0o600);
            agent.apiKey = args.trim();
            addMessage('success', `API key saved for ${info.name}`);
          } catch (e) {
            const error = e as Error;
            addMessage('error', error.message);
          }
        } else if (info) {
          addMessage('system', `🔐 Set API key:\n/apikey YOUR_KEY\n\nGet key: ${info.apiKeyUrl}`);
        }
        break;

      case '/yolo':
        agent.yolo = !agent.yolo;
        addMessage('success', `Auto-approve: ${agent.yolo ? 'ON ⚡' : 'OFF'}`);
        break;

      case '/config':
        addMessage('system', `⚙️ CONFIG:
Provider: ${PROVIDERS[agent.provider]?.name || agent.provider}
Model: ${agent.model}
YOLO: ${agent.yolo ? 'ON' : 'OFF'}
Tokens: ${totalTokens}
Project Context: ${agent.projectContext ? agent.projectContext.file : 'None'}`);
        break;

      case '/stats':
        const uptime = Math.floor((Date.now() - agent.stats.startTime) / 1000);
        const mins = Math.floor(uptime / 60);
        const secs = uptime % 60;
        addMessage('system', `📊 SESSION STATS:
├─ Requests: ${agent.stats.requests}
├─ Tool Calls: ${agent.stats.toolCalls}
├─ Total Tokens: ${agent.stats.totalTokens}
├─ Uptime: ${mins}m ${secs}s
├─ Provider: ${PROVIDERS[agent.provider]?.name}
├─ Model: ${agent.model}
└─ Project: ${agent.projectContext?.file || 'No context file'}`);
        break;

      case '/context':
        if (agent.projectContext) {
          addMessage('system', `📄 PROJECT CONTEXT (${agent.projectContext.file}):\n\n${agent.projectContext.content.substring(0, 500)}${agent.projectContext.content.length > 500 ? '...' : ''}`);
        } else {
          addMessage('system', `📄 No project context file found.

Create one of these files in your project root:
• ZESBE.md - Custom instructions for this CLI
• CLAUDE.md - Compatible with Claude Code
• GEMINI.md - Compatible with Gemini CLI
• AI.md - Generic AI context`);
        }
        break;

      case '/save':
        const saveName = args || 'last';
        const saveResult = agent.saveSession(saveName);
        if (saveResult.success) {
          addMessage('success', `Session saved: ${saveName}\nPath: ${saveResult.path}`);
        } else {
          addMessage('error', `Save failed: ${saveResult.error}`);
        }
        break;

      case '/load':
        const loadName = args || 'last';
        const loadResult = agent.loadSession(loadName);
        if (loadResult.success) {
          addMessage('success', `Session loaded: ${loadName}
📅 Saved: ${new Date(loadResult.savedAt || '').toLocaleString()}
💬 Messages: ${loadResult.messageCount}
📝 Summary: ${loadResult.summary}`);
        } else {
          addMessage('error', `Load failed: ${loadResult.error}`);
        }
        break;

      case '/resume':
        const resumeResult = agent.loadSession('last');
        if (resumeResult.success) {
          addMessage('success', `♻️ Session resumed!
📅 From: ${new Date(resumeResult.savedAt || '').toLocaleString()}
💬 Messages: ${resumeResult.messageCount}
📝 ${resumeResult.summary}`);
        } else {
          addMessage('system', `No previous session found. Start a new conversation!`);
        }
        break;

      case '/sessions':
        const sessions = listSavedSessions();
        if (sessions.length === 0) {
          addMessage('system', 'No saved sessions found.\nUse /save to save current session.');
        } else {
          const list = sessions.slice(0, 10).map(s =>
            `• ${s.name} (${new Date(s.modified).toLocaleDateString()})\n  ${s.summary}`
          ).join('\n');
          addMessage('system', `📚 SAVED SESSIONS:\n\n${list}\n\nUse /load <name> to load a session`);
        }
        break;

      case '/skills':
        const skillsManager = getSkillsManager();
        const skillCmd = args.split(' ')[0];
        const skillArgs = args.split(' ').slice(1).join(' ');

        if (skillCmd === 'list' || !skillCmd) {
          skillsManager.scanSkills();
          const available = skillsManager.getAvailableSkills();
          const loaded = skillsManager.getLoadedSkills();

          if (available.length === 0) {
            addMessage('system', `📚 SKILLS: No skills found.

Create a skill:
  /skills create <name>

Skills directories:
  ~/.zesbe/skills/     (user skills)
  .skills/             (project skills)

Each skill needs a SKILL.md file with:
---
name: My Skill
description: What it does
---

Instructions for AI...`);
          } else {
            const list = available.map(s => {
              const isLoaded = loaded.find(l => l.id === s.id);
              return `${isLoaded ? '✅' : '⬚'} ${s.id} - ${s.description || s.name}\n   (${s.source})`;
            }).join('\n');
            addMessage('system', `📚 SKILLS:\n\n${list}\n\n/skills load <id> to load\n/skills unload <id> to unload`);
          }
        } else if (skillCmd === 'load' && skillArgs) {
          const result = skillsManager.loadSkill(skillArgs);
          if (result.success) {
            agent.refreshSystemPrompt();
            setLoadedSkillsCount(skillsManager.getLoadedSkills().length);
            if (result.alreadyLoaded) {
              addMessage('system', `Skill "${skillArgs}" already loaded`);
            } else {
              addMessage('success', `✅ Loaded skill: ${result.skill?.name}\n${result.skill?.description}\n\n💡 The AI can now use this skill! Try asking:\n"${result.skill?.name} help me with..."`);
            }
          } else {
            addMessage('error', `Failed to load skill: ${result.error}`);
          }
        } else if (skillCmd === 'unload' && skillArgs) {
          if (skillsManager.unloadSkill(skillArgs)) {
            agent.refreshSystemPrompt();
            setLoadedSkillsCount(skillsManager.getLoadedSkills().length);
            addMessage('success', `Unloaded skill: ${skillArgs}`);
          } else {
            addMessage('error', `Skill "${skillArgs}" is not loaded`);
          }
        } else if (skillCmd === 'create' && skillArgs) {
          const result = skillsManager.createSkillTemplate(skillArgs);
          if (result.success) {
            addMessage('success', `✅ Created skill template: ${skillArgs}\nPath: ${result.path}\n\nEdit SKILL.md to customize.`);
          } else {
            addMessage('error', `Failed to create skill: ${result.error}`);
          }
        } else if (skillCmd === 'loaded') {
          const loaded = skillsManager.getLoadedSkills();
          if (loaded.length === 0) {
            addMessage('system', 'No skills currently loaded. Use /skills load <id>');
          } else {
            const list = loaded.map(s => `• ${s.name}: ${s.description}`).join('\n');
            addMessage('system', `📚 LOADED SKILLS:\n\n${list}`);
          }
        } else if (skillCmd === 'refresh') {
          skillsManager.scanSkills();
          addMessage('success', `Rescanned skills directories`);
        } else {
          addMessage('system', `📚 SKILLS Commands:
  /skills              List available skills
  /skills load <id>    Load a skill
  /skills unload <id>  Unload a skill
  /skills loaded       Show loaded skills
  /skills create <id>  Create new skill template
  /skills refresh      Rescan skills directories

Skills directories:
  ~/.zesbe/skills/     (user skills)
  .skills/             (project skills)`);
        }
        break;

      case '/mcp':
        const mcpManager = getMCPManager();
        const mcpCmd = args.split(' ')[0];
        const mcpArgs = args.split(' ').slice(1).join(' ');

        if (mcpCmd === 'list' || !mcpCmd) {
          const servers = mcpManager.listServers();
          if (servers.length === 0) {
            addMessage('system', `🔌 MCP: No servers connected.

To configure MCP servers, edit:
~/.zesbe/mcp.json

Example config:
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "~/"]
    }
  }
}

Then run: /mcp connect`);
          } else {
            const list = servers.map(s =>
              `• ${s.name} (${s.tools} tools)\n  ${s.toolNames.join(', ')}`
            ).join('\n');
            addMessage('system', `🔌 MCP SERVERS:\n\n${list}`);
          }
        } else if (mcpCmd === 'connect') {
          addMessage('system', '🔌 Connecting to MCP servers...');
          const results = await mcpManager.connectAll();
          const summary = results.map(r =>
            r.success ? `✅ ${r.name}: ${r.tools?.length || 0} tools` : `❌ ${r.name}: ${r.error}`
          ).join('\n');
          addMessage('system', `MCP Connection Results:\n${summary || 'No servers configured'}`);
        } else if (mcpCmd === 'disconnect') {
          await mcpManager.disconnectAll();
          addMessage('success', 'Disconnected from all MCP servers');
        } else if (mcpCmd === 'tools') {
          const tools = mcpManager.getToolsForAI();
          if (tools.length === 0) {
            addMessage('system', 'No MCP tools available. Run /mcp connect first.');
          } else {
            const list = tools.map(t => `• ${t.function.name}`).join('\n');
            addMessage('system', `🔧 MCP TOOLS:\n\n${list}`);
          }
        } else if (mcpCmd === 'browse') {
          const list = POPULAR_MCP_SERVERS.slice(0, 10).map(s =>
            `${s.official ? '⭐' : '•'} ${s.id} - ${s.name} by ${s.author}\n   ${s.description}\n   Category: ${s.category} | ⭐ ${s.stars} stars`
          ).join('\n\n');
          addMessage('system', `🏪 POPULAR MCP SERVERS (Curated List):\n\n${list}\n\n📦 QUICK INSTALL:\n  /mcp install playwright    # Browser automation\n  /mcp install github        # GitHub integration\n  /mcp install filesystem    # File operations\n\n🔍 MORE OPTIONS:\n  /mcp search <query>        # Search servers\n  /mcp marketplace           # External marketplaces`);
        } else if (mcpCmd === 'search') {
          if (!mcpArgs) {
            addMessage('system', 'Usage: /mcp search <query>\n\nExample: /mcp search database');
            break;
          }
          const results = searchServers(mcpArgs);
          if (results.length === 0) {
            addMessage('system', `No servers found for "${mcpArgs}"`);
          } else {
            const list = results.slice(0, 8).map(s =>
              `${s.official ? '⭐' : '•'} ${s.id} - ${s.name}\n   ${s.description}`
            ).join('\n\n');
            addMessage('system', `🔍 SEARCH RESULTS (${results.length}):\n\n${list}\n\nUse /mcp install <id> to add`);
          }
        } else if (mcpCmd === 'install') {
          if (!mcpArgs) {
            addMessage('system', 'Usage: /mcp install <server-id>\n\nExample: /mcp install filesystem\n\nSee /mcp browse for available servers');
            break;
          }
          const server = getServerById(mcpArgs);
          if (!server) {
            addMessage('error', `Server "${mcpArgs}" not found. Use /mcp browse to see available servers.`);
            break;
          }

          addMessage('system', `📦 Installing: ${server.name}\n${server.description}\n`);

          // Check if requires path or token
          if (server.install.requiresPath) {
            addMessage('system', `⚠️ This server requires a PATH parameter.\n\nExample installation in mcp.json:\n{\n  "mcpServers": {\n    "${server.id}": {\n      "command": "${server.install.command}",\n      "args": ${JSON.stringify(server.install.args).replace('{PATH}', '"/path/to/directory"')}\n    }\n  }\n}\n\nEdit ~/.zesbe/mcp.json then run /mcp connect`);
          } else if (server.install.requiresToken) {
            addMessage('system', `⚠️ This server requires: ${server.install.requiresToken}\n\nExample installation in mcp.json:\n{\n  "mcpServers": {\n    "${server.id}": {\n      "command": "${server.install.command}",\n      "args": ${JSON.stringify(server.install.args)},\n      "env": ${JSON.stringify(server.install.env, null, 2).replace('{TOKEN}', '"your-token-here"')}\n    }\n  }\n}\n\nEdit ~/.zesbe/mcp.json then run /mcp connect`);
          } else {
            // Auto-install (no requirements)
            const config = mcpManager.loadConfig();
            config.mcpServers[server.id] = generateInstallConfig(server);
            mcpManager.saveConfig(config);
            addMessage('success', `✅ ${server.name} added to config!\n\nRun /mcp connect to activate`);
          }
        } else if (mcpCmd === 'marketplace') {
          const list = MARKETPLACE_LINKS.map(m =>
            `${m.icon} ${m.name}\n   ${m.description}\n   ${m.url}`
          ).join('\n\n');
          addMessage('system', `🏪 MCP MARKETPLACES:\n\n${list}\n\nBrowse thousands more servers online!\n\n💡 To install servers from our curated list:\n  /mcp browse        # See popular servers\n  /mcp install <id>  # Install directly`);
        } else {
          addMessage('system', `🔌 MCP Commands:
  /mcp              List connected servers
  /mcp connect      Connect to all configured servers
  /mcp disconnect   Disconnect from all servers
  /mcp tools        List available MCP tools
  /mcp browse       Browse popular MCP servers
  /mcp search <q>   Search MCP servers
  /mcp install <id> Install an MCP server
  /mcp marketplace  View online marketplaces

Config file: ~/.zesbe/mcp.json`);
        }
        break;

      case '/exit':
        // Auto-save on exit
        agent.saveSession('last');
        console.log('\n👋 Goodbye! Session auto-saved.\n');
        exit();
        break;

      default:
        addMessage('error', `Unknown: ${command}. Type /help`);
    }
  };

  const handleProviderSelect = (id: string): void => {
    setShowProviderMenu(false);
    const p = PROVIDERS[id];
    if (p) {
      agent.provider = id;
      agent.baseUrl = p.baseUrl;

      // Load API key for new provider
      const keyFile = path.join(os.homedir(), p.apiKeyFile || `.${id}_api_key`);
      if (fs.existsSync(keyFile)) {
        try {
          agent.apiKey = fs.readFileSync(keyFile, 'utf-8').trim();
        } catch (_e) {
          // Ignore read errors
        }
      }

      const firstModel = p.models?.[0];
      agent.model = typeof firstModel === 'object' ? firstModel.id : firstModel;
      addMessage('success', `Provider: ${p.name}, Model: ${agent.model}`);
    }
  };

  const handleModelSelect = (id: string): void => {
    setShowModelMenu(false);
    agent.model = id;
    addMessage('success', `Model: ${id}`);
  };

  // Render
  return h(Box, { flexDirection: 'column', padding: 1 },
    // Header
    h(Box, { marginBottom: 1 },
      h(Text, { color: 'cyan', bold: true }, '╭─────────────────────────────────────────────────────────────╮'),
    ),
    h(Box, { marginBottom: 1, paddingX: 1 },
      h(Text, { color: 'cyan', bold: true }, '│ '),
      h(Text, { color: 'white', bold: true }, '🚀 My AI CLI'),
      h(Text, { color: 'gray' }, ` • ${PROVIDERS[agent.provider]?.name || agent.provider}`),
      h(Text, { color: 'magenta' }, ` • ${agent.model}`),
      agent.yolo && h(Text, { color: 'yellow' }, ' ⚡'),
      h(Text, { color: 'cyan', bold: true }, '                    │'),
    ),
    h(Box, { marginBottom: 1 },
      h(Text, { color: 'cyan', bold: true }, '╰─────────────────────────────────────────────────────────────╯'),
    ),

    // Messages
    h(Box, { flexDirection: 'column', marginBottom: 1 },
      ...messages.slice(-15).map((msg, i) =>
        h(Message, { key: `${i}-${msg.role}`, ...msg })
      ),

      // Assessing indicator (before AI responds)
      isLoading && h(AssessingIndicator, { agentName: 'Zesbe' }),

      // Typing indicator (while AI is responding)
      isTyping && currentResponse && h(Box, { flexDirection: 'column', marginY: 1 },
        h(Box, { gap: 2 },
          h(Text, { color: 'green', bold: true }, '┌─ Assistant'),
          h(TypingIndicator, { type: 'dots' })
        ),
        h(Box, { marginLeft: 2 },
          h(Text, { color: 'white' }, currentResponse),
          h(Text, { color: 'cyan' }, '▊')
        )
      )
    ),

    // Menus
    showSlashMenu && h(SlashMenu, {
      query,
      onSelect: (cmd: string) => { setShowSlashMenu(false); setQuery(''); executeCommand(cmd); },
      onCancel: () => setShowSlashMenu(false)
    }),
    showProviderMenu && h(ProviderMenu, {
      onSelect: handleProviderSelect,
      onCancel: () => setShowProviderMenu(false),
      current: agent.provider
    }),
    showModelMenu && h(ModelMenu, {
      provider: agent.provider,
      onSelect: handleModelSelect,
      onCancel: () => setShowModelMenu(false),
      current: agent.model
    }),

    // Input
    h(Box, { flexDirection: 'column' },
      h(Text, { color: 'gray' }, '─'.repeat(60)),
      h(Box, null,
        h(Text, { color: 'cyan', bold: true }, '❯ '),
        h(TextInput, {
          value: query,
          onChange: setQuery,
          onSubmit: handleSubmit,
          placeholder: 'Type message or / for commands...'
        })
      )
    ),

    // Status Bar
    h(StatusBar, {
      provider: agent.provider,
      model: agent.model,
      tokens: totalTokens,
      responseTime,
      yolo: agent.yolo,
      skillsCount: loadedSkillsCount
    })
  );
};

// Export
export async function startInkMode(agent: AgentType, initialPrompt?: string): Promise<void> {
  if (!process.stdin.isTTY) {
    console.log('\n⚠️  Ink mode requires interactive terminal.\n');
    const { startInteractiveMode } = await import('./cli.js');
    return startInteractiveMode(agent, initialPrompt);
  }

  render(h(ChatApp, { agent, initialPrompt }));
}
