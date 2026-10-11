# Sobuj Ghonta (সবুজ ঘণ্টা) — The Green Hour: Engineering Plan V2

**Challenge:** DEV Hacktoberfest Open-Source AI Challenge Week 1 "Touch Grass"  
**Submission Deadline:** October 11, 2026, 11:59 PM PDT  
**Target Tracks:**
- Best Use of TabPFN (Prior Labs)
- Best Use of SerpApi (Unified Search Adapter)
- Primary Week 1 "Touch Grass" Category

---

## 1. Baseline Preflight Findings (Phase 0)

1. **Git & Repository:**
   - Working tree: clean on branch `main`.
   - Upstream remote: `https://github.com/SayemR0018/sobujGhonta.git`.
2. **Test Suites Baseline:**
   - `npm test`: 35/35 passing (5 suites: E2E edge cases, ElevenLabs cascade fallback, Guardrails, Green Window scoring, Free TTS provider chain).
   - `npm run smoke`: 8/8 passing against local production server (health check, security headers, demo payloads, static demo WAVs, PWA manifest, service worker).
   - `scripts/fullQaRunner.mjs`: 14/16 passing (87.5%). Real observed failures:
     * `POST /api/tts` serves disk cached audio failed with "Audio buffer too small: 179348 bytes".
     * Oversized TTS input (>450 chars) returned HTTP 200 instead of HTTP 400 (input validation leak on live ElevenLabs provider call).
3. **Core Architectural Invariants:**
   - Deterministic scoring (`server/services/scoring.js`) and safety guardrails (`server/services/guardrails.js`) remain authoritative. ML and search models may only add caution (lower score, add alert).
   - Zero-key "Demo (Offline)" mode operates with 0 API keys and 0 network calls.
   - Strict privacy: No raw coordinates sent to third parties (rounded to 2 decimal places). Walk logs remain on-device unless explicit opt-in.
   - Strict secret isolation: No keys logged or committed. Three safe input paths (CLI setup script, in-app session/IndexedDB settings, redacting logger + pre-commit scan).

---

## 2. Phase-by-Phase Execution Plan

### Phase 1: TabPFN Integration (Tabular Foundation Model)
- **Official Documentation Review:** Verify current Prior Labs SDK/API specs (`docs.priorlabs.ai`, `tabpfn`, `tabpfn-client`). Record findings in `docs/INTEGRATION_NOTES.md`.
- **Architecture:**
  - Python sidecar under `ml/` (FastAPI) behind Express proxy with `TABPFN_MODE=local|client|off`.
  - Fallback chain: TabPFN local → TabPFN client → deterministic baseline (clearly labeled `baseline (not TabPFN)` in UI).
- **Core ML Use Cases:**
  1. *Pollution & Heat Forecast with Uncertainty:* Pull Open-Meteo hourly history (past 24-92h), forecast next 24–72h of PM2.5, US AQI, apparent temperature, and UV. Return quantile intervals (p10, p50, p90) for UI confidence bands. Compare forecast agreement against Open-Meteo baseline.
  2. *Anomaly Check:* Anomaly residual/quantile flag against local historical distribution ("Unusually smoky/hot for this hour"). Exposed as short line and spoken only if safety-critical.
  3. *Personal Green Hour:* On-device walk log regressor/classifier predicting optimal hour from real user walks (min threshold; no synthetic fake data). CSV import/export.
- **Backtesting & Evaluation:**
  - Implement `scripts/backtest.*` evaluating TabPFN against persistence and seasonal-naive baselines on real held-out hours for Dhaka, Delhi, and London.
  - Report honest MAE and pinball loss in `docs/TABPFN_EVAL.md`.
  - Capture real offline snapshots with full provenance JSON (model, version, date, metrics).
  - Record checkpoint license in `NOTICE` and `README.md`.

### Phase 2: Live Search Adapter (SerpApi & Serper)
- **Official Documentation Review:** Verify current SerpApi (`serpapi.com/search-api`) and Serper.dev endpoints, parameters, and quotas. Document in `docs/INTEGRATION_NOTES.md`.
- **Architecture:**
  - `server/services/search/index.js` with unified adapter contract for `serpapi`, `serper`, and `none`.
  - Result normalization: `{ title, snippet, url, source, date }`.
  - In-memory cache with 30–60 min TTL and quota usage tracking.
- **Features (Strict Screen-Minimizing Constraint: max 1 line in UI/audio):**
  1. *Local Heads-Up:* Park closures, gate locks, maintenance, flooding.
  2. *Nearby this week:* Local nature walks, birding, bloom reports, community gardening.
  3. *Official Alerts:* Heat, AQI, storm, dengue/vector advisories with source domain & date.
- **Safety & Injection Defense:**
  - Strip HTML markup, truncate snippet length, enforce untrusted data boundaries.
  - Never allow search snippet instructions to override deterministic guardrails or prompt templates.
  - Ground Gemma with cited source domains.
  - Provide dated offline demo search snapshots.

### Phase 3: Global Location, Climate & Multilingual Support
- **Global Location Engine:**
  - Browser geolocation, Open-Meteo geocoding search, recent locations, manual lat/lon fallback.
  - Round coordinates to 2 decimal places for third-party requests.
- **Multilingual (i18n):**
  - Auto-detect locale; support English (`en`), Bengali (`bn`), Hindi (`hi`), Spanish (`es`), Arabic (`ar` with RTL layout), French (`fr`), Portuguese (`pt`), Indonesian (`id`).
  - Lazy-load script fonts; label machine-translated strings.
- **Units, Standards & Climate Invariants:**
  - Standard conversions (°C/°F, km/mi, 12/24h, US vs EU AQI).
  - Timezone-accurate calculations using location timezone.
  - Climate logic: Southern hemisphere season inversion, cold-side guardrails (freezing, wind chill, ice), lightning/wind rules, polar day/night solar transitions.
- **Resilient Overpass Discovery:**
  - Multi-mirror fallback with retry/cache.
  - Extended tags: nature reserves, forests, beaches, trails, community gardens, waterfronts.
  - Empty-state graceful fallback for sparse OSM regions.
- **Offline Demo Packs:**
  - Real snapshots with dates for Dhaka, Delhi, London, Los Angeles, Nairobi, São Paulo, Sydney, and Tokyo.

### Phase 4: Ambient Frontend Redesign & Pocket Mode
- **Design System & Aesthetics:**
  - Calm, ambient, tactile nature aesthetic using CSS design tokens.
  - Themes: Light, Dark, and OLED pure black (`#000000`).
  - Accessibility: WCAG 2.2 AA compliant (44px touch targets, full keyboard navigation, `aria-live` plan updates, high-contrast mode, reduced-motion mode, RTL layout).
- **Core Views:**
  - *Home:* Hero "Your Green Hour", score ring, one-line why, Start Walk button.
  - *Timeline:* 24–72h inline SVG band chart showing TabPFN uncertainty quantile intervals and forecast agreement badge.
  - *Places:* List/map toggle, code-split lazy-loaded map.
  - *Walk Mode:* OLED Pocket Mode with oversized controls, audio walk player, and screen-minimizing guidance.
  - *Journal:* Offline IndexedDB nature notes with export.
  - *Settings:* Languages, units, Keys and Providers, privacy controls, offline packs.
- **Hero Metric & Share Card:**
  - `ScreenMeter` hero metric: screen time vs. outdoor time.
  - Canvas-generated "walk receipt" share card (e.g., "Screen 2.5% of 34-min walk").
- **Visual & Performance Verification:**
  - Multi-viewport screenshots (360, 390, 768, 1280 px) across themes and locales in `docs/screens/`.
  - Automated axe-core checks with zero violations.

### Phase 5: Screen-Minimizing Value Additions
- **Selected 4 High-Value Features:**
  1. *Micro-Green 10-Minute Windows:* Fast brief safe outdoor escapes when full 60-min window is poor.
  2. *Plan B Hazard Guide:* Safe alternatives on hazardous air/weather days (indoor botanical spaces, patio fresh air, breathing exercises) without medical claims.
  3. *Low-Screen Streak Tracker:* Rewards walks where screen ratio is below 5%.
  4. *"Leave the Phone" Audio Prompt:* Walk-start chime encouraging user to stash device in pocket.

### Phase 6: Render Deployment & Secret Safety
- **Secret Architecture:**
  1. CLI: `scripts/setup-keys.mjs` with masked prompts writing `.env` (0600 mode) with `.gitignore` enforcement.
  2. In-App: Settings > "Keys and Providers" password inputs, sessionStorage default, opt-in IndexedDB, HTTPS header-only transport, test validation button.
  3. Redacting server logger and automated secret scanner before commits.
- **Render Readiness:**
  - Update `render.yaml` and `docs/DEPLOY.md`.
  - Isolate `/health` from external dependencies.
  - Clean clone build and smoke test.

### Phase 7: Comprehensive QA & Contract Testing
- Unit tests for scoring, guardrails, search adapters, TabPFN integration.
- Contract tests with recorded fixtures for external APIs.
- Playwright E2E covering offline demo, missing keys, search heads-up, RTL switching.
- Rate-limiting and prompt-injection defense verification tests.
- Documentation in `docs/QA_REPORT.md`.

### Phase 8: Documentation & Write-Up
- Update `README.md`, `BUILD_LOG.md`, `ARCHITECTURE.md`, `PRIVACY.md`, `KEYS.md`, `NOTICE`.
- Draft `docs/POST_V2.md` with required DEV submission headings, TabPFN/SerpApi evaluations, Ramna Park field test block preserved verbatim, and outdoor verification checklist.
