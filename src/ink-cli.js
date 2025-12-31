import React, { useState, useEffect } from 'react';
import { render, Box, Text, useInput, useApp } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import * as inkModule from 'ink';

const { createElement: h } = React;

// Check if raw mode is supported
const isRawModeSupported = inkModule.isRawModeSupported ? inkModule.isRawModeSupported() : process.stdin.isTTY;

// Message Bubble Component
const MessageBubble = ({ message }) => {
  const { role, content } = message;
  
  const divider = h(Text, { color: 'gray' }, '─'.repeat(60));
  
  switch (role) {
    case 'user':
      return h(Box, { flexDirection: 'column', marginBottom: 1 },
        divider,
        h(Box, null, h(Text, { color: 'cyan', bold: true }, 'You: ')),
        h(Box, { marginLeft: 2 }, h(Text, null, content))
      );
    case 'assistant':
      return h(Box, { flexDirection: 'column', marginBottom: 1 },
        divider,
        h(Box, null, h(Text, { color: 'magenta', bold: true }, 'Assistant: ')),
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
      return h(Box, { marginBottom: 1 },
        h(Text, { color: 'gray' }, content)
      );
    default:
      return null;
  }
};

// Chat App Component
const ChatApp = ({ agent, initialPrompt }) => {
  const { exit } = useApp();
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [error, setError] = useState(null);

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

  const handleSubmit = async (input) => {
    if (!input.trim()) return;

    // Handle commands
    if (input.startsWith('/')) {
      handleCommand(input.trim());
      setQuery('');
      return;
    }

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
          // Filter thinking tags
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
          
          // Auto-approve in Ink mode
          return true;
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

  const handleCommand = (cmd) => {
    switch (cmd) {
      case '/help':
      case '/h':
        setMessages(prev => [...prev, { 
          role: 'system', 
          content: `📚 Commands:
  /help, /h     - Show help
  /clear, /c    - Clear chat
  /model        - Show model
  /yolo         - Toggle auto-approve
  /exit, /q     - Exit` 
        }]);
        break;
      case '/clear':
      case '/c':
        setMessages([]);
        agent.clearHistory();
        break;
      case '/model':
        setMessages(prev => [...prev, { 
          role: 'system', 
          content: `Current model: ${agent.model}` 
        }]);
        break;
      case '/yolo':
        agent.yolo = !agent.yolo;
        setMessages(prev => [...prev, { 
          role: 'system', 
          content: agent.yolo ? '⏵⏵ Auto-approve ON' : '⏵⏵ Auto-approve OFF' 
        }]);
        break;
      case '/exit':
      case '/q':
        console.log('\n👋 Goodbye!\n');
        exit();
        break;
      default:
        if (cmd.startsWith('/model ')) {
          const newModel = cmd.replace('/model ', '');
          agent.model = newModel;
          setMessages(prev => [...prev, { 
            role: 'system', 
            content: `Model changed to: ${newModel}` 
          }]);
        }
    }
  };

  const divider = h(Text, { color: 'gray' }, '─'.repeat(60));

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
        h(Box, null, h(Text, { color: 'magenta', bold: true }, 'Assistant: ')),
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

    // Input
    h(Box, { flexDirection: 'column' },
      divider,
      h(Box, null,
        h(Text, { color: 'cyan', bold: true }, '> '),
        h(TextInput, {
          value: query,
          onChange: setQuery,
          onSubmit: handleSubmit,
          placeholder: 'Type message or /help...'
        })
      )
    )
  );
};

// Export start function
export async function startInkMode(agent, initialPrompt) {
  // Check if terminal supports Ink
  if (!process.stdin.isTTY) {
    console.log('\n⚠️  Ink mode requires interactive terminal.');
    console.log('   Use --classic flag for non-interactive mode.\n');
    
    // Fallback to classic mode
    const { startInteractiveMode } = await import('./cli.js');
    return startInteractiveMode(agent, initialPrompt);
  }
  
  render(h(ChatApp, { agent, initialPrompt }));
}
