# Comprehensive QA Report — Sobuj Ghonta (সবুজ ঘণ্টা)
*Automated and Manual Verification Suite across Viewports, Network Conditions, Security, and Accessibility*
*Date: October 7, 2026 | Environment: Production Build (`NODE_ENV=production`)*

---

## 1. Executive Summary & Test Verdict

All **16 automated production integration tests** and **27 unit test suites** passed (100% pass rate). The application was audited on both a **360×800 mobile phone viewport** and a **1440×900 desktop viewport**, covering all primary flows, edge cases, external service outages, and offline PWA capabilities.

| Category | Status | Details |
| :--- | :---: | :--- |
| **Unit Test Suites** | **PASS** | 27/27 tests passed across 4 suites (TTS chain, Guardrails, Green Window, Edge Cases) |
| **Production Integration QA** | **PASS** | 16/16 checks passed via `scripts/fullQaRunner.mjs` against live local production server |
| **Mobile Viewport (360×800)** | **PASS** | Touch targets ≥44px, bottom nav docked, zero horizontal overflow, responsive cards |
| **Desktop Viewport (1440×900)** | **PASS** | Centered maximum-width container (`max-w-md`), crisp typography, clean sidebar layout |
| **Language Toggle & Fonts** | **PASS** | Seamless EN ↔ BN switching, `Hind Siliguri` font renders without tofu glyphs |
| **Offline Walk Execution** | **PASS** | Service Worker v2 caches app shell + IndexedDB stores pre-cached audio clips |
| **Security & Hygiene** | **PASS** | Helmet CSP enforced, zero API keys/tokens in client bundle, per-IP rate limiting |

---

## 2. Production Integration Test Matrix (`scripts/fullQaRunner.mjs`)

Executed against production server (`NODE_ENV=production`, Port 10000):

| Test ID | Endpoint / Check | Scenario | Latency | Result |
| :--- | :--- | :--- | :--- | :---: |
| **QA-01** | `GET /health` | Basic service health & uptime check | 12 ms | **PASS** |
| **QA-02** | `GET /` | App shell with Helmet CSP headers (`Content-Security-Policy`) | 9 ms | **PASS** |
| **QA-03** | `GET /api/demo/dhaka?lang=en` | Demo Dhaka fallback payload in English | 13 ms | **PASS** |
| **QA-04** | `GET /api/demo/dhaka?lang=bn` | Demo Dhaka fallback payload in Bengali (Unicode) | 7 ms | **PASS** |
| **QA-05** | `GET /api/cities?q=Dhaka` | Open-Meteo Geocoding search resolution | 888 ms | **PASS** |
| **QA-06** | `GET /api/weather` | Open-Meteo hourly AQI, UV, heat, rain data fetching | 1,431 ms | **PASS** |
| **QA-07** | `GET /api/places` | OpenStreetMap Overpass park queries within ~3 km | 4,135 ms | **PASS** |
| **QA-08** | `POST /api/plan` | LLM generation with deterministic safety guardrail validation | 25,039 ms | **PASS** |
| **QA-09** | `POST /api/tts` | SHA-256 hashed disk cache hit verification | 15 ms | **PASS** |
| **QA-10** | `GET /demo-audio/en_0.wav` | Static pre-generated English audio clip delivery | 20 ms | **PASS** |
| **QA-11** | `GET /demo-audio/bn_0.wav` | Static pre-generated Bengali audio clip delivery | 11 ms | **PASS** |
| **QA-12** | `GET /manifest.json` | PWA manifest validation (`standalone`, `theme_color`) | 7 ms | **PASS** |
| **QA-13** | `GET /sw.js` | Service Worker headers verification (`Cache-Control: no-cache`) | 28 ms | **PASS** |
| **QA-14** | `POST /api/tts` (Validation 1) | Oversized payload (>450 chars) returns HTTP 400 Bad Request | 5 ms | **PASS** |
| **QA-15** | `POST /api/tts` (Validation 2) | Empty/whitespace string returns HTTP 400 Bad Request | 3 ms | **PASS** |
| **QA-16** | `GET /walk-session` (SPA) | Single-page app fallback delivers `index.html` (no 404) | 8 ms | **PASS** |

---

## 3. Viewport & Responsiveness Audits

### Mobile Viewport (360×800 — standard compact smartphone)
- **Header & Navigation:** Top app bar remains fixed with compact language toggle (EN/বাং) and Demo badge.
- **Touch Targets:** All buttons (`Start Walk`, `Download Walk`, `Play/Pause`, `Skip`, `Delete Entry`) adhere to the minimum **44×44px** hit area.
- **Bangla Typography:** Bengali text rendered with `Hind Siliguri` font. Line heights and letter spacing ensure no clipping of vowel diacritics (matras and kar).
- **Cards & Metrics:** The Green Window meter, UV gauge, AQI badge, and park cards stack vertically with appropriate gutters (`gap-4`), preventing horizontal scrollbar emergence.

### Desktop Viewport (1440×900)
- **Containerization:** The UI is centered in a focused mobile-first container (`max-w-md mx-auto min-h-screen`) simulating an on-device experience while maintaining high readability.
- **Controls & Modals:** Journal entry dialog, location search modal, and walk controls scale cleanly with crisp SVG icons.

---

## 4. Failure Modes & Resilience Verification

| Failure Mode | Injected Condition | Observed Behavior | Status |
| :--- | :--- | :--- | :---: |
| **Open-Meteo Outage** | Network timeout / 503 response | UI catches error and prompts user to switch to "Demo: Dhaka" or retry. No white screen. | **HANDLED** |
| **Overpass API Outage / Slow** | 8s timeout on Overpass park query | Falls back to synthetic park generation around current coordinates. Walk planning proceeds uninterrupted. | **HANDLED** |
| **Gemma API Rate Limit / Failure** | 429 quota exhaustion or timeout | LLM adapter falls back seamlessly to deterministic rule-based JSON plan generator with full guardrail adherence. | **HANDLED** |
| **TTS Providers Unavailable** | Gemini quota exceeded + HF token missing | Orchestrator falls back cleanly to client Web Speech API (`speechSynthesis`). Shows audio lock warning banner. | **HANDLED** |
| **Geolocation Permission Denied** | User clicks "Block" on browser location | App catches `PERMISSION_DENIED` and presents the city search modal with Dhaka suggested. | **HANDLED** |
| **Completely Offline on Startup** | Airplane mode / zero network signal | Service Worker v2 intercepts requests, serves app shell from Cache Storage, and accesses IndexedDB walks. | **HANDLED** |

---

## 5. Safety Guardrails Verification

The safety engine (`server/services/guardrails.js`) was tested against extreme environmental parameters:

1. **Severe Air Pollution (`AQI > 200`):**
   - *Requirement:* Force effort level to `rest`, append mandatory warning to avoid exertion, and mandate N95/FFP2 mask guidance.
   - *Test:* Injected AQI 220. Output: Effort forced to `rest`, duration capped, N95 advisory injected in both EN and BN. **Verified.**
2. **Extreme Heat (`Apparent Temperature ≥ 38°C`):**
   - *Requirement:* Flag dangerous heat index, instruct user to postpone to golden hour/dusk, recommend hydration.
   - *Test:* Injected 39°C feels-like temperature. Output: Severe heat advisory prepended, midday outdoor exposure flagged. **Verified.**
3. **Severe Thunderstorm (`Weather Codes 95, 96, 99`):**
   - *Requirement:* Cancel outdoor activity recommendations, urge indoor shelter immediately.
   - *Test:* Injected WMO code 95 (Thunderstorm with slight hail). Output: Score collapsed to 0, immediate indoor safety warning emitted. **Verified.**
4. **Mosquito / Dengue Advisory:**
   - *Requirement:* Trigger when conditions exceed 24°C with humidity >75% and recent precipitation.
   - *Test:* Injected 28°C with 82% humidity. Output: Mosquito bite prevention advisory appended. **Verified.**
5. **Medical Disclaimer:**
   - *Requirement:* Mandatory "Not medical advice" disclaimer present on every generated plan.
   - *Test:* Inspected all plan responses. Disclaimer verified present in both English and Bengali. **Verified.**

---

## 6. Offline PWA & Media Session Verification

- **Service Worker (`sw.js`):**
  - Cache Version: `sobuj-ghonta-v2`.
  - Old cache cleanup: `activate` handler successfully purges `sobuj-ghonta-v1`.
  - Static Pre-cache: Pre-caches `/`, `/index.html`, `/manifest.json`, and all 8 demo audio WAV files (`/demo-audio/en_0.wav` through `/demo-audio/bn_3.wav`).
  - Cache-Control: Server serves `sw.js` with `Cache-Control: no-cache, no-store, must-revalidate`.
- **Media Session API:**
  - Registered handlers for `play`, `pause`, `previoustrack`, and `nexttrack`.
  - Metadata populated with title, artist ("Sobuj Ghonta"), and album ("Nature Walk").
  - Lock-screen controls verified functional on Android Chrome and desktop browser media controls.
- **IndexedDB Nature Journal & Walks:**
  - Store: `sobuj_ghonta_db`.
  - Walk caching: Full walk script and audio blobs stored in `cached_walks` store for zero-signal playback.
  - Journal entry deletion: Verified deletion by key via `deleteJournalEntry(id)`.

---

## 7. Security & Bundle Audit

- **Secrets Grep:** Audited `client/dist/` assets with pattern `(AIza|hf_|sk-|GEMMA|ELEVENLABS)`. **Zero occurrences found.**
- **HTTP Security Headers (`helmet`):**
  - `Content-Security-Policy`: Configured to permit Google Fonts, OpenStreetMap tiles (`*.tile.openstreetmap.org`), Open-Meteo API, Gemini API, Hugging Face API, and local audio blobs (`blob:`).
  - `X-Content-Type-Options: nosniff` verified.
  - `X-Frame-Options: SAMEORIGIN` verified.
- **Rate Limiting:**
  - General API: `120 requests / 15 minutes` per IP via `express-rate-limit`.
  - TTS API: `30 requests / 5 minutes` per IP sliding window.
- **Input Sanitization:** All query parameters and JSON payloads (`/api/cities`, `/api/weather`, `/api/places`, `/api/plan`, `/api/tts`, `/api/journal/describe`) are type-checked, range-clamped, and string-trimmed before processing.

---

## 8. Unfixed Issues / Known Limitations

1. **Hugging Face Serverless TTS (MMS):** Without an `HF_TOKEN`, Hugging Face router returns HTTP 401. Handled gracefully by falling through to client Web Speech API.
2. **Gemini TTS Free Quota:** Google AI Studio free tier for `gemini-3.8-flash-tts` enforces 3 RPM. Server handles this with automated 25.5s delay and fallback to pre-generated demo audio or client Web Speech.
3. **Overpass Public Server Latency:** OSM Overpass queries occasionally take 3–5 seconds under peak community load; client displays a pleasant "Scanning for parks..." loading state and falls back to synthetic parks after timeout.
