/**
 * MCP Marketplace - Browse and install MCP servers easily
 * Integrates with popular MCP registries
 */

import type { MCPMarketplaceServer } from '../types/index.js';

// Install configuration interface
interface InstallConfig {
  command: string;
  args: string[];
  requiresPath?: boolean;
  requiresToken?: string;
  env?: Record<string, string>;
}

// Server definition interface
interface MCPServerDefinition {
  id: string;
  name: string;
  author: string;
  description: string;
  category: string;
  install: InstallConfig;
  stars: number;
  official: boolean;
}

// Popular MCP Servers curated list
export const POPULAR_MCP_SERVERS: MCPServerDefinition[] = [
  {
    id: 'filesystem',
    name: 'Filesystem',
    author: '@modelcontextprotocol',
    description: 'Secure file operations - read, write, edit files with permission controls',
    category: 'Official',
    install: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', '{PATH}'],
      requiresPath: true
    },
    stars: 5000,
    official: true
  },
  {
    id: 'github',
    name: 'GitHub',
    author: '@modelcontextprotocol',
    description: 'Official GitHub MCP server - manage repos, issues, PRs, search code',
    category: 'Official',
    install: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-github'],
      env: { GITHUB_PERSONAL_ACCESS_TOKEN: '{TOKEN}' },
      requiresToken: 'GitHub Personal Access Token'
    },
    stars: 3500,
    official: true
  },
  {
    id: 'playwright',
    name: 'Playwright',
    author: '@microsoft',
    description: 'Browser automation - interact with web pages, scrape, test',
    category: 'Browser Automation',
    install: {
      command: 'npx',
      args: ['-y', '@playwright/mcp']
    },
    stars: 24721,
    official: true
  },
  {
    id: 'brave-search',
    name: 'Brave Search',
    author: '@brave',
    description: 'Web search with Brave Search API - web, images, news, local',
    category: 'Search',
    install: {
      command: 'npx',
      args: ['-y', '@brave/brave-search-mcp'],
      env: { BRAVE_API_KEY: '{TOKEN}' },
      requiresToken: 'Brave Search API Key (free at brave.com/search/api)'
    },
    stars: 443,
    official: true
  },
  {
    id: 'postgres',
    name: 'PostgreSQL',
    author: '@modelcontextprotocol',
    description: 'Query and manage PostgreSQL databases',
    category: 'Database',
    install: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-postgres'],
      env: { DATABASE_URL: '{URL}' },
      requiresToken: 'PostgreSQL connection URL'
    },
    stars: 2000,
    official: true
  },
  {
    id: 'sqlite',
    name: 'SQLite',
    author: '@modelcontextprotocol',
    description: 'Query SQLite databases - perfect for local data',
    category: 'Database',
    install: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-sqlite', '{PATH}'],
      requiresPath: true
    },
    stars: 1800,
    official: true
  },
  {
    id: 'puppeteer',
    name: 'Puppeteer',
    author: '@modelcontextprotocol',
    description: 'Browser automation with Puppeteer - screenshots, PDF, scraping',
    category: 'Browser Automation',
    install: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-puppeteer']
    },
    stars: 2200,
    official: true
  },
  {
    id: 'slack',
    name: 'Slack',
    author: '@modelcontextprotocol',
    description: 'Interact with Slack - send messages, read channels, manage workspace',
    category: 'Communication',
    install: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-slack'],
      env: {
        SLACK_BOT_TOKEN: '{TOKEN}',
        SLACK_TEAM_ID: '{TEAM_ID}'
      },
      requiresToken: 'Slack Bot Token'
    },
    stars: 1500,
    official: true
  },
  {
    id: 'google-drive',
    name: 'Google Drive',
    author: '@modelcontextprotocol',
    description: 'Access Google Drive files and folders',
    category: 'Cloud Storage',
    install: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-gdrive']
    },
    stars: 1200,
    official: true
  },
  {
    id: 'mem0',
    name: 'Mem0',
    author: '@mem0ai',
    description: 'Memory layer for AI - store and recall coding preferences',
    category: 'Knowledge & Memory',
    install: {
      command: 'npx',
      args: ['-y', '@mem0ai/mem0-mcp'],
      env: { MEM0_API_KEY: '{TOKEN}' },
      requiresToken: 'Mem0 API Key (free at mem0.ai)'
    },
    stars: 545,
    official: true
  },
  {
    id: 'everart',
    name: 'Everart',
    author: '@everartai',
    description: 'AI image generation - create images from text prompts',
    category: 'Image & Video',
    install: {
      command: 'npx',
      args: ['-y', '@everartai/mcp'],
      env: { EVERART_API_KEY: '{TOKEN}' },
      requiresToken: 'Everart API Key'
    },
    stars: 300,
    official: false
  },
  {
    id: 'obsidian',
    name: 'Obsidian',
    author: '@ckreiling',
    description: 'Access Obsidian vault notes - read, search, create notes',
    category: 'Note Taking',
    install: {
      command: 'npx',
      args: ['-y', 'obsidian-mcp', '{PATH}'],
      requiresPath: true
    },
    stars: 800,
    official: false
  },
  {
    id: 'sequential-thinking',
    name: 'Sequential Thinking',
    author: '@modelcontextprotocol',
    description: 'Dynamic reasoning tool that helps AI solve complex problems step-by-step',
    category: 'Productivity',
    install: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-sequential-thinking']
    },
    stars: 2100,
    official: true
  },
  {
    id: 'exa',
    name: 'Exa Search',
    author: '@exa',
    description: 'Neural search engine designed for AI - find real-time info with precision',
    category: 'Search',
    install: {
      command: 'npx',
      args: ['-y', 'exa-mcp-server'],
      env: { EXA_API_KEY: '{TOKEN}' },
      requiresToken: 'Exa API Key'
    },
    stars: 1850,
    official: true
  },
  {
    id: 'memory',
    name: 'Knowledge Graph Memory',
    author: '@modelcontextprotocol',
    description: 'Persistent memory for AI using a knowledge graph structure',
    category: 'Knowledge & Memory',
    install: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-memory']
    },
    stars: 3200,
    official: true
  },
  {
    id: 'context7',
    name: 'Context7',
    author: '@upstash',
    description: 'Upstash documentation and project metadata retrieval',
    category: 'Developer Tools',
    install: {
      command: 'npx',
      args: ['-y', '@upstash/context7-mcp'],
      env: { CONTEXT7_API_KEY: '{TOKEN}' },
      requiresToken: 'Context7 API Key'
    },
    stars: 500,
    official: true
  },
  {
    id: 'linear',
    name: 'Linear',
    author: '@linear',
    description: 'Manage Linear issues, projects, and cycles',
    category: 'Productivity',
    install: {
      command: 'npx',
      args: ['-y', '@linear/mcp-server'],
      env: { LINEAR_API_KEY: '{TOKEN}' },
      requiresToken: 'Linear API Key'
    },
    stars: 1200,
    official: true
  },
  {
    id: 'notion',
    name: 'Notion',
    author: '@modelcontextprotocol',
    description: 'Search and read Notion pages and databases',
    category: 'Productivity',
    install: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-notion'],
      env: { NOTION_API_KEY: '{TOKEN}' },
      requiresToken: 'Notion API Integration Token'
    },
    stars: 1500,
    official: true
  },
  {
    id: 'supabase',
    name: 'Supabase',
    author: '@supabase',
    description: 'Manage Supabase projects, database, and auth',
    category: 'Database',
    install: {
      command: 'npx',
      args: ['-y', '@supabase/mcp-server'],
      env: { SUPABASE_ACCESS_TOKEN: '{TOKEN}' },
      requiresToken: 'Supabase Access Token'
    },
    stars: 1100,
    official: true
  },
  {
    id: 'gitlab',
    name: 'GitLab',
    author: '@modelcontextprotocol',
    description: 'GitLab integration - manage repos, MRs, pipelines',
    category: 'Developer Tools',
    install: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-gitlab'],
      env: { GITLAB_ACCESS_TOKEN: '{TOKEN}' },
      requiresToken: 'GitLab Personal Access Token'
    },
    stars: 900,
    official: true
  },
  {
    id: 'sentry',
    name: 'Sentry',
    author: '@sentry',
    description: 'Retrieve and analyze Sentry issues and errors',
    category: 'Developer Tools',
    install: {
      command: 'npx',
      args: ['-y', '@sentry/mcp-server'],
      env: { SENTRY_AUTH_TOKEN: '{TOKEN}' },
      requiresToken: 'Sentry Auth Token'
    },
    stars: 850,
    official: true
  },
  {
    id: 'chrome-debug',
    name: 'Chrome DevTools',
    author: '@stateful',
    description: 'Debug web pages in Chrome directly from CLI',
    category: 'Browser Automation',
    install: {
      command: 'npx',
      args: ['-y', '@stateful/mcp-server-chrome-devtools']
    },
    stars: 600,
    official: false
  },
  {
    id: 'mysql',
    name: 'MySQL',
    author: '@benborla',
    description: 'Query and manage MySQL databases',
    category: 'Database',
    install: {
      command: 'npx',
      args: ['-y', 'mcp-server-mysql'],
      env: { DATABASE_URL: '{URL}' },
      requiresToken: 'MySQL Connection URL'
    },
    stars: 400,
    official: false
  }
];

// Categories for filtering
export const MCP_CATEGORIES: string[] = [
  'All',
  'Official',
  'Browser Automation',
  'Database',
  'Search',
  'Communication',
  'Cloud Storage',
  'Knowledge & Memory',
  'Image & Video',
  'Note Taking',
  'Productivity',
  'Developer Tools',
  'API Development'
];

// Get servers by category
export function getServersByCategory(category: string = 'All'): MCPServerDefinition[] {
  if (category === 'All') return POPULAR_MCP_SERVERS;
  return POPULAR_MCP_SERVERS.filter(s => s.category === category);
}

// Search servers
export function searchServers(query: string): MCPServerDefinition[] {
  const q = query.toLowerCase();
  return POPULAR_MCP_SERVERS.filter(s =>
    s.name.toLowerCase().includes(q) ||
    s.description.toLowerCase().includes(q) ||
    s.author.toLowerCase().includes(q) ||
    s.category.toLowerCase().includes(q)
  );
}

// Get server by ID
export function getServerById(id: string): MCPServerDefinition | undefined {
  return POPULAR_MCP_SERVERS.find(s => s.id === id);
}

// Options for generating install config
interface InstallOptions {
  path?: string;
  token?: string;
  teamId?: string;
}

// Generated config output
interface GeneratedConfig {
  command: string;
  args: string[];
  env: Record<string, string>;
}

// Generate install config for server
export function generateInstallConfig(server: MCPServerDefinition, options: InstallOptions = {}): GeneratedConfig {
  const { path: userPath, token, teamId } = options;

  const config: GeneratedConfig = {
    command: server.install.command,
    args: [...server.install.args],
    env: { ...server.install.env }
  };

  // Replace placeholders
  if (server.install.requiresPath && userPath) {
    config.args = config.args.map(arg => arg.replace('{PATH}', userPath));
  }

  if (server.install.requiresToken && token) {
    for (const [key, value] of Object.entries(config.env)) {
      if (value === '{TOKEN}') {
        config.env[key] = token;
      }
      if (key === 'SLACK_TEAM_ID' && teamId) {
        config.env.SLACK_TEAM_ID = teamId;
      }
    }
  }

  return config;
}

// Marketplace link interface
interface MarketplaceLink {
  name: string;
  url: string;
  description: string;
  icon: string;
}

// External marketplace links
export const MARKETPLACE_LINKS: MarketplaceLink[] = [
  {
    name: 'Glama',
    url: 'https://glama.ai/mcp/servers',
    description: '13,450+ MCP servers - Most comprehensive',
    icon: '🌐'
  },
  {
    name: 'MCP Market',
    url: 'https://mcpmarket.com',
    description: '18,600+ servers with categories',
    icon: '🏪'
  },
  {
    name: 'AI Agents List',
    url: 'https://aiagentslist.com/mcp-servers',
    description: '593+ curated servers',
    icon: '📚'
  },
  {
    name: 'Official GitHub',
    url: 'https://github.com/modelcontextprotocol/servers',
    description: 'Official MCP servers repository',
    icon: '⭐'
  }
];

// Fetch registry from online source (simulated for now)
export async function fetchRegistry(): Promise<MCPServerDefinition[]> {
  try {
    // TODO: Switch to real endpoint when available
    // const response = await fetch('https://raw.githubusercontent.com/punkpeye/awesome-mcp-servers/main/servers.json');
    // if (response.ok) return await response.json();
    
    // Simulate network delay for "Online" feel
    return new Promise(resolve => {
      setTimeout(() => resolve(POPULAR_MCP_SERVERS), 800);
    });
  } catch (error) {
    console.error('Failed to fetch registry:', error);
    return POPULAR_MCP_SERVERS;
  }
}

export type { MCPServerDefinition, InstallConfig, InstallOptions, GeneratedConfig, MarketplaceLink };
