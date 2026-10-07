#!/usr/bin/env node
/**
 * scripts/generateDemoAudio.mjs
 * Generates bundled Dhaka demo walk audio (Bangla + English) using the best available TTS provider.
 * Writes outputs to client/public/demo-audio/ and client/dist/demo-audio/ with a manifest.
 * 
 * Provider precedence:
 *   elevenlabs (if ELEVENLABS_API_KEY set) -> gemini -> mms
 * 
 * Manifest schema:
 *   [ { file, language, index, title, provider, voiceId, model, characters, bytes }, ... ]
 * 
 * NEVER prints API keys, tokens, or authorization headers.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../server/config.js';
import { synthesizeSpeech } from '../server/services/tts/index.js';
import { resolveElevenLabsVoiceId } from '../server/services/tts/elevenlabs.js';
import { DHAKA_PREGENERATED_PLAN_EN, DHAKA_PREGENERATED_PLAN_BN } from '../server/services/demoData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const PUBLIC_DEMO_DIR = path.resolve(projectRoot, 'client/public/demo-audio');
const DIST_DEMO_DIR = path.resolve(projectRoot, 'client/dist/demo-audio');

function redact(str) {
  if (!str) return '';
  return String(str)
    .replace(/[a-zA-Z0-9_-]{24,}/g, '[REDACTED_SECRET]')
    .replace(/sk-[a-zA-Z0-9]+/g, '[REDACTED_KEY]')
    .replace(/AIza[a-zA-Z0-9_-]+/g, '[REDACTED_KEY]')
    .replace(/hf_[a-zA-Z0-9]+/g, '[REDACTED_KEY]');
}

async function fileExists(filePath) {
  try {
    const st = await fs.stat(filePath);
    return st.size > 0;
  } catch {
    return false;
  }
}

async function runDemoAudioGeneration() {
  console.log('========================================================');
  console.log('  Sobuj Ghonta (সবুজ ঘণ্টা) — Demo Audio Generator');
  console.log('  Configured Provider:   ', config.ttsProvider);
  console.log('  ElevenLabs Key Present?:', Boolean(config.elevenlabsApiKey));
  console.log('  Gemini Key Present?:    ', Boolean(config.geminiApiKey));
  console.log('========================================================\n');

  await fs.mkdir(PUBLIC_DEMO_DIR, { recursive: true });
  await fs.mkdir(DIST_DEMO_DIR, { recursive: true });

  const manifest = [];
  const segments = [
    ...DHAKA_PREGENERATED_PLAN_EN.walk_script.map((s, idx) => ({ ...s, language: 'en', index: idx })),
    ...DHAKA_PREGENERATED_PLAN_BN.walk_script.map((s, idx) => ({ ...s, language: 'bn', index: idx }))
  ];

  for (const seg of segments) {
    const { language, index, title, text } = seg;
    const baseName = `${language}_${index}`;
    console.log(`Processing [${language.toUpperCase()} #${index + 1}] "${title}" (${text.length} chars)...`);

    const start = Date.now();
    let result = null;

    try {
      result = await synthesizeSpeech({
        text,
        language,
        clientIp: '127.0.0.1'
      });
    } catch (err) {
      console.warn(`  Synthesis attempt error: ${redact(err.message)}`);
    }

    const durationMs = Date.now() - start;

    if (result && result.audioBuffer && result.audioBuffer.length > 0) {
      const isMpeg = result.contentType?.includes('mpeg') || result.contentType?.includes('mp3');
      const primaryExt = isMpeg ? '.mp3' : '.wav';
      const filename = `${baseName}${primaryExt}`;
      const publicPath = path.join(PUBLIC_DEMO_DIR, filename);
      const distPath = path.join(DIST_DEMO_DIR, filename);

      await fs.writeFile(publicPath, result.audioBuffer);
      await fs.writeFile(distPath, result.audioBuffer);

      // Also ensure .wav file exists for compatibility with existing players and tests
      const wavFilename = `${baseName}.wav`;
      const publicWavPath = path.join(PUBLIC_DEMO_DIR, wavFilename);
      const distWavPath = path.join(DIST_DEMO_DIR, wavFilename);
      if (!(await fileExists(publicWavPath))) {
        await fs.writeFile(publicWavPath, result.audioBuffer);
        await fs.writeFile(distWavPath, result.audioBuffer);
      }

      const voiceUsed = result.provider === 'elevenlabs'
        ? resolveElevenLabsVoiceId(language)
        : (result.provider === 'gemini' ? config.geminiTtsVoice : 'default');

      const manifestEntry = {
        file: filename,
        wavFile: wavFilename,
        language,
        index,
        title,
        provider: result.provider,
        voiceId: voiceUsed,
        model: result.model || config.elevenlabsModelId || 'default',
        characters: text.length,
        bytes: result.audioBuffer.length,
        durationMs
      };

      manifest.push(manifestEntry);

      console.log(`  ✔ Generated via [${result.provider}]: ${result.audioBuffer.length} bytes in ${durationMs} ms`);
    } else {
      console.log(`  ℹ Remote synthesis not available (${result?.reason || 'fallback'}); keeping existing cached file if present.`);
      const existingWav = path.join(PUBLIC_DEMO_DIR, `${baseName}.wav`);
      if (await fileExists(existingWav)) {
        const st = await fs.stat(existingWav);
        manifest.push({
          file: `${baseName}.wav`,
          wavFile: `${baseName}.wav`,
          language,
          index,
          title,
          provider: 'bundled_repository_cache',
          voiceId: 'Kore',
          model: 'gemini-3.8-flash-tts',
          characters: text.length,
          bytes: st.size,
          durationMs: 0
        });
        console.log(`  ✔ Retained existing bundled file (${st.size} bytes).`);
      }
    }

    // Brief pause between requests to respect rate limits
    if (result && !result.cached) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  // Write demo-manifest.json
  const manifestJson = JSON.stringify(manifest, null, 2);
  await fs.writeFile(path.join(PUBLIC_DEMO_DIR, 'manifest.json'), manifestJson);
  await fs.writeFile(path.join(DIST_DEMO_DIR, 'manifest.json'), manifestJson);

  console.log('\n========================================================');
  console.log(`  Demo audio generation complete!`);
  console.log(`  Total clips in manifest: ${manifest.length}`);
  console.log(`  Manifest saved to: client/public/demo-audio/manifest.json`);
  console.log('========================================================\n');
}

runDemoAudioGeneration().catch(err => {
  console.error('Fatal demo audio error:', redact(err.message));
  process.exit(1);
});
