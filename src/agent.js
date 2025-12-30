import OpenAI from 'openai';
import { tools, executeTool } from './tools/index.js';

const DEFAULT_SYSTEM_PROMPT = `You are a helpful AI coding assistant running in a CLI environment.
You have access to tools to help accomplish tasks:
- bash: Execute shell commands
- read: Read file contents
- write: Write content to files
- edit: Edit files using search and replace
- glob: Find files matching patterns
- grep: Search for patterns in files

When the user asks you to perform tasks, use the appropriate tools.
Always explain what you're doing before using tools.
Be concise and helpful.`;

export class Agent {
  constructor(options = {}) {
    this.provider = options.provider || 'openai';
    this.model = options.model || 'gpt-4o';
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl;
    this.systemPrompt = options.systemPrompt || DEFAULT_SYSTEM_PROMPT;
    this.yolo = options.yolo || false;
    this.stream = options.stream !== false;
    this.history = [];

    // Initialize OpenAI client (works with any OpenAI-compatible API)
    this.client = new OpenAI({
      apiKey: this.apiKey,
      baseURL: this.baseUrl
    });
  }

  clearHistory() {
    this.history = [];
  }

  async chat(userMessage, callbacks = {}) {
    const { onStart, onToken, onToolCall, onToolResult, onEnd, onError } = callbacks;

    // Add user message to history
    this.history.push({
      role: 'user',
      content: userMessage
    });

    try {
      // Build messages array
      const messages = [
        { role: 'system', content: this.systemPrompt },
        ...this.history
      ];

      if (onStart) onStart();

      // Make API call with tools
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages,
        tools: tools,
        tool_choice: 'auto',
        stream: this.stream
      });

      let assistantMessage = '';
      let toolCalls = [];

      if (this.stream) {
        // Handle streaming response
        for await (const chunk of response) {
          const delta = chunk.choices[0]?.delta;

          if (delta?.content) {
            assistantMessage += delta.content;
            if (onToken) onToken(delta.content);
          }

          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              if (tc.index !== undefined) {
                if (!toolCalls[tc.index]) {
                  toolCalls[tc.index] = {
                    id: tc.id || `call_${tc.index}`,
                    type: 'function',
                    function: { name: '', arguments: '' }
                  };
                }
                if (tc.function?.name) {
                  toolCalls[tc.index].function.name = tc.function.name;
                }
                if (tc.function?.arguments) {
                  toolCalls[tc.index].function.arguments += tc.function.arguments;
                }
                if (tc.id) {
                  toolCalls[tc.index].id = tc.id;
                }
              }
            }
          }
        }
      } else {
        // Handle non-streaming response
        const choice = response.choices[0];
        assistantMessage = choice.message.content || '';
        toolCalls = choice.message.tool_calls || [];

        if (assistantMessage && onToken) {
          onToken(assistantMessage);
        }
      }

      // Add assistant message to history
      const historyEntry = {
        role: 'assistant',
        content: assistantMessage
      };

      if (toolCalls.length > 0) {
        historyEntry.tool_calls = toolCalls;
      }

      this.history.push(historyEntry);

      // Execute tool calls if any
      if (toolCalls.length > 0) {
        for (const toolCall of toolCalls) {
          if (!toolCall.function?.name) continue;

          const toolName = toolCall.function.name;
          let toolArgs = {};

          try {
            toolArgs = JSON.parse(toolCall.function.arguments || '{}');
          } catch (e) {
            toolArgs = {};
          }

          // Ask for approval
          let approved = true;
          if (onToolCall) {
            approved = await onToolCall(toolName, toolArgs);
          }

          if (approved) {
            // Execute the tool
            const result = await executeTool(toolName, toolArgs);

            if (onToolResult) {
              onToolResult(toolName, result);
            }

            // Add tool result to history
            this.history.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: typeof result === 'string' ? result : JSON.stringify(result)
            });
          } else {
            // Tool was rejected
            this.history.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: 'Tool execution was rejected by user.'
            });
          }
        }

        // Continue conversation after tool execution
        await this.chat('', callbacks);
        return;
      }

      if (onEnd) onEnd();

    } catch (err) {
      if (onError) {
        onError(err);
      } else {
        throw err;
      }
    }
  }
}
