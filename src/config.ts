import fs from 'fs';
import path from 'path';
import os from 'os';

const HOME = os.homedir();
const CONFIG_DIR = path.join(HOME, '.my-ai-cli');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

// Provider configuration interface
interface ProviderConfigItem {
  baseUrl: string;
  apiKeyFile?: string;
  apiKey?: string;
  models: string[];
}

// Full configuration interface
interface Config {
  provider: string;
  model: string;
  yolo: boolean;
  stream: boolean;
  providers: Record<string, ProviderConfigItem>;
}

// Default configuration
const DEFAULT_CONFIG: Config = {
  provider: 'minimax',
  model: 'minimax-m2.1',
  yolo: true,
  stream: true,
  providers: {
    minimax: {
      baseUrl: 'https://api.minimax.io/v1',
      apiKeyFile: path.join(HOME, '.minimax_api_key'),
      models: ['minimax-m2.1', 'abab6.5', 'abab6.5s']
    },
    openai: {
      baseUrl: 'https://api.openai.com/v1',
      apiKeyFile: path.join(HOME, '.openai_api_key'),
      models: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo']
    },
    anthropic: {
      baseUrl: 'https://api.anthropic.com/v1',
      apiKeyFile: path.join(HOME, '.anthropic_api_key'),
      models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229']
    },
    gemini: {
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
      apiKeyFile: path.join(HOME, '.gemini_api_key'),
      models: ['gemini-2.0-flash-exp', 'gemini-1.5-pro']
    },
    ollama: {
      baseUrl: 'http://localhost:11434/v1',
      apiKey: 'ollama',
      models: ['llama3', 'codellama', 'mistral']
    },
    glm: {
      baseUrl: 'https://api.z.ai/api/coding/paas/v4/',
      apiKeyFile: path.join(HOME, '.glm_api_key'),
      models: ['glm-4.7', 'glm-4.6', 'glm-4.5', 'glm-4.5-air']
    }
  }
};

// Ensure config directory exists
function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

// Load configuration
export function loadConfig(): Config {
  ensureConfigDir();

  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
    } catch (_e) {
      return DEFAULT_CONFIG;
    }
  }

  // Save default config on first run
  saveConfig(DEFAULT_CONFIG);
  return DEFAULT_CONFIG;
}

// Save configuration
export function saveConfig(config: Config): void {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// Get API key for provider
export function getApiKey(provider: string, config: Config): string | null {
  const providerConfig = config.providers[provider];

  if (!providerConfig) {
    return null;
  }

  // Check if static key exists
  if (providerConfig.apiKey) {
    return providerConfig.apiKey;
  }

  // Try to load from file
  if (providerConfig.apiKeyFile && fs.existsSync(providerConfig.apiKeyFile)) {
    try {
      return fs.readFileSync(providerConfig.apiKeyFile, 'utf-8').trim();
    } catch (_e) {
      return null;
    }
  }

  // Check environment variables
  const envVars: Record<string, string> = {
    minimax: 'MINIMAX_API_KEY',
    openai: 'OPENAI_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
    gemini: 'GEMINI_API_KEY',
    glm: 'GLM_API_KEY'
  };

  if (envVars[provider] && process.env[envVars[provider]]) {
    return process.env[envVars[provider]] || null;
  }

  return null;
}

// Get provider config
export function getProviderConfig(provider: string, config: Config): ProviderConfigItem | null {
  return config.providers[provider] || null;
}

// Save API key
export function saveApiKey(provider: string, apiKey: string): boolean {
  const config = loadConfig();
  const providerConfig = config.providers[provider];

  if (providerConfig && providerConfig.apiKeyFile) {
    ensureConfigDir();
    fs.writeFileSync(providerConfig.apiKeyFile, apiKey);
    fs.chmodSync(providerConfig.apiKeyFile, 0o600);
    return true;
  }

  return false;
}

export { CONFIG_DIR, CONFIG_FILE, DEFAULT_CONFIG };
export type { Config, ProviderConfigItem };
