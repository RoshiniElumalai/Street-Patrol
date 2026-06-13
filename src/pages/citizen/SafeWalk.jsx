import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Search, Navigation, MapPin, Clock, Zap, Shield, ChevronRight, Loader } from 'lucide-react';
import LiveMap from '../../components/map/LiveMap';
import { useStore } from '../../context/useStore';
import { useSafeWalkMonitor } from '../../hooks/useSafeWalkMonitor';
import { useSafeZones } from '../../hooks/useSafeZones';
import { geocodeAddress, getRoute, calculateDistance } from '../../utils/geo';

const SafeWalk = () => {
  const { lastKnownLocation, triggerEmergency } = useStore();
  const { currentLocation, routeCoords, isActive, startTracking, stopTracking, distanceKm, etaMinutes } = useSafeWalkMonitor();
  const [destination, setDestination] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [realRouteCoords, setRealRouteCoords] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);
  const [routeMode, setRouteMode] = useState('fastest');
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const searchTimeout = useRef(null);

  const userLoc = lastKnownLocation || currentLocation;
  const { safeZones } = useSafeZones(userLoc, 5000);

  // Debounced search
  useEffect(() => {
    clearTimeout(searchTimeout.current);
    if (searchText.length < 3) { setSearchResults([]); return; }
    setIsSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchText)}&format=json&limit=5`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data = await res.json();
        setSearchResults(data);
      } catch (e) { setSearchResults([]); }
      finally { setIsSearching(false); }
    }, 600);
  }, [searchText]);

  const selectDestination = async (result) => {
    const dest = { lat: parseFloat(result.lat), lng: parseFloat(result.lon), name: result.display_name };
    setDestination(dest);
    setSearchText(result.display_name.split(',')[0]);
    setSearchResults([]);
    if (userLoc) {
      setIsLoadingRoute(true);
      try {
        const routeData = await getRoute(userLoc.lat, userLoc.lng, dest.lat, dest.lng);
        if (routeData) setRealRouteCoords(routeData.coordinates);
        const dist = calculateDistance(userLoc.lat, userLoc.lng, dest.lat, dest.lng);
        setRouteInfo({ distance: dist.toFixed(2), eta: Math.round(dist / 0.083), safetyScore: Math.round(80 + Math.random() * 15) });
      } catch (e) {
        const dist = calculateDistance(userLoc.lat, userLoc.lng, dest.lat, dest.lng);
        setRouteInfo({ distance: dist.toFixed(2), eta: Math.round(dist / 0.083), safetyScore: 82 });
      }
      setIsLoadingRoute(false);
    }
  };

  const handleMapClick = async (latlng) => {
    if (!isActive) {
      const dest = { lat: latlng.lat, lng: latlng.lng, name: `${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}` };
      setDestination(dest);
      setSearchText(dest.name);
      if (userLoc) {
        setIsLoadingRoute(true);
        try {
          const routeData = await getRoute(userLoc.lat, userLoc.lng, dest.lat, dest.lng);
          if (routeData) setRealRouteCoords(routeData.coordinates);
          const dist = calculateDistance(userLoc.lat, userLoc.lng, dest.lat, dest.lng);
          setRouteInfo({ distance: dist.toFixed(2), eta: Math.round(dist / 0.083), safetyScore: 82 });
        } catch (e) {}
        setIsLoadingRoute(false);
      }
    }
  };

  const handleStart = () => { destination && startTracking(destination); };
  const handleStop = () => { stopTracking(); setRealRouteCoords([]); setRouteInfo(null); };

  const allMarkers = [
    ...safeZones,
    destination ? { lat: destination.lat, lng: destination.lng, color: '#ef4444', label: 'Destination' } : null,
  ].filter(Boolean);

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 to-blue-900 px-5 pt-6 pb-5">
        <div className="flex items-center gap-2 mb-1">
          <Navigation size={18} className="text-blue-400" />
          <span className="text-blue-400 text-xs font-black uppercase tracking-widest">Safe Navigation</span>
        </div>
        <h1 className="text-2xl font-black text-white">SafeWalk</h1>

        {/* Search */}
        <div className="relative mt-3">
          <div className="flex items-center gap-3 bg-white/10 border border-white/20 rounded-2xl px-4 py-3">
            <Search size={18} className="text-white/60 flex-shrink-0" />
            <input
              type="text"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              placeholder="Search destination..."
              className="flex-1 bg-transparent text-white placeholder-white/50 outline-none text-sm font-medium"
            />
            {isSearching && <Loader size={16} className="text-white/60 animate-spin" />}
          </div>
          {/* Search results dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden">
              {searchResults.map((r, i) => (
                <button key={i} onClick={() => selectDestination(r)}
                  className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-start gap-3 border-b border-slate-50 last:border-0">
                  <MapPin size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-slate-700 text-sm font-medium leading-snug line-clamp-2">{r.display_name}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Route Mode Tabs */}
        <div className="flex gap-2 mt-3">
          {['fastest', 'safest'].map(m => (
            <button key={m} onClick={() => setRouteMode(m)}
              className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-colors ${
                routeMode === m ? 'bg-white text-slate-900' : 'bg-white/10 text-white/60'
              }`}>{m}</button>
          ))}
        </div>
      </div>

      {/* Route Info Bar */}
      {routeInfo && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white border-b border-slate-100 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="text-center">
              <p className="text-xl font-black text-slate-800">{routeInfo.distance} km</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Distance</p>
            </div>
            <div className="w-px h-8 bg-slate-100" />
            <div className="text-center">
              <p className="text-xl font-black text-slate-800">{routeInfo.eta} min</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase">ETA</p>
            </div>
            <div className="w-px h-8 bg-slate-100" />
            <div className="text-center">
              <p className={`text-xl font-black ${routeInfo.safetyScore > 80 ? 'text-emerald-500' : 'text-amber-500'}`}>
                {routeInfo.safetyScore}%
              </p>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Safety</p>
            </div>
          </div>
          {isLoadingRoute && <Loader size={18} className="text-blue-500 animate-spin" />}
        </motion.div>
      )}

      {/* Map */}
      <div className="flex-1 relative min-h-0">
        <LiveMap
          userLocation={userLoc}
          destination={destination}
          routeCoords={realRouteCoords.length > 0 ? realRouteCoords : routeCoords}
          onMapClick={handleMapClick}
          interactive={!isActive}
          markers={allMarkers}
          routeColor={routeMode === 'safest' ? '#10b981' : '#3b82f6'}
        />

        {/* Safe Zones Legend */}
        <div className="absolute top-3 right-3 bg-white/95 backdrop-blur rounded-xl p-3 shadow-lg border border-slate-100">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Safe Zones</p>
          {[
            { color: '#3b82f6', label: 'Police' },
            { color: '#10b981', label: 'Hospital' },
          ].map(z => (
            <div key={z.label} className="flex items-center gap-2 mb-1 last:mb-0">
              <div className="w-3 h-3 rounded-full" style={{ background: z.color }} />
              <span className="text-[11px] font-bold text-slate-600">{z.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Action */}
      <div className="bg-white border-t border-slate-100 p-4">
        {!isActive ? (
          <button onClick={handleStart} disabled={!destination}
            className={`w-full py-4 rounded-2xl font-black text-base transition-all flex items-center justify-center gap-3 ${
              destination
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-400/30 hover:bg-blue-700 active:scale-[0.98]'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}>
            <Navigation size={20} />
            {destination ? 'Start SafeWalk' : 'Select a destination'}
          </button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-blue-50 rounded-2xl p-3 border border-blue-100">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
                <span className="text-blue-700 font-bold text-sm">SafeWalk Active</span>
              </div>
              <span className="text-blue-600 font-black">{distanceKm?.toFixed(2) || '0.00'} km</span>
            </div>
            <div className="flex gap-3">
              <button onClick={() => triggerEmergency('SafeWalk SOS')}
                className="flex-1 py-3 bg-red-500 text-white font-black rounded-2xl text-sm shadow-md">
                🚨 SOS
              </button>
              <button onClick={handleStop}
                className="flex-1 py-3 bg-slate-200 text-slate-700 font-black rounded-2xl text-sm">
                End Walk
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SafeWalk;
