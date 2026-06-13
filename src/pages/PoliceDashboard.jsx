import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { MapPin, ShieldAlert, Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import LiveMap from '../components/map/LiveMap';

// Replace with your actual backend IP/Port later
const SOCKET_URL = 'http://localhost:4000';

export const PoliceDashboard = () => {
  const [alerts, setAlerts] = useState([]);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    // Listen for live emergencies broadcasted by the backend
    newSocket.on('emergency_broadcast', (alert) => {
      // The backend sends { userId, userName, reason, location: { lat, lng }, ... }
      const newAlert = {
        id: alert.userId + '_' + alert.timestamp,
        threatType: alert.reason,
        timestamp: alert.timestamp,
        latitude: alert.location?.lat || alert.location?.latitude,
        longitude: alert.location?.lng || alert.location?.longitude,
      };
      
      setAlerts(prev => [newAlert, ...prev.filter(a => a.id !== newAlert.id)]);
    });

    newSocket.on('location_update', ({ id, latitude, longitude }) => {
      setAlerts(prev => prev.map(a => 
        a.id === id ? { ...a, latitude, longitude } : a
      ));
    });

    return () => newSocket.close();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
              <ShieldAlert className="text-primary-red" size={36} />
              Police Command Center
            </h1>
            <p className="text-slate-500 mt-1 font-medium">Live Emergency Monitoring Dashboard</p>
          </div>
          <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </div>
            <span className="font-semibold text-slate-700">System Online</span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Active Alerts Feed */}
          <div className="lg:col-span-1 bg-white rounded-3xl p-6 shadow-glass border border-slate-100 min-h-[600px]">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <span className="bg-red-100 text-primary-red px-2 py-0.5 rounded-full text-sm">
                {alerts.length}
              </span>
              Active Emergencies
            </h2>
            
            <div className="space-y-4">
              <AnimatePresence>
                {alerts.length === 0 ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10 text-slate-400">
                    <ShieldAlert size={48} className="mx-auto mb-3 opacity-20" />
                    <p>No active emergencies.</p>
                  </motion.div>
                ) : (
                  alerts.map((alert) => (
                    <motion.div
                      key={alert.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="p-4 rounded-2xl border-l-4 border-l-primary-red bg-slate-50 shadow-sm relative overflow-hidden"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-slate-900 flex items-center gap-2">
                          {alert.threatType || "Unknown Threat"}
                        </h3>
                        <span className="text-[10px] text-slate-500 bg-slate-200 px-2 py-1 rounded-md">
                          {new Date(alert.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
                        <MapPin size={14} className="text-primary-red" />
                        {alert.latitude ? `${alert.latitude.toFixed(4)}, ${alert.longitude.toFixed(4)}` : 'Locating...'}
                      </div>
                      
                      <button className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                        <Navigation size={16} /> Respond
                      </button>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
          
          {/* Map Area */}
          <div className="lg:col-span-2 bg-slate-200 rounded-3xl overflow-hidden relative border border-slate-300 min-h-[600px] flex items-center justify-center p-2">
            <LiveMap 
              center={[13.0827, 80.2707]} // Default center
              zoom={13}
              interactive={true}
              markers={alerts.map(alert => ({
                lat: alert.latitude || 13.0827, 
                lng: alert.longitude || 80.2707,
                color: '#e11d48',
                label: alert.threatType || 'Emergency'
              }))}
            />
          </div>

        </div>
      </div>
    </div>
  );
};
