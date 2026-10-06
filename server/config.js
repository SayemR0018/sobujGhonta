import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '10000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // LLM Configuration
  llmProvider: process.env.LLM_PROVIDER || (process.env.GEMMA_API_KEY ? 'gemma_api' : 'mock'),
  gemmaApiKey: process.env.GEMMA_API_KEY || '',
  gemmaModel: process.env.GEMMA_MODEL || 'gemma-3-27b-it',

  // Ollama Configuration
  ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
  ollamaModel: process.env.OLLAMA_MODEL || 'gemma2:9b',

  // ElevenLabs Configuration
  ttsProvider: process.env.TTS_PROVIDER || (process.env.ELEVENLABS_API_KEY ? 'elevenlabs' : 'browser'),
  elevenlabsApiKey: process.env.ELEVENLABS_API_KEY || '',
  elevenlabsVoiceId: process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM', // Rachel
  elevenlabsModel: process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2'
};
