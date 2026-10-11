# Integration Notes: Live Web Search Adapters (SerpApi & Serper)

**Document:** `docs/INTEGRATION_NOTES.md`  
**Milestone:** M2 (R2: Unified Live Web Search Adapter)  
**Author:** `worker_m2_1`  
**Date:** 2026-10-10  
**Status:** VERIFIED & IMPLEMENTED  

---

## 1. Overview & Architectural Goals

The search subsystem (`server/services/search/`) delivers ambient, screen-minimizing environmental context (park closures, maintenance, nearby nature activities, official safety bulletins) without cluttering user attention or compromising application safety.

### Core Architectural Invariants
1. **Screen-Minimizing Delivery:** At most **ONE concise line** delivered in UI/audio (Local Heads-Up, Nearby this week, or Official safety alert).
2. **Authoritative Guardrails:** Deterministic scoring (`server/services/scoring.js`) and safety guardrails (`server/services/guardrails.js`) remain strictly authoritative over all search results. Search results may **only ADD caution** (lower score, add alert note), never relax a safety rule.
3. **Zero-Key Offline Guarantee:** Zero-key "Demo (Offline)" mode operates with 0 API keys and 0 network calls, powered by dated, bundled snapshots in `server/demoData/` across all 8 global cities.
4. **Prompt Injection & Untrusted Data Defenses:** All search text is treated as untrusted data: recursive HTML stripped, markdown removed, length capped at 200 characters, pseudo-URLs neutralized, source domain displayed with every claim, and snippet instructions ignored.
5. **Privacy:** Geographic coordinates rounded to 2 decimal places before query creation or external caching.

---

## 2. Upstream Provider Specifications & Documentation

### 2.1 SerpApi (Google Search Engine)
- **Official Documentation:** `https://serpapi.com/search-api`
- **Primary Endpoint:** `GET https://serpapi.com/search.json`
- **Request Parameters:**
  - `engine`: `'google'`
  - `q`: Query string (sanitized, max 100 chars)
  - `api_key`: SerpApi private key
  - `num`: 10
  - `location`: Optional geographic city/region name
  - `hl`: Language code (optional)
  - `gl`: Country code (optional)
- **Response Structure:**
  - Top-level object containing `search_metadata` and `organic_results` (array).
  - Organic item schema: `{ position, title, snippet, link, displayed_link, date }`.
- **Error & Rate Limit Handling:**
  - `HTTP 429`: Concurrency or monthly search cap reached -> graceful fallback to offline snapshot with structured error `{ provider: 'none', fallback: true, error: 'Upstream rate limit exceeded; fallback to offline' }`.
  - `HTTP 401 / 403`: Key authorization failure -> fallback to offline with `keyError: true`.
  - `HTTP 5xx`: Server error -> fallback to offline snapshot.
  - Timeout: 5000ms via `AbortController`.

### 2.2 Serper.dev (Google Search API)
- **Official Documentation:** `https://serper.dev/playground`
- **Primary Endpoint:** `POST https://google.serper.dev/search`
- **Headers:**
  - `X-API-KEY`: Serper private key
  - `Content-Type`: `application/json`
- **Request Body:**
  - `{ "q": "<query>", "num": 10, "gl": "<country>", "hl": "<lang>" }`
- **Response Structure:**
  - Top-level object containing `searchParameters` and `organic` (array).
  - Organic item schema: `{ title, snippet, link, date }`.
- **Error & Rate Limit Handling:**
  - `HTTP 429`: Quota exhausted -> fallback to offline snapshot.
  - `HTTP 403`: Invalid API key -> fallback to offline with `keyError: true`.
  - Timeout: 5000ms via `AbortController`.

---

## 3. Unified Adapter Interface & Modules

The unified search subsystem is located under `server/services/search/`:

```
server/services/search/
├── index.js        # Unified facade, provider resolution, guardrail merger
├── normalizer.js   # Untrusted text sanitizer, 200-char cap, XSS defense
├── cache.js        # In-memory 30–60 min LRU cache & quota usage tracker
├── serpapi.js      # SerpApi client & fixture parser
├── serper.js       # Serper.dev client & fixture parser
└── none.js         # Offline snapshot loader with 0 network calls
```

### 3.1 Interface Contract
```typescript
interface SearchResultItem {
  title: string;
  snippet: string; // Max 200 characters, no HTML or markdown
  url: string;     // Neutralized URL (javascript:/data: -> '#')
  source: string;  // Verified domain (e.g., 'dhakatribune.com')
  date: string;    // ISO YYYY-MM-DD
}

interface SearchResponse {
  provider: 'serpapi' | 'serper' | 'none';
  items: SearchResultItem[];
  headsUp: {
    type: 'safetyAlert' | 'closure' | 'nearby' | 'headsUp';
    title: string;
    text: string;
    domain: string;
    source: string; // e.g., '[dhakatribune.com] South gate closed...'
    date: string;
    url: string;
  } | null;
  cached: boolean;
  quota?: QuotaStats;
}
```

---

## 4. Prompt Injection & Sanitization Defenses

Every item from web search passes through `cleanUntrustedText` and `sanitizeAndNormalizeSearchItem`:
1. **Recursive HTML Stripping:** Loops `text.replace(/<[^>]*>/g, '')` until fixed point, neutralizing nested tags like `<scr<script>ipt>alert(1)</script>`.
2. **Unclosed Tag Stripping:** Purges `<b unclosed tag` patterns.
3. **Markdown Syntax Removal:** Strips markdown links, code blocks, bold/italic symbols, blockquotes, and headings.
4. **Binary & Control Characters:** Removes `\0` null bytes and converts `\r\n` newlines into single spaces.
5. **Length Clamping:** Enforces `text.length <= 200`. Snippets over 200 chars are clamped to 197 chars + `'...'`.
6. **URL Sanitization:** Pseudo-protocols (`javascript:`, `data:`, `vbscript:`, `file:`) are sanitized to `'#'`.
7. **Domain Attribution:** Extracts clean domain names via `new URL(url).hostname.replace(/^www\./, '')`, ensuring every claim cites a verified domain.
8. **LLM Isolation:** `wrapUntrustedSnippet` wraps untrusted search text in `[UNTRUSTED_SEARCH_SNIPPET: ...]` tags.

---

## 5. In-Memory Cache & Quota Tracking

The `SearchCache` in `cache.js`:
- **Configurable TTL:** 30–60 minutes (default: 45 minutes).
- **Bounded Storage:** Max 100 entries with LRU eviction to respect Render's 512MB RAM cap.
- **Deterministic Keying:** `${city}:${sanitizedQuery}:${lat.toFixed(2)},${lon.toFixed(2)}`.
- **Live Quota Metrics:** Tracks `totalCalls`, `hits`, `misses`, `quotaCount`, and provider-specific calls (`serpapi`, `serper`, `none`).

---

## 6. Authoritative Guardrail Safety Invariant

The `mergeSearchCaution(baseScore, guardrails, searchHeadsUp)` function enforces safety:
- **Search can only ADD caution:**
  - Official hazard / extreme weather advisory: reduces green score by up to 15 points (down to minimum 0) and adds advisory to health notes.
  - Park closure notice: reduces green score by 10 points and notes closure.
- **Search can NEVER increase score:** `Math.min(baseScore, score)`.
- **Search can NEVER relax safety:** If AQI > 200 triggers `maxAllowedEffort: 'rest'`, search text claiming "air is clear" has 0 effect on guardrails.

---

## 7. Verification Status

| Suite | Status | Coverage |
|-------|:------:|----------|
| Unit / Contract (`npm test`) | 78 / 78 PASS | Search adapter, normalizer, cache, guardrails, snapshots |
| E2E Suite (`npm run test:e2e`) | 390 / 390 PASS | Tiers 1–4 full matrix |
| Smoke Tests (`npm run smoke`) | 9 / 9 PASS | Health, app shell, demo payloads, WAV audio, PWA, search heads-up |
| Secret Scanning | CLEAN | 0 detected keys or tokens |
