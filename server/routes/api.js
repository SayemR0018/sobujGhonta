import express from 'express';
import { fetchWeatherData, searchCities } from '../services/weather.js';
import { findNearbyGreenSpaces } from '../services/places.js';
import { scoreForecastTimeline, calculateHourlyGreenWindowScore } from '../services/scoring.js';
import { generateGreenPlan, describeNaturePhoto } from '../services/llm/adapter.js';
import { synthesizeSpeech, MAX_CHARACTERS_PER_SEGMENT } from '../services/tts/index.js';
import {
  DHAKA_COORDINATES,
  DHAKA_PARKS,
  DHAKA_SAMPLE_WEATHER,
  DHAKA_PREGENERATED_PLAN_EN,
  DHAKA_PREGENERATED_PLAN_BN
} from '../services/demoData.js';

export const apiRouter = express.Router();

/**
 * Sanitizes and validates geographic coordinates
 */
function sanitizeCoords(rawLat, rawLon) {
  const lat = parseFloat(rawLat);
  const lon = parseFloat(rawLon);

  const isValidLat = Number.isFinite(lat) && lat >= -90 && lat <= 90;
  const isValidLon = Number.isFinite(lon) && lon >= -180 && lon <= 180;

  return {
    lat: isValidLat ? lat : DHAKA_COORDINATES.lat,
    lon: isValidLon ? lon : DHAKA_COORDINATES.lon
  };
}

/**
 * Health check endpoint
 */
apiRouter.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

/**
 * City search with input sanitization
 */
apiRouter.get('/cities', async (req, res) => {
  try {
    const rawQuery = String(req.query.query || '').trim().slice(0, 80);
    const results = await searchCities(rawQuery);
    res.json({ ok: true, cities: results });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * Combined weather, AQI, and 24h Green Window scores
 */
apiRouter.get('/weather', async (req, res) => {
  try {
    const { lat, lon } = sanitizeCoords(req.query.lat, req.query.lon);

    const weatherData = await fetchWeatherData(lat, lon);
    const scoreResult = scoreForecastTimeline(weatherData.hourly, weatherData.daily);

    // Compute score for current condition
    const currentEvaluation = calculateHourlyGreenWindowScore({
      aqi: weatherData.current.aqi,
      pm25: weatherData.current.pm25,
      apparentTemp: weatherData.current.apparentTemp,
      uv: weatherData.current.uv,
      precipProb: weatherData.current.precipProb,
      precip: weatherData.current.precip,
      weatherCode: weatherData.current.weatherCode,
      isDaylight: true
    });

    res.json({
      ok: true,
      fallback: weatherData.fallback,
      current: {
        ...weatherData.current,
        score: currentEvaluation.score,
        category: currentEvaluation.category,
        categoryBn: currentEvaluation.categoryBn,
        reasonsEn: currentEvaluation.reasonsEn,
        reasonsBn: currentEvaluation.reasonsBn
      },
      timeline: scoreResult.timeline,
      bestWindow: scoreResult.bestWindow
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * Discovers green spaces within ~3 km
 */
apiRouter.get('/places', async (req, res) => {
  try {
    const { lat, lon } = sanitizeCoords(req.query.lat, req.query.lon);

    const result = await findNearbyGreenSpaces(lat, lon);
    res.json({
      ok: true,
      fallback: result.fallback,
      spaces: result.spaces
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * Generates structured mindful green walk plan
 */
apiRouter.post('/plan', async (req, res) => {
  try {
    const rawMinutes = parseInt(req.body.minutes, 10);
    const minutes = Number.isFinite(rawMinutes) ? Math.min(180, Math.max(5, rawMinutes)) : 30;

    const validGoals = ['calm', 'exercise', 'birding', 'kids', 'elders'];
    const goal = validGoals.includes(req.body.goal) ? req.body.goal : 'calm';
    const language = req.body.language === 'bn' ? 'bn' : 'en';

    const { lat, lon } = sanitizeCoords(req.body.lat, req.body.lon);

    const [weatherData, placesData] = await Promise.all([
      fetchWeatherData(lat, lon),
      findNearbyGreenSpaces(lat, lon)
    ]);

    const scoreResult = scoreForecastTimeline(weatherData.hourly, weatherData.daily);

    const plan = await generateGreenPlan({
      minutes,
      goal,
      language,
      weatherSummary: weatherData.current,
      bestWindow: scoreResult.bestWindow,
      greenSpaces: placesData.spaces
    });

    res.json({
      ok: true,
      plan,
      weather: weatherData.current,
      bestWindow: scoreResult.bestWindow,
      greenSpaces: placesData.spaces
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * Free TTS synthesis proxy (Gemini 3.8 Flash TTS / Meta MMS-TTS / Browser fallback)
 */
apiRouter.post('/tts', async (req, res) => {
  try {
    const { text, voice, voiceId, language = 'en', provider } = req.body;
    const clientIp = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ ok: false, error: 'Text parameter is required' });
    }

    if (text.trim().length > MAX_CHARACTERS_PER_SEGMENT) {
      return res.status(400).json({
        ok: false,
        error: `Text exceeds maximum allowed length of ${MAX_CHARACTERS_PER_SEGMENT} characters`
      });
    }

    const ttsResult = await synthesizeSpeech({
      text: text.trim(),
      voice: voice || voiceId,
      language: language === 'bn' ? 'bn' : 'en',
      clientIp,
      providerOverride: provider
    });

    if (ttsResult.fallbackToBrowser) {
      return res.json({
        ok: true,
        fallbackToBrowser: true,
        text: ttsResult.text,
        language: ttsResult.language,
        provider: ttsResult.provider,
        reason: ttsResult.reason
      });
    }

    res.set({
      'Content-Type': ttsResult.contentType,
      'Content-Length': ttsResult.audioBuffer.length,
      'X-Audio-Hash': ttsResult.hash,
      'X-Audio-Cached': ttsResult.cached ? 'HIT' : 'MISS',
      'Cache-Control': 'public, max-age=604800, immutable'
    });

    res.send(ttsResult.audioBuffer);
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

/**
 * Nature Journal image description with explicit AI disclaimer
 */
apiRouter.post('/journal/describe', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', noteText = '', language = 'en' } = req.body;

    if (imageBase64 && typeof imageBase64 === 'string' && imageBase64.length > 10 * 1024 * 1024) {
      return res.status(400).json({ ok: false, error: 'Image exceeds maximum size of 10MB' });
    }

    const safeNote = String(noteText || '').slice(0, 1000);
    const safeLang = language === 'bn' ? 'bn' : 'en';

    const descriptionResult = await describeNaturePhoto({
      imageBase64,
      mimeType,
      userNote: safeNote,
      language: safeLang
    });

    res.json({ ok: true, ...descriptionResult });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * Bundled Dhaka Demo endpoint for zero-latency, zero-key evaluation
 */
apiRouter.get('/demo/dhaka', (req, res) => {
  const language = req.query.lang === 'bn' ? 'bn' : 'en';
  const plan = language === 'bn' ? DHAKA_PREGENERATED_PLAN_BN : DHAKA_PREGENERATED_PLAN_EN;
  const scoreResult = scoreForecastTimeline(DHAKA_SAMPLE_WEATHER.hourly, DHAKA_SAMPLE_WEATHER.daily);

  res.json({
    ok: true,
    isDemo: true,
    coordinates: DHAKA_COORDINATES,
    weather: DHAKA_SAMPLE_WEATHER.current,
    timeline: scoreResult.timeline,
    bestWindow: scoreResult.bestWindow,
    greenSpaces: DHAKA_PARKS,
    plan: {
      ...plan,
      _meta: {
        provider: 'bundled_demo_cache',
        generatedAt: '2026-10-07T00:00:00.000Z'
      }
    }
  });
});
