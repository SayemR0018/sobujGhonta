import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeAudioHash,
  checkRateLimit,
  resetRateLimits,
  MAX_CHARACTERS_PER_SEGMENT,
  saveAudioToCache,
  getCachedAudio
} from '../services/tts/cache.js';
import { wrapPcmWithWavHeader } from '../services/tts/gemini.js';
import { synthesizeSpeech } from '../services/tts/index.js';

describe('Free Text-to-Speech (TTS) Provider Chain & Caching', () => {
  beforeEach(() => {
    resetRateLimits();
  });

  test('Deterministic audio hashing across identical inputs', () => {
    const text = 'Take a deep breath and observe the green canopy.';
    const h1 = computeAudioHash(text, 'Kore', 'en', 'gemini');
    const h2 = computeAudioHash(text, 'Kore', 'en', 'gemini');
    const hDiffVoice = computeAudioHash(text, 'Puck', 'en', 'gemini');
    const hDiffLang = computeAudioHash(text, 'Kore', 'bn', 'gemini');

    assert.equal(h1, h2);
    assert.notEqual(h1, hDiffVoice);
    assert.notEqual(h1, hDiffLang);
    assert.equal(h1.length, 64);
  });

  test('Oversized input exceeding 450 characters is rejected', async () => {
    const hugeText = 'A'.repeat(MAX_CHARACTERS_PER_SEGMENT + 10);
    await assert.rejects(
      async () => {
        await synthesizeSpeech({ text: hugeText });
      },
      /Text exceeds maximum allowed length/
    );
  });

  test('Empty or whitespace input is rejected', async () => {
    await assert.rejects(
      async () => {
        await synthesizeSpeech({ text: '   ' });
      },
      /Text is required/
    );
  });

  test('Per-IP sliding window rate limit enforces max 30 requests', () => {
    const testIp = '192.168.1.99';
    for (let i = 0; i < 30; i++) {
      assert.equal(checkRateLimit(testIp), true, `Request ${i + 1} should be allowed`);
    }
    // 31st request must be denied
    assert.equal(checkRateLimit(testIp), false, 'Request 31 must be blocked by rate limiter');
  });

  test('Wrap PCM utility creates valid 44-byte RIFF/WAVE header', () => {
    const mockPcm = Buffer.alloc(2400, 0x10); // 2400 bytes of dummy PCM
    const wav = wrapPcmWithWavHeader(mockPcm, 24000, 1, 16);

    assert.equal(wav.length, 44 + 2400);
    assert.equal(wav.slice(0, 4).toString('ascii'), 'RIFF');
    assert.equal(wav.slice(8, 12).toString('ascii'), 'WAVE');
    assert.equal(wav.slice(12, 16).toString('ascii'), 'fmt ');
    assert.equal(wav.slice(36, 40).toString('ascii'), 'data');
    assert.equal(wav.readUInt32LE(40), 2400); // Subchunk2Size matches PCM data length
  });

  test('Explicit browser provider immediately returns client Web Speech fallback signal', async () => {
    const result = await synthesizeSpeech({
      text: 'Stow your phone in your pocket.',
      language: 'en',
      providerOverride: 'browser'
    });

    assert.equal(result.fallbackToBrowser, true);
    assert.equal(result.provider, 'browser_web_speech');
    assert.equal(result.text, 'Stow your phone in your pocket.');
  });

  test('Explicit none provider disables TTS and signals browser fallback', async () => {
    const result = await synthesizeSpeech({
      text: 'Quiet reflection.',
      providerOverride: 'none'
    });

    assert.equal(result.fallbackToBrowser, true);
    assert.equal(result.provider, 'disabled');
  });

  test('Disk cache hit serves stored buffer on duplicate request', async () => {
    const uniqueText = `Mindful test observation ${Date.now()}`;
    const hash = computeAudioHash(uniqueText, 'Kore', 'en', 'auto');
    const mockAudioData = Buffer.from('RIFF....mock-audio-data-payload');

    // Seed disk cache
    await saveAudioToCache(hash, mockAudioData, '.wav');

    // Query TTS orchestrator
    const result = await synthesizeSpeech({
      text: uniqueText,
      voice: 'Kore',
      language: 'en',
      providerOverride: 'auto'
    });

    assert.equal(result.cached, true);
    assert.equal(result.provider, 'disk_cache');
    assert.equal(result.audioBuffer.toString(), mockAudioData.toString());
  });

  test('Graceful fallback to browser speech when remote providers fail', async () => {
    // Calling with non-existent provider forces fallback to browser Web Speech
    const result = await synthesizeSpeech({
      text: 'Walking under tree canopy',
      language: 'bn',
      providerOverride: 'mms' // Without HF_TOKEN or when router 401s, must fall back cleanly
    });

    assert.equal(result.fallbackToBrowser, true);
    assert.equal(result.language, 'bn');
    assert.equal(typeof result.reason, 'string');
  });
});
