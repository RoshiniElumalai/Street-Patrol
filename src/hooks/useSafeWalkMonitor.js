import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../context/useStore';
import { calculateDistance } from '../utils/geo';

export const useSafeWalkMonitor = (isActive, destination) => {
  const { socket } = useStore();
  const [currentLocation, setCurrentLocation] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  
  // Real analytics variables for UI
  const [distanceRemaining, setDistanceRemaining] = useState(0);
  const [safetyScore, setSafetyScore] = useState(100);
  const [routeStatus, setRouteStatus] = useState('Safe');
  const [warnings, setWarnings] = useState([]);
  const [batteryLevel, setBatteryLevel] = useState(100);

  // Battery tracking
  useEffect(() => {
    if ('getBattery' in navigator) {
      navigator.getBattery().then((battery) => {
        setBatteryLevel(battery.level * 100);
        battery.addEventListener('levelchange', () => {
          setBatteryLevel(battery.level * 100);
        });
      });
    }
  }, []);

  useEffect(() => {
    let watchId;

    if (isActive) {
      if ('geolocation' in navigator) {
        watchId = navigator.geolocation.watchPosition(
          (position) => {
            const { latitude, longitude, accuracy } = position.coords;
            const newLoc = { lat: latitude, lng: longitude };
            
            setCurrentLocation(newLoc);
            
            // Calculate real distance remaining
            if (destination) {
              const dist = calculateDistance(latitude, longitude, destination.lat, destination.lng);
              setDistanceRemaining(dist);
            }
            
            setRouteCoords(prev => {
              const updated = [...prev, [latitude, longitude]];
              return updated;
            });

            if (socket) {
              socket.emit('gps_update', {
                lat: latitude,
                lng: longitude,
                accuracy,
                timestamp: Date.now()
              });
            }
          },
          (error) => {
            console.error("GPS Error:", error);
          },
          {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 5000
          }
        );
      } else {
        console.error("Geolocation is not supported by this browser.");
      }
    }

    return () => {
      if (watchId !== undefined) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [isActive, socket]);

  return {
    currentLocation,
    routeCoords,
    distanceRemaining,
    safetyScore,
    routeStatus,
    warnings,
    batteryLevel
  };
};
