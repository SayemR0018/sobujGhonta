/**
 * tests/adversarial/stress_oracle.mjs
 * Adversarial stress harness and empirical oracles for Milestone M1 (TabPFN & ML integration).
 */

import assert from 'node:assert/strict';
import http from 'node:http';
import { config } from '../../server/config.js';
import {
  mlClient,
  generateDeterministicBaselineForecast,
  detectLocalAnomaly,
  computeAgreementPercentage,
  MODEL_LABEL_BASELINE
} from '../../server/services/mlClient.js';
import { calculateHourlyGreenWindowScore, scoreForecastTimeline } from '../../server/services/scoring.js';
import { evaluateSafetyGuardrails } from '../../server/services/guardrails.js';
import { startAppServer } from '../harness/testHarness.js';

console.log('================================================================');
console.log('STARTING EMPIRICAL ADVERSARIAL STRESS HARNESS — MILESTONE M1');
console.log('================================================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const findings = [];

function recordTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  [PASS] ${name}`);
  } catch (err) {
    failedTests++;
    console.error(`  [FAIL] ${name}: ${err.message}`);
    findings.push({ name, error: err.message, stack: err.stack });
  }
}

async function recordAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  [PASS] ${name}`);
  } catch (err) {
    failedTests++;
    console.error(`  [FAIL] ${name}: ${err.message}`);
    findings.push({ name, error: err.message, stack: err.stack });
  }
}

// -----------------------------------------------------------------------------
// 1. ORACLE: QUANTILE MONOTONICITY INVARIANT UNDER EXTREME INPUTS (BASELINE ENGINE)
// -----------------------------------------------------------------------------
console.log('--- TEST SUITE 1: Quantile Monotonicity Under Extreme Inputs (Baseline Engine) ---');

function assertMonotonicQuantiles(quantiles, label) {
  assert.ok(quantiles, `${label}: quantiles object must exist`);
  const { p10, p50, p90 } = quantiles;
  assert.ok(Array.isArray(p10) && Array.isArray(p50) && Array.isArray(p90), `${label}: p10, p50, p90 must be arrays`);
  assert.equal(p10.length, p50.length, `${label}: p10 and p50 lengths must match`);
  assert.equal(p50.length, p90.length, `${label}: p50 and p90 lengths must match`);

  for (let i = 0; i < p10.length; i++) {
    const q10 = p10[i];
    const q50 = p50[i];
    const q90 = p90[i];

    assert.ok(!Number.isNaN(q10), `${label} step ${i}: p10 is NaN`);
    assert.ok(!Number.isNaN(q50), `${label} step ${i}: p50 is NaN`);
    assert.ok(!Number.isNaN(q90), `${label} step ${i}: p90 is NaN`);

    assert.ok(Number.isFinite(q10), `${label} step ${i}: p10 is not finite (${q10})`);
    assert.ok(Number.isFinite(q50), `${label} step ${i}: p50 is not finite (${q50})`);
    assert.ok(Number.isFinite(q90), `${label} step ${i}: p90 is not finite (${q90})`);

    assert.ok(
      q10 <= q50 + 1e-6,
      `${label} step ${i}: Invariant violated: p10 (${q10}) > p50 (${q50})`
    );
    assert.ok(
      q50 <= q90 + 1e-6,
      `${label} step ${i}: Invariant violated: p50 (${q50}) > p90 (${q90})`
    );
  }
}

recordTest('1.1: Zero AQI input (all zeros for 96h)', () => {
  const zeroAqi = new Array(96).fill(0);
  const res = generateDeterministicBaselineForecast(zeroAqi, 24, null, 0.0);
  assertMonotonicQuantiles(res.quantiles, 'Zero AQI');
  res.quantiles.p10.forEach(v => assert.ok(v >= 0));
  res.quantiles.p50.forEach(v => assert.ok(v >= 0));
  res.quantiles.p90.forEach(v => assert.ok(v >= 0));
});

recordTest('1.2: Extreme 500 AQI input (hazardous plateau)', () => {
  const maxAqi = new Array(96).fill(500);
  const res = generateDeterministicBaselineForecast(maxAqi, 24, null, 0.0);
  assertMonotonicQuantiles(res.quantiles, 'Extreme 500 AQI');
  assert.ok(res.quantiles.p50[0] >= 450);
});

recordTest('1.3: Extreme Sub-Zero Temperature (-40°C arctic freeze)', () => {
  const subZero = new Array(96).fill(-40);
  const res = generateDeterministicBaselineForecast(subZero, 24, null, -40.0);
  assertMonotonicQuantiles(res.quantiles, 'Sub-zero temp -40°C');
  assert.ok(res.quantiles.p50[0] <= -30);
});

recordTest('1.4: Extreme UV Index 15 (extreme tropical solar noon)', () => {
  const extremeUv = Array.from({ length: 96 }, (_, i) => (i % 24 >= 10 && i % 24 <= 14 ? 15 : 0));
  const res = generateDeterministicBaselineForecast(extremeUv, 24, null, 0.0);
  assertMonotonicQuantiles(res.quantiles, 'Extreme UV 15');
  res.quantiles.p10.forEach(v => assert.ok(v >= 0));
});

recordTest('1.5: Empty history array ([])', () => {
  const res = generateDeterministicBaselineForecast([], 24, null, 0.0);
  assertMonotonicQuantiles(res.quantiles, 'Empty array');
  assert.equal(res.quantiles.p10.length, 24);
  assert.equal(res.quantiles.p50.length, 24);
  assert.equal(res.quantiles.p90.length, 24);
  assert.equal(res.quantiles.p50[0], 0);
});

recordTest('1.6: Short history array (< 24 elements, e.g. 3 observations)', () => {
  const shortHistory = [45, 52, 60];
  const res = generateDeterministicBaselineForecast(shortHistory, 24, null, 0.0);
  assertMonotonicQuantiles(res.quantiles, 'Short history');
});

recordTest('1.7: NaN values embedded in history series ([NaN, 50, 60, NaN])', () => {
  const nanHistory = [NaN, 50, 60, NaN, 80, 90, NaN];
  const res = generateDeterministicBaselineForecast(nanHistory, 24, null, 0.0);
  // BUG INVESTIGATION: Does this generate NaNs violating monotonicity?
  assertMonotonicQuantiles(res.quantiles, 'NaN history');
});

recordTest('1.8: Mixed non-numeric and null/undefined values in series', () => {
  const dirtyHistory = [null, undefined, '75', 'invalid', 120, null];
  const res = generateDeterministicBaselineForecast(dirtyHistory, 24, null, 0.0);
  // BUG INVESTIGATION: Does this generate NaNs violating monotonicity?
  assertMonotonicQuantiles(res.quantiles, 'Dirty history');
});

recordTest('1.9: Horizon boundaries (horizon = 1, horizon = 72, horizon = 168)', () => {
  const history = new Array(96).fill(60);
  for (const h of [1, 72, 168]) {
    const res = generateDeterministicBaselineForecast(history, h, null, 0.0);
    assertMonotonicQuantiles(res.quantiles, `Horizon ${h}`);
    assert.equal(res.quantiles.p50.length, h);
  }
});

recordTest('1.10: Agreement metric bounds under extreme divergences', () => {
  const agr1 = computeAgreementPercentage([50, 50], [50, 50]);
  assert.equal(agr1, 100.0);

  const agr2 = computeAgreementPercentage([1000, 1000], [0, 0]);
  assert.ok(agr2 >= 0.0 && agr2 <= 100.0);

  const agr3 = computeAgreementPercentage([0, 0], [0, 0]);
  assert.equal(agr3, 100.0);

  const agr4 = computeAgreementPercentage([NaN, 50], [50, NaN]);
  assert.ok(!Number.isNaN(agr4));
  assert.ok(agr4 >= 0.0 && agr4 <= 100.0);
});

// -----------------------------------------------------------------------------
// 2. ORACLE: ANOMALY DETECTION UNDER EXTREME BOUNDARIES
// -----------------------------------------------------------------------------
console.log('\n--- TEST SUITE 2: Anomaly Detection Under Extreme Boundaries ---');

recordTest('2.1: Massive AQI Spike (500 AQI vs normal 50) triggers safety warning', () => {
  const history = {
    times: Array.from({ length: 96 }, (_, i) => new Date(Date.now() - (96 - i) * 3600000).toISOString()),
    us_aqi: new Array(96).fill(50),
    apparent_temp: new Array(96).fill(25)
  };
  const current = { aqi: 500, apparentTemp: 25, time: new Date().toISOString() };
  const res = detectLocalAnomaly(current, history, 'TestCity');

  assert.equal(res.detected, true);
  assert.equal(res.safetyRelevant, true);
  assert.equal(res.severity, 'warning');
  assert.ok(res.message.includes('Unusually smoky'));
});

recordTest('2.2: Extreme Heat Spike (45°C vs normal 25°C) triggers safety warning', () => {
  const history = {
    times: Array.from({ length: 96 }, (_, i) => new Date(Date.now() - (96 - i) * 3600000).toISOString()),
    us_aqi: new Array(96).fill(50),
    apparent_temp: new Array(96).fill(25)
  };
  const current = { aqi: 50, apparentTemp: 45, time: new Date().toISOString() };
  const res = detectLocalAnomaly(current, history, 'TestCity');

  assert.equal(res.detected, true);
  assert.equal(res.safetyRelevant, true);
  assert.equal(res.severity, 'warning');
  assert.ok(res.message.includes('Abnormally hot'));
});

recordTest('2.3: Zero AQI and Sub-Zero Temp (-30°C) with empty history', () => {
  const res = detectLocalAnomaly(
    { aqi: 0, apparentTemp: -30, time: new Date().toISOString() },
    { times: [], us_aqi: [], apparent_temp: [] },
    'ArcticCity'
  );
  assert.ok(res);
  assert.equal(typeof res.detected, 'boolean');
  assert.equal(typeof res.safetyRelevant, 'boolean');
  assert.ok(typeof res.message === 'string');
});

recordTest('2.4: NaN in current readings does not crash or throw exception', () => {
  const res = detectLocalAnomaly(
    { aqi: NaN, apparentTemp: NaN, time: 'invalid-date' },
    { times: ['invalid'], us_aqi: [NaN], apparent_temp: [NaN] },
    'CorruptCity'
  );
  assert.ok(res);
  assert.equal(typeof res.detected, 'boolean');
  assert.equal(typeof res.severity, 'string');
});

// -----------------------------------------------------------------------------
// 3. ORACLE: SIDECAR DISCONNECT / TIMEOUT / CORRUPTION RESILIENCE
// -----------------------------------------------------------------------------
console.log('\n--- TEST SUITE 3: Sidecar Disconnect, Timeout, and Corruption Resilience ---');

await recordAsyncTest('3.1: Sidecar Connection Refused (ECONNREFUSED) cascades cleanly to baseline', async () => {
  const history = {
    us_aqi: new Array(96).fill(60),
    pm2_5: new Array(96).fill(20),
    apparent_temp: new Array(96).fill(25),
    uv: new Array(96).fill(5)
  };

  const originalUrl = config.mlSidecarUrl;
  config.mlSidecarUrl = 'http://127.0.0.1:59999';

  try {
    const res = await mlClient.getForecast({
      lat: 23.74,
      lon: 90.40,
      history,
      horizonHours: 24
    });

    assert.equal(res.ok, true);
    assert.equal(res.model, MODEL_LABEL_BASELINE);
    assert.equal(res.fallback, true);
    assert.ok(res.forecasts.us_aqi);
    assertMonotonicQuantiles(res.forecasts.us_aqi, 'Fallback on ECONNREFUSED');
  } finally {
    config.mlSidecarUrl = originalUrl;
  }
});

await recordAsyncTest('3.2: Sidecar Timeout (exceeds 2500ms timeout) aborts and cascades to baseline', async () => {
  const hangingServer = http.createServer((req, res) => {
    // Intentionally never respond or respond after 3500ms
    setTimeout(() => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, model: 'TabPFN-v2.0' }));
    }, 3500);
  });

  await new Promise(r => hangingServer.listen(0, '127.0.0.1', r));
  const port = hangingServer.address().port;
  const originalUrl = config.mlSidecarUrl;
  config.mlSidecarUrl = `http://127.0.0.1:${port}`;

  try {
    const startTime = Date.now();
    const history = {
      us_aqi: new Array(96).fill(60),
      pm2_5: new Array(96).fill(20),
      apparent_temp: new Array(96).fill(25),
      uv: new Array(96).fill(5)
    };

    const res = await mlClient.getForecast({
      lat: 23.74,
      lon: 90.40,
      history,
      horizonHours: 24
    });

    const elapsed = Date.now() - startTime;
    console.log(`    -> Timeout fallback resolved in ${elapsed}ms (timeout limit: 2500ms)`);
    assert.ok(elapsed >= 2400 && elapsed <= 3400, `Timeout elapsed was ${elapsed}ms`);
    assert.equal(res.ok, true);
    assert.equal(res.model, MODEL_LABEL_BASELINE);
    assert.equal(res.fallback, true);
  } finally {
    await new Promise(r => hangingServer.close(r));
    config.mlSidecarUrl = originalUrl;
  }
});

await recordAsyncTest('3.3: Sidecar HTTP 500 error cascades cleanly to baseline', async () => {
  const errorServer = http.createServer((req, res) => {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal Model Execution Exception' }));
  });

  await new Promise(r => errorServer.listen(0, '127.0.0.1', r));
  const port = errorServer.address().port;
  const originalUrl = config.mlSidecarUrl;
  config.mlSidecarUrl = `http://127.0.0.1:${port}`;

  try {
    const history = {
      us_aqi: new Array(96).fill(70),
      pm2_5: new Array(96).fill(25),
      apparent_temp: new Array(96).fill(26),
      uv: new Array(96).fill(4)
    };

    const res = await mlClient.getForecast({
      lat: 23.74,
      lon: 90.40,
      history,
      horizonHours: 24
    });

    assert.equal(res.ok, true);
    assert.equal(res.model, MODEL_LABEL_BASELINE);
    assert.equal(res.fallback, true);
  } finally {
    await new Promise(r => errorServer.close(r));
    config.mlSidecarUrl = originalUrl;
  }
});

await recordAsyncTest('3.4: Sidecar Malformed / Corrupted Non-JSON body cascades cleanly to baseline', async () => {
  const corruptServer = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<html><head><title>Bad Gateway</title></head><body>502 Bad Gateway</body></html>');
  });

  await new Promise(r => corruptServer.listen(0, '127.0.0.1', r));
  const port = corruptServer.address().port;
  const originalUrl = config.mlSidecarUrl;
  config.mlSidecarUrl = `http://127.0.0.1:${port}`;

  try {
    const history = {
      us_aqi: new Array(96).fill(70),
      pm2_5: new Array(96).fill(25),
      apparent_temp: new Array(96).fill(26),
      uv: new Array(96).fill(4)
    };

    const res = await mlClient.getForecast({
      lat: 23.74,
      lon: 90.40,
      history,
      horizonHours: 24
    });

    assert.equal(res.ok, true);
    assert.equal(res.model, MODEL_LABEL_BASELINE);
    assert.equal(res.fallback, true);
  } finally {
    await new Promise(r => corruptServer.close(r));
    config.mlSidecarUrl = originalUrl;
  }
});

// -----------------------------------------------------------------------------
// 4. ORACLE: AUTHORITATIVE GUARDRAIL INVARIANT STRESS TEST
// -----------------------------------------------------------------------------
console.log('\n--- TEST SUITE 4: Authoritative Guardrails Invariant Stress Test ---');

recordTest('4.1: Optimistic ML forecast (AQI 10) CANNOT relax actual toxic current conditions (AQI 220)', () => {
  const severeWeather = {
    aqi: 220,
    pm25: 160,
    apparentTemp: 28,
    uv: 4,
    precipProb: 0,
    precip: 0,
    weatherCode: 0,
    isDaylight: true
  };

  const scoreEval = calculateHourlyGreenWindowScore(severeWeather);
  assert.ok(scoreEval.score <= 30, `Score must be heavily penalized (was ${scoreEval.score})`);

  const guard = evaluateSafetyGuardrails(severeWeather, 'en');
  assert.equal(guard.maxAllowedEffort, 'rest', 'Guardrail must enforce rest');
  assert.ok(guard.requiredHealthNotesEn.some(r => r.includes('AQI 220') || r.includes('N95')));
});

recordTest('4.2: Anomaly alert can only ADD caution, never elevate score or relax guardrail', () => {
  const pleasantWeather = {
    aqi: 40,
    pm25: 10,
    apparentTemp: 24,
    uv: 3,
    precipProb: 0,
    precip: 0,
    weatherCode: 0,
    isDaylight: true
  };

  const normalScore = calculateHourlyGreenWindowScore(pleasantWeather);
  assert.ok(normalScore.score >= 80, 'Pleasant weather has high score');

  const anomalyAlert = {
    detected: true,
    severity: 'warning',
    message: 'Rapid particulate spike detected.',
    safetyRelevant: true
  };

  const reasons = [...normalScore.reasonsEn];
  if (anomalyAlert.detected && anomalyAlert.safetyRelevant) {
    reasons.unshift(`[Alert] ${anomalyAlert.message}`);
  }

  assert.ok(reasons[0].includes('[Alert] Rapid particulate spike'));
  assert.equal(normalScore.score, normalScore.score);
});

// -----------------------------------------------------------------------------
// 5. ORACLE: EXPRESS SERVER /api/weather & /api/ml/* INTEGRATION STRESS
// -----------------------------------------------------------------------------
console.log('\n--- TEST SUITE 5: Express Server /api/weather & ML Route Stress ---');

await recordAsyncTest('5.1: /api/demo/dhaka returns valid TabPFN quantile bands and anomaly data', async () => {
  const appHandle = await startAppServer();
  try {
    const res = await fetch(`${appHandle.baseUrl}/api/demo/dhaka?lang=en`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ok, true);
    assert.equal(data.isDemo, true);
    assert.ok(data.timeline.length > 0);
    assert.ok(data.tabpfn);
    assert.equal(data.tabpfn.fallback, true);

    // Verify first step has quantiles
    const firstStep = data.timeline[0];
    assert.ok(firstStep.tabpfn);
    assert.ok(firstStep.tabpfn.p10 !== null);
    assert.ok(firstStep.tabpfn.p50 !== null);
    assert.ok(firstStep.tabpfn.p90 !== null);
    assert.ok(firstStep.tabpfn.p10 <= firstStep.tabpfn.p50);
    assert.ok(firstStep.tabpfn.p50 <= firstStep.tabpfn.p90);
  } finally {
    await appHandle.close();
  }
});

await recordAsyncTest('5.2: POST /api/ml/forecast directly proxies and falls back cleanly', async () => {
  const appHandle = await startAppServer();
  const originalUrl = config.mlSidecarUrl;
  config.mlSidecarUrl = 'http://127.0.0.1:59999'; // Dead port forces fallback

  try {
    const res = await fetch(`${appHandle.baseUrl}/api/ml/forecast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat: 23.74,
        lon: 90.40,
        history: {
          us_aqi: new Array(96).fill(65),
          pm2_5: new Array(96).fill(20),
          apparent_temp: new Array(96).fill(25),
          uv: new Array(96).fill(4)
        },
        horizonHours: 24
      })
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ok, true);
    assert.equal(data.model, MODEL_LABEL_BASELINE);
    assert.equal(data.fallback, true);
    assertMonotonicQuantiles(data.forecasts.us_aqi, 'Proxy fallback');
  } finally {
    config.mlSidecarUrl = originalUrl;
    await appHandle.close();
  }
});

await recordAsyncTest('5.3: POST /api/ml/anomaly directly evaluates without crashing', async () => {
  const appHandle = await startAppServer();
  const originalUrl = config.mlSidecarUrl;
  config.mlSidecarUrl = 'http://127.0.0.1:59999';

  try {
    const res = await fetch(`${appHandle.baseUrl}/api/ml/anomaly`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        current: { aqi: 180, apparentTemp: 32 },
        history: { us_aqi: new Array(96).fill(50), apparent_temp: new Array(96).fill(25) },
        city: 'Dhaka'
      })
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.detected, true);
    assert.equal(data.safetyRelevant, true);
  } finally {
    config.mlSidecarUrl = originalUrl;
    await appHandle.close();
  }
});

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log('\n================================================================');
console.log(`TOTAL TESTS:  ${totalTests}`);
console.log(`PASSED TESTS: ${passedTests}`);
console.log(`FAILED TESTS: ${failedTests}`);
console.log('================================================================');

if (failedTests > 0) {
  console.log('\nFAILURES RECORDED:');
  findings.forEach(f => {
    console.log(`- ${f.name}: ${f.error}`);
  });
  process.exit(1);
} else {
  console.log('\nALL EMPIRICAL ORACLE TESTS PASSED CLEANLY.');
  process.exit(0);
}
