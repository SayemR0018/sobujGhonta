/**
 * Sobuj Ghonta (সবুজ ঘণ্টা) — Unified Free Text-to-Speech Provider Chain
 * Providers supported: auto | gemini | mms | sarvam | browser | none
 * Fallback order in auto: gemini -> mms -> (sarvam if key) -> browser
 */

import { config } from '../../config.js';
import {
  computeAudioHash,
  getCachedAudio,
  saveAudioToCache,
  checkRateLimit,
  MAX_CHARACTERS_PER_SEGMENT
} from './cache.js';
import { synthesizeWithElevenLabs, resolveElevenLabsVoiceId } from './elevenlabs.js';
import { synthesizeWithGemini } from './gemini.js';
import { synthesizeWithMms } from './mms.js';
import { synthesizeWithSarvam } from './sarvam.js';

export { computeAudioHash, checkRateLimit, MAX_CHARACTERS_PER_SEGMENT };

/**
 * Main TTS Synthesis Entry Point
 */
export async function synthesizeSpeech({
  text,
  voice = null,
  language = 'en',
  clientIp = '127.0.0.1',
  providerOverride = null
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

  const requestedProvider = (providerOverride || config.ttsProvider || 'auto').toLowerCase();

  // 1. If explicit 'browser' or 'none' is configured, immediately return browser fallback signal
  if (requestedProvider === 'browser' || requestedProvider === 'none') {
    return {
      hash: computeAudioHash(cleanText, voice || 'browser', language, requestedProvider),
      cached: false,
      fallbackToBrowser: true,
      text: cleanText,
      language,
      provider: requestedProvider === 'none' ? 'disabled' : 'browser_web_speech',
      reason: requestedProvider === 'none' ? 'TTS disabled by configuration' : 'Browser Web Speech requested'
    };
  }

  // 2. Compute audio hash and check server disk cache first
  const activeVoice = voice || (requestedProvider === 'elevenlabs' ? resolveElevenLabsVoiceId(language) : config.geminiTtsVoice);
  const hash = computeAudioHash(cleanText, activeVoice, language, requestedProvider);
  const cachedResult = await getCachedAudio(hash);
  if (cachedResult) {
    return {
      hash,
      cached: true,
      audioBuffer: cachedResult.buffer,
      contentType: cachedResult.contentType,
      provider: 'disk_cache'
    };
  }

  // 3. Provider execution queue
  // Order for auto: elevenlabs (only if ELEVENLABS_API_KEY is set) -> gemini -> mms -> sarvam -> browser
  const providersToAttempt = [];
  if (requestedProvider === 'auto') {
    if (config.elevenlabsApiKey) providersToAttempt.push('elevenlabs');
    if (config.geminiApiKey) providersToAttempt.push('gemini');
    providersToAttempt.push('mms');
    if (config.sarvamApiKey) providersToAttempt.push('sarvam');
  } else if (requestedProvider === 'elevenlabs') {
    providersToAttempt.push('elevenlabs');
  } else if (requestedProvider === 'gemini') {
    providersToAttempt.push('gemini');
  } else if (requestedProvider === 'mms') {
    providersToAttempt.push('mms');
  } else if (requestedProvider === 'sarvam') {
    providersToAttempt.push('sarvam');
  }

  const failureReasons = [];

  for (const provider of providersToAttempt) {
    try {
      let result = null;

      if (provider === 'elevenlabs') {
        const elVoice = resolveElevenLabsVoiceId(language, voice);
        const elRes = await synthesizeWithElevenLabs({
          text: cleanText,
          voiceId: elVoice,
          language,
          modelId: config.elevenlabsModelId
        });
        if (elRes && elRes.success && elRes.audioBuffer) {
          result = {
            buffer: elRes.audioBuffer,
            contentType: elRes.contentType || 'audio/mpeg',
            provider: 'elevenlabs',
            model: elRes.modelId,
            voice: elRes.voiceId
          };
        } else {
          const failReason = elRes?.reason || 'ElevenLabs synthesis failed';
          failureReasons.push(`elevenlabs: ${failReason}`);
          console.warn(`[TTS ElevenLabs] Fallback triggered: ${failReason}`);
          continue;
        }
      } else if (provider === 'gemini') {
        result = await synthesizeWithGemini({
          text: cleanText,
          apiKey: config.geminiApiKey,
          model: config.geminiTtsModel,
          voice: voice || config.geminiTtsVoice,
          language
        });
      } else if (provider === 'mms') {
        result = await synthesizeWithMms({
          text: cleanText,
          language,
          hfToken: config.hfToken
        });
      } else if (provider === 'sarvam') {
        result = await synthesizeWithSarvam({
          text: cleanText,
          apiKey: config.sarvamApiKey,
          language
        });
      }

      if (result && result.buffer) {
        // Asynchronously save to server disk cache
        const ext = result.contentType.includes('mpeg') || result.contentType.includes('mp3')
          ? '.mp3'
          : result.contentType.includes('flac')
          ? '.flac'
          : '.wav';

        saveAudioToCache(hash, result.buffer, ext).catch(err => {
          console.warn('[TTS] Failed to write disk cache:', err.message);
        });

        return {
          hash,
          cached: false,
          audioBuffer: result.buffer,
          contentType: result.contentType,
          provider: result.provider,
          model: result.model
        };
      }
    } catch (err) {
      console.warn(`[TTS Provider ${provider}] Failed:`, err.message);
      failureReasons.push(`${provider}: ${err.message}`);
      // Fall through to next provider in queue
    }
  }

  // 4. If all server providers fail or no remote provider configured, fall back to browser Web Speech
  console.info('[TTS] All remote providers exhausted; falling back to browser Web Speech API.');
  return {
    hash,
    cached: false,
    fallbackToBrowser: true,
    text: cleanText,
    language,
    provider: 'browser_web_speech',
    reason: failureReasons.join('; ') || 'No server TTS provider available'
  };
}
