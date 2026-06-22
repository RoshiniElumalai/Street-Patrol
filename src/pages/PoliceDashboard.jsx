import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert, MapPin, Navigation, Radio, Clock, CheckCircle2,
  AlertTriangle, Users, Activity, Shield, PhoneCall, Wifi, WifiOff, Eye
} from 'lucide-react';
import LiveMap from '../components/map/LiveMap';

const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

const STATUS_COLORS = {
  active:     { bg: 'bg-red-500/10 border-red-500/40',     text: 'text-red-400',    dot: 'bg-red-500',     label: 'ACTIVE' },
  dispatched: { bg: 'bg-amber-500/10 border-amber-500/40', text: 'text-amber-400',  dot: 'bg-amber-500',   label: 'DISPATCHED' },
  resolved:   { bg: 'bg-emerald-500/10 border-emerald-400/40', text: 'text-emerald-400', dot: 'bg-emerald-500', label: 'RESOLVED' },
};

export const PoliceDashboard = () => {
  const [alerts, setAlerts]         = useState([]);
  const [connected, setConnected]   = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [stats, setStats]           = useState({ active: 0, dispatched: 0, resolved: 0 });

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });

    socket.on('connect',    () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('emergency_broadcast', (alert) => {
      const newAlert = {
        id:         alert.userId + '_' + alert.timestamp,
        threatType: alert.reason || 'SOS Alert',
        timestamp:  alert.timestamp || Date.now(),
        lat:        alert.location?.lat || alert.location?.latitude,
        lng:        alert.location?.lng || alert.location?.longitude,
        userName:   alert.userName || 'Unknown Citizen',
        mapsLink:   alert.mapsLink,
        status:     'active',
      };
      setAlerts(prev => [newAlert, ...prev.filter(a => a.id !== newAlert.id)]);
    });

    socket.on('location_update', ({ id, latitude, longitude }) => {
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, lat: latitude, lng: longitude } : a));
    });

    return () => socket.close();
  }, []);

  // Keep stats in sync
  useEffect(() => {
    setStats({
      active:     alerts.filter(a => a.status === 'active').length,
      dispatched: alerts.filter(a => a.status === 'dispatched').length,
      resolved:   alerts.filter(a => a.status === 'resolved').length,
    });
  }, [alerts]);

  const handleDispatch = (id) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'dispatched' } : a));
    if (selectedAlert?.id === id) setSelectedAlert(a => ({ ...a, status: 'dispatched' }));
  };

  const handleResolve = (id) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'resolved' } : a));
    if (selectedAlert?.id === id) setSelectedAlert(null);
  };

  const mapMarkers = alerts
    .filter(a => a.lat && a.lng && a.status !== 'resolved')
    .map(a => ({
      lat:   a.lat,
      lng:   a.lng,
      color: a.status === 'active' ? '#ef4444' : '#f59e0b',
      name:  `${a.threatType} — ${a.userName}`,
    }));

  return (
    <div className="flex flex-col h-full bg-slate-950 text-white overflow-hidden">

      {/* ─── Stats Bar ─── */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center gap-6">
        {/* Connection */}
        <div className="flex items-center gap-2">
          {connected
            ? <><Wifi size={14} className="text-emerald-400" /><span className="text-emerald-400 text-xs font-black uppercase tracking-widest">Live Feed</span></>
            : <><WifiOff size={14} className="text-red-400 animate-pulse" /><span className="text-red-400 text-xs font-black uppercase tracking-widest">Disconnected</span></>
          }
        </div>

        <div className="w-px h-5 bg-slate-700" />

        {[
          { label: 'Active',     value: stats.active,     color: 'text-red-400' },
          { label: 'En Route',   value: stats.dispatched, color: 'text-amber-400' },
          { label: 'Resolved',   value: stats.resolved,   color: 'text-emerald-400' },
          { label: 'Total',      value: alerts.length,    color: 'text-slate-300' },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-2">
            <span className={`text-xl font-black tabular-nums ${s.color}`}>{s.value}</span>
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{s.label}</span>
          </div>
        ))}

        <div className="ml-auto text-slate-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
          <Clock size={11} /> {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* ─── Main Grid ─── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ─── Alert Feed (left) ─── */}
        <div className="w-80 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
              <Radio size={14} className="text-red-400 animate-pulse" /> Incident Feed
            </h2>
            {stats.active > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
                {stats.active} NEW
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <AnimatePresence>
              {alerts.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center h-48 text-slate-600">
                  <Shield size={40} className="mb-3 opacity-30" />
                  <p className="text-sm font-bold">No active emergencies</p>
                  <p className="text-xs mt-1">Area is secure</p>
                </motion.div>
              ) : (
                alerts.map(alert => {
                  const st = STATUS_COLORS[alert.status] || STATUS_COLORS.active;
                  const isSelected = selectedAlert?.id === alert.id;
                  return (
                    <motion.div
                      key={alert.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      onClick={() => setSelectedAlert(alert)}
                      className={`rounded-xl p-3 border cursor-pointer transition-all ${st.bg} ${
                        isSelected ? 'ring-2 ring-white/20' : 'hover:ring-1 hover:ring-white/10'
                      }`}
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${st.dot} ${alert.status === 'active' ? 'animate-ping' : ''}`} />
                          <span className={`text-[9px] font-black uppercase tracking-widest ${st.text}`}>{st.label}</span>
                        </div>
                        <span className="text-[9px] text-slate-500 flex-shrink-0 tabular-nums">
                          {new Date(alert.timestamp).toLocaleTimeString()}
                        </span>
                      </div>

                      <p className="text-white font-black text-xs mb-1 leading-snug">{alert.threatType}</p>
                      <p className="text-slate-400 text-[10px] font-bold mb-2 flex items-center gap-1">
                        <Users size={9} /> {alert.userName}
                      </p>

                      {alert.lat && (
                        <p className="text-slate-500 text-[10px] font-mono flex items-center gap-1 mb-3">
                          <MapPin size={9} /> {alert.lat.toFixed(4)}, {alert.lng.toFixed(4)}
                        </p>
                      )}

                      {/* Action Buttons */}
                      {alert.status === 'active' && (
                        <div className="flex gap-2">
                          <button onClick={e => { e.stopPropagation(); handleDispatch(alert.id); }}
                            className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-black rounded-lg text-[10px] uppercase tracking-wider transition-colors flex items-center justify-center gap-1">
                            <Navigation size={10} /> Dispatch
                          </button>
                          {alert.mapsLink && (
                            <a href={alert.mapsLink} target="_blank" rel="noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="w-8 h-7 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center justify-center text-slate-300 transition-colors">
                              <Eye size={12} />
                            </a>
                          )}
                        </div>
                      )}
                      {alert.status === 'dispatched' && (
                        <button onClick={e => { e.stopPropagation(); handleResolve(alert.id); }}
                          className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-lg text-[10px] uppercase tracking-wider transition-colors flex items-center justify-center gap-1">
                          <CheckCircle2 size={10} /> Mark Resolved
                        </button>
                      )}
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ─── Map (center/right) ─── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Selected Alert Detail Banner */}
          <AnimatePresence>
            {selectedAlert && (
              <motion.div
                initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -60, opacity: 0 }}
                className="bg-red-950/80 border-b border-red-900 px-6 py-3 flex items-center gap-4 flex-shrink-0"
              >
                <AlertTriangle size={18} className="text-red-400 animate-pulse flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-black text-sm truncate">{selectedAlert.threatType}</p>
                  <p className="text-red-300 text-[10px]">
                    {selectedAlert.userName} · {new Date(selectedAlert.timestamp).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {selectedAlert.status === 'active' && (
                    <button onClick={() => handleDispatch(selectedAlert.id)}
                      className="px-3 py-1.5 bg-amber-500 text-slate-900 font-black rounded-lg text-xs flex items-center gap-1 hover:bg-amber-400 transition-colors">
                      <Navigation size={12} /> Dispatch Unit
                    </button>
                  )}
                  {selectedAlert.status === 'dispatched' && (
                    <button onClick={() => handleResolve(selectedAlert.id)}
                      className="px-3 py-1.5 bg-emerald-600 text-white font-black rounded-lg text-xs flex items-center gap-1 hover:bg-emerald-500 transition-colors">
                      <CheckCircle2 size={12} /> Resolve
                    </button>
                  )}
                  {selectedAlert.mapsLink && (
                    <a href={selectedAlert.mapsLink} target="_blank" rel="noreferrer"
                      className="px-3 py-1.5 bg-slate-700 text-white font-black rounded-lg text-xs flex items-center gap-1 hover:bg-slate-600 transition-colors">
                      <MapPin size={12} /> Open Map
                    </a>
                  )}
                  <button onClick={() => setSelectedAlert(null)}
                    className="px-3 py-1.5 bg-slate-800 text-slate-400 font-bold rounded-lg text-xs hover:bg-slate-700 transition-colors">
                    ✕
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Map */}
          <div className="flex-1 relative">
            <LiveMap
              center={selectedAlert?.lat ? [selectedAlert.lat, selectedAlert.lng] : [13.0827, 80.2707]}
              zoom={selectedAlert ? 15 : 12}
              interactive={true}
              markers={mapMarkers}
            />

            {/* Map Overlay — Legend */}
            <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur border border-slate-700 rounded-xl p-3 text-xs space-y-1.5 z-[400]">
              <p className="text-slate-400 font-black uppercase tracking-widest text-[9px] mb-2">Map Legend</p>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_6px_#ef4444]" /><span className="text-slate-300 font-bold">Active SOS</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500" /><span className="text-slate-300 font-bold">Unit Dispatched</span></div>
            </div>

            {/* Empty Map State */}
            {mapMarkers.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-slate-900/80 backdrop-blur rounded-2xl p-6 text-center border border-slate-700">
                  <Activity size={32} className="text-emerald-400 mx-auto mb-2" />
                  <p className="text-white font-black">Area Secure</p>
                  <p className="text-slate-400 text-xs mt-1">No active emergencies on map</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
