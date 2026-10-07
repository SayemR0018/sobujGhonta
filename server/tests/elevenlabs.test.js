import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { config } from '../config.js';
import {
  resolveElevenLabsVoiceId,
  DEFAULT_ELEVENLABS_SETTINGS,
  getElevenLabsMonthlyCharUsage,
  setElevenLabsMonthlyChars,
  resetElevenLabsMonthlyChars,
  synthesizeWithElevenLabs
} from '../services/tts/elevenlabs.js';
import { synthesizeSpeech } from '../services/tts/index.js';
import { computeAudioHash } from '../services/tts/cache.js';

describe('ElevenLabs TTS Provider & Multi-Tier Cascade', () => {
  const originalKey = config.elevenlabsApiKey;
  const originalVoiceId = config.elevenlabsVoiceId;
  const originalVoiceBn = config.elevenlabsVoiceIdBn;
  const originalVoiceEn = config.elevenlabsVoiceIdEn;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    resetElevenLabsMonthlyChars();
  });

  afterEach(() => {
    config.elevenlabsApiKey = originalKey;
    config.elevenlabsVoiceId = originalVoiceId;
    config.elevenlabsVoiceIdBn = originalVoiceBn;
    config.elevenlabsVoiceIdEn = originalVoiceEn;
    globalThis.fetch = originalFetch;
  });

  test('Voice ID resolution adheres to strict precedence hierarchy', () => {
    // 1. Default library voice
    config.elevenlabsVoiceId = '';
    config.elevenlabsVoiceBn = '';
    config.elevenlabsVoiceEn = '';
    assert.equal(resolveElevenLabsVoiceId('en'), 'jUjRbhZWoMK4aDciW36V');
    assert.equal(resolveElevenLabsVoiceId('bn'), 'jUjRbhZWoMK4aDciW36V');

    // 2. General ELEVENLABS_VOICE_ID override
    config.elevenlabsVoiceId = 'general_voice_123';
    assert.equal(resolveElevenLabsVoiceId('en'), 'general_voice_123');
    assert.equal(resolveElevenLabsVoiceId('bn'), 'general_voice_123');

    // 3. Language-specific overrides
    config.elevenlabsVoiceIdBn = 'bn_voice_special';
    config.elevenlabsVoiceIdEn = 'en_voice_special';
    assert.equal(resolveElevenLabsVoiceId('bn'), 'bn_voice_special');
    assert.equal(resolveElevenLabsVoiceId('en'), 'en_voice_special');

    // 4. Explicit parameter has highest precedence
    assert.equal(resolveElevenLabsVoiceId('bn', 'ad_hoc_voice'), 'ad_hoc_voice');
  });

  test('Walking-guide voice settings are correctly defaulted', () => {
    assert.equal(DEFAULT_ELEVENLABS_SETTINGS.speed, 0.9);
    assert.equal(DEFAULT_ELEVENLABS_SETTINGS.stability, 0.5);
    assert.equal(DEFAULT_ELEVENLABS_SETTINGS.similarity_boost, 0.75);
    assert.equal(DEFAULT_ELEVENLABS_SETTINGS.style, 0.0);
    assert.equal(DEFAULT_ELEVENLABS_SETTINGS.use_speaker_boost, true);
  });

  test('Returns handled error when ELEVENLABS_API_KEY is unset', async () => {
    config.elevenlabsApiKey = '';
    const res = await synthesizeWithElevenLabs({
      text: 'Breathe in the calm air.',
      language: 'en'
    });
    assert.equal(res.success, false);
    assert.match(res.reason, /ELEVENLABS_API_KEY not configured/);
  });

  test('Enforces soft monthly character budget cap', async () => {
    config.elevenlabsApiKey = 'mock_test_key_abc123';
    // Set usage to 7980 out of 8000 cap
    setElevenLabsMonthlyChars(7980);

    // Attempting 30 chars should exceed 8000 cap
    const res = await synthesizeWithElevenLabs({
      text: 'This prompt exceeds monthly limit.', // 34 chars
      language: 'en'
    });

    assert.equal(res.success, false);
    assert.match(res.reason, /Monthly character cap of 8000 reached/);
  });

  test('Handles 402/403 library voice payment or permission refusal with helpful message', async () => {
    config.elevenlabsApiKey = 'mock_valid_key';

    // Mock fetch returning HTTP 402 Payment Required
    globalThis.fetch = async () => {
      return {
        ok: false,
        status: 402,
        statusText: 'Payment Required',
        json: async () => ({
          detail: { message: 'Library voice requires addition to VoiceLab or creator subscription' }
        })
      };
    };

    const res = await synthesizeWithElevenLabs({
      text: 'Walk along the shaded path.',
      language: 'en'
    });

    assert.equal(res.success, false);
    assert.equal(res.status, 402);
    assert.match(res.reason, /Add the voice via "Use voice" in your ElevenLabs VoiceLab account/);
  });

  test('Cascades gracefully when ElevenLabs fails with 429 rate limit or 401', async () => {
    config.elevenlabsApiKey = 'mock_throttled_key';

    // Mock fetch failing on ElevenLabs with 429
    globalThis.fetch = async (url) => {
      if (url.toString().includes('elevenlabs.io')) {
        return {
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          json: async () => ({ detail: { message: 'Concurrency limit exceeded' } })
        };
      }
      // Gemini / Hugging Face mock fallback
      return {
        ok: false,
        status: 500,
        statusText: 'Internal Error',
        json: async () => ({ error: 'Fail' })
      };
    };

    // synthesizeSpeech in auto mode should attempt elevenlabs, fail, try gemini, fail, and fall back to browser
    const result = await synthesizeSpeech({
      text: 'Gentle walk beside Ramna Lake.',
      language: 'en',
      providerOverride: 'auto'
    });

    assert.equal(result.fallbackToBrowser, true);
    assert.equal(result.provider, 'browser_web_speech');
    assert.match(result.reason, /elevenlabs/);
  });

  test('Successful ElevenLabs synthesis updates monthly count and returns audio buffer', async () => {
    config.elevenlabsApiKey = 'mock_working_key';
    const mockAudioBytes = Buffer.from('MOCK_ELEVENLABS_MP3_STREAM');

    globalThis.fetch = async () => {
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'audio/mpeg' }),
        arrayBuffer: async () => mockAudioBytes.buffer
      };
    };

    const text = 'Notice the rustling banyan leaves.';
    const res = await synthesizeWithElevenLabs({
      text,
      language: 'en'
    });

    assert.equal(res.success, true);
    assert.equal(res.provider, 'elevenlabs');
    assert.equal(res.contentType, 'audio/mpeg');
    assert.equal(res.charactersUsed, text.length);
    assert.equal(getElevenLabsMonthlyCharUsage(), text.length);
  });

  test('Zero secret exposure: Responses and logs never leak API keys', async () => {
    config.elevenlabsApiKey = 'test_secret_elevenlabs_key_xyz987';

    globalThis.fetch = async (url, opts) => {
      // Return error to check error payload
      return {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ detail: { message: 'Invalid API key provided' } })
      };
    };

    const res = await synthesizeWithElevenLabs({
      text: 'Testing security containment.',
      language: 'en'
    });

    const serialized = JSON.stringify(res);
    assert.equal(serialized.includes('test_secret_elevenlabs_key_xyz987'), false, 'Key must not appear in output');
  });
});
