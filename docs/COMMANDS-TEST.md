# ✅ ALL SLASH COMMANDS - Tested & Working

Last tested: 2025-12-31
Status: **ALL FUNCTIONAL** ✅

## 📋 Command List (19 commands)

| Command | Status | Description |
|---------|--------|-------------|
| `/help` | ✅ Works | Show all commands |
| `/clear` | ✅ Works | Clear conversation |
| `/model` | ✅ Works | Switch AI model |
| `/provider` | ✅ Works | Switch AI provider |
| `/providers` | ✅ Works | List all providers |
| `/free` | ✅ Works | Show FREE providers |
| `/setup` | ✅ Works | Setup API key with guide |
| `/apikey` | ✅ Works | Set API key |
| `/yolo` | ✅ Works | Toggle auto-approve |
| `/config` | ✅ Works | Show configuration |
| `/stats` | ✅ Works | Session statistics |
| `/context` | ✅ Works | Show project context |
| `/save` | ✅ Works | Save session |
| `/load` | ✅ Works | Load session |
| `/resume` | ✅ Works | Resume last session |
| `/sessions` | ✅ Works | List saved sessions |
| `/skills` | ✅ Works | Skills management |
| `/mcp` | ✅ Works | MCP server management |
| `/exit` | ✅ Works | Exit CLI |

---

## 🔧 **Provider Commands** (Tested ✅)

### `/help`
Shows complete command reference.

**Usage:**
```bash
/help
```

**Output:** Full command list with categories

---

### `/providers`
List all AI providers with pricing info.

**Usage:**
```bash
/providers
```

**Output:**
- MiniMax (FREE ⭐)
- OpenAI
- Anthropic (Claude)
- Gemini (FREE ⭐)
- Ollama (FREE ⭐)
- GLM
- Custom

---

### `/free`
Show only providers with free tiers.

**Usage:**
```bash
/free
```

**Output:** MiniMax, Gemini, Ollama with signup links

---

### `/setup <provider>`
Interactive setup guide for API keys.

**Usage:**
```bash
/setup gemini
/setup openai
```

**Output:** Step-by-step guide with API key URL

---

### `/provider`
Switch AI provider.

**Usage:**
```bash
/provider          # Show menu
/provider gemini   # Switch directly
```

**Status:** ✅ Works - opens interactive menu or switches directly

---

### `/model`
Switch AI model.

**Usage:**
```bash
/model                    # Show menu
/model gpt-4              # Switch directly
/model gemini-2.0-flash   # Switch directly
```

**Status:** ✅ Works - opens interactive menu or switches directly

---

### `/apikey [key]`
Set or view API key.

**Usage:**
```bash
/apikey                  # Interactive prompt
/apikey sk-your-key      # Direct set
```

**Status:** ✅ Works - saves to ~/.{provider}_api_key

---

## 💬 **Chat Commands** (Tested ✅)

### `/clear`
Clear conversation history.

**Usage:**
```bash
/clear
```

**Effect:** Resets messages, tokens, response time

---

### `/yolo`
Toggle auto-approve mode (bypass tool confirmations).

**Usage:**
```bash
/yolo
```

**Output:** 
- `⚡ Auto-approve ON (YOLO mode)` or
- `Auto-approve OFF`

**Visual:** Shows `⚡ YOLO` in status bar when ON

---

### `/stats`
Show session statistics.

**Usage:**
```bash
/stats
```

**Output:**
- Messages sent
- Total tokens used
- Current provider & model
- YOLO status

---

### `/context`
Show project context file.

**Usage:**
```bash
/context
```

**Output:** Shows content of ZESBE.md/CLAUDE.md/GEMINI.md if exists

---

### `/config`
Show current configuration.

**Usage:**
```bash
/config
```

**Output:**
- Provider
- Model
- Base URL
- YOLO status
- Stream status

---

## 💾 **Session Commands** (Tested ✅)

### `/save [name]`
Save current session.

**Usage:**
```bash
/save                  # Auto-named: session-{timestamp}
/save my-session       # Named session
```

**Location:** `~/.zesbe/sessions/`

---

### `/load <name>`
Load saved session.

**Usage:**
```bash
/load my-session
```

**Effect:** Restores conversation history

---

### `/resume`
Resume last session.

**Usage:**
```bash
/resume
```

**Effect:** Loads `last.json` session

---

### `/sessions`
List all saved sessions.

**Usage:**
```bash
/sessions
```

**Output:** List of sessions with timestamps

---

## 📚 **Skills Commands** (Tested ✅)

### `/skills`
List available skills.

**Usage:**
```bash
/skills
```

**Output:**
- ✅ test-skill - A test skill (user)
- ⬚ other-skill - Another skill (project)

**Legend:**
- ✅ = Loaded (AI can use)
- ⬚ = Available (not loaded)
- (user) = From ~/.zesbe/skills/
- (project) = From .skills/

---

### `/skills load <id>`
Load a skill for AI to use.

**Usage:**
```bash
/skills load test-skill
```

**Output:**
```
✅ Loaded skill: Test Skill
A test skill to verify skills system works

💡 The AI can now use this skill! Try asking:
"Test Skill help me with..."
```

**Visual:** Status bar shows `📚 1 skill`

**Effect:** 
- Skill injected into AI system prompt
- AI follows skill instructions
- Visible in status bar

---

### `/skills unload <id>`
Unload a skill.

**Usage:**
```bash
/skills unload test-skill
```

**Output:**
```
✅ Unloaded skill: test-skill
```

**Visual:** Status bar updates skill count

---

### `/skills create <name>`
Create new skill template.

**Usage:**
```bash
/skills create my-skill
```

**Output:**
```
✅ Created skill template: my-skill
Path: ~/.zesbe/skills/my-skill/

Edit SKILL.md to customize.
```

---

### `/skills loaded`
Show currently loaded skills.

**Usage:**
```bash
/skills loaded
```

**Output:**
- Test Skill: A test skill to verify skills system works

---

### `/skills refresh`
Rescan skills directories.

**Usage:**
```bash
/skills refresh
```

**Effect:** Reload list from ~/.zesbe/skills/ and .skills/

---

## 🔌 **MCP Commands** (Tested ✅)

### `/mcp` or `/mcp list`
List connected MCP servers.

**Usage:**
```bash
/mcp
```

**Output (if none):**
```
🔌 MCP: No servers connected.

To configure MCP servers, edit:
~/.zesbe/mcp.json

Then run: /mcp connect
```

**Output (if connected):**
```
🔌 MCP SERVERS:

• playwright (5 tools)
  navigate_to, click, screenshot, evaluate, close
```

---

### `/mcp browse`
Browse curated popular MCP servers.

**Usage:**
```bash
/mcp browse
```

**Output:**
```
🏪 POPULAR MCP SERVERS (Curated List):

⭐ filesystem - Filesystem by @modelcontextprotocol
   Secure file operations - read, write, edit files
   Category: Official | ⭐ 5000 stars

⭐ playwright - Playwright by @microsoft
   Browser automation - interact with web pages
   Category: Browser Automation | ⭐ 24721 stars

📦 QUICK INSTALL:
  /mcp install playwright    # Browser automation
  /mcp install github        # GitHub integration
  /mcp install filesystem    # File operations

🔍 MORE OPTIONS:
  /mcp search <query>        # Search servers
  /mcp marketplace           # External marketplaces
```

---

### `/mcp search <query>`
Search MCP servers.

**Usage:**
```bash
/mcp search database
/mcp search browser
```

**Output:**
```
🔍 SEARCH RESULTS (2):

⭐ postgres - PostgreSQL
   Query and manage PostgreSQL databases

⭐ sqlite - SQLite
   Query SQLite databases - perfect for local data

Use /mcp install <id> to add
```

---

### `/mcp install <id>`
Install an MCP server.

**Usage:**
```bash
/mcp install playwright
/mcp install github
```

**Output (no requirements):**
```
📦 Installing: Playwright
Browser automation - interact with web pages

✅ Playwright added to config!

Run /mcp connect to activate
```

**Output (needs token):**
```
📦 Installing: GitHub
Official GitHub MCP server

⚠️ This server requires: GitHub Personal Access Token

Example installation in mcp.json:
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "your-token-here"
      }
    }
  }
}

Edit ~/.zesbe/mcp.json then run /mcp connect
```

---

### `/mcp marketplace`
View external marketplace links.

**Usage:**
```bash
/mcp marketplace
```

**Output:**
```
🏪 MCP MARKETPLACES:

🌐 Glama
   13,450+ MCP servers - Most comprehensive
   https://glama.ai/mcp/servers

🏪 MCP Market
   18,600+ servers with categories
   https://mcpmarket.com

📚 AI Agents List
   593+ curated servers
   https://aiagentslist.com/mcp-servers

⭐ Official GitHub
   Official MCP servers repository
   https://github.com/modelcontextprotocol/servers

Browse thousands more servers online!

💡 To install servers from our curated list:
  /mcp browse        # See popular servers
  /mcp install <id>  # Install directly
```

---

### `/mcp connect`
Connect to all configured MCP servers.

**Usage:**
```bash
/mcp connect
```

**Output:**
```
🔌 Connecting to MCP servers...

MCP Connection Results:
✅ playwright: 5 tools
❌ github: Error: Missing GITHUB_PERSONAL_ACCESS_TOKEN
```

---

### `/mcp disconnect`
Disconnect from all MCP servers.

**Usage:**
```bash
/mcp disconnect
```

**Output:**
```
✅ Disconnected from all MCP servers
```

---

### `/mcp tools`
List available MCP tools (from connected servers).

**Usage:**
```bash
/mcp tools
```

**Output:**
```
🔧 MCP TOOLS:

• mcp_navigate_to
• mcp_click
• mcp_screenshot
• mcp_evaluate
• mcp_close
```

---

## 🚪 **Exit Command** (Tested ✅)

### `/exit`
Exit CLI with auto-save.

**Usage:**
```bash
/exit
```

**Effect:** 
- Auto-saves session to `last.json`
- Shows goodbye message
- Exits cleanly

---

## 🎯 **Visual Indicators**

### Status Bar
Shows at bottom of screen:

```
┌─────────────────────────────────────────────┐
│ 🤖 Gemini  📦 gemini-2.0-flash  📚 1 skill │
│                    🎯 0 tokens  ⏱️ 1.2s    │
└─────────────────────────────────────────────┘
```

**Indicators:**
- 🤖 Provider name
- 📦 Model name
- 📚 X skill(s) - Shows when skills loaded
- ⚡ YOLO - Shows when auto-approve ON
- 🎯 Token count
- ⏱️ Response time

---

## ✅ **Test Results Summary**

**Total Commands:** 19
**Tested:** 19
**Working:** 19 ✅
**Broken:** 0 ❌

**Status:** 🟢 **ALL SYSTEMS OPERATIONAL**

---

## 📝 **Notes for Users**

### Skills System
- ✅ Skills WORK - AI uses loaded skills
- ✅ Status bar shows loaded skills
- ✅ Clear feedback when loaded
- 💡 After loading: ask AI "help me with [skill topic]"

### MCP System
- ✅ `/mcp browse` - See curated list (12 servers)
- ✅ `/mcp install <id>` - Install directly
- ✅ `/mcp marketplace` - External links (13k+ servers)
- 💡 Install → Connect → Use tools!

### Common Workflow

**Install MCP Server:**
```bash
/mcp browse              # Browse servers
/mcp install playwright  # Install
/mcp connect             # Connect
/mcp tools               # Verify tools loaded
# Now AI can use playwright tools!
```

**Use Skills:**
```bash
/skills                  # List available
/skills load my-skill    # Load skill
# Now AI follows skill instructions!
# Status bar shows: 📚 1 skill
```

---

**Last updated:** 2025-12-31
**Version:** 1.0.0
**Status:** Production Ready ✅
