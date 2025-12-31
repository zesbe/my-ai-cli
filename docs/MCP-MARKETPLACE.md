# MCP Marketplace - Easy Server Installation

The Zesbe CLI includes an integrated MCP Marketplace that makes it super easy to discover and install Model Context Protocol servers.

## Quick Start

### Browse Popular Servers
```bash
/mcp browse
```
Shows the 12 most popular MCP servers with descriptions, categories, and star counts.

### Search for Servers
```bash
/mcp search database
/mcp search browser
/mcp search github
```
Search through the curated server list.

### Install a Server
```bash
/mcp install filesystem
/mcp install playwright
/mcp install brave-search
```
One-command installation! Automatically adds to your `~/.zesbe/mcp.json` config.

### View Online Marketplaces
```bash
/mcp marketplace
```
Links to 4 major MCP registries with 13,000+ servers.

## Available Servers

### Official Servers (⭐)

#### **filesystem** - File Operations
Secure file operations with permission controls.
```bash
/mcp install filesystem
# Then edit ~/.zesbe/mcp.json to set the allowed directory path
```

#### **github** - GitHub Integration  
Manage repos, issues, PRs, search code.
```bash
/mcp install github
# Requires: GITHUB_PERSONAL_ACCESS_TOKEN
```

#### **playwright** - Browser Automation
Interact with web pages without vision models. 24,721 stars!
```bash
/mcp install playwright
# No API key required!
```

#### **brave-search** - Web Search
Web, image, news, and local search powered by Brave.
```bash
/mcp install brave-search
# Requires: BRAVE_API_KEY (free at brave.com/search/api)
```

### Database Servers

#### **postgres** - PostgreSQL
Query and manage PostgreSQL databases.
```bash
/mcp install postgres
# Requires: DATABASE_URL
```

#### **sqlite** - SQLite
Query SQLite databases locally.
```bash
/mcp install sqlite
# Then edit config to set database path
```

### Automation & Communication

#### **puppeteer** - Browser Automation
Screenshots, PDF generation, web scraping.
```bash
/mcp install puppeteer
# No API key required!
```

#### **slack** - Slack Integration
Send messages, read channels, manage workspace.
```bash
/mcp install slack
# Requires: SLACK_BOT_TOKEN, SLACK_TEAM_ID
```

### Cloud Storage

#### **google-drive** - Google Drive
Access Drive files and folders.
```bash
/mcp install google-drive
```

### Memory & Knowledge

#### **mem0** - Memory Layer
Store and recall coding preferences for consistent programming.
```bash
/mcp install mem0
# Requires: MEM0_API_KEY (free at mem0.ai)
```

### AI Generation

#### **everart** - AI Image Generation
Create images from text prompts.
```bash
/mcp install everart
# Requires: EVERART_API_KEY
```

### Note Taking

#### **obsidian** - Obsidian Vault
Read, search, and create notes in your Obsidian vault.
```bash
/mcp install obsidian
# Then edit config to set vault path
```

## Configuration

After installing, edit `~/.zesbe/mcp.json`:

### Example: Filesystem Server
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/home/user/projects"]
    }
  }
}
```

### Example: GitHub Server
```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_yourtoken"
      }
    }
  }
}
```

### Example: Multiple Servers
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp"]
    },
    "brave-search": {
      "command": "npx",
      "args": ["-y", "@brave/brave-search-mcp"],
      "env": {
        "BRAVE_API_KEY": "your-api-key"
      }
    },
    "sqlite": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sqlite", "/path/to/database.db"]
    }
  }
}
```

## Connecting to Servers

After configuring, connect to all servers:
```bash
/mcp connect
```

View connected servers:
```bash
/mcp
```

View available tools:
```bash
/mcp tools
```

Disconnect all:
```bash
/mcp disconnect
```

## External Marketplaces

Access thousands more MCP servers:

### 🌐 Glama (13,450+ servers)
https://glama.ai/mcp/servers
- Most comprehensive directory
- Sort by popularity, stars, recent usage
- Deep search functionality

### 🏪 MCP Market (18,600+ servers)
https://mcpmarket.com
- Organized by categories
- Featured servers
- Submit your own servers

### 📚 AI Agents List (593+ curated)
https://aiagentslist.com/mcp-servers
- Curated collection
- Quality-focused
- Browse by language and scope

### ⭐ Official GitHub
https://github.com/modelcontextprotocol/servers
- Official MCP servers
- Community contributions
- Source code available

## Tips

1. **Start with official servers** - They're well-maintained and documented
2. **No API key needed** - Playwright, Puppeteer work immediately
3. **Free tiers available** - Brave Search, Mem0 offer free API keys
4. **Local first** - Filesystem, SQLite, Obsidian run locally
5. **Combine servers** - Use multiple servers for powerful workflows

## Troubleshooting

### Server won't connect?
- Check your config syntax in `~/.zesbe/mcp.json`
- Verify API keys are set correctly
- Ensure paths exist and are accessible
- Try `npx` command manually to debug

### Tool not working?
- Run `/mcp tools` to verify tool is loaded
- Disconnect and reconnect: `/mcp disconnect` then `/mcp connect`
- Check server logs in terminal

### Need help?
- Check server documentation on GitHub
- Visit marketplace pages for setup guides
- Ask in MCP communities (Discord, Reddit)

---

Built with ❤️ for the Zesbe CLI
