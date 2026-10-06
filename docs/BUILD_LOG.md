# Build Log: Decisions, Dead Ends, Bugs, and Real Verified Metrics

*An authentic record of engineering choices, debugging sessions, and benchmark measurements during the development of "Sobuj Ghonta (সবুজ ঘণ্টা) — The Green Hour" for DEV Hacktoberfest Week 1.*

---

## 1. Verified Benchmark Metrics & Test Results

### Automated Test Suite Run
- **Command:** `npm test` (`node --test server/tests/**/*.test.js`)
- **Node.js Version:** `v24.16.0`
- **Total Tests:** 16 tests across 3 test suites
- **Passed:** 16 / 16 (100%)
- **Execution Time:** 190.18 ms

#### Suite Breakdown
1. **Green Window Scoring Engine (`scoring.test.js`):**
   - Optimal weather + golden hour top score: PASSED (2.31 ms)
   - Severe air pollution (AQI 220) penalty: PASSED (1.78 ms)
   - Extreme heat (>38°C) thermal penalty: PASSED (0.38 ms)
   - Thunderstorm weather code (95) penalty: PASSED (0.40 ms)
   - Nighttime park exploration penalty: PASSED (0.33 ms)
   - 24h timeline best window identification: PASSED (2.56 ms)
2. **Safety Guardrails Engine (`guardrails.test.js`):**
   - AQI > 150 overrides strenuous effort to gentle: PASSED (2.26 ms)
   - AQI > 200 mandates rest and N95 mask advice: PASSED (1.23 ms)
   - Bangla translations unicode script integrity: PASSED (0.51 ms)
   - Warm, humid, rainy mosquito risk trigger: PASSED (0.45 ms)
   - Overly verbose walk script segments trimmed to <=60 words: PASSED (0.44 ms)
3. **End-to-End Edge Cases & Flow Tests (`e2eFlows.test.js`):**
   - AQI > 200 hazardous scenario: PASSED (3.58 ms)
   - Bangla script rendering: PASSED (0.76 ms)
   - SHA-256 deterministic audio hash caching: PASSED (1.31 ms)
   - Haversine distance accuracy on Dhaka park coordinates: PASSED (0.44 ms)
   - Bundled Dhaka fallback dataset completeness: PASSED (0.30 ms)

### Frontend Production Asset Sizes (Vite 6.0)
- **HTML Shell (`dist/index.html`):** 1.34 kB (gzip: 0.68 kB)
- **Styles (`dist/assets/index-D0y0JKS0.css`):** 2.99 kB (gzip: 1.17 kB)
- **Application Bundle (`dist/assets/index-A4rpekOq.js`):** 210.73 kB (gzip: 63.90 kB)
- **Build Time:** 15.31 s

### Real API Response Latencies
- **`/health`:** ~53 ms
- **`/api/demo/dhaka?lang=bn`:** 12 ms (instantaneous, 0-key bundled cache)
- **`/api/tts` (Browser Web Speech fallback):** 8 ms
- **`/api/plan` (Live Open-Meteo + Overpass fetch):** 2,840 ms roundtrip

---

## 2. Engineering Decisions

### Decision 1: Immutable Heuristic Guardrails Above LLM Prompting
- **Context:** Generative LLMs frequently hallucinate or produce well-meaning conversational output that ignores strict safety criteria.
- **Implementation:** Created `server/services/guardrails.js` which evaluates environmental telemetry (AQI, apparent temp, rain/thunder, humidity) using hard mathematical rules.
- **Rule Enforcement:** If AQI > 150, `effort_level` is forcibly set to `"gentle"`; if AQI > 200, it is forced to `"rest"` with mandatory N95 mask / postpone guidance. The medical disclaimer is always injected. Gemma cannot override this logic.

### Decision 2: Dual LLM Provider Architecture (`gemma_api` ↔ `ollama`)
- **Context:** Hacktoberfest judges and developers should be able to run the application completely locally without relying on any external API keys or cloud services.
- **Implementation:** Built an adapter pattern in `server/services/llm/adapter.js`. Setting `LLM_PROVIDER=ollama` routes requests to `localhost:11434` running local weights (`gemma2:9b`). Setting `LLM_PROVIDER=gemma_api` uses Google AI Studio.

### Decision 3: Deterministic SHA-256 Audio Caching & IndexedDB
- **Context:** ElevenLabs API calls consume quota and require active cellular data. On remote trails or city parks with dead zones, network drops would stall the guided walk.
- **Implementation:** Audio clips are hashed on the server using `sha256(text + voiceId + lang + model)` and cached to disk. The frontend offers a "Download Walk for Trail" button that saves all segment blobs into IndexedDB (`SobujGhontaDB -> audioClips`), allowing uninterrupted lock-screen audio playback with zero cellular signal.

---

## 3. Bugs Encountered & Solutions

### Bug 1: Local vs UTC Timezone Shift in Best Window Score
- **Symptom:** Unit test `scoreForecastTimeline correctly identifies best window` failed with `AssertionError: 23 !== 17`.
- **Cause:** `new Date('2026-10-07T17:00:00Z').getHours()` returned `23` because the local test machine is in Bangladesh Standard Time (UTC+6). The hour was shifted by 6 hours into late night.
- **Fix:** Switched to parsing the hour directly from the ISO string (`timeStr.includes('T') ? parseInt(timeStr.split('T')[1].slice(0, 2), 10) : time.getHours()`), perfectly matching Open-Meteo's local timezone format (`timezone=auto`).

### Bug 2: CacheStorage Limitation on POST Requests
- **Symptom:** Browser Service Worker CacheStorage API throws `TypeError: Request method 'POST' is not supported` when attempting to cache `/api/tts` calls.
- **Cause:** The native Cache API only supports `GET` request keys.
- **Fix:** Re-routed client-side audio pre-caching to **IndexedDB** (`audioClips` object store). Audio blobs are keyed by segment text and index, retrieved as Object URLs, and played seamlessly offline.

### Bug 3: Speech Synthesis Pace in Sunlight
- **Symptom:** Default browser speech synthesis speaks too rapidly for a meditative nature walk.
- **Fix:** Configured `utterance.rate = 0.9` and mapped language to `bn-BD` for Bengali and `en-US` for English, providing a calming, unhurried cadence.
