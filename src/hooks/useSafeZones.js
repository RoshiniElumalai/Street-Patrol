import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchNearbyAmenities, fetchLanduse } from '../services/overpassService';
import { calculateLocationSafetyScore } from '../services/safetyScoreService';

const REFRESH_INTERVAL_MS = 30_000; // 30 seconds
const ALL_TYPES = ['police', 'hospital', 'clinic', 'pharmacy', 'womens_shelter'];

/**
 * Hook that fetches real nearby safety zones from Overpass API.
 * Auto-refreshes every 30 seconds. No mock data.
 */
export const useSafeZones = (location, radius = 5000) => {
  const [safeZones, setSafeZones]       = useState([]);
  const [isLoading, setIsLoading]       = useState(false);
  const [fetchError, setFetchError]     = useState(null);
  const [safetyScore, setSafetyScore]   = useState(null); // { score, level, reasons }
  const [landuse, setLanduse]           = useState([]);
  const intervalRef = useRef(null);

  const fetchData = useCallback(async (loc) => {
    if (!loc?.lat || !loc?.lng) return;
    setIsLoading(true);
    setFetchError(null);

    try {
      // Fetch amenities and landuse in parallel
      const [amenities, land] = await Promise.all([
        fetchNearbyAmenities(loc.lat, loc.lng, radius, ALL_TYPES),
        fetchLanduse(loc.lat, loc.lng, 500),
      ]);

      // Add color for map rendering
      const colored = amenities.map(z => ({
        ...z,
        color:
          z.type === 'police'                          ? '#3b82f6' :
          z.type === 'hospital' || z.type === 'clinic' ? '#10b981' :
          z.type === 'pharmacy'                        ? '#34d399' :
          z.type === 'womens_shelter'                   ? '#ec4899' : '#64748b',
      }));

      setSafeZones(colored);
      setLanduse(land);

      // Calculate geospatial safety score
      const scoreResult = calculateLocationSafetyScore(loc.lat, loc.lng, colored, land);
      setSafetyScore(scoreResult);
    } catch (err) {
      console.warn('Failed to fetch nearby data:', err.message);
      setFetchError('Could not load nearby safety locations.');
      setSafeZones([]);
      setSafetyScore({ score: 50, level: 'MODERATE', reasons: ['⚠ Data unavailable — using default score'] });
    } finally {
      setIsLoading(false);
    }
  }, [radius]);

  // Fetch on location change
  useEffect(() => {
    fetchData(location);
  }, [location?.lat, location?.lng, fetchData]);

  // Auto-refresh every 30s
  useEffect(() => {
    if (!location) return;
    intervalRef.current = setInterval(() => fetchData(location), REFRESH_INTERVAL_MS);
    return () => clearInterval(intervalRef.current);
  }, [location?.lat, location?.lng, fetchData]);

  return { safeZones, isLoading, fetchError, safetyScore, landuse };
};
