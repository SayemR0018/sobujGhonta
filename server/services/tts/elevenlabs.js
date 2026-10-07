import { config } from '../../config.js';

/**
 * In-memory monthly character counter for ElevenLabs free-tier credit protection.
 * Default cap: 8,000 chars/month (~8-10 mins of speech, leaving safety buffer on 10k free tier).
 */
let monthlyCharactersUsed = 0;

export function getElevenLabsMonthlyCharUsage() {
  return monthlyCharactersUsed;
}

export function resetElevenLabsMonthlyChars() {
  monthlyCharactersUsed = 0;
}

export function setElevenLabsMonthlyChars(count) {
  monthlyCharactersUsed = Number(count) || 0;
}

export function incrementElevenLabsMonthlyChars(chars) {
  monthlyCharactersUsed += Number(chars) || 0;
}

/**
 * Resolves voice ID with precedence:
 * 1. Explicit customVoiceId parameter
 * 2. Language override (ELEVENLABS_VOICE_ID_BN for bn, ELEVENLABS_VOICE_ID_EN for en)
 * 3. General ELEVENLABS_VOICE_ID from config
 * 4. Default library voice ID: jUjRbhZWoMK4aDciW36V ("Anika")
 */
export function resolveElevenLabsVoiceId(language = 'en', customVoiceId = null) {
  if (customVoiceId && typeof customVoiceId === 'string' && customVoiceId.trim().length > 0) {
    return customVoiceId.trim();
  }

  const isBn = language === 'bn' || language === 'bn-BD';
  if (isBn && config.elevenlabsVoiceIdBn && config.elevenlabsVoiceIdBn.trim().length > 0) {
    return config.elevenlabsVoiceIdBn.trim();
  }
  if (!isBn && config.elevenlabsVoiceIdEn && config.elevenlabsVoiceIdEn.trim().length > 0) {
    return config.elevenlabsVoiceIdEn.trim();
  }

  if (config.elevenlabsVoiceId && config.elevenlabsVoiceId.trim().length > 0) {
    return config.elevenlabsVoiceId.trim();
  }

  return 'jUjRbhZWoMK4aDciW36V';
}

/**
 * Default walking-guide voice settings verified against ElevenLabs API documentation
 */
export const DEFAULT_ELEVENLABS_SETTINGS = {
  speed: 0.9,
  stability: 0.5,
  similarity_boost: 0.75,
  style: 0.0,
  use_speaker_boost: true
};

/**
 * Synthesizes speech using ElevenLabs Text-to-Speech API.
 * Never prints or leaks ELEVENLABS_API_KEY. Redacts sensitive parameters from logs.
 */
export async function synthesizeWithElevenLabs({
  text,
  voiceId = null,
  language = 'en',
  modelId = null,
  settings = null
}) {
  if (!config.elevenlabsApiKey) {
    return {
      success: false,
      reason: 'ELEVENLABS_API_KEY not configured'
    };
  }

  const trimmedText = String(text || '').trim().slice(0, 600);
  if (!trimmedText) {
    return {
      success: false,
      reason: 'Empty text input'
    };
  }

  // Enforce monthly character budget
  const currentUsage = getElevenLabsMonthlyCharUsage();
  if (currentUsage + trimmedText.length > config.elevenlabsMonthlyCharCap) {
    console.log(
      `[TTS ElevenLabs] Monthly character cap reached (${currentUsage} / ${config.elevenlabsMonthlyCharCap}). Falling through to next provider.`
    );
    return {
      success: false,
      reason: `Monthly character cap of ${config.elevenlabsMonthlyCharCap} reached (${currentUsage} chars used)`
    };
  }

  const voice = resolveElevenLabsVoiceId(language, voiceId);
  const model = modelId || config.elevenlabsModelId || 'eleven_multilingual_v2';
  const voiceSettings = { ...DEFAULT_ELEVENLABS_SETTINGS, ...(settings || {}) };

  const endpoint = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'xi-api-key': config.elevenlabsApiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
      },
      body: JSON.stringify({
        text: trimmedText,
        model_id: model,
        voice_settings: voiceSettings
      })
    });

    if (!response.ok) {
      let errorDetail = '';
      try {
        const errJson = await response.json();
        errorDetail = errJson?.detail?.message || errJson?.message || JSON.stringify(errJson);
      } catch {
        errorDetail = response.statusText;
      }

      // Check specifically for library voice / permission / payment refusal on free tiers
      if (response.status === 402 || response.status === 403) {
        const helpfulMsg =
          `ElevenLabs voice "${voice}" permission/payment error (HTTP ${response.status}). ` +
          `Action: Add the voice via "Use voice" in your ElevenLabs VoiceLab account, ` +
          `or set ELEVENLABS_VOICE_ID to a default voice from GET /v1/voices. Detail: ${errorDetail}`;
        console.warn(`[TTS ElevenLabs] ${helpfulMsg}`);
        return {
          success: false,
          status: response.status,
          reason: helpfulMsg
        };
      }

      console.warn(`[TTS ElevenLabs] API call failed with HTTP ${response.status}: ${errorDetail}`);
      return {
        success: false,
        status: response.status,
        reason: `ElevenLabs HTTP ${response.status}: ${errorDetail}`
      };
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    incrementElevenLabsMonthlyChars(trimmedText.length);

    console.log(
      `[TTS ElevenLabs] Synthesized ${trimmedText.length} chars (voice: ${voice}, model: ${model}). ` +
      `Monthly total: ${getElevenLabsMonthlyCharUsage()} / ${config.elevenlabsMonthlyCharCap}`
    );

    return {
      success: true,
      audioBuffer,
      contentType: 'audio/mpeg',
      provider: 'elevenlabs',
      voiceId: voice,
      modelId: model,
      charactersUsed: trimmedText.length
    };
  } catch (err) {
    console.warn(`[TTS ElevenLabs] Network/Request error: ${err.message}`);
    return {
      success: false,
      reason: `ElevenLabs network error: ${err.message}`
    };
  }
}
