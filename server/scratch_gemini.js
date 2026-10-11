import { GoogleGenAI } from '@google/genai';
import { env } from './src/config/env.js';

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

const testModels = [
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-flash-latest',
  'gemini-3.1-flash-lite',
];

for (const model of testModels) {
  try {
    const res = await ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: 'Hello, respond {"ok":true}' }] }],
      config: { responseMimeType: 'application/json' },
    });
    console.log(`>>> MODEL ${model} WORKS! Response:`, res.text.trim());
    break;
  } catch (err) {
    console.log(`--- ${model}: ${err.status || err.message?.slice(0, 80)}`);
  }
}
