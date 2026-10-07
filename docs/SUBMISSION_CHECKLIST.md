# Hacktoberfest Open-Source AI Challenge: Week 1 — Submission Checklist

**Challenge:** Hacktoberfest Open-Source AI Challenge: Week 1: "Touch Grass"  
**Deadline:** October 11, 2026 at 11:59 PM PDT (Challenge window: Oct 5 – Oct 11, 2026)  
**Required Tags:** `#hf26challenge`, `#devchallenge` (max 4 tags total)  
**Challenge URL:** [DEV Week 1 Challenge](https://dev.to/challenges/hacktoberfest-week1-2026-10-05)  
**Target Project:** Sobuj Ghonta (সবুজ ঘণ্টা) — The Green Hour  
**Repository:** [SayemR0018/sobujGhonta](https://github.com/SayemR0018/sobujGhonta)  
**Live URL:** Render Deployment (to be filled upon deployment)  

---

## 1. Challenge Eligibility & Core Rules

- [x] **Brand-New Project:** Built entirely within the challenge window (Oct 5 – Oct 11, 2026). No pull requests to pre-existing projects.
- [x] **Open-Source AI at Core:** Powered by open-weight Gemma model (local Ollama adapter + Google AI Studio API fallback) and open environmental data (Open-Meteo, OpenStreetMap Overpass).
- [x] **Theme Alignment ("Touch Grass"):** Purpose-built ambient outdoor companion to get people off the screen and into local green spaces safely; foreground screen time is measured and minimized via Page Visibility API.
- [x] **Solo / Team Attribution:** Solo submission by Sayem Rahman (`@SayemR0018`).
- [ ] **Tagging:** Post tagged with `#hf26challenge` and `#devchallenge`.
- [x] **License:** Permissive open-source license (MIT License) committed in repo root.
- [ ] **Session Provenance:** Real DevRelay agent session recorded, saved, and embedded in post.
- [x] **No Fabricated Data:** Authentic verification numbers, real weather/AQI calculations, zero fake field-test quotes.

---

## 2. Required DEV Post Sections

- [ ] **Exact Header Line:**
  `*This is a submission for the [Hacktoberfest Open-Source AI Challenge Week 1: Touch Grass](https://dev.to/challenges/hacktoberfest-week1-2026-10-05)*`
- [ ] **What I Built:** Clear, compelling narrative of "Sobuj Ghonta" as an ambient Bengali + English outdoor companion for dense urban areas (Dhaka & worldwide).
- [ ] **Demo:** Link to live Render deployment + instructions for the 0-key instant Dhaka offline demo mode.
- [ ] **Code:** Embedded GitHub repository link (`{% embed https://github.com/SayemR0018/sobujGhonta %}`).
- [ ] **How I Built It:** Full architecture explanation: deterministic Green Window Score, Overpass park radius, code-level safety guardrails, Gemma prompt contract, free TTS provider chain (`auto` -> `gemini` -> `mms` -> `browser`), and PWA offline audio caching.
- [ ] **Why Does Open Innovation Matter?:** In-depth discussion of data sovereignty (no location tracking sent to commercial ad tech), open weights (local Ollama vs cloud Gemma API), and open environmental data.
- [ ] **Field Test:** Authentic user walk log with the 5 required prompt answers (location, AQI, what the plan got right, what it got wrong, screen vs outside ratio) — preserving `[SAYEM: write your real walk here]` block.
- [ ] **My Agent Session:** DevRelay agent session embed tag and transparency reflection.
- [ ] **Prize Categories:** Explicit enumeration of targeted prize tracks with concrete technical justifications.

---

## 3. Judging Criteria Mapping

| Judging Criterion | Weight | Deliverable in Repo / Post | Status |
|---|---|---|---|
| **Writing Quality** | **Highest** | `docs/POST.md` drafted in first-person, grounded, technically precise, zero marketing fluff, adhering to `docs/WRITING_NOTES.md`. | [ ] |
| **Relevance to Prompt & Theme** | High | Screen-vs-outside meter, lock-screen Media Session audio walk, OLED black screen mode, hyper-local green window discovery. | [ ] |
| **Creativity** | High | Tailored for high-density South Asian cities (bilingual Bangla/English, heat-index + mosquito + AQI warnings), golden-hour scoring, sensory nature missions. | [ ] |
| **Technical Execution** | High | Full automated test suite for scoring, guardrails, and TTS provider chain; Node + Express backend, React + Vite PWA client, offline CacheStorage/IndexedDB, Render deployment. | [ ] |
| **Use of Partner Technology** | Partner | Gemma (open-weight outdoor planning), Render (cloud deployment via Blueprint). | [ ] |

---

## 4. Targeted Prize Categories

- [ ] **Featured Category: Best Use of Gemma ($200)**
  - *Deliverable:* Gemma model adapter (`LLM_PROVIDER=gemma_api | ollama`) generating structured JSON walk scripts, missions, and health notes strictly constrained by deterministic safety rules.
- [ ] **Featured Category: Best Use of Render ($200)**
  - *Deliverable:* Production-ready `render.yaml` Blueprint deploying unified Express API + Vite PWA static client with `/health` checks, reverse proxy trust, and compression.
- [ ] **Overall Winner Track ($250)**
  - *Deliverable:* Comprehensive combination of writing quality, open-source innovation, full offline resilience, and bilingual cultural relevance.

*(Note: ElevenLabs is intentionally NOT claimed or used; free TTS provider chain used instead).*

---

## 5. Engineering & Product Deliverables

- [x] Phase 0: Repo preflight, DevRelay inspection, checklist updated, git push verified.
- [ ] Phase 1: Full audit of existing app recorded in `docs/AUDIT.md`.
- [ ] Phase 2: Free TTS provider chain (`auto` -> `gemini` -> `mms` -> `browser` -> `none`), removal of ElevenLabs, offline pre-fetching, unit/integration tests with mocks, Dhaka demo audio updated, `docs/VERIFIED.md` and `docs/BUILD_LOG.md` updated.
- [ ] Phase 3: Full website QA (mobile 360x800 & desktop, error modes, guardrails, offline PWA, Media Session, Lighthouse audit, security/helmet/CSP), documented in `docs/QA_REPORT.md`.
- [ ] Phase 4: Render deploy-ready (`render.yaml`, `PORT`, `trust proxy`, compression, caching headers, SPA fallback, `/health`, `scripts/smoke.mjs`, `docs/DEPLOY.md`, clean clone verify).
- [ ] Phase 5: Build log finalized, cover image refreshed, `docs/POST.md` finalized, DevRelay session saved and draft article created (`published: false`).
