#!/usr/bin/env node
/**
 * scripts/smoke.mjs
 * Smoke test for Sobuj Ghonta (সবুজ ঘণ্টা) deployment verification.
 * 
 * Usage:
 *   node scripts/smoke.mjs [BASE_URL]
 *   BASE_URL=https://sobuj-ghonta.onrender.com node scripts/smoke.mjs
 * 
 * If targeting localhost and the server is not currently running,
 * this script automatically spawns an ephemeral production server,
 * executes the full smoke suite, and cleanly terminates the server.
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const rawBaseUrl = process.env.BASE_URL || process.argv[2] || 'http://localhost:10000';
const BASE_URL = rawBaseUrl.replace(/\/+$/, '');

console.log(`\n========================================================`);
console.log(`  Sobuj Ghonta (সবুজ ঘণ্টা) — Deployment Smoke Test`);
console.log(`  Target: ${BASE_URL}`);
console.log(`  Time:   ${new Date().toISOString()}`);
console.log(`========================================================\n`);

let passed = 0;
let failed = 0;
let spawnedServer = null;

async function check(name, fn) {
  const start = Date.now();
  try {
    await fn();
    const duration = Date.now() - start;
    console.log(`  ✔ [PASS] ${name} (${duration}ms)`);
    passed++;
  } catch (err) {
    const duration = Date.now() - start;
    console.error(`  ✘ [FAIL] ${name} (${duration}ms) -> ${err.message}`);
    failed++;
  }
}

async function isServerUp() {
  try {
    const res = await fetch(`${BASE_URL}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

async function startEphemeralServer() {
  console.log(`[Smoke Runner] No active server detected at ${BASE_URL}. Spawning local server...`);
  spawnedServer = spawn('node', ['server/index.js'], {
    cwd: projectRoot,
    env: { ...process.env, PORT: '10000', NODE_ENV: 'production' },
    stdio: 'pipe'
  });

  spawnedServer.stdout.on('data', data => {
    // Suppress verbose output
  });

  spawnedServer.stderr.on('data', data => {
    const msg = data.toString();
    if (!msg.includes('ExperimentalWarning')) {
      process.stderr.write(`[Server Log] ${msg}`);
    }
  });

  // Wait up to 10 seconds for server to respond to /health
  const maxWait = 10000;
  const startWait = Date.now();
  while (Date.now() - startWait < maxWait) {
    if (await isServerUp()) {
      console.log(`[Smoke Runner] Local production server is ready.\n`);
      return;
    }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('Failed to start ephemeral server within 10 seconds');
}

async function runSmokeTests() {
  const isLocal = BASE_URL.includes('localhost') || BASE_URL.includes('127.0.0.1');
  const upAlready = await isServerUp();

  if (!upAlready && isLocal) {
    await startEphemeralServer();
  } else if (!upAlready) {
    throw new Error(`Target server at ${BASE_URL} is unreachable. Check URL or ensure server is deployed.`);
  }

  // 1. Health endpoint
  await check('GET /health (HTTP 200 JSON)', async () => {
    const res = await fetch(`${BASE_URL}/health`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const json = await res.json();
    if (json.status !== 'ok' && json.status !== 'healthy' && !json.ok) {
      throw new Error(`Unexpected body: ${JSON.stringify(json)}`);
    }
  });

  // 2. App Shell
  await check('GET / (App Shell HTML & Security Headers)', async () => {
    const res = await fetch(`${BASE_URL}/`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const html = await res.text();
    if (!html.includes('<div id="root">') && !html.includes('<!DOCTYPE html>')) {
      throw new Error('Missing HTML app container');
    }
    const csp = res.headers.get('content-security-policy');
    if (!csp) throw new Error('Missing Content-Security-Policy header');
  });

  // 3. Demo Dhaka (English)
  await check('GET /api/demo/dhaka?lang=en (Full Demo Payload)', async () => {
    const res = await fetch(`${BASE_URL}/api/demo/dhaka?lang=en`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const json = await res.json();
    const script = json.plan?.walk_script || json.plan?.segments;
    if (!json.plan || !script || script.length === 0) {
      throw new Error('Invalid demo plan structure (missing plan or walk_script)');
    }
    if (!json.weather || !json.greenSpaces) {
      throw new Error('Demo payload missing weather or greenSpaces');
    }
  });

  // 4. Demo Dhaka (Bengali)
  await check('GET /api/demo/dhaka?lang=bn (Bengali Unicode Payload)', async () => {
    const res = await fetch(`${BASE_URL}/api/demo/dhaka?lang=bn`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const json = await res.json();
    const title = json.plan?.headline || json.plan?.title || '';
    const script = json.plan?.walk_script || json.plan?.segments || [];
    if (!title || script.length === 0) {
      throw new Error('Invalid demo plan structure');
    }
    const hasBengali = /[\u0980-\u09FF]/.test(title + script[0].text);
    if (!hasBengali) {
      throw new Error('Expected Bengali Unicode characters in response');
    }
  });

  // 5. Pre-generated static audio: English
  await check('GET /demo-audio/en_0.wav (Static Pre-generated WAV)', async () => {
    const res = await fetch(`${BASE_URL}/demo-audio/en_0.wav`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('audio/wav') && !contentType.includes('audio/x-wav')) {
      throw new Error(`Unexpected Content-Type: ${contentType}`);
    }
    const buf = await res.arrayBuffer();
    if (buf.byteLength < 50000) {
      throw new Error(`File size too small: ${buf.byteLength} bytes`);
    }
  });

  // 6. Pre-generated static audio: Bengali
  await check('GET /demo-audio/bn_0.wav (Static Pre-generated WAV)', async () => {
    const res = await fetch(`${BASE_URL}/demo-audio/bn_0.wav`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('audio/wav') && !contentType.includes('audio/x-wav')) {
      throw new Error(`Unexpected Content-Type: ${contentType}`);
    }
    const buf = await res.arrayBuffer();
    if (buf.byteLength < 50000) {
      throw new Error(`File size too small: ${buf.byteLength} bytes`);
    }
  });

  // 7. PWA Web App Manifest
  await check('GET /manifest.json (PWA Web App Manifest)', async () => {
    const res = await fetch(`${BASE_URL}/manifest.json`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const manifest = await res.json();
    if (!manifest.name || !manifest.display) {
      throw new Error('Invalid manifest JSON');
    }
  });

  // 8. Service Worker
  await check('GET /sw.js (Service Worker with no-cache header)', async () => {
    const res = await fetch(`${BASE_URL}/sw.js`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const cacheControl = res.headers.get('cache-control') || '';
    if (!cacheControl.includes('no-cache')) {
      throw new Error(`Missing no-cache in Cache-Control: ${cacheControl}`);
    }
  });

  console.log(`\n================ SMOKE SUMMARY ================`);
  console.log(`Passed: ${passed} / ${passed + failed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Status: ${failed === 0 ? 'READY FOR DEPLOYMENT / HEALTHY' : 'VERIFICATION FAILED'}`);
  console.log(`===============================================\n`);

  if (spawnedServer) {
    await new Promise(resolve => {
      spawnedServer.once('close', () => resolve());
      spawnedServer.kill();
      setTimeout(resolve, 1500);
    });
  }

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSmokeTests().catch(async err => {
  console.error('Fatal smoke test runner error:', err.message);
  if (spawnedServer) {
    await new Promise(resolve => {
      spawnedServer.once('close', () => resolve());
      spawnedServer.kill();
      setTimeout(resolve, 1000);
    });
  }
  process.exit(1);
});
