import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runQa() {
  console.log('[QA Runner] Starting production test suite on http://localhost:10000...\n');
  process.env.NODE_ENV = 'production';
  process.env.PORT = '10000';

  const { default: app } = await import('../server/index.js');
  const server = app.listen(10000);

  const results = [];

  const check = async (name, fn) => {
    const t0 = Date.now();
    try {
      const details = await fn();
      const dur = Date.now() - t0;
      results.push({ name, pass: true, dur, details });
      console.log(`  ✔ [PASS] ${name} (${dur}ms)`);
    } catch (err) {
      const dur = Date.now() - t0;
      results.push({ name, pass: false, dur, error: err.message });
      console.error(`  ✖ [FAIL] ${name} (${dur}ms): ${err.message}`);
    }
  };

  try {
    // 1. Health check & Render Blueprint monitoring
    await check('GET /health returns 200 JSON with status ok', async () => {
      const res = await fetch('http://localhost:10000/health');
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const data = await res.json();
      if (data.status !== 'ok') throw new Error(`Status not ok: ${JSON.stringify(data)}`);
      return `uptime: ${data.uptime.toFixed(1)}s, env: ${data.environment}`;
    });

    // 2. Security Headers (Helmet, CSP)
    await check('Security Headers (Helmet & CSP)', async () => {
      const res = await fetch('http://localhost:10000/');
      const csp = res.headers.get('content-security-policy') || '';
      const xFrame = res.headers.get('x-frame-options') || '';
      const xContentType = res.headers.get('x-content-type-options') || '';

      if (!csp.includes("default-src 'self'")) throw new Error(`CSP missing default-src: ${csp}`);
      if (!xContentType.includes('nosniff')) throw new Error(`X-Content-Type-Options missing: ${xContentType}`);
      return `CSP, nosniff present`;
    });

    // 3. Bundled Demo: Dhaka (EN)
    await check('GET /api/demo/dhaka (English)', async () => {
      const res = await fetch('http://localhost:10000/api/demo/dhaka?lang=en');
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      if (!data.ok || !data.plan || !data.weather || data.greenSpaces.length !== 5) {
        throw new Error(`Incomplete demo data: ${JSON.stringify(data).slice(0, 100)}`);
      }
      return `${data.plan.headline}, ${data.greenSpaces.length} parks`;
    });

    // 4. Bundled Demo: Dhaka (BN)
    await check('GET /api/demo/dhaka?lang=bn (Bengali)', async () => {
      const res = await fetch('http://localhost:10000/api/demo/dhaka?lang=bn');
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      if (!data.ok || !data.plan.headline.includes('রমনা')) {
        throw new Error(`Bengali plan headline missing: ${data.plan?.headline}`);
      }
      return data.plan.headline;
    });

    // 5. City search endpoint with sanitization
    await check('GET /api/cities (Query "Dhaka")', async () => {
      const res = await fetch('http://localhost:10000/api/cities?query=Dhaka');
      const data = await res.json();
      if (!data.ok || !Array.isArray(data.cities) || data.cities.length === 0) {
        throw new Error('City search failed');
      }
      return `Found ${data.cities.length} matches: ${data.cities[0].name}, ${data.cities[0].country}`;
    });

    // 6. Weather & Green Window scoring endpoint
    await check('GET /api/weather for coordinates', async () => {
      const res = await fetch('http://localhost:10000/api/weather?lat=23.7388&lon=90.3995');
      const data = await res.json();
      if (!data.ok || typeof data.current.score !== 'number' || !data.timeline || data.timeline.length !== 24) {
        throw new Error(`Invalid weather score payload: ${JSON.stringify(data).slice(0, 100)}`);
      }
      return `Current score: ${data.current.score} (${data.current.category}), 24h timeline verified`;
    });

    // 7. Nearby green spaces discovery endpoint
    await check('GET /api/places for coordinates', async () => {
      const res = await fetch('http://localhost:10000/api/places?lat=23.7388&lon=90.3995');
      const data = await res.json();
      if (!data.ok || !Array.isArray(data.spaces) || data.spaces.length === 0) {
        throw new Error(`Invalid places payload: ${JSON.stringify(data).slice(0, 100)}`);
      }
      return `Discovered ${data.spaces.length} green spaces nearby (top: ${data.spaces[0].name}, ${data.spaces[0].distanceMeters}m)`;
    });

    // 8. Mindful walk plan generation
    await check('POST /api/plan with guardrail safety enforcement', async () => {
      const res = await fetch('http://localhost:10000/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          minutes: 30,
          goal: 'calm',
          language: 'bn',
          lat: 23.7388,
          lon: 90.3995
        })
      });
      const data = await res.json();
      if (!data.ok || !data.plan || !data.plan.health_notes) {
        throw new Error(`Plan generation failed: ${JSON.stringify(data).slice(0, 100)}`);
      }
      return `Generated plan: ${data.plan.headline}, ${data.plan.health_notes.length} guardrail notes`;
    });

    // 9. Free TTS Cache Hit for Ramna Park Demo Audio
    await check('POST /api/tts serves disk cached audio', async () => {
      const res = await fetch('http://localhost:10000/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'Stow your phone in your pocket. As you cross the park gate, take one long, deliberate breath. Let the drone of the city fade behind the rustle of leaves.',
          language: 'en'
        })
      });
      if (res.status !== 200) throw new Error(`HTTP status ${res.status}`);
      const cachedHeader = res.headers.get('x-audio-cached');
      const ctype = res.headers.get('content-type');
      const buf = await res.arrayBuffer();
      if (buf.byteLength < 500000) throw new Error(`Audio buffer too small: ${buf.byteLength} bytes`);
      return `Cache status: ${cachedHeader}, size: ${buf.byteLength} bytes, content-type: ${ctype}`;
    });

    // 10. Static demo audio file serving
    await check('Static Audio File GET /demo-audio/en_0.wav', async () => {
      const res = await fetch('http://localhost:10000/demo-audio/en_0.wav');
      if (res.status !== 200) throw new Error(`HTTP status ${res.status}`);
      const buf = await res.arrayBuffer();
      if (buf.byteLength < 600000) throw new Error(`Unexpected file size: ${buf.byteLength}`);
      return `HTTP 200, length: ${buf.byteLength} bytes (${(buf.byteLength / 1024).toFixed(1)} kB)`;
    });

    // 11. Static audio file serving (Bengali)
    await check('Static Audio File GET /demo-audio/bn_0.wav', async () => {
      const res = await fetch('http://localhost:10000/demo-audio/bn_0.wav');
      if (res.status !== 200) throw new Error(`HTTP status ${res.status}`);
      const buf = await res.arrayBuffer();
      if (buf.byteLength < 500000) throw new Error(`Unexpected file size: ${buf.byteLength}`);
      return `HTTP 200, length: ${buf.byteLength} bytes (${(buf.byteLength / 1024).toFixed(1)} kB)`;
    });

    // 12. PWA Manifest serving
    await check('PWA Manifest GET /manifest.json', async () => {
      const res = await fetch('http://localhost:10000/manifest.json');
      if (res.status !== 200) throw new Error(`HTTP status ${res.status}`);
      const data = await res.json();
      if (!data.name || !data.icons) throw new Error('Invalid manifest');
      return `PWA: ${data.name}, display: ${data.display}`;
    });

    // 13. Service Worker serving with no-cache header
    await check('Service Worker GET /sw.js with no-cache', async () => {
      const res = await fetch('http://localhost:10000/sw.js');
      if (res.status !== 200) throw new Error(`HTTP status ${res.status}`);
      const cacheControl = res.headers.get('cache-control') || '';
      if (!cacheControl.includes('no-cache')) throw new Error(`Expected no-cache header: ${cacheControl}`);
      return `Cache-Control: ${cacheControl}`;
    });

    // 14. Input validation: oversized text rejection
    await check('Input Validation: Oversized TTS text (>450 chars) returns 400', async () => {
      const res = await fetch('http://localhost:10000/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'A'.repeat(500) })
      });
      if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
      const data = await res.json();
      return `Rejected with 400: ${data.error}`;
    });

    // 15. Input validation: empty text rejection
    await check('Input Validation: Empty TTS text returns 400', async () => {
      const res = await fetch('http://localhost:10000/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: '   ' })
      });
      if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
      const data = await res.json();
      return `Rejected with 400: ${data.error}`;
    });

    // 16. SPA fallback serving index.html
    await check('SPA Fallback for non-API route (/walk-session)', async () => {
      const res = await fetch('http://localhost:10000/walk-session');
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const text = await res.text();
      if (!text.includes('<!DOCTYPE html>')) throw new Error('Expected HTML shell');
      return 'Returned HTML app shell';
    });

    console.log('\n================ QA SUMMARY ================');
    const passed = results.filter(r => r.pass).length;
    console.log(`Passed: ${passed} / ${results.length} (${Math.round((passed / results.length) * 100)}%)`);
  } finally {
    server.close();
  }
}

runQa().catch(err => {
  console.error('[QA Runner Fatal]:', err);
  process.exit(1);
});
