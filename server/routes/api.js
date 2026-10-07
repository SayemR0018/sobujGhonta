import express from 'express';
import { fetchWeatherData, searchCities } from '../services/weather.js';
import { findNearbyGreenSpaces } from '../services/places.js';
import { scoreForecastTimeline, calculateHourlyGreenWindowScore } from '../services/scoring.js';
import { generateGreenPlan, describeNaturePhoto } from '../services/llm/adapter.js';
import { synthesizeSpeech } from '../services/tts/index.js';
import {
  DHAKA_COORDINATES,
  DHAKA_PARKS,
  DHAKA_SAMPLE_WEATHER,
  DHAKA_PREGENERATED_PLAN_EN,
  DHAKA_PREGENERATED_PLAN_BN
} from '../services/demoData.js';

export const apiRouter = express.Router();

/**
 * Health check endpoint for Render Blueprint monitoring
 */
apiRouter.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

/**
 * City search for location picker
 */
apiRouter.get('/cities', async (req, res) => {
  try {
    const query = req.query.query || '';
    const results = await searchCities(String(query));
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
    const lat = parseFloat(req.query.lat) || DHAKA_COORDINATES.lat;
    const lon = parseFloat(req.query.lon) || DHAKA_COORDINATES.lon;

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
    const lat = parseFloat(req.query.lat) || DHAKA_COORDINATES.lat;
    const lon = parseFloat(req.query.lon) || DHAKA_COORDINATES.lon;

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
    const {
      minutes = 30,
      goal = 'calm',
      language = 'en',
      lat = DHAKA_COORDINATES.lat,
      lon = DHAKA_COORDINATES.lon
    } = req.body;

    const [weatherData, placesData] = await Promise.all([
      fetchWeatherData(lat, lon),
      findNearbyGreenSpaces(lat, lon)
    ]);

    const scoreResult = scoreForecastTimeline(weatherData.hourly, weatherData.daily);

    const plan = await generateGreenPlan({
      minutes: Number(minutes),
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

    const ttsResult = await synthesizeSpeech({
      text,
      voice: voice || voiceId,
      language,
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
    const { imageBase64, mimeType, noteText, language = 'en' } = req.body;
    const descriptionResult = await describeNaturePhoto({
      imageBase64,
      mimeType,
      userNote: noteText,
      language
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
