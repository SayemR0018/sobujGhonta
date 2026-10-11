import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateDeterministicBaselineForecast,
  detectLocalAnomaly,
  computeAgreementPercentage,
  mlClient,
  MODEL_LABEL_BASELINE
} from '../services/mlClient.js';
import { DHAKA_SAMPLE_WEATHER } from '../services/demoData.js';
import { evaluateSafetyGuardrails } from '../services/guardrails.js';
import { apiRouter } from '../routes/api.js';

test('TabPFN Foundation Model Integration & Fallback Engine', async (t) => {
  await t.test('Deterministic baseline produces monotonic quantiles labeled "baseline (not TabPFN)"', () => {
    const history = [45, 48, 52, 60, 75, 80, 85, 90, 70, 60, 50, 48, 45, 50, 65, 80, 95, 100, 85, 70, 55, 50, 48, 46];
    const result = generateDeterministicBaselineForecast(history, 24, null, 0.0);

    assert.equal(result.model, MODEL_LABEL_BASELINE);
    assert.equal(result.quantiles.p10.length, 24);
    assert.equal(result.quantiles.p50.length, 24);
    assert.equal(result.quantiles.p90.length, 24);

    for (let i = 0; i < 24; i++) {
      assert.ok(
        result.quantiles.p10[i] <= result.quantiles.p50[i],
        `Hour ${i}: p10 (${result.quantiles.p10[i]}) should be <= p50 (${result.quantiles.p50[i]})`
      );
      assert.ok(
        result.quantiles.p50[i] <= result.quantiles.p90[i],
        `Hour ${i}: p50 (${result.quantiles.p50[i]}) should be <= p90 (${result.quantiles.p90[i]})`
      );
      assert.ok(result.quantiles.p10[i] >= 0, `Hour ${i}: p10 should be non-negative`);
    }
  });

  await t.test('Agreement metric computes truthful percentage vs Open-Meteo guidance', () => {
    const p50 = [50, 60, 70, 80];
    const omExact = [50, 60, 70, 80];
    assert.equal(computeAgreementPercentage(p50, omExact), 100.0);

    const omDeviated = [55, 66, 77, 88]; // 10% deviation
    const agreement = computeAgreementPercentage(p50, omDeviated);
    assert.ok(agreement >= 88.0 && agreement <= 92.0, `Agreement was ${agreement}`);
  });

  await t.test('Local anomaly detector accurately flags smoky conditions with safety relevance', () => {
    const history = {
      times: [
        '2026-10-06T15:00', '2026-10-06T16:00', '2026-10-06T17:00',
        '2026-10-07T15:00', '2026-10-07T16:00', '2026-10-07T17:00'
      ],
      us_aqi: [65, 70, 72, 60, 68, 70],
      apparent_temp: [30, 29, 28, 30, 29, 28]
    };

    // Normal reading
    const normal = detectLocalAnomaly({ time: '2026-10-08T16:00', aqi: 68, apparentTemp: 29 }, history, 'Dhaka');
    assert.equal(normal.detected, false);
    assert.equal(normal.safetyRelevant, false);
    assert.equal(normal.severity, 'none');

    // Unusually smoky spike crossing hazardous threshold (AQI 168 vs normal 68)
    const smoky = detectLocalAnomaly({ time: '2026-10-08T16:00', aqi: 168, apparentTemp: 29 }, history, 'Dhaka');
    assert.equal(smoky.detected, true);
    assert.equal(smoky.safetyRelevant, true);
    assert.ok(smoky.severity === 'warning' || smoky.severity === 'caution');
    assert.match(smoky.message, /Unusually smoky/i);
    assert.ok(smoky.metrics.aqi.is_anomaly);

    // Abnormally hot condition (apparent temp 39.5°C vs normal 29°C)
    const heat = detectLocalAnomaly({ time: '2026-10-08T16:00', aqi: 65, apparentTemp: 39.5 }, history, 'Dhaka');
    assert.equal(heat.detected, true);
    assert.equal(heat.safetyRelevant, true);
    assert.match(heat.message, /Abnormally hot/i);
  });

  await t.test('mlClient transparently falls back to deterministic baseline when sidecar is offline', async () => {
    const history = {
      times: DHAKA_SAMPLE_WEATHER.hourly.time,
      us_aqi: DHAKA_SAMPLE_WEATHER.hourly.us_aqi,
      pm2_5: DHAKA_SAMPLE_WEATHER.hourly.pm2_5,
      temp: DHAKA_SAMPLE_WEATHER.hourly.temperature_2m,
      apparent_temp: DHAKA_SAMPLE_WEATHER.hourly.apparent_temperature,
      uv: DHAKA_SAMPLE_WEATHER.hourly.uv_index
    };

    const res = await mlClient.getForecast({
      lat: 23.74,
      lon: 90.40,
      history,
      horizonHours: 24
    });

    assert.equal(res.ok, true);
    assert.equal(res.fallback, true);
    assert.equal(res.model, MODEL_LABEL_BASELINE);
    assert.ok(res.forecasts.us_aqi.p10.length === 24);
    assert.ok(res.forecasts.us_aqi.p50.length === 24);
    assert.ok(res.forecasts.us_aqi.p90.length === 24);
  });

  await t.test('Bundled Dhaka demo payload includes TabPFN quantile bands and anomaly metadata', () => {
    let capturedJson = null;
    const req = { query: { lang: 'en' } };
    const res = {
      json: (data) => { capturedJson = data; }
    };

    // Find the /demo/dhaka handler in the router stack
    const demoRoute = apiRouter.stack.find(s => s.route && s.route.path === '/demo/dhaka');
    assert.ok(demoRoute, 'demo/dhaka route must exist');
    demoRoute.route.stack[0].handle(req, res);

    assert.ok(capturedJson, 'Response must be returned');
    assert.equal(capturedJson.ok, true);
    assert.equal(capturedJson.isDemo, true);
    assert.ok(capturedJson.tabpfn, 'tabpfn summary must exist');
    assert.equal(capturedJson.tabpfn.model, MODEL_LABEL_BASELINE);
    assert.ok(capturedJson.anomaly, 'anomaly object must exist');
    assert.equal(capturedJson.anomaly.safetyRelevant, false);

    // Verify timeline items contain tabpfn quantile metadata
    assert.ok(capturedJson.timeline.length >= 24);
    const firstStep = capturedJson.timeline[0];
    assert.ok(firstStep.tabpfn, 'Timeline step must have tabpfn metadata');
    assert.ok(typeof firstStep.tabpfn.p10 === 'number');
    assert.ok(typeof firstStep.tabpfn.p50 === 'number');
    assert.ok(typeof firstStep.tabpfn.p90 === 'number');
    assert.ok(firstStep.tabpfn.p10 <= firstStep.tabpfn.p50);
    assert.ok(firstStep.tabpfn.p50 <= firstStep.tabpfn.p90);
  });

  await t.test('Authoritative Guardrails Invariant: ML and search can only ADD caution, never relax safety', () => {
    // Extreme heat (39C) + unhealthy AQI (175)
    const dangerousCondition = { aqi: 175, apparentTemp: 39 };
    const guardrails = evaluateSafetyGuardrails(dangerousCondition);

    // Guardrails must mandate gentle effort, heat caution, and health notes
    assert.equal(guardrails.maxAllowedEffort, 'gentle');
    assert.equal(guardrails.flags.unhealthyAqi, true);
    assert.equal(guardrails.flags.extremeHeat, true);
    assert.ok(guardrails.requiredHealthNotesEn.length >= 2);
  });
});

