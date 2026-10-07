/**
 * Sarvam AI Bengali TTS Provider (Optional)
 * Activated only if SARVAM_API_KEY is explicitly supplied.
 */

export async function synthesizeWithSarvam({
  text,
  apiKey,
  language = 'bn'
}) {
  if (!apiKey) {
    throw new Error('SARVAM_API_KEY is not configured');
  }

  const cleanText = String(text || '').trim();
  if (!cleanText) {
    throw new Error('Empty text provided for Sarvam TTS');
  }

  const targetLangCode = language === 'bn' ? 'bn-IN' : 'en-IN';
  const url = 'https://api.sarvam.ai/text-to-speech';

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'api-subscription-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      inputs: [cleanText],
      target_language_code: targetLangCode,
      speaker: 'meera',
      pitch: 0,
      pace: 0.95,
      loudness: 1.0,
      speech_sample_rate: 22050,
      enable_preprocessing: true,
      model: 'bulbul:v1'
    }),
    signal: AbortSignal.timeout(15000)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Sarvam TTS HTTP ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const base64Audio = data.audios?.[0];
  if (!base64Audio) {
    throw new Error('Sarvam TTS returned no audio data');
  }

  const buffer = Buffer.from(base64Audio, 'base64');
  return {
    buffer,
    contentType: 'audio/wav',
    provider: 'sarvam',
    model: 'bulbul:v1'
  };
}
