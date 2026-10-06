/**
 * Google AI Studio / Gemini API Adapter for Gemma Open Models
 * Endpoint: v1beta/models/{model}:generateContent
 */

export function extractJsonFromResponse(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Empty model response');
  }

  // 1. Strip markdown code fences if present (```json ... ``` or ``` ... ```)
  let cleaned = rawText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  // 2. Locate outermost JSON object {...}
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    cleaned = match[0];
  }

  // 3. Parse JSON
  return JSON.parse(cleaned);
}

export async function callGemmaApi({
  apiKey,
  model = 'gemma-3-27b-it',
  prompt,
  systemRules = ''
}) {
  if (!apiKey) {
    throw new Error('GEMMA_API_KEY is missing');
  }

  // Ensure prompt includes system rules in the user turn
  const fullUserPrompt = systemRules ? `${systemRules}\n\n${prompt}` : prompt;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [{ text: fullUserPrompt }]
      }
    ],
    generationConfig: {
      temperature: 0.3,
      topK: 40,
      topP: 0.85,
      maxOutputTokens: 1500
    }
  };

  const executeCall = async body => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(25000)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemma API HTTP ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('No candidate content returned by Gemma model');
    }
    return text;
  };

  // Turn 1
  const firstResponse = await executeCall(requestBody);

  try {
    return extractJsonFromResponse(firstResponse);
  } catch (parseErr) {
    console.warn('[Gemma] Turn 1 JSON parse failed, retrying with syntax repair...', parseErr.message);

    // Turn 2: Retry with correction prompt
    const repairBody = {
      contents: [
        {
          role: 'user',
          parts: [{ text: fullUserPrompt }]
        },
        {
          role: 'model',
          parts: [{ text: firstResponse }]
        },
        {
          role: 'user',
          parts: [
            {
              text: 'Your response was not valid JSON. Please fix syntax errors (e.g. unescaped quotes or trailing commas) and return ONLY the valid JSON object:'
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1500
      }
    };

    const repairedResponse = await executeCall(repairBody);
    return extractJsonFromResponse(repairedResponse);
  }
}
