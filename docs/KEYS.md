# Keys & Providers Configuration Guide
## Sobuj Ghonta (সবুজ ঘণ্টা) — The Green Hour

Sobuj Ghonta operates out-of-the-box in **Zero-Key Offline Mode** with 8 bundled global city demo packs (Dhaka, Delhi, London, Los Angeles, Nairobi, São Paulo, Sydney, Tokyo). However, you can connect your own API keys for live outdoor walk planning and narration.

---

## 1. Supported Providers

| Provider | Purpose | Where to Obtain | Key Prefix / Format |
| :--- | :--- | :--- | :--- |
| **Google AI Studio (Gemma)** | Mindful walk plan generation & Gemini 3.8 Flash TTS | [aistudio.google.com](https://aistudio.google.com) | `AIza...` |
| **Prior Labs (TabPFN)** | Tabular foundation model forecasting & anomaly detection | [cloud.priorlabs.ai](https://cloud.priorlabs.ai) | `tabpfn_...` |
| **SerpApi** | Live Google Search for park closures, trail notices, events | [serpapi.com](https://serpapi.com) | 64-character hex |
| **Serper.dev** | Alternative live web search adapter | [serper.dev](https://serper.dev) | API key |
| **ElevenLabs** | Studio voice narration for mindfulness audio guides | [elevenlabs.io](https://elevenlabs.io) | `sk_...` |
| **Hugging Face** | Meta MMS-TTS multilingual speech fallback | [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) | `hf_...` |

---

## 2. Setting Up Keys

### Method A: Interactive CLI Setup Wizard (Recommended for Local Dev)
Run the automated wizard in your terminal:
```bash
npm run setup:keys
```
**Security Invariants:**
1. Validates that `.gitignore` contains `.env` before writing.
2. Masks keystrokes with `*` in the terminal to prevent exposure in screen recordings or shell history.
3. Enforces restrictive file permissions: `0600` (owner read/write only).

### Method B: In-App Settings ("Keys and Providers")
1. Open Sobuj Ghonta in your browser.
2. Tap the **Settings** tab in the bottom navigation bar.
3. Scroll down to **Keys and Providers**.
4. Choose your persistence preference:
   - `sessionStorage`: Default ephemeral memory (forgotten on tab close).
   - `IndexedDB`: Opt-in encrypted browser storage on this device.
5. Enter keys into masked password inputs, click **Test** to verify formatting, or click **Forget** to wipe keys anytime.

### Method C: Environment Variables (for Render / Docker)
Set environment variables directly in your hosting platform dashboard (e.g. Render Dashboard):
```bash
GEMMA_API_KEY=AIzaSy...
TABPFN_TOKEN=tabpfn_...
SERPAPI_API_KEY=...
ELEVENLABS_API_KEY=sk_...
```

---

## 3. Automated Secret Scanning
To verify that no credentials, tokens, or API keys are accidentally committed to git or exposed in documentation, run:
```bash
npm run scan:secrets
```
This scanner scans all files, source code, fixtures, and documentation using regex pattern matching and flags any exposed keys before commits.
