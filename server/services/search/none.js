/**
 * server/services/search/none.js
 * 
 * Provider 'none': zero-key, zero-network offline search adapter.
 * Uses dated bundled snapshots from server/demoData/ for reliable, reproducible
 * offline demo execution across all 8 global cities.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sanitizeAndNormalizeSearchItem, formatScreenMinimizingOutput } from './normalizer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEMO_DATA_DIR = path.resolve(__dirname, '../../demoData');

// Known city coordinate centers (rounded to 2 decimals)
const CITY_CENTERS = [
  { id: 'dhaka', name: 'Dhaka', lat: 23.74, lon: 90.40 },
  { id: 'delhi', name: 'Delhi', lat: 28.61, lon: 77.21 },
  { id: 'london', name: 'London', lat: 51.51, lon: -0.13 },
  { id: 'los_angeles', name: 'Los Angeles', lat: 34.05, lon: -118.24 },
  { id: 'nairobi', name: 'Nairobi', lat: -1.29, lon: 36.82 },
  { id: 'sao_paulo', name: 'São Paulo', lat: -23.55, lon: -46.63 },
  { id: 'sydney', name: 'Sydney', lat: -33.87, lon: 151.21 },
  { id: 'tokyo', name: 'Tokyo', lat: 35.68, lon: 139.77 }
];

/**
 * Resolves city id from city name or geographic coordinates.
 */
export function resolveCityId(city = '', lat = null, lon = null) {
  if (city && typeof city === 'string') {
    const norm = city.trim().toLowerCase().replace(/[\s_-]+/g, '');
    for (const c of CITY_CENTERS) {
      const match = c.name.toLowerCase().replace(/[\s_-]+/g, '');
      if (norm.includes(match) || match.includes(norm) || norm === c.id.replace(/_/g, '')) {
        return c.id;
      }
    }
  }

  if (lat !== null && lon !== null && !isNaN(lat) && !isNaN(lon)) {
    let closestCity = null;
    let minDistanceSq = Infinity;
    for (const c of CITY_CENTERS) {
      const dLat = c.lat - lat;
      const dLon = c.lon - lon;
      const distSq = dLat * dLat + dLon * dLon;
      // Within ~1.5 degrees (~150km)
      if (distSq < 2.5 && distSq < minDistanceSq) {
        minDistanceSq = distSq;
        closestCity = c.id;
      }
    }
    if (closestCity) return closestCity;
  }

  // Default to null if not recognized
  return null;
}

/**
 * Loads snapshot for a city from disk.
 */
export function loadSnapshotForCity(cityId) {
  if (!cityId) return null;

  const fileName = `search_${cityId}.snapshot.json`;
  const filePath = path.join(DEMO_DATA_DIR, fileName);

  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    }
  } catch {
    // Return null if reading fails
  }

  return null;
}

/**
 * Offline search adapter executing with 0 API keys and 0 network requests.
 * 
 * @param {string} query - Search query
 * @param {object} options - Options { city, lat, lon }
 * @returns {Promise<{ provider: string, items: Array, headsUp: object|null, recordedDate?: string, isOffline: boolean }>}
 */
export async function searchNone(query = '', options = {}) {
  const cityId = resolveCityId(options.city, options.lat, options.lon);
  
  // If cityId was explicitly given as an unknown city, or not matched:
  if (!cityId) {
    const emptyResult = Object.freeze({
      provider: 'none',
      items: Object.freeze([]),
      headsUp: null,
      isOffline: true
    });
    return emptyResult;
  }

  const snapshot = loadSnapshotForCity(cityId);
  if (!snapshot || !Array.isArray(snapshot.items)) {
    const emptyResult = Object.freeze({
      provider: 'none',
      items: Object.freeze([]),
      headsUp: null,
      isOffline: true
    });
    return emptyResult;
  }

  const rawItems = snapshot.items;
  const normalizedItems = rawItems
    .map(sanitizeAndNormalizeSearchItem)
    .filter((item) => item !== null);

  // If query is provided, filter or rank matching items; else return all
  let matchedItems = normalizedItems;
  if (query && typeof query === 'string' && query.trim()) {
    const qLower = query.toLowerCase().trim();
    const words = qLower.split(/\s+/).filter(Boolean);
    const filtered = normalizedItems.filter((item) => {
      const text = `${item.title} ${item.snippet}`.toLowerCase();
      return words.some((w) => text.includes(w));
    });
    if (filtered.length > 0) {
      matchedItems = filtered;
    }
  }

  const headsUp = formatScreenMinimizingOutput(matchedItems);

  const result = {
    provider: 'none',
    items: Object.freeze([...matchedItems]),
    headsUp,
    recordedDate: snapshot.recordedDate || '2026-10-08',
    isOffline: true
  };

  return Object.freeze(result);
}
