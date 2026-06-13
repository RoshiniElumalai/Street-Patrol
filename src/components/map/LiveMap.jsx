import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet's default icon path issues in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Icons matching White/Red theme
export const createPulseIcon = (color = '#e11d48') => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="
      background-color: ${color}; 
      width: 16px; height: 16px; 
      border-radius: 50%; 
      box-shadow: 0 0 10px ${color}, 0 0 25px ${color};
      border: 3px solid white;
    "></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });
};

export const createDestinationIcon = () => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="
      background-color: #0f172a; 
      width: 20px; height: 20px; 
      border-radius: 50%; 
      border: 3px solid white;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 6px rgba(0,0,0,0.3);
    "><div style="width: 8px; height: 8px; background: white; border-radius: 50%;"></div></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
};

const MapUpdater = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.flyTo(center, map.getZoom(), { duration: 1.5 });
    }
  }, [center, map]);
  return null;
};

const MapClickHandler = ({ onMapClick }) => {
  const map = useMap();
  useEffect(() => {
    const handleMapClick = (e) => {
      if (onMapClick) onMapClick(e.latlng);
    };
    map.on('click', handleMapClick);
    return () => map.off('click', handleMapClick);
  }, [map, onMapClick]);
  return null;
};

const LiveMap = ({ 
  center = [13.0827, 80.2707], // Default India (Chennai)
  zoom = 15, 
  userLocation = null,
  destination = null,
  routeCoords = [],
  interactive = true,
  onMapClick = null,
  markers = [], // Additional custom markers {lat, lng, color}
  routeColor = '#e11d48'
}) => {
  
  const [autoLocation, setAutoLocation] = useState(null);

  // Auto-detect GPS if userLocation is not provided
  useEffect(() => {
    if (!userLocation && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setAutoLocation([pos.coords.latitude, pos.coords.longitude]);
        },
        (err) => console.log("GPS Denied, using default center", err),
        { enableHighAccuracy: true }
      );
    }
  }, [userLocation]);

  const activeCenter = userLocation ? [userLocation.lat, userLocation.lng] : (autoLocation || center);

  // Standard light OpenStreetMap tiles to match White/Red theme
  const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const TILE_ATTRIBUTION = '&copy; OpenStreetMap contributors';

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border-2 border-white shadow-lg bg-slate-100">
      <MapContainer 
        center={activeCenter} 
        zoom={zoom} 
        scrollWheelZoom={interactive}
        dragging={interactive}
        zoomControl={interactive}
        className="w-full h-full z-0"
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        <MapUpdater center={activeCenter} />
        {interactive && <MapClickHandler onMapClick={onMapClick} />}

        {/* User Location */}
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={createPulseIcon('#3b82f6')} />
        )}
        
        {/* Auto GPS Location (if no manual userLocation override) */}
        {!userLocation && autoLocation && (
          <Marker position={autoLocation} icon={createPulseIcon('#3b82f6')} />
        )}

        {/* Destination */}
        {destination && (
          <Marker position={[destination.lat, destination.lng]} icon={createDestinationIcon()} />
        )}

        {/* Route Polyline */}
        {routeCoords.length > 0 && (
          <Polyline 
            positions={routeCoords} 
            color={routeColor} 
            weight={5} 
            opacity={0.8} 
            dashArray="10, 10" 
            className="animate-pulse"
          />
        )}

        {/* Additional Markers (Emergencies, Police) */}
        {markers.map((m, i) => (
          <Marker key={i} position={[m.lat, m.lng]} icon={createPulseIcon(m.color)} />
        ))}

      </MapContainer>
    </div>
  );
};

export default LiveMap;
