import { GoogleGenerativeAI } from '@google/generative-ai';

function toGeminiContents(history) {
  // history: array of { role: 'system'|'user'|'assistant', text }
  // Gemini expects only 'user' or 'model'. We'll omit explicit system entries from contents; use systemInstruction.
  const contents = [];
  for (const entry of history) {
    if (entry.role === 'system') continue;
    const role = entry.role === 'assistant' ? 'model' : 'user';
    contents.push({ role, parts: [{ text: entry.text || '' }] });
  }
  return contents;
}

export class GeminiProvider {
  constructor({ apiKey, model }) {
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY eksik');
    }
    this.modelName = model || 'gemini-1.5-pro';
    this.client = new GoogleGenerativeAI(apiKey);
  }

  createSession(systemInstruction) {
    const provider = this;
    const model = provider.client.getGenerativeModel({
      model: provider.modelName,
      systemInstruction,
    });

    return {
      async send(historyOrNewMessages) {
        // Accept either full history or just new user message array
        const history = Array.isArray(historyOrNewMessages)
          ? historyOrNewMessages
          : [historyOrNewMessages];

        const contents = toGeminiContents(history);
        const result = await model.generateContent({ contents });
        const response = await result.response;
        const text = response.text();
        return { reply: text };
      },
    };
  }
}


