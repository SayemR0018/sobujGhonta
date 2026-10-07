# Audit of Existing Application — Sobuj Ghonta (সবুজ ঘণ্টা)

**Date:** 2026-10-07  
**Challenge:** DEV Hacktoberfest Open-Source AI Challenge, Week 1: "Touch Grass"  
**Auditor:** Antigravity AI Coding Assistant  

---

## 1. Executive Summary

Sobuj Ghonta ("The Green Hour") was audited in place against the Week 1 Touch Grass specification, covering server logic, deterministic algorithms, client PWA UI, data providers, and production deployment readiness.

The application has a strong architectural foundation:
- Deterministic Green Window scoring and safety guardrails are unit-tested and pass all 16 tests.
- Offline and low-connectivity fallbacks for Open-Meteo and OpenStreetMap Overpass exist with bundled Dhaka datasets.
- Client React PWA builds cleanly with Vite into a 210 kB bundle.

However, critical gaps exist:
1. **TTS Provider Block:** The system is hardcoded to ElevenLabs, but no API key is available. It must be replaced by a free chain: `auto` -> `gemini` -> `mms` -> `browser` -> `none`.
2. **Missing Bundled Audio:** No pre-generated audio clips exist in `server/cache/audio` or `client/dist`, meaning the zero-key Dhaka demo currently relies on browser speech synthesis.
3. **LLM Model ID Mismatch:** The configured `gemma-3-27b-it` model returned 404 on Google AI Studio API; testing confirmed `gemma-4-26b-a4b-it` works with HTTP 200.
4. **Production Server Hardening:** Missing `trust proxy` configuration, response compression (gzip/brotli), helmet security headers with strict CSP, and automated smoke verification script.

---

## 2. What Works (Verified)

| Component | Status | Verification Detail |
|---|---|---|
| **Deterministic Green Window Scoring** | **Working** | `calculateHourlyGreenWindowScore()` and `scoreForecastTimeline()` accurately penalize AQI, heat, UV, rain/thunder, and darkness, granting golden hour bonus. 16 unit tests pass. |
| **Code-Level Safety Guardrails** | **Working** | `evaluateSafetyGuardrails()` strictly overrides user/LLM effort levels (AQI>150 gentle, AQI>200 rest + N95 mask guidance, heat >= 38°C avoidance, Dengue mosquito alert, mandatory medical disclaimer in EN & BN). |
| **Open-Meteo Weather & AQI Client** | **Working** | Fetches forecast and AQI; gracefully falls back to `DHAKA_SAMPLE_WEATHER` on network timeout. Open-Meteo geocoding search works. |
| **OpenStreetMap Overpass Parks Discovery** | **Working** | Queries parks, gardens, lakes within 3 km using Overpass QL; calculates Haversine distances; falls back to bundled `DHAKA_PARKS`. |
| **Client PWA & Vite Build** | **Working** | Vite 6 builds cleanly (1920 modules transformed, 210 kB JS, 3 kB CSS). PWA manifest and service worker shell caching configured. |
| **Screen-vs-Outside Meter** | **Working** | Tracks active foreground viewport time via Page Visibility API (`visibilitychange`), calculating real screen vs walk ratio. |
| **OLED Pocket Mode** | **Working** | Full-screen pure black `#000000` mode with high-contrast oversized controls, enabling phones to stay in pocket with minimal battery draw. |
| **On-Device Nature Journal** | **Working** | IndexedDB stores client observations and photos without remote upload; multimodal description fallback functions. |
| **Bilingual Support (বাংলা + English)** | **Working** | Noto Sans Bengali font loaded; UI translations complete in `translations.js`. |
| **DevRelay MCP Connection** | **Working** | DevRelay gateway connected via stdio; `get_challenges` successfully queried challenge #79 rules and dates. |

---

## 3. What is Broken / Outdated

1. **ElevenLabs Hardcoding & Missing Key:**
   - Files referencing ElevenLabs: `server/config.js`, `server/services/tts/elevenlabs.js`, `server/routes/api.js`, `client/src/components/AudioWalkPlayer.jsx`, `.env`, `.env.example`, `package.json`, `README.md`, `render.yaml`.
   - The user has no ElevenLabs key. Real requests fail or fall through without clean fallback chaining.
2. **Gemma Model ID 404 on Google AI Studio:**
   - `server/config.js` defaults to `gemma-3-27b-it`. Calling `https://generativelanguage.googleapis.com/v1beta/models/gemma-3-27b-it:generateContent` returned HTTP 404 NOT FOUND.
   - Tested live on Google AI Studio: `gemma-4-26b-a4b-it` is active and returned HTTP 200 OK.
3. **Empty Audio Cache:**
   - `server/cache/audio/` contains only `.gitkeep`.
   - The Dhaka offline demo has no pre-generated audio files, violating the "0-key instant Dhaka offline audio walk" promise.
4. **Hugging Face MMS-TTS Router Authentication:**
   - `https://router.huggingface.co/hf-inference/models/facebook/mms-tts-ben` returns HTTP 401 without an `HF_TOKEN`. Must handle missing `HF_TOKEN` gracefully.
5. **Journal Entry Delete Missing:**
   - `client/src/components/NatureJournal.jsx` imports `Trash2` icon but has no delete action handler or button.
6. **Geolocation Error Handling:**
   - `LocationSearch.jsx` uses browser `alert()` on location error rather than an inline, friendly notification.

---

## 4. What is Missing versus Touch Grass Spec

1. **Free TTS Provider Chain (`auto` -> `gemini` -> `mms` -> `browser` -> `none`):**
   - Clean provider architecture in `server/services/tts/index.js`.
   - **Gemini TTS:** Verified using `gemini-3.8-flash-tts` on the Google AI Studio Interactions API with user's `GEMMA_API_KEY`. Successfully produced valid WAV audio for English and Bengali (`bn-BD`).
   - **MMS-TTS:** Meta MMS open-weight via Hugging Face Inference API (`facebook/mms-tts-ben` and `facebook/mms-tts-eng`) behind optional `HF_TOKEN`.
   - **Browser Web Speech:** Client fallback with language voice detection and screen-lock warning.
2. **Bundled Dhaka Demo Audio Generation:**
   - Generate static pre-rendered WAV/MP3 clips for the 4 English and 4 Bengali walk segments of Ramna Park, committed into `client/dist/demo-audio` or `server/cache/audio` so the demo works completely with zero keys and zero network.
3. **Production Server & Render Hardening:**
   - `app.set('trust proxy', 1)` in Express.
   - Gzip/brotli `compression` middleware.
   - Security headers with `helmet` and custom CSP permitting Google Fonts, OSM tiles, and audio data blobs.
   - Rate limiting on `/api` routes via `express-rate-limit`.
   - Cache control headers: `public, max-age=31536000, immutable` for hashed assets; `no-cache` for `index.html` and `sw.js`.
4. **Smoke Test Script:**
   - `scripts/smoke.mjs` to test `/health`, SPA root, `/api/demo/dhaka`, and static audio files against any `BASE_URL`.
5. **Render Blueprint (`render.yaml`) & Deployment Guide:**
   - Clean up `render.yaml` to remove ElevenLabs env vars, set `gemma-4-26b-a4b-it`, and provide click-by-click instructions in `docs/DEPLOY.md`.

---

## 5. Prioritized Fix List

### Phase 2: Free TTS Chain & Bundled Demo Audio
1. Refactor `server/services/tts/` into a unified modular provider chain (`index.js`, `geminiTts.js`, `mmsTts.js`, `browserFallback.js`).
2. Add Gemini TTS integration using `gemini-3.8-flash-tts` via Google AI Studio API (`GEMMA_API_KEY` or `GEMINI_API_KEY`).
3. Add Meta MMS-TTS integration with optional `HF_TOKEN`.
4. Remove all ElevenLabs files, env vars, dependencies, and docs mentions.
5. Generate real bundled audio clips for Dhaka demo (EN + BN) using Gemini TTS and store in repo for instant offline demo playback.
6. Write unit and integration tests with mocked providers testing fallback order, 429 backoff, caching, and oversized text rejection.
7. Update `docs/VERIFIED.md`, `README.md`, `.env.example`, and `docs/BUILD_LOG.md`.

### Phase 3: Full Website QA & Security
1. Add `helmet` with custom CSP, `compression`, and API rate limiting to `server/index.js`.
2. Add delete functionality to Nature Journal entries in `client/src/utils/db.js` and `client/src/components/NatureJournal.jsx`.
3. Replace browser `alert()` with inline alerts in `LocationSearch.jsx`.
4. Add voice availability warning in `AudioWalkPlayer.jsx` when Bangla voice is missing from browser synthesis.
5. Verify failure modes (offline, Open-Meteo failure, Overpass timeout, hazardous AQI guardrails) locally on 360×800 and desktop viewports.
6. Run Lighthouse audit and document results in `docs/QA_REPORT.md`.

### Phase 4: Render Deploy-Ready
1. Update `render.yaml` with correct environment variables and Node 20 runtime.
2. Add root scripts in `package.json`: `verify`, `smoke`.
3. Implement `scripts/smoke.mjs` and execute against local production server.
4. Create `docs/DEPLOY.md` with step-by-step instructions, cold-start explanation, and troubleshooting table.
5. Test fresh clone build in a temporary directory via `npm run verify`.

### Phase 5: Submission via DevRelay
1. Update `docs/BUILD_LOG.md` with verified metrics (latencies, clip sizes, test counts).
2. Refresh `docs/POST.md` with exact required headings, removing ElevenLabs and highlighting open innovation.
3. Save agent session with DevRelay and embed in post.
4. Create DEV draft post (`create_article` with `published: false`).
5. Audit final submission against `docs/SUBMISSION_CHECKLIST.md`.
