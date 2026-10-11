/**
 * server/services/search/index.js
 * 
 * Unified Live Web Search Adapter System.
 * Supports:
 * - SerpApi (Google Search engine)
 * - Serper.dev (Google Search API)
 * - None (Dated offline demo snapshots with 0 network calls and 0 API keys)
 * 
 * Features:
 * - In-memory 30–60 min LRU cache with quota usage tracking
 * - Strict schema normalization: { title, snippet, url, source, date }
 * - Untrusted text sanitization & prompt injection defenses
 * - Screen-minimizing delivery (at most ONE concise line for UI/audio)
 * - Authoritative guardrail safety invariant (search can only ADD caution, never relax safety)
 */

import { config } from '../../config.js';
import {
  sanitizeQuery,
  cleanUntrustedText,
  sanitizeAndNormalizeSearchItem,
  normalizeResult,
  formatScreenMinimizingOutput,
  wrapUntrustedSnippet
} from './normalizer.js';
import { searchCache, SearchCache } from './cache.js';
import { searchSerpApi, parseSerpApiPayload } from './serpapi.js';
import { searchSerper, parseSerperPayload } from './serper.js';
import { searchNone } from './none.js';

export {
  sanitizeQuery,
  cleanUntrustedText,
  sanitizeAndNormalizeSearchItem,
  normalizeResult,
  formatScreenMinimizingOutput,
  wrapUntrustedSnippet,
  searchCache,
  SearchCache,
  searchSerpApi,
  searchSerper,
  searchNone,
  parseSerpApiPayload,
  parseSerperPayload
};

const SUPPORTED_PROVIDERS = ['serpapi', 'serper', 'none'];

/**
 * Resolves search provider name adhering to the strict precedence hierarchy:
 * 1. Explicit argument / options
 * 2. config.searchProvider
 * 3. process.env.SEARCH_PROVIDER
 * 4. Auto-detection based on API keys (SERPAPI_API_KEY -> SERPER_API_KEY -> none)
 * 5. Fallback: 'none'
 */
export function getSearchProvider(providerName) {
  if (providerName !== undefined) {
    if (providerName && typeof providerName === 'string') {
      const norm = providerName.toLowerCase().trim();
      if (SUPPORTED_PROVIDERS.includes(norm)) {
        return norm;
      }
    }
    return 'none';
  }

  // Check config / env
  const envProvider = (config.searchProvider || process.env.SEARCH_PROVIDER || '').toLowerCase().trim();
  if (SUPPORTED_PROVIDERS.includes(envProvider)) {
    return envProvider;
  }

  // Auto-detect based on presence of API keys
  if (config.serpapiApiKey || process.env.SERPAPI_API_KEY) {
    return 'serpapi';
  }
  if (config.serperApiKey || process.env.SERPER_API_KEY) {
    return 'serper';
  }

  return 'none';
}

/**
 * Unified Search Interface Contract.
 * 
 * search(query: string, options: { lat: number, lon: number, city: string, provider?: string })
 * Returns: Promise<{ provider: string, items: Array<{ title, snippet, url, source, date }>, headsUp: object|null }>
 */
export async function search(query = '', options = {}) {
  const safeOptions = options && typeof options === 'object' ? options : {};
  const sanitizedQuery = sanitizeQuery(query);

  // If query is empty, return empty results without error
  if (!sanitizedQuery && !safeOptions.city) {
    return {
      provider: 'none',
      items: [],
      headsUp: null,
      cached: false
    };
  }

  // Cache lookup
  const cacheKey = searchCache.generateKey(sanitizedQuery, safeOptions);
  const cachedResult = searchCache.get(cacheKey);
  if (cachedResult) {
    return {
      ...cachedResult,
      cached: true
    };
  }

  // Resolve provider
  const explicitProvider = (safeOptions.provider && typeof safeOptions.provider === 'string' && safeOptions.provider.trim()) ? safeOptions.provider.trim() : null;
  const configuredProvider = (config.searchProvider && typeof config.searchProvider === 'string' && config.searchProvider.trim()) ? config.searchProvider.trim() : null;
  const activeProvider = getSearchProvider(explicitProvider || configuredProvider || undefined);

  let searchResult;
  try {
    if (activeProvider === 'serpapi') {
      searchResult = await searchSerpApi(sanitizedQuery, safeOptions);
    } else if (activeProvider === 'serper') {
      searchResult = await searchSerper(sanitizedQuery, safeOptions);
    } else {
      searchResult = await searchNone(sanitizedQuery, safeOptions);
    }
  } catch (err) {
    searchResult = {
      provider: 'none',
      fallback: true,
      items: [],
      error: err.message
    };
  }

  // Transparent offline fallback if remote search fails or is throttled
  if (searchResult.fallback || searchResult.provider === 'none') {
    if (activeProvider !== 'none') {
      // Cascade to offline snapshot
      const offlineResult = await searchNone(sanitizedQuery, safeOptions);
      if (offlineResult && offlineResult.items.length > 0) {
        searchResult = {
          provider: 'none',
          fallbackFrom: activeProvider,
          items: offlineResult.items,
          headsUp: offlineResult.headsUp,
          error: searchResult.error
        };
      }
    }
  }

  // Ensure normalized items
  const items = Array.isArray(searchResult.items) ? searchResult.items : [];
  const headsUp = searchResult.headsUp || formatScreenMinimizingOutput(items);

  const finalOutput = {
    provider: searchResult.provider || activeProvider,
    items,
    headsUp,
    error: searchResult.error || null,
    cached: false
  };

  // Cache the normalized response
  searchCache.set(cacheKey, finalOutput, activeProvider);

  return finalOutput;
}

/**
 * Returns single screen-minimizing heads-up item for a given location or query.
 */
export async function getSearchHeadsUp(query = '', options = {}) {
  const result = await search(query, options);
  return result.headsUp;
}

/**
 * Authoritative Guardrail Safety Invariant:
 * Deterministic scoring (server/services/scoring.js) and guardrails (server/services/guardrails.js)
 * remain strictly authoritative over all search and LLM output.
 * Search output may only ADD caution (lower score, add alert note), NEVER relax safety.
 * 
 * @param {number} baseScore - Deterministically computed green score (0-100)
 * @param {object} guardrails - Evaluated safety guardrails object
 * @param {object|null} searchHeadsUp - Screen-minimizing search notice
 * @returns {{ score: number, cautioned: boolean, healthNotes: string[] }}
 */
export function mergeSearchCaution(baseScore, guardrails = null, searchHeadsUp = null) {
  let score = Number(baseScore);
  if (isNaN(score)) score = 0;

  // Search output can NEVER increase the score above baseScore
  let cautioned = false;
  const extraNotes = [];

  if (searchHeadsUp) {
    const isAlert = searchHeadsUp.type === 'safetyAlert' || searchHeadsUp.type === 'alert';
    const isClosure = searchHeadsUp.type === 'closure';

    if (isAlert) {
      // Official weather/hazard alert lowers score by up to 15 points
      score = Math.max(0, score - 15);
      cautioned = true;
      extraNotes.push(`[Official Advisory: ${searchHeadsUp.domain}] ${searchHeadsUp.text}`);
    } else if (isClosure) {
      // Park closure alert lowers score by 10 points
      score = Math.max(0, score - 10);
      cautioned = true;
      extraNotes.push(`[Park Notice: ${searchHeadsUp.domain}] ${searchHeadsUp.text}`);
    }
  }

  // Guardrail Invariant: If guardrails already flagged hazardous conditions,
  // score cannot be elevated, and effort cannot be relaxed.
  if (guardrails?.flags?.hazardousAqi) {
    score = Math.min(score, 25);
  }

  return {
    score: Math.min(baseScore, score), // Invariant: score <= baseScore
    cautioned,
    healthNotes: extraNotes
  };
}
