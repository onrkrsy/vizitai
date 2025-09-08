import { GeminiProvider } from './gemini.js';
import { OpenAIProvider } from './openai.js';
import { loadAppConfig } from '../config/index.js';

export function getProvider() {
  const cfg = loadAppConfig();
  const providerName = (cfg.LLM_PROVIDER || 'gemini').toLowerCase();
  switch (providerName) {
    case 'gemini':
    default:
      return new GeminiProvider({
        apiKey: cfg.GEMINI_API_KEY,
        model: cfg.GEMINI_MODEL || 'gemini-1.5-pro',
      });
    case 'openai':
      return new OpenAIProvider({});
  }
}


