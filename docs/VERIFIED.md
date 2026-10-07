# Verified Technical Specifications & APIs

*Compiled via upstream documentation lookups, live API calls, and real test clips for Hacktoberfest Week 1.*

---

## 1. Gemma Models on Gemini API / Google AI Studio

### Verified Model Identifiers
- **Live Active Open-Weight Model:** `gemma-4-26b-a4b-it`
  - Verified with live `generateContent` call: HTTP 200 OK.
  - Context Window: 128K tokens.
  - Generates crisp structured reasoning for outdoor windows and safety notes.
- **Model Deprecation / 404 Finding:**
  - Calling `gemma-3-27b-it` on v1beta returned HTTP 404 NOT FOUND (`models/gemma-3-27b-it is not found for API version v1beta`).
  - Switched default model configuration to `gemma-4-26b-a4b-it`.
- **Local Ollama Equivalents:** `gemma2:9b`, `gemma2:27b`.

### API Capabilities & Defensive Strategies
- **System Instructions:** Gemma endpoints on Google AI Studio often reject or ignore `system_instruction` in API payloads.
  - *Engineering Decision:* Place system rules and constraints directly in the **User turn** (`User: [SYSTEM CONSTRAINTS] ... [USER REQUEST]`).
- **Structured JSON Mode:** Gemma models do not reliably enforce strict grammar-constrained JSON schemas like flagship Gemini models.
  - *Engineering Decision:* Prompt with explicit JSON schema and example; parse defensively on the server with markdown fence stripper (````json ... ````) and regex extractor (`\{[\s\S]*\}`). If parsing fails, retry once with an error-correcting prompt; if retry fails, fall back to a deterministic template.
- **Image Input (Nature Journal):** `describeNaturePhoto` utilizes multimodal generation when an active multimodal model is reachable, or respectfully falls back to on-device naturalist reflection.

---

## 2. Text-to-Speech (TTS) Multi-Tier Provider Chain

The application employs a robust, cascading TTS architecture (`auto` mode order):
`elevenlabs` (only if `ELEVENLABS_API_KEY` is present) → `gemini` → `mms` → `browser`.
Explicit `TTS_PROVIDER` values (`elevenlabs`, `gemini`, `mms`, `browser`, `none`) force a single provider. All 401/402/403/429/quota errors gracefully fall through to the next provider.

### A. ElevenLabs TTS (`eleven_multilingual_v2` / `eleven_turbo_v2_5`)
- **Status:** Optional top-tier provider when `ELEVENLABS_API_KEY` is supplied in local environment.
- **Endpoint:** `POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}`
- **Authentication:** `xi-api-key: $ELEVENLABS_API_KEY` (server-side only; key is never leaked to browser or logs).
- **Default Voice ID:** `jUjRbhZWoMK4aDciW36V` (Community Library Voice "Anika", listed language Hindi).
- **Language Precedence:**
  1. Per-language override: `ELEVENLABS_VOICE_ID_BN` (for Bengali) or `ELEVENLABS_VOICE_ID_EN` (for English)
  2. General `ELEVENLABS_VOICE_ID` from environment
  3. Default library voice: `jUjRbhZWoMK4aDciW36V`
- **Model Selected & Verified:** `eleven_multilingual_v2` (officially verified support for 29+ languages including Bengali/ben) or `eleven_turbo_v2_5`. Configurable via `ELEVENLABS_MODEL_ID`.
- **Verified Voice Settings (Walking Guide Defaults):**
  - `speed`: `0.9` (gentle, mindful pacing for outdoor guidance)
  - `stability`: `0.5`
  - `similarity_boost`: `0.75`
  - `style`: `0.0`
  - `use_speaker_boost`: `true`
- **Free-Plan Credit Protection & Rate Limits:**
  - **Soft Monthly Cap:** Enforced at `8,000` characters (`ELEVENLABS_MONTHLY_CHAR_CAP`), preserving a 2,000-character safety margin on ElevenLabs' 10,000-credit free tier. Automatically cascades to Gemini TTS upon reaching the cap.
  - **Per-Request Character Cap:** Capped at `600` characters per segment.
- **Library Voice 402/403 Handling & Live Finding:**
  - *Observed Error (Live Test):* `HTTP 402: Free users cannot use library voices via the API. Please upgrade your subscription to use this voice.`
  - *Engineering Analysis:* Community Voice Library voices (such as "Anika" `jUjRbhZWoMK4aDciW36V`) are restricted on ElevenLabs Free Tier API keys. The system gracefully catches this HTTP 402, displays an actionable advisory, and falls through to the next provider.
  - *Free Account Pre-made Voices:* Free accounts can synthesize using ElevenLabs' default pre-made voices (e.g. Rachel: `21m00Tcm4TlvDq8ikWAM`, Domi: `AZnzlk1XvdvUeBnXmlld`, Bella: `EXAVITQu4vr4xnSDxMaL`, Antoni: `ErXwobaYiN019PkySvjV`).
- **License / Attribution Requirement:** Free tier requires non-commercial use and attribution ("Voice by ElevenLabs").

### B. Gemini 3.8 Flash TTS (`gemini-3.8-flash-tts`)
- **Endpoint:** `POST https://generativelanguage.googleapis.com/v1beta/interactions`
- **Authentication:** `x-goog-api-key: $GEMMA_API_KEY` (or `$GEMINI_API_KEY`). **Reuses the identical Google AI Studio key as Gemma.**
- **Model ID:** `gemini-3.8-flash-tts`
- **Voice Selected:** `Kore` (soothing, calm pacing tailored for mindful nature guidance).
- **Languages Tested & Verified:**
  - English (`en`): 4 walk segments synthesized (11–13s latency per call, 636–732 kB per clip).
  - Bengali (`bn` / `bn-BD`): 4 walk segments synthesized (9–13s latency per call, 592–702 kB per clip; live test: 380 kB in 11.8s). Full phonetic fidelity on complex Bengali compound characters and conjuncts.
- **Output Format:** Unary requests return standard `audio/wav` with valid `RIFF` / `WAVEfmt ` headers (24,000 Hz, 16-bit mono PCM).
- **Free Tier Rate Limits & Quotas (Observed):**
  - **Minute Limit:** Exactly **3 requests per minute (3 RPM)** on Google AI Studio Free Tier.
    - *Error signature:* `HTTP 429: Rate limit exceeded for model gemini-3.8-flash-tts (limit: 3 requests per minute on Free Tier). Please retry in 25s`.
  - **Daily Limit:** Exactly **10 requests per day (10 RPD)** on Google AI Studio Free Tier.
    - *Error signature:* `HTTP 429: Rate limit exceeded for model gemini-3.8-flash-tts (limit: 10 requests per day on Free Tier). Please retry in 13h48m or upgrade your tier at https://ai.dev/rate-limit.`
  - **Handling & Architectural Necessity:**
    - Automated backoff and retry for per-minute bursts.
    - Because of the strict 10 RPD quota, **bundled pre-generated demo audio (`client/public/demo-audio/`) is architectural necessity** to guarantee hackathon judges can experience full audio guidance with zero quota failures.
    - Uncaught 429s automatically cascade to Meta MMS-TTS and client Browser Web Speech.

### B. Meta MMS-TTS (`facebook/mms-tts-ben` & `facebook/mms-tts-eng`)
- **Router Endpoint:** `https://router.huggingface.co/hf-inference/models/{model}`
- **Models:**
  - Bengali: `facebook/mms-tts-ben`
  - English: `facebook/mms-tts-eng`
- **License:** CC-BY-NC 4.0 (Non-commercial open weights by Meta AI).
- **Authentication:** Optional `HF_TOKEN`. Hugging Face's serverless router returns HTTP 401 when unauthenticated.
- **Handling:** If `HF_TOKEN` is unset or Hugging Face is throttled, the server seamlessly signals client fallback.

### C. Client Browser Web Speech API (`window.speechSynthesis`)
- **Zero-Cloud Fallback:** Operates client-side with zero external API calls.
- **Voice Availability Detection:** Detects whether a Bengali (`bn` or `bn-BD`) voice exists in `window.speechSynthesis.getVoices()`. If missing, shows an actionable warning suggesting pre-downloaded audio.
- **Mobile Screen-Lock Advisory:** Warns users that iOS/Android browser speech synthesis may pause when the screen locks, recommending the pre-cached offline walk for pocket mode.

### D. Bundled Dhaka Demo Audio (Ramna Park)
Generated with `gemini-3.8-flash-tts` and committed into repository (`client/public/demo-audio/` and `server/cache/audio/`):
- `en_0.wav` (Stepping Into the Sanctuary): 651,234 bytes (636.0 kB)
- `en_1.wav` (Under the Ancient Canopy): 697,314 bytes (681.0 kB)
- `en_2.wav` (Lake Promenade Mindfulness): 660,834 bytes (645.3 kB)
- `en_3.wav` (Grounding and Return): 749,154 bytes (731.6 kB)
- `bn_0.wav` (সবুজে প্রথম পদক্ষেপ): 607,074 bytes (592.8 kB)
- `bn_1.wav` (শতবর্ষী বৃক্ষের ছায়াতলে): 647,394 bytes (632.2 kB)
- `bn_2.wav` (লেক পাড়ের ধ্যানমগ্নতা): 718,434 bytes (701.6 kB)
- `bn_3.wav` (প্রশান্তি নিয়ে প্রত্যাবর্তন): 701,154 bytes (684.7 kB)

---

## 3. Open-Meteo APIs (Weather, Air Quality & Geocoding)

Free, open REST APIs requiring zero API keys for non-commercial use:

### A. Geocoding API
- **Endpoint:** `https://geocoding-api.open-meteo.com/v1/search?name={city_name}&count=5&language=en&format=json`
- **Output:** Array of matches with `latitude`, `longitude`, `name`, `admin1`, `country`.

### B. Hourly Air Quality API
- **Endpoint:** `https://air-quality-api.open-meteo.com/v1/air-quality?latitude={lat}&longitude={lon}&hourly=us_aqi,pm2_5,pm10&timezone=auto`
- **Key Metrics:**
  - `us_aqi`: Standard EPA Air Quality Index (0–500).
  - `pm2_5`: Fine particulate matter in $\mu\text{g}/\text{m}^3$.

### C. Hourly Weather Forecast API
- **Endpoint:** `https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&hourly=temperature_2m,apparent_temperature,precipitation_probability,precipitation,uv_index,weather_code&daily=sunrise,sunset&timezone=auto`
- **Key Metrics:**
  - `apparent_temperature`: Heat index in °C.
  - `precipitation_probability`: Rain likelihood (%).
  - `uv_index`: Solar radiation risk index.
  - `sunrise` / `sunset`: Exact ISO timestamps for golden-hour bonus calculation.

---

## 4. OpenStreetMap Overpass API (Green Spaces Discovery)

### Endpoint
- **URL:** `https://overpass-api.de/api/interpreter`
- **Method:** `POST` with `data=<OverpassQL>`
- **Query Filter:** Parks, gardens, nature reserves, playgrounds, and lake/water bodies within ~3 km radius.
- **Fallback:** If Overpass times out or returns 0 results, gracefully falls back to bundled Dhaka greenspaces (Ramna Park, Suhrawardy Udyan, Dhanmondi Lake, Chandrima Udyan, Gulshan Lake Park).

---

## 5. Render Blueprint Specification

- **Web Service:** Node.js 20 runtime, free plan.
- **Health Check Path:** `/health` (returns HTTP 200 with uptime and status).
- **Environment Sync:** Secrets set with `sync: false` (`GEMMA_API_KEY`, `HF_TOKEN`).
- **Proxy Configuration:** `app.set('trust proxy', 1)` ensures rate limiting correctly identifies client IPs behind Render's reverse proxy.
