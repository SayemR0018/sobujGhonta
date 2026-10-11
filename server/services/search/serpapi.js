/**
 * server/services/search/serpapi.js
 * 
 * SerpApi client adapter.
 * Uses official SerpApi Google Search engine endpoint (https://serpapi.com/search.json).
 * Handles rate limits, authentication errors, timeouts, and result normalization.
 */

import { sanitizeAndNormalizeSearchItem } from './normalizer.js';

const SERPAPI_ENDPOINT = 'https://serpapi.com/search.json';
const REQUEST_TIMEOUT_MS = 5000;

/**
 * Parses and normalizes recorded or raw SerpApi payload.
 */
export function parseSerpApiPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const results = payload.organic_results;
  if (!Array.isArray(results)) {
    return [];
  }

  return results
    .map(sanitizeAndNormalizeSearchItem)
    .filter((item) => item !== null);
}

/**
 * Executes a search query against SerpApi.
 * 
 * @param {string} query - Search term
 * @param {object} options - Search options { apiKey, lat, lon, city, location, hl, gl }
 * @returns {Promise<{ provider: string, items: Array, rawCount?: number, error?: string, fallback?: boolean, keyError?: boolean }>}
 */
export async function searchSerpApi(query, options = {}) {
  const apiKey = options.apiKey || process.env.SERPAPI_API_KEY;

  if (!apiKey) {
    return {
      provider: 'none',
      fallback: true,
      keyError: true,
      items: [],
      error: 'Missing SERPAPI_API_KEY'
    };
  }

  const url = new URL(SERPAPI_ENDPOINT);
  url.searchParams.set('engine', 'google');
  url.searchParams.set('q', query);
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('num', '10');

  if (options.location) {
    url.searchParams.set('location', options.location);
  } else if (options.city) {
    url.searchParams.set('location', options.city);
  }

  if (options.hl) url.searchParams.set('hl', options.hl);
  if (options.gl) url.searchParams.set('gl', options.gl);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.status === 429) {
      return {
        provider: 'none',
        fallback: true,
        items: [],
        error: 'Upstream rate limit exceeded; fallback to offline'
      };
    }

    if (response.status === 401 || response.status === 403) {
      return {
        provider: 'none',
        fallback: true,
        keyError: true,
        items: [],
        error: `SerpApi authentication error (HTTP ${response.status})`
      };
    }

    if (response.status >= 500) {
      return {
        provider: 'none',
        fallback: true,
        items: [],
        error: `SerpApi server error (HTTP ${response.status})`
      };
    }

    const text = await response.text();
    if (!text || !text.trim()) {
      return { provider: 'serpapi', items: [] };
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return {
        provider: 'none',
        fallback: true,
        items: [],
        error: 'Malformed JSON response from SerpApi'
      };
    }

    const items = parseSerpApiPayload(data);
    return {
      provider: 'serpapi',
      items,
      rawCount: Array.isArray(data.organic_results) ? data.organic_results.length : 0
    };
  } catch (err) {
    clearTimeout(timeoutId);
    return {
      provider: 'none',
      fallback: true,
      items: [],
      error: err.name === 'AbortError' ? 'SerpApi request timed out (5000ms)' : err.message
    };
  }
}
