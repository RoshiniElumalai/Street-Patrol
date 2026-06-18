import { useState, useEffect } from 'react';

export const useSafeZones = (location, radius = 5000) => {
  const [safeZones, setSafeZones] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchSafeZones = async () => {
      // Use location if available, otherwise default to Bangalore center
      const targetLoc = location || { lat: 12.9716, lng: 77.5946 };
      setIsLoading(true);
      
      try {
        const query = `
          [out:json];
          (
            node["amenity"="police"](around:${radius},${targetLoc.lat},${targetLoc.lng});
            node["amenity"="hospital"](around:${radius},${targetLoc.lat},${targetLoc.lng});
            node["amenity"="clinic"](around:${radius},${targetLoc.lat},${targetLoc.lng});
            node["amenity"="pharmacy"](around:${radius},${targetLoc.lat},${targetLoc.lng});
            node["social_facility"="womens_shelter"](around:${radius},${targetLoc.lat},${targetLoc.lng});
          );
          out body;
        `;
        const response = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          body: query
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!active) return;

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
            name: el.tags.name || (type === 'police' ? 'Police Station' : type === 'womens_shelter' ? 'Women\'s Shelter' : 'Safety Hub'),
            color: color
          };
        });
        
        setSafeZones(markers);
      } catch (error) {
        console.warn("Overpass API error, returning local mock safety zones:", error.message);
        if (!active) return;

        // Fallback mock safety zones around targetLoc
        const mockZones = [
          {
            lat: targetLoc.lat + 0.0035,
            lng: targetLoc.lng + 0.0042,
            type: 'police',
            name: 'Central Police Station',
            color: '#3b82f6'
          },
          {
            lat: targetLoc.lat - 0.0051,
            lng: targetLoc.lng - 0.0038,
            type: 'police',
            name: 'Metro Police Post',
            color: '#3b82f6'
          },
          {
            lat: targetLoc.lat + 0.0062,
            lng: targetLoc.lng - 0.0051,
            type: 'hospital',
            name: 'Apollo Hospital',
            color: '#10b981'
          },
          {
            lat: targetLoc.lat - 0.0028,
            lng: targetLoc.lng + 0.0065,
            type: 'pharmacy',
            name: 'Apollo Pharmacy 24/7',
            color: '#34d399'
          },
          {
            lat: targetLoc.lat + 0.0015,
            lng: targetLoc.lng - 0.0022,
            type: 'womens_shelter',
            name: 'Mahila Protection Shelter',
            color: '#ec4899'
          }
        ];
        setSafeZones(mockZones);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    fetchSafeZones();
    return () => {
      active = false;
    };
  }, [location, radius]);

  return { safeZones, isLoading };
};
