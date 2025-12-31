import React, { useState, useEffect } from 'react';
import { render, Box, Text, useInput, useApp } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import SelectInput from 'ink-select-input';

const { createElement: h } = React;

// ═══════════════════════════════════════════════════════════════════════════
// SLASH COMMANDS DEFINITION
// ═══════════════════════════════════════════════════════════════════════════

const SLASH_COMMANDS = [
  { value: '/help', label: '/help', description: 'Show all available commands' },
  { value: '/clear', label: '/clear', description: 'Clear conversation history and free up context' },
  { value: '/compact', label: '/compact', description: 'Clear history but keep a summary in context' },
  { value: '/model', label: '/model', description: 'Show or change current model' },
  { value: '/provider', label: '/provider', description: 'Show or change current provider' },
  { value: '/yolo', label: '/yolo', description: 'Toggle auto-approve mode (bypass permissions)' },
  { value: '/tools', label: '/tools', description: 'List all available tools' },
  { value: '/context', label: '/context', description: 'Show current context/conversation stats' },
  { value: '/config', label: '/config', description: 'Show current configuration' },
  { value: '/export', label: '/export', description: 'Export conversation to file' },
  { value: '/history', label: '/history', description: 'Show conversation history' },
  { value: '/reset', label: '/reset', description: 'Reset agent to initial state' },
  { value: '/exit', label: '/exit', description: 'Exit the CLI' },
];

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

// Slash Command Menu Component
const SlashCommandMenu = ({ query, onSelect, onCancel }) => {
  const searchTerm = query.toLowerCase().replace('/', '');
  const filteredCommands = SLASH_COMMANDS.filter(cmd => 
    cmd.value.toLowerCase().includes(searchTerm) ||
    cmd.description.toLowerCase().includes(searchTerm)
  );

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
    }
  });

  if (filteredCommands.length === 0) {
    return h(Box, { flexDirection: 'column', marginLeft: 2 },
      h(Text, { color: 'gray' }, 'No matching commands')
    );
  }

  const items = filteredCommands.map(cmd => ({
    label: cmd.value,
    value: cmd.value,
    description: cmd.description
  }));

  return h(Box, { flexDirection: 'column', borderStyle: 'single', borderColor: 'gray', paddingX: 1 },
    h(SelectInput, {
      items,
      onSelect: (item) => onSelect(item.value),
      itemComponent: ({ isSelected, label, description }) => 
        h(Box, { flexDirection: 'column' },
          h(Box, null,
            h(Text, { color: isSelected ? 'cyan' : 'white', bold: isSelected }, label),
          ),
          h(Text, { color: 'gray', dimColor: true }, `    ${description || ''}`)
        )
    })
  );
};

// Message Bubble Component
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
      return h(Box, { marginLeft: 2 },
        h(Text, { color: 'yellow' }, content)
      );
    case 'tool-result':
      return h(Box, { marginLeft: 2 },
        h(Text, { color: 'green' }, content)
      );
    case 'system':
      return h(Box, { marginBottom: 1, marginLeft: 2 },
        h(Text, { color: 'gray' }, content)
      );
    default:
      return null;
  }
};

// Main Chat App Component
const ChatApp = ({ agent, initialPrompt }) => {
  const { exit } = useApp();
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [error, setError] = useState(null);
  const [showSlashMenu, setShowSlashMenu] = useState(false);

  // Handle Ctrl+C
  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      console.log('\n👋 Goodbye!\n');
      exit();
    }
  });

  // Process initial prompt
  useEffect(() => {
    if (initialPrompt) {
      setTimeout(() => handleSubmit(initialPrompt), 100);
    }
  }, []);

  // Watch for slash commands
  useEffect(() => {
    if (query.startsWith('/') && query.length >= 1) {
      setShowSlashMenu(true);
    } else {
      setShowSlashMenu(false);
    }
  }, [query]);

  const handleSlashSelect = (command) => {
    setShowSlashMenu(false);
    setQuery('');
    executeCommand(command);
  };

  const handleSlashCancel = () => {
    setShowSlashMenu(false);
  };

  const handleSubmit = async (input) => {
    if (!input.trim()) return;

    // Handle slash commands
    if (input.startsWith('/')) {
      executeCommand(input.trim());
      setQuery('');
      return;
    }

    // Close slash menu if open
    setShowSlashMenu(false);

    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: input }]);
    setQuery('');
    setIsLoading(true);
    setCurrentResponse('');
    setError(null);

    try {
      let fullResponse = '';
      
      await agent.chat(input, {
        onStart: () => {
          setIsLoading(false);
        },
        onToken: (token) => {
          if (!token.includes('<think>') && !token.includes('</think>')) {
            fullResponse += token;
            setCurrentResponse(fullResponse);
          }
        },
        onToolCall: async (tool, args) => {
          setMessages(prev => [...prev, { 
            role: 'tool', 
            content: `🔧 ${tool}: ${JSON.stringify(args)}` 
          }]);
          return true; // Auto-approve in Ink mode
        },
        onToolResult: (tool, result) => {
          const preview = String(result).substring(0, 200);
          setMessages(prev => [...prev, { 
            role: 'tool-result', 
            content: `✓ ${tool}: ${preview}${result.length > 200 ? '...' : ''}` 
          }]);
        },
        onEnd: () => {
          if (fullResponse) {
            setMessages(prev => [...prev, { role: 'assistant', content: fullResponse }]);
          }
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
        const helpText = SLASH_COMMANDS.map(c => 
          `  ${c.value.padEnd(12)} ${c.description}`
        ).join('\n');
        setMessages(prev => [...prev, { 
          role: 'system', 
          content: `📚 Available Commands:\n${helpText}` 
        }]);
        break;

      case '/clear':
      case '/c':
        setMessages([]);
        agent.clearHistory();
        setMessages([{ role: 'system', content: '✓ Conversation cleared' }]);
        break;

      case '/compact':
        const summary = `Conversation compacted. Previous context: ${messages.length} messages.`;
        setMessages([{ role: 'system', content: summary }]);
        agent.clearHistory();
        break;

      case '/model':
        if (args) {
          agent.model = args;
          setMessages(prev => [...prev, { 
            role: 'system', 
            content: `✓ Model changed to: ${args}` 
          }]);
        } else {
          setMessages(prev => [...prev, { 
            role: 'system', 
            content: `Current model: ${agent.model}` 
          }]);
        }
        break;

      case '/provider':
        if (args) {
          agent.provider = args;
          setMessages(prev => [...prev, { 
            role: 'system', 
            content: `✓ Provider changed to: ${args}` 
          }]);
        } else {
          setMessages(prev => [...prev, { 
            role: 'system', 
            content: `Current provider: ${agent.provider}` 
          }]);
        }
        break;

      case '/yolo':
        agent.yolo = !agent.yolo;
        setMessages(prev => [...prev, { 
          role: 'system', 
          content: agent.yolo ? '⏵⏵ Auto-approve ON (YOLO mode)' : '⏵⏵ Auto-approve OFF' 
        }]);
        break;

      case '/tools':
        const tools = ['bash', 'read', 'write', 'edit', 'glob', 'grep'];
        setMessages(prev => [...prev, { 
          role: 'system', 
          content: `🔧 Available Tools:\n${tools.map(t => `  • ${t}`).join('\n')}` 
        }]);
        break;

      case '/context':
        setMessages(prev => [...prev, { 
          role: 'system', 
          content: `📊 Context Stats:\n  Messages: ${messages.length}\n  Model: ${agent.model}\n  Provider: ${agent.provider}\n  YOLO: ${agent.yolo ? 'ON' : 'OFF'}` 
        }]);
        break;

      case '/config':
        setMessages(prev => [...prev, { 
          role: 'system', 
          content: `⚙️ Configuration:\n  Model: ${agent.model}\n  Provider: ${agent.provider}\n  Base URL: ${agent.baseUrl || 'default'}\n  YOLO: ${agent.yolo}\n  Stream: ${agent.stream}` 
        }]);
        break;

      case '/export':
        const exportData = messages.map(m => `[${m.role}] ${m.content}`).join('\n\n');
        setMessages(prev => [...prev, { 
          role: 'system', 
          content: `📤 Export (copy below):\n\n${exportData}` 
        }]);
        break;

      case '/history':
        const historyPreview = messages.slice(-5).map(m => 
          `  [${m.role}] ${m.content.substring(0, 50)}...`
        ).join('\n');
        setMessages(prev => [...prev, { 
          role: 'system', 
          content: `📜 Recent History (last 5):\n${historyPreview}` 
        }]);
        break;

      case '/reset':
        setMessages([]);
        agent.clearHistory();
        setMessages([{ role: 'system', content: '✓ Agent reset to initial state' }]);
        break;

      case '/exit':
      case '/quit':
      case '/q':
        console.log('\n👋 Goodbye!\n');
        exit();
        break;

      default:
        setMessages(prev => [...prev, { 
          role: 'system', 
          content: `Unknown command: ${command}. Type /help for available commands.` 
        }]);
    }
  };

  const divider = h(Text, { color: 'gray' }, '─'.repeat(70));

  return h(Box, { flexDirection: 'column', padding: 1 },
    // Header
    h(Box, { marginBottom: 1 },
      h(Text, { color: 'cyan', bold: true }, '🤖 My AI CLI'),
      h(Text, { color: 'gray' }, ` • ${agent.model}`),
      agent.yolo && h(Text, { color: 'yellow' }, ' • YOLO')
    ),

    // Messages
    h(Box, { flexDirection: 'column', marginBottom: 1 },
      ...messages.map((msg, i) => h(MessageBubble, { key: `msg-${i}-${msg.role}`, message: msg })),
      
      // Current streaming response
      currentResponse && h(Box, { flexDirection: 'column' },
        divider,
        h(Box, { marginLeft: 2 }, h(Text, { color: 'white' }, currentResponse))
      ),

      // Loading
      isLoading && h(Box, null,
        h(Text, { color: 'cyan' }, h(Spinner, { type: 'dots' })),
        h(Text, { color: 'gray' }, ' Thinking...')
      ),

      // Error
      error && h(Box, null,
        h(Text, { color: 'red' }, `✗ Error: ${error}`)
      )
    ),

    // Slash Command Menu (shown when typing /)
    showSlashMenu && h(SlashCommandMenu, {
      query,
      onSelect: handleSlashSelect,
      onCancel: handleSlashCancel
    }),

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
