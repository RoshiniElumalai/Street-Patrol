// Utility functions for geolocation and routing

// Haversine formula to calculate distance in meters
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Fetch coordinates from address using OpenStreetMap Nominatim
export const geocodeAddress = async (address) => {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
    const data = await response.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        displayName: data[0].display_name
      };
    }
    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
};

// Fetch real route using OSRM
export const getRoute = async (startLat, startLng, endLat, endLng, mode = 'foot') => {
  try {
    // mode can be 'foot', 'driving', 'bike'
    const url = `https://router.project-osrm.org/route/v1/${mode}/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.code === 'Ok' && data.routes.length > 0) {
      const route = data.routes[0];
      // OSRM returns coordinates in [lng, lat] order, Leaflet needs [lat, lng]
      const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
      return {
        distance: route.distance, // in meters
        duration: route.duration, // in seconds
        coordinates: coordinates
      };
    }
    return null;
  } catch (error) {
    console.error("OSRM Routing error:", error);
    return null;
  }
};
