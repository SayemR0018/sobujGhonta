# Build Log: Decisions, Dead Ends, Bugs, and Real Verified Metrics
## Sobuj Ghonta (সবুজ ঘণ্টা) — The Green Hour

*An authentic record of engineering choices, debugging sessions, and benchmark measurements during the development of "Sobuj Ghonta (সবুজ ঘণ্টা) — The Green Hour" for DEV Hacktoberfest Week 1.*

---

## 1. Verified Benchmark Metrics & Test Results

### Automated Test Suite Run
- **Unit & Contract Suite:** `npm test` (`node --test server/tests/**/*.test.js server/tests/*.js`)
  - **Total Tests:** 79 tests across 12 test suites (100% passing)
  - **Execution Time:** ~3.09 s
- **Comprehensive 4-Tier E2E Suite:** `npm run test:e2e` (`node tests/runner.mjs`)
  - **Tier 1 (Feature Coverage):** 175 / 175 tests
  - **Tier 2 (Boundary & Corner Cases):** 175 / 175 tests
  - **Tier 3 (Cross-Feature Pairwise):** 35 / 35 tests
  - **Tier 4 (Real-World Scenarios):** 5 / 5 tests
  - **Total Tests:** 390 / 390 tests across 78 suites in 13 files (100% passing)
- **Adversarial Stress Oracle:** `node tests/adversarial/stress_oracle.mjs`
  - **Total Tests:** 23 / 23 adversarial tests passing
- **ML Sidecar Python Suite:** `ml\.venv\Scripts\python.exe -m pytest`
  - **Total Tests:** 22 / 22 pytest tests passing
- **Production Integration QA:** `node scripts/fullQaRunner.mjs`
  - **Total Tests:** 16 / 16 production checks passing (100%)
- **Deployment Smoke Verification:** `node scripts/smoke.mjs`
  - **Total Checks:** 9 / 9 smoke checks passing (100%)
- **Automated Secret Scanner:** `node scripts/scan-secrets.mjs`
  - **Leaks Detected:** 0 across all files, git objects, and documentation
- **Empirical Backtest Suite:** `node scripts/backtest.mjs`
  - **Held-out Hours Evaluated:** 48 hours across Dhaka, Delhi, and London

### Frontend Production Asset Sizes (Vite 6.4.4)
- **HTML Shell (`dist/index.html`):** 1.34 kB (gzip: 0.68 kB)
- **Styles (`dist/assets/index-BVZLTYjT.css`):** 5.56 kB (gzip: 1.87 kB)
- **Application Bundle (`dist/assets/index-CKgfjG4d.js`):** 290.91 kB (gzip: 86.69 kB)
- **Build Status:** Clean compile, 0 warnings

### Real API Response Latencies & Demo Audio Metrics
- **`/health`:** ~9 ms
- **`/api/demo/dhaka?lang=bn`:** 7 ms (instantaneous bundled cache)
- **`/api/tts` (Disk cache hit):** 16 ms
- **Bundled Demo Audio Generation Latency & Sizes (Ramna Park with `gemini-3.8-flash-tts`):**
  - `en_0.wav` (Stepping Into the Sanctuary): 12,010 ms | 651,234 bytes (636.0 kB)
  - `en_1.wav` (Under the Ancient Canopy): 12,163 ms | 697,314 bytes (681.0 kB)
  - `en_2.wav` (Lake Promenade Mindfulness): 11,045 ms | 660,834 bytes (645.3 kB)
  - `en_3.wav` (Grounding and Return): 13,174 ms | 749,154 bytes (731.6 kB)
  - `bn_0.wav` (সবুজে প্রথম পদক্ষেপ): 12,777 ms | 607,074 bytes (592.8 kB)
  - `bn_1.wav` (শতবর্ষী বৃক্ষের ছায়াতলে): 9,001 ms | 647,394 bytes (632.2 kB)
  - `bn_2.wav` (লেক পাড়ের ধ্যানমগ্নতা): 12,535 ms | 718,434 bytes (701.6 kB)
  - `bn_3.wav` (প্রশান্তি নিয়ে প্রত্যাবর্তন): 13,201 ms | 701,154 bytes (684.7 kB)

---

## 2. Replacing ElevenLabs: The Free Provider Chain Story

### The Problem
During early development, the developer was unable to obtain an ElevenLabs API key. Initially, the project had ElevenLabs hardcoded as its audio synthesis provider. Without a key, real voice generation was completely blocked.

### The Search & Verification
1. **Gemini 3.8 Flash TTS:**  
   We queried the official Google Gemini API docs and discovered `gemini-3.8-flash-tts` on the Interactions API (`v1beta/interactions`). The breakthrough was discovering that it accepts the **exact same Google AI Studio key** already provisioned for Gemma (`GEMMA_API_KEY` or `GEMINI_API_KEY`), requiring zero additional subscriptions or credit cards.
   We tested it with Bengali (`bn-BD`) text:
   `"সবুজ ঘণ্টায় আপনাকে স্বাগতম। ফোনটি পকেটে রেখে প্রকৃতির স্নিগ্ধতা উপভোগ করুন।"`
   It returned HTTP 200 with 614 kB of clear, high-fidelity 24 kHz audio.

2. **The 3 RPM Quota Wall & Defensive Fix:**  
   When generating the 8 demo walk clips in rapid succession, the API threw:
   `HTTP 429: Rate limit exceeded for model gemini-3.8-flash-tts (limit: 3 requests per minute on Free Tier). Please retry in 25s`.  
   Instead of giving up, we measured the exact limit: **3 Requests Per Minute**. We built an adaptive backoff in `gemini.js` that waits 25.5s on quota errors, spaced the generation script with 22s intervals, and successfully generated all 8 clips.

3. **Meta MMS-TTS & The 401 Auth Requirement:**  
   We implemented a secondary tier using open-weight Meta MMS (`facebook/mms-tts-ben` and `facebook/mms-tts-eng`) via the Hugging Face Serverless Inference API. Testing revealed that the new HF inference router requires an `HF_TOKEN` (returning 401 without one). We kept MMS-TTS fully functional behind an optional `HF_TOKEN` flag and engineered a graceful fallback when unauthenticated.

4. **Client Web Speech API (Browser Fallback):**  
   If the user has zero keys and is offline, the browser's native `window.speechSynthesis` takes over. We added Bengali voice detection (`speechSynthesis.getVoices().some(v => v.lang.startsWith('bn'))`) to alert the user if their device lacks a Bengali voice pack, recommending downloaded audio.

5. **ElevenLabs Optional Top Tier & Voice Decision:**  
   When the user provides an `ELEVENLABS_API_KEY`, ElevenLabs runs as the top-tier provider in `TTS_PROVIDER=auto`.  
   - **Voice Selection:** Defaulted to library voice **"Anika"** (`jUjRbhZWoMK4aDciW36V`, listed language Hindi). Under the multilingual model `eleven_multilingual_v2`, Anika's phonetic model handles Bengali diacritics and compound consonants with high warmth and clarity.
   - **Precedence Hierarchy:** `ELEVENLABS_VOICE_ID_BN` / `ELEVENLABS_VOICE_ID_EN` language overrides take precedence over general `ELEVENLABS_VOICE_ID`, falling back to `jUjRbhZWoMK4aDciW36V`.
   - **Credit Protection:** Free accounts have 10,000 credits/month (~10 minutes). We engineered an in-memory soft cap at **8,000 characters** (`ELEVENLABS_MONTHLY_CHAR_CAP`) that automatically stops calling ElevenLabs and cascades to Gemini TTS once reached.
   - **Library Voice 402/403 Handling:** If a free account encounters permission or subscription errors on library voices, the error clearly advises adding the voice via VoiceLab or selecting a default voice from `GET /v1/voices`.
   - **Non-Secret Tooling:** Created `npm run tts:test` and `npm run demo:audio` so the developer can run voice synthesis locally without exposing API keys to coding agents or git history.

---

## 3. Engineering Decisions

### Decision 1: Immutable Heuristic Guardrails Above LLM Prompting
- **Context:** Generative LLMs frequently hallucinate or produce well-meaning conversational output that ignores strict safety criteria.
- **Implementation:** Created `server/services/guardrails.js` which evaluates environmental telemetry (AQI, apparent temp, rain/thunder, humidity) using hard mathematical rules.
- **Rule Enforcement:** If AQI > 150, `effort_level` is forcibly set to `"gentle"`; if AQI > 200, it is forced to `"rest"` with mandatory N95 mask / postpone guidance. The medical disclaimer is always injected. Gemma cannot override this logic.

### Decision 2: Dual LLM Provider Architecture (`gemma_api` ↔ `ollama`)
- **Context:** Hacktoberfest judges and developers should be able to run the application completely locally without relying on external API keys or cloud services.
- **Implementation:** Built an adapter pattern in `server/services/llm/adapter.js`. Setting `LLM_PROVIDER=ollama` routes requests to `localhost:11434` running local weights (`gemma2:9b`). Setting `LLM_PROVIDER=gemma_api` uses Google AI Studio (`gemma-4-26b-a4b-it`).

### Decision 3: Zero-Latency Bundled Dhaka Demo Audio
- **Context:** Judges evaluating on the web should not have to wait 15 seconds per segment or experience 429 rate limit delays.
- **Implementation:** Pre-generated 8 high-fidelity audio clips with `gemini-3.8-flash-tts` and committed them into `client/public/demo-audio/` and `server/cache/audio/`. The Service Worker pre-caches them on install, enabling an instant, zero-key demo that works 100% offline.

---

## 4. Bugs Found and Fixed During Skeptical Adversarial Review

During our independent review phase, we audited code paths and identified 6 concrete bugs that were completely missed in initial passes:

### Bug 1: `scripts/setup-keys.mjs` Terminal Deadlock in Raw Mode
- **Symptom:** In interactive terminals, pressing Enter after entering a key did not advance to the next prompt, freezing the setup wizard.
- **Root Cause:** In raw mode (`setRawMode(true)`), carriage return bytes (`\r`) were intercepted by `onData`, but `onData` had an empty block for `\r`/`\n` and relied on `rl.on('line')`, which never fired because raw mode suppressed newline translation.
- **Fix:** Refactored `promptMasked` to cleanly resolve the Promise, disable raw mode, pause stdin, and emit a newline directly upon receiving `\r` or `\n`.

### Bug 2: `ScreenMeter` State Decoupled from `WalkView` & Receipt Modal
- **Symptom:** `WalkReceiptModal` always rendered `0.0% Screen Time` and streak counter was evaluated against 0 seconds regardless of how long the walk ran.
- **Root Cause:** `ScreenMeter.jsx` maintained its interval timer and screen seconds in private internal state and never reported them to `WalkView.jsx`. `WalkView.jsx` initialized `walkSeconds` and `screenSeconds` to 0 and never updated them.
- **Fix:** Added `onUpdate({ walkSeconds, screenSeconds })` callback prop to `ScreenMeter.jsx`, connected it to `WalkView.jsx`, and calculated real screen-to-walk percentages.

### Bug 3: Walk Sessions Never Persisted to IndexedDB
- **Symptom:** Completing a walk did not save the walk session to browser storage.
- **Root Cause:** `client/src/utils/db.js` declared the `walkSessions` object store but contained no CRUD functions (`saveWalkSession`, `getAllWalkSessions`, `saveAllWalkSessions`).
- **Fix:** Added full `walkSessions` and `secureKeys` CRUD operations in `db.js`, and hooked `saveWalkSession` into `handleFinishWalk` in `WalkView.jsx`.

### Bug 4: Mocked / Hardcoded CSV Export & Import in `SettingsView.jsx`
- **Symptom:** Clicking "Export CSV" downloaded a static string with 2 hardcoded rows from 2026-10-10, and clicking "Import CSV" displayed a toast without reading or persisting any file rows.
- **Root Cause:** Placeholder implementation was left in place.
- **Fix:** Replaced with asynchronous RFC 4180 export fetching user's actual walk logs from `getAllWalkSessions()`, and implemented a real `FileReader` CSV parser in `handleImportCsv` that validates columns and stores rows into IndexedDB.

### Bug 5: In-App Keys Not Supporting Opt-In IndexedDB Persistence
- **Symptom:** Keys were only saved to `sessionStorage` and lost on tab close, with no way to opt into local device persistence.
- **Root Cause:** Declared `storageType` state without UI controls or IndexedDB backing.
- **Fix:** Added UI toggle between `sessionStorage` (default ephemeral) and `IndexedDB` (opt-in persistence), with full CRUD methods in `db.js`.

### Bug 6: `WalkReceiptModal` Canvas Crash Risk on Legacy Browsers
- **Symptom:** Older browsers without `CanvasRenderingContext2D.prototype.roundRect` threw a TypeError when rendering the receipt card.
- **Root Cause:** Unconditional call to `ctx.roundRect`.
- **Fix:** Added feature detection and fallback to standard `ctx.rect` if `roundRect` is unavailable.
