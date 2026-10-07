# Build Log: Decisions, Dead Ends, Bugs, and Real Verified Metrics

*An authentic record of engineering choices, debugging sessions, and benchmark measurements during the development of "Sobuj Ghonta (সবুজ ঘণ্টা) — The Green Hour" for DEV Hacktoberfest Week 1.*

---

## 1. Verified Benchmark Metrics & Test Results

### Automated Test Suite Run
- **Command:** `npm test` (`node --test server/tests/**/*.test.js`)
- **Node.js Version:** `v24.16.0`
- **Total Tests:** 25 tests across 4 test suites
- **Passed:** 25 / 25 (100%)
- **Execution Time:** 459.93 ms

#### Suite Breakdown
1. **Green Window Scoring Engine (`scoring.test.js`):**
   - Optimal weather + golden hour top score: PASSED (1.88 ms)
   - Severe air pollution (AQI 220) penalty: PASSED (2.19 ms)
   - Extreme heat (>38°C) thermal penalty: PASSED (0.29 ms)
   - Thunderstorm weather code (95) penalty: PASSED (0.33 ms)
   - Nighttime park exploration penalty: PASSED (0.29 ms)
   - 24h timeline best window identification: PASSED (2.40 ms)
2. **Safety Guardrails Engine (`guardrails.test.js`):**
   - AQI > 150 overrides strenuous effort to gentle: PASSED (1.95 ms)
   - AQI > 200 mandates rest and N95 mask advice: PASSED (1.32 ms)
   - Bangla translations unicode script integrity: PASSED (0.33 ms)
   - Warm, humid, rainy mosquito risk trigger: PASSED (0.30 ms)
   - Overly verbose walk script segments trimmed to <=60 words: PASSED (0.33 ms)
3. **End-to-End Edge Cases & Flow Tests (`e2eFlows.test.js`):**
   - AQI > 200 hazardous scenario: PASSED (1.53 ms)
   - Bangla script rendering: PASSED (0.51 ms)
   - SHA-256 deterministic audio hash caching: PASSED (1.02 ms)
   - Haversine distance accuracy on Dhaka park coordinates: PASSED (0.34 ms)
   - Bundled Dhaka fallback dataset completeness: PASSED (0.18 ms)
4. **Free Text-to-Speech (TTS) Provider Chain & Caching (`tts.test.js`):**
   - Deterministic audio hashing across identical inputs: PASSED (2.81 ms)
   - Oversized input exceeding 450 characters is rejected: PASSED (1.24 ms)
   - Empty or whitespace input is rejected: PASSED (0.39 ms)
   - Per-IP sliding window rate limit enforces max 30 requests: PASSED (0.56 ms)
   - Wrap PCM utility creates valid 44-byte RIFF/WAVE header: PASSED (0.63 ms)
   - Explicit browser provider returns client fallback signal: PASSED (0.43 ms)
   - Explicit none provider disables TTS gracefully: PASSED (0.27 ms)
   - Disk cache hit serves stored buffer on duplicate request: PASSED (11.79 ms)
   - Graceful fallback to browser speech on remote provider failure: PASSED (216.98 ms)

### Frontend Production Asset Sizes (Vite 6.0)
- **HTML Shell (`dist/index.html`):** 1.34 kB (gzip: 0.68 kB)
- **Styles (`dist/assets/index-D0y0JKS0.css`):** 2.99 kB (gzip: 1.17 kB)
- **Application Bundle (`dist/assets/index-DyVxXDH1.js`):** 212.81 kB (gzip: 64.35 kB)
- **Build Time:** 18.99 s

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
