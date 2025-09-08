import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function loadAppConfig() {
  const cfg = {
    LLM_PROVIDER: process.env.LLM_PROVIDER || 'gemini',
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
    GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  };

  // Fallback to config/local.json if present
  try {
    const localPath = path.join(__dirname, 'local.json');
    if (fs.existsSync(localPath)) {
      const raw = fs.readFileSync(localPath, 'utf8');
      const json = JSON.parse(raw);
      if (json.LLM_PROVIDER) cfg.LLM_PROVIDER = json.LLM_PROVIDER;
      if (json.GEMINI_API_KEY) cfg.GEMINI_API_KEY = json.GEMINI_API_KEY;
      if (json.GEMINI_MODEL) cfg.GEMINI_MODEL = json.GEMINI_MODEL;
    }
  } catch (e) {
    // ignore
  }

  return cfg;
}


