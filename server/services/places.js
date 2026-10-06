import { DHAKA_PARKS } from './demoData.js';

const placesCache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Calculates Haversine distance in meters between two lat/lon points
 */
export function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Calculates walking time in minutes based on 4.5 km/h (75 m/min)
 */
export function walkingTimeMinutes(distanceMeters) {
  return Math.max(1, Math.round(distanceMeters / 75));
}

/**
 * Discovers green spaces within ~3 km using OpenStreetMap Overpass API
 */
export async function findNearbyGreenSpaces(lat, lon, radiusMeters = 3000) {
  const roundedLat = Number(lat).toFixed(3);
  const roundedLon = Number(lon).toFixed(3);
  const cacheKey = `places:${roundedLat},${roundedLon},${radiusMeters}`;

  const cached = placesCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const query = `
    [out:json][timeout:25];
    (
      nwr["leisure"="park"](around:${radiusMeters},${roundedLat},${roundedLon});
      nwr["leisure"="garden"](around:${radiusMeters},${roundedLat},${roundedLon});
      nwr["leisure"="nature_reserve"](around:${radiusMeters},${roundedLat},${roundedLon});
      nwr["leisure"="playground"](around:${radiusMeters},${roundedLat},${roundedLon});
      nwr["natural"="water"](around:${radiusMeters},${roundedLat},${roundedLon});
      nwr["water"="lake"](around:${radiusMeters},${roundedLat},${roundedLon});
    );
    out center 25;
  `;

  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'SobujGhonta-TouchGrass/1.0 (Hacktoberfest Challenge)'
      },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(12000)
    });

    if (!res.ok) {
      throw new Error(`Overpass API HTTP ${res.status}`);
    }

    const data = await res.json();
    const elements = data.elements || [];

    if (elements.length === 0) {
      throw new Error('No green spaces found in radius');
    }

    const parsed = elements
      .map(el => {
        const itemLat = el.lat || el.center?.lat;
        const itemLon = el.lon || el.center?.lon;
        if (!itemLat || !itemLon) return null;

        const tags = el.tags || {};
        const name = tags.name || tags['name:en'] || tags['name:bn'] || tags.description || 'Local Green Space';
        const type = tags.leisure || tags.natural || tags.water || 'park';
        const dist = haversineDistanceMeters(lat, lon, itemLat, itemLon);

        return {
          id: `osm_${el.type}_${el.id}`,
          name,
          nameBn: tags['name:bn'] || name,
          type,
          lat: itemLat,
          lon: itemLon,
          distanceMeters: dist,
          walkTimeMinutes: walkingTimeMinutes(dist),
          tags
        };
      })
      .filter(Boolean)
      // Deduplicate by name if identical within close range
      .filter((item, idx, arr) => arr.findIndex(x => x.name === item.name) === idx)
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
      .slice(0, 5);

    if (parsed.length === 0) {
      throw new Error('No valid coordinate items after parsing');
    }

    const payload = {
      fallback: false,
      spaces: parsed
    };

    placesCache.set(cacheKey, { timestamp: Date.now(), data: payload });
    return payload;
  } catch (err) {
    console.warn(`[Places] Overpass error for (${lat}, ${lon}):`, err.message, '— Using bundled fallback.');
    // Recalculate distance to Dhaka parks relative to current query coords if feasible
    const fallbackSpaces = DHAKA_PARKS.map(p => {
      const dist = haversineDistanceMeters(lat, lon, p.lat, p.lon);
      return {
        ...p,
        distanceMeters: dist,
        walkTimeMinutes: walkingTimeMinutes(dist)
      };
    }).sort((a, b) => a.distanceMeters - b.distanceMeters);

    return {
      fallback: true,
      fallbackReason: err.message,
      spaces: fallbackSpaces
    };
  }
}
