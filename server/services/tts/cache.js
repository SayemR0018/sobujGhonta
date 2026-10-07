import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const AUDIO_CACHE_DIR = path.resolve(__dirname, '../../cache/audio');
export const DEMO_AUDIO_DIRS = [
  path.resolve(__dirname, '../../../client/public/demo-audio'),
  path.resolve(__dirname, '../../../client/dist/demo-audio')
];

// Sliding window per-IP rate limiting (max 30 requests per 10 mins)
const ipRateLimits = new Map();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 30;
export const MAX_CHARACTERS_PER_SEGMENT = 450;

/**
 * Checks sliding-window per-IP rate limit
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
 * Resets rate limit map (useful for test isolation)
 */
export function resetRateLimits() {
  ipRateLimits.clear();
}

/**
 * Computes deterministic SHA-256 hash for audio caching
 */
export function computeAudioHash(text, voice = 'default', lang = 'en', provider = 'auto') {
  const normText = String(text || '').trim();
  return crypto
    .createHash('sha256')
    .update(`${normText}|${voice}|${lang}|${provider}`)
    .digest('hex');
}

/**
 * Ensures cache directory exists
 */
export async function ensureCacheDir() {
  try {
    await fs.mkdir(AUDIO_CACHE_DIR, { recursive: true });
  } catch (err) {
    // Directory exists or created
  }
}

/**
 * Reads audio file from disk cache if it exists, checking cache dir and demo audio dirs
 */
export async function getCachedAudio(hash) {
  const searchDirs = [AUDIO_CACHE_DIR, ...DEMO_AUDIO_DIRS];
  const extensions = ['.wav', '.mp3', '.flac', '.ogg'];

  for (const dir of searchDirs) {
    for (const ext of extensions) {
      const filePath = path.join(dir, `${hash}${ext}`);
      try {
        const buffer = await fs.readFile(filePath);
        const contentType = ext === '.wav' ? 'audio/wav' : ext === '.mp3' ? 'audio/mpeg' : ext === '.flac' ? 'audio/flac' : 'audio/ogg';
        return { buffer, contentType, filePath };
      } catch {
        // Not found, check next
      }
    }
  }

  return null;
}

/**
 * Saves audio buffer to disk cache
 */
export async function saveAudioToCache(hash, buffer, extension = '.wav') {
  await ensureCacheDir();
  const filePath = path.join(AUDIO_CACHE_DIR, `${hash}${extension}`);
  await fs.writeFile(filePath, buffer);
  return filePath;
}
