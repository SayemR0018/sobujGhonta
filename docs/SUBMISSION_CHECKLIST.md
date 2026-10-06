# Hacktoberfest Open-Source AI Challenge: Week 1 — Submission Checklist

**Challenge:** Hacktoberfest Open-Source AI Challenge: Week 1: "Touch Grass"  
**Deadline:** October 11, 2026 at 11:59 PM PDT (starts Oct 5, 2026)  
**Required Tags:** `#hf26challenge`, `#devchallenge` (max 4 tags total)  
**Challenge URL:** [DEV Week 1 Challenge](https://dev.to/challenges/hacktoberfest-week1-2026-10-05)  
**Target Project:** Sobuj Ghonta (সবুজ ঘণ্টা) — The Green Hour  
**Repository:** [SayemR0018/sobujGhonta](https://github.com/SayemR0018/sobujGhonta)

---

## 1. Challenge Eligibility & Core Rules

- [ ] **Brand-New Project:** Built entirely within the challenge window (Oct 5 – Oct 11, 2026). No pull requests to pre-existing projects.
- [ ] **Open-Source AI at Core:** Powered by open-weight Gemma model (local Ollama adapter + Google AI Studio fallback) and open data (Open-Meteo, OpenStreetMap Overpass).
- [ ] **Theme Alignment ("Touch Grass"):** Purpose-built to get people off the screen and into local green spaces; foreground screen time is measured and minimized.
- [ ] **Solo / Team Attribution:** Solo submission by Sayem Rahman (`@SayemR0018`).
- [ ] **Tagging:** Published post tagged with `#hf26challenge` and `#devchallenge`.
- [ ] **License:** Permissive open-source license (MIT License) committed in repo root.
- [ ] **Session Provenance:** Real DevRelay agent session recorded and embedded.
- [ ] **No Fabricated Data:** Authentic verification numbers, real weather/AQI logic, zero fake field-test quotes.

---

## 2. Required DEV Post Sections

- [ ] **Header Line:** Exact line: `*This is a submission for the [Hacktoberfest Open-Source AI Challenge Week 1: Touch Grass](https://dev.to/challenges/hacktoberfest-week1-2026-10-05)*`
- [ ] **What I Built:** Clear, compelling narrative of "Sobuj Ghonta" as an ambient Bengali + English outdoor companion for dense urban areas (Dhaka & worldwide).
- [ ] **Demo:** Link to live Render deployment + instructions for the 0-key instant Dhaka offline demo.
- [ ] **Code:** Embedded GitHub repository link (`{% embed https://github.com/SayemR0018/sobujGhonta %}`).
- [ ] **How I Built It:** Full architecture explanation: deterministic Green Window Score, Overpass park radius, safety guardrails, Gemma prompt contract, ElevenLabs voice proxy with browser TTS fallback, and PWA offline audio cache.
- [ ] **Why Does Open Innovation Matter?:** In-depth discussion of data sovereignty (no location tracking sent to commercial ad tech), open weights (local Ollama vs cloud Gemma API), and open environmental data.
- [ ] **Field Test:** Authentic user walk log with the 5 required prompt answers (location, AQI, what the plan got right, what it got wrong, screen vs outside ratio).
- [ ] **My Agent Session:** DevRelay agent session embed tag and transparency reflection.
- [ ] **Prize Categories:** Explicit enumeration of targeted prize tracks with concrete technical justification.

---

## 3. Judging Criteria Mapping

| Judging Criterion | Weight | Deliverable in Repo / Post | Status |
|---|---|---|---|
| **Writing Quality** | **Highest** | `docs/POST.md` drafted in first-person, grounded, technically precise, zero marketing fluff, adhering to `docs/WRITING_NOTES.md`. | [ ] |
| **Relevance to Prompt & Theme** | High | Screen-vs-outside meter, lock-screen Media Session audio walk, OLED black screen mode, hyper-local green window discovery. | [ ] |
| **Creativity** | High | Tailored for high-density South Asian cities (bilingual Bangla/English, heat-index + mosquito + AQI warnings), golden-hour scoring, sensory nature missions. | [ ] |
| **Technical Execution** | High | Full automated test suite for scoring and guardrails, Node + Express backend, React + Vite PWA client, offline CacheStorage/IndexedDB, Render deployment. | [ ] |
| **Use of Partner Technology** | Partner | Gemma (open-weight reasoning), ElevenLabs (natural spoken walks), Render (unified Blueprint deploy). | [ ] |

---

## 4. Targeted Prize Categories

- [ ] **Featured Category: Best Use of Gemma ($200)**
  - Deliverable: Gemma model adapter (`LLM_PROVIDER=gemma_api | ollama`) generating structured JSON walk scripts, missions, and health notes constrained by deterministic safety rules.
- [ ] **Partner Category: Best Use of ElevenLabs ($100)**
  - Deliverable: Server-side audio synthesis proxy with content-hashed disk/memory cache, lock-screen Media Session controls, and zero-signal trail pre-caching.
- [ ] **Featured Category: Best Use of Render ($200)**
  - Deliverable: Production-ready `render.yaml` Blueprint deploying unified Express API + Vite PWA static client with `/health` checks.
- [ ] **Overall Winner Track ($250)**
  - Deliverable: Comprehensive combination of writing quality, open-source innovation, full offline resilience, and bilingual cultural relevance.

---

## 5. Engineering & Product Deliverables

- [x] Phase 0: Repo setup, DevRelay inspection, checklist, writing notes.
- [ ] Phase 1: Verified model IDs, ElevenLabs voices, Open-Meteo & Overpass APIs (`docs/VERIFIED.md`).
- [ ] Phase 2: Green Window deterministic scoring algorithm + unit tests.
- [ ] Phase 2: Safety guardrail validator in plain code.
- [ ] Phase 2: Gemma prompt adapter with JSON defensive repair.
- [ ] Phase 2: Open-Meteo & Overpass client with bundled Dhaka fallback.
- [ ] Phase 2: ElevenLabs proxy + browser Web Speech fallback + audio caching.
- [ ] Phase 2: Nature Journal (on-device IndexedDB) + image describer with uncertainty disclaimer.
- [ ] Phase 2: Screen-vs-Outside foreground visibility meter.
- [ ] Phase 3: Express backend (`/server`) + React Vite PWA frontend (`/client`).
- [ ] Phase 3: PWA manifest, service worker for offline audio caching, high-contrast OLED black walk screen.
- [ ] Phase 3: Bundled Dhaka demo dataset + pre-generated audio for zero-key evaluation.
- [ ] Phase 4: Local test suite execution and verification (`docs/BUILD_LOG.md`).
- [ ] Phase 4: Production `render.yaml` Blueprint and deployment verification.
- [ ] Phase 5: 1000x420 cover image (`docs/cover.png`) and UI screenshots.
- [ ] Phase 5: Draft post creation on DEV via DevRelay (`create_article` with `published: false`).
