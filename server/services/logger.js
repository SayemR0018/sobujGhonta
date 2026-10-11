/**
 * server/services/logger.js
 * Redacting Server Logger for Sobuj Ghonta (সবুজ ঘণ্টা)
 *
 * Automatically redacts secrets and sensitive API tokens from log lines,
 * error stack traces, and query strings:
 * - Google AI Studio / Gemma keys (AIza...)
 * - ElevenLabs API keys (sk_...)
 * - Hugging Face tokens (hf_...)
 * - SerpApi 64-hex keys
 * - TabPFN tokens (tabpfn_...)
 * - URL query parameters containing keys
 */

export function redactSecretsFromText(rawText) {
  if (rawText === null || rawText === undefined) return '';
  let cleaned = String(rawText);

  // Redact Google / Gemma keys (AIza...)
  cleaned = cleaned.replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_GOOGLE_KEY]');
  // Redact ElevenLabs keys (sk_...)
  cleaned = cleaned.replace(/sk_[a-zA-Z0-9]{32,}/g, '[REDACTED_ELEVENLABS_KEY]');
  // Redact Hugging Face tokens (hf_...)
  cleaned = cleaned.replace(/hf_[a-zA-Z0-9]{34}/g, '[REDACTED_HF_TOKEN]');
  // Redact SerpApi 64-char hex keys
  cleaned = cleaned.replace(/[a-f0-9]{64}/g, '[REDACTED_HEX_KEY]');
  // Redact TabPFN tokens
  cleaned = cleaned.replace(/tabpfn_[a-zA-Z0-9]{24,}/g, '[REDACTED_TABPFN_TOKEN]');
  // Redact query parameter key patterns (e.g., key=AIza... or token=...)
  cleaned = cleaned.replace(/([?&](?:api_?key|key|token|access_token)=)[^&\s]+/gi, '$1[REDACTED]');

  return cleaned;
}

function formatArgs(args) {
  return args.map(arg => {
    if (typeof arg === 'string') {
      return redactSecretsFromText(arg);
    }
    if (arg instanceof Error) {
      return redactSecretsFromText(arg.stack || arg.message);
    }
    if (typeof arg === 'object' && arg !== null) {
      try {
        return redactSecretsFromText(JSON.stringify(arg));
      } catch {
        return String(arg);
      }
    }
    return arg;
  });
}

export const logger = {
  redact: redactSecretsFromText,
  log: (...args) => console.log(...formatArgs(args)),
  info: (...args) => console.info(...formatArgs(args)),
  warn: (...args) => console.warn(...formatArgs(args)),
  error: (...args) => console.error(...formatArgs(args))
};

export default logger;
