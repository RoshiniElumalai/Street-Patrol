import React, { createContext, useContext, useState, useEffect } from 'react';

const SimulationContext = createContext(null);

export const useSimulation = () => useContext(SimulationContext);

// Mock Data
const INITIAL_INCIDENTS = [
  { id: 'inc_1', lat: 34.0522, lng: -118.2437, type: 'Gunshot', confidence: 98, status: 'active', time: new Date().toISOString() },
  { id: 'inc_2', lat: 34.0480, lng: -118.2500, type: 'Scream', confidence: 85, status: 'dispatched', time: new Date(Date.now() - 5 * 60000).toISOString() }
];

const INITIAL_OFFICERS = [
  { id: 'off_1', name: 'Unit 7A', lat: 34.0500, lng: -118.2450, status: 'Available' },
  { id: 'off_2', name: 'Air Support 1', lat: 34.0600, lng: -118.2300, status: 'On Patrol' }
];

export const SimulationProvider = ({ children }) => {
  const [incidents, setIncidents] = useState(INITIAL_INCIDENTS);
  const [officers, setOfficers] = useState(INITIAL_OFFICERS);
  const [cityThreatLevel, setCityThreatLevel] = useState('Elevated');

  // Simulate real-time updates (fake websockets)
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate officer movement slightly
      setOfficers(prev => prev.map(off => ({
        ...off,
        lat: off.lat + (Math.random() - 0.5) * 0.001,
        lng: off.lng + (Math.random() - 0.5) * 0.001
      })));

      // Randomly spawn new incidents very rarely (e.g., 5% chance every 5s)
      if (Math.random() > 0.95) {
        const newIncident = {
          id: `inc_${Date.now()}`,
          lat: 34.0500 + (Math.random() - 0.5) * 0.05,
          lng: -118.2400 + (Math.random() - 0.5) * 0.05,
          type: ['Glass Break', 'Aggressive Shouting', 'Scream'][Math.floor(Math.random() * 3)],
          confidence: Math.floor(Math.random() * 20) + 80, // 80-99
          status: 'active',
          time: new Date().toISOString()
        };
        setIncidents(prev => [newIncident, ...prev]);
        setCityThreatLevel('High');
        
        // Auto reset threat level after 10s
        setTimeout(() => setCityThreatLevel('Elevated'), 10000);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const triggerSOS = (location) => {
    const sosIncident = {
      id: `sos_${Date.now()}`,
      lat: location.lat,
      lng: location.lng,
      type: 'Manual SOS',
      confidence: 100,
      status: 'active',
      time: new Date().toISOString()
    };
    setIncidents(prev => [sosIncident, ...prev]);
  };

  const dispatchOfficer = (incidentId, officerId) => {
    setIncidents(prev => prev.map(inc => inc.id === incidentId ? { ...inc, status: 'dispatched' } : inc));
    setOfficers(prev => prev.map(off => off.id === officerId ? { ...off, status: 'Busy' } : off));
  };

  return (
    <SimulationContext.Provider value={{
      incidents,
      officers,
      cityThreatLevel,
      triggerSOS,
      dispatchOfficer
    }}>
      {children}
    </SimulationContext.Provider>
  );
};
