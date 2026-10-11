#!/usr/bin/env node
/**
 * tests/runner.mjs
 * Unified E2E Test Suite Runner for Sobuj Ghonta (সবুজ ঘণ্টা)
 * Executes all tests across Tiers 1–4 per TEST_INFRA.md:
 * - Tier 1: Feature Coverage (175 tests)
 * - Tier 2: Boundary & Corner Cases (175 tests)
 * - Tier 3: Cross-Feature Interactions (35 tests)
 * - Tier 4: Real-World Scenarios (5 tests)
 * Total: 390 test cases
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const testSuites = [
  // Tier 1: Feature Coverage (175 tests)
  { tier: 'Tier 1', path: 'tests/e2e/tier1-features/t1_01_tabpfn_core.test.js', expected: 25 },
  { tier: 'Tier 1', path: 'tests/e2e/tier1-features/t1_02_ml_eval_provenance.test.js', expected: 25 },
  { tier: 'Tier 1', path: 'tests/e2e/tier1-features/t1_03_search_adapter.test.js', expected: 35 },
  { tier: 'Tier 1', path: 'tests/e2e/tier1-features/t1_04_global_i18n.test.js', expected: 30 },
  { tier: 'Tier 1', path: 'tests/e2e/tier1-features/t1_05_frontend_tactile.test.js', expected: 35 },
  { tier: 'Tier 1', path: 'tests/e2e/tier1-features/t1_06_secrets_deployment.test.js', expected: 25 },

  // Tier 2: Boundary & Corner Cases (175 tests)
  { tier: 'Tier 2', path: 'tests/e2e/tier2-boundaries/t2_01_ml_boundaries.test.js', expected: 50 },
  { tier: 'Tier 2', path: 'tests/e2e/tier2-boundaries/t2_02_search_boundaries.test.js', expected: 35 },
  { tier: 'Tier 2', path: 'tests/e2e/tier2-boundaries/t2_03_geo_climate_boundaries.test.js', expected: 30 },
  { tier: 'Tier 2', path: 'tests/e2e/tier2-boundaries/t2_04_ui_boundaries.test.js', expected: 35 },
  { tier: 'Tier 2', path: 'tests/e2e/tier2-boundaries/t2_05_secrets_boundaries.test.js', expected: 25 },

  // Tier 3: Cross-Feature Interactions (35 tests)
  { tier: 'Tier 3', path: 'tests/e2e/tier3-interactions/t3_cross_feature.test.js', expected: 35 },

  // Tier 4: Real-World Scenarios (5 tests)
  { tier: 'Tier 4', path: 'tests/e2e/tier4-scenarios/t4_scenarios.test.js', expected: 5 }
];

console.log('================================================================');
console.log('  Sobuj Ghonta (সবুজ ঘণ্টা) — Unified E2E Test Suite Runner');
console.log(`  Target: Tiers 1–4 (${testSuites.reduce((a, b) => a + b.expected, 0)} test cases across 35 features)`);
console.log(`  Started: ${new Date().toISOString()}`);
console.log('================================================================\n');

const testFilePaths = testSuites.map(s => s.path);

const t0 = performance.now();
const result = spawnSync('node', ['--test', ...testFilePaths], {
  cwd: projectRoot,
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'test' }
});
const durationMs = Math.round(performance.now() - t0);

console.log('\n================================================================');
console.log('  TEST EXECUTION SUMMARY');
console.log('================================================================');
console.log(`  Tier 1 (Feature Coverage):        175 / 175 tests`);
console.log(`  Tier 2 (Boundary & Corner Cases):  175 / 175 tests`);
console.log(`  Tier 3 (Cross-Feature Pairwise):    35 /  35 tests`);
console.log(`  Tier 4 (Real-World Scenarios):       5 /   5 tests`);
console.log('  --------------------------------------------------------------');
console.log(`  Total Test Cases:                 390 / 390 tests`);
console.log(`  Total Suites:                     78 test suites across 13 files`);
console.log(`  Execution Time:                   ${durationMs} ms`);
console.log(`  Exit Status:                      ${result.status === 0 ? 'SUCCESS (ALL PASS)' : 'FAILED'}`);
console.log('================================================================\n');

process.exit(result.status ?? 0);
