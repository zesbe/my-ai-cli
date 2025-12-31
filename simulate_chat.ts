import { Agent } from './src/agent.js';
import { startInteractiveMode } from './src/cli.js';
import chalk from 'chalk';

// Mock the Agent.chat method
// @ts-ignore - Mocking prototype for simulation
Agent.prototype.chat = async function(userMessage: string, callbacks: any = {}) {
  const { onStart, onToken, onToolCall, onToolResult, onEnd } = callbacks;
  
  if (userMessage === '') return; // Handle tool continuation call

  if (onStart) onStart();
  
  if (userMessage.toLowerCase().includes('hello')) {
    if (onToken) onToken('Hello! I am your AI assistant. How can I help you today?');
  } else if (userMessage.toLowerCase().includes('time')) {
    if (onToken) onToken('Let me check the time for you...');
    let approved = true;
    if (onToolCall) {
        approved = await onToolCall('bash', { command: 'date' });
    }
    
    if (approved) {
      const result = new Date().toString();
      if (onToolResult) onToolResult('bash', result);
      if (onToken) onToken('\nThe current time is: ' + result);
    } else {
      if (onToken) onToken('\nI was not allowed to check the time.');
    }
  } else {
    if (onToken) onToken('I received your message: "' + userMessage + '". I am working correctly!');
  }
  
  if (onEnd) onEnd();
};

console.log(chalk.yellow('Starting Chat Simulation... (Type "exit" to quit)'));
const agent = new Agent({ 
    provider: 'openai', // Using dummy provider
    model: 'mock-model', 
    yolo: false, 
    apiKey: 'dummy-key' 
});
await startInteractiveMode(agent, '');
