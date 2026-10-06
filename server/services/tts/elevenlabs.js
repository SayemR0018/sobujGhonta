import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AUDIO_CACHE_DIR = path.resolve(__dirname, '../../cache/audio');

// Sliding window per-IP rate limiting (max 30 requests per 10 mins)
const ipRateLimits = new Map();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 30;
const MAX_CHARACTERS_PER_SEGMENT = 450;

/**
 * Checks per-IP rate limit
 */
export function checkRateLimit(clientIp) {
  const now = Date.now();
  const record = ipRateLimits.get(clientIp) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW_MS };

  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + RATE_LIMIT_WINDOW_MS;
    ipRateLimits.set(clientIp, record);
    return true;
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  record.count += 1;
  ipRateLimits.set(clientIp, record);
  return true;
}

/**
 * Computes deterministic SHA-256 hash for audio clip caching
 */
export function computeAudioHash(text, voiceId, lang, model) {
  const normText = String(text || '').trim();
  return crypto
    .createHash('sha256')
    .update(`${normText}|${voiceId}|${lang}|${model}`)
    .digest('hex');
}

/**
 * Synthesizes audio using ElevenLabs or serves from disk cache
 */
export async function synthesizeSpeech({
  text,
  voiceId = config.elevenlabsVoiceId,
  language = 'en',
  clientIp = '127.0.0.1'
}) {
  const cleanText = String(text || '').trim();
  if (!cleanText) {
    throw new Error('Text is required for TTS synthesis');
  }

  if (cleanText.length > MAX_CHARACTERS_PER_SEGMENT) {
    throw new Error(`Text exceeds maximum allowed length of ${MAX_CHARACTERS_PER_SEGMENT} characters`);
  }

  if (!checkRateLimit(clientIp)) {
    throw new Error('Rate limit exceeded: Please wait a few minutes before generating more audio clips.');
  }

  const model = config.elevenlabsModel;
  const hash = computeAudioHash(cleanText, voiceId, language, model);
  const cacheFilePath = path.join(AUDIO_CACHE_DIR, `${hash}.mp3`);

  // 1. Check if cached audio file already exists on disk
  try {
    const cachedBuffer = await fs.readFile(cacheFilePath);
    return {
      hash,
      cached: true,
      audioBuffer: cachedBuffer,
      contentType: 'audio/mpeg',
      provider: 'elevenlabs_cache'
    };
  } catch {
    // Cache miss, proceed to generate
  }

  // 2. If no ElevenLabs API key, signal browser Web Speech API fallback
  if (!config.elevenlabsApiKey || config.ttsProvider === 'browser') {
    return {
      hash,
      cached: false,
      fallbackToBrowser: true,
      text: cleanText,
      language,
      provider: 'browser_web_speech'
    };
  }

  // 3. Call ElevenLabs API
  try {
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': config.elevenlabsApiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg'
      },
      body: JSON.stringify({
        text: cleanText,
        model_id: model,
        voice_settings: {
          stability: 0.55,
          similarity_boost: 0.75,
          style: 0.15,
          use_speaker_boost: true
        }
      }),
      signal: AbortSignal.timeout(20000)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`ElevenLabs HTTP ${res.status}: ${errText}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Write to cache directory asynchronously
    await fs.writeFile(cacheFilePath, buffer).catch(err => {
      console.warn('[TTS] Failed to write audio cache:', err.message);
    });

    return {
      hash,
      cached: false,
      audioBuffer: buffer,
      contentType: 'audio/mpeg',
      provider: 'elevenlabs'
    };
  } catch (err) {
    console.warn('[TTS] ElevenLabs call failed:', err.message, '— falling back to browser Web Speech API.');
    return {
      hash,
      cached: false,
      fallbackToBrowser: true,
      text: cleanText,
      language,
      provider: 'browser_web_speech',
      reason: err.message
    };
  }
}
