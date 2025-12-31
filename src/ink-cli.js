import React, { useState, useEffect, useRef } from 'react';
import { render, Box, Text, useInput, useApp, useStdout } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import SelectInput from 'ink-select-input';
import { PROVIDERS, getProviderList, getModelsForProvider } from './models-db.js';
import { PROVIDER_INFO, formatProviderGuide, getAllProvidersQuickRef, getFreeProviders } from './provider-info.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

const { createElement: h } = React;

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const SLASH_COMMANDS = [
  { value: '/help', label: '/help', description: 'Show all available commands' },
  { value: '/setup', label: '/setup', description: '🔑 Setup API key for provider' },
  { value: '/providers', label: '/providers', description: '📋 List all providers with pricing' },
  { value: '/model', label: '/model', description: 'Switch AI model' },
  { value: '/provider', label: '/provider', description: 'Switch AI provider' },
  { value: '/models', label: '/models', description: 'List models for current provider' },
  { value: '/apikey', label: '/apikey', description: '🔐 Set API key' },
  { value: '/free', label: '/free', description: '🆓 Show FREE providers' },
  { value: '/clear', label: '/clear', description: 'Clear conversation' },
  { value: '/yolo', label: '/yolo', description: 'Toggle auto-approve' },
  { value: '/config', label: '/config', description: 'Show configuration' },
  { value: '/exit', label: '/exit', description: 'Exit CLI' },
];

const TYPING_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const BRAIN_FRAMES = ['🧠', '💭', '💡', '✨'];

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

// Typing Indicator Component
const TypingIndicator = ({ type = 'dots' }) => {
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

// Status Bar Component
const StatusBar = ({ provider, model, tokens, responseTime, yolo }) => {
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
      yolo && h(Text, { color: 'yellow' }, '⚡ YOLO')
    ),
    h(Box, { gap: 2 },
      tokens > 0 && h(Text, { color: 'gray' }, `🎯 ${tokens} tokens`),
      responseTime && h(Text, { color: 'green' }, `⏱️ ${responseTime}`)
    )
  );
};

// Message Component with timestamp
const Message = ({ role, content, timestamp, tokens }) => {
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

// Slash Menu Component
const SlashMenu = ({ query, onSelect, onCancel }) => {
  const searchTerm = query.toLowerCase().replace('/', '');
  const filtered = SLASH_COMMANDS.filter(cmd => 
    cmd.value.includes(searchTerm) || cmd.description.toLowerCase().includes(searchTerm)
  );

  useInput((input, key) => {
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
      onSelect: (item) => onSelect(item.value),
      itemComponent: ({ isSelected, label, desc }) => 
        h(Box, null,
          h(Text, { color: isSelected ? 'cyan' : 'white', bold: isSelected }, 
            `${isSelected ? '▸ ' : '  '}${label.padEnd(15)}`),
          h(Text, { color: 'gray' }, desc)
        )
    })
  );
};

// Provider Menu
const ProviderMenu = ({ onSelect, onCancel, current }) => {
  const providers = getProviderList();
  
  useInput((input, key) => {
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
      onSelect: (item) => onSelect(item.value),
      itemComponent: ({ isSelected, label, isCurrent }) => 
        h(Text, { 
          color: isSelected ? 'magenta' : (isCurrent ? 'green' : 'white'),
          bold: isSelected 
        }, `${isSelected ? '▸ ' : '  '}${label}${isCurrent ? ' ✓' : ''}`)
    })
  );
};

// Model Menu
const ModelMenu = ({ provider, onSelect, onCancel, current }) => {
  const models = getModelsForProvider(provider);
  
  useInput((input, key) => {
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
      onSelect: (item) => onSelect(item.value),
      itemComponent: ({ isSelected, label, desc, recommended, isCurrent }) => 
        h(Box, { flexDirection: 'column' },
          h(Box, null,
            h(Text, { 
              color: isSelected ? 'blue' : (isCurrent ? 'green' : 'white'),
              bold: isSelected 
            }, `${isSelected ? '▸ ' : '  '}${label}`),
            recommended && h(Text, { color: 'yellow' }, ' ⭐'),
            isCurrent && h(Text, { color: 'green' }, ' ✓')
          ),
          h(Text, { color: 'gray', dimColor: true }, `    ${desc}`)
        )
    })
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════

const ChatApp = ({ agent, initialPrompt }) => {
  const { exit } = useApp();
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [tokenCount, setTokenCount] = useState(0);
  const [totalTokens, setTotalTokens] = useState(0);
  const [responseTime, setResponseTime] = useState(null);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [showProviderMenu, setShowProviderMenu] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const startTime = useRef(null);

  // Keyboard shortcuts
  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      console.log('\n👋 Goodbye!\n');
      exit();
    }
    if (key.ctrl && input === 'l') {
      setMessages([]);
      agent.clearHistory();
      setTotalTokens(0);
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

  const addMessage = (role, content, extra = {}) => {
    setMessages(prev => [...prev, { 
      role, 
      content, 
      timestamp: new Date().toISOString(),
      ...extra 
    }]);
  };

  const handleSubmit = async (input) => {
    if (!input.trim()) return;
    
    if (input.startsWith('/')) {
      executeCommand(input.trim());
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
      
      await agent.chat(input, {
        onStart: () => {
          setIsLoading(false);
          setIsTyping(true);
        },
        onToken: (token) => {
          if (!token.includes('<think>') && !token.includes('</think>')) {
            fullResponse += token;
            tokens++;
            setCurrentResponse(fullResponse);
            setTokenCount(tokens);
          }
        },
        onToolCall: async (tool, args) => {
          addMessage('tool', `🔧 ${tool}: ${JSON.stringify(args).substring(0, 100)}...`);
          return true;
        },
        onToolResult: (tool, result) => {
          const preview = String(result).substring(0, 100);
          addMessage('tool', `✓ ${tool} completed`);
        },
        onEnd: () => {
          const elapsed = ((Date.now() - startTime.current) / 1000).toFixed(1);
          setResponseTime(`${elapsed}s`);
          setTotalTokens(prev => prev + tokens);
          if (fullResponse) {
            addMessage('assistant', fullResponse, { tokens });
          }
          setCurrentResponse('');
          setIsLoading(false);
          setIsTyping(false);
        },
        onError: (err) => {
          addMessage('error', err.message);
          setIsLoading(false);
          setIsTyping(false);
        }
      });
    } catch (err) {
      addMessage('error', err.message);
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const executeCommand = (cmd) => {
    const [command, ...argParts] = cmd.split(' ');
    const args = argParts.join(' ');

    switch (command) {
      case '/help':
        addMessage('system', `
📚 COMMANDS:
  /setup <provider>  Setup API key
  /providers         List all providers
  /free              Show FREE providers
  /model             Change model
  /provider          Change provider
  /apikey <key>      Set API key
  /clear             Clear chat
  /yolo              Toggle auto-approve
  /config            Show config
  /exit              Exit

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
            agent.model = p.models?.[0]?.id || p.models?.[0] || agent.model;
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
            addMessage('error', e.message);
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
Tokens: ${totalTokens}`);
        break;

      case '/exit':
        console.log('\n👋 Goodbye!\n');
        exit();
        break;

      default:
        addMessage('error', `Unknown: ${command}. Type /help`);
    }
  };

  const handleProviderSelect = (id) => {
    setShowProviderMenu(false);
    const p = PROVIDERS[id];
    if (p) {
      agent.provider = id;
      agent.baseUrl = p.baseUrl;
      const firstModel = p.models?.[0];
      agent.model = typeof firstModel === 'object' ? firstModel.id : firstModel;
      addMessage('success', `Provider: ${p.name}, Model: ${agent.model}`);
    }
  };

  const handleModelSelect = (id) => {
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
      
      // Typing indicator
      isTyping && currentResponse && h(Box, { flexDirection: 'column', marginY: 1 },
        h(Box, { gap: 2 },
          h(Text, { color: 'green', bold: true }, '┌─ Assistant'),
          h(TypingIndicator, { type: 'dots' })
        ),
        h(Box, { marginLeft: 2 },
          h(Text, { color: 'white' }, currentResponse),
          h(Text, { color: 'cyan' }, '▊')
        )
      ),

      // Loading
      isLoading && h(Box, { marginY: 1 },
        h(TypingIndicator, { type: 'brain' })
      )
    ),

    // Menus
    showSlashMenu && h(SlashMenu, { 
      query, 
      onSelect: (cmd) => { setShowSlashMenu(false); setQuery(''); executeCommand(cmd); },
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
      yolo: agent.yolo
    })
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export async function startInkMode(agent, initialPrompt) {
  if (!process.stdin.isTTY) {
    console.log('\n⚠️  Ink mode requires interactive terminal.\n');
    const { startInteractiveMode } = await import('./cli.js');
    return startInteractiveMode(agent, initialPrompt);
  }
  
  render(h(ChatApp, { agent, initialPrompt }));
}
