import { DHAKA_SAMPLE_WEATHER } from './demoData.js';

// In-memory cache with 15-minute TTL
const weatherCache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000;

/**
 * Searches cities using Open-Meteo Geocoding API
 */
export async function searchCities(cityName) {
  if (!cityName || cityName.trim().length < 2) {
    return [];
  }

  const trimmed = cityName.trim();
  const cacheKey = `geo:${trimmed.toLowerCase()}`;
  const cached = weatherCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      trimmed
    )}&count=5&language=en&format=json`;

    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) {
      throw new Error(`Geocoding failed: HTTP ${res.status}`);
    }

    const data = await res.json();
    const results = (data.results || []).map(r => ({
      id: r.id,
      name: r.name,
      latitude: r.latitude,
      longitude: r.longitude,
      country: r.country,
      admin1: r.admin1 || ''
    }));

    weatherCache.set(cacheKey, { timestamp: Date.now(), data: results });
    return results;
  } catch (err) {
    console.warn(`[Weather] Geocoding error for "${cityName}":`, err.message);
    // If searching Dhaka and offline, return Dhaka fallback
    if (trimmed.toLowerCase().includes('dhaka')) {
      return [
        {
          id: 1185241,
          name: 'Dhaka',
          latitude: 23.7388,
          longitude: 90.3995,
          country: 'Bangladesh',
          admin1: 'Dhaka Division'
        }
      ];
    }
    return [];
  }
}

/**
 * Fetches combined weather and air quality for coordinates from Open-Meteo
 */
export async function fetchWeatherData(lat, lon) {
  const roundedLat = Number(lat).toFixed(3);
  const roundedLon = Number(lon).toFixed(3);
  const cacheKey = `weather:${roundedLat},${roundedLon}`;

  const cached = weatherCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${roundedLat}&longitude=${roundedLon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code&hourly=temperature_2m,apparent_temperature,precipitation_probability,precipitation,uv_index,weather_code&daily=sunrise,sunset&timezone=auto&forecast_days=2`;

    const airQualityUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${roundedLat}&longitude=${roundedLon}&current=us_aqi,pm2_5,pm10&hourly=us_aqi,pm2_5,pm10&timezone=auto&forecast_days=2`;

    const [forecastRes, aqiRes] = await Promise.all([
      fetch(forecastUrl, { signal: AbortSignal.timeout(7000) }),
      fetch(airQualityUrl, { signal: AbortSignal.timeout(7000) })
    ]);

    if (!forecastRes.ok) {
      throw new Error(`Open-Meteo Forecast HTTP ${forecastRes.status}`);
    }

    const forecastData = await forecastRes.json();
    const aqiData = aqiRes.ok ? await aqiRes.json() : null;

    // Merge forecast and AQI into unified timeline
    const hourlyTimes = forecastData.hourly.time.slice(0, 24);
    const hourly = {
      time: hourlyTimes,
      temperature_2m: forecastData.hourly.temperature_2m.slice(0, 24),
      apparent_temperature: (forecastData.hourly.apparent_temperature || forecastData.hourly.temperature_2m).slice(0, 24),
      precipitation_probability: (forecastData.hourly.precipitation_probability || []).slice(0, 24),
      precipitation: (forecastData.hourly.precipitation || []).slice(0, 24),
      uv_index: (forecastData.hourly.uv_index || []).slice(0, 24),
      weather_code: (forecastData.hourly.weather_code || []).slice(0, 24),
      us_aqi: (aqiData?.hourly?.us_aqi || new Array(24).fill(65)).slice(0, 24),
      pm2_5: (aqiData?.hourly?.pm2_5 || new Array(24).fill(20)).slice(0, 24)
    };

    const current = {
      time: forecastData.current?.time || new Date().toISOString(),
      temperature: forecastData.current?.temperature_2m ?? 26,
      apparentTemp: forecastData.current?.apparent_temperature ?? 27,
      humidity: forecastData.current?.relative_humidity_2m ?? 65,
      precip: forecastData.current?.precipitation ?? 0,
      weatherCode: forecastData.current?.weather_code ?? 0,
      aqi: aqiData?.current?.us_aqi ?? 65,
      pm25: aqiData?.current?.pm2_5 ?? 20
    };

    const payload = {
      fallback: false,
      current,
      daily: forecastData.daily || {},
      hourly
    };

    weatherCache.set(cacheKey, { timestamp: Date.now(), data: payload });
    return payload;
  } catch (err) {
    console.warn(`[Weather] Fetch failed for (${lat}, ${lon}):`, err.message, '— Using bundled Dhaka fallback.');
    return {
      fallback: true,
      fallbackReason: err.message,
      ...DHAKA_SAMPLE_WEATHER
    };
  }
}
