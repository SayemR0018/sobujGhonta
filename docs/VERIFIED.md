# Verified Technical Specifications & APIs

*Compiled via upstream documentation lookups, web verification, and schema checks for Hacktoberfest Week 1.*

---

## 1. Gemma Models on Gemini API / Google AI Studio

### Verified Model Identifiers
- **Primary Target (Gemma 3 Multimodal):** `gemma-3-27b-it`, `gemma-3-12b-it`, `gemma-3-4b-it`
  - Context Window: 128K tokens
  - Modalities: Text and Image input (vision support allows Nature Journal plant/flower descriptions)
- **Fallback / Legacy (Gemma 2 Text-Only):** `gemma-2-27b-it`, `gemma-2-9b-it`
  - Text-only input, no native vision.
- **Local Ollama Adapter Equivalents:** `gemma2:9b`, `gemma2:27b`, `gemma3:4b`, `gemma3:12b`

### API Capabilities & Defensive Strategies
- **System Instructions:** Gemma endpoints on Google AI Studio often reject or ignore `system_instruction` in API payloads.
  - *Engineering Decision:* Place system rules and constraints directly in the **User turn** (`User: [SYSTEM CONSTRAINTS] ... [USER REQUEST]`).
- **Structured JSON Mode:** Gemma models do not reliably enforce strict grammar-constrained JSON schemas like flagship Gemini models.
  - *Engineering Decision:* Prompt with explicit JSON schema and example; parse defensively on the server with markdown fence stripper (````json ... ````) and regex extractor (`\{[\s\S]*\}`). If parsing fails, retry once with an error-correcting prompt; if retry fails, fall back to a deterministic template.
- **Image Input (Nature Journal):** Gemma 3 supports image input; Gemma 2 does not. The server detects model capability or falls back gracefully to text-only notes with an explicit disclaimer ("Model is an AI assistant and may misidentify species").

---

## 2. ElevenLabs Text-to-Speech (TTS)

### API Endpoints
- **Standard Synthesize:** `POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}`
- **Streaming Synthesize:** `POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream`
- **Required Headers:**
  - `xi-api-key: <ELEVENLABS_API_KEY>`
  - `Content-Type: application/json`
  - `Accept: audio/mpeg`

### Model Selection & Bengali (বাংলা) Support
- **Model ID:** `eleven_multilingual_v2` (supports 29+ languages including Bengali `bn`).
- **Bengali Verification:** Bengali phonetics and diacritics are natively synthesized by `eleven_multilingual_v2`.
- **Default Voice ID:** `21m00Tcm4TlvDq8ikWAM` ("Rachel" — calm, steady pacing, natural cadence suited for outdoor mindfulness) or `EXAVITQu4vr4xnSDxMaL` ("Bella").
- **Fallback Strategy:**
  - If `ELEVENLABS_API_KEY` is absent or quota is exhausted, the server instructs the client to use the browser's native **Web Speech API** (`window.speechSynthesis`) or serves pre-cached audio files.

---

## 3. Open-Meteo APIs (Weather, Air Quality & Geocoding)

Free, open-source REST APIs requiring zero API keys for non-commercial use:

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
  - `apparent_temperature`: Heat index / wind chill in °C.
  - `precipitation_probability`: Rain likelihood (%).
  - `uv_index`: Solar radiation risk index.
  - `sunrise` / `sunset`: Exact ISO timestamps for golden-hour calculation.

---

## 4. OpenStreetMap Overpass API (Green Spaces Discovery)

### Endpoint
- **URL:** `https://overpass-api.de/api/interpreter`
- **Method:** `POST` with `data=<OverpassQL>` or `GET` with URL-encoded query.

### Query Template (~3 km radius)
```osm
[out:json][timeout:25];
(
  nwr["leisure"="park"](around:3000,{lat},{lon});
  nwr["leisure"="garden"](around:3000,{lat},{lon});
  nwr["leisure"="nature_reserve"](around:3000,{lat},{lon});
  nwr["leisure"="playground"](around:3000,{lat},{lon});
  nwr["natural"="water"](around:3000,{lat},{lon});
  nwr["water"="lake"](around:3000,{lat},{lon});
);
out center 15;
```
- **Parsing:** Extract `tags.name` (or fallback to category like "Local Park"), coordinates (`lat`/`lon` or `center.lat`/`center.lon`), and calculate distance + walking time via Haversine formula assuming 4.5 km/h walking speed.
- **Fallback:** If Overpass times out or returns 0 results, fall back to bundled Dhaka greenspaces (Ramna Park, Suhrawardy Udyan, Dhanmondi Lake, Chandrima Udyan, Gulshan Lake Park).

---

## 5. Render Blueprint (`render.yaml`) Specification

### Blueprint Structure
```yaml
services:
  - type: web
    name: sobuj-ghonta
    runtime: node
    plan: free
    region: oregon
    buildCommand: npm run build:all
    startCommand: npm run start
    healthCheckPath: /health
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
      - key: LLM_PROVIDER
        value: gemma_api
      - key: TTS_PROVIDER
        value: elevenlabs
      - key: GEMMA_API_KEY
        sync: false
      - key: ELEVENLABS_API_KEY
        sync: false
      - key: ELEVENLABS_VOICE_ID
        sync: false
```
- **`sync: false` Behavior:** Ensures secret keys are never committed into git. Render prompts the user to enter them once during Blueprint creation in the Render Dashboard.
- **Health Check:** `/health` returns `{ status: "ok", timestamp: "..." }` with 200 HTTP status code.
- **Cold-Start Disclosure:** Free tier spins down on idle; README must document 30–50s initial wake-up latency.
