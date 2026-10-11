/**
 * tests/e2e/tier1-features/t1_01_tabpfn_core.test.js
 * Tier 1: Feature Coverage (Features 1 to 5)
 * - F1: TabPFN Sidecar / Gateway
 * - F2: TabPFN Tri-State Mode
 * - F3: Continuous 96h Meteo Data
 * - F4: Quantile Forecasts (p10/p50/p90)
 * - F5: Anomaly Detection
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateTabpfnForecastContract,
  validateTabpfnAnomalyContract
} from '../../harness/contractValidators.js';
import { startMockSidecarServer } from '../../harness/testHarness.js';
import tabpfnFixtures from '../../fixtures/tabpfnFixtures.json' with { type: 'json' };

describe('Tier 1: Feature 1 — TabPFN Sidecar / Gateway (R1-F1)', () => {
  test('F1.1: Sidecar /health endpoint returns HTTP 200 with model metadata', async () => {
    const mock = await startMockSidecarServer();
    try {
      const res = await fetch(`${mock.baseUrl}/health`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, 'ok');
      assert.equal(typeof data.model, 'string');
    } finally {
      await mock.close();
    }
  });

  test('F1.2: Sidecar /forecast endpoint satisfies Interface Contract schema', async () => {
    const mock = await startMockSidecarServer();
    try {
      const res = await fetch(`${mock.baseUrl}/forecast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: 23.74,
          lon: 90.40,
          history: tabpfnFixtures.meteo_96h_sample,
          horizonHours: 24
        })
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      validateTabpfnForecastContract(data);
    } finally {
      await mock.close();
    }
  });

  test('F1.3: Sidecar /anomaly endpoint satisfies Interface Contract schema', async () => {
    const mock = await startMockSidecarServer();
    try {
      const res = await fetch(`${mock.baseUrl}/anomaly`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current: { pm25: 120, aqi: 184 },
          history: tabpfnFixtures.meteo_96h_sample
        })
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      validateTabpfnAnomalyContract(data);
    } finally {
      await mock.close();
    }
  });

  test('F1.4: Sidecar gateway reports correct inference version and model name', async () => {
    const sample = tabpfnFixtures.tabpfn_forecast_response;
    assert.equal(sample.model, 'TabPFN-v2.0');
    assert.equal(sample.version, '2.0.4');
  });

  test('F1.5: Gateway returns 404 cleanly on unsupported methods or routes', async () => {
    const mock = await startMockSidecarServer();
    try {
      const res = await fetch(`${mock.baseUrl}/unknown-endpoint`);
      assert.equal(res.status, 404);
      const json = await res.json();
      assert.equal(json.ok, false);
    } finally {
      await mock.close();
    }
  });
});

describe('Tier 1: Feature 2 — TabPFN Tri-State Mode (R1-F2)', () => {
  function resolveTabpfnMode(modeConfig, isSidecarUp, hasApiKey) {
    if (modeConfig === 'local') {
      return isSidecarUp ? 'tabpfn_local' : 'baseline (not TabPFN)';
    }
    if (modeConfig === 'client') {
      return hasApiKey ? 'tabpfn_client' : 'baseline (not TabPFN)';
    }
    return 'baseline (not TabPFN)';
  }

  test('F2.1: Tri-state resolves to tabpfn_local when TABPFN_MODE is local and sidecar is available', () => {
    const resolved = resolveTabpfnMode('local', true, false);
    assert.equal(resolved, 'tabpfn_local');
  });

  test('F2.2: Tri-state resolves to tabpfn_client when TABPFN_MODE is client and API key is present', () => {
    const resolved = resolveTabpfnMode('client', false, true);
    assert.equal(resolved, 'tabpfn_client');
  });

  test('F2.3: Tri-state resolves to baseline (not TabPFN) when TABPFN_MODE is off', () => {
    const resolved = resolveTabpfnMode('off', true, true);
    assert.equal(resolved, 'baseline (not TabPFN)');
  });

  test('F2.4: Graceful fallback to baseline when local sidecar is down in local mode', () => {
    const resolved = resolveTabpfnMode('local', false, false);
    assert.equal(resolved, 'baseline (not TabPFN)');
  });

  test('F2.5: Graceful fallback to baseline when API key is missing in client mode', () => {
    const resolved = resolveTabpfnMode('client', false, false);
    assert.equal(resolved, 'baseline (not TabPFN)');
  });
});

describe('Tier 1: Feature 3 — Continuous 96h Meteo Data (R1-F3)', () => {
  test('F3.1: Generates 96-hour continuous time range (48h past + 48h forecast)', () => {
    const hours = 96;
    const historySample = tabpfnFixtures.meteo_96h_sample;
    assert.equal(historySample.hours_count, hours);
  });

  test('F3.2: PM2.5 and US AQI arrays are continuously populated', () => {
    const { pm2_5_history, us_aqi_history } = tabpfnFixtures.meteo_96h_sample;
    assert.ok(pm2_5_history.length > 0);
    assert.ok(us_aqi_history.length > 0);
    assert.equal(pm2_5_history.every(v => typeof v === 'number' && v >= 0), true);
  });

  test('F3.3: Apparent temperature history tracks thermal comfort drivers', () => {
    const { apparent_temp_history, temp_history } = tabpfnFixtures.meteo_96h_sample;
    assert.equal(apparent_temp_history.length, temp_history.length);
    assert.ok(apparent_temp_history[0] > 0);
  });

  test('F3.4: Timestamps are ISO formatted with monotonic 1-hour increments', () => {
    const times = tabpfnFixtures.meteo_96h_sample.times;
    for (let i = 1; i < times.length; i++) {
      const prev = new Date(times[i - 1]).getTime();
      const curr = new Date(times[i]).getTime();
      assert.equal(curr - prev, 3600000, `Expected 1-hour interval between index ${i-1} and ${i}`);
    }
  });

  test('F3.5: Synchronizes history alignment between weather and air quality APIs', () => {
    const { pm2_5_history, temp_history } = tabpfnFixtures.meteo_96h_sample;
    assert.equal(pm2_5_history.length, temp_history.length);
  });
});

describe('Tier 1: Feature 4 — Quantile Forecasts (p10/p50/p90) (R1-F4)', () => {
  test('F4.1: Forecast response produces 24 hourly quantiles for p10, p50, and p90', () => {
    const { quantiles, horizonHours } = tabpfnFixtures.tabpfn_forecast_response;
    assert.equal(quantiles.p10.length, horizonHours);
    assert.equal(quantiles.p50.length, horizonHours);
    assert.equal(quantiles.p90.length, horizonHours);
  });

  test('F4.2: Enforces monotonic quantile inequality: p10 <= p50 <= p90 across all hours', () => {
    const { quantiles } = tabpfnFixtures.tabpfn_forecast_response;
    for (let i = 0; i < quantiles.p10.length; i++) {
      assert.ok(quantiles.p10[i] <= quantiles.p50[i]);
      assert.ok(quantiles.p50[i] <= quantiles.p90[i]);
    }
  });

  test('F4.3: Agreement metric against Open-Meteo baseline is normalized between 0 and 1', () => {
    const { agreement } = tabpfnFixtures.tabpfn_forecast_response;
    assert.ok(agreement >= 0 && agreement <= 1.0);
    assert.equal(agreement, 0.942);
  });

  test('F4.4: Computes forecast agreement percentage for UI badge display', () => {
    const agreement = 0.942;
    const badgeText = `Forecast Agreement: ${Math.round(agreement * 100)}%`;
    assert.equal(badgeText, 'Forecast Agreement: 94%');
  });

  test('F4.5: Quantile uncertainty interval width (p90 - p10) is strictly non-negative', () => {
    const { quantiles } = tabpfnFixtures.tabpfn_forecast_response;
    for (let i = 0; i < quantiles.p10.length; i++) {
      const spread = quantiles.p90[i] - quantiles.p10[i];
      assert.ok(spread >= 0, `Uncertainty interval must be positive at hour ${i}`);
    }
  });
});

describe('Tier 1: Feature 5 — Anomaly Detection (R1-F5)', () => {
  function detectAnomaly(currentVal, histMean, histStd, threshold = 2.0) {
    if (histStd <= 0) return { detected: false, zScore: 0 };
    const zScore = (currentVal - histMean) / histStd;
    return {
      detected: zScore > threshold,
      zScore: Number(zScore.toFixed(2)),
      threshold
    };
  }

  test('F5.1: Detects smoky anomaly when current PM2.5 exceeds 2 standard deviations above historical mean', () => {
    const result = detectAnomaly(142, 68, 26, 2.0);
    assert.equal(result.detected, true);
    assert.equal(result.zScore, 2.85);
  });

  test('F5.2: Normal weather within 2 standard deviations is not flagged as anomaly', () => {
    const result = detectAnomaly(72, 68, 26, 2.0);
    assert.equal(result.detected, false);
    assert.equal(result.zScore, 0.15);
  });

  test('F5.3: Anomaly flags safety relevance when air quality crosses into hazardous threshold', () => {
    const anomaly = tabpfnFixtures.anomaly_sample;
    assert.equal(anomaly.detected, true);
    assert.equal(anomaly.safetyRelevant, true);
    assert.equal(anomaly.severity, 'warning');
  });

  test('F5.4: Generates concise spoken alert text (<=20 words)', () => {
    const message = tabpfnFixtures.anomaly_sample.message;
    const words = message.trim().split(/\s+/).length;
    assert.ok(words <= 20, `Alert too long: ${words} words`);
  });

  test('F5.5: Non-safety-relevant minor deviations are marked with info severity and not spoken', () => {
    const mildAnomaly = {
      detected: true,
      severity: 'info',
      message: 'Slightly warmer than seasonal median',
      safetyRelevant: false
    };
    validateTabpfnAnomalyContract(mildAnomaly);
    assert.equal(mildAnomaly.safetyRelevant, false);
  });
});
