import React, { useState, useEffect } from 'react';
import { render, Box, Text, useInput, useApp } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import SelectInput from 'ink-select-input';
import { PROVIDERS, getProviderList, getModelsForProvider, getAllModels, searchModels } from './models-db.js';
import { PROVIDER_INFO, formatProviderGuide, getAllProvidersQuickRef, getFreeProviders } from './provider-info.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

const { createElement: h } = React;

// ═══════════════════════════════════════════════════════════════════════════
// SLASH COMMANDS - ENTERPRISE GRADE
// ═══════════════════════════════════════════════════════════════════════════

const SLASH_COMMANDS = [
  { value: '/help', label: '/help', description: 'Show all available commands and usage guide' },
  { value: '/setup', label: '/setup', description: '🔑 Setup API key for a provider - User friendly guide' },
  { value: '/providers', label: '/providers', description: '📋 List all providers with pricing & free tiers' },
  { value: '/model', label: '/model', description: 'Switch AI model - Interactive selection menu' },
  { value: '/provider', label: '/provider', description: 'Switch AI provider (OpenAI, Claude, Gemini, etc.)' },
  { value: '/models', label: '/models', description: 'List all available models for current provider' },
  { value: '/apikey', label: '/apikey', description: '🔐 Set/update API key for current provider' },
  { value: '/free', label: '/free', description: '🆓 Show providers with FREE tier (Gemini, Groq, etc.)' },
  { value: '/clear', label: '/clear', description: 'Clear conversation history and free up context' },
  { value: '/compact', label: '/compact', description: 'Summarize and compact conversation history' },
  { value: '/yolo', label: '/yolo', description: 'Toggle auto-approve mode (bypass tool permissions)' },
  { value: '/tools', label: '/tools', description: 'List all available tools with descriptions' },
  { value: '/context', label: '/context', description: 'Show context usage, token count, and stats' },
  { value: '/config', label: '/config', description: 'Show current configuration and settings' },
  { value: '/export', label: '/export', description: 'Export conversation to JSON/Markdown file' },
  { value: '/history', label: '/history', description: 'Show conversation history summary' },
  { value: '/reset', label: '/reset', description: 'Reset agent to initial state' },
  { value: '/save', label: '/save', description: 'Save current session to file' },
  { value: '/load', label: '/load', description: 'Load a saved session' },
  { value: '/theme', label: '/theme', description: 'Change color theme (dark/light/minimal)' },
  { value: '/debug', label: '/debug', description: 'Toggle debug mode for verbose output' },
  { value: '/exit', label: '/exit', description: 'Exit the CLI gracefully' },
];

const AVAILABLE_TOOLS = [
  { name: 'bash', description: 'Execute shell commands in terminal', category: 'System' },
  { name: 'read', description: 'Read file contents from filesystem', category: 'File' },
  { name: 'write', description: 'Write content to files', category: 'File' },
  { name: 'edit', description: 'Edit files with search & replace', category: 'File' },
  { name: 'glob', description: 'Find files by pattern matching', category: 'Search' },
  { name: 'grep', description: 'Search content in files with regex', category: 'Search' },
];

// ═══════════════════════════════════════════════════════════════════════════
// MENU COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

// Slash Command Menu
const SlashCommandMenu = ({ query, onSelect, onCancel }) => {
  const searchTerm = query.toLowerCase().replace('/', '');
  const filteredCommands = SLASH_COMMANDS.filter(cmd => 
    cmd.value.toLowerCase().includes(searchTerm) ||
    cmd.description.toLowerCase().includes(searchTerm)
  );

  useInput((input, key) => {
    if (key.escape) onCancel();
  });

  if (filteredCommands.length === 0) {
    return h(Box, { marginLeft: 2 },
      h(Text, { color: 'gray' }, 'No matching commands. Type /help for all commands.')
    );
  }

  return h(Box, { flexDirection: 'column', borderStyle: 'round', borderColor: 'gray', paddingX: 1, marginTop: 1 },
    h(Text, { color: 'cyan', bold: true }, '📋 Available Commands:'),
    h(Box, { marginTop: 1 },
      h(SelectInput, {
        items: filteredCommands.map(cmd => ({ label: cmd.value, value: cmd.value, desc: cmd.description })),
        onSelect: (item) => onSelect(item.value),
        itemComponent: ({ isSelected, label, desc }) => 
          h(Box, { flexDirection: 'column' },
            h(Text, { color: isSelected ? 'cyan' : 'white', bold: isSelected }, `${isSelected ? '▸ ' : '  '}${label}`),
            h(Text, { color: 'gray', dimColor: true }, `    ${desc}`)
          )
      })
    )
  );
};

// Provider Selection Menu
const ProviderMenu = ({ onSelect, onCancel, currentProvider }) => {
  const providers = getProviderList();
  
  useInput((input, key) => {
    if (key.escape) onCancel();
  });

  return h(Box, { flexDirection: 'column', borderStyle: 'round', borderColor: 'cyan', paddingX: 1, marginTop: 1 },
    h(Text, { color: 'cyan', bold: true }, '🔌 Select Provider:'),
    h(Text, { color: 'gray' }, `Current: ${currentProvider}`),
    h(Box, { marginTop: 1 },
      h(SelectInput, {
        items: providers.map(p => ({ 
          label: p.name, 
          value: p.id, 
          desc: p.description,
          current: p.id === currentProvider
        })),
        onSelect: (item) => onSelect(item.value),
        itemComponent: ({ isSelected, label, desc, current }) => 
          h(Box, { flexDirection: 'column' },
            h(Box, null,
              h(Text, { color: isSelected ? 'cyan' : (current ? 'green' : 'white'), bold: isSelected }, 
                `${isSelected ? '▸ ' : '  '}${label}`),
              current && h(Text, { color: 'green' }, ' ✓')
            ),
            h(Text, { color: 'gray', dimColor: true }, `    ${desc}`)
          )
      })
    )
  );
};

// Model Selection Menu  
const ModelMenu = ({ provider, onSelect, onCancel, currentModel }) => {
  const models = getModelsForProvider(provider);
  
  useInput((input, key) => {
    if (key.escape) onCancel();
  });

  if (models.length === 0) {
    return h(Box, { marginLeft: 2 },
      h(Text, { color: 'red' }, `No models found for provider: ${provider}`)
    );
  }

  return h(Box, { flexDirection: 'column', borderStyle: 'round', borderColor: 'magenta', paddingX: 1, marginTop: 1 },
    h(Text, { color: 'magenta', bold: true }, `🤖 Select Model (${PROVIDERS[provider]?.name || provider}):`),
    h(Text, { color: 'gray' }, `Current: ${currentModel}`),
    h(Box, { marginTop: 1 },
      h(SelectInput, {
        items: models.map(m => ({ 
          label: m.name, 
          value: m.id, 
          desc: m.description,
          recommended: m.recommended,
          current: m.id === currentModel
        })),
        onSelect: (item) => onSelect(item.value),
        itemComponent: ({ isSelected, label, desc, recommended, current }) => 
          h(Box, { flexDirection: 'column' },
            h(Box, null,
              h(Text, { color: isSelected ? 'magenta' : (current ? 'green' : 'white'), bold: isSelected }, 
                `${isSelected ? '▸ ' : '  '}${label}`),
              recommended && h(Text, { color: 'yellow' }, ' ⭐'),
              current && h(Text, { color: 'green' }, ' ✓')
            ),
            h(Text, { color: 'gray', dimColor: true }, `    ${desc}`)
          )
      })
    )
  );
};

// Message Bubble
const MessageBubble = ({ message }) => {
  const { role, content } = message;
  const divider = h(Text, { color: 'gray' }, '─'.repeat(70));
  
  switch (role) {
    case 'user':
      return h(Box, { flexDirection: 'column', marginBottom: 1 },
        divider,
        h(Box, null, h(Text, { color: 'cyan', bold: true }, '> ')),
        h(Box, { marginLeft: 2 }, h(Text, null, content))
      );
    case 'assistant':
      return h(Box, { flexDirection: 'column', marginBottom: 1 },
        divider,
        h(Box, { marginLeft: 2 }, h(Text, { color: 'white' }, content))
      );
    case 'tool':
      return h(Box, { marginLeft: 2 }, h(Text, { color: 'yellow' }, content));
    case 'tool-result':
      return h(Box, { marginLeft: 2 }, h(Text, { color: 'green' }, content));
    case 'system':
      return h(Box, { marginBottom: 1, marginLeft: 2 }, h(Text, { color: 'gray' }, content));
    case 'info':
      return h(Box, { marginBottom: 1, borderStyle: 'round', borderColor: 'blue', paddingX: 1 },
        h(Text, { color: 'blue' }, content));
    case 'success':
      return h(Box, { marginBottom: 1 }, h(Text, { color: 'green' }, `✓ ${content}`));
    case 'error':
      return h(Box, { marginBottom: 1 }, h(Text, { color: 'red' }, `✗ ${content}`));
    default:
      return null;
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN CHAT APP
// ═══════════════════════════════════════════════════════════════════════════

const ChatApp = ({ agent, initialPrompt }) => {
  const { exit } = useApp();
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [error, setError] = useState(null);
  
  // Menu states
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [showProviderMenu, setShowProviderMenu] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [tokenCount, setTokenCount] = useState(0);

  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      console.log('\n👋 Goodbye!\n');
      exit();
    }
  });

  useEffect(() => {
    if (initialPrompt) {
      setTimeout(() => handleSubmit(initialPrompt), 100);
    }
  }, []);

  useEffect(() => {
    if (query.startsWith('/') && query.length >= 1 && !showProviderMenu && !showModelMenu) {
      setShowSlashMenu(true);
    } else {
      setShowSlashMenu(false);
    }
  }, [query, showProviderMenu, showModelMenu]);

  const addMessage = (role, content) => {
    setMessages(prev => [...prev, { role, content, timestamp: new Date().toISOString() }]);
  };

  const handleSlashSelect = (command) => {
    setShowSlashMenu(false);
    setQuery('');
    executeCommand(command);
  };

  const handleProviderSelect = (providerId) => {
    setShowProviderMenu(false);
    const provider = PROVIDERS[providerId];
    if (provider) {
      agent.provider = providerId;
      agent.baseUrl = provider.baseUrl;
      const recommended = provider.models.find(m => m.recommended) || provider.models[0];
      if (recommended) {
        agent.model = recommended.id;
      }
      addMessage('success', `Provider changed to ${provider.name} (${recommended?.id || 'default'})`);
    }
  };

  const handleModelSelect = (modelId) => {
    setShowModelMenu(false);
    agent.model = modelId;
    addMessage('success', `Model changed to ${modelId}`);
  };

  const handleSubmit = async (input) => {
    if (!input.trim()) return;
    if (input.startsWith('/')) {
      executeCommand(input.trim());
      setQuery('');
      return;
    }

    setShowSlashMenu(false);
    setShowProviderMenu(false);
    setShowModelMenu(false);

    addMessage('user', input);
    setQuery('');
    setIsLoading(true);
    setCurrentResponse('');
    setError(null);

    try {
      let fullResponse = '';
      
      await agent.chat(input, {
        onStart: () => setIsLoading(false),
        onToken: (token) => {
          if (!token.includes('<think>') && !token.includes('</think>')) {
            fullResponse += token;
            setCurrentResponse(fullResponse);
            setTokenCount(prev => prev + 1);
          }
        },
        onToolCall: async (tool, args) => {
          addMessage('tool', `🔧 ${tool}: ${JSON.stringify(args)}`);
          return true;
        },
        onToolResult: (tool, result) => {
          const preview = String(result).substring(0, 200);
          addMessage('tool-result', `✓ ${tool}: ${preview}${result.length > 200 ? '...' : ''}`);
        },
        onEnd: () => {
          if (fullResponse) addMessage('assistant', fullResponse);
          setCurrentResponse('');
          setIsLoading(false);
        },
        onError: (err) => {
          setError(err.message);
          setIsLoading(false);
        }
      });
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const executeCommand = (cmd) => {
    const parts = cmd.split(' ');
    const command = parts[0];
    const args = parts.slice(1).join(' ');

    switch (command) {
      case '/help':
      case '/h':
        const helpText = `
📚 MY AI CLI - ENTERPRISE COMMAND REFERENCE

🔑 SETUP & API KEYS:
  /setup              Setup wizard - Get API key untuk provider
  /providers          List semua provider + pricing + free tier
  /free               Tampilkan provider GRATIS (Gemini, Groq, dll)
  /apikey             Set/update API key untuk provider aktif

🤖 MODEL & PROVIDER:
  /model              Interactive model selection dengan preview
  /provider           Switch AI provider (12 providers tersedia!)
  /models             List semua model untuk provider aktif

💬 CONVERSATION:
  /clear              Hapus semua history
  /compact            Compress history dengan summary
  /history            Lihat pesan terakhir
  /export             Export ke file JSON

⚙️ SETTINGS:
  /yolo               Toggle auto-approve (current: ${agent.yolo ? 'ON' : 'OFF'})
  /config             Lihat konfigurasi lengkap
  /context            Stats: token count, messages, dll
  /debug              Toggle debug mode

🔧 TOOLS:
  /tools              List semua tools dengan kategori

💾 SESSION:
  /save               Simpan session ke file
  /load <file>        Load session dari file
  /reset              Reset ke state awal
  /exit               Keluar dari CLI

💡 TIPS:
  • Ketik / untuk lihat suggestions
  • Arrow keys untuk navigasi, Enter untuk pilih
  • ESC untuk cancel menu
  • Ctrl+C untuk exit kapan saja
  
🌟 MULAI DARI MANA?
  1. /free     → Lihat provider gratis
  2. /setup    → Setup API key
  3. /model    → Pilih model`;
        addMessage('info', helpText);
        break;

      case '/model':
        if (args) {
          agent.model = args;
          addMessage('success', `Model changed to: ${args}`);
        } else {
          setShowModelMenu(true);
        }
        break;

      case '/provider':
        if (args) {
          handleProviderSelect(args);
        } else {
          setShowProviderMenu(true);
        }
        break;

      case '/models':
        const models = getModelsForProvider(agent.provider);
        const modelList = models.map(m => 
          `  ${m.recommended ? '⭐' : '  '} ${m.id.padEnd(25)} ${m.description}`
        ).join('\n');
        addMessage('info', `🤖 Models for ${PROVIDERS[agent.provider]?.name || agent.provider}:\n\n${modelList}`);
        break;

      case '/clear':
      case '/c':
        setMessages([]);
        agent.clearHistory();
        setTokenCount(0);
        addMessage('success', 'Conversation cleared');
        break;

      case '/compact':
        const summary = `Session compacted. Stats: ${messages.length} messages, ~${tokenCount} tokens processed.`;
        setMessages([]);
        agent.clearHistory();
        addMessage('system', summary);
        break;

      case '/yolo':
        agent.yolo = !agent.yolo;
        addMessage('success', agent.yolo ? 'Auto-approve ENABLED (YOLO mode)' : 'Auto-approve DISABLED');
        break;

      case '/tools':
        const toolsByCategory = {};
        AVAILABLE_TOOLS.forEach(t => {
          if (!toolsByCategory[t.category]) toolsByCategory[t.category] = [];
          toolsByCategory[t.category].push(t);
        });
        let toolsText = '🔧 AVAILABLE TOOLS:\n';
        for (const [cat, tools] of Object.entries(toolsByCategory)) {
          toolsText += `\n${cat}:\n`;
          tools.forEach(t => {
            toolsText += `  • ${t.name.padEnd(10)} ${t.description}\n`;
          });
        }
        addMessage('info', toolsText);
        break;

      case '/context':
        addMessage('info', `📊 CONTEXT STATS:
  Messages: ${messages.length}
  Tokens (approx): ${tokenCount}
  Provider: ${PROVIDERS[agent.provider]?.name || agent.provider}
  Model: ${agent.model}
  YOLO: ${agent.yolo ? 'ON' : 'OFF'}
  Debug: ${debugMode ? 'ON' : 'OFF'}`);
        break;

      case '/config':
        addMessage('info', `⚙️ CONFIGURATION:
  Provider: ${agent.provider}
  Model: ${agent.model}
  Base URL: ${agent.baseUrl || 'default'}
  YOLO Mode: ${agent.yolo}
  Streaming: ${agent.stream}
  Debug: ${debugMode}`);
        break;

      case '/export':
        const exportData = {
          exported: new Date().toISOString(),
          provider: agent.provider,
          model: agent.model,
          messages: messages
        };
        const filename = `chat-export-${Date.now()}.json`;
        try {
          fs.writeFileSync(filename, JSON.stringify(exportData, null, 2));
          addMessage('success', `Exported to ${filename}`);
        } catch (e) {
          addMessage('error', `Export failed: ${e.message}`);
        }
        break;

      case '/history':
        const recentMsgs = messages.slice(-10);
        const historyText = recentMsgs.map(m => 
          `[${m.role}] ${m.content.substring(0, 60)}${m.content.length > 60 ? '...' : ''}`
        ).join('\n');
        addMessage('info', `📜 RECENT HISTORY (last 10):\n\n${historyText}`);
        break;

      case '/reset':
        setMessages([]);
        agent.clearHistory();
        setTokenCount(0);
        setError(null);
        addMessage('success', 'Agent reset to initial state');
        break;

      case '/debug':
        setDebugMode(!debugMode);
        addMessage('success', `Debug mode ${!debugMode ? 'ENABLED' : 'DISABLED'}`);
        break;

      case '/save':
        const sessionData = {
          saved: new Date().toISOString(),
          provider: agent.provider,
          model: agent.model,
          messages,
          tokenCount
        };
        const sessionFile = args || `session-${Date.now()}.json`;
        try {
          fs.writeFileSync(sessionFile, JSON.stringify(sessionData, null, 2));
          addMessage('success', `Session saved to ${sessionFile}`);
        } catch (e) {
          addMessage('error', `Save failed: ${e.message}`);
        }
        break;

      case '/load':
        if (!args) {
          addMessage('error', 'Usage: /load <filename>');
          break;
        }
        try {
          const data = JSON.parse(fs.readFileSync(args, 'utf8'));
          setMessages(data.messages || []);
          setTokenCount(data.tokenCount || 0);
          if (data.provider) agent.provider = data.provider;
          if (data.model) agent.model = data.model;
          addMessage('success', `Session loaded from ${args}`);
        } catch (e) {
          addMessage('error', `Load failed: ${e.message}`);
        }
        break;

      case '/setup':
        // Show setup guide for a provider
        if (args) {
          const guide = formatProviderGuide(args);
          if (guide) {
            addMessage('info', guide);
          } else {
            addMessage('error', `Provider "${args}" not found. Use /providers to see all.`);
          }
        } else {
          // Show provider selection for setup
          setShowProviderMenu(true);
          addMessage('system', '👆 Pilih provider di atas, lalu ketik /setup <provider> untuk panduan lengkap');
        }
        break;

      case '/providers':
        addMessage('info', getAllProvidersQuickRef());
        break;

      case '/free':
        const freeProviders = getFreeProviders();
        let freeText = `
🆓 PROVIDER GRATIS / FREE TIER:

${freeProviders.map(p => `
▸ ${p.name.toUpperCase()}
  ${p.description}
  Pricing: ${p.pricing}
  Sign up: ${p.signupUrl}
`).join('')}

💡 Cara setup:
   1. Pilih provider di atas
   2. Ketik /setup <provider> untuk panduan
   3. Contoh: /setup gemini
`;
        addMessage('info', freeText);
        break;

      case '/apikey':
        const providerInfo = PROVIDER_INFO[agent.provider];
        if (!providerInfo) {
          addMessage('error', `No info for provider: ${agent.provider}`);
          break;
        }
        
        if (!providerInfo.envVar) {
          addMessage('info', `Provider ${providerInfo.name} tidak memerlukan API key (local)`);
          break;
        }

        const homeDir = os.homedir();
        const keyFile = path.join(homeDir, `.${agent.provider}_api_key`);
        
        if (args) {
          // Save API key
          try {
            fs.writeFileSync(keyFile, args.trim());
            fs.chmodSync(keyFile, 0o600);
            agent.apiKey = args.trim();
            addMessage('success', `API key saved to ${keyFile}`);
            addMessage('info', `Atau set environment variable:\nexport ${providerInfo.envVar}="${args.trim()}"`);
          } catch (e) {
            addMessage('error', `Failed to save: ${e.message}`);
          }
        } else {
          // Show how to set API key
          addMessage('info', `
🔐 SET API KEY untuk ${providerInfo.name}:

1️⃣ Via command:
   /apikey YOUR_API_KEY_HERE

2️⃣ Via environment variable:
   export ${providerInfo.envVar}=your_key

3️⃣ Via file:
   echo "your_key" > ~/${providerInfo.apiKeyFile}

📍 Get API key: ${providerInfo.apiKeyUrl}

💡 Current key file: ${keyFile}
   ${fs.existsSync(keyFile) ? '✓ File exists' : '✗ File not found'}
`);
        }
        break;

      case '/exit':
      case '/quit':
      case '/q':
        console.log('\n👋 Goodbye!\n');
        exit();
        break;

      default:
        addMessage('error', `Unknown command: ${command}. Type /help for available commands.`);
    }
  };

  const divider = h(Text, { color: 'gray' }, '─'.repeat(70));

  return h(Box, { flexDirection: 'column', padding: 1 },
    // Header
    h(Box, { marginBottom: 1, justifyContent: 'space-between' },
      h(Box, null,
        h(Text, { color: 'cyan', bold: true }, '🤖 My AI CLI'),
        h(Text, { color: 'gray' }, ` • ${PROVIDERS[agent.provider]?.name || agent.provider}`),
        h(Text, { color: 'magenta' }, ` • ${agent.model}`),
        agent.yolo && h(Text, { color: 'yellow' }, ' • YOLO')
      ),
      h(Text, { color: 'gray' }, `${messages.length} msgs`)
    ),

    // Messages
    h(Box, { flexDirection: 'column', marginBottom: 1 },
      ...messages.slice(-20).map((msg, i) => h(MessageBubble, { key: `msg-${i}-${msg.role}`, message: msg })),
      
      currentResponse && h(Box, { flexDirection: 'column' },
        divider,
        h(Box, { marginLeft: 2 }, h(Text, { color: 'white' }, currentResponse))
      ),

      isLoading && h(Box, null,
        h(Text, { color: 'cyan' }, h(Spinner, { type: 'dots' })),
        h(Text, { color: 'gray' }, ' Thinking...')
      ),

      error && h(Box, null, h(Text, { color: 'red' }, `✗ Error: ${error}`))
    ),

    // Menus
    showSlashMenu && h(SlashCommandMenu, { query, onSelect: handleSlashSelect, onCancel: () => setShowSlashMenu(false) }),
    showProviderMenu && h(ProviderMenu, { onSelect: handleProviderSelect, onCancel: () => setShowProviderMenu(false), currentProvider: agent.provider }),
    showModelMenu && h(ModelMenu, { provider: agent.provider, onSelect: handleModelSelect, onCancel: () => setShowModelMenu(false), currentModel: agent.model }),

    // Input
    h(Box, { flexDirection: 'column' },
      divider,
      h(Box, null,
        h(Text, { color: 'cyan', bold: true }, '> '),
        h(TextInput, {
          value: query,
          onChange: setQuery,
          onSubmit: handleSubmit,
          placeholder: 'Type message or / for commands...'
        })
      )
    )
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export async function startInkMode(agent, initialPrompt) {
  if (!process.stdin.isTTY) {
    console.log('\n⚠️  Ink mode requires interactive terminal.');
    console.log('   Use --classic flag for non-interactive mode.\n');
    const { startInteractiveMode } = await import('./cli.js');
    return startInteractiveMode(agent, initialPrompt);
  }
  
  render(h(ChatApp, { agent, initialPrompt }));
}
