# System Architecture & Technical Specifications
## Sobuj Ghonta (সবুজ ঘণ্টা) — The Green Hour

*Ambient, screen-minimizing outdoor companion for safe urban green discovery.*  
*Created for DEV Hacktoberfest 2026 Open-Source AI Challenge Week 1: "Touch Grass".*

---

## 1. High-Level Architectural Topology

Sobuj Ghonta employs a decoupled, local-first 3-tier architecture engineered for extreme reliability, offline resilience, and zero-key functionality:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENT PWA (React 18 / Vite)                    │
│  - Ambient Nature UI Tokens (Light, Dark, OLED Pure Black #000000)     │
│  - Offline Service Worker (/sw.js) & Web App Manifest (/manifest.json) │
│  - Local IndexedDB (Journal, Walk Sessions, Audio Blobs, Secure Keys)  │
│  - Hardware Integration: Web Audio API (528Hz), Web Speech API, Media  │
│    Session API (Lock-screen audio controls), HTML5 Canvas Share Card   │
└──────────────────┬─────────────────────────────────────────────────────┘
                   │ HTTPS JSON / Audio Buffers
                   │ Custom Headers: x-gemma-key, x-tabpfn-key, x-serpapi-key, x-elevenlabs-key
┌──────────────────▼─────────────────────────────────────────────────────┐
│                    NODE.JS EXPRESS SERVER (Port 10000)                 │
│  - Hardened Production Middleware: Helmet (Strict CSP), Rate Limiting, │
│    Gzip Compression, Redacting Logger (Zero Secret Exposure)           │
│  - REST API Gateway: /api/weather, /api/places, /api/plan, /api/tts    │
│  - 8 Bundled Global City Offline Demo Packs (/api/demo/:city)          │
│  - Authoritative Guardrails Engine (Safety Invariant over ML & Search) │
│  - Cascading Multi-Tier TTS (ElevenLabs -> Gemini 3.8 Flash -> MMS)    │
│  - Unified Search Adapter (SerpApi / Serper / None + Prompt Defenses)  │
└──────────────────┬─────────────────────────────────────────────────────┘
                   │ HTTP JSON (Loopback 127.0.0.1:8000)
┌──────────────────▼─────────────────────────────────────────────────────┐
│                   PYTHON ML SIDECAR (FastAPI / ml/)                    │
│  - Prior Labs TabPFN Foundation Model (In-Context Tabular Forecaster)  │
│  - Quantile Uncertainty Interval Generator (p10, p50, p90)             │
│  - Z-Score & Interquartile Environmental Anomaly Detector              │
│  - Ridge Regression Personal Walk-Log Predictor (RFC 4180 CSV Engine)  │
│  - Pure Node.js Deterministic Fallback ("baseline (not TabPFN)")       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Architectural Pillars

### Pillar A: Authoritative Safety Invariant
External LLM responses, machine learning predictions, and third-party web search snippets are inherently uncalibrated or probabilistic. Sobuj Ghonta enforces a strict **deterministic unidirectional safety invariant**:
- When open sensor telemetry (Open-Meteo) indicates severe pollution (AQI > 200) or hazardous heat (apparent temp >= 38°C), **no optimistic prediction or web snippet can ever relax the safety warning or elevate the Green Window score**.
- Machine learning anomalies and search advisories are strictly **additive**—they may lower scores or mandate cautionary Plan B alternatives, but never suppress health guardrails.

### Pillar B: Zero-Key, Zero-Network Guarantee
Judges, reviewers, and offline park walkers can evaluate every feature without registering API keys or having cellular data:
- **8 Bundled Global Cities:** Dhaka, Delhi, London, Los Angeles, Nairobi, São Paulo, Sydney, and Tokyo include pre-bundled, authentic hourly telemetry, green spaces, and dated search advisories.
- **Pre-generated Multilingual Audio:** High-fidelity WAV clips for Dhaka walks are served from disk cache with 0 ms synthesis latency.
- **Local Fallback Baselines:** When the Python FastAPI sidecar or external LLM is offline, deterministic Node.js regression algorithms step in, labeled transparently as `baseline (not TabPFN)` and `mock_gemma`.

### Pillar C: Screen-Minimizing UX Paradigm
Unlike typical apps that maximize user attention:
1. **ScreenMeter:** Tracks screen-on time vs. total walk duration via the HTML5 Page Visibility API.
2. **Tactile OLED Pocket Mode:** Renders pure `#000000` with high-contrast tactile touch targets (>= 48px to 140px) allowing effortless pocket operation without lighting up OLED pixels.
3. **Lock-Screen Audio Integration:** The W3C Media Session API hooks into native lock screen, smartwatch, and headphone remotes (Play/Pause/Skip), keeping phones stowed in pockets.
4. **Canvas Walk Receipt:** Upon walk completion, renders an exportable share card highlighting screen-to-walk ratio (e.g. `Screen 2.5% of 34-min walk`) to encourage friends to touch grass.
5. **Micro-Green Windows & Plan B Guide:** 10-minute safe outdoor escape windows or indoor botanical alternatives when conditions are poor.

---

## 3. Directory Layout

```text
sobujGhonta/
├── client/                     # Vite React 18 PWA frontend
│   ├── public/                 # Static assets, PWA manifest, service worker
│   │   ├── demo-audio/         # Pre-generated WAV clips for offline tour
│   │   ├── manifest.json       # PWA Web App Manifest
│   │   └── sw.js               # Service Worker with no-cache headers
│   └── src/
│       ├── components/         # Redesigned UI views & tactile components
│       │   ├── HomeView.jsx    # Hero "Your Green Hour" score ring & CTA
│       │   ├── TimelineChart.jsx# Inline SVG TabPFN uncertainty band chart
│       │   ├── PlacesView.jsx  # Overpass parks list & interactive range map
│       │   ├── WalkView.jsx    # ScreenMeter, Pocket Mode, streak tracker
│       │   ├── WalkReceiptModal.jsx # HTML5 Canvas tactile receipt card
│       │   ├── SettingsView.jsx# 8-lang switcher, RTL, keys & CSV portability
│       │   ├── SearchHeadsUp.jsx# 1-line screen-minimizing park news/closures
│       │   └── NatureJournal.jsx# Local IndexedDB photo & sensory notes
│       ├── i18n/               # 8 localized languages (en, bn, hi, es, ar, fr, pt, id)
│       └── utils/db.js         # IndexedDB wrapper (journal, walkSessions, secureKeys)
├── ml/                         # Python FastAPI ML Sidecar
│   ├── app.py                  # FastAPI application exposing /forecast, /anomaly
│   ├── services/
│   │   ├── tabpfn_engine.py    # Prior Labs TabPFN foundation model client
│   │   ├── forecast_pipeline.py# Multi-target quantile pipeline (AQI, temp, UV)
│   │   ├── anomaly_detector.py # Z-score environmental anomaly detector
│   │   └── personal_log.py     # RFC 4180 CSV & Ridge satisfaction regressor
│   └── requirements.txt        # fastapi, uvicorn, scikit-learn, numpy
├── server/                     # Express production backend
│   ├── index.js                # App entrypoint & static PWA server
│   ├── config.js               # Redacted configuration & environment loader
│   ├── routes/api.js           # API routes (/weather, /places, /plan, /tts, /demo)
│   └── services/
│       ├── scoring.js          # Green Window multi-variable scoring engine
│       ├── guardrails.js       # Health & safety guardrail invariants
│       ├── places.js           # Multi-mirror Overpass API OSM park query
│       ├── weather.js          # Open-Meteo operational & historical fetcher
│       ├── mlClient.js         # Sidecar client & deterministic fallback
│       ├── search/             # Unified search adapter (SerpApi, Serper, None)
│       ├── llm/                # Gemma prompt builder & mock fallback
│       └── tts/                # Free TTS cascade (Gemini Flash, MMS, ElevenLabs)
├── scripts/                    # Verified engineering CLI tools
│   ├── setup-keys.mjs          # Interactive masked CLI key wizard (0600 mode)
│   ├── scan-secrets.mjs        # Automated credential scanner
│   ├── backtest.mjs            # Empirical backtest suite on held-out meteo hours
│   ├── smoke.mjs               # Zero-dependency deployment smoke test runner
│   └── fullQaRunner.mjs        # 16-point production integration suite
└── tests/                      # 390-test 4-tier E2E and adversarial test suites
```
