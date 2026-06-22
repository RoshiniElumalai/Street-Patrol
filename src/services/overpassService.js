// ─── Overpass API Service (Cached) ─────────────────────────────────────────────
// Single-responsibility client for querying OpenStreetMap Overpass API.
// Built-in 30-second TTL cache keyed by rounded lat/lng to avoid spamming.

import { calculateDistance } from '../utils/geo';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const CACHE_TTL_MS = 30_000; // 30 seconds
const cache = new Map();

/** Round to 3 decimals (~111m precision) for cache key */
const cacheKey = (lat, lng, radius, types) =>
  `${lat.toFixed(3)}_${lng.toFixed(3)}_${radius}_${types.sort().join(',')}`;

/**
 * Fetch nearby amenities from Overpass API with caching.
 * @param {number} lat
 * @param {number} lng
 * @param {number} radius — in meters
 * @param {string[]} types — e.g. ['police','hospital','pharmacy']
 * @returns {Promise<Array<{lat,lng,name,type,address,distance}>>}
 */
export const fetchNearbyAmenities = async (lat, lng, radius = 5000, types = ['police', 'hospital', 'pharmacy']) => {
  const key = cacheKey(lat, lng, radius, types);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data;

  // Build Overpass QL
  const amenityFilters = types
    .filter(t => t !== 'womens_shelter')
    .map(t => {
      let filter = `node["amenity"="${t}"](around:${radius},${lat},${lng});\nway["amenity"="${t}"](around:${radius},${lat},${lng});`;
      // Expand pharmacy query for better coverage in some regions (like India)
      if (t === 'pharmacy') {
        filter += `\nnode["healthcare"="pharmacy"](around:${radius},${lat},${lng});`;
        filter += `\nnode["shop"="chemist"](around:${radius},${lat},${lng});`;
        filter += `\nway["shop"="chemist"](around:${radius},${lat},${lng});`;
        filter += `\nnode["shop"="medical_supply"](around:${radius},${lat},${lng});`;
      }
      return filter;
    })
    .join('\n');
  const shelterFilter = types.includes('womens_shelter')
    ? `node["social_facility"="womens_shelter"](around:${radius},${lat},${lng});`
    : '';

  const query = `[out:json][timeout:25];(${amenityFilters}\n${shelterFilter});out center body;`;

  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://lz4.overpass-api.de/api/interpreter',
    'https://z.overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter'
  ];

  let data = null;
  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: query
      });
      if (response.ok) {
        data = await response.json();
        break;
      } else {
        console.warn(`Overpass endpoint ${endpoint} returned status ${response.status}`);
      }
    } catch (err) {
      console.warn(`Overpass endpoint ${endpoint} fetch failed:`, err.message);
      lastError = err;
    }
  }

  if (!data) {
    throw lastError || new Error("All Overpass API endpoints failed.");
  }

  const results = data.elements
    .filter(el => el.lat || el.center)
    .map(el => {
      const elLat = el.lat ?? el.center?.lat;
      const elLng = el.lon ?? el.center?.lon;
      const type = (el.tags?.amenity || el.tags?.shop || el.tags?.healthcare || el.tags?.social_facility || 'safety_center').replace('chemist', 'pharmacy').replace('medical_supply', 'pharmacy');
      const dist = calculateDistance(lat, lng, elLat, elLng);

      // Build address string from OSM tags
      const a = el.tags || {};
      const addrParts = [a['addr:street'], a['addr:housenumber'], a['addr:city']].filter(Boolean);
      const address = addrParts.length > 0 ? addrParts.join(', ') : (a['addr:full'] || '');

      const fallbackName =
        type === 'police' ? 'Police Station' :
        type === 'hospital' ? 'Hospital' :
        type === 'clinic' ? 'Clinic' :
        type === 'pharmacy' ? 'Pharmacy' :
        type === 'womens_shelter' ? "Women's Shelter" : 'Safety Hub';

      return {
        lat: elLat,
        lng: elLng,
        name: a.name || fallbackName,
        type,
        address,
        distance: Math.round(dist),
        phone: a.phone || a['contact:phone'] || '',
      };
    })
    .filter(m => m.lat && m.lng)
    .sort((a, b) => a.distance - b.distance);

  cache.set(key, { ts: Date.now(), data: results });
  return results;
};

/**
 * Fetch land use around a point (industrial, forest, commercial, residential).
 * Returns array of landuse types found within radius.
 */
export const fetchLanduse = async (lat, lng, radius = 500) => {
  const key = `landuse_${lat.toFixed(3)}_${lng.toFixed(3)}_${radius}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data;

  const query = `[out:json][timeout:15];(
    way["landuse"](around:${radius},${lat},${lng});
    relation["landuse"](around:${radius},${lat},${lng});
  );out tags;`;

  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://lz4.overpass-api.de/api/interpreter',
    'https://z.overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter'
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        body: query
      });
      if (res.ok) {
        const data = await res.json();
        const types = [...new Set(data.elements.map(el => el.tags?.landuse).filter(Boolean))];
        cache.set(key, { ts: Date.now(), data: types });
        return types;
      }
    } catch (e) {
      console.warn(`Landuse check on ${endpoint} failed:`, e.message);
    }
  }

  return [];
};

/** Clear all cached data */
export const clearCache = () => cache.clear();
