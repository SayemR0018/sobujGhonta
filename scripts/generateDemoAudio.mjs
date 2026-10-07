import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../server/config.js';
import { synthesizeWithGemini } from '../server/services/tts/gemini.js';
import { computeAudioHash, saveAudioToCache } from '../server/services/tts/cache.js';
import { DHAKA_PREGENERATED_PLAN_EN, DHAKA_PREGENERATED_PLAN_BN } from '../server/services/demoData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLIC_DEMO_DIR = path.resolve(__dirname, '../client/public/demo-audio');
const DIST_DEMO_DIR = path.resolve(__dirname, '../client/dist/demo-audio');

async function fileExists(filePath) {
  try {
    const st = await fs.stat(filePath);
    return st.size > 0;
  } catch {
    return false;
  }
}

async function main() {
  console.log('[Demo Audio Generator] Starting generation with Gemini 3.8 Flash TTS...');
  console.log('[Demo Audio Generator] Model:', config.geminiTtsModel, '| Voice: Kore');
  console.log('[Demo Audio Generator] Adhering strictly to 3 RPM free tier rate limit with 22s spacing.');

  await fs.mkdir(PUBLIC_DEMO_DIR, { recursive: true });
  await fs.mkdir(DIST_DEMO_DIR, { recursive: true });

  const metrics = [];

  // Generate English Clips
  console.log('\n--- Checking / Generating English Demo Audio (Ramna Park) ---');
  for (let i = 0; i < DHAKA_PREGENERATED_PLAN_EN.walk_script.length; i++) {
    const seg = DHAKA_PREGENERATED_PLAN_EN.walk_script[i];
    const text = seg.text;
    const staticFilename = `en_${i}.wav`;
    const publicPath = path.join(PUBLIC_DEMO_DIR, staticFilename);

    if (await fileExists(publicPath)) {
      const buf = await fs.readFile(publicPath);
      console.log(`[EN Segment ${i + 1}] Already exists (${buf.length} bytes / ${(buf.length / 1024).toFixed(1)} kB) — skipping API call.`);
      metrics.push({
        lang: 'en',
        index: i,
        title: seg.title,
        chars: text.length,
        bytes: buf.length,
        durationMs: 0,
        cached: true
      });
      continue;
    }

    const t0 = Date.now();
    console.log(`[EN Segment ${i + 1}] Calling API: "${seg.title}" (${text.length} chars)...`);
    const result = await synthesizeWithGemini({
      text,
      apiKey: config.geminiApiKey,
      model: config.geminiTtsModel,
      voice: 'Kore',
      language: 'en',
      maxRetries: 2
    });
    const durationMs = Date.now() - t0;
    const sizeBytes = result.buffer.length;

    const hash = computeAudioHash(text, 'Kore', 'en', 'auto');
    await saveAudioToCache(hash, result.buffer, '.wav');
    const hashGemini = computeAudioHash(text, 'Kore', 'en', 'gemini');
    await saveAudioToCache(hashGemini, result.buffer, '.wav');

    await fs.writeFile(publicPath, result.buffer);
    await fs.writeFile(path.join(DIST_DEMO_DIR, staticFilename), result.buffer);

    console.log(`  ✓ Generated: ${sizeBytes} bytes (${(sizeBytes / 1024).toFixed(1)} kB) in ${durationMs} ms [hash: ${hash.slice(0, 8)}...]`);
    metrics.push({
      lang: 'en',
      index: i,
      title: seg.title,
      chars: text.length,
      bytes: sizeBytes,
      durationMs,
      hash
    });

    // 22s pause to strictly honor 3 RPM limit
    console.log('  [Rate Limiter] Waiting 22s for next request...');
    await new Promise(r => setTimeout(r, 22000));
  }

  // Generate Bengali Clips
  console.log('\n--- Checking / Generating Bengali Demo Audio (রমনা পার্ক) ---');
  for (let i = 0; i < DHAKA_PREGENERATED_PLAN_BN.walk_script.length; i++) {
    const seg = DHAKA_PREGENERATED_PLAN_BN.walk_script[i];
    const text = seg.text;
    const staticFilename = `bn_${i}.wav`;
    const publicPath = path.join(PUBLIC_DEMO_DIR, staticFilename);

    if (await fileExists(publicPath)) {
      const buf = await fs.readFile(publicPath);
      console.log(`[BN Segment ${i + 1}] Already exists (${buf.length} bytes / ${(buf.length / 1024).toFixed(1)} kB) — skipping API call.`);
      metrics.push({
        lang: 'bn',
        index: i,
        title: seg.title,
        chars: text.length,
        bytes: buf.length,
        durationMs: 0,
        cached: true
      });
      continue;
    }

    const t0 = Date.now();
    console.log(`[BN Segment ${i + 1}] Calling API: "${seg.title}" (${text.length} chars)...`);
    const result = await synthesizeWithGemini({
      text,
      apiKey: config.geminiApiKey,
      model: config.geminiTtsModel,
      voice: 'Kore',
      language: 'bn',
      maxRetries: 2
    });
    const durationMs = Date.now() - t0;
    const sizeBytes = result.buffer.length;

    const hash = computeAudioHash(text, 'Kore', 'bn', 'auto');
    await saveAudioToCache(hash, result.buffer, '.wav');
    const hashGemini = computeAudioHash(text, 'Kore', 'bn', 'gemini');
    await saveAudioToCache(hashGemini, result.buffer, '.wav');

    await fs.writeFile(publicPath, result.buffer);
    await fs.writeFile(path.join(DIST_DEMO_DIR, staticFilename), result.buffer);

    console.log(`  ✓ Generated: ${sizeBytes} bytes (${(sizeBytes / 1024).toFixed(1)} kB) in ${durationMs} ms [hash: ${hash.slice(0, 8)}...]`);
    metrics.push({
      lang: 'bn',
      index: i,
      title: seg.title,
      chars: text.length,
      bytes: sizeBytes,
      durationMs,
      hash
    });

    if (i < DHAKA_PREGENERATED_PLAN_BN.walk_script.length - 1) {
      console.log('  [Rate Limiter] Waiting 22s for next request...');
      await new Promise(r => setTimeout(r, 22000));
    }
  }

  console.log('\n================ GENERATION SUMMARY ================');
  console.log(JSON.stringify(metrics, null, 2));
}

main().catch(err => {
  console.error('[Demo Audio Generator] Fatal error:', err);
  process.exit(1);
});
