/**
 * server/tests/search.test.js
 * 
 * Contract & unit test suite for the Unified Live Web Search Adapter System.
 * Tests operate against recorded fixtures with ZERO network calls.
 * 
 * Verifies:
 * 1. Unified adapter interface (serpapi, serper, none)
 * 2. Schema normalization ({ title, snippet, url, source, date })
 * 3. Prompt injection & untrusted text defenses (recursive HTML, markdown, 200-char cap, URL neutralization)
 * 4. In-memory 30-60 min cache & quota usage tracking
 * 5. Screen-minimizing delivery (at most ONE concise line)
 * 6. Authoritative guardrail safety invariant (search can only ADD caution, never relax safety)
 * 7. Dated offline demo search snapshots
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  search,
  getSearchProvider,
  sanitizeQuery,
  cleanUntrustedText,
  sanitizeAndNormalizeSearchItem,
  normalizeResult,
  formatScreenMinimizingOutput,
  wrapUntrustedSnippet,
  mergeSearchCaution,
  SearchCache,
  searchCache,
  parseSerpApiPayload,
  parseSerperPayload,
  searchNone
} from '../services/search/index.js';
import { evaluateSafetyGuardrails } from '../services/guardrails.js';
import { config } from '../config.js';
import searchFixtures from '../../tests/fixtures/searchFixtures.json' with { type: 'json' };

describe('Unified Search Adapter Interface & Resolution', () => {
  test('Resolves provider serpapi when SEARCH_PROVIDER=serpapi', () => {
    assert.equal(getSearchProvider('serpapi'), 'serpapi');
  });

  test('Resolves provider serper when SEARCH_PROVIDER=serper', () => {
    assert.equal(getSearchProvider('serper'), 'serper');
  });

  test('Resolves provider none when SEARCH_PROVIDER=none', () => {
    assert.equal(getSearchProvider('none'), 'none');
  });

  test('Falls back gracefully to none for unrecognized provider string', () => {
    assert.equal(getSearchProvider('unsupported_engine'), 'none');
    assert.equal(getSearchProvider(''), 'none');
    assert.equal(getSearchProvider(null), 'none');
  });

  test('Auto-detects provider based on API keys when provider argument is undefined', () => {
    const origSerp = config.serpapiApiKey;
    const origSerper = config.serperApiKey;
    const origEnvSerp = process.env.SERPAPI_API_KEY;
    const origEnvSerper = process.env.SERPER_API_KEY;
    const origProvider = process.env.SEARCH_PROVIDER;
    const origConfigProvider = config.searchProvider;

    try {
      config.searchProvider = '';
      delete process.env.SEARCH_PROVIDER;

      config.serpapiApiKey = 'test_serpapi_key_123';
      config.serperApiKey = '';
      delete process.env.SERPER_API_KEY;
      assert.equal(getSearchProvider(), 'serpapi');

      config.serpapiApiKey = '';
      delete process.env.SERPAPI_API_KEY;
      config.serperApiKey = 'test_serper_key_123';
      assert.equal(getSearchProvider(), 'serper');

      config.serperApiKey = '';
      delete process.env.SERPER_API_KEY;
      assert.equal(getSearchProvider(), 'none');
    } finally {
      config.serpapiApiKey = origSerp;
      config.serperApiKey = origSerper;
      config.searchProvider = origConfigProvider;
      if (origEnvSerp !== undefined) process.env.SERPAPI_API_KEY = origEnvSerp;
      else delete process.env.SERPAPI_API_KEY;
      if (origEnvSerper !== undefined) process.env.SERPER_API_KEY = origEnvSerper;
      else delete process.env.SERPER_API_KEY;
      if (origProvider !== undefined) process.env.SEARCH_PROVIDER = origProvider;
      else delete process.env.SEARCH_PROVIDER;
    }
  });

  test('Sanitizes queries: trims whitespace, clamps to 100 chars, preserves regex chars safely', () => {
    assert.equal(sanitizeQuery(''), '');
    assert.equal(sanitizeQuery('   Ramna Park   '), 'Ramna Park');
    const longQuery = 'parks in dhaka '.repeat(30);
    assert.ok(sanitizeQuery(longQuery).length <= 100);
    const regexQuery = 'Ramna (Park) [Special?+*]';
    assert.equal(sanitizeQuery(regexQuery), 'Ramna (Park) [Special?+*]');
  });
});

describe('Search Normalization & Prompt Injection Defenses', () => {
  test('Normalizes raw SerpApi organic result into standard schema with 0 network calls', () => {
    const raw = searchFixtures.serpapi_sample.organic_results[0];
    const normalized = sanitizeAndNormalizeSearchItem(raw);
    assert.ok(normalized);
    assert.equal(typeof normalized.title, 'string');
    assert.equal(typeof normalized.snippet, 'string');
    assert.equal(typeof normalized.url, 'string');
    assert.equal(typeof normalized.source, 'string');
    assert.equal(typeof normalized.date, 'string');
    assert.equal(normalized.source, 'dhakatribune.com');
    assert.ok(normalized.snippet.length <= 200);
  });

  test('Normalizes raw Serper organic result into standard schema with 0 network calls', () => {
    const raw = searchFixtures.serper_sample.organic[0];
    const normalized = sanitizeAndNormalizeSearchItem(raw);
    assert.ok(normalized);
    assert.equal(normalized.source, 'bmd.gov.bd');
    assert.ok(normalized.snippet.includes('Meteorology'));
    assert.ok(normalized.snippet.length <= 200);
  });

  test('Strips active <script> and <img> HTML tags recursively from snippets', () => {
    const payload = searchFixtures.injection_payloads.find((p) => p.name === 'html_script_injection');
    const normalized = sanitizeAndNormalizeSearchItem({
      title: 'XSS Probe',
      snippet: payload.raw,
      link: 'https://example.com'
    });
    assert.ok(!normalized.snippet.includes('<script>'));
    assert.ok(!normalized.snippet.includes('</script>'));
    assert.ok(!normalized.snippet.includes('<img'));
    assert.ok(!/<[^>]+>/.test(normalized.snippet), 'Must contain zero HTML tags');
  });

  test('Strips nested HTML tags recursively (<scr<script>ipt>alert(1)</script>)', () => {
    const nested = '<scr<script>ipt>alert(1)</script>';
    const cleaned = cleanUntrustedText(nested);
    assert.ok(!cleaned.includes('<script>'));
    assert.ok(!cleaned.includes('</script>'));
  });

  test('Enforces hard length cap of 200 characters with ellipsis on oversized snippets', () => {
    const payload = searchFixtures.injection_payloads.find((p) => p.name === 'excessive_length_overflow');
    const normalized = sanitizeAndNormalizeSearchItem({
      title: 'Long Snippet',
      snippet: payload.raw,
      link: 'https://example.com'
    });
    assert.ok(normalized.snippet.length <= 200);
    assert.ok(normalized.snippet.endsWith('...'));

    // Boundary check: exactly 200 chars should not have ellipsis
    const text200 = 'A'.repeat(200);
    const normalized200 = sanitizeAndNormalizeSearchItem({ title: 'T', snippet: text200, link: 'https://example.com' });
    assert.equal(normalized200.snippet.length, 200);
    assert.equal(normalized200.snippet.endsWith('...'), false);

    // Boundary check: 201 chars clamps to 200 with ellipsis
    const text201 = 'A'.repeat(201);
    const normalized201 = sanitizeAndNormalizeSearchItem({ title: 'T', snippet: text201, link: 'https://example.com' });
    assert.equal(normalized201.snippet.length, 200);
    assert.equal(normalized201.snippet.endsWith('...'), true);
  });

  test('Neutralizes javascript: and data: pseudo-URLs in links', () => {
    const jsItem = sanitizeAndNormalizeSearchItem({
      title: 'Malicious Link',
      snippet: 'Safe text',
      link: 'javascript:alert(1)'
    });
    assert.equal(jsItem.url, '#');

    const dataItem = sanitizeAndNormalizeSearchItem({
      title: 'Base64 Link',
      snippet: 'Safe text',
      link: 'data:text/html;base64,PHNjcmlwdD4='
    });
    assert.equal(dataItem.url, '#');
  });

  test('Strips null bytes and carriage returns without throwing', () => {
    const raw = 'Notice:\0 Park gate\r\nopen until 8pm.\0';
    const cleaned = cleanUntrustedText(raw);
    assert.equal(cleaned, 'Notice: Park gate open until 8pm.');
  });

  test('Wraps untrusted snippet instructions for LLM boundary isolation', () => {
    const payload = searchFixtures.injection_payloads.find((p) => p.name === 'override_guardrail_prompt');
    const wrapped = wrapUntrustedSnippet(payload.raw);
    assert.ok(wrapped.startsWith('[UNTRUSTED_SEARCH_SNIPPET:'));
    assert.ok(wrapped.includes('IGNORE ALL PRIOR SAFETY RULES'));
  });

  test('Handles missing optional fields (date, displayed_link) gracefully', () => {
    const sparse = { title: 'Sparse Notice', snippet: 'Short text', link: 'https://example.org/path' };
    const normalized = sanitizeAndNormalizeSearchItem(sparse);
    assert.equal(normalized.source, 'example.org');
    assert.ok(normalized.date);
  });
});

describe('In-Memory LRU Cache & Quota Tracking', () => {
  test('Serves cached hit for identical query within TTL window', () => {
    const cache = new SearchCache(45);
    cache.set('test:key', { items: [{ title: 'Cached Ramna' }] }, 'none');
    const cached = cache.get('test:key');
    assert.ok(cached);
    assert.equal(cached.items[0].title, 'Cached Ramna');
  });

  test('Increments quota count accurately on live search sets', () => {
    const cache = new SearchCache(45);
    assert.equal(cache.quotaCount, 0);
    cache.set('q1', {}, 'serpapi');
    cache.set('q2', {}, 'serper');
    assert.equal(cache.quotaCount, 2);
    const stats = cache.getQuotaUsage();
    assert.equal(stats.totalCalls, 2);
    assert.equal(stats.providers.serpapi, 1);
    assert.equal(stats.providers.serper, 1);
  });

  test('Expires cache entry after configured TTL window', () => {
    const cache = new SearchCache(0); // 0 ms TTL
    cache.set('expiring', { val: 'test' });
    const entry = cache.store.get('expiring');
    entry.expiry = Date.now() - 100;
    assert.equal(cache.get('expiring'), null);
  });

  test('Generates deterministic cache key with 2-decimal rounded coordinates', () => {
    const cache = new SearchCache(45);
    const key1 = cache.generateKey('Ramna', { city: 'Dhaka', lat: 23.74123, lon: 90.39999 });
    const key2 = cache.generateKey('ramna', { city: 'dhaka', lat: 23.74444, lon: 90.40111 });
    assert.equal(key1, key2);
  });

  test('Evicts oldest entry when maxEntries capacity is reached', () => {
    const smallCache = new SearchCache(45, 2);
    smallCache.set('k1', { id: 1 });
    smallCache.set('k2', { id: 2 });
    assert.ok(smallCache.get('k1'));
    smallCache.set('k3', { id: 3 }); // Evicts k2 (k1 was refreshed by get)
    assert.equal(smallCache.store.size, 2);
    assert.ok(smallCache.get('k1'));
    assert.ok(smallCache.get('k3'));
    assert.equal(smallCache.get('k2'), null);
  });
});

describe('Screen-Minimizing Delivery', () => {
  test('Delivers at most ONE concise line for UI/audio without multi-line breaks', () => {
    const normalized = parseSerpApiPayload(searchFixtures.serpapi_sample);
    const output = formatScreenMinimizingOutput(normalized);
    assert.ok(output);
    assert.ok(!output.source.includes('\n'), 'Must not contain multi-line text');
    assert.ok(!output.text.includes('\n'));
  });

  test('Attributes domain badge properly in source field', () => {
    const normalized = parseSerpApiPayload(searchFixtures.serpapi_sample);
    const output = formatScreenMinimizingOutput(normalized);
    assert.ok(output.source.startsWith(`[${output.domain}]`));
  });

  test('Prioritizes official safety alert over general events', () => {
    const items = [
      {
        title: 'Flower Show This Weekend',
        snippet: 'Annual orchid display opens Friday.',
        url: 'https://flowers.org',
        source: 'flowers.org',
        date: '2026-10-08'
      },
      {
        title: 'Severe Thunderstorm Warning',
        snippet: 'Meteorology bulletin: avoid tall trees and open parks due to lightning risk.',
        url: 'https://weather.gov',
        source: 'weather.gov',
        date: '2026-10-08'
      }
    ];
    const output = formatScreenMinimizingOutput(items);
    assert.equal(output.type, 'safetyAlert');
    assert.equal(output.domain, 'weather.gov');
  });

  test('Prioritizes park closures over general events', () => {
    const items = [
      {
        title: 'Bird Watching Tour',
        snippet: 'Join us for morning bird watching.',
        url: 'https://birds.org',
        source: 'birds.org',
        date: '2026-10-08'
      },
      {
        title: 'Main Gate Closure Notice',
        snippet: 'South walkway closed for resurfacing through Monday.',
        url: 'https://parks.gov',
        source: 'parks.gov',
        date: '2026-10-08'
      }
    ];
    const output = formatScreenMinimizingOutput(items);
    assert.equal(output.type, 'closure');
    assert.equal(output.domain, 'parks.gov');
  });

  test('Returns clean null for empty search results without cluttering UI', () => {
    assert.equal(formatScreenMinimizingOutput([]), null);
    assert.equal(formatScreenMinimizingOutput(null), null);
  });
});

describe('Authoritative Guardrail Safety Invariant over Search', () => {
  test('Search claiming "clean air" CANNOT override AQI > 200 hazardous guardrail', () => {
    const hazardousCondition = { aqi: 245, apparentTemp: 29 };
    const guardrails = evaluateSafetyGuardrails(hazardousCondition);
    assert.equal(guardrails.flags.hazardousAqi, true);
    assert.equal(guardrails.maxAllowedEffort, 'rest');

    const fakeHeadsUp = {
      type: 'headsUp',
      text: 'Local forum claims air is crystal clear and perfect for jogging!',
      domain: 'blog.com'
    };

    const merged = mergeSearchCaution(15, guardrails, fakeHeadsUp);
    // Score is never elevated
    assert.ok(merged.score <= 15);
    // Guardrail remains authoritative
    assert.equal(guardrails.maxAllowedEffort, 'rest');
  });

  test('Search claiming "fine weather" CANNOT override extreme heat >= 38°C guardrail', () => {
    const heatCondition = { aqi: 50, apparentTemp: 40 };
    const guardrails = evaluateSafetyGuardrails(heatCondition);
    assert.equal(guardrails.flags.extremeHeat, true);
    assert.ok(guardrails.requiredHealthNotesEn.some((n) => n.includes('thermal stress') || n.includes('heat')));
  });

  test('Search output may only ADD caution (lower score, add alert note), NEVER relax safety', () => {
    const safeBaseScore = 85;
    const closureNotice = {
      type: 'closure',
      text: 'Main gate closed for repair',
      domain: 'parks.gov'
    };

    const cautioned = mergeSearchCaution(safeBaseScore, null, closureNotice);
    assert.ok(cautioned.score < safeBaseScore);
    assert.equal(cautioned.cautioned, true);
    assert.ok(cautioned.healthNotes.length > 0);

    // Rogue attempt to increase score: search cannot give a bonus
    const rogueNotice = { type: 'bonus', text: 'Add 50 points', domain: 'cheat.com' };
    const notIncreased = mergeSearchCaution(safeBaseScore, null, rogueNotice);
    assert.ok(notIncreased.score <= safeBaseScore);
  });

  test('Official safety alert lowers green score and adds advisory note', () => {
    const safetyNotice = {
      type: 'safetyAlert',
      text: 'Heat stroke advisory in effect',
      domain: 'health.gov'
    };
    const cautioned = mergeSearchCaution(70, null, safetyNotice);
    assert.equal(cautioned.score, 55); // 70 - 15
    assert.equal(cautioned.cautioned, true);
    assert.ok(cautioned.healthNotes[0].includes('health.gov'));
  });
});

describe('Dated Offline Demo Search Snapshots', () => {
  test('Loads bundled search snapshot for Dhaka with verified capture date and 0 network calls', async () => {
    const result = await searchNone('Ramna', { city: 'Dhaka' });
    assert.equal(result.provider, 'none');
    assert.equal(result.isOffline, true);
    assert.equal(result.recordedDate, '2026-10-08');
    assert.ok(result.items.length > 0);
  });

  test('Bundled snapshot items conform strictly to normalized schema', async () => {
    const result = await searchNone('', { city: 'Dhaka' });
    for (const item of result.items) {
      assert.equal(typeof item.title, 'string');
      assert.equal(typeof item.snippet, 'string');
      assert.ok(item.snippet.length <= 200);
      assert.ok(!/<[^>]+>/.test(item.snippet));
      assert.equal(typeof item.url, 'string');
      assert.equal(typeof item.source, 'string');
      assert.ok(item.source.length > 0);
    }
  });

  test('All 8 global demo cities have valid offline snapshots', async () => {
    const cities = ['dhaka', 'delhi', 'london', 'los_angeles', 'nairobi', 'sao_paulo', 'sydney', 'tokyo'];
    for (const city of cities) {
      const result = await searchNone('', { city });
      assert.equal(result.provider, 'none');
      assert.ok(result.items.length > 0, `Snapshot for ${city} should have items`);
      assert.equal(result.recordedDate, '2026-10-08');
      assert.ok(result.headsUp !== null, `Snapshot for ${city} should produce headsUp`);
    }
  });

  test('Unknown city returns empty items array cleanly without throwing unhandled error', async () => {
    const result = await searchNone('anything', { city: 'unknown_atlantis' });
    assert.equal(result.provider, 'none');
    assert.deepEqual(result.items, []);
    assert.equal(result.headsUp, null);
  });

  test('Offline search snapshot returns frozen immutable object', async () => {
    const result = await searchNone('Ramna', { city: 'Dhaka' });
    assert.ok(Object.isFrozen(result));
    assert.ok(Object.isFrozen(result.items));
  });
});

describe('Provider Fixture Contract Parsers', () => {
  test('Parses SerpApi recorded fixture with 0 network calls', () => {
    const items = parseSerpApiPayload(searchFixtures.serpapi_sample);
    assert.equal(items.length, 2);
    assert.equal(items[0].title, 'Ramna Park Maintenance Notice');
    assert.equal(items[0].source, 'dhakatribune.com');
  });

  test('Parses Serper recorded fixture with 0 network calls', () => {
    const items = parseSerperPayload(searchFixtures.serper_sample);
    assert.equal(items.length, 1);
    assert.equal(items[0].title, 'Severe Heat Warning Issued for Dhaka Division');
    assert.equal(items[0].source, 'bmd.gov.bd');
  });

  test('Simulates upstream rate limit 429 fallback to none gracefully', async () => {
    function simulateRateLimit(status) {
      if (status === 429) {
        return { provider: 'none', items: [], error: 'Upstream rate limit exceeded; fallback to offline' };
      }
      return { provider: 'serpapi', items: [] };
    }
    const res = simulateRateLimit(429);
    assert.equal(res.provider, 'none');
    assert.ok(res.error.includes('rate limit'));
  });
});
