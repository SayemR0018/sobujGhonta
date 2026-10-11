# E2E Test Infra: Sobuj Ghonta (সবুজ ঘণ্টা) — The Green Hour

## Test Philosophy
- Opaque-box, requirement-driven. Derived strictly from `ORIGINAL_REQUEST.md` and user-facing specifications.
- Methodology: Category-Partition + Boundary Value Analysis (BVA) + Pairwise Combinatorial Testing + Real-World Workload Testing.
- Progressive testability: Tier 1 tests verify individual features in isolation using minimal dependencies; higher tiers verify integrated workflows.

## Feature Inventory & Test Target Allocations
| # | Feature | Source (requirement) | Tier 1 (Feature) | Tier 2 (Boundary) | Tier 3 (Cross-Feature) |
|---|---------|---------------------|:----------------:|:-----------------:|:----------------------:|
| 1 | TabPFN Sidecar / Gateway | R1: `ml/` FastAPI sidecar, health, forecast endpoints | 5 | 5 | ✓ |
| 2 | TabPFN Tri-State Mode | R1: `local`, `client`, `off` configuration & fallback | 5 | 5 | ✓ |
| 3 | Continuous 96h Meteo Data | R1: `past_days` + `forecast_days` hourly history | 5 | 5 | ✓ |
| 4 | Quantile Forecasts (p10/p50/p90) | R1: AQI, PM2.5, temp, UV intervals & agreement metric | 5 | 5 | ✓ |
| 5 | Anomaly Detection | R1: Residual/quantile alerts for smoky/hot weather | 5 | 5 | ✓ |
| 6 | Personal Green Hour Walk-Log | R1: On-device regression/classification & CSV I/O | 5 | 5 | ✓ |
| 7 | Fallback Chain Labeling | R1: Labeled "baseline (not TabPFN)" when TabPFN off | 5 | 5 | ✓ |
| 8 | Backtest Evaluation Suite | R1: `scripts/backtest.*` and `docs/TABPFN_EVAL.md` | 5 | 5 | ✓ |
| 9 | Offline Demo Provenance | R1: Provenance JSON with model, version, timestamp | 5 | 5 | ✓ |
| 10 | License Attribution | R1: Notice & attribution in NOTICE / README.md | 5 | 5 | ✓ |
| 11 | Unified Search Adapter | R2: `serpapi`, `serper`, `none` via `SEARCH_PROVIDER` | 5 | 5 | ✓ |
| 12 | Result Normalization & Cache | R2: Standard schema with 30-60 min TTL & quota track | 5 | 5 | ✓ |
| 13 | Screen-Minimizing Search Output | R2: Max ONE concise line in UI/audio | 5 | 5 | ✓ |
| 14 | Prompt Injection Defenses | R2: HTML strip, length cap <=200 chars, domain badge | 5 | 5 | ✓ |
| 15 | Authoritative Guardrails over Search | R2: Search never overrides deterministic safety | 5 | 5 | ✓ |
| 16 | Search Contract Tests | R2: Fixture-based tests with 0 network calls | 5 | 5 | ✓ |
| 17 | Dated Search Offline Snapshots | R2: Bundled search snapshots with verified dates | 5 | 5 | ✓ |
| 18 | Privacy Geolocation | R3: 2-decimal coordinate rounding (~1.1 km) | 5 | 5 | ✓ |
| 19 | Multilingual i18n (8 Languages) | R3: en, bn, hi, es, ar (RTL), fr, pt, id + font loading | 5 | 5 | ✓ |
| 20 | Units & Standards Conversion | R3: °C/°F, km/mi, 12/24h, US vs EU AQI, timezone solar | 5 | 5 | ✓ |
| 21 | Climate & Cold-Side Guardrails | R3: Freezing, wind chill, ice, polar day/night | 5 | 5 | ✓ |
| 22 | Resilient Multi-Mirror Overpass | R3: Fallback mirrors, extended OSM tags, empty states | 5 | 5 | ✓ |
| 23 | 8 Global City Demo Packs | R3: Dhaka, Delhi, London, LA, Nairobi, SP, Sydney, Tokyo | 5 | 5 | ✓ |
| 24 | Nature Aesthetic & WCAG 2.2 AA | R4: Light/Dark/OLED tokens, 44px targets, 0 axe errors | 5 | 5 | ✓ |
| 25 | Information Architecture & Views | R4: Home, Timeline, Places, Walk Mode, Journal, Settings | 5 | 5 | ✓ |
| 26 | Inline SVG Band Chart | R4: Quantile bands (p10, p50, p90) with 0 heavy chart libs | 5 | 5 | ✓ |
| 27 | OLED Pocket Mode | R4: Pure black `#000000`, 140px controls, audio guidance | 5 | 5 | ✓ |
| 28 | Places Map Toggle | R4: Code-split lazy map view | 5 | 5 | ✓ |
| 29 | ScreenMeter & Walk Receipt | R4: Screen-to-walk ratio & Canvas receipt share card | 5 | 5 | ✓ |
| 30 | Full UI States Suite | R4: Skeletons, empty, error boundary, offline, onboarding | 5 | 5 | ✓ |
| 31 | Screen-Minimizing Features | R5: Micro-Green 10m, Plan B hazard guide, low streak | 5 | 5 | ✓ |
| 32 | Secret Path 1: CLI Setup | R5: `scripts/setup-keys.mjs` with 0600 permissions | 5 | 5 | ✓ |
| 33 | Secret Path 2: In-App Settings | R5: Password fields, test button, HTTPS headers only | 5 | 5 | ✓ |
| 34 | Secret Path 3: Redact & Scan | R5: Redacting server logger & `scripts/scan-secrets.mjs` | 5 | 5 | ✓ |
| 35 | Render Deployment Readiness | R5: 512MB RAM ceiling, decoupled /health endpoint | 5 | 5 | ✓ |

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Complete Zero-Key Offline Tour across 8 Cities | F1.9, F2.7, F3.6, F4.1, F4.2 | High |
| 2 | Hazardous Smoke Emergency & Plan B Fallback | F1.5, F2.3, F2.5, F3.4, F5.1 | High |
| 3 | Pocket Mode Walk with ScreenMeter & Receipt Generation | F4.4, F4.6, F1.6, F5.1 | High |
| 4 | Multilingual Global User Experience & Arabic RTL Verification | F3.2, F3.3, F4.1, F4.2 | Medium |
| 5 | Live Weather + Search + TabPFN Uncertainty Forecast Flow | F1.2, F1.4, F2.1, F2.2, F4.3 | High |

## Coverage Thresholds
- Tier 1: >= 5 per feature (~175 test cases)
- Tier 2: >= 5 per feature (~175 test cases)
- Tier 3: Pairwise coverage across major feature pairs (~35 test cases)
- Tier 4: >= 5 realistic application-level scenarios
- Total target: ~390+ test cases
