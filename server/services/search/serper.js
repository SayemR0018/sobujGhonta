/**
 * server/services/search/serper.js
 * 
 * Serper.dev client adapter.
 * Uses official Serper Google Search endpoint (https://google.serper.dev/search).
 * Handles rate limits, authentication errors, timeouts, and result normalization.
 */

import { sanitizeAndNormalizeSearchItem } from './normalizer.js';

const SERPER_ENDPOINT = 'https://google.serper.dev/search';
const REQUEST_TIMEOUT_MS = 5000;

/**
 * Parses and normalizes recorded or raw Serper payload.
 */
export function parseSerperPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const results = payload.organic;
  if (!Array.isArray(results)) {
    return [];
  }

  return results
    .map(sanitizeAndNormalizeSearchItem)
    .filter((item) => item !== null);
}

/**
 * Executes a search query against Serper.dev.
 * 
 * @param {string} query - Search term
 * @param {object} options - Search options { apiKey, gl, hl, city }
 * @returns {Promise<{ provider: string, items: Array, rawCount?: number, error?: string, fallback?: boolean, keyError?: boolean }>}
 */
export async function searchSerper(query, options = {}) {
  const apiKey = options.apiKey || process.env.SERPER_API_KEY;

  if (!apiKey) {
    return {
      provider: 'none',
      fallback: true,
      keyError: true,
      items: [],
      error: 'Missing SERPER_API_KEY'
    };
  }

  const bodyData = {
    q: query,
    num: 10
  };

  if (options.gl) bodyData.gl = options.gl;
  if (options.hl) bodyData.hl = options.hl;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(SERPER_ENDPOINT, {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bodyData),
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
        error: `Serper authentication error (HTTP ${response.status})`
      };
    }

    if (response.status >= 500) {
      return {
        provider: 'none',
        fallback: true,
        items: [],
        error: `Serper server error (HTTP ${response.status})`
      };
    }

    const text = await response.text();
    if (!text || !text.trim()) {
      return { provider: 'serper', items: [] };
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return {
        provider: 'none',
        fallback: true,
        items: [],
        error: 'Malformed JSON response from Serper'
      };
    }

    const items = parseSerperPayload(data);
    return {
      provider: 'serper',
      items,
      rawCount: Array.isArray(data.organic) ? data.organic.length : 0
    };
  } catch (err) {
    clearTimeout(timeoutId);
    return {
      provider: 'none',
      fallback: true,
      items: [],
      error: err.name === 'AbortError' ? 'Serper request timed out (5000ms)' : err.message
    };
  }
}
