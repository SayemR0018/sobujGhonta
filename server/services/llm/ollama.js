import { extractJsonFromResponse } from './gemmaApi.js';

/**
 * Local Ollama Adapter for running Gemma open-weights fully offline / local
 * Endpoint: POST /api/generate
 */
export async function callOllama({
  ollamaUrl = 'http://localhost:11434',
  model = 'gemma2:9b',
  prompt
}) {
  const url = `${ollamaUrl.replace(/\/+$/, '')}/api/generate`;

  const requestBody = {
    model,
    prompt,
    stream: false,
    format: 'json',
    options: {
      temperature: 0.3,
      num_predict: 1500
    }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(45000)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Ollama HTTP ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const text = data.response;
  if (!text) {
    throw new Error('Empty response from Ollama');
  }

  return extractJsonFromResponse(text);
}
