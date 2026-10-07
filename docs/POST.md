---
title: "Sobuj Ghonta (সবুজ ঘণ্টা) — The Green Hour: Screen-Minimizing Urban Nature Companion"
published: false
description: "An ambient, screen-minimizing outdoor companion that finds safe urban green windows, scores environmental health deterministically, and puts your phone in your pocket with Gemma, free TTS, and Render."
tags: devchallenge, hf26challenge, opensource, ai
cover_image: https://raw.githubusercontent.com/SayemR0018/sobujGhonta/main/docs/cover.png
---

*This is a submission for the [Hacktoberfest Open-Source AI Challenge Week 1: Touch Grass](https://dev.to/challenges/hacktoberfest-week1-2026-10-05)*

---

## What I Built

Four billion people live in dense metropolitan cities. When hackathons announce themes like **"Touch Grass"**, the tacit assumption is that you live a short drive from pristine mountain trails or manicured suburban nature reserves.

For those of us living in megacities like Dhaka, that is not reality. Our outdoors is an unforgiving landscape of sun-baked concrete, flyovers, gridlocked traffic, and isolated municipal parks like Ramna Park, Suhrawardy Udyan, or Dhanmondi Lake.

Stepping outside in dense tropical cities comes with genuine environmental hazards:
1. **Severe Air Pollution:** US AQI frequently spikes above 150 (Unhealthy) or 200 (Very Unhealthy), turning strenuous cardiovascular exercise into a pulmonary health risk.
2. **Urban Heat Islands:** Apparent temperatures routinely exceed 38°C midday, elevating heat-stroke risks.
3. **Monsoon Humidity & Vector Risks:** Warm stagnant water and post-rain humidity (>70%) create high-risk environments for dengue and mosquito-borne illnesses.

Worse yet, existing outdoor navigation and fitness apps create a glaring paradox: **to navigate nature, they demand that you stay glued to a glowing glass screen.**

I built **Sobuj Ghonta (সবুজ ঘণ্টা — "The Green Hour")** to solve this. It is an ambient, mobile-first, bilingual (Bangla + English) Progressive Web App designed with a singular architectural mandate: **find your safe green window, get you outside safely, and then get out of your way.**

### Key Capabilities
- **Deterministic Green Window Scoring (0–100):** Evaluates real-time Open-Meteo hourly telemetry across US AQI, PM2.5, heat index, UV radiation, precipitation probability, and sunset times to pinpoint the safest outdoor window.
- **Hyper-Local Green Space Discovery:** Identifies parks, gardens, and lakesides within ~3 km using OpenStreetMap Overpass with Haversine walking time estimates.
- **Immutable Code Guardrails:** Hard mathematical checks that Google's open-weight **Gemma** model cannot override. If AQI > 150, effort is locked to gentle; if AQI > 200, outdoor cardio is barred, and N95 mask / postpone guidance is enforced.
- **Spoken Audio Walk in Your Pocket:** A zero-cost, multi-tier TTS chain (**Gemini 3.8 Flash TTS** reusing the same key as Gemma, open-weight **Meta MMS-TTS**, and client **Web Speech API**) delivering mindful walk segments. Pair with lock-screen **Media Session API** controls and an OLED pitch-black Pocket Mode.
- **Zero-Signal Trail Resilience:** "Download Walk for Trail" pre-caches audio clips into **Cache Storage** and **IndexedDB** so your guided walk plays flawlessly with zero cellular signal inside deep park groves.
- **Screen-vs-Outside Meter:** Uses the **Page Visibility API** to track foreground screen seconds against total walk duration, proving mathematically that looking at the screen was the shortest part of your outdoor experience.
- **On-Device Nature Journal:** Photo and note observations stored locally in browser **IndexedDB**; photos are never uploaded or retained on remote servers.

### Field Test: Taking Sobuj Ghonta Outside

> *The judging rubric values taking the project outside and sharing authentic observations.*

<!-- SAYEM: Paste your real walk notes below. Fill out the 5 prompts with your genuine experience. -->
[SAYEM: write your real walk here]
- **Where I went:** [e.g. Ramna Park / Dhanmondi Lake, Dhaka]
- **AQI that day:** [e.g. US AQI 168, Unhealthy]
- **What the plan got right:** [e.g. Noticed the golden hour window between 16:45 and 17:30 when ambient heat dropped; correctly flagged mosquito risks near lake bushes]
- **What it got wrong:** [e.g. Overpass showed a side gate that was locked for construction]
- **How long I looked at the screen:** [e.g. ScreenMeter logged 48 seconds of screen time over a 32-minute walk — 2.5% ratio]
<!-- END SAYEM FIELD TEST -->

---

## Demo

- **Live Deployment on Render:** [https://sobuj-ghonta.onrender.com](https://sobuj-ghonta.onrender.com) *(or connect your own instance via the included Blueprint)*
- **Zero-Key Instant Dhaka Demo:** Tap **"Demo: Dhaka (Offline)"** in the top navigation bar. It runs entirely on bundled, authentic Dhaka telemetry and pre-generated audio clips with **0 ms external network latency** and **zero API keys required**, allowing judges to test every feature instantly.

![Sobuj Ghonta Mobile Interface](https://raw.githubusercontent.com/SayemR0018/sobujGhonta/main/docs/screenshot.png)

---

## Code

{% embed https://github.com/SayemR0018/sobujGhonta %}

- **License:** Permissive **MIT License** (Open Source)
- **Repository Structure:** Single clean repository with an Express production server and a Vite React PWA client.
- **Automated Tests:** 27 unit tests across 4 test suites (`npm test`), 16 production integration checks (`scripts/fullQaRunner.mjs`), and 8 deployment smoke tests (`scripts/smoke.mjs`).

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
  ...
  return corrected;
}
```

### 3. Open-Source LLM Adapter Pattern (`gemma_api` ↔ `ollama`)
In `server/services/llm/adapter.js`, an adapter pattern supports both cloud inference via Google AI Studio (`gemma-4-26b-a4b-it`) and 100% offline edge execution via local **Ollama** (`gemma2:9b`). System constraints are injected directly into the user turn to honor Gemma's prompt contract, and outputs are sanitized defensively with automated markdown fence stripping and regex fallbacks.

### 4. Zero-Cost Free TTS Provider Chain
When building audio walk narration, commercial paid TTS services created an unnecessary cost barrier. We designed an automated fallback chain in `server/services/tts/index.js`:
1. **Gemini 3.8 Flash TTS (`gemini-3.8-flash-tts`):** Reuses the user's existing Google AI Studio key (`GEMMA_API_KEY`). Generates 24 kHz studio-quality audio in English and Bengali (`bn-BD`). When encountering Google's free-tier 3 RPM quota limit, it handles backoff automatically.
2. **Meta MMS-TTS (`facebook/mms-tts-ben` & `eng`):** Open-weight multilingual speech models running on Hugging Face Serverless Inference behind an optional `HF_TOKEN`.
3. **Client Web Speech API:** Client-side zero-cloud fallback with automated Bengali voice detection.
4. **Bundled Dhaka Audio:** 8 pre-generated audio clips committed into the repository and pre-cached by Service Worker v2, guaranteeing that judges and users can experience high-fidelity voice guidance with zero latency and zero keys.

### 5. Production Hardening on Render
The application is deployed to Render using a declarative Blueprint ([`render.yaml`](https://github.com/SayemR0018/sobujGhonta/blob/main/render.yaml)):
- Reverse proxy trust configured (`app.set('trust proxy', 1)`) so sliding-window rate limiting works accurately.
- HTTP security headers enforced via **Helmet** with a tailored Content Security Policy allowing OSM map tiles and audio streams.
- HTTP compression (gzip/brotli) enabled.
- Node version pinned to `20.18.0` in `.node-version` and `package.json`.
- Health check route `/health` verified without external API dependencies.

---

## Why Does Open Innovation Matter?

Building Sobuj Ghonta around open-weight models, open data, and open web standards demonstrated four clear advantages over closed proprietary ecosystems:

1. **Model Swappability & Offline Sovereignty:**
   A closed AI application is forever tethered to remote billing, latency, and vendor terms. Sobuj Ghonta's open architecture allows anyone to run `LLM_PROVIDER=ollama` with `gemma2:9b` on a consumer laptop. The entire loop — weather scoring, green space navigation, and AI walk generation — runs 100% offline with **zero API toll**.

2. **Data Sovereignty & Location Privacy:**
   Personal location coordinates, walking routines, and photos of nature are deeply private. By relying on public open data (Open-Meteo and OpenStreetMap) and storing journal entries exclusively in on-device **IndexedDB**, the user's physical presence is never tracked, monetized, or sold into advertising profiles.

3. **Where Open Beat Closed (Heuristic Guardrails):**
   Commercial closed chat APIs tend to produce verbose, conversational essays that encourage prolonged screen interaction. By constraining open-weight Gemma with deterministic heuristic code guardrails, we produced terse, safety-verified walk scripts under 60 words that tell the user to put their phone away.

4. **Cultural & Linguistic Inclusion:**
   Open-weight models and open web standards allowed us to deliver first-class Bengali localization with native typography (`Hind Siliguri`), serving communities in South Asia that are routinely overlooked by Western-centric wellness applications.

---

## My Agent Session

This project was architected, implemented, and verified using **Google Antigravity** (`gemini_cli`). Real agent session transcripts were curated, sanitized of secrets, and saved through **DevRelay**:

{% agent_session sobuj-ghonta-building-the-green-hour-with-antigravity-rhqt4o %}

*(Direct Session Link: [https://dev.to/agent_sessions/sobuj-ghonta-building-the-green-hour-with-antigravity-rhqt4o](https://dev.to/agent_sessions/sobuj-ghonta-building-the-green-hour-with-antigravity-rhqt4o))*

---

## Prize Categories

### Featured Categories
- **Best Use of Gemma ($200):** Google's open-weight Gemma model serves as the core reasoning engine, generating mindful walking scripts, sensory missions, and multimodal photo observations strictly constrained by deterministic safety rules. Supports both Google AI Studio API (`gemma-4-26b-a4b-it`) and fully offline local **Ollama** runtimes (`gemma2:9b`).
- **Best Use of Render ($200):** Configured and deploy-ready on Render using a declarative Blueprint ([`render.yaml`](https://github.com/SayemR0018/sobujGhonta/blob/main/render.yaml)) that provisions a unified Node.js web service serving the Express API, static PWA client, `/health` monitoring, and compression.

### Overall Prize
- **Hacktoberfest Week 1: Touch Grass ($250):** A comprehensive, culturally resonant outdoor companion tailored for high-density cities, built entirely on open-source AI and open data, mathematically proven to keep screen time minimal.
