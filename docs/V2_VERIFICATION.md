# V2 Verification & Audit Report — Sobuj Ghonta (সবুজ ঘণ্টা)

**Date of Audit:** October 11, 2026  
**Auditor:** Antigravity AI Engineering Worker  
**Target Window:** DEV Hacktoberfest Open-Source AI Challenge Week 1 "Touch Grass" (Deadline: Oct 11, 2026, 11:59 PM PDT)  
**Repository:** SayemR0018/sobujGhonta  
**Environment:** Node.js 20.18.0, Windows, Production/Test Runtimes  

---

## 1. Executive Summary & Verification Matrix

All 35 core feature capabilities specified across R1–R5 were audited systematically. Real automated verification was executed across the full test matrix:
- **`npm test`**: **79 / 79 unit & contract tests passing** (12 suites).
- **`npm run test:e2e`**: **390 / 390 end-to-end integration tests passing** (78 suites across 13 files).
- **`scripts/fullQaRunner.mjs`**: **16 / 16 production integration checks passing** (100%).
- **`scripts/smoke.mjs`**: **9 / 9 production deployment smoke checks passing** (100%).
- **`scripts/backtest.mjs`**: **Successfully backtested on 48 held-out hours** for Dhaka, Delhi, and London.
- **`scripts/scan-secrets.mjs`**: **0 secrets detected** across repository, code, and docs.
- **`npm run build`**: Production Vite build succeeded (298 kB uncompressed JS / 88.7 kB gzip).

### Summary Audit Counts
| Status | Count | Category Highlights |
| :--- | :---: | :--- |
| **DONE** | **31** | Keys, TabPFN engine & fallback, Search adapters & injection defenses, Global i18n & RTL, Guardrails, Render Blueprint |
| **PARTIAL** | **3** | Browser-rendered axe-core & Lighthouse (tested via DOM contracts, not headless CLI), Multi-viewport PNG dump in `docs/screens/` |
| **MISSING** | **0** | No critical functional features missing |
| **REMOVED** | **1** | ElevenLabs removed from featured prize category claims (retained as optional server-side tier; free TTS prioritized) |

---

## 2. Detailed Verification Checklist

### Category 1: Safe Secrets & Keys Architecture
| Item | Status | Evidence & File Path | Notes |
| :--- | :---: | :--- | :--- |
| `scripts/setup-keys.mjs` with masked input | **DONE** | [`scripts/setup-keys.mjs`](file:///d:/Projects/MLH-week1/scripts/setup-keys.mjs) | Readline with `*` masking; trims whitespace; validates >=10 char length & provider prefixes. |
| Restrictive file mode 0600 on `.env` | **DONE** | [`scripts/setup-keys.mjs:220`](file:///d:/Projects/MLH-week1/scripts/setup-keys.mjs#L220) | Tested in `tests/e2e/tier2-boundaries/t2_05_secrets_boundaries.test.js` (T2-F32.5). |
| `.env` ignored in `.gitignore` | **DONE** | [`.gitignore:2`](file:///d:/Projects/MLH-week1/.gitignore#L2) | `.env` and `.env.*` ignored; `!.env.example` preserved. |
| Comprehensive `.env.example` | **DONE** | [`.env.example`](file:///d:/Projects/MLH-week1/.env.example) | 88 lines covering LLM, TTS, TabPFN, and Search variables with documentation links. |
| In-app "Keys and Providers" panel | **DONE** | [`client/src/components/SettingsView.jsx:280-365`](file:///d:/Projects/MLH-week1/client/src/components/SettingsView.jsx#L280-L365) | Password fields with Eye/EyeOff toggle; "Test" format button; "Forget" trash icon. |
| Masked last-4 display only | **DONE** | [`client/src/components/SettingsView.jsx:300`](file:///d:/Projects/MLH-week1/client/src/components/SettingsView.jsx#L300) | Displays `••••••••{last4}` when key is configured. |
| Ephemeral `sessionStorage` default | **DONE** | [`client/src/components/SettingsView.jsx:39-71`](file:///d:/Projects/MLH-week1/client/src/components/SettingsView.jsx#L39-L71) | Keys default to session storage; optional opt-in toggle to browser IndexedDB. |
| HTTPS header-only key transmission | **DONE** | [`client/src/App.jsx:120-125`](file:///d:/Projects/MLH-week1/client/src/App.jsx#L120-L125) | Sent via `x-gemma-key`, `x-tabpfn-key`, `x-serpapi-key`, `x-serper-key`. Never query params. |
| Automated Redacting Server Logger | **DONE** | [`server/services/logger.js`](file:///d:/Projects/MLH-week1/server/services/logger.js) | Strips Google, ElevenLabs, HuggingFace, SerpApi, TabPFN keys and query param tokens. |
| Automated Secret Scanner | **DONE** | [`scripts/scan-secrets.mjs`](file:///d:/Projects/MLH-week1/scripts/scan-secrets.mjs) | Ran `node scripts/scan-secrets.mjs`: 0 secrets detected across workspace. |

### Category 2: TabPFN Tabular Foundation Model Integration
| Item | Status | Evidence & File Path | Notes |
| :--- | :---: | :--- | :--- |
| Python sidecar under `ml/` (FastAPI) | **DONE** | [`ml/app.py`](file:///d:/Projects/MLH-week1/ml/app.py), [`ml/services/tabpfn_engine.py`](file:///d:/Projects/MLH-week1/ml/services/tabpfn_engine.py) | FastAPI application with `/forecast`, `/anomaly`, `/personal-walk-log` endpoints. |
| TabPFN Quantile regression [p10, p50, p90] | **DONE** | [`ml/services/tabpfn_engine.py:93-100`](file:///d:/Projects/MLH-week1/ml/services/tabpfn_engine.py#L93-L100) | Prior Labs syntax: `output_type='quantiles'`, `quantiles=[0.1, 0.5, 0.9]`. |
| Forecast agreement metric vs Open-Meteo | **DONE** | [`server/services/mlClient.js:16-30`](file:///d:/Projects/MLH-week1/server/services/mlClient.js#L16-L30) | Relative difference metric: `max(0, 1 - \|p50 - y_om\| / max(y_om, 1.0)) * 100`. |
| Anomaly residual/quantile detector | **DONE** | [`ml/services/anomaly_detector.py`](file:///d:/Projects/MLH-week1/ml/services/anomaly_detector.py), [`server/services/mlClient.js:290-340`](file:///d:/Projects/MLH-week1/server/services/mlClient.js#L290-L340) | Statistical residual thresholding against local distribution; flags smoky/hot spikes. |
| Personal Green Hour on-device log | **DONE** | [`ml/services/personal_log.py`](file:///d:/Projects/MLH-week1/ml/services/personal_log.py), [`client/src/utils/db.js`](file:///d:/Projects/MLH-week1/client/src/utils/db.js) | Stores hour, weekday, AQI, temp, UV, duration, screen ratio, rating in IndexedDB. |
| RFC 4180 CSV Import & Export | **DONE** | [`client/src/components/SettingsView.jsx:183-260`](file:///d:/Projects/MLH-week1/client/src/components/SettingsView.jsx#L183-L260) | Full CSV export and file-upload import with header validation. |
| Tri-state fallback chain (`local` → `client` → `off`) | **DONE** | [`server/services/mlClient.js`](file:///d:/Projects/MLH-week1/server/services/mlClient.js), [`ml/services/tabpfn_engine.py`](file:///d:/Projects/MLH-week1/ml/services/tabpfn_engine.py) | Automatically degrades to deterministic baseline if sidecar uninstalled or memory constrained. |
| Explicit non-TabPFN baseline label | **DONE** | [`server/services/mlClient.js:10`](file:///d:/Projects/MLH-week1/server/services/mlClient.js#L10) | Strictly labeled `"baseline (not TabPFN)"` in API and UI badges. |
| Empirical backtest script & report | **DONE** | [`scripts/backtest.mjs`](file:///d:/Projects/MLH-week1/scripts/backtest.mjs), [`docs/TABPFN_EVAL.md`](file:///d:/Projects/MLH-week1/docs/TABPFN_EVAL.md) | Evaluated 48 held-out hours for Dhaka, Delhi, London. Reports MAE, Pinball L10/L50/L90, and coverage. |
| Offline demo snapshots with provenance | **DONE** | [`server/demoData/dhaka.snapshot.json`](file:///d:/Projects/MLH-week1/server/demoData/dhaka.snapshot.json) | Bundled with model, version, evaluation timestamp, metrics. |
| License attribution notice | **DONE** | [`NOTICE`](file:///d:/Projects/MLH-week1/NOTICE), [`README.md`](file:///d:/Projects/MLH-week1/README.md) | Prior Labs TabPFN research/evaluation attribution recorded. |

### Category 3: Unified Live Web Search Adapter
| Item | Status | Evidence & File Path | Notes |
| :--- | :---: | :--- | :--- |
| Unified adapter contract (`serpapi`, `serper`, `none`) | **DONE** | [`server/services/search/index.js`](file:///d:/Projects/MLH-week1/server/services/search/index.js) | Dynamic provider resolution via `SEARCH_PROVIDER` with auto-detection fallback. |
| Schema normalization `{ title, snippet, url, source, date }` | **DONE** | [`server/services/search/normalizer.js`](file:///d:/Projects/MLH-week1/server/services/search/normalizer.js) | Standard normalized schema with domain badging. |
| In-memory LRU cache with quota tracking | **DONE** | [`server/services/search/cache.js`](file:///d:/Projects/MLH-week1/server/services/search/cache.js) | 45-min default TTL; tracks requests and cache hits. |
| Max 1-line screen-minimizing delivery | **DONE** | [`server/services/search/normalizer.js:150-185`](file:///d:/Projects/MLH-week1/server/services/search/normalizer.js#L150-L185) | Strips newlines, clamps length, extracts single actionable advisory sentence. |
| Three search categories: Heads-Up, Nearby, Alerts | **DONE** | [`server/services/search/index.js:120-170`](file:///d:/Projects/MLH-week1/server/services/search/index.js#L120-L170) | Prioritizes official health/weather alerts > park closures > community events. |
| Prompt injection defense & HTML sanitization | **DONE** | [`server/services/search/normalizer.js:60-120`](file:///d:/Projects/MLH-week1/server/services/search/normalizer.js#L60-L120) | Strips `<script>`, `<img>`, pseudo-URLs (`javascript:`, `data:`), null bytes; isolates snippet context. |
| Contract tests with recorded fixtures | **DONE** | [`server/tests/search.test.js`](file:///d:/Projects/MLH-week1/server/tests/search.test.js) | Tests SerpApi and Serper fixtures with 0 external network calls. |
| Coordinate privacy (2 decimals) | **DONE** | [`server/services/search/cache.js:77-85`](file:///d:/Projects/MLH-week1/server/services/search/cache.js#L77-L85) | Latitude and longitude rounded to 2 decimal places before generating cache keys or queries. |
| Dated offline demo search snapshots | **DONE** | [`server/demoData/search-snapshots.json`](file:///d:/Projects/MLH-week1/server/demoData/search-snapshots.json) | Bundled dated snapshots for all 8 global cities (`none.js` adapter). |

### Category 4: Global Location, Climate & Multilingual Support
| Item | Status | Evidence & File Path | Notes |
| :--- | :---: | :--- | :--- |
| Global city search & geolocation | **DONE** | [`server/services/weather.js:150-190`](file:///d:/Projects/MLH-week1/server/services/weather.js#L150-L190), [`client/src/components/LocationSearch.jsx`](file:///d:/Projects/MLH-week1/client/src/components/LocationSearch.jsx) | Open-Meteo Geocoding API with 2-decimal rounding. |
| 8 Languages with RTL Arabic | **DONE** | [`client/src/i18n/translations.js`](file:///d:/Projects/MLH-week1/client/src/i18n/translations.js), [`client/src/App.jsx:65-70`](file:///d:/Projects/MLH-week1/client/src/App.jsx#L65-L70) | English, Bengali, Hindi, Spanish, Arabic (`dir="rtl"`), French, Portuguese, Indonesian. |
| Unit conversions (°C/°F, km/mi, 12/24h) | **DONE** | [`client/src/components/SettingsView.jsx:450-520`](file:///d:/Projects/MLH-week1/client/src/components/SettingsView.jsx#L450-L520) | Full conversions across temperature, distance, and clock formats. |
| Air quality standard awareness (US vs EU AQI) | **DONE** | [`client/src/components/SettingsView.jsx:515`](file:///d:/Projects/MLH-week1/client/src/components/SettingsView.jsx#L515) | Configurable standard setting. |
| Hemisphere-aware & cold-side guardrails | **DONE** | [`server/services/guardrails.js:200-240`](file:///d:/Projects/MLH-week1/server/services/guardrails.js#L200-L240) | Freezing weather (<0°C), wind chill, and ice hazard guardrails enforce gentle effort. |
| Resilient Overpass green-space discovery | **DONE** | [`server/services/places.js`](file:///d:/Projects/MLH-week1/server/services/places.js) | Multi-mirror fallback with synthetic local fallback if Overpass times out. |
| 8 Bundled Offline City Packs | **DONE** | [`server/routes/api.js:384-506`](file:///d:/Projects/MLH-week1/server/routes/api.js#L384-L506) | Dhaka, Delhi, London, Los Angeles, Nairobi, São Paulo, Sydney, Tokyo. |

### Category 5: Ambient Tactile Frontend Redesign
| Item | Status | Evidence & File Path | Notes |
| :--- | :---: | :--- | :--- |
| Redesigned IA (Home, Timeline, Places, Walk, Journal, Settings) | **DONE** | [`client/src/App.jsx:26-38`](file:///d:/Projects/MLH-week1/client/src/App.jsx#L26-L38) | 6 dedicated views accessible via docked bottom navigation bar. |
| Three tactile themes (Light, Dark, OLED #000000) | **DONE** | [`client/src/index.css:1-48`](file:///d:/Projects/MLH-week1/client/src/index.css#L1-L48) | Pure black OLED theme for battery conservation during outdoor pocket mode. |
| Inline SVG charts (zero heavy charting dependencies) | **DONE** | [`client/src/components/TimelineChart.jsx`](file:///d:/Projects/MLH-week1/client/src/components/TimelineChart.jsx), [`client/src/components/PlacesView.jsx:163-240`](file:///d:/Projects/MLH-week1/client/src/components/PlacesView.jsx#L163-L240) | Lightweight responsive SVG band chart and SVG radar proximity map. |
| ScreenMeter hero metric & Canvas Walk Receipt card | **DONE** | [`client/src/components/ScreenMeter.jsx`](file:///d:/Projects/MLH-week1/client/src/components/ScreenMeter.jsx), [`client/src/components/WalkReceiptModal.jsx`](file:///d:/Projects/MLH-week1/client/src/components/WalkReceiptModal.jsx) | Page Visibility API tracks foreground screen seconds; Canvas exports share receipt. |
| Pocket Mode for screen-minimizing walks | **DONE** | [`client/src/components/AudioWalkPlayer.jsx`](file:///d:/Projects/MLH-week1/client/src/components/AudioWalkPlayer.jsx) | OLED black screen with oversized tactile buttons (>=140px) and Media Session lock screen. |
| Accessibility (WCAG 2.2 AA) | **PARTIAL** | [`tests/e2e/tier1-features/t1_05_frontend_tactile.test.js`](file:///d:/Projects/MLH-week1/tests/e2e/tier1-features/t1_05_frontend_tactile.test.js) | Verified 44px min hit targets, contrast tokens, `aria-live` via unit tests; headless axe CLI not in dependencies. |
| Lighthouse performance audit | **PARTIAL** | [`docs/QA_REPORT.md`](file:///d:/Projects/MLH-week1/docs/QA_REPORT.md) | Verified manual audit numbers; automated headless CI audit not configured. |
| Bundle size budget | **DONE** | `npm run build` output | 298.16 kB JS (88.73 kB gzip), 5.56 kB CSS (1.87 kB gzip). Well under 400 kB target. |
| Viewport screenshots in `docs/screens/` | **PARTIAL** | [`docs/screenshot.png`](file:///d:/Projects/MLH-week1/docs/screenshot.png), [`docs/cover.png`](file:///d:/Projects/MLH-week1/docs/cover.png) | Hero screenshots exist; separate multi-viewport 16-PNG matrix is omitted from repo. |

### Category 6: Screen-Minimizing Features & Render Deployment
| Item | Status | Evidence & File Path | Notes |
| :--- | :---: | :--- | :--- |
| Micro-Green 10-minute safe windows | **DONE** | [`tests/e2e/tier1-features/t1_06_secrets_deployment.test.js:41-50`](file:///d:/Projects/MLH-week1/tests/e2e/tier1-features/t1_06_secrets_deployment.test.js#L41-L50) | Identifies narrow safe intervals when full hours are poor. |
| Plan B hazard guide (indoor alternative) | **DONE** | [`client/src/components/HomeView.jsx`](file:///d:/Projects/MLH-week1/client/src/components/HomeView.jsx) | Triggered during hazardous AQI (>200) or thunderstorms. |
| Low-screen walk streak tracking | **DONE** | [`client/src/utils/db.js`](file:///d:/Projects/MLH-week1/client/src/utils/db.js) | Increments streak when walk screen ratio is < 5%. |
| Render Blueprint validation (`render.yaml`) | **DONE** | [`render.yaml`](file:///d:/Projects/MLH-week1/render.yaml) | Node 20.18.0 pinned; `/health` decoupled; secrets marked `sync: false`; memory safe. |
| Zero-key boot & Demo (Offline) mode | **DONE** | [`scripts/smoke.mjs`](file:///d:/Projects/MLH-week1/scripts/smoke.mjs) | 100% operational with 0 API keys and 0 network requests. |

---

## 3. Real Test Execution Evidence

### 1. Unit & Contract Test Suite (`npm test`)
```text
Command: npm test
Duration: 3,162 ms
Suites: 12 passed, 12 total
Tests: 79 passed, 79 total (100% pass)
Failures: 0
```

### 2. Unified E2E Test Suite (`npm run test:e2e`)
```text
Command: npm run test:e2e
Duration: 684 ms
Suites: 78 passed, 78 total
Tests: 390 passed, 390 total (100% pass)
- Tier 1 (Feature Coverage): 175 / 175 pass
- Tier 2 (Boundary & Corner Cases): 175 / 175 pass
- Tier 3 (Cross-Feature Pairwise Interactions): 35 / 35 pass
- Tier 4 (Real-World Scenarios): 5 / 5 pass
```

### 3. Production Deployment Smoke Test (`scripts/smoke.mjs`)
```text
Command: node scripts/smoke.mjs
Target: http://localhost:10000
Checks:
  ✔ [PASS] GET /health (HTTP 200 JSON) (9ms)
  ✔ [PASS] GET / (App Shell HTML & Security Headers) (23ms)
  ✔ [PASS] GET /api/demo/dhaka?lang=en (Full Demo Payload) (19ms)
  ✔ [PASS] GET /api/demo/dhaka?lang=bn (Bengali Unicode Payload) (9ms)
  ✔ [PASS] GET /demo-audio/en_0.wav (Static Pre-generated WAV) (12ms)
  ✔ [PASS] GET /demo-audio/bn_0.wav (Static Pre-generated WAV) (10ms)
  ✔ [PASS] GET /manifest.json (PWA Web App Manifest) (6ms)
  ✔ [PASS] GET /sw.js (Service Worker with no-cache header) (35ms)
  ✔ [PASS] GET /api/search/heads-up (Search Heads-Up Endpoint) (467ms)
Passed: 9 / 9 (100%)
```

### 4. Full Production Integration QA Runner (`scripts/fullQaRunner.mjs`)
```text
Command: node scripts/fullQaRunner.mjs
Passed: 16 / 16 (100%)
Key verifications:
- Uptime & health check: ok
- Security Headers: Helmet CSP & nosniff verified
- Geocoding & Open-Meteo & Overpass resolution verified
- Plan generation & guardrails verified
- TTS disk caching & input validation verified
```

### 5. Empirical Backtest Runner (`scripts/backtest.mjs`)
```text
Command: node scripts/backtest.mjs
Dataset: 7-day hourly telemetry (168 hours) for Dhaka, Delhi, London
Train: 120 hours | Held-out Test: 48 hours
Result: Real Pinball losses and MAE evaluated and documented in docs/TABPFN_EVAL.md
```

### 6. Automated Secret Scanner (`scripts/scan-secrets.mjs`)
```text
Command: node scripts/scan-secrets.mjs
Result: 0 leaked secrets found. Repository is safe for commit & deploy.
```

---

## 4. Known Discrepancies in Existing DEV Post to Fix

1. **Test Counts:**
   - *Existing DEV Post:* Claims "27 unit tests across 4 test suites (`npm test`), 16 production integration checks, and 8 deployment smoke tests".
   - *Current Reality:* **79 unit tests across 12 suites (`npm test`)**, **390 E2E tests across 78 suites (`npm run test:e2e`)**, **16 production integration checks (`scripts/fullQaRunner.mjs`)**, and **9 deployment smoke checks (`scripts/smoke.mjs`)**.
2. **Framework Tags:**
   - *Existing DEV Post:* Includes `nextjs` in `tag_list`.
   - *Current Reality:* The project is an **Express + Vite React PWA**, not Next.js. Must replace `nextjs` with `react` or `pwa` (tags: `devchallenge`, `hf26challenge`, `gemma`, `pwa`).
3. **TabPFN and Live Search:**
   - *Existing DEV Post:* Does not yet document the TabPFN tabular forecasting engine or SerpApi/Serper unified live search adapter implemented in V2.
4. **Prize Categories:**
   - *Existing DEV Post:* Claims Gemma ($200) and Render ($200).
   - *Current Reality:* TabPFN ($200) and SerpApi ($200) are fully verified and must be added to the post.
