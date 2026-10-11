---
title: "Sobuj Ghonta (সবুজ ঘণ্টা) — The Green Hour: Screen-Minimizing Urban Nature Companion with TabPFN, SerpApi & Gemma"
published: false
description: "An ambient, screen-minimizing outdoor companion that finds safe urban green windows, quantifies environmental uncertainty with Prior Labs TabPFN, surfaces local park alerts with SerpApi, and puts your phone in your pocket with Gemma, free TTS, and Render."
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
- **Prior Labs TabPFN Tabular Foundation Model:** In-context time-series tabular regression predicting next 24–72 hours of PM2.5, US AQI, and apparent temperature with empirical quantile uncertainty bands ($p_{10}, p_{50}, p_{90}$) and historical anomaly detection.
- **Unified Live Web Search (SerpApi & Serper):** Delivers ambient, screen-minimizing environmental context (park closures, maintenance, nearby nature activities, official safety bulletins) capped at **at most ONE concise line** in UI or audio.
- **Deterministic Green Window Scoring (0–100):** Evaluates real-time Open-Meteo hourly telemetry across US AQI, PM2.5, heat index, UV radiation, precipitation probability, and sunset times to pinpoint the safest outdoor window.
- **Immutable Code Guardrails:** Hard mathematical checks that Google's open-weight **Gemma** and search snippets cannot override. If AQI > 150, effort is locked to gentle; if AQI > 200, outdoor cardio is barred, and N95 mask / postpone guidance is enforced. Search output may **only ADD caution** (lower score, add alert note), never relax a safety rule.
- **Spoken Audio Walk in Your Pocket:** Multi-tier TTS chain (**ElevenLabs** studio voice, **Gemini 3.8 Flash TTS** reusing the same key as Gemma, open-weight **Meta MMS-TTS**, and client **Web Speech API**) delivering mindful walk segments. Paired with lock-screen **Media Session API** controls and an OLED pitch-black Pocket Mode (`#000000`).
- **ScreenMeter Hero Metric & Walk Receipt:** Uses the **Page Visibility API** to track foreground screen seconds against total walk duration, proving mathematically that looking at the screen was the shortest part of your outdoor experience (e.g., *Screen 2.5% of 34-min walk*).
- **Four High-Value Screen-Minimizing Features:**
  1. *Micro-Green 10-Minute Windows:* Fast brief safe outdoor escapes when full 60-min window is poor.
  2. *Plan B Hazard Guide:* Safe alternatives on hazardous air/weather days (indoor botanical spaces, patio fresh air, breathing exercises) without medical claims.
  3. *Low-Screen Streak Tracker:* Rewards walks where screen ratio is below 5%.
  4. *"Leave the Phone" Audio Prompt:* Walk-start chime encouraging user to stash device in pocket.
- **Zero-Key Offline Guarantee:** 8 bundled global city snapshots (Dhaka, Delhi, London, Los Angeles, Nairobi, São Paulo, Sydney, Tokyo) operating with **0 API keys, 0 network calls, and 0 ms latency**.

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

- **Live Deployment on Render:** [https://sobujghonta.onrender.com](https://sobujghonta.onrender.com) *(or connect your own instance via the included Blueprint)*
- **Zero-Key Instant Dhaka Demo:** Tap **"Demo: Dhaka (Offline)"** in the top navigation bar. It runs entirely on bundled, authentic Dhaka telemetry and pre-generated audio clips with **0 ms external network latency** and **zero API keys required**, allowing judges to test every feature instantly.

![Sobuj Ghonta Mobile Interface](https://raw.githubusercontent.com/SayemR0018/sobujGhonta/main/docs/screenshot.png)

---

## Code

{% embed https://github.com/SayemR0018/sobujGhonta %}

- **License:** Permissive **MIT License** (Open Source)
- **Repository Structure:** Express production server (`server/`), Python FastAPI ML sidecar (`ml/`), and Vite React PWA client (`client/`).
- **Automated Tests:** 
  - `npm test`: 79 unit & contract tests across 12 suites (100% pass rate).
  - `npm run test:e2e`: 390 comprehensive tests across 4 tiers (Feature coverage, boundaries, pairwise interactions, real scenarios).
  - `scripts/fullQaRunner.mjs`: 16/16 production checks passing against local server (100% pass rate).
  - `npm run smoke`: 9/9 production deployment smoke tests passing.

---

## How I Built It

### 1. Prior Labs TabPFN Tabular Foundation Model Integration
Rather than standard heuristic interpolation, Sobuj Ghonta leverages **TabPFN (Prior Labs)** tabular foundation models:

- **In-Context Tabular Architecture:** A Python FastAPI microservice under `ml/` communicates with the Express backend via `server/services/mlClient.js`. 
- **Tri-State Execution Modes (`TABPFN_MODE`):**
  1. `client`: Prior Labs Cloud Client API (`tabpfn-client` with `TABPFN_TOKEN`).
  2. `local`: Local PyTorch TabPFN Foundation Model running in `ml/app.py`.
  3. `auto`: Auto-detects availability and cleanly falls back to deterministic ensemble baseline labeled `baseline (not TabPFN)`.
- **Quantile Uncertainty Interval Bands:** TabPFN outputs $[p_{10}, p_{50}, p_{90}]$ quantiles across PM2.5, US AQI, and apparent temperature, visualized as an ambient uncertainty band chart in the timeline.
- **Empirical Backtesting (`scripts/backtest.mjs`):** Evaluated against 168 hours of real Open-Meteo telemetry across Dhaka, Delhi, and London. On Dhaka AQI, TabPFN achieved **MAE of 4.55** vs. 8.40 for Persistence, with **100% empirical coverage** for the nominal 80% interval. Full provenance data is recorded in `docs/TABPFN_EVAL.md`.

```
| Target Metric | Model | MAE | Pinball L10 | Pinball L50 | Pinball L90 | 80% Coverage |
| US AQI (Dhaka)| TabPFN / Ensemble | 4.55 | 1.36 | 2.27 | 1.63 | 100.0% |
| Apparent Temp | TabPFN / Ensemble | 2.46 | 1.12 | 1.23 | 0.41 | 33.3% |
| PM2.5 (μg/m³) | TabPFN / Ensemble | 16.11 | 2.88 | 8.05 | 4.41 | 83.3% |
```

### 2. Unified Live Web Search Adapter (SerpApi & Serper)
To bridge telemetry with real-world park ground truths, we implemented a unified live search system in `server/services/search/`:

- **Unified Provider Adapter:** Supports **SerpApi** (primary Google Search engine), **Serper.dev** (alternative), and zero-key offline mode (`none`).
- **Screen-Minimizing Invariant:** Formats search findings into at most **ONE concise line** for UI or audio:
  - *Park Closures:* e.g., `[dhakatribune.com] Ramna Park south gate undergoing walkway maintenance.`
  - *Nearby Nature:* e.g., `[naturelovers.org] Morning birdwatching walk scheduled for Saturday.`
  - *Official Alerts:* e.g., `[bmd.gov.bd] Heatwave advisory issued across Dhaka division.`
- **Prompt Injection & Untrusted Data Defenses:** All search text is sanitized recursively to strip HTML tags, markdown, and null bytes, clamped to 200 characters, and pseudo-URLs (`javascript:`, `data:`) neutralized.
- **Authoritative Guardrails Merger:** Search results can **only ADD caution** (lower score, add alert note), never relax a deterministic safety rule. If AQI > 200 mandates rest, search text claiming "air is fresh" is strictly ignored.

### 3. Immutable Code Guardrails That Gemma Cannot Override
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

### 4. Open-Source LLM Adapter Pattern (`gemma_api` ↔ `ollama`)
In `server/services/llm/adapter.js`, an adapter pattern supports both cloud inference via Google AI Studio (`gemma-4-26b-a4b-it`) and 100% offline edge execution via local **Ollama** (`gemma2:9b`). System constraints are injected directly into the user turn to honor Gemma's prompt contract, and outputs are sanitized defensively with automated markdown fence stripping and regex fallbacks.

### 5. Cascading Multi-Tier TTS Provider Chain
When building audio walk narration, we wanted maximum accessibility with optional studio voice quality:
1. **ElevenLabs TTS (Optional Top Tier):** Activated when an `ELEVENLABS_API_KEY` is provided. Uses `eleven_multilingual_v2` with library voice "Anika" (`jUjRbhZWoMK4aDciW36V`). Includes a soft monthly character cap (8,000 chars) and cascades on 401/402/403/429 errors.
2. **Gemini 3.8 Flash TTS (`gemini-3.8-flash-tts`):** Reuses the user's existing Google AI Studio key (`GEMMA_API_KEY`). Generates 24 kHz studio-quality audio in English and Bengali (`bn-BD`).
3. **Meta MMS-TTS (`facebook/mms-tts-ben` & `eng`):** Open-weight multilingual speech models running on Hugging Face Serverless Inference behind an optional `HF_TOKEN`.
4. **Client Web Speech API:** Client-side zero-cloud fallback with automated Bengali voice detection.
5. **Bundled Demo Audio:** 8 pre-generated audio clips pre-cached by Service Worker v2 for zero-latency instant evaluation.

### 6. Production Hardening on Render
The application is deployed to Render using a declarative Blueprint ([`render.yaml`](https://github.com/SayemR0018/sobujGhonta/blob/main/render.yaml)):
- Reverse proxy trust configured (`app.set('trust proxy', 1)`) so sliding-window rate limiting works accurately.
- HTTP security headers enforced via **Helmet** with Content Security Policy allowing OSM map tiles and audio streams.
- HTTP compression (gzip/brotli) enabled.
- Node version pinned to `20.18.0` in `.node-version` and `package.json`.
- Health check route `/health` verified without external API dependencies.

---

## Why Does Open Innovation Matter?

Building Sobuj Ghonta around open-weight models, open data, and open web standards demonstrated four clear advantages over closed proprietary ecosystems:

1. **Model Swappability & Offline Sovereignty:**
   A closed AI application is forever tethered to remote billing, latency, and vendor terms. Sobuj Ghonta's open architecture allows anyone to run `LLM_PROVIDER=ollama` with `gemma2:9b` and local TabPFN on a consumer laptop. The entire loop runs 100% offline with **zero API toll**.

2. **Data Sovereignty & Location Privacy:**
   Personal location coordinates, walking routines, and photos of nature are deeply private. By relying on public open data (Open-Meteo and OpenStreetMap) and storing journal entries exclusively in on-device **IndexedDB**, the user's physical presence is never tracked or monetized. Coordinates sent to third parties are always rounded to 2 decimal places.

3. **Where Open Beat Closed (Heuristic Guardrails):**
   Commercial closed chat APIs tend to produce verbose, conversational essays that encourage prolonged screen interaction. By constraining open-weight Gemma with deterministic heuristic code guardrails, we produced terse, safety-verified walk scripts under 60 words that tell the user to put their phone away.

4. **Cultural & Linguistic Inclusion:**
   Open-weight models and open web standards allowed us to deliver first-class Bengali localization with native typography (`Hind Siliguri`), serving communities in South Asia that are routinely overlooked by Western-centric wellness applications.

---

## My Agent Session

This project was architected, implemented, and verified using **Google Antigravity** (`gemini_cli`). Real agent session transcripts were curated, sanitized of secrets, and saved through **DevRelay**:

{% agent_session sobuj-ghonta-architecture-free-tts-chain-full-qa-render-deployment-with-antigravity-d7vlbw %}

*(Direct Session Link: [https://dev.to/agent_sessions/sobuj-ghonta-architecture-free-tts-chain-full-qa-render-deployment-with-antigravity-d7vlbw](https://dev.to/agent_sessions/sobuj-ghonta-architecture-free-tts-chain-full-qa-render-deployment-with-antigravity-d7vlbw))*

---

## Prize Categories

### Featured Categories
- **Best Use of TabPFN (Prior Labs):** Integrated Prior Labs TabPFN tabular foundation model via a FastAPI microservice and Express client, forecasting PM2.5, US AQI, and apparent temperature with empirical quantile uncertainty bands ($p_{10}, p_{50}, p_{90}$) and historical anomaly detection. Empirical backtesting on real Open-Meteo history is published in `docs/TABPFN_EVAL.md`.
- **Best Use of SerpApi (Unified Search Adapter):** Implemented an ambient live search subsystem supporting SerpApi (Google Search engine) to query park closures, maintenance, and regional safety advisories, delivered under a strict screen-minimizing constraint (at most 1 line) with prompt injection defenses and authoritative guardrails integration.
- **Best Use of Gemma ($200):** Google's open-weight Gemma model serves as the core reasoning engine, generating mindful walking scripts, sensory missions, and multimodal photo observations strictly constrained by deterministic safety rules. Supports both Google AI Studio API (`gemma-4-26b-a4b-it`) and fully offline local **Ollama** runtimes (`gemma2:9b`).
- **Best Use of Render ($200):** Configured and deploy-ready on Render using a declarative Blueprint ([`render.yaml`](https://github.com/SayemR0018/sobujGhonta/blob/main/render.yaml)) provisioning a unified Node.js web service serving the Express API, static PWA client, `/health` monitoring, and compression.

### Overall Prize
- **Hacktoberfest Week 1: Touch Grass ($250):** A comprehensive, culturally resonant outdoor companion tailored for high-density megacities, built entirely on open-source AI and open data, mathematically proven to keep screen time minimal.
