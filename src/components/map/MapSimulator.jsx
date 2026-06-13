import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useSimulation } from '../../context/SimulationContext';

// Fix Leaflet's default icon path issues in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons
const createPulseIcon = (color) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="
      background-color: ${color}; 
      width: 15px; height: 15px; 
      border-radius: 50%; 
      box-shadow: 0 0 10px ${color}, 0 0 20px ${color};
      border: 2px solid white;
    "></div>`,
    iconSize: [15, 15],
    iconAnchor: [7.5, 7.5]
  });
};

const MapUpdater = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
};

const MapSimulator = ({ 
  center = [34.0522, -118.2437], 
  zoom = 13, 
  showIncidents = true, 
  showOfficers = true, 
  interactive = true,
  style = { height: '100%', width: '100%' }
}) => {
  const { incidents, officers } = useSimulation();

  // Using CartoDB Dark Matter for that dark futuristic feel
  const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
  const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

  return (
    <div style={{ ...style, borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-glass)' }}>
      <MapContainer 
        center={center} 
        zoom={zoom} 
        scrollWheelZoom={interactive}
        dragging={interactive}
        zoomControl={interactive}
        style={{ height: '100%', width: '100%', background: 'var(--color-bg-base)' }}
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        <MapUpdater center={center} />

        {showIncidents && incidents.map((incident) => {
          const color = incident.status === 'active' ? '#ff2a2a' : '#ffb300';
          return (
            <React.Fragment key={incident.id}>
              <Marker 
                position={[incident.lat, incident.lng]} 
                icon={createPulseIcon(color)}
              />
              <Circle 
                center={[incident.lat, incident.lng]} 
                pathOptions={{ color: color, fillColor: color, fillOpacity: 0.1, weight: 1 }}
                radius={incident.status === 'active' ? 200 : 100}
                className={incident.status === 'active' ? 'animate-pulse-danger' : ''}
              />
            </React.Fragment>
          );
        })}

        {showOfficers && officers.map((officer) => (
          <Marker 
            key={officer.id}
            position={[officer.lat, officer.lng]} 
            icon={createPulseIcon('#00d2ff')}
          />
        ))}
      </MapContainer>
    </div>
  );
};

export default MapSimulator;
