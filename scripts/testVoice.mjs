#!/usr/bin/env node
/**
 * scripts/testVoice.mjs
 * Non-secret voice test script for Sobuj Ghonta.
 * 
 * Generates one Bengali and one English test clip using the configured TTS provider chain.
 * Outputs are written to ./tmp/voice-tests/ (gitignored).
 * 
 * NEVER prints API keys, tokens, or HTTP authorization headers.
 * Redacts any accidental secrets from error messages.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../server/config.js';
import { synthesizeSpeech } from '../server/services/tts/index.js';
import { resolveElevenLabsVoiceId } from '../server/services/tts/elevenlabs.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const outputDir = path.resolve(projectRoot, 'tmp/voice-tests');

function redact(str) {
  if (!str) return '';
  return String(str)
    .replace(/[a-zA-Z0-9_-]{24,}/g, '[REDACTED_SECRET]')
    .replace(/sk-[a-zA-Z0-9]+/g, '[REDACTED_KEY]')
    .replace(/AIza[a-zA-Z0-9_-]+/g, '[REDACTED_KEY]')
    .replace(/hf_[a-zA-Z0-9]+/g, '[REDACTED_KEY]');
}

const testCases = [
  {
    language: 'bn',
    label: 'Bangla (Bengali)',
    text: 'সবুজ ঘণ্টায় আপনাকে স্বাগতম। ফোনটি পকেটে রেখে প্রকৃতির স্নিগ্ধতা উপভোগ করুন।',
    filenameBase: 'test_bn'
  },
  {
    language: 'en',
    label: 'English',
    text: 'Welcome to Sobuj Ghonta. Stow your phone in your pocket and take in the cool canopy.',
    filenameBase: 'test_en'
  }
];

async function runVoiceTests() {
  console.log('========================================================');
  console.log('  Sobuj Ghonta (সবুজ ঘণ্টা) — Voice Test Runner');
  console.log('  Configured TTS Provider:', config.ttsProvider);
  console.log('  ElevenLabs Key Present?:', Boolean(config.elevenlabsApiKey));
  console.log('  ElevenLabs Voice ID:    ', resolveElevenLabsVoiceId('en'));
  console.log('  ElevenLabs Model ID:    ', config.elevenlabsModelId);
  console.log('  Gemini Key Present?:    ', Boolean(config.geminiApiKey));
  console.log('========================================================\n');

  await fs.mkdir(outputDir, { recursive: true });

  for (const tc of testCases) {
    console.log(`--- Testing [${tc.label}] ---`);
    console.log(`Text: "${tc.text}" (${tc.text.length} chars)`);

    const start = Date.now();
    try {
      const result = await synthesizeSpeech({
        text: tc.text,
        language: tc.language,
        clientIp: '127.0.0.1'
      });

      const latencyMs = Date.now() - start;

      if (result.fallbackToBrowser) {
        console.log(`  Provider:        ${result.provider} (Client Fallback)`);
        console.log(`  Reason:          ${redact(result.reason)}`);
        console.log(`  Characters Used: ${tc.text.length}`);
        console.log(`  Latency:         ${latencyMs} ms`);
        console.log(`  Status:          FALLBACK (Browser speech requested)\n`);
        continue;
      }

      const ext = result.contentType?.includes('mpeg') || result.contentType?.includes('mp3')
        ? '.mp3'
        : '.wav';
      const outPath = path.join(outputDir, `${tc.filenameBase}${ext}`);

      if (result.audioBuffer) {
        await fs.writeFile(outPath, result.audioBuffer);
      }

      console.log(`  Provider:        ${result.provider}`);
      console.log(`  Model ID:        ${result.model || 'N/A'}`);
      console.log(`  Voice ID:        ${resolveElevenLabsVoiceId(tc.language)}`);
      console.log(`  Characters Used: ${tc.text.length}`);
      console.log(`  Bytes:           ${result.audioBuffer?.length || 0} bytes`);
      console.log(`  Latency:         ${latencyMs} ms`);
      console.log(`  HTTP Status:     200 OK`);
      console.log(`  Saved to:        ./tmp/voice-tests/${tc.filenameBase}${ext}\n`);
    } catch (err) {
      const latencyMs = Date.now() - start;
      console.error(`  Error:           ${redact(err.message)}`);
      console.error(`  Latency:         ${latencyMs} ms`);
      console.error(`  HTTP Status:     FAILED\n`);
    }
  }

  console.log('========================================================');
  console.log('  Voice test run complete. Output directory: ./tmp/voice-tests');
  console.log('========================================================\n');
}

runVoiceTests().catch(err => {
  console.error('Fatal voice test error:', redact(err.message));
  process.exit(1);
});
