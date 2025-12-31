
import { Agent } from './src/agent.js';
import { startInteractiveMode } from './src/cli.js';
import chalk from 'chalk';

// Mock the Agent.chat method
Agent.prototype.chat = async function(userMessage, callbacks = {}) {
  const { onStart, onToken, onToolCall, onToolResult, onEnd } = callbacks;
  
  if (userMessage === '') return; // Handle tool continuation call

  onStart();
  
  if (userMessage.toLowerCase().includes('hello')) {
    onToken('Hello! I am your AI assistant. How can I help you today?');
  } else if (userMessage.toLowerCase().includes('time')) {
    onToken('Let me check the time for you...');
    const approved = await onToolCall('bash', { command: 'date' });
    if (approved) {
      const result = new Date().toString();
      onToolResult('bash', result);
      onToken('\nThe current time is: ' + result);
    } else {
      onToken('\nI was not allowed to check the time.');
    }
  } else {
    onToken('I received your message: "' + userMessage + '". I am working correctly!');
  }
  
  onEnd();
};

console.log(chalk.yellow('Starting Chat Simulation... (Type "exit" to quit)'));
const agent = new Agent({ provider: 'mock', model: 'mock-model', yolo: false, apiKey: 'dummy-key' });
await startInteractiveMode(agent);

