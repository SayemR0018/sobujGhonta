# Render Deployment Guide — Sobuj Ghonta (সবুজ ঘণ্টা)
*Step-by-step instructions for deploying to Render Free Tier via Infrastructure-as-Code Blueprint*

---

## 1. Quick Overview

Sobuj Ghonta is fully configured for zero-friction deployment on Render via the bundled [`render.yaml`](../render.yaml) blueprint. A single Render Web Service builds both the client PWA and runs the hardened Express production server, serving static assets, cached audio clips, and API endpoints.

- **Service Type:** Web Service (Node.js runtime)
- **Plan:** Free ($0/mo)
- **Node Version:** Pinned to `20.18.0` (`.node-version` & `engines`)
- **Health Check Path:** `/health`
- **Port:** Auto-bound to `10000` via `process.env.PORT` on `0.0.0.0`

---

## 2. Click-by-Click Deployment Steps

### Step 1: Open Render Dashboard
1. Log in to your [Render Dashboard](https://dashboard.render.com/).
2. Click the **+ New** button in the top navigation bar.
3. Select **Blueprint** from the dropdown menu.

### Step 2: Connect GitHub Repository
1. In the repository selection screen, locate and connect:
   ```text
   SayemR0018/sobujGhonta
   ```
2. Render will automatically detect the root [`render.yaml`](../render.yaml) file.

### Step 3: Configure Environment Variables
Render parses the Blueprint and prompts you for any secret environment variables marked `sync: false`:

| Variable | Required? | Recommended Value / Description |
| :--- | :---: | :--- |
| `GEMMA_API_KEY` | **Recommended** | Your Google AI Studio API key. Powers Gemma walk generation and Gemini 3.8 Flash TTS. |
| `HF_TOKEN` | *Optional* | Hugging Face User Access Token (Free). Enables Meta MMS-TTS serverless fallback. |

*(All other environment variables like `NODE_VERSION=20.18.0`, `NODE_ENV=production`, `PORT=10000`, `LLM_PROVIDER=gemma_api`, `GEMMA_MODEL=gemma-4-26b-a4b-it`, and `TTS_PROVIDER=auto` are automatically provisioned by `render.yaml`.)*

### Step 4: Apply Blueprint and Deploy
1. Click **Apply Blueprint** (or **Create Web Service**).
2. Render initiates the build pipeline immediately.

---

## 3. Expected Build & Deploy Log

A healthy build log on Render will look like this:

```text
==> Cloning from https://github.com/SayemR0018/sobujGhonta...
==> Checking out commit [hash] in branch main...
==> Using Node version 20.18.0 (set in .node-version)
==> Running build command: npm install && npm run build
...
added 142 packages in 8s
> client@1.0.0 build
> vite build
vite v6.4.4 building for production...
✓ 1920 modules transformed.
dist/index.html                   1.34 kB │ gzip:  0.68 kB
dist/assets/index-D92vYZIN.css    3.28 kB │ gzip:  1.28 kB
dist/assets/index-CR4mcBwa.js   215.27 kB │ gzip: 64.95 kB
✓ built in 18s
==> Generating container image from build...
==> Starting service with: node server/index.js
[Sobuj Ghonta] Server listening on http://0.0.0.0:10000
[Sobuj Ghonta] Mode: production | LLM: gemma_api | TTS: auto
==> Health check path /health responded with HTTP 200
==> Your service is live 🎉 https://sobuj-ghonta.onrender.com
```

---

## 4. Cold-Start Expectations (Free Tier)

> [!NOTE]
> On the Render Free Tier:
> - Instances automatically spin down to sleep after **15 minutes of inactivity**.
> - When a new request arrives, Render spins up a fresh container instance.
> - A cold start typically takes **30–50 seconds**.
> - Once awake, the application responds in **10–30 ms** for cached assets, demo audio, and health checks.

---

## 5. Post-Deployment Verification (Smoke Test)

Once Render finishes deploying and gives you your live service URL (e.g. `https://sobuj-ghonta.onrender.com`), verify it with one command:

```bash
# Run deployment smoke test against live Render URL
node scripts/smoke.mjs https://sobuj-ghonta.onrender.com
```

### Expected Output:
```text
========================================================
  Sobuj Ghonta (সবুজ ঘণ্টা) — Deployment Smoke Test
  Target: https://sobuj-ghonta.onrender.com
  Time:   2026-10-07T...
========================================================

  ✔ [PASS] GET /health (HTTP 200 JSON) (42ms)
  ✔ [PASS] GET / (App Shell HTML & Security Headers) (85ms)
  ✔ [PASS] GET /api/demo/dhaka?lang=en (Full Demo Payload) (64ms)
  ✔ [PASS] GET /api/demo/dhaka?lang=bn (Bengali Unicode Payload) (52ms)
  ✔ [PASS] GET /demo-audio/en_0.wav (Static Pre-generated WAV) (98ms)
  ✔ [PASS] GET /demo-audio/bn_0.wav (Static Pre-generated WAV) (87ms)
  ✔ [PASS] GET /manifest.json (PWA Web App Manifest) (45ms)
  ✔ [PASS] GET /sw.js (Service Worker with no-cache header) (41ms)

================ SMOKE SUMMARY ================
Passed: 8 / 8
Failed: 0
Status: READY FOR DEPLOYMENT / HEALTHY
===============================================
```

---

## 6. Troubleshooting & Common Scenarios

| Issue | Cause | Fix |
| :--- | :--- | :--- |
| **Initial request takes ~45 seconds** | Render Free Tier cold start after 15m idle | Normal behavior; subsequent requests will be instantaneous. |
| **Vite build fails: command not found** | `devDependencies` pruned by npm in production | Resolved: `vite` is declared in `dependencies` and `npm install` installs full build tree. |
| **429 rate limit on TTS** | Google AI Studio free tier limits `gemini-3.8-flash-tts` to 3 RPM | Server automatically falls back to client Web Speech API or uses pre-generated demo audio. |
| **Missing API keys on start** | `GEMMA_API_KEY` not entered in Render dashboard | App functions in resilient demo mode; bundled Dhaka data and offline audio require zero keys. |
| **Viewing Live Server Logs** | Inspecting errors or traffic in real-time | Go to Render Dashboard → Click `sobuj-ghonta` → Select the **Logs** tab. |
