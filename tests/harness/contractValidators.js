/**
 * tests/harness/contractValidators.js
 * Authoritative schema and contract validators derived from PROJECT.md Interface Contracts.
 */

import assert from 'node:assert/strict';

/**
 * Validates TabPFN Sidecar POST /forecast response schema
 * Interface Contract from PROJECT.md:
 * { ok: boolean, model: string, version: string, quantiles: { p10: number[], p50: number[], p90: number[] }, agreement: number }
 */
export function validateTabpfnForecastContract(data) {
  assert.equal(typeof data, 'object', 'Forecast response must be an object');
  assert.equal(typeof data.ok, 'boolean', 'data.ok must be boolean');
  assert.equal(typeof data.model, 'string', 'data.model must be string');
  assert.equal(typeof data.version, 'string', 'data.version must be string');
  assert.equal(typeof data.quantiles, 'object', 'data.quantiles must be an object');
  assert.ok(Array.isArray(data.quantiles.p10), 'quantiles.p10 must be an array');
  assert.ok(Array.isArray(data.quantiles.p50), 'quantiles.p50 must be an array');
  assert.ok(Array.isArray(data.quantiles.p90), 'quantiles.p90 must be an array');
  assert.equal(data.quantiles.p10.length, data.quantiles.p50.length, 'Quantile lengths must match');
  assert.equal(data.quantiles.p50.length, data.quantiles.p90.length, 'Quantile lengths must match');

  // Verify quantile ordering invariant: p10 <= p50 <= p90
  for (let i = 0; i < data.quantiles.p10.length; i++) {
    const p10 = data.quantiles.p10[i];
    const p50 = data.quantiles.p50[i];
    const p90 = data.quantiles.p90[i];
    assert.ok(p10 <= p50, `Quantile invariant violated at index ${i}: p10 (${p10}) > p50 (${p50})`);
    assert.ok(p50 <= p90, `Quantile invariant violated at index ${i}: p50 (${p50}) > p90 (${p90})`);
  }

  assert.equal(typeof data.agreement, 'number', 'agreement must be a number');
  assert.ok(data.agreement >= 0 && data.agreement <= 1.0, 'agreement must be between 0 and 1.0');
}

/**
 * Validates TabPFN Sidecar POST /anomaly response schema
 * Interface Contract from PROJECT.md:
 * { detected: boolean, severity: string, message: string, safetyRelevant: boolean }
 */
export function validateTabpfnAnomalyContract(data) {
  assert.equal(typeof data, 'object', 'Anomaly response must be an object');
  assert.equal(typeof data.detected, 'boolean', 'data.detected must be boolean');
  assert.equal(typeof data.severity, 'string', 'data.severity must be string');
  assert.ok(['info', 'caution', 'warning'].includes(data.severity), 'Invalid severity');
  assert.equal(typeof data.message, 'string', 'data.message must be string');
  assert.equal(typeof data.safetyRelevant, 'boolean', 'data.safetyRelevant must be boolean');
}

/**
 * Validates Unified Search Normalization Schema
 * Standard normalized schema:
 * { title: string, snippet: string, url: string, source: string, date: string }
 * Max 200 chars, stripped HTML/markdown.
 */
export function validateNormalizedSearchItem(item) {
  assert.equal(typeof item, 'object', 'Item must be an object');
  assert.equal(typeof item.title, 'string', 'item.title must be string');
  assert.equal(typeof item.snippet, 'string', 'item.snippet must be string');
  assert.ok(item.snippet.length <= 200, `item.snippet exceeds 200 chars limit (length: ${item.snippet.length})`);
  assert.ok(!/<[^>]+>/.test(item.snippet), 'item.snippet contains unstripped HTML markup');
  assert.equal(typeof item.url, 'string', 'item.url must be string');
  assert.equal(typeof item.source, 'string', 'item.source must be string');
  assert.ok(item.source.length > 0, 'item.source must have verified domain');
}

/**
 * Validates Privacy Coordinate Rounding (2 decimal places)
 */
export function validateCoordinatePrivacy(lat, lon) {
  const latStr = String(lat);
  const lonStr = String(lon);
  const latDecimals = latStr.includes('.') ? latStr.split('.')[1].length : 0;
  const lonDecimals = lonStr.includes('.') ? lonStr.split('.')[1].length : 0;
  assert.ok(latDecimals <= 2, `Latitude ${lat} has more than 2 decimal places`);
  assert.ok(lonDecimals <= 2, `Longitude ${lon} has more than 2 decimal places`);
}

/**
 * Validates Provenance Metadata Schema
 */
export function validateProvenanceSchema(prov) {
  assert.equal(typeof prov, 'object', 'Provenance must be an object');
  assert.ok(prov.recordedAt || prov.captureDate, 'Provenance must have recorded date');
  assert.ok(prov.weatherSource || prov.sources, 'Provenance must document weather source');
}
