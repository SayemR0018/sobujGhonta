# TEST READY: Sobuj Ghonta (সবুজ ঘণ্টা) — The Green Hour

**Document:** E2E Test Suite Framework & Verification (Tiers 1–4)  
**Architect:** `test_writer_e2e_1`  
**Date:** 2026-10-10  
**Status:** VERIFIED & READY (390 / 390 Tests Passing)  
**Standard:** `TEST_INFRA.md`, `PROJECT.md`, `ORIGINAL_REQUEST.md`  

---

## 1. Executive Summary

The complete requirements-driven E2E testing framework across **Tiers 1–4** has been designed, implemented, and verified for Sobuj Ghonta (সবুজ ঘণ্টা). 

All **390 test cases** execute in **< 800 ms** via the built-in Node.js test runner (`node --test`), requiring zero external test runner dependencies.

```
================================================================
  TEST EXECUTION SUMMARY
================================================================
  Tier 1 (Feature Coverage):        175 / 175 tests (100% PASS)
  Tier 2 (Boundary & Corner Cases):  175 / 175 tests (100% PASS)
  Tier 3 (Cross-Feature Pairwise):    35 /  35 tests (100% PASS)
  Tier 4 (Real-World Scenarios):       5 /   5 tests (100% PASS)
  --------------------------------------------------------------
  Total Test Cases:                 390 / 390 tests (100% PASS)
  Total Test Suites:                78 test suites across 13 files
  Execution Speed:                  ~650–750 ms
  Exit Code:                        0 (CLEAN)
================================================================
```

---

## 2. Test Execution Commands

The test suite can be executed cleanly using standard npm scripts or node:

```bash
# Run the complete 390-test E2E suite across all 4 tiers:
npm run test:e2e

# Or run directly via node:
node tests/runner.mjs

# Run individual tiers:
node --test tests/e2e/tier1-features/*.test.js
node --test tests/e2e/tier2-boundaries/*.test.js
node --test tests/e2e/tier3-interactions/*.test.js
node --test tests/e2e/tier4-scenarios/*.test.js
```

---

## 3. Test Suite Architecture & Directory Layout

The `tests/` directory is partitioned cleanly into fixtures, test harnesses, and tiered test suites:

```text
tests/
├── fixtures/
│   ├── cities.json                  # 8 global cities with coordinates, timezones, parks, provenance
│   ├── searchFixtures.json          # SerpApi/Serper samples, prompt injection payloads, offline snapshots
│   ├── tabpfnFixtures.json          # 96h meteo, TabPFN p10/p50/p90 quantiles, anomaly samples, provenance
│   ├── uiFixtures.json              # Design tokens (Light/Dark/OLED), WCAG AA standards, 8 languages, views
│   └── secretFixtures.json          # Key pattern regexes, leak samples, safe transport headers
├── harness/
│   ├── contractValidators.js        # Strict schema validators for TabPFN, Search, Privacy coords, Provenance
│   └── testHarness.js               # Ephemeral Express app runner & mock FastAPI sidecar server (port 0)
├── e2e/
│   ├── tier1-features/              # 175 tests: 5 tests per feature for all 35 features
│   │   ├── t1_01_tabpfn_core.test.js          (F1–F5: Sidecar, Tri-Mode, 96h Meteo, Quantiles, Anomaly)
│   │   ├── t1_02_ml_eval_provenance.test.js   (F6–F10: Walk-Log, Fallback, Backtest, Provenance, License)
│   │   ├── t1_03_search_adapter.test.js       (F11–F17: Search Adapter, Cache, Heads-Up, Injection, Guardrails)
│   │   ├── t1_04_global_i18n.test.js          (F18–F23: Privacy Geo, 8 Languages, Units, Cold Safety, Overpass, 8 Cities)
│   │   ├── t1_05_frontend_tactile.test.js     (F24–F30: WCAG Tokens, IA Views, Band Chart, Pocket Mode, Map, ScreenMeter)
│   │   └── t1_06_secrets_deployment.test.js   (F31–F35: Micro-Green, CLI Secrets, In-App Secrets, Redaction, Render)
│   ├── tier2-boundaries/            # 175 tests: 5 boundary/corner tests per feature
│   │   ├── t2_01_ml_boundaries.test.js       (F1–F10: empty payloads, inverted quantiles, extreme temps, CSV parsing)
│   │   ├── t2_02_search_boundaries.test.js   (F11–F17: length clamping, recursive HTML strip, null bytes, timeouts)
│   │   ├── t2_03_geo_climate_boundaries.test.js (F18–F23: lat/lon clamping, bidi Arabic, -273°C, Overpass 504)
│   │   ├── t2_04_ui_boundaries.test.js       (F24–F30: 43px vs 44px, 4.49:1 vs 4.5:1, zoom limits, screen ratio)
│   │   └── t2_05_secrets_boundaries.test.js   (F31–F35: 0600 mode, non-ASCII keys, consecutive redactions, /health)
│   ├── tier3-interactions/          # 35 tests: Pairwise cross-feature interactions
│   │   └── t3_cross_feature.test.js           (35 pairwise combination tests across all major feature pairs)
│   └── tier4-scenarios/             # 5 tests: Comprehensive real-world multi-step workflows
│       └── t4_scenarios.test.js               (8-city offline tour, hazard plan B, pocket mode, RTL, live forecast)
└── runner.mjs                       # Unified runner aggregating results across Tiers 1–4
```

---

## 4. Feature Coverage Matrix (35 Features × Tiers 1–4)

| # | Feature | Tier 1 (Feature) | Tier 2 (Boundary) | Tier 3 (Cross-Feature) | Status |
|---|---------|:----------------:|:-----------------:|:----------------------:|:------:|
| 1 | TabPFN Sidecar / Gateway | 5 | 5 | ✓ | PASS |
| 2 | TabPFN Tri-State Mode | 5 | 5 | ✓ | PASS |
| 3 | Continuous 96h Meteo Data | 5 | 5 | ✓ | PASS |
| 4 | Quantile Forecasts (p10/p50/p90) | 5 | 5 | ✓ | PASS |
| 5 | Anomaly Detection | 5 | 5 | ✓ | PASS |
| 6 | Personal Green Hour Walk-Log | 5 | 5 | ✓ | PASS |
| 7 | Fallback Chain Labeling | 5 | 5 | ✓ | PASS |
| 8 | Backtest Evaluation Suite | 5 | 5 | ✓ | PASS |
| 9 | Offline Demo Provenance | 5 | 5 | ✓ | PASS |
| 10 | License Attribution | 5 | 5 | ✓ | PASS |
| 11 | Unified Search Adapter | 5 | 5 | ✓ | PASS |
| 12 | Result Normalization & Cache | 5 | 5 | ✓ | PASS |
| 13 | Screen-Minimizing Search Output | 5 | 5 | ✓ | PASS |
| 14 | Prompt Injection Defenses | 5 | 5 | ✓ | PASS |
| 15 | Authoritative Guardrails over Search | 5 | 5 | ✓ | PASS |
| 16 | Search Contract Tests | 5 | 5 | ✓ | PASS |
| 17 | Dated Search Offline Snapshots | 5 | 5 | ✓ | PASS |
| 18 | Privacy Geolocation (2 Decimals) | 5 | 5 | ✓ | PASS |
| 19 | Multilingual i18n (8 Languages) | 5 | 5 | ✓ | PASS |
| 20 | Units & Standards Conversion | 5 | 5 | ✓ | PASS |
| 21 | Climate & Cold-Side Guardrails | 5 | 5 | ✓ | PASS |
| 22 | Resilient Multi-Mirror Overpass | 5 | 5 | ✓ | PASS |
| 23 | 8 Global City Demo Packs | 5 | 5 | ✓ | PASS |
| 24 | Nature Aesthetic & WCAG 2.2 AA | 5 | 5 | ✓ | PASS |
| 25 | Information Architecture & Views | 5 | 5 | ✓ | PASS |
| 26 | Inline SVG Band Chart | 5 | 5 | ✓ | PASS |
| 27 | OLED Pocket Mode (Pure Black) | 5 | 5 | ✓ | PASS |
| 28 | Places Map Toggle (Code-Split) | 5 | 5 | ✓ | PASS |
| 29 | ScreenMeter & Walk Receipt | 5 | 5 | ✓ | PASS |
| 30 | Full UI States Suite | 5 | 5 | ✓ | PASS |
| 31 | Screen-Minimizing Features | 5 | 5 | ✓ | PASS |
| 32 | Secret Path 1: CLI Setup (0600) | 5 | 5 | ✓ | PASS |
| 33 | Secret Path 2: In-App Settings | 5 | 5 | ✓ | PASS |
| 34 | Secret Path 3: Redact & Scan | 5 | 5 | ✓ | PASS |
| 35 | Render Deployment Readiness | 5 | 5 | ✓ | PASS |
| **Total** | **35 Features** | **175** | **175** | **35** | **100% PASS** |

---

## 5. Tier 4 Real-World Application Scenarios Verified

1. **Scenario 1: Complete Zero-Key Offline Tour across 8 Cities**
   - Verified that all 8 global cities (Dhaka, Delhi, London, Los Angeles, Nairobi, São Paulo, Sydney, Tokyo) operate with zero network calls and zero API keys using bundled historical data with valid provenance JSON and 2-decimal rounded coordinates.
2. **Scenario 2: Hazardous Smoke Emergency & Plan B Fallback**
   - Ingested AQI 265 / PM2.5 185 condition; verified score drops to hazardous (<25), guardrails override effort level to `rest`, N95 mask disclaimers are injected, and Plan B indoor conservatory guide is activated.
3. **Scenario 3: Pocket Mode Walk with ScreenMeter & Receipt Generation**
   - Simulates 30-minute walk with OLED `#000000` background and 140px tactile controls; verifies screen ratio 2.0% (<5%) awards low-screen walk streak, generates Canvas receipt card, and records on-device log.
4. **Scenario 4: Multilingual Global User Experience & Arabic RTL Verification**
   - Verifies seamless switching between English (`en`), Bengali (`bn`), and Arabic (`ar`); verifies `dir="rtl"` layout toggle, unit conversions (°F / miles vs °C / km), and WCAG 44px target preservation.
5. **Scenario 5: Live Weather + Search + TabPFN Uncertainty Forecast Flow**
   - Ingests 96h continuous meteo data; verifies TabPFN uncertainty quantile prediction (p10, p50, p90), 94% agreement badge calculation, search heads-up integration, and authoritative scoring timeline.

---

## 6. Discovered Defect Escalation

During verification of the existing server unit suite (`npm test`), a syntax error was observed in a newly added file by `worker_m1_1`:
- **File:** `server/tests/tabpfn.test.js`
- **Location:** Line 134–135
- **Error:** `SyntaxError: Unexpected reserved word`
- **Cause:** Line 134 declares `await t.test('...', () => {` with a synchronous arrow function, but line 135 calls `await import('../services/guardrails.js')`. The callback must be declared as `async () => {`.
- **Action Required:** `worker_m1_1` or orchestrator must add the `async` keyword to line 134 in `server/tests/tabpfn.test.js`.
