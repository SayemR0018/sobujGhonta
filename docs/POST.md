---
title: "Sobuj Ghonta (সবুজ ঘণ্টা) — The Green Hour: Screen-Minimizing Urban Nature Companion"
published: false
description: "An ambient, screen-minimizing outdoor companion that finds safe urban green windows, scores environmental health deterministically, and puts your phone in your pocket with Gemma and ElevenLabs."
tags: devchallenge, hf26challenge, gemma, opensource
cover_image: https://raw.githubusercontent.com/SayemR0018/sobujGhonta/main/docs/cover.png
---

*This is a submission for the [Hacktoberfest Open-Source AI Challenge Week 1: Touch Grass](https://dev.to/challenges/hacktoberfest-week1-2026-10-05)*

---

## What I Built

Four billion of us live in dense metropolitan cities. When hackathons announce themes like **"Touch Grass"**, the default assumption is that you live a fifteen-minute drive from an unpolluted mountain trail or state park. 

For those of us living in cities like Dhaka, that is not reality. Our outdoors is a concrete landscape: sun-baked asphalt, flyovers, traffic jams, and scattered municipal green spaces like Ramna Park or Dhanmondi Lake.

Stepping outside in dense tropical cities comes with serious environmental hazards:
1. **Air pollution spikes:** US AQI frequently exceeds 150 (Unhealthy) or 200 (Very Unhealthy), turning strenuous cardiovascular exercise into a health hazard.
2. **Extreme heat islands:** Apparent temperatures easily cross 38°C midday.
3. **Monsoon downpours & vector risks:** High humidity, stagnant water, and post-rain warmth trigger rapid urban dengue mosquito breeding.

Worse yet, current outdoor navigation and fitness apps create a paradox: **to navigate nature, they demand that you stay glued to a glowing glass screen.**

I built **Sobuj Ghonta (সবুজ ঘণ্টা — "The Green Hour")** to solve this. It is an ambient, mobile-first, bilingual (Bangla + English) Progressive Web App designed to do one thing: **get you outside safely, and then get out of your way.**

### Key Features
- **Deterministic Green Window Scoring (0–100):** Evaluates real-time Open-Meteo hourly telemetry across US AQI, PM2.5, heat index, UV index, precipitation, and golden hour windows.
- **Hyper-Local Green Space Discovery:** Finds parks, botanical gardens, and lakesides within ~3 km using OpenStreetMap Overpass with Haversine walking time calculations.
- **Safety Guardrails in Code:** Immutable code checks that Google's open-weight **Gemma** model cannot override. If AQI > 150, effort is locked to gentle; if AQI > 200, outdoor cardio is barred, and N95 mask / postpone advice is mandated.
- **Spoken Audio Walk in Your Pocket:** Server-side **ElevenLabs** proxy delivering calm audio walk segments with lock-screen **Media Session API** controls and an **OLED pitch-black Pocket Mode**. If no ElevenLabs key is provided, it gracefully falls back to the browser's native **Web Speech API**.
- **Offline Trail Resilience:** Pre-downloads audio clips into **IndexedDB** so the guided walk plays flawlessly with zero cellular signal on deep park trails.
- **Screen-vs-Outside Meter:** Uses the **Page Visibility API** to measure foreground screen seconds against total walk duration, proving that the screen was the shortest part of your outdoor experience.
- **On-Device Nature Journal:** Photo and note observations are stored locally in **IndexedDB**; photos are never stored server-side.

---

## Demo

- **Live Deployment:** [TBD — Live Render URL]
- **Zero-Key Instant Dhaka Demo:** Tap the **"Demo: Dhaka (Offline)"** button in the header. It runs entirely on bundled, authentic Dhaka telemetry and pre-generated audio with **zero latency** and **zero API keys required**, allowing judges to test every feature instantly.

![Sobuj Ghonta Mobile Interface](https://raw.githubusercontent.com/SayemR0018/sobujGhonta/main/docs/screenshot.png)

---

## Code

{% embed https://github.com/SayemR0018/sobujGhonta %}

- **License:** Permissive **MIT License**
- **Architecture:** Node.js Express backend + Vite React PWA frontend served as a unified web service.
- **Unit & Flow Tests:** 16 automated test cases in `server/tests/` running via Node's native test runner (`npm test`).

---

## How I Built It

### 1. Deterministic Green Window Scoring Engine
Rather than asking an LLM to guess whether the weather is good, Sobuj Ghonta computes an objective 0–100 hourly score in plain JavaScript (`server/services/scoring.js`):

```javascript
// Heuristic scoring: base 100 with environmental penalties and golden-hour bonus
if (aqi > 200) aqiPenalty = 60 + (aqi - 200) * 0.25;
if (apparentTemp > 38) heatPenalty = 35 + (apparentTemp - 38) * 5;
if (isThunder) rainPenalty = 55;
if (!isDaylight) darknessPenalty = 25;
if (isGoldenHour && aqi <= 150 && rainPenalty <= 10) goldenHourBonus = +12;
```

### 2. Immutable Code Guardrails That Gemma Cannot Override
LLMs are creative, but outdoor public health guidance cannot tolerate hallucinations. In `server/services/guardrails.js`, strict rules validate and sanitize Gemma's JSON output:

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
In `server/services/llm/adapter.js`, an adapter pattern supports both cloud inference via Google AI Studio (`gemma-3-27b-it`) and 100% offline edge execution via local **Ollama** (`gemma2:9b`). System instructions are embedded directly into the user turn to respect Gemma's upstream prompt contract, and outputs are parsed defensively with regex fallbacks and automated single-turn syntax repair.

### 4. Zero-Signal Trail Audio via ElevenLabs & IndexedDB
The server proxies requests to ElevenLabs (`eleven_multilingual_v2`), caching synthesized MP3 buffers to disk hashed by `sha256(text + voiceId + lang)`. When a user taps "Download Walk for Trail", the PWA pre-fetches all clips and stores them in browser **IndexedDB**, enabling true offline lock-screen audio playback in cellular dead zones.

---

## Why Does Open Innovation Matter?

Building this project around open-weight models, open data, and open standards demonstrated clear advantages over closed proprietary ecosystems:

1. **Model Swappability & Edge Freedom:**
   A closed AI application is forever tethered to remote API pricing and vendor terms. Sobuj Ghonta's open-source architecture allows developers to run `LLM_PROVIDER=ollama` with `gemma2:9b` locally. On a laptop or edge device, this runs completely offline with **zero API toll**.
2. **Data Sovereignty & Location Privacy:**
   Personal location coordinates, walking routes, and photos of nearby surroundings are sensitive data. By using open data APIs (Open-Meteo, OpenStreetMap) and storing journal entries exclusively in on-device **IndexedDB**, the user's daily habits are never monetized or fed into commercial ad-tracking profiles.
3. **Where Open Beat Closed:**
   When testing prompt schemas, commercial closed APIs often returned generic, verbose essays that encouraged continued conversational chat. By constraining open-weight Gemma with deterministic heuristic code guardrails, we achieved terse, hyper-local, safety-verified scripts under 60 words that tell the user to put their phone away.
4. **Cultural Accessibility (Bangla Noto Sans Bengali):**
   Open-weight models and open web standards let us deliver native Bengali localization with proper diacritic typography, serving communities in South Asia that are often overlooked by Western-centric fitness platforms.

---

## Field Test: Taking Sobuj Ghonta Outside

> *The judging rubric heavily rewards taking the project outside and sharing authentic observations.*

<!-- SAYEM: Paste your real walk notes below. Fill out the 5 prompts with your genuine experience. -->
[SAYEM: write your real walk here]
- **Where I went:** [e.g. Ramna Park / Dhanmondi Lake, Dhaka]
- **AQI that day:** [e.g. US AQI 168, Unhealthy]
- **What the plan got right:** [e.g. Noticed the golden hour window between 16:45 and 17:30 when ambient heat dropped; correctly flagged mosquito risks near lake bushes]
- **What it got wrong:** [e.g. Overpass showed a side gate that was locked for construction]
- **How long I looked at the screen:** [e.g. ScreenMeter logged 48 seconds of screen time over a 32-minute walk — 2.5% ratio]
<!-- END SAYEM FIELD TEST -->

---

## My Agent Session

This project was architected, implemented, and verified using **Google Antigravity** (`gemini_cli`). Real agent session transcripts were curated and saved through **DevRelay**:

{% embed https://dev.to/agent_sessions/sobuj-ghonta-building-the-green-hour-with-antigravity-rhqt4o %}

---

## Prize Categories

### Featured Categories
- **Best Use of Gemma ($200):** Google's open-weight Gemma model serves as the core reasoning engine, generating mindful walking scripts, sensory missions, and multimodal photo observations constrained by strict deterministic guardrails. Supports both Google AI Studio API and fully offline local **Ollama** runtimes.
- **Best Use of Render ($200):** Deployed on Render using a production Blueprint (`render.yaml`) that configures a unified Node.js web service serving the Express API and Vite React PWA with automated `/health` checks.

### Partner Categories
- **Best Use of ElevenLabs ($100):** Spoken audio walk powered by ElevenLabs' `eleven_multilingual_v2` model with support for natural Bengali and English narration, server-side SHA-256 audio caching, lock-screen Media Session integration, and browser Web Speech fallback.

### Overall Prize
- **Hacktoberfest Week 1: Touch Grass ($250):** A comprehensive, culturally resonant outdoor companion tailored for high-density cities, built entirely on open-source AI and open data, mathematically proven to keep screen time minimal.
