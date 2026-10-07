/**
 * Meta MMS-TTS Open-Weight Text-to-Speech Provider
 * Uses facebook/mms-tts-ben (Bengali) and facebook/mms-tts-eng (English).
 * Calls Hugging Face Serverless Inference API with optional HF_TOKEN.
 * License: CC-BY-NC 4.0 (Non-commercial open weights).
 */

export const MMS_MODELS = {
  bn: 'facebook/mms-tts-ben',
  en: 'facebook/mms-tts-eng'
};

export async function synthesizeWithMms({
  text,
  language = 'en',
  hfToken = '',
  maxRetries = 1
}) {
  const cleanText = String(text || '').trim();
  if (!cleanText) {
    throw new Error('Empty text provided for MMS TTS');
  }

  const model = language === 'bn' ? MMS_MODELS.bn : MMS_MODELS.en;
  const routerUrl = `https://router.huggingface.co/hf-inference/models/${model}`;
  const legacyUrl = `https://api-inference.huggingface.co/models/${model}`;

  const headers = {
    'Content-Type': 'application/json'
  };

  if (hfToken) {
    headers['Authorization'] = `Bearer ${hfToken}`;
  }

  let lastError = null;

  for (const url of [routerUrl, legacyUrl]) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ inputs: cleanText }),
        signal: AbortSignal.timeout(20000)
      });

      if (!res.ok) {
        const errText = await res.text();
        const err = new Error(`MMS-TTS (${model}) HTTP ${res.status}: ${errText.slice(0, 200)}`);
        err.status = res.status;
        throw err;
      }

      const contentType = res.headers.get('content-type') || 'audio/flac';
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      return {
        buffer,
        contentType,
        provider: 'mms',
        model
      };
    } catch (err) {
      lastError = err;
      // If 401 Unauthorized (HF token required) or not found, try legacy or fall through
      if (err.status === 401 || err.status === 403) {
        break; // Stop attempting if unauthenticated
      }
    }
  }

  throw lastError || new Error(`MMS-TTS failed for ${model}`);
}
