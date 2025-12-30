# My AI CLI

Custom AI CLI Agent - Like Claude Code but with **your own model**.

## Features

- **Multi-provider support**: OpenAI, Anthropic, Ollama, or any OpenAI-compatible API
- **Built-in tools**: bash, read, write, edit, glob, grep
- **Streaming responses**: Real-time output
- **YOLO mode**: Auto-approve all actions (bypass permissions)
- **Conversation history**: Context preserved during session
- **Interactive CLI**: Full-featured terminal interface

## Installation

### Quick Install (npm)

```bash
npm install -g my-ai-cli
```

### From Source

```bash
git clone https://github.com/zesbe/my-ai-cli.git
cd my-ai-cli
npm install
npm link  # Makes 'my-ai' and 'ai' commands available globally
```

## Usage

### Basic Usage

```bash
# With OpenAI
export OPENAI_API_KEY=sk-...
my-ai

# With Anthropic
export ANTHROPIC_API_KEY=sk-ant-...
my-ai --provider anthropic --model claude-3-5-sonnet-20241022

# With Ollama (local)
my-ai --provider ollama --model llama3

# With custom API
my-ai --provider custom --base-url https://api.example.com/v1 --api-key your-key --model your-model
```

### Options

```
Options:
  -m, --model <model>      Model to use (default: gpt-4o)
  -p, --provider <name>    Provider: openai, anthropic, ollama, custom
  -b, --base-url <url>     Custom API base URL
  -k, --api-key <key>      API key (or use env var)
  -s, --system <prompt>    Custom system prompt
  -y, --yolo               Auto-approve all actions (bypass permissions)
  --no-stream              Disable streaming output
  -h, --help               Show help
```

### Interactive Commands

```
/help, /h      - Show help
/clear, /c     - Clear conversation history
/tools         - List available tools
/model         - Show current model
/model <name>  - Change model
/exit, /q      - Exit
```

### Examples

```bash
# Start with initial prompt
my-ai "Review the code in src/ directory"

# Use YOLO mode (no confirmations)
my-ai --yolo "Fix all TypeScript errors"

# Use local Ollama model
my-ai -p ollama -m codellama "Explain this codebase"

# Use custom endpoint (e.g., LM Studio, vLLM)
my-ai -p custom -b http://localhost:1234/v1 -k lm-studio -m local-model
```

## Supported Providers

| Provider | Models | Base URL |
|----------|--------|----------|
| OpenAI | gpt-4o, gpt-4-turbo, gpt-3.5-turbo | api.openai.com |
| Anthropic | claude-3-5-sonnet, claude-3-opus | api.anthropic.com |
| Ollama | llama3, codellama, mistral, etc. | localhost:11434 |
| Custom | Any OpenAI-compatible | Your URL |

## Tools

| Tool | Description |
|------|-------------|
| `bash` | Execute shell commands |
| `read` | Read file contents |
| `write` | Write to files |
| `edit` | Edit files (search & replace) |
| `glob` | Find files by pattern |
| `grep` | Search in files |

## Environment Variables

```bash
# OpenAI
export OPENAI_API_KEY=sk-...

# Anthropic
export ANTHROPIC_API_KEY=sk-ant-...

# Custom
export API_KEY=your-key
```

Or create a `.env` file:

```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

## Project Structure

```
my-ai-cli/
├── package.json
├── src/
│   ├── index.js      # Entry point & CLI parser
│   ├── cli.js        # Interactive CLI interface
│   ├── agent.js      # Agent logic & API calls
│   └── tools/        # Tool implementations
│       ├── index.js  # Tool registry
│       ├── bash.js   # Shell execution
│       ├── read.js   # File reading
│       ├── write.js  # File writing
│       ├── edit.js   # File editing
│       ├── glob.js   # File finding
│       └── grep.js   # Pattern search
└── README.md
```

## Extending

### Add Custom Tools

1. Create tool file in `src/tools/`:

```javascript
// src/tools/my-tool.js
export const myTool = {
  type: 'function',
  function: {
    name: 'my_tool',
    description: 'Description of what it does',
    parameters: {
      type: 'object',
      properties: {
        param1: { type: 'string', description: 'Parameter description' }
      },
      required: ['param1']
    }
  }
};

export async function executeMyTool(args) {
  // Implementation
  return 'Result';
}
```

2. Register in `src/tools/index.js`

### Custom System Prompt

```bash
my-ai --system "You are a security expert. Focus on finding vulnerabilities."
```

## License

MIT

## Author

zesbe
