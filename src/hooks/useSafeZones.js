import { useState, useEffect } from 'react';

export const useSafeZones = (location, radius = 5000) => {
  const [safeZones, setSafeZones] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!location) return;

    const fetchSafeZones = async () => {
      setIsLoading(true);
      try {
        const query = `
          [out:json];
          (
            node["amenity"="police"](around:${radius},${location.lat},${location.lng});
            node["amenity"="hospital"](around:${radius},${location.lat},${location.lng});
            node["amenity"="clinic"](around:${radius},${location.lat},${location.lng});
          );
          out body;
        `;
        const response = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          body: query
        });
        const data = await response.json();
        
        const markers = data.elements.map(el => ({
          lat: el.lat,
          lng: el.lon,
          type: el.tags.amenity,
          name: el.tags.name || 'Unknown',
          color: el.tags.amenity === 'police' ? '#3b82f6' : '#10b981' // blue for police, green for hospital
        }));
        
        setSafeZones(markers);
      } catch (error) {
        console.error("Overpass API error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSafeZones();
  }, [location, radius]);

  return { safeZones, isLoading };
};
