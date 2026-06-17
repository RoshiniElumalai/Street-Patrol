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
            node["amenity"="pharmacy"](around:${radius},${location.lat},${location.lng});
            node["social_facility"="womens_shelter"](around:${radius},${location.lat},${location.lng});
          );
          out body;
        `;
        const response = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          body: query
        });
        const data = await response.json();
        
        const markers = data.elements.map(el => {
          const type = el.tags.amenity || el.tags.social_facility || 'safety_center';
          let color = '#3b82f6'; // Police default
          if (type === 'hospital' || type === 'clinic') color = '#10b981';
          else if (type === 'pharmacy') color = '#34d399';
          else if (type === 'womens_shelter') color = '#ec4899';
          
          return {
            lat: el.lat,
            lng: el.lon,
            type: type,
            name: el.tags.name || 'Safety Hub',
            color: color
          };
        });
        
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
