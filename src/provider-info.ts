/**
 * Provider Information & API Key Setup Guide
 * User-friendly documentation for each AI provider
 */

export interface ProviderInfoItem {
  name: string;
  description: string;
  website: string;
  pricing: string;
  freeCredits: string;
  apiKeyUrl: string | null;
  signupUrl: string;
  docsUrl: string;
  envVar: string | null;
  apiKeyFile?: string;
  steps: string[];
  tips: string[];
}

export const PROVIDER_INFO: Record<string, ProviderInfoItem> = {
  minimax: {
    name: 'MiniMax',
    description: 'Chinese AI with excellent coding capabilities',
    website: 'https://platform.minimax.io',
    pricing: 'Pay-as-you-go or Coding Plan ($3/month)',
    freeCredits: '$1 free credits on signup',
    apiKeyUrl: 'https://platform.minimax.io/user-center/basic-information/interface-key',
    signupUrl: 'https://platform.minimax.io/login',
    docsUrl: 'https://platform.minimax.io/docs/guides/quickstart',
    envVar: 'MINIMAX_API_KEY',
    apiKeyFile: '.minimax_api_key',
    steps: [
      '1. Buka https://platform.minimax.io/login',
      '2. Daftar dengan email atau login',
      '3. Buka Settings → API Keys',
      '4. Klik "Create API Key"',
      '5. Copy dan simpan API key',
    ],
    tips: [
      '💡 Gunakan Coding Plan untuk harga lebih murah ($3/bulan)',
      '💡 Compatible dengan Anthropic API format',
      '💡 Model terbaik: MiniMax-M2.1 untuk coding',
    ],
  },

  openai: {
    name: 'OpenAI',
    description: 'GPT models - Industry standard AI',
    website: 'https://platform.openai.com',
    pricing: 'Pay-as-you-go (from $0.50/1M tokens)',
    freeCredits: '$5 free credits for new users',
    apiKeyUrl: 'https://platform.openai.com/api-keys',
    signupUrl: 'https://platform.openai.com/signup',
    docsUrl: 'https://platform.openai.com/docs',
    envVar: 'OPENAI_API_KEY',
    apiKeyFile: '.openai_api_key',
    steps: [
      '1. Buka https://platform.openai.com/signup',
      '2. Daftar dengan Google/Microsoft/email',
      '3. Verifikasi nomor telepon',
      '4. Buka API Keys di menu',
      '5. Klik "Create new secret key"',
      '6. Copy dan simpan (hanya ditampilkan sekali!)',
    ],
    tips: [
      '💡 GPT-4.1 untuk coding terbaik',
      '💡 GPT-4o-mini untuk harga murah',
      '💡 Set billing limit untuk kontrol budget',
    ],
  },

  anthropic: {
    name: 'Anthropic (Claude)',
    description: 'Claude models - Best for coding & reasoning',
    website: 'https://console.anthropic.com',
    pricing: 'Pay-as-you-go (Sonnet: $3/$15 per 1M tokens)',
    freeCredits: '$5 free credits for new users',
    apiKeyUrl: 'https://console.anthropic.com/settings/keys',
    signupUrl: 'https://console.anthropic.com',
    docsUrl: 'https://docs.anthropic.com',
    envVar: 'ANTHROPIC_API_KEY',
    apiKeyFile: '.anthropic_api_key',
    steps: [
      '1. Buka https://console.anthropic.com',
      '2. Sign up dengan email',
      '3. Verifikasi email',
      '4. Buka Settings → API Keys',
      '5. Klik "Create Key"',
      '6. Copy API key (dimulai dengan sk-ant-)',
    ],
    tips: [
      '💡 Claude Opus 4 = coding terbaik di dunia',
      '💡 Claude Sonnet 4 = balance harga & performa',
      '💡 200k context window',
    ],
  },

  gemini: {
    name: 'Google Gemini',
    description: 'Google AI - Multimodal & long context',
    website: 'https://aistudio.google.com',
    pricing: 'FREE tier available! (15 RPM)',
    freeCredits: 'FREE tier dengan limit',
    apiKeyUrl: 'https://aistudio.google.com/app/apikey',
    signupUrl: 'https://aistudio.google.com',
    docsUrl: 'https://ai.google.dev/gemini-api/docs',
    envVar: 'GEMINI_API_KEY',
    apiKeyFile: '.gemini_api_key',
    steps: [
      '1. Buka https://aistudio.google.com/app/apikey',
      '2. Login dengan akun Google',
      '3. Klik "Create API Key"',
      '4. Pilih project (atau buat baru)',
      '5. Copy API key',
    ],
    tips: [
      '💡 GRATIS untuk penggunaan dasar!',
      '💡 Gemini 2.0 Flash = cepat & gratis',
      '💡 1M token context window',
    ],
  },

  xai: {
    name: 'xAI (Grok)',
    description: "Grok models by Elon Musk's xAI",
    website: 'https://console.x.ai',
    pricing: 'Pay-as-you-go ($2/$10 per 1M tokens)',
    freeCredits: '$25 free credits monthly',
    apiKeyUrl: 'https://console.x.ai/team/default/api-keys',
    signupUrl: 'https://accounts.x.ai/sign-up',
    docsUrl: 'https://docs.x.ai/docs',
    envVar: 'XAI_API_KEY',
    apiKeyFile: '.xai_api_key',
    steps: [
      '1. Buka https://console.x.ai',
      '2. Sign up / Login',
      '3. Top up credits jika perlu',
      '4. Buka API Keys',
      '5. Klik "Create New Key"',
      '6. Copy dan simpan key',
    ],
    tips: [
      '💡 $25 gratis setiap bulan!',
      '💡 Grok 3 = 1M context window',
      '💡 Integrasi dengan X/Twitter data',
    ],
  },

  deepseek: {
    name: 'DeepSeek',
    description: 'Chinese AI - Excellent reasoning & coding',
    website: 'https://platform.deepseek.com',
    pricing: 'Very cheap ($0.14/$0.28 per 1M tokens)',
    freeCredits: 'Free tier available',
    apiKeyUrl: 'https://platform.deepseek.com/api_keys',
    signupUrl: 'https://platform.deepseek.com/sign_up',
    docsUrl: 'https://platform.deepseek.com/docs',
    envVar: 'DEEPSEEK_API_KEY',
    apiKeyFile: '.deepseek_api_key',
    steps: [
      '1. Buka https://platform.deepseek.com/sign_up',
      '2. Daftar dengan email',
      '3. Verifikasi email',
      '4. Buka API Keys',
      '5. Create new API key',
    ],
    tips: [
      '💡 SANGAT MURAH - cocok untuk budget terbatas',
      '💡 DeepSeek Coder = spesialis coding',
      '💡 DeepSeek R1 = reasoning kuat',
    ],
  },

  groq: {
    name: 'Groq',
    description: 'Ultra-fast inference on LPU hardware',
    website: 'https://console.groq.com',
    pricing: 'FREE tier with limits',
    freeCredits: 'FREE - generous limits',
    apiKeyUrl: 'https://console.groq.com/keys',
    signupUrl: 'https://console.groq.com',
    docsUrl: 'https://console.groq.com/docs',
    envVar: 'GROQ_API_KEY',
    apiKeyFile: '.groq_api_key',
    steps: [
      '1. Buka https://console.groq.com',
      '2. Sign up dengan email/Google',
      '3. Buka API Keys',
      '4. Create API Key',
      '5. Copy key',
    ],
    tips: [
      '💡 GRATIS & SANGAT CEPAT!',
      '💡 Llama 3.3 70B gratis',
      '💡 Perfect untuk testing & development',
    ],
  },

  ollama: {
    name: 'Ollama (Local)',
    description: 'Local LLM hosting - Free & private',
    website: 'https://ollama.ai',
    pricing: 'FREE - runs on your machine',
    freeCredits: 'Completely FREE',
    apiKeyUrl: null,
    signupUrl: 'https://ollama.ai/download',
    docsUrl: 'https://ollama.ai/docs',
    envVar: null,
    steps: [
      '1. Install Ollama: curl -fsSL https://ollama.ai/install.sh | sh',
      '2. Jalankan: ollama serve',
      '3. Download model: ollama pull llama3.2',
      '4. Tidak perlu API key!',
    ],
    tips: [
      '💡 100% GRATIS & PRIVATE',
      '💡 Data tidak dikirim ke cloud',
      '💡 Butuh GPU/RAM besar untuk model besar',
    ],
  },

  glm: {
    name: 'GLM / ZhipuAI',
    description: 'Chinese GLM models',
    website: 'https://z.ai',
    pricing: 'Coding Plan: $3/month',
    freeCredits: 'Free trial available',
    apiKeyUrl: 'https://z.ai/manage-apikey/apikey-list',
    signupUrl: 'https://z.ai/model-api',
    docsUrl: 'https://docs.z.ai',
    envVar: 'GLM_API_KEY',
    apiKeyFile: '.glm_api_key',
    steps: [
      '1. Buka https://z.ai/model-api',
      '2. Register / Login',
      '3. Buka Billing → Top up jika perlu',
      '4. Buka API Keys',
      '5. Create new API key',
    ],
    tips: [
      '💡 GLM Coding Plan = $3/bulan unlimited',
      '💡 Compatible dengan Claude Code',
      '💡 GLM-4.7 untuk coding',
    ],
  },

  mistral: {
    name: 'Mistral AI',
    description: 'European AI - Open weights available',
    website: 'https://console.mistral.ai',
    pricing: 'Pay-as-you-go',
    freeCredits: 'Free tier available',
    apiKeyUrl: 'https://console.mistral.ai/api-keys',
    signupUrl: 'https://console.mistral.ai',
    docsUrl: 'https://docs.mistral.ai',
    envVar: 'MISTRAL_API_KEY',
    apiKeyFile: '.mistral_api_key',
    steps: [
      '1. Buka https://console.mistral.ai',
      '2. Sign up dengan email',
      '3. Buka API Keys',
      '4. Create new key',
    ],
    tips: [
      '💡 Codestral = coding specialist',
      '💡 Open weights tersedia',
      '💡 European company - GDPR compliant',
    ],
  },

  perplexity: {
    name: 'Perplexity',
    description: 'Search-augmented AI with real-time data',
    website: 'https://www.perplexity.ai',
    pricing: 'Pay-as-you-go',
    freeCredits: 'Free tier available',
    apiKeyUrl: 'https://www.perplexity.ai/settings/api',
    signupUrl: 'https://www.perplexity.ai',
    docsUrl: 'https://docs.perplexity.ai',
    envVar: 'PERPLEXITY_API_KEY',
    apiKeyFile: '.perplexity_api_key',
    steps: [
      '1. Buka https://www.perplexity.ai',
      '2. Sign up / Login',
      '3. Buka Settings → API',
      '4. Generate API key',
    ],
    tips: [
      '💡 Real-time internet search',
      '💡 Sonar Pro = search + reasoning',
      '💡 Great untuk riset & fact-checking',
    ],
  },

  openrouter: {
    name: 'OpenRouter',
    description: 'Multi-provider aggregator - Access all models',
    website: 'https://openrouter.ai',
    pricing: 'Pay-as-you-go (varies by model)',
    freeCredits: 'Some free models available',
    apiKeyUrl: 'https://openrouter.ai/settings/keys',
    signupUrl: 'https://openrouter.ai',
    docsUrl: 'https://openrouter.ai/docs',
    envVar: 'OPENROUTER_API_KEY',
    apiKeyFile: '.openrouter_api_key',
    steps: [
      '1. Buka https://openrouter.ai',
      '2. Sign in dengan Google/GitHub',
      '3. Buka Settings → Keys',
      '4. Create API key',
      '5. Add credits jika perlu',
    ],
    tips: [
      '💡 Akses SEMUA model dari 1 API key',
      '💡 Beberapa model gratis!',
      '💡 Great untuk testing berbagai model',
    ],
  },
};

// Get provider setup guide
export function getProviderGuide(providerId: string): ProviderInfoItem | null {
  return PROVIDER_INFO[providerId] || null;
}

// Get all providers with free tiers
export function getFreeProviders(): Array<{ id: string } & ProviderInfoItem> {
  return Object.entries(PROVIDER_INFO)
    .filter(([, info]) =>
      info.pricing.toLowerCase().includes('free') ||
      info.freeCredits.toLowerCase().includes('free')
    )
    .map(([id, info]) => ({ id, ...info }));
}

// Format provider info for display
export function formatProviderGuide(providerId: string): string | null {
  const info = PROVIDER_INFO[providerId];
  if (!info) return null;

  const guide = `
╔══════════════════════════════════════════════════════════════╗
║  ${info.name.toUpperCase().padEnd(56)}  ║
╚══════════════════════════════════════════════════════════════╝

📝 ${info.description}

💰 PRICING:
   ${info.pricing}
   ${info.freeCredits}

🔗 LINKS:
   Website:  ${info.website}
   Sign Up:  ${info.signupUrl}
   API Key:  ${info.apiKeyUrl || 'Not required'}
   Docs:     ${info.docsUrl}

📋 CARA MENDAPATKAN API KEY:
${info.steps.map(s => `   ${s}`).join('\n')}

💡 TIPS:
${info.tips.map(t => `   ${t}`).join('\n')}

🔐 ENVIRONMENT VARIABLE:
   ${info.envVar ? `export ${info.envVar}=your_api_key_here` : 'Tidak perlu API key'}
`;

  return guide;
}

// Quick reference for all providers
export function getAllProvidersQuickRef(): string {
  const ref = `
╔══════════════════════════════════════════════════════════════╗
║              🔌 AI PROVIDERS QUICK REFERENCE                 ║
╚══════════════════════════════════════════════════════════════╝

Provider        │ Pricing              │ Best For
────────────────┼──────────────────────┼─────────────────────
🆓 Gemini       │ FREE tier!           │ General, Multimodal
🆓 Groq         │ FREE & FAST!         │ Testing, Speed
🆓 Ollama       │ FREE (local)         │ Privacy, Offline
💰 DeepSeek     │ $0.14/1M tokens      │ Budget coding
💰 MiniMax      │ $3/month plan        │ Coding
💰 GLM          │ $3/month plan        │ Coding (Chinese)
💰 xAI          │ $25 free/month       │ Grok, X integration
💰 OpenAI       │ $0.50+/1M tokens     │ GPT, Industry std
💰 Anthropic    │ $3+/1M tokens        │ Claude, Best coding
💰 Mistral      │ Pay-as-you-go        │ European, Open
💰 Perplexity   │ Pay-as-you-go        │ Search, Research
💰 OpenRouter   │ Varies               │ All models in 1

🌟 RECOMMENDED FOR BEGINNERS:
   1. Gemini (FREE) - https://aistudio.google.com/app/apikey
   2. Groq (FREE)   - https://console.groq.com/keys
   3. DeepSeek      - https://platform.deepseek.com (CHEAP!)

📖 Use /provider <name> to see detailed setup guide
`;
  return ref;
}

export default PROVIDER_INFO;
