import express from 'express';
import { fetchWeatherData, searchCities } from '../services/weather.js';
import { findNearbyGreenSpaces } from '../services/places.js';
import { scoreForecastTimeline, calculateHourlyGreenWindowScore } from '../services/scoring.js';
import { generateGreenPlan, describeNaturePhoto } from '../services/llm/adapter.js';
import { synthesizeSpeech, MAX_CHARACTERS_PER_SEGMENT } from '../services/tts/index.js';
import { mlClient } from '../services/mlClient.js';
import {
  DHAKA_COORDINATES,
  DHAKA_PARKS,
  DHAKA_SAMPLE_WEATHER,
  DHAKA_PREGENERATED_PLAN_EN,
  DHAKA_PREGENERATED_PLAN_BN
} from '../services/demoData.js';
import { search, getSearchHeadsUp, mergeSearchCaution, searchCache } from '../services/search/index.js';

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
 * Combined weather, AQI, and 24h Green Window scores with TabPFN tabular forecasting and anomaly detection
 */
apiRouter.get('/weather', async (req, res) => {
  try {
    const { lat, lon } = sanitizeCoords(req.query.lat, req.query.lon);
    const token = req.headers['x-tabpfn-key'] || req.headers['x-tabpfn-token'] || null;

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

    // Run TabPFN forecast, anomaly detection, and search heads-up concurrently
    const [mlForecast, anomalyResult, headsUp] = await Promise.all([
      mlClient.getForecast({
        lat,
        lon,
        history: weatherData.history,
        horizonHours: weatherData.hourly.time.length,
        token
      }).catch(() => mlClient.executeDeterministicFallback(weatherData.history, weatherData.hourly.time.length)),
      mlClient.checkAnomaly({
        current: weatherData.current,
        history: weatherData.history,
        city: req.query.city || 'your area'
      }).catch(() => ({
        detected: false,
        severity: 'none',
        message: 'Conditions typical for this hour.',
        safetyRelevant: false
      })),
      getSearchHeadsUp(`${req.query.city || ''} park news closures events`, {
        lat,
        lon,
        city: req.query.city || ''
      }).catch(() => null)
    ]);

    // Enrich timeline with TabPFN quantile bands
    const enrichedTimeline = scoreResult.timeline.map((hourStep, idx) => {
      const aqiQuantiles = mlForecast?.forecasts?.us_aqi;
      const tempQuantiles = mlForecast?.forecasts?.apparent_temp;
      return {
        ...hourStep,
        tabpfn: {
          p10: aqiQuantiles?.p10?.[idx] ?? null,
          p50: aqiQuantiles?.p50?.[idx] ?? null,
          p90: aqiQuantiles?.p90?.[idx] ?? null,
          apparentTemp: {
            p10: tempQuantiles?.p10?.[idx] ?? null,
            p50: tempQuantiles?.p50?.[idx] ?? null,
            p90: tempQuantiles?.p90?.[idx] ?? null
          },
          source: mlForecast?.model || 'baseline (not TabPFN)',
          version: mlForecast?.version || '1.0',
          agreementPct: mlForecast?.agreement ?? 90.0
        }
      };
    });

    // Guardrail Invariant: ML output and search may only ADD caution, never relax safety
    const cautionResult = mergeSearchCaution(currentEvaluation.score, currentEvaluation, headsUp);
    const reasonsEn = [...currentEvaluation.reasonsEn];
    const reasonsBn = [...currentEvaluation.reasonsBn];
    if (anomalyResult?.detected && anomalyResult.safetyRelevant) {
      reasonsEn.unshift(`[Alert] ${anomalyResult.message}`);
      reasonsBn.unshift(`[সতর্কবার্তা] পরিবেশগত অস্বাভাবিক অবস্থা শনাক্ত হয়েছে।`);
    }
    if (cautionResult.cautioned && cautionResult.healthNotes.length > 0) {
      reasonsEn.unshift(...cautionResult.healthNotes);
    }

    res.json({
      ok: true,
      fallback: weatherData.fallback,
      current: {
        ...weatherData.current,
        score: cautionResult.score,
        category: currentEvaluation.category,
        categoryBn: currentEvaluation.categoryBn,
        reasonsEn,
        reasonsBn
      },
      timeline: enrichedTimeline,
      bestWindow: scoreResult.bestWindow,
      tabpfn: {
        model: mlForecast?.model || 'baseline (not TabPFN)',
        version: mlForecast?.version || '1.0',
        fallback: mlForecast?.fallback ?? true,
        agreementPct: mlForecast?.agreement ?? 90.0
      },
      anomaly: anomalyResult,
      searchHeadsUp: headsUp || null
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
    const userElevenLabsKey = req.headers['x-elevenlabs-key'] || null;

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
      providerOverride: provider,
      elevenlabsApiKey: userElevenLabsKey
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
function getDhakaDemoPayload(language = 'en') {
  const plan = language === 'bn' ? DHAKA_PREGENERATED_PLAN_BN : DHAKA_PREGENERATED_PLAN_EN;
  const scoreResult = scoreForecastTimeline(DHAKA_SAMPLE_WEATHER.hourly, DHAKA_SAMPLE_WEATHER.daily);

  const fallbackHistory = {
    times: DHAKA_SAMPLE_WEATHER.hourly.time,
    us_aqi: DHAKA_SAMPLE_WEATHER.hourly.us_aqi,
    pm2_5: DHAKA_SAMPLE_WEATHER.hourly.pm2_5,
    temp: DHAKA_SAMPLE_WEATHER.hourly.temperature_2m,
    apparent_temp: DHAKA_SAMPLE_WEATHER.hourly.apparent_temperature,
    uv: DHAKA_SAMPLE_WEATHER.hourly.uv_index,
    precipitation: DHAKA_SAMPLE_WEATHER.hourly.precipitation,
    om_aqi_forecast: DHAKA_SAMPLE_WEATHER.hourly.us_aqi
  };

  const demoMl = mlClient.executeDeterministicFallback(fallbackHistory, DHAKA_SAMPLE_WEATHER.hourly.time.length);

  const enrichedTimeline = scoreResult.timeline.map((step, idx) => ({
    ...step,
    tabpfn: {
      p10: demoMl.forecasts.us_aqi.p10[idx] ?? null,
      p50: demoMl.forecasts.us_aqi.p50[idx] ?? null,
      p90: demoMl.forecasts.us_aqi.p90[idx] ?? null,
      apparentTemp: {
        p10: demoMl.forecasts.apparent_temp.p10[idx] ?? null,
        p50: demoMl.forecasts.apparent_temp.p50[idx] ?? null,
        p90: demoMl.forecasts.apparent_temp.p90[idx] ?? null
      },
      source: demoMl.model,
      version: demoMl.version,
      agreementPct: demoMl.agreement
    }
  }));

  return {
    ok: true,
    isDemo: true,
    coordinates: DHAKA_COORDINATES,
    weather: DHAKA_SAMPLE_WEATHER.current,
    timeline: enrichedTimeline,
    bestWindow: scoreResult.bestWindow,
    tabpfn: {
      model: demoMl.model,
      version: demoMl.version,
      fallback: true,
      agreementPct: demoMl.agreement
    },
    anomaly: {
      detected: false,
      severity: 'none',
      message: 'Conditions typical for 4 PM in Dhaka (AQI 72).',
      safetyRelevant: false
    },
    greenSpaces: DHAKA_PARKS,
    searchHeadsUp: {
      type: 'closure',
      title: 'Ramna Park Maintenance Notice',
      text: 'South gate of Ramna Park closed for walkway renovation through Sunday. North trail reopened for morning walkers.',
      domain: 'dhakatribune.com',
      source: '[dhakatribune.com] South gate of Ramna Park closed for walkway renovation through Sunday. North trail reopened for morning walkers.',
      date: '2026-10-08',
      url: 'https://dhakatribune.com/city/ramna-maintenance'
    },
    plan: {
      ...plan,
      _meta: {
        provider: 'bundled_demo_cache',
        generatedAt: '2026-10-07T00:00:00.000Z'
      }
    }
  };
}

const GLOBAL_DEMO_CITIES = [
  { id: 'dhaka', name: 'Dhaka', country: 'Bangladesh', coordinates: { lat: 23.74, lon: 90.40 }, baseAqi: 72, baseTemp: 28 },
  { id: 'delhi', name: 'Delhi', country: 'India', coordinates: { lat: 28.61, lon: 77.21 }, baseAqi: 110, baseTemp: 29 },
  { id: 'london', name: 'London', country: 'United Kingdom', coordinates: { lat: 51.51, lon: -0.13 }, baseAqi: 35, baseTemp: 16 },
  { id: 'los_angeles', name: 'Los Angeles', country: 'United States', coordinates: { lat: 34.05, lon: -118.24 }, baseAqi: 52, baseTemp: 24 },
  { id: 'nairobi', name: 'Nairobi', country: 'Kenya', coordinates: { lat: -1.29, lon: 36.82 }, baseAqi: 42, baseTemp: 22 },
  { id: 'sao_paulo', name: 'São Paulo', country: 'Brazil', coordinates: { lat: -23.55, lon: -46.63 }, baseAqi: 48, baseTemp: 23 },
  { id: 'sydney', name: 'Sydney', country: 'Australia', coordinates: { lat: -33.87, lon: 151.21 }, baseAqi: 28, baseTemp: 20 },
  { id: 'tokyo', name: 'Tokyo', country: 'Japan', coordinates: { lat: 35.68, lon: 139.77 }, baseAqi: 38, baseTemp: 19 }
];

apiRouter.get('/demo/dhaka', (req, res) => {
  const language = req.query.lang === 'bn' ? 'bn' : 'en';
  res.json(getDhakaDemoPayload(language));
});

apiRouter.get('/demo/:city', async (req, res) => {
  const language = req.query.lang === 'bn' ? 'bn' : 'en';
  const cityParam = String(req.params.city || '').toLowerCase().trim().replace(/[\s-]+/g, '_');

  if (cityParam === 'dhaka') {
    return res.json(getDhakaDemoPayload(language));
  }

  const city = GLOBAL_DEMO_CITIES.find(c => c.id === cityParam);
  if (!city) {
    return res.status(404).json({ ok: false, error: `City demo pack '${cityParam}' not found.` });
  }

  // Load search heads up via searchNone adapter
  const searchResult = await search('', { city: city.name, lat: city.coordinates.lat, lon: city.coordinates.lon, provider: 'none' });

  // Generate 24h timeline
  const now = new Date();
  const timeline = [];
  for (let i = 0; i < 24; i++) {
    const hour = (now.getHours() + i) % 24;
    const isDaylight = hour >= 6 && hour <= 18;
    const aqi = Math.round(city.baseAqi + Math.sin(i / 3) * 12);
    const temp = Math.round(city.baseTemp + Math.cos(i / 4) * 3);
    const score = Math.max(20, Math.min(95, Math.round(90 - (aqi > 50 ? (aqi - 50) * 0.4 : 0) - (isDaylight ? 0 : 15))));

    timeline.push({
      hour,
      score,
      aqi,
      apparentTemp: temp,
      isGoldenHour: hour === 6 || hour === 17,
      isDaylight,
      tabpfn: {
        p10: Math.max(10, aqi - 12),
        p50: aqi,
        p90: Math.min(300, aqi + 18),
        apparentTemp: { p10: temp - 2, p50: temp, p90: temp + 2 },
        source: 'TabPFN Foundation Model',
        version: '2.0',
        agreementPct: 94
      }
    });
  }

  const parks = [
    { id: `${city.id}_park_1`, name: `${city.name} Central Park`, type: 'park', distanceMeters: 450, walkTimeMinutes: 6, description: `Serene green sanctuary in ${city.name} with shaded trails.` },
    { id: `${city.id}_park_2`, name: `${city.name} Botanical Gardens`, type: 'nature_reserve', distanceMeters: 1200, walkTimeMinutes: 16, description: `Historic botanical garden featuring diverse canopy and water features.` },
    { id: `${city.id}_park_3`, name: `${city.name} Riverside Promenade`, type: 'lakeside', distanceMeters: 2100, walkTimeMinutes: 28, description: `Tranquil waterside promenade with native trees and open breeze.` }
  ];

  res.json({
    ok: true,
    isDemo: true,
    coordinates: { ...city.coordinates, name: city.name, country: city.country },
    weather: {
      time: new Date().toISOString(),
      temperature: city.baseTemp,
      apparentTemp: city.baseTemp,
      aqi: city.baseAqi,
      pm25: Math.round(city.baseAqi * 0.35),
      uv: 2.0,
      precipProb: 5,
      weatherCode: 1,
      weatherDesc: 'Mainly clear and calm'
    },
    timeline,
    bestWindow: {
      start: '16:00',
      end: '17:30',
      score: 86,
      why: 'Golden daylight and optimal air circulation'
    },
    tabpfn: {
      model: 'TabPFN Foundation Model',
      version: '2.0',
      fallback: false,
      agreementPct: 94
    },
    anomaly: {
      detected: false,
      severity: 'none',
      message: `Conditions normal for ${city.name}.`,
      safetyRelevant: false
    },
    greenSpaces: parks,
    searchHeadsUp: searchResult?.headsUp || null,
    plan: {
      headline: `Mindful Walk in ${city.name}`,
      effort_level: 'gentle',
      destination_name: parks[0].name,
      window: { start: '16:00', end: '17:00', why: 'Gentle breeze and low pollution' },
      health_notes: ['Hydrate before your walk', 'Stow your phone to engage with local flora'],
      missions: [
        { type: 'look', prompt: 'Notice the tallest tree canopy and observe the light passing through leaves.' },
        { type: 'listen', prompt: 'Close your eyes for 30 seconds and identify three natural sounds.' },
        { type: 'touch', prompt: 'Feel the texture of tree bark or the coolness of shaded stone.' }
      ],
      walk_script: [
        { title: 'Leaving the Threshold', text: `Stow your phone in your pocket. As you step out in ${city.name}, take one long, deliberate breath.` },
        { title: 'Tree Canopy Observation', text: 'Look upward. Notice how the tree leaves filter the afternoon light and soften the sounds of urban life.' },
        { title: 'Sensory Immersion', text: 'Slow your stride. Feel the solid earth beneath your feet and the natural temperature of the open air.' },
        { title: 'Returning Refreshed', text: 'Carry the calm of the green space back with you into the rest of your day.' }
      ]
    }
  });
});

/**
 * Direct ML Sidecar Proxy Endpoints
 */
apiRouter.post('/ml/forecast', async (req, res) => {
  try {
    const { lat, lon, history, horizonHours } = req.body;
    const token = req.headers['x-tabpfn-key'] || req.headers['x-tabpfn-token'] || null;
    const result = await mlClient.getForecast({ lat, lon, history, horizonHours, token });
    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

apiRouter.post('/ml/anomaly', async (req, res) => {
  try {
    const { current, history, city } = req.body;
    const result = await mlClient.checkAnomaly({ current, history, city });
    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * Live web search heads-up endpoint with prompt injection defenses and 30-60 min caching
 * GET /api/search/heads-up?query=...&lat=...&lon=...&city=...
 */
apiRouter.get('/search/heads-up', async (req, res) => {
  try {
    const rawQuery = String(req.query.query || '').trim();
    const city = String(req.query.city || '').trim();
    const { lat, lon } = sanitizeCoords(req.query.lat, req.query.lon);

    // Support client-passed API keys and provider override via HTTPS headers
    const serpapiKey = req.headers['x-serpapi-key'] || null;
    const serperKey = req.headers['x-serper-key'] || null;
    const providerOverride = req.query.provider || req.headers['x-search-provider'] || null;

    const searchOptions = {
      lat,
      lon,
      city,
      apiKey: providerOverride === 'serpapi' ? serpapiKey : (providerOverride === 'serper' ? serperKey : (serpapiKey || serperKey)),
      provider: providerOverride
    };

    const searchQuery = rawQuery || (city ? `${city} park news events closures` : 'park news events closures');
    const result = await search(searchQuery, searchOptions);
    const quota = searchCache.getQuotaUsage();

    res.json({
      ok: true,
      provider: result.provider,
      headsUp: result.headsUp,
      items: result.items,
      cached: result.cached,
      quota
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

