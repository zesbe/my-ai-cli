/**
 * Enterprise Model Database
 * Comprehensive list of all supported AI providers and models
 */

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  recommended?: boolean;
}

export interface ProviderConfig {
  name: string;
  baseUrl: string;
  apiKeyEnv: string | null;
  apiKeyFile: string | null;
  description: string;
  models: ModelInfo[];
}

export const PROVIDERS: Record<string, ProviderConfig> = {
  minimax: {
    name: 'MiniMax',
    baseUrl: 'https://api.minimax.io/v1',
    apiKeyEnv: 'MINIMAX_API_KEY',
    apiKeyFile: '.minimax_api_key',
    description: 'High-performance AI with excellent coding capabilities',
    models: [
      { id: 'MiniMax-M2', name: 'MiniMax M2', description: 'Latest flagship model', recommended: true },
      { id: 'minimax-m2', name: 'MiniMax M2 (alt)', description: 'Alternative model name' },
      { id: 'abab6.5-chat', name: 'ABAB 6.5 Chat', description: 'General purpose chat model' },
      { id: 'abab6.5s-chat', name: 'ABAB 6.5s Chat', description: 'Fast variant' },
    ]
  },
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    apiKeyEnv: 'OPENAI_API_KEY',
    apiKeyFile: '.openai_api_key',
    description: 'GPT models - Industry standard',
    models: [
      { id: 'gpt-4.1', name: 'GPT-4.1', description: 'Flagship - 1M context, best coding', recommended: true },
      { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', description: '90% accuracy, lower cost' },
      { id: 'gpt-4.1-nano', name: 'GPT-4.1 Nano', description: 'Ultra-fast, cost-effective' },
      { id: 'gpt-4o', name: 'GPT-4o', description: 'Multimodal, real-time' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast multimodal' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Legacy powerful model' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Fast and cheap' },
      { id: 'o1', name: 'o1', description: 'Advanced reasoning model' },
      { id: 'o1-mini', name: 'o1 Mini', description: 'Efficient reasoning' },
    ]
  },
  anthropic: {
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    apiKeyEnv: 'ANTHROPIC_API_KEY',
    apiKeyFile: '.anthropic_api_key',
    description: 'Claude models - Best for coding & reasoning',
    models: [
      { id: 'claude-opus-4', name: 'Claude Opus 4', description: 'Most powerful - Best coding worldwide', recommended: true },
      { id: 'claude-sonnet-4', name: 'Claude Sonnet 4', description: 'Balanced performance & cost' },
      { id: 'claude-3.5-haiku', name: 'Claude 3.5 Haiku', description: 'Fast responses' },
      { id: 'claude-3-opus', name: 'Claude 3 Opus', description: 'Previous flagship' },
      { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', description: 'Previous balanced model' },
    ]
  },
  gemini: {
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    apiKeyEnv: 'GEMINI_API_KEY',
    apiKeyFile: '.gemini_api_key',
    description: 'Google AI - Multimodal & long context',
    models: [
      { id: 'gemini-3-pro', name: 'Gemini 3 Pro', description: 'Latest - Rich visuals & interactivity', recommended: true },
      { id: 'gemini-3-flash', name: 'Gemini 3 Flash', description: 'Fast with superior search' },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Advanced reasoning - 1M context' },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Price-performance optimized' },
      { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash', description: 'Experimental latest' },
    ]
  },
  xai: {
    name: 'xAI (Grok)',
    baseUrl: 'https://api.x.ai/v1',
    apiKeyEnv: 'XAI_API_KEY',
    apiKeyFile: '.xai_api_key',
    description: "Grok models by Elon Musk's xAI",
    models: [
      { id: 'grok-3', name: 'Grok 3', description: 'Most advanced - 1M context', recommended: true },
      { id: 'grok-3-mini', name: 'Grok 3 Mini', description: 'Cost-efficient reasoning' },
      { id: 'grok-2', name: 'Grok 2', description: 'Previous flagship' },
      { id: 'grok-2-mini', name: 'Grok 2 Mini', description: 'Fast responses' },
    ]
  },
  deepseek: {
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    apiKeyFile: '.deepseek_api_key',
    description: 'Chinese AI - Excellent reasoning & coding',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat', description: 'General chat model', recommended: true },
      { id: 'deepseek-coder', name: 'DeepSeek Coder', description: 'Optimized for coding' },
      { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', description: 'Advanced reasoning (R1)' },
    ]
  },
  groq: {
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    apiKeyEnv: 'GROQ_API_KEY',
    apiKeyFile: '.groq_api_key',
    description: 'Ultra-fast inference on LPU',
    models: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', description: 'Best open model', recommended: true },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', description: 'Ultra-fast' },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', description: 'MoE architecture' },
      { id: 'gemma2-9b-it', name: 'Gemma 2 9B', description: 'Google open model' },
    ]
  },
  ollama: {
    name: 'Ollama (Local)',
    baseUrl: 'http://localhost:11434/v1',
    apiKeyEnv: null,
    apiKeyFile: null,
    description: 'Local LLM hosting - Free & private',
    models: [
      { id: 'llama3.2', name: 'Llama 3.2', description: 'Latest Llama', recommended: true },
      { id: 'llama3.1', name: 'Llama 3.1', description: 'Stable Llama' },
      { id: 'codellama', name: 'Code Llama', description: 'Coding specialized' },
      { id: 'mistral', name: 'Mistral', description: 'European AI' },
      { id: 'mixtral', name: 'Mixtral', description: 'MoE model' },
      { id: 'qwen2.5-coder', name: 'Qwen 2.5 Coder', description: 'Alibaba coding model' },
      { id: 'deepseek-coder-v2', name: 'DeepSeek Coder v2', description: 'Local DeepSeek' },
    ]
  },
  glm: {
    name: 'GLM (Z.AI)',
    baseUrl: 'https://api.z.ai/api/coding/paas/v4/',
    apiKeyEnv: 'GLM_API_KEY',
    apiKeyFile: '.glm_api_key',
    description: 'Chinese GLM models - GLM Coding Plan ($3/mo)',
    models: [
      { id: 'glm-4.7', name: 'GLM-4.7', description: 'Latest & best for coding (200k context)', recommended: true },
      { id: 'glm-4.6', name: 'GLM-4.6', description: 'Previous flagship model' },
      { id: 'glm-4.5', name: 'GLM-4.5', description: 'Hybrid reasoning model' },
      { id: 'glm-4.5-air', name: 'GLM-4.5 Air', description: 'Lightweight & fast' },
    ]
  },
  mistral: {
    name: 'Mistral AI',
    baseUrl: 'https://api.mistral.ai/v1',
    apiKeyEnv: 'MISTRAL_API_KEY',
    apiKeyFile: '.mistral_api_key',
    description: 'European AI - Open weights available',
    models: [
      { id: 'mistral-large-latest', name: 'Mistral Large', description: 'Flagship model', recommended: true },
      { id: 'mistral-medium-latest', name: 'Mistral Medium', description: 'Balanced' },
      { id: 'mistral-small-latest', name: 'Mistral Small', description: 'Fast & efficient' },
      { id: 'codestral-latest', name: 'Codestral', description: 'Coding specialized' },
    ]
  },
  perplexity: {
    name: 'Perplexity',
    baseUrl: 'https://api.perplexity.ai',
    apiKeyEnv: 'PERPLEXITY_API_KEY',
    apiKeyFile: '.perplexity_api_key',
    description: 'Search-augmented AI',
    models: [
      { id: 'sonar-pro', name: 'Sonar Pro', description: 'Best search-augmented', recommended: true },
      { id: 'sonar', name: 'Sonar', description: 'Standard search model' },
      { id: 'sonar-reasoning-pro', name: 'Sonar Reasoning Pro', description: 'Deep reasoning' },
    ]
  },
  openrouter: {
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKeyEnv: 'OPENROUTER_API_KEY',
    apiKeyFile: '.openrouter_api_key',
    description: 'Multi-provider aggregator - Access all models',
    models: [
      { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', description: 'Via OpenRouter' },
      { id: 'openai/gpt-4o', name: 'GPT-4o', description: 'Via OpenRouter' },
      { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5', description: 'Via OpenRouter' },
      { id: 'meta-llama/llama-3.1-405b', name: 'Llama 3.1 405B', description: 'Largest open model' },
    ]
  }
};

// Get all providers as array
export function getProviderList(): Array<{ id: string } & ProviderConfig> {
  return Object.entries(PROVIDERS).map(([id, provider]) => ({
    id,
    ...provider
  }));
}

// Get provider by ID
export function getProvider(providerId: string): ProviderConfig | null {
  return PROVIDERS[providerId] || null;
}

// Get all models for a provider
export function getModelsForProvider(providerId: string): ModelInfo[] {
  const provider = PROVIDERS[providerId];
  return provider ? provider.models : [];
}

// Get recommended model for provider
export function getRecommendedModel(providerId: string): ModelInfo | null {
  const models = getModelsForProvider(providerId);
  return models.find(m => m.recommended) || models[0] || null;
}

// Search models across all providers
export function searchModels(query: string): Array<{ providerId: string; providerName: string } & ModelInfo> {
  const results: Array<{ providerId: string; providerName: string } & ModelInfo> = [];
  const q = query.toLowerCase();

  for (const [providerId, provider] of Object.entries(PROVIDERS)) {
    for (const model of provider.models) {
      if (model.id.toLowerCase().includes(q) ||
          model.name.toLowerCase().includes(q) ||
          model.description.toLowerCase().includes(q)) {
        results.push({
          providerId,
          providerName: provider.name,
          ...model
        });
      }
    }
  }

  return results;
}

// Get flat list of all models
export function getAllModels(): Array<{ providerId: string; providerName: string } & ModelInfo> {
  const models: Array<{ providerId: string; providerName: string } & ModelInfo> = [];
  for (const [providerId, provider] of Object.entries(PROVIDERS)) {
    for (const model of provider.models) {
      models.push({
        providerId,
        providerName: provider.name,
        ...model
      });
    }
  }
  return models;
}

export default PROVIDERS;
