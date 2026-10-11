# Privacy Policy & Data Architecture
## Sobuj Ghonta (সবুজ ঘণ্টা) — The Green Hour

*Last Updated: October 2026*

Sobuj Ghonta is built on the philosophy of **Local-First Outdoor Computing**. When you take your phone outside to reconnect with nature, your private thoughts, geographic locations, and health notes should never become training fodder for remote advertising networks.

---

## 1. Zero Server Persistence of API Keys
- Any API keys configured in the in-app settings (Gemma, TabPFN, SerpApi, ElevenLabs) are held strictly in your browser (`sessionStorage` by default, or opt-in local `IndexedDB`).
- When sending requests to the backend, keys are transmitted via ephemeral HTTPS request headers (`x-gemma-key`, `x-tabpfn-key`, `x-serpapi-key`, `x-elevenlabs-key`).
- **Our server never persists your keys to disk, database, or disk caches.**
- All server log streams run through a redacting logger that scrubs `AIza...`, `sk_...`, `hf_...`, `tabpfn_...`, and hex tokens before anything reaches stdout.

---

## 2. Geolocation Privacy & Bounding Boxes
- We never store or transmit your precise GPS coordinates.
- All latitude and longitude coordinates are deterministically **rounded to 2 decimal places** (~1.1 km bounding box) before querying Open-Meteo, Overpass, or Search adapters.
- This provides accurate localized weather, solar angles, and park discovery without exposing your exact street address or doorstep.

---

## 3. Local-First Journal & Walk Logs
- **Nature Journal:** Photos, sensory observations, and botanical notes remain strictly inside your browser's local `IndexedDB` (`SobujGhontaDB`). They are never uploaded to our servers or synced to external clouds.
- **Personal Walk Logs:** Walk durations, screen ratios, and timestamps are stored locally. You can export or import your walk logs anytime in standard RFC 4180 CSV format via Settings > Personal Walk Logs.

---

## 4. Offline Audio & Zero Signal Trail
- You can pre-download walking narration clips to local IndexedDB before heading into dense woods or remote trails.
- Once downloaded, audio plays entirely in airplane mode with zero network packets emitted, ensuring a complete zero-signal trail.

---

## 5. Third-Party Services
When using live online mode, Sobuj Ghonta contacts:
1. **Open-Meteo:** For weather, air quality, and solar angles. (No personal identifiers; rounded coordinates only).
2. **OpenStreetMap / Overpass API:** For green spaces discovery. (Rounded coordinates only).
3. **Google AI Studio / Prior Labs / SerpApi:** Only if you provide your own optional API keys for real-time generative capabilities. Otherwise, bundled offline datasets are used.
