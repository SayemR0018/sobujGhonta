import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '10000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // LLM Configuration
  llmProvider: process.env.LLM_PROVIDER || ((process.env.GEMMA_API_KEY || process.env.GEMINI_API_KEY) ? 'gemma_api' : 'mock'),
  gemmaApiKey: process.env.GEMMA_API_KEY || process.env.GEMINI_API_KEY || '',
  gemmaModel: process.env.GEMMA_MODEL || 'gemma-4-26b-a4b-it',

  // Ollama Configuration
  ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
  ollamaModel: process.env.OLLAMA_MODEL || 'gemma2:9b',

  // Text-to-Speech Configuration (Free provider chain: auto | gemini | mms | browser | none)
  ttsProvider: process.env.TTS_PROVIDER || 'auto',
  geminiApiKey: process.env.GEMINI_API_KEY || process.env.GEMMA_API_KEY || '',
  geminiTtsModel: process.env.GEMINI_TTS_MODEL || 'gemini-3.8-flash-tts',
  geminiTtsVoice: process.env.GEMINI_TTS_VOICE || 'Kore',
  hfToken: process.env.HF_TOKEN || '',
  sarvamApiKey: process.env.SARVAM_API_KEY || ''
};
