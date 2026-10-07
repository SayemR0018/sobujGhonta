/**
 * Gemini API Text-to-Speech Provider
 * Uses Gemini 3.8 Flash TTS via Google AI Studio Interactions API.
 * Shares the same GEMMA_API_KEY / GEMINI_API_KEY.
 */

/**
 * Creates standard 44-byte WAV header for 16-bit PCM audio if needed
 */
export function wrapPcmWithWavHeader(pcmBuffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16) {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  header.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

/**
 * Synthesizes speech using Gemini 3.8 Flash TTS
 */
export async function synthesizeWithGemini({
  text,
  apiKey,
  model = 'gemini-3.8-flash-tts',
  voice = 'Kore',
  language = 'en',
  maxRetries = 1
}) {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY or GEMMA_API_KEY is not configured');
  }

  const cleanText = String(text || '').trim();
  if (!cleanText) {
    throw new Error('Empty text provided for Gemini TTS');
  }

  const style = language === 'bn'
    ? 'calm, meditative, warm, mindful outdoor walk narration in Bengali'
    : 'calm, meditative, gentle, mindful outdoor walk narration';

  const url = 'https://generativelanguage.googleapis.com/v1beta/interactions';
  const requestBody = {
    model,
    input: [
      {
        type: 'user_input',
        content: [
          {
            type: 'text',
            text: cleanText,
            annotations: [
              {
                type: 'speech_metadata',
                style
              }
            ]
          }
        ]
      }
    ],
    response_format: { type: 'audio' },
    generation_config: {
      speech_config: [
        { voice }
      ]
    }
  };

  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        // If quota limit (3 RPM free tier), wait 25.5s for rate limit window reset; otherwise exponential backoff
        const delayMs = lastError?.isQuota ? 25500 : Math.min(2000 * Math.pow(2, attempt - 1), 6000);
        console.warn(`[Gemini TTS] Waiting ${Math.round(delayMs / 1000)}s before retry attempt ${attempt + 1}...`);
        await new Promise(r => setTimeout(r, delayMs));
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'x-goog-api-key': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(25000)
      });

      if (!res.ok) {
        const errText = await res.text();
        const isQuota = res.status === 429 || errText.includes('RESOURCE_EXHAUSTED');
        const err = new Error(`Gemini TTS HTTP ${res.status}: ${errText}`);
        err.status = res.status;
        err.isQuota = isQuota;

        if (isQuota && attempt < maxRetries) {
          console.warn(`[Gemini TTS] Quota limit encountered (attempt ${attempt + 1}), backing off...`);
          lastError = err;
          continue;
        }

        throw err;
      }

      const data = await res.json();
      const outputStep = data.steps?.find(s => s.type === 'model_output');
      const audioPart = outputStep?.content?.find(c => c.type === 'audio');

      if (!audioPart || !audioPart.data) {
        throw new Error('Gemini TTS response contained no audio payload');
      }

      let buffer = Buffer.from(audioPart.data, 'base64');

      // Verify RIFF header; if raw PCM was returned, wrap with WAV header
      const hasRiff = buffer.length >= 4 && buffer.slice(0, 4).toString('ascii') === 'RIFF';
      if (!hasRiff) {
        buffer = wrapPcmWithWavHeader(buffer, 24000, 1, 16);
      }

      return {
        buffer,
        contentType: 'audio/wav',
        provider: 'gemini',
        model,
        voice
      };
    } catch (err) {
      lastError = err;
      if (err.isQuota && attempt < maxRetries) {
        continue;
      }
      break;
    }
  }

  throw lastError || new Error('Gemini TTS request failed');
}
