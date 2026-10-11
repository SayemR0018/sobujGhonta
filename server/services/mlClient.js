/**
 * ML Sidecar Client & Fallback Engine for TabPFN Tabular Forecasting and Anomaly Detection.
 * Connects to the Python FastAPI sidecar, or gracefully cascades to the deterministic baseline.
 * Non-TabPFN outputs are strictly labeled "baseline (not TabPFN)".
 */

import { config } from '../config.js';

const SIDECAR_TIMEOUT_MS = 800;
let sidecarOfflineUntil = 0;
export const MODEL_LABEL_BASELINE = 'baseline (not TabPFN)';

/**
 * Computes forecast agreement percentage against Open-Meteo operational baseline:
 * max(0, 1 - |p50 - y_om| / max(y_om, 1.0)) * 100
 */
export function computeAgreementPercentage(p50Array, omArray) {
  if (!p50Array || !omArray || p50Array.length === 0 || omArray.length === 0) {
    return 100.0;
  }
  const n = Math.min(p50Array.length, omArray.length);
  let totalAgreement = 0;
  for (let i = 0; i < n; i++) {
    const y_om = Number(omArray[i]) || 0;
    const p50 = Number(p50Array[i]) || 0;
    const denom = Math.max(Math.abs(y_om), 1.0);
    const relDiff = Math.abs(p50 - y_om) / denom;
    totalAgreement += Math.max(0.0, 1.0 - relDiff);
  }
  return Math.round((totalAgreement / n) * 1000) / 10;
}

/**
 * High-fidelity deterministic baseline regressor implemented in Node.js.
 * Combines diurnal hour-of-day profile, autoregressive persistence decay,
 * and empirical residual dispersion.
 * Labeled explicitly as "baseline (not TabPFN)".
 */
export function generateDeterministicBaselineForecast(historySeries, horizon = 24, omGuidance = null, clampMin = 0.0) {
  const raw = Array.isArray(historySeries) ? historySeries : [];
  if (raw.length === 0) {
    const defaultVal = Math.max(0.0, Number.isFinite(clampMin) ? clampMin : 0.0);
    const defaults = new Array(horizon).fill(defaultVal);
    return {
      model: MODEL_LABEL_BASELINE,
      quantiles: { p10: defaults, p50: defaults, p90: defaults },
      agreement: 100.0
    };
  }

  // Find first valid finite numeric value in historySeries
  let initialVal = Number.isFinite(clampMin) ? clampMin : 0.0;
  for (let i = 0; i < raw.length; i++) {
    const v = raw[i];
    if (v !== null && v !== undefined && v !== '') {
      const num = Number(v);
      if (Number.isFinite(num)) {
        initialVal = num;
        break;
      }
    }
  }

  // Forward fill non-finite values (NaN, null, undefined, invalid strings)
  let lastVal = initialVal;
  const series = [];
  for (let i = 0; i < raw.length; i++) {
    const v = raw[i];
    if (v !== null && v !== undefined && v !== '') {
      const num = Number(v);
      if (Number.isFinite(num)) {
        lastVal = num;
      }
    }
    series.push(lastVal);
  }
  const n = series.length;

  // 1. Group historical data by hour-of-day (0-23)
  const hourlyBins = Array.from({ length: 24 }, () => []);
  for (let i = 0; i < n; i++) {
    hourlyBins[i % 24].push(series[i]);
  }

  const hourlyMeans = hourlyBins.map((bin, h) => {
    if (bin.length === 0) return series[n - 1];
    return bin.reduce((a, b) => a + b, 0) / bin.length;
  });

  const hourlyStds = hourlyBins.map((bin, h) => {
    if (bin.length <= 1) return 1.0;
    const mean = hourlyMeans[h];
    const variance = bin.reduce((sum, v) => sum + (v - mean) ** 2, 0) / bin.length;
    const std = Math.sqrt(Math.max(0, variance));
    return Number.isFinite(std) ? Math.max(std, 0.5) : 1.0;
  });

  // Current residual innovation relative to historical diurnal expectation
  const lastHourIdx = (n - 1) % 24;
  let currentBias = series[n - 1] - hourlyMeans[lastHourIdx];
  if (!Number.isFinite(currentBias)) currentBias = 0.0;

  const p10 = [];
  const p50 = [];
  const p90 = [];

  for (let h = 1; h <= horizon; h++) {
    const hourIdx = (n - 1 + h) % 24;
    const diurnalVal = hourlyMeans[hourIdx];

    // Exponential persistence decay of current innovation (half-life ~ 16h)
    const decay = Math.exp(-h / 16.0);
    let predPoint = diurnalVal + currentBias * decay;

    // Blend with Open-Meteo operational forecast if available
    if (omGuidance && (h - 1) < omGuidance.length) {
      const omRaw = omGuidance[h - 1];
      if (omRaw !== null && omRaw !== undefined && omRaw !== '') {
        const omVal = Number(omRaw);
        if (Number.isFinite(omVal)) {
          predPoint = 0.6 * predPoint + 0.4 * omVal;
        }
      }
    }

    // Horizon-dependent expanding uncertainty spread
    const horizonSpread = 1.0 + 0.15 * Math.sqrt(h);
    const hourlyStd = Number.isFinite(hourlyStds[hourIdx]) ? hourlyStds[hourIdx] : 1.0;
    const spread = hourlyStd * horizonSpread;

    let p50Val = Number.isFinite(predPoint) ? Math.round(predPoint * 10) / 10 : Math.max(clampMin, 0.0);
    let p10Val = (Number.isFinite(predPoint) && Number.isFinite(spread))
      ? Math.round((predPoint - 1.28 * spread) * 10) / 10
      : p50Val;
    let p90Val = (Number.isFinite(predPoint) && Number.isFinite(spread))
      ? Math.round((predPoint + 1.28 * spread) * 10) / 10
      : p50Val;

    p10Val = Math.max(clampMin, p10Val);
    p50Val = Math.max(clampMin, p50Val);
    p90Val = Math.max(clampMin, p90Val);

    if (p50Val < p10Val) p50Val = p10Val;
    if (p90Val < p50Val) p90Val = p50Val;

    p10.push(p10Val);
    p50.push(p50Val);
    p90.push(p90Val);
  }

  const agreement = omGuidance ? computeAgreementPercentage(p50, omGuidance) : 92.5;

  return {
    model: MODEL_LABEL_BASELINE,
    quantiles: { p10, p50, p90 },
    agreement
  };
}

/**
 * Deterministic anomaly detection in Node.js when sidecar is offline.
 */
export function detectLocalAnomaly(current, history, cityName = 'your area') {
  const currAqi = Number(current?.aqi ?? current?.us_aqi ?? 50);
  const currTemp = Number(current?.apparentTemp ?? current?.apparent_temp ?? 25);
  const currTime = current?.time || new Date().toISOString();

  let currHour = 12;
  try {
    currHour = new Date(currTime).getHours();
  } catch {
    currHour = 12;
  }

  const histTimes = history?.times || [];
  const histAqi = history?.us_aqi || [];
  const histTemp = history?.apparent_temp || history?.temp || [];

  // Match hours from same diurnal window (+/- 1 hour)
  const matchedAqi = [];
  const matchedTemp = [];

  for (let i = 0; i < histTimes.length; i++) {
    try {
      const h = new Date(histTimes[i]).getHours();
      if (Math.abs(h - currHour) <= 1 || Math.abs(h - currHour) >= 23) {
        if (histAqi[i] != null) matchedAqi.push(Number(histAqi[i]));
        if (histTemp[i] != null) matchedTemp.push(Number(histTemp[i]));
      }
    } catch {
      // ignore parsing error
    }
  }

  const meanAqi = matchedAqi.length > 0
    ? matchedAqi.reduce((a, b) => a + b, 0) / matchedAqi.length
    : 65.0;
  const stdAqi = matchedAqi.length > 1
    ? Math.max(Math.sqrt(matchedAqi.reduce((sum, v) => sum + (v - meanAqi) ** 2, 0) / matchedAqi.length), 3.0)
    : 15.0;

  const meanTemp = matchedTemp.length > 0
    ? matchedTemp.reduce((a, b) => a + b, 0) / matchedTemp.length
    : 27.0;
  const stdTemp = matchedTemp.length > 1
    ? Math.max(Math.sqrt(matchedTemp.reduce((sum, v) => sum + (v - meanTemp) ** 2, 0) / matchedTemp.length), 1.0)
    : 3.0;

  const zAqi = (currAqi - meanAqi) / stdAqi;
  const zTemp = (currTemp - meanTemp) / stdTemp;

  const aqiSpike = zAqi >= 2.0 || (currAqi >= 100 && currAqi >= meanAqi * 1.5);
  const tempSpike = zTemp >= 2.0 || (currTemp >= 35 && currTemp >= meanTemp + 5.0);

  const detected = aqiSpike || tempSpike;

  let safetyRelevant = false;
  if (currAqi > 150 || currTemp >= 38) {
    safetyRelevant = true;
  } else if (aqiSpike && currAqi >= 120) {
    safetyRelevant = true;
  } else if (tempSpike && currTemp >= 36) {
    safetyRelevant = true;
  }

  let severity = 'none';
  let message = `Conditions typical for this hour in ${cityName}.`;

  if (detected) {
    severity = (zAqi >= 3.0 || zTemp >= 3.0 || safetyRelevant) ? 'warning' : 'caution';
    const hourLabel = `${currHour % 12 || 12} ${currHour >= 12 ? 'PM' : 'AM'}`;
    const msgs = [];
    if (aqiSpike) {
      const pctDiff = Math.round(((currAqi - meanAqi) / Math.max(meanAqi, 1.0)) * 100);
      const sign = pctDiff >= 0 ? '+' : '';
      msgs.push(`Unusually smoky for ${hourLabel} in ${cityName}: AQI ${Math.round(currAqi)} vs typical ${Math.round(meanAqi)} (${sign}${pctDiff}%).`);
    }
    if (tempSpike) {
      const diffDeg = Math.round((currTemp - meanTemp) * 10) / 10;
      const sign = diffDeg >= 0 ? '+' : '';
      msgs.push(`Abnormally hot for ${hourLabel}: apparent temperature ${Math.round(currTemp * 10) / 10}°C vs typical ${Math.round(meanTemp * 10) / 10}°C (${sign}${diffDeg}°C).`);
    }
    message = msgs.join(' ');
  }

  return {
    detected,
    severity,
    message,
    safetyRelevant,
    metrics: {
      aqi: { current: currAqi, historical_mean: Math.round(meanAqi * 10) / 10, z_score: Math.round(zAqi * 100) / 100, is_anomaly: aqiSpike },
      apparent_temp: { current: currTemp, historical_mean: Math.round(meanTemp * 10) / 10, z_score: Math.round(zTemp * 100) / 100, is_anomaly: tempSpike }
    }
  };
}

/**
 * Main ML Client communicating with sidecar with automatic fallback.
 */
export const mlClient = {
  /**
   * Generates quantile forecasts [p10, p50, p90] for weather and air quality metrics.
   */
  async getForecast({ lat, lon, history, horizonHours = 24, token = null }) {
    // If TABPFN_MODE is off or sidecar is marked offline, use deterministic baseline directly
    if (config.tabpfnMode === 'off' || Date.now() < sidecarOfflineUntil) {
      return this.executeDeterministicFallback(history, horizonHours);
    }

    const sidecarUrl = config.mlSidecarUrl || 'http://127.0.0.1:8000';
    const effectiveToken = token || config.tabpfnToken || '';

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), SIDECAR_TIMEOUT_MS);

      const headers = { 'Content-Type': 'application/json' };
      if (effectiveToken) {
        headers['x-tabpfn-token'] = effectiveToken;
      }

      const res = await fetch(`${sidecarUrl}/forecast`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          lat: Number(lat),
          lon: Number(lon),
          history,
          horizonHours,
          token: effectiveToken
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`ML Sidecar HTTP ${res.status}`);
      }

      const data = await res.json();
      return data;
    } catch (err) {
      // Trip circuit breaker for 5 minutes so subsequent requests don't hang
      sidecarOfflineUntil = Date.now() + 5 * 60 * 1000;
      // Seamlessly cascade to deterministic baseline labeled "baseline (not TabPFN)"
      return this.executeDeterministicFallback(history, horizonHours);
    }
  },

  /**
   * Evaluates current readings against historical distribution for anomalies.
   */
  async checkAnomaly({ current, history, city = 'your area' }) {
    if (config.tabpfnMode === 'off' || Date.now() < sidecarOfflineUntil) {
      return detectLocalAnomaly(current, history, city);
    }

    const sidecarUrl = config.mlSidecarUrl || 'http://127.0.0.1:8000';
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), SIDECAR_TIMEOUT_MS);

      const res = await fetch(`${sidecarUrl}/anomaly`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current, history, city }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`ML Sidecar HTTP ${res.status}`);
      }

      return await res.json();
    } catch (err) {
      // Trip circuit breaker for 5 minutes
      sidecarOfflineUntil = Date.now() + 5 * 60 * 1000;
      return detectLocalAnomaly(current, history, city);
    }
  },

  /**
   * Internal deterministic fallback runner.
   */
  executeDeterministicFallback(history, horizonHours) {
    const aqiSeries = history?.us_aqi || [];
    const pmSeries = history?.pm2_5 || [];
    const tempSeries = history?.apparent_temp || history?.temp || [];
    const uvSeries = history?.uv || [];
    const omAqiForecast = history?.om_aqi_forecast || null;

    const aqiRes = generateDeterministicBaselineForecast(aqiSeries, horizonHours, omAqiForecast, 0.0);
    const pmRes = generateDeterministicBaselineForecast(pmSeries, horizonHours, null, 0.0);
    const tempRes = generateDeterministicBaselineForecast(tempSeries, horizonHours, null, -40.0);
    const uvRes = generateDeterministicBaselineForecast(uvSeries, horizonHours, null, 0.0);

    return {
      ok: true,
      model: MODEL_LABEL_BASELINE,
      version: '1.0',
      fallback: true,
      horizonHours,
      agreement: aqiRes.agreement,
      forecasts: {
        us_aqi: aqiRes.quantiles,
        pm2_5: pmRes.quantiles,
        apparent_temp: tempRes.quantiles,
        uv: uvRes.quantiles
      }
    };
  }
};
