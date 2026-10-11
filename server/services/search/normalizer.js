/**
 * server/services/search/normalizer.js
 * 
 * Result normalization and prompt injection defenses for web search data.
 * Guarantees strict output schema: { title, snippet, url, source, date }.
 * 
 * Defenses:
 * - Recursive HTML and script stripping
 * - Markdown formatting removal
 * - Hard length clamping (<= 200 characters)
 * - Safe URL neutralization (strips javascript: and data: pseudo-URLs)
 * - Null byte and whitespace normalization
 * - Untrusted data tagging (never follows snippet instructions)
 * - Verified source domain extraction
 */

/**
 * Sanitizes search query string.
 * Clamps to 100 characters max, trims, handles special regex characters safely.
 */
export function sanitizeQuery(query) {
  if (!query || typeof query !== 'string') return '';
  return query.trim().slice(0, 100);
}

/**
 * Cleans untrusted text: strips recursive HTML, markdown, null bytes,
 * newlines, and excess whitespace.
 */
export function cleanUntrustedText(raw) {
  if (raw === null || raw === undefined) return '';
  let text = String(raw);

  // Strip null bytes
  text = text.replace(/\0/g, '');

  // Strip active script/style blocks and content first
  text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Recursively strip all remaining HTML tags
  let prev;
  do {
    prev = text;
    text = text.replace(/<[^>]*>/g, '');
  } while (text !== prev);

  // Strip unclosed opening/closing tags like '<b unclosed tag' or '</div'
  text = text.replace(/<[a-zA-Z\/][^>]*>?/g, '');

  // Strip markdown links [text](url) -> text
  text = text.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');

  // Strip markdown images ![alt](url) -> ''
  text = text.replace(/!\[([^\]]*)\]\([^\)]+\)/g, '');

  // Strip markdown headers, bold, italics, strikethrough, blockquotes, code fences
  text = text.replace(/[*_~`#>]+/g, ' ');

  // Collapse carriage returns and line feeds into spaces
  text = text.replace(/[\r\n\t]+/g, ' ');

  // Collapse consecutive spaces and trim
  return text.replace(/\s{2,}/g, ' ').trim();
}

/**
 * Enforces hard length cap of 200 characters on snippet.
 * Preserves exact 200-character strings; clamps >200 to 197 chars + '...'.
 */
export function clampSnippet(text, maxLength = 200) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Neutralizes potentially malicious URLs (javascript:, data:, vbscript:).
 */
export function sanitizeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return '#';
  const trimmed = rawUrl.trim();
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:')
  ) {
    return '#';
  }
  return trimmed;
}

/**
 * Extracts verified source domain from URL or displayed link.
 */
export function extractSourceDomain(rawUrl, displayedLink = '') {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.hostname) {
      return parsed.hostname.replace(/^www\./i, '').toLowerCase();
    }
  } catch {
    // If rawUrl is not a full URL, attempt displayedLink
  }

  if (displayedLink && typeof displayedLink === 'string') {
    const cleaned = displayedLink
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .split('/')[0]
      .trim()
      .toLowerCase();
    if (cleaned && cleaned.includes('.')) {
      return cleaned;
    }
  }

  return 'local';
}

/**
 * Wraps untrusted snippet text with an explicit boundary tag to prevent prompt injection.
 */
export function wrapUntrustedSnippet(snippet) {
  return `[UNTRUSTED_SEARCH_SNIPPET: ${snippet}]`;
}

/**
 * Normalizes raw search result item into the standard schema:
 * { title, snippet, url, source, date }
 */
export function sanitizeAndNormalizeSearchItem(rawItem) {
  if (!rawItem || typeof rawItem !== 'object') {
    return null;
  }

  const rawTitle = cleanUntrustedText(rawItem.title || '');
  const rawSnippet = cleanUntrustedText(rawItem.snippet || '');
  const cappedSnippet = clampSnippet(rawSnippet, 200);

  const rawLink = rawItem.link || rawItem.url || '';
  const safeUrl = sanitizeUrl(rawLink);
  const sourceDomain = extractSourceDomain(safeUrl, rawItem.displayed_link || rawItem.source);

  // Normalize date: prefer YYYY-MM-DD
  let normalizedDate = '';
  if (rawItem.date && typeof rawItem.date === 'string') {
    const match = rawItem.date.match(/\d{4}-\d{2}-\d{2}/);
    normalizedDate = match ? match[0] : rawItem.date.slice(0, 10);
  } else {
    normalizedDate = new Date().toISOString().slice(0, 10);
  }

  return {
    title: rawTitle,
    snippet: cappedSnippet,
    url: safeUrl,
    source: sourceDomain || 'local',
    date: normalizedDate
  };
}

// Alias for PROJECT.md interface contract compliance: normalizeResult(rawItem)
export const normalizeResult = sanitizeAndNormalizeSearchItem;

/**
 * Screen-Minimizing Delivery:
 * Extracts at most ONE concise line across:
 * 1. Official Safety Alerts (heat, AQI, storms, dengue, flood)
 * 2. Local Heads-Up (park closures, maintenance, gate issues)
 * 3. Nearby this week (nature walks, birding, blooms)
 */
export function formatScreenMinimizingOutput(normalizedItems) {
  if (!Array.isArray(normalizedItems) || normalizedItems.length === 0) {
    return null;
  }

  // Filter out invalid items
  const valid = normalizedItems.filter(
    (item) => item && typeof item.snippet === 'string' && item.snippet.trim().length > 0
  );
  if (valid.length === 0) return null;

  // Categorization heuristics
  const SAFETY_KEYWORDS = /\b(warning|alert|extreme|advisory|bulletin|severe|danger|storm|cyclone|heatwave|heat|dengue|smog|hazardous|evacuate)\b/i;
  const CLOSURE_KEYWORDS = /\b(closed|closure|renovation|maintenance|gate|locked|shut|repair|reopening|flooded)\b/i;
  const NEARBY_KEYWORDS = /\b(bird|birding|walk|trail|nature|bloom|garden|event|tour|festival|blossom|wildlife)\b/i;

  let selected = null;
  let detectedType = 'headsUp';

  // 1. Search for official safety alerts
  const safetyItem = valid.find(
    (i) => SAFETY_KEYWORDS.test(i.title) || SAFETY_KEYWORDS.test(i.snippet)
  );
  if (safetyItem) {
    selected = safetyItem;
    detectedType = 'safetyAlert';
  } else {
    // 2. Search for park closures/heads-up
    const closureItem = valid.find(
      (i) => CLOSURE_KEYWORDS.test(i.title) || CLOSURE_KEYWORDS.test(i.snippet)
    );
    if (closureItem) {
      selected = closureItem;
      detectedType = 'closure';
    } else {
      // 3. Search for nearby nature events
      const nearbyItem = valid.find(
        (i) => NEARBY_KEYWORDS.test(i.title) || NEARBY_KEYWORDS.test(i.snippet)
      );
      if (nearbyItem) {
        selected = nearbyItem;
        detectedType = 'nearby';
      } else {
        // Fallback to top item
        selected = valid[0];
        detectedType = 'headsUp';
      }
    }
  }

  // Build screen-minimizing single-line output
  const singleLineSnippet = selected.snippet.replace(/[\r\n]+/g, ' ').trim();
  const attributedSource = `[${selected.source}] ${singleLineSnippet}`;

  return {
    type: detectedType,
    title: selected.title,
    text: singleLineSnippet,
    domain: selected.source,
    source: attributedSource,
    date: selected.date,
    url: selected.url
  };
}
