# Sobuj Ghonta (সবুজ ঘণ্টা) — The Green Hour

> **Ambient, screen-minimizing outdoor companion for safe urban green discovery.**  
> Built for the [DEV Hacktoberfest Open-Source AI Challenge Week 1: Touch Grass](https://dev.to/challenges/hacktoberfest-week1-2026-10-05).

![Sobuj Ghonta Cover](docs/cover.png)

---

## What is Sobuj Ghonta?

For over four billion people living in dense urban centers, "touching grass" isn't a 10-minute drive to an alpine hiking trail. In high-density cities like Dhaka, Kolkata, or Bangkok, nature is found in fragmented municipal parks, lakeside promenades, and pocket gardens—tucked behind concrete flyovers and heavy traffic.

To make matters harder, urban nature outings require navigating **environmental realities**: air quality spikes (US AQI > 150), tropical heat waves, intense midday UV radiation, sudden monsoon thunderstorms, and vector-borne mosquito seasons. Worse yet, conventional fitness and navigation apps do the opposite of helping you disconnect—bombarding you with screens, alerts, and map tapping.

**Sobuj Ghonta (সবুজ ঘণ্টা — "The Green Hour")** flips the script:
1. **Discovers Safe Urban Green Windows:** Computes a deterministic 0–100 hourly score combining real-time Open-Meteo AQI, PM2.5, apparent temperature, UV, and golden hour windows.
2. **Finds Nearby Canopies:** Queries OpenStreetMap Overpass for parks, gardens, and lakesides within ~3 km, calculating walking distance and time.
3. **Generates Mindful Guided Walks:** Uses Google's open-weight **Gemma** model with strict safety guardrails that AI cannot override (forcing gentle effort and N95 mask warnings when air is polluted).
4. **Puts the Phone in Your Pocket:** Delivers natural voice narrations (bilingual Bengali & English) via an **ElevenLabs proxy** (with browser Web Speech fallback). Featuring an **OLED pitch-black Pocket Mode** and lock-screen **Media Session API** controls so your phone stays stowed.
5. **Measures Screen Time Honestly:** Built-in **Page Visibility API meter** tracks the exact ratio of screen time vs. outdoor walking time, proving that the screen was the shortest part of your day.
6. **On-Device Nature Journal:** Preserves flower and leaf observations in **IndexedDB** on your personal device; photos are never stored server-side.

---

## 📱 Mobile UI

![Sobuj Ghonta Interface](docs/screenshot.png)

---

## ⚡ Zero-Key Instant Demo: "Demo: Dhaka"

You do **not** need an API key to evaluate Sobuj Ghonta. 

Click the **"Demo: Dhaka (Offline)"** button in the header:
- Instantly loads bundled real environmental telemetry from Dhaka (Ramna Park, Suhrawardy Udyan, Dhanmondi Lake, Chandrima Udyan, Gulshan Lake Park).
- Pre-cached bilingual walk scripts and audio play with **zero latency** and **zero network requests**.

---

## 🛡️ Honest Open Innovation: What Is Open vs. Closed

We believe in complete architectural transparency:

| Layer | Technology | License / Nature | Notes |
|---|---|---|---|
| **Core Reasoning** | **Gemma** (Google DeepMind) | Open Weights (Apache 2.0 / Gemma Terms) | Swappable between Google AI Studio Gemma API and local **Ollama** |
| **Environmental Data** | **Open-Meteo** | Open Data / Open Source API | 100% free, open weather & US EPA AQI data |
| **Geospatial Mapping** | **OpenStreetMap (Overpass)** | Open Data (ODbL) | Hyper-local green spaces, parks, and waterfronts |
| **Client & Server Code** | React 18, Vite 6, Express | **MIT License** | Completely open source |
| **User Data & Journal** | Browser **IndexedDB** | On-Device Local | Field notes & photos never leave your device |
| **Spoken Narration** | **ElevenLabs** | Optional Proprietary SaaS | High-fidelity voice proxy with sha256 disk cache; **gracefully falls back to open Browser Web Speech API** when no key is set |

---

## 💻 Running Locally

### Prerequisites
- Node.js >= 20.0.0
- npm >= 10.0.0

### Quickstart
```bash
# 1. Clone repository
git clone https://github.com/SayemR0018/sobujGhonta.git
cd sobujGhonta

# 2. Install dependencies (server + client workspace)
npm install

# 3. Copy environment configuration
cp .env.example .env

# 4. Run test suite (16 tests verifying scoring, guardrails, and e2e flows)
npm test

# 5. Build and start production service
npm run build
npm start
```
Open [http://localhost:10000](http://localhost:10000) in your browser.

---

## 🦙 Run It Fully Local (Zero Cloud Dependencies)

You can run Sobuj Ghonta 100% offline using **Ollama** and browser Web Speech synthesis:

1. Install [Ollama](https://ollama.com/) and pull Gemma open weights:
   ```bash
   ollama pull gemma2:9b
   ```
2. Set your `.env`:
   ```env
   LLM_PROVIDER=ollama
   OLLAMA_URL=http://localhost:11434
   OLLAMA_MODEL=gemma2:9b
   TTS_PROVIDER=browser
   ```
3. Start the app:
   ```bash
   npm start
   ```
Now your environmental scoring, walk generation, and voice narrations run entirely on your local machine with zero external cloud subscriptions or API keys!

---

## 🚀 Deploying on Render

Sobuj Ghonta includes a ready-to-use Render Blueprint (`render.yaml`):

1. Fork or push this repository to GitHub.
2. In the [Render Dashboard](https://dashboard.render.com/), click **New +** → **Blueprint**.
3. Select `SayemR0018/sobujGhonta`.
4. Render will parse `render.yaml` and configure the unified web service.
5. (Optional) Provide `GEMMA_API_KEY` and `ELEVENLABS_API_KEY` when prompted, or leave blank to use the built-in fallback engine.

> **Note on Free-Tier Cold Starts:** On Render's free tier, the web service spins down after 15 minutes of inactivity. The initial wake-up request may take ~30–50 seconds. Once awake, response latency averages 50–100ms.

---

## 🧪 Automated Test Verification

All critical environmental algorithms and guardrails are unit-tested:
```bash
npm test
```
```
▶ End-to-End Edge Case & Flow Tests
  ✔ AQI > 200 scenario forces rest effort and N95 mask guidance (3.577ms)
  ✔ Bangla translations retain correct Unicode script integrity (0.7645ms)
  ✔ Audio hash caching is deterministic for duplicate text segments (1.3056ms)
  ✔ Haversine distance accurately measures known coordinates in Dhaka (0.4412ms)
  ✔ Bundled Dhaka fallback data is fully populated and consistent (0.3047ms)
✔ End-to-End Edge Case & Flow Tests (8.9566ms)
▶ Safety Guardrails Engine
  ✔ AQI > 150 overrides strenuous effort to gentle and warns about air quality (2.2645ms)
  ✔ AQI > 200 mandates rest/postpone and N95 mask guidance (1.228ms)
  ✔ Bangla translations are used when requested language is bn (0.5141ms)
  ✔ Warm, humid, rainy conditions trigger mosquito alert (0.4488ms)
  ✔ Overly verbose walk script segments are trimmed to <=60 words (0.4449ms)
✔ Safety Guardrails Engine (7.162ms)
▶ Green Window Scoring Engine
  ✔ Optimal weather with golden hour produces top-tier score (2.3082ms)
  ✔ Severe air pollution (AQI 220) severely penalizes score (1.7798ms)
  ✔ Extreme heat (>38°C) applies dangerous thermal penalty (0.3826ms)
  ✔ Thunderstorm weather code triggers heavy penalty (0.3966ms)
  ✔ Nighttime condition penalizes score for park exploration (0.3303ms)
  ✔ scoreForecastTimeline correctly identifies best window (2.5596ms)
✔ Green Window Scoring Engine (10.4279ms)
ℹ tests 16
ℹ suites 3
ℹ pass 16
ℹ fail 0
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) — Copyright (c) 2026 Sayem Rahman.