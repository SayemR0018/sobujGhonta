# Build Log: Decisions, Dead Ends, Bugs, and Real Verified Metrics

*An authentic record of engineering choices, debugging sessions, and benchmark measurements during the development of "Sobuj Ghonta (সবুজ ঘণ্টা) — The Green Hour" for DEV Hacktoberfest Week 1.*

---

## 1. Verified Benchmark Metrics & Test Results

### Automated Test Suite Run
- **Command:** `npm test` (`node --test server/tests/**/*.test.js server/tests/*.js`)
- **Node.js Version:** `v24.16.0` (pinned to `20.18.0` in `.node-version` for Render)
- **Total Tests:** 35 tests across 5 test suites
- **Passed:** 35 / 35 (100%)
- **Execution Time:** ~387 ms
- **Production Integration QA:** 16 / 16 passed (`scripts/fullQaRunner.mjs`)
- **Deployment Smoke Verification:** 8 / 8 passed (`scripts/smoke.mjs`)
- **Source Codebase Size:** 5,612 lines of code across 43 tracked files (excluding lockfile and build artifacts)

#### Suite Breakdown
1. **Green Window Scoring Engine (`scoring.test.js`):**
   - Optimal weather + golden hour top score: PASSED (1.4 ms)
   - Severe air pollution (AQI 220) penalty: PASSED (1.3 ms)
   - Extreme heat (>38°C) thermal penalty: PASSED (0.23 ms)
   - Thunderstorm weather code (95) penalty: PASSED (0.23 ms)
   - Nighttime park exploration penalty: PASSED (0.21 ms)
   - 24h timeline best window identification: PASSED (2.0 ms)
2. **Safety Guardrails Engine (`guardrails.test.js`):**
   - AQI > 150 overrides strenuous effort to gentle: PASSED (3.1 ms)
   - AQI > 200 mandates rest and N95 mask advice: PASSED (0.38 ms)
   - Bangla translations unicode script integrity: PASSED (0.41 ms)
   - Warm, humid, rainy mosquito risk trigger: PASSED (0.29 ms)
   - Overly verbose walk script segments trimmed to <=60 words: PASSED (0.40 ms)
   - Apparent temp >= 38°C triggers extreme heat avoidance: PASSED (0.33 ms)
   - Thunderstorm weather codes (95, 96, 99) trigger severe weather warning: PASSED (0.50 ms)
3. **End-to-End Edge Cases & Flow Tests (`e2eFlows.test.js`):**
   - AQI > 200 hazardous scenario: PASSED (1.8 ms)
   - Bangla script rendering: PASSED (0.67 ms)
   - SHA-256 deterministic audio hash caching: PASSED (1.1 ms)
   - Haversine distance accuracy on Dhaka park coordinates: PASSED (0.32 ms)
   - Bundled Dhaka fallback dataset completeness: PASSED (0.18 ms)
4. **Free Text-to-Speech (TTS) Provider Chain & Caching (`tts.test.js`):**
   - Deterministic audio hashing across identical inputs: PASSED (2.1 ms)
   - Oversized input exceeding 450 characters is rejected: PASSED (1.3 ms)
   - Empty or whitespace input is rejected: PASSED (0.40 ms)
   - Per-IP sliding window rate limit enforces max 30 requests: PASSED (0.46 ms)
   - Wrap PCM utility creates valid 44-byte RIFF/WAVE header: PASSED (0.59 ms)
   - Explicit browser provider returns client fallback signal: PASSED (0.39 ms)
   - Explicit none provider disables TTS gracefully: PASSED (0.31 ms)
   - Disk cache hit serves stored buffer on duplicate request: PASSED (12.3 ms)
   - Graceful fallback to browser speech on remote provider failure: PASSED (146.7 ms)
5. **ElevenLabs TTS Provider & Multi-Tier Cascade (`elevenlabs.test.js`):**
   - Voice ID resolution precedence hierarchy: PASSED (1.7 ms)
   - Walking-guide voice settings verification: PASSED (0.54 ms)
   - Handled error when `ELEVENLABS_API_KEY` unset: PASSED (0.86 ms)
   - Soft monthly character budget cap (8,000 chars): PASSED (1.09 ms)
   - 402/403 library voice payment/permission error handling: PASSED (0.66 ms)
   - Cascade on 429/401 rate limit/auth errors: PASSED (18.7 ms)
   - Successful synthesis updates monthly char usage: PASSED (31.2 ms)
   - Zero secret exposure: logs and outputs redact API keys: PASSED (0.52 ms)

### Frontend Production Asset Sizes (Vite 6.4.4)
- **HTML Shell (`dist/index.html`):** 1.34 kB (gzip: 0.68 kB)
- **Styles (`dist/assets/index-D92vYZIN.css`):** 3.28 kB (gzip: 1.28 kB)
- **Application Bundle (`dist/assets/index-CR4mcBwa.js`):** 215.27 kB (gzip: 64.95 kB)
- **Build Time:** 19.17 s

### Real API Response Latencies & Demo Audio Metrics
- **`/health`:** ~12 ms
- **`/api/demo/dhaka?lang=bn`:** 4 ms (instantaneous bundled cache)
- **`/api/tts` (Disk cache hit):** 6 ms
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
During development, the developer was unable to obtain an ElevenLabs API key. Initially, the project had ElevenLabs hardcoded as its audio synthesis provider. Without a key, real voice generation was completely blocked.

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

6. **Live Multi-Tier Test Run Validation (Real Production Findings):**
   - **Command Executed:** `npm run tts:test`
   - **Real Finding 1 (ElevenLabs Free Tier Policy):** When synthesizing with default library voice "Anika" (`jUjRbhZWoMK4aDciW36V`), ElevenLabs returned:
     `HTTP 402: Free users cannot use library voices via the API. Please upgrade your subscription to use this voice.`
     *Behavior:* The server caught this 402, alerted the operator with actionable remediation (use default pre-made voice or add to VoiceLab), and seamlessly cascaded to Gemini TTS.
   - **Real Finding 2 (Gemini Daily Quota Ceiling):** For Bengali (`bn`), Gemini 3.8 Flash TTS succeeded with HTTP 200 OK (380,514 bytes generated in 11.8s). For English (`en`), Gemini returned:
     `HTTP 429: Rate limit exceeded for model gemini-3.8-flash-tts (limit: 10 requests per day on Free Tier). Please retry in 13h48m.`
     *Behavior:* Gemini backed off, retried, and upon receiving the daily quota limit, cascaded to Meta MMS and then to `browser_web_speech` with zero runtime crashes.
   - **Architecture Validated:** This live test conclusively justified:
     1. Pre-bundling all 8 Dhaka walk audio clips into the repo so judges never hit free-tier quota limits.
     2. Providing CLI/env override (`--voice=21m00Tcm4TlvDq8ikWAM`) for default ElevenLabs pre-made voices.

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
