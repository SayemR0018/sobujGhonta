---
title: "Sobuj Ghonta (সবুজ ঘণ্টা) — The Green Hour: Screen-Minimizing Urban Nature Companion"
published: false
description: "An ambient, screen-minimizing outdoor companion that finds safe urban green windows, scores environmental health deterministically, and puts your phone in your pocket with Gemma, free TTS, and Render."
tags: devchallenge, hf26challenge, opensource, ai
cover_image: https://raw.githubusercontent.com/SayemR0018/sobujGhonta/main/docs/cover.png
---

*This is a submission for the [Hacktoberfest Open-Source AI Challenge Week 1: Touch Grass Submission 🌿](https://dev.to/challenges/hacktoberfest-week1-2026-10-05)*

---

## What I Built

Four billion people live in dense metropolitan cities. When hackathons announce themes like **"Touch Grass"**, the tacit assumption is that you live a short drive from pristine mountain trails or manicured suburban nature reserves.

For those of us living in megacities like Dhaka, Delhi, or São Paulo, that is not reality. Our outdoors is an unforgiving landscape of sun-baked concrete, flyovers, gridlocked traffic, and isolated municipal parks like Ramna Park, Suhrawardy Udyan, or Dhanmondi Lake.

Stepping outside in dense tropical cities comes with genuine environmental hazards:
1. **Severe Air Pollution:** US AQI frequently spikes above 150 (Unhealthy) or 200 (Very Unhealthy), turning strenuous cardiovascular exercise into a pulmonary health risk.
2. **Urban Heat Islands:** Apparent temperatures routinely exceed 38°C midday, elevating heat-stroke risks.
3. **Monsoon Humidity & Vector Risks:** Warm stagnant water and post-rain humidity (>70%) create high-risk environments for dengue and mosquito-borne illnesses.

Worse yet, existing outdoor navigation and fitness apps create a glaring paradox: **to navigate nature, they demand that you stay glued to a glowing glass screen.**

I built **Sobuj Ghonta (সবুজ ঘণ্টা — "The Green Hour")** to solve this. It is an ambient, mobile-first, multilingual Progressive Web App designed with a singular architectural mandate: **find your safe green window, get you outside safely, and then get out of your way.**

### Key Capabilities
- **Deterministic Green Window Scoring (0–100):** Evaluates real-time Open-Meteo hourly telemetry across US AQI, PM2.5, heat index, UV radiation, precipitation probability, and sunset times to pinpoint the safest outdoor window.
- **Prior Labs TabPFN In-Context Uncertainty Forecasting:** Integrates the TabPFN tabular foundation model to deliver 24–72h quantile intervals ($p_{10}, p_{50}, p_{90}$) and anomaly detection, with fallback strictly labeled `"baseline (not TabPFN)"`.
- **Unified Live Web Search (SerpApi & Serper):** Surfaces screen-minimizing park closures, gate maintenance, and official alerts in at most **one concise spoken line** with prompt-injection defense.
- **Immutable Code Guardrails:** Hard mathematical checks that Google's open-weight **Gemma** model cannot override. If AQI > 150, effort is locked to gentle; if AQI > 200, outdoor cardio is barred, and N95 mask / postpone guidance is enforced.
- **Spoken Audio Walk in Your Pocket:** A zero-cost, multi-tier TTS chain (**Gemini 3.8 Flash TTS** reusing the same key as Gemma, open-weight **Meta MMS-TTS**, and client **Web Speech API**) delivering mindful walk segments. Pair with lock-screen **Media Session API** controls and an **OLED pitch-black Pocket Mode**.
- **Global & Multilingual Support:** 8 languages (English, Bengali, Hindi, Spanish, Arabic with full RTL layout, French, Portuguese, Indonesian), unit conversions (°C/°F, km/mi), and 8 bundled offline city packs.
- **Screen-vs-Outside Meter & Canvas Receipt:** Uses the **Page Visibility API** to track foreground screen seconds against total walk duration, generating a downloadable tactile share card.
- **On-Device Nature Journal:** Photo and note observations stored locally in browser **IndexedDB**; photos are never uploaded or retained on remote servers.

### Field Test: Taking Sobuj Ghonta Outside

I took Sobuj Ghonta out for a late-afternoon field run at Ramna Park to test whether the audio cues and the ScreenMeter metric could keep my phone in my pocket. At 4:30 PM, Shahbagh traffic was at peak gridlock, but the app identified an environmental window between 4:45 PM and 5:20 PM where the canopy temperature dropped to 29°C before the typical Dhaka post-sunset particulate spike trapped dust and exhaust at ground level. I plugged in my earphones, started the session, and walked the inner loop.

- **Where I went:** Ramna Park, Dhaka (starting from the Arunodoy gate, looping clockwise past the central lake, and cutting toward the tennis complex).

- **AQI that day:** US AQI 162 (Unhealthy), with high PM2.5 readings across the city, though the afternoon wind cleared a short dip before evening stagnation set in.

- **What the plan got right:** It routed me away from the perimeter paved road toward the dirt path under the rain tree canopy, where radiant heat was noticeably lower. It also accurately flagged a mosquito warning for the lake perimeter starting at 5:10 PM, which hit almost right on cue as twilight settled.

- **What it got wrong:** The Overpass query routed me through a footpath near the park nursery that was padlocked for ground maintenance. The voice prompt repeatedly told me to turn left into a closed iron gate until I walked far enough past the boundary for the waypoint to clear.

- **How long I looked at the screen:** ScreenMeter logged 52 seconds of active screen time across a 34-minute walk (a 2.5% screen-to-walk ratio). I only took the phone out twice: once to check the detour around the locked gate, and once at the end to save an entry in the Nature Journal.

*(Field Test Authenticity Note: The walk above represents my authentic in-person field test at Ramna Park in Dhaka. While the core guided walk, guardrails, and ScreenMeter have been field-tested outdoors, the newly added V2 features—TabPFN uncertainty intervals, live search heads-up, and the 7 non-Dhaka global city packs—were evaluated through empirical backtesting on real historical telemetry and comprehensive automated contract suites, rather than in-person field walks in those respective cities).*

---

## Demo

- **Live Deployment on Render:** [https://sobujghonta.onrender.com/](https://sobujghonta.onrender.com/) *(or deploy your own instance via the included Blueprint)*
- **Zero-Key Instant Demo:** Tap **"Demo (Offline)"** in the top navigation bar or select any of the 8 City Packs (Dhaka, Delhi, London, Los Angeles, Nairobi, São Paulo, Sydney, Tokyo). It runs entirely on bundled, authentic telemetry and pre-generated audio clips with **0 ms external network latency** and **zero API keys required**, allowing judges to test every feature instantly.

![Sobuj Ghonta Mobile Interface](https://raw.githubusercontent.com/SayemR0018/sobujGhonta/main/docs/screenshot.png)

---

## Code

{% embed https://github.com/SayemR0018/sobujGhonta %}

- **License:** Permissive **MIT License** (Open Source)
- **Repository Structure:** Express production server and Vite React PWA client.
- **Automated Verification:** 79 unit and contract tests across 12 suites (`npm test`), 390 end-to-end integration tests across 78 suites (`npm run test:e2e`), 16 production integration checks (`scripts/fullQaRunner.mjs`), 9 deployment smoke tests (`scripts/smoke.mjs`), and an empirical 48-hour TabPFN backtest (`scripts/backtest.mjs`).

---

## How I Built It

### 1. Deterministic Green Window Scoring Engine
Rather than delegating environmental safety decisions to probabilistic LLM hallucinations, Sobuj Ghonta calculates an objective 0–100 hourly score in deterministic JavaScript (`server/services/scoring.js`):

```javascript
// Heuristic scoring: base 100 with environmental penalties and golden-hour bonus
if (aqi > 200) aqiPenalty = 60 + (aqi - 200) * 0.25;
if (apparentTemp > 38) heatPenalty = 35 + (apparentTemp - 38) * 5;
if (isThunder) rainPenalty = 55;
if (!isDaylight) darknessPenalty = 25;
if (isGoldenHour && aqi <= 150 && rainPenalty <= 10) goldenHourBonus = +12;
```

### 2. Immutable Code Guardrails That Gemma Cannot Override
Public health recommendations cannot tolerate hallucinations. In `server/services/guardrails.js`, strict rules validate and sanitize Gemma's structured JSON output:

```javascript
export function validateAndCorrectPlan(plan, guardrails, language = 'en') {
  const corrected = { ...plan };
  // If AQI exceeds hazardous thresholds, override effort level
  if (guardrails.flags.hazardousAqi) {
    corrected.effort_level = 'rest';
  } else if (guardrails.flags.unhealthyAqi && corrected.effort_level === 'strenuous') {
    corrected.effort_level = 'gentle';
  }
  // Guarantee mandatory medical disclaimer and mosquito alerts
  return corrected;
}
```

### 3. Prior Labs TabPFN Tabular Foundation Model & Empirical Backtesting
To forecast environmental safety with rigorous uncertainty bounds, we integrated Prior Labs' TabPFN tabular foundation model (`ml/services/tabpfn_engine.py` and `server/services/mlClient.js`):
- **Quantile Forecasting:** Predicts hourly distributions $[p_{10}, p_{50}, p_{90}]$ for US AQI, PM2.5, apparent temperature, and UV using Prior Labs syntax (`output_type='quantiles'`, `quantiles=[0.1, 0.5, 0.9]`).
- **Anomaly Detection:** Flags statistical residual spikes against local 7-day hourly distributions to detect unseasonal smoke or heat surges.
- **Tri-State Fallback Parity:** If the Python ML sidecar is offline or constrained by memory caps on Render's 512MB free tier, `mlClient.js` gracefully degrades to a deterministic baseline explicitly labeled `"baseline (not TabPFN)"`.
- **Honest Backtest Findings (`docs/TABPFN_EVAL.md`):** We backtested on 48 held-out future hours across 168 hours of real Open-Meteo observations for Dhaka, Delhi, and London.
  * *Where TabPFN won:* On apparent temperature in Dhaka, TabPFN slashed Mean Absolute Error (MAE) from 2.62°C (persistence) down to **1.33°C**, achieving 72.9% empirical coverage for the nominal 80% interval.
  * *Honest Negative Results:* On US AQI in Delhi, strong persistence during stagnant weather yielded lower short-horizon MAE (11.19) than TabPFN's general diurnal model (21.16). In London, seasonal-naive baselines struggled (MAE 24.42) while TabPFN delivered superior AQI bounds (MAE 18.49). All numbers are documented honestly without cherry-picking.

### 4. Unified Live Web Search Adapter (SerpApi & Serper)
To address the exact failure discovered during my Ramna Park walk (a padlocked gate unknown to static OSM data), we built a unified live search engine (`server/services/search/index.js`):
- **Screen-Minimizing Delivery:** Search output is filtered and distilled to **at most ONE concise line** in the UI and spoken audio.
- **Three Core Streams:** Park closures and gate issues, nearby community nature walks/birding, and official government air quality or heat advisories.
- **Prompt Injection Defense (`server/services/search/normalizer.js`):** Web search snippets are untrusted. We strip HTML tags, cap snippets at 200 characters, neutralize pseudo-URLs (`javascript:`, `data:`), and enforce prompt boundaries so instructions inside snippets can never override deterministic safety guardrails.
- **Privacy Design:** Latitude and longitude are rounded to 2 decimal places (~1.1 km) before generating cache keys, preventing user location tracking.

### 5. Zero-Cost Free TTS Provider Chain
When building audio walk narration, commercial paid TTS services created an unnecessary cost barrier. We designed an automated fallback chain in `server/services/tts/index.js`:
1. **Gemini 3.8 Flash TTS (`gemini-3.8-flash-tts`):** Reuses the user's existing Google AI Studio key (`GEMMA_API_KEY`). Generates 24 kHz studio-quality audio in English and Bengali (`bn-BD`). When encountering Google's free-tier 3 RPM quota limit, it handles backoff automatically.
2. **Meta MMS-TTS (`facebook/mms-tts-ben` & `eng`):** Open-weight multilingual speech models running on Hugging Face Serverless Inference behind an optional `HF_TOKEN`.
3. **Client Web Speech API:** Client-side zero-cloud fallback with automated Bengali voice detection.
4. **Bundled Dhaka Audio:** 8 pre-generated audio clips committed into the repository and pre-cached by Service Worker v2, guaranteeing that judges and users can experience high-fidelity voice guidance with zero latency and zero keys.

### 6. Tactile UI Redesign, Pocket Mode & Share Card
- **Information Architecture:** Rebuilt into 6 focused views: Home, Timeline (inline SVG band chart with TabPFN quantile bands), Places (list/radar toggle), Walk Mode (Pocket Mode), Journal, and Settings.
- **Three Tactile Themes:** Light, Dark, and an OLED Pure Black (`#000000`) theme that shuts off OLED pixels during pocket walks to maximize battery life.
- **Canvas Walk Receipt:** When a walk concludes, `WalkReceiptModal.jsx` draws a crisp graphic card via HTML5 Canvas highlighting total outdoor minutes, green score, and screen percentage (e.g., "Screen 2.5% of 34-min walk") ready for sharing.

### 7. Three Zero-Leak Secret Paths & Production Hardening
- **Terminal CLI:** `npm run setup:keys` prompts with masked input (`*`) and writes `.env` with `0600` permissions.
- **In-App Keys Panel:** Password inputs in Settings with format validation and ephemeral `sessionStorage` default.
- **Automated Redacting Logger:** `server/services/logger.js` automatically sanitizes API keys and tokens from server output.
- **Render Blueprint:** Configured via [`render.yaml`](https://github.com/SayemR0018/sobujGhonta/blob/main/render.yaml) with reverse proxy trust, Helmet CSP, gzip/brotli compression, Node `20.18.0` pinning, and decoupled `/health`.

---

## Why Does Open Innovation Matter?

Building Sobuj Ghonta around open-weight models, open data, and open web standards demonstrated four clear advantages over closed proprietary ecosystems:

1. **Model Swappability & Offline Sovereignty:**
   A closed AI application is forever tethered to remote billing, latency, and vendor terms. Sobuj Ghonta's open architecture allows anyone to run `LLM_PROVIDER=ollama` with `gemma2:9b` on a consumer laptop. The entire loop — weather scoring, green space navigation, and AI walk generation — runs 100% offline with **zero API toll**.

2. **Data Sovereignty & Location Privacy:**
   Personal location coordinates, walking routines, and photos of nature are deeply private. By relying on public open data (Open-Meteo and OpenStreetMap), rounding coordinates to 2 decimals, and storing journal entries exclusively in on-device **IndexedDB**, the user's physical presence is never tracked, monetized, or sold into advertising profiles.

3. **Where Open Beat Closed (Deterministic Safety):**
   Commercial closed chat APIs tend to produce verbose, conversational essays that encourage prolonged screen interaction. By constraining open-weight Gemma with deterministic heuristic code guardrails, we produced terse, safety-verified walk scripts under 60 words that tell the user to put their phone away.

4. **Cultural & Linguistic Inclusion:**
   Open-weight models and open web standards allowed us to deliver first-class localization across 8 languages, including native Bengali typography (`Noto Sans Bengali`) and full right-to-left layout for Arabic (`[dir="rtl"]`), serving communities that are routinely overlooked by Western-centric wellness applications.

---

## My Agent Session

This project was architected, implemented, and verified collaboratively using **Google Antigravity** (`gemini_cli`). Real agent session transcripts were curated, sanitized of secrets, and saved through **DevRelay**:

### Session 1: Initial Architecture & Free TTS Chain
{% agent_session sobuj-ghonta-architecture-free-tts-chain-full-qa-render-deployment-with-antigravity-d7vlbw %}
*(Direct Link: [https://dev.to/agent_sessions/sobuj-ghonta-architecture-free-tts-chain-full-qa-render-deployment-with-antigravity-d7vlbw](https://dev.to/agent_sessions/sobuj-ghonta-architecture-free-tts-chain-full-qa-render-deployment-with-antigravity-d7vlbw))*

### Session 2: TabPFN Integration, Live Search Adapter, Global i18n & Production Verification
{% agent_session sobuj-ghonta-v2-tabpfn-live-search-global-i18n-production-verification-with-antigravity-czgkve %}
*(Direct Link: [https://dev.to/agent_sessions/sobuj-ghonta-v2-tabpfn-live-search-global-i18n-production-verification-with-antigravity-czgkve](https://dev.to/agent_sessions/sobuj-ghonta-v2-tabpfn-live-search-global-i18n-production-verification-with-antigravity-czgkve))*

---

## Prize Categories

### Featured Categories
- **Best Use of Gemma ($200):** Google's open-weight Gemma model serves as the core reasoning engine, generating mindful walking scripts, sensory missions, and multimodal photo observations strictly constrained by deterministic safety rules. Supports both Google AI Studio API (`gemma-4-26b-a4b-it`) and fully offline local **Ollama** runtimes (`gemma2:9b`).
- **Best Use of Render ($200):** Configured and deploy-ready on Render using a declarative Blueprint ([`render.yaml`](https://github.com/SayemR0018/sobujGhonta/blob/main/render.yaml)) that provisions a unified Node.js web service serving the Express API, static PWA client, `/health` monitoring, compression, and memory-safe fallbacks for the 512MB free tier.
- **Best Use of TabPFN ($200):** Prior Labs TabPFN tabular foundation model provides in-context quantile uncertainty forecasting ($p_{10}, p_{50}, p_{90}$) for air quality and heat, local anomaly detection, and on-device Personal Green Hour logs with CSV import/export. Supported by empirical backtest evaluation on real Open-Meteo observations across 3 cities (`docs/TABPFN_EVAL.md`).
- **Best Use of SerpApi ($200):** Unified live search adapter integrates SerpApi with prompt-injection defense, 45-minute caching, coordinate privacy (2 decimals), and screen-minimizing single-sentence delivery to alert walkers about real-time park closures, walkway maintenance, and official environmental advisories.

### Overall Prize
- **Hacktoberfest Week 1: Touch Grass ($250):** A comprehensive, culturally resonant outdoor companion tailored for high-density cities, built entirely on open-source AI and open data, mathematically proven to keep screen time minimal.
