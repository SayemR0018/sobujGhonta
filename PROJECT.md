# Project: Sobuj Ghonta (সবুজ ঘণ্টা) — The Green Hour

## Architecture
Sobuj Ghonta is an ambient, screen-minimizing outdoor companion and Vite React PWA with an Express backend for safe urban green discovery, enhanced with TabPFN tabular forecasting, unified live search, global multilingual support, tactile accessibility, and a safe zero-leak secret architecture.

```
                      +-----------------------------------+
                      |   Vite React PWA (client/)        |
                      |   - Lightweight View Router       |
                      |   - Light / Dark / OLED Themes    |
                      |   - WCAG 2.2 AA + RTL (Arabic)    |
                      |   - Inline SVG Quantile BandChart |
                      |   - Pocket Mode + ScreenMeter     |
                      |   - On-Device IndexedDB Log       |
                      +-----------------+-----------------+
                                        | (HTTPS / JSON / Headers)
                                        v
                      +-----------------+-----------------+
                      |   Express Server (server/)        |
                      |   - Redacting Logger & Security   |
                      |   - Decoupled /health Endpoint    |
                      |   - Geocoding & Open-Meteo Cache  |
                      |   - Authoritative Guardrails/Score|
                      |   - Multi-Mirror Overpass Client  |
                      |   - Unified Search Adapter        |
                      |   - 8 Global City Demo Packs      |
                      +--------+-----------------+--------+
                               |                 |
            (HTTP / JSON)      |                 | (HTTP / Live Search)
                               v                 v
            +------------------+----+     +------+------------------+
            |  Python ML Sidecar    |     |  Search Engine Adapters |
            |  (ml/ - FastAPI)      |     |  - SerpApi Client       |
            |  - TabPFN Local/Client|     |  - Serper Client        |
            |  - Uncertainty Quant. |     |  - Offline Snapshots    |
            |  - Anomaly Detector   |     |  - Prompt Injection     |
            |  - Tri-State Fallback |     |    Defense Sanitizer    |
            +-----------------------+     +-------------------------+
```

## Feature Inventory
Every feature identified during Survey mapped to its assigned milestone:
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | F1.1 ML Sidecar Setup | Python FastAPI sidecar under `ml/` (app.py, requirements.txt, config.py, tests) | M1 | Survey R1 |
| 2 | F1.2 TabPFN Tri-Mode | Configurable `TABPFN_MODE` (`local`, `client`, `off`) with official Prior Labs integration | M1 | Survey R1 |
| 3 | F1.3 Open-Meteo 96h Data | Continuous 96h hourly history (`past_days=2-7`) and forecast pulling | M1 | Survey R1 |
| 4 | F1.4 Quantile Forecasting | TabPFN local pollution and heat forecasting with uncertainty (p10, p50, p90) & agreement metric | M1 | Survey R1 |
| 5 | F1.5 Anomaly Detection | Flag unusually smoky or hot conditions vs history; short line spoken only when safety-relevant | M1 | Survey R1 |
| 6 | F1.6 Personal Green Hour | On-device walk-log regression/classification (privacy-preserving) with CSV import/export | M1 | Survey R1 |
| 7 | F1.7 Fallback Chain | Cascade: local TabPFN -> client TabPFN -> deterministic baseline labeled "baseline (not TabPFN)" | M1 | Survey R1 |
| 8 | F1.8 Backtest Evaluation | `scripts/backtest.*` evaluating TabPFN against persistence/seasonal-naive on 3 cities in `docs/TABPFN_EVAL.md` | M1 | Survey R1 |
| 9 | F1.9 ML Demo Snapshots | Bundled TabPFN forecast snapshots with complete provenance JSON | M1 | Survey R1 |
| 10 | F1.10 License Attribution | Prior Labs TabPFN attribution in `NOTICE` and `README.md` | M1 | Survey R1 |
| 11 | F2.1 Unified Search Adapter | `server/services/search/` unified interface for `serpapi`, `serper`, `none` via `SEARCH_PROVIDER` | M2 | Survey R2 |
| 12 | F2.2 Search Normalization | Normalized `{ title, snippet, url, source, date }` with 30-60 min cache & quota tracking | M2 | Survey R2 |
| 13 | F2.3 Screen-Minimizing Search | At most ONE concise line in UI/audio (Local Heads-Up, Nearby, Safety alert) | M2 | Survey R2 |
| 14 | F2.4 Injection Defenses | Strip markup, length caps (<=200 chars), ignore snippet instructions, show verified source domain | M2 | Survey R2 |
| 15 | F2.5 Authoritative Guardrails | Deterministic guardrails and scoring remain strictly authoritative over all search/Gemma data | M2 | Survey R2 |
| 16 | F2.6 Search Contract Tests | Contract tests using recorded JSON fixtures without network calls | M2 | Survey R2 |
| 17 | F2.7 Search Demo Snapshots | Dated offline demo search snapshots (`recorded on <date>`) | M2 | Survey R2 |
| 18 | F3.1 Privacy Geolocation | Geolocation with strict 2-decimal coordinate rounding before caching or third-party transmission | M3 | Survey R3 |
| 19 | F3.2 Multilingual i18n | 8 languages (`en`, `bn`, `hi`, `es`, `ar` RTL, `fr`, `pt`, `id`), font loading, machine-translation flags | M3 | Survey R3 |
| 20 | F3.3 Standards & Timezones | Units (°C/°F, km/mi, 12/24h), US AQI vs EU AQI, timezone-aware solar/daylight calculation | M3 | Survey R3 |
| 21 | F3.4 Climate Guardrails | Cold-side guardrails (freezing, wind chill, ice/snow), lightning/wind, polar day/night handling | M3 | Survey R3 |
| 22 | F3.5 Resilient Overpass | Multi-mirror Overpass fallback (`overpass-api.de`, `kumi.systems`, `openstreetmap.fr`), extended OSM tags, empty states | M3 | Survey R3 |
| 23 | F3.6 8 Global City Demo Packs | Bundled offline demo packs for Dhaka, Delhi, London, LA, Nairobi, São Paulo, Sydney, Tokyo with provenance | M3 | Survey R3 |
| 24 | F4.1 Nature Design & WCAG | Light, Dark, and OLED themes meeting WCAG 2.2 AA (44px touch targets, keyboard navigation, aria-live) | M4 | Survey R4 |
| 25 | F4.2 Information Architecture | Lightweight view router & AppContext: Home, Timeline, Places, Walk Mode, Journal, Settings | M4 | Survey R4 |
| 26 | F4.3 Inline SVG Band Chart | 24-72h timeline with TabPFN quantile bands (p10, p50, p90) and agreement badge; 0 chart dependencies | M4 | Survey R4 |
| 27 | F4.4 OLED Pocket Mode | Walk Mode pure black `#000000` with 140px tactile controls and screen-minimizing audio guidance | M4 | Survey R4 |
| 28 | F4.5 Lazy-Loaded Map View | Code-split map toggle for green spaces | M4 | Survey R4 |
| 29 | F4.6 ScreenMeter & Receipt | ScreenMeter hero metric and canvas-rendered "walk receipt" share card | M4 | Survey R4 |
| 30 | F4.7 UI States Suite | Skeletons, contextual empty states, Error Boundaries, offline banner, 3-step onboarding, PWA install | M4 | Survey R4 |
| 31 | F5.1 Screen-Minimizing Extras | Micro-Green 10-min windows, Plan B hazard guide (guardrail-safe), low-screen streak (<5%), "leave phone" chime | M5 | Survey R5 |
| 32 | F5.2 Secret Path 1: CLI | `scripts/setup-keys.mjs` with masked prompts writing `.env` (0600) with `.gitignore` enforcement | M5 | Survey R5 |
| 33 | F5.3 Secret Path 2: In-App | Settings > "Keys and Providers" with password fields, validation button, sessionStorage/IndexedDB, HTTPS headers | M5 | Survey R5 |
| 34 | F5.4 Secret Path 3: Redact & Scan | Redacting server logger and automated pre-commit / CI scanner (`scripts/scan-secrets.mjs`) | M5 | Survey R5 |
| 35 | F5.5 Render Readiness | Updated `render.yaml` and `docs/DEPLOY.md` respecting 512MB RAM cap; decoupled `/health` | M5 | Survey R5 |
| 36 | F6.1 E2E Test Suite (Tiers 1-4) | Requirements-driven test suite with >=11*N test cases across all features | M6 | Survey E2E |
| 37 | F6.2 Adversarial Hardening (Tier 5) | White-box stress tests, edge cases, and adversarial validation | M6 | Survey E2E |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | R1: TabPFN Foundation Integration | F1.1 - F1.10 | none | DONE |
| M2 | R2: Unified Live Web Search Adapter | F2.1 - F2.7 | none | DONE |
| M3 | R3: Global Location, Climate & i18n | F3.1 - F3.6 | M1, M2 | PLANNED |
| M4 | R4: Ambient Tactile Frontend & Pocket Mode | F4.1 - F4.7 | M1, M2, M3 | PLANNED |
| M5 | R5: Screen-Minimizing & Secrets Architecture | F5.1 - F5.5 | M4 | PLANNED |
| M6 | Final Verification & Adversarial Hardening | Phase 1 (Tiers 1-4) & Phase 2 (Tier 5) | M1, M2, M3, M4, M5, E2E Track | PLANNED |

## Interface Contracts
### Express Server ↔ ML Sidecar
- Method: `POST /forecast`
  - Body: `{ lat: number, lon: number, history: { times: string[], pm2_5: number[], us_aqi: number[], temp: number[], apparent_temp: number[], uv: number[] }, horizonHours: number }`
  - Response: `{ ok: boolean, model: string, version: string, quantiles: { p10: number[], p50: number[], p90: number[] }, agreement: number }`
- Method: `POST /anomaly`
  - Body: `{ current: object, history: object }`
  - Response: `{ detected: boolean, severity: string, message: string, safetyRelevant: boolean }`

### Express Server ↔ Search Adapters
- Interface: `searchProvider.search(query: string, options: { lat: number, lon: number, city: string })`
- Returns: `Promise<{ provider: string, items: Array<{ title: string, snippet: string, url: string, source: string, date: string }> }>`
- Normalizer: `normalizeResult(rawItem) -> SearchResultItem` (max 200 chars, stripped HTML/markdown)

### Frontend ↔ Backend Weather & Forecast
- `GET /api/weather?lat=23.74&lon=90.40&standard=us`
- Response contains:
  - `current`: environmental metrics, deterministic green score, category, reasons
  - `timeline`: 24-72h array with deterministic scores and optional `tabpfn: { p10, p50, p90, source, agreementPct }`
  - `anomaly`: `{ detected, severity, message, safetyRelevant }`
  - `searchHeadsUp`: `{ type, text, source, domain, date, url } | null`

## Code Layout
- `ml/` — Python FastAPI sidecar, TabPFN models, forecasting, and anomaly detection
- `server/` — Express backend, API routes, deterministic scoring/guardrails, search adapters, redacting logger
- `client/` — Vite React PWA, design tokens, view router, inline SVG charts, Pocket Mode, i18n
- `scripts/` — Key setup (`setup-keys.mjs`), backtest (`backtest.mjs`), smoke runner (`smoke.mjs`), secret scanner (`scan-secrets.mjs`)
- `docs/` — Integration notes, TabPFN evaluation report (`TABPFN_EVAL.md`), deployment guide (`DEPLOY.md`)
- `tests/` — E2E test suites and fixtures
