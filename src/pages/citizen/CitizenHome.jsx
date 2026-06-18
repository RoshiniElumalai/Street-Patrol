import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, ShieldAlert, ShieldCheck, Navigation, PhoneCall, AlertTriangle,
  Battery, Wifi, Activity, MapPin, Users, Eye, Settings, Mic, MicOff,
  Bell, Clock, BellOff, X, Phone
} from 'lucide-react';
import LiveMap from '../../components/map/LiveMap';
import { useStore } from '../../context/useStore';
import { useHardwareTriggers } from '../../hooks/useHardwareTriggers';
import { useSafeZones } from '../../hooks/useSafeZones';
import { calculateDistance } from '../../utils/geo';

import { Capacitor, registerPlugin } from '@capacitor/core';

const BackgroundProtection = registerPlugin('BackgroundProtection');

const CitizenHome = () => {
  const navigate = useNavigate();
  const [isProtectionActive, setIsProtectionActive] = useState(false);
  const [showFakeCall, setShowFakeCall] = useState(false);
  const [showSafeZonesModal, setShowSafeZonesModal] = useState(false);
  const [battery, setBattery] = useState(null);

  const {
    currentUser,
    threatLevel,
    aiMessage,
    triggerEmergency,
    cancelEmergency,
    sendEmergencyAlert,
    countdown,
    riskScore,
    audioLevel,
    isSocketConnected,
    gpsActive,
    smsDeliveryStatus,
    isEmergencyMode,
    emergencyData,
    lastKnownLocation,
    contacts,
    alertHistory,
  } = useStore();

  const { isListening, setIsListening, micPermission, analyserNode } = useHardwareTriggers();
  const { safeZones } = useSafeZones(lastKnownLocation, 3000);
  const policeCount = safeZones.filter(z => z.type === 'police').length;
  const safetyScore = Math.round((1 - riskScore) * 100);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const isNightMode = hour >= 20 || hour < 6;

  useEffect(() => {
    if (navigator.getBattery) {
      navigator.getBattery().then(b => {
        setBattery(Math.round(b.level * 100));
        b.onlevelchange = () => setBattery(Math.round(b.level * 100));
      });
    }
  }, []);

  const toggleProtection = async () => {
    const next = !isProtectionActive;
    setIsProtectionActive(next);
    setIsListening(next);
    
    if (Capacitor.isNativePlatform()) {
      try {
        if (next) {
          await BackgroundProtection.startBackgroundService();
        } else {
          await BackgroundProtection.stopBackgroundService();
        }
      } catch (err) {
        console.warn("Failed to toggle native background service:", err);
      }
    }
  };

  const handleSendNow = () => {
    cancelEmergency();
    navigator.geolocation?.getCurrentPosition(
      (pos) => sendEmergencyAlert('Manual SOS', { lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => sendEmergencyAlert('Manual SOS')
    ) ?? sendEmergencyAlert('Manual SOS');
  };

  const threatGradient =
    threatLevel === 'CRITICAL' ? 'from-red-600 via-red-700 to-rose-900' :
    threatLevel === 'HIGH'     ? 'from-orange-500 to-red-700' :
    threatLevel === 'MEDIUM'   ? 'from-amber-500 to-orange-600' :
                                 'from-slate-800 via-slate-800 to-slate-900';

  const quickActions = [
    { icon: Navigation, label: 'SafeWalk', sub: 'Live Route', color: 'bg-blue-500', path: '/citizen/tracking' },
    { icon: PhoneCall,  label: 'Contacts', sub: `${contacts.length} saved`, color: 'bg-emerald-500', path: '/citizen/contacts' },
    { icon: Bell,       label: 'Alerts',   sub: `${alertHistory.length} total`, color: 'bg-amber-500', path: '/citizen/alerts' },
    { icon: Users,      label: 'Guardians', sub: 'Tracking', color: 'bg-purple-500', path: '/citizen/guardians' },
    { icon: Eye,        label: 'Vault',     sub: 'Evidence', color: 'bg-indigo-500', path: '/citizen/vault' },
    { icon: Settings,   label: 'Settings',  sub: 'Configure', color: 'bg-slate-600', path: '/citizen/settings' },
  ];

  return (
    <div className="bg-slate-50 pb-4 min-h-full">

      {/* ─── HERO ─── */}
      <div className={`bg-gradient-to-br ${threatGradient} px-5 pt-5 pb-6 transition-all duration-1000`}>

        {/* Night Mode Banner */}
        {isNightMode && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-amber-400/20 border border-amber-400/40 rounded-xl px-3 py-2 mb-4 flex items-center gap-2">
            <Clock size={13} className="text-amber-300" />
            <span className="text-amber-300 text-xs font-bold uppercase tracking-wider">Night Safety Mode — Enhanced monitoring on</span>
          </motion.div>
        )}

        {/* Greeting + Protection Toggle */}
        <div className="flex items-start justify-between">
          <div className="flex-1 mr-4">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{greeting}</p>
            <h2 className="text-3xl font-black text-white mt-1 leading-tight">
              {currentUser?.name?.split(' ')[0] || 'Citizen'}
            </h2>
            <div className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
              threatLevel === 'LOW'    ? 'bg-emerald-500/20 text-emerald-300' :
              threatLevel === 'MEDIUM' ? 'bg-amber-500/20 text-amber-300' :
              'bg-red-400/30 text-red-200 animate-pulse'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${
                threatLevel === 'LOW' ? 'bg-emerald-400' : threatLevel === 'MEDIUM' ? 'bg-amber-400' : 'bg-red-300 animate-ping'
              }`} />
              {threatLevel} RISK
            </div>
          </div>

          {/* ARM/DISARM Button */}
          <div className="flex flex-col items-center gap-1">
            <button onClick={toggleProtection}
              className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                isProtectionActive
                  ? 'bg-red-500 shadow-[0_0_40px_rgba(239,68,68,0.7)]'
                  : 'bg-white/10 border-2 border-white/30 hover:bg-white/20'
              }`}>
              {isProtectionActive && <div className="absolute inset-0 rounded-full border-4 border-white/20 animate-ping" />}
              <Shield size={38} className="text-white" />
            </button>
            <span className="text-white text-[10px] font-black uppercase tracking-widest">
              {isProtectionActive ? 'DISARM' : 'ARM'}
            </span>
          </div>
        </div>

        {/* AI Status Message */}
        <div className="mt-4 bg-white/10 rounded-2xl p-3.5 border border-white/10 flex items-center gap-3">
          <div className={`p-2 rounded-xl flex-shrink-0 ${isProtectionActive ? 'bg-red-500/40 animate-pulse' : 'bg-blue-500/30'}`}>
            <Activity size={16} className="text-white" />
          </div>
          <p className="text-white text-sm font-semibold leading-snug">{aiMessage}</p>
        </div>

        {/* Waveform Visualizer */}
        {isProtectionActive && (
          <WaveformVisualizer analyserNode={analyserNode} isActive={isListening} />
        )}

        {/* Live Status Pills */}
        <div className="flex gap-2 mt-3 flex-wrap">
          <StatusPill icon={isProtectionActive ? Mic : MicOff}
            label={isProtectionActive ? `${Math.round(audioLevel)} dB` : 'MIC OFF'}
            active={isProtectionActive && isListening}
            onClick={() => navigate('/citizen/health')} />
          <StatusPill icon={MapPin} label={gpsActive ? 'GPS Active' : 'GPS Off'} active={gpsActive} onClick={() => navigate('/citizen/health')} />
          <StatusPill icon={Wifi} label={isSocketConnected ? 'Online' : 'Offline'} active={isSocketConnected} onClick={() => navigate('/citizen/health')} />
          {battery !== null && <StatusPill icon={Battery} label={`${battery}%`} active={battery > 20} warning={battery <= 20} onClick={() => navigate('/citizen/health')} />}
        </div>
      </div>

      <div className="px-4 space-y-4 mt-4">

        {/* ─── SCORE CARDS ─── */}
        <div className="grid grid-cols-3 gap-3">
          <ScoreCard value={safetyScore} label="Safety Score"
            color={safetyScore > 80 ? 'text-emerald-500' : safetyScore > 50 ? 'text-amber-500' : 'text-red-500'} />
          <ScoreCard value={policeCount > 0 ? policeCount : '?'} label="Police Nearby" color="text-blue-500" onClick={() => setShowSafeZonesModal(true)} />
          <ScoreCard value={contacts.length} label="Guardians" color="text-purple-500" />
        </div>

        {/* ─── BIG SOS BUTTON ─── */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => triggerEmergency('Manual SOS Override')}
          className="w-full bg-gradient-to-r from-red-500 to-rose-600 rounded-3xl p-5 shadow-xl shadow-red-400/40 flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 animate-pulse">
            <ShieldAlert size={32} className="text-white" />
          </div>
          <div className="text-left">
            <p className="text-white text-xl font-black tracking-wider">SOS EMERGENCY</p>
            <p className="text-red-200 text-xs font-bold mt-0.5">Tap to send immediate alert to all contacts</p>
          </div>
        </motion.button>

        {/* ─── QUICK ACTIONS ─── */}
        <div>
          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Quick Access</h3>
          <div className="grid grid-cols-3 gap-3">
            {quickActions.map((a) => {
              const Icon = a.icon;
              return (
                <motion.button key={a.path} whileTap={{ scale: 0.93 }}
                  onClick={() => navigate(a.path)}
                  className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-sm flex flex-col items-center text-center">
                  <div className={`w-11 h-11 ${a.color} rounded-xl flex items-center justify-center mb-2`}>
                    <Icon size={20} className="text-white" />
                  </div>
                  <p className="text-slate-800 font-bold text-[11px]">{a.label}</p>
                  <p className="text-slate-400 text-[9px] mt-0.5">{a.sub}</p>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* ─── UTILITY ROW ─── */}
        <div className="grid grid-cols-2 gap-3">
          <motion.button whileTap={{ scale: 0.96 }}
            onClick={() => setShowFakeCall(true)}
            className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <PhoneCall size={19} className="text-purple-600" />
            </div>
            <div className="text-left">
              <p className="font-bold text-slate-800 text-sm">Fake Call</p>
              <p className="text-slate-400 text-[10px]">Escape system</p>
            </div>
          </motion.button>

          <motion.button whileTap={{ scale: 0.96 }}
            onClick={toggleProtection}
            className={`rounded-2xl p-4 border shadow-sm flex items-center gap-3 transition-colors ${
              isProtectionActive ? 'bg-red-50 border-red-200' : 'bg-white border-slate-100'
            }`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isProtectionActive ? 'bg-red-500' : 'bg-slate-100'
            }`}>
              {isProtectionActive
                ? <Mic size={19} className="text-white animate-pulse" />
                : <MicOff size={19} className="text-slate-500" />}
            </div>
            <div className="text-left">
              <p className="font-bold text-slate-800 text-sm">Voice SOS</p>
              <p className={`text-[10px] font-bold ${isProtectionActive ? 'text-red-500' : 'text-slate-400'}`}>
                {isProtectionActive ? 'Listening...' : 'Tap to arm'}
              </p>
            </div>
          </motion.button>
        </div>

        {/* ─── LIVE MAP ─── */}
        <div>
          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Live Safety Map</h3>
          <motion.button whileTap={{ scale: 0.99 }}
            onClick={() => navigate('/citizen/tracking')}
            className="w-full h-52 rounded-2xl overflow-hidden border border-slate-200 shadow-sm relative">
            <div className="absolute inset-0 pointer-events-none z-0">
              <LiveMap interactive={false} zoom={13} userLocation={lastKnownLocation} markers={safeZones.slice(0, 10)} />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-transparent to-transparent z-10 pointer-events-none" />
            <div className="absolute bottom-4 left-4 right-4 z-20 flex items-end justify-between pointer-events-none">
              <div>
                <p className="text-white font-black text-base">Live Map</p>
                <p className="text-emerald-400 text-xs font-bold">{policeCount} safe zones • Tap to navigate</p>
              </div>
              <div className="bg-white/20 backdrop-blur px-3 py-1.5 rounded-full">
                <p className="text-white text-xs font-bold">OPEN →</p>
              </div>
            </div>
          </motion.button>
        </div>
      </div>

      {/* ─── FAKE CALL OVERLAY ─── */}
      <AnimatePresence>
        {showFakeCall && (
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            className="fixed inset-0 z-[200] bg-slate-900 flex flex-col">
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="w-24 h-24 bg-slate-700 rounded-full flex items-center justify-center mb-6">
                <PhoneCall size={40} className="text-white" />
              </div>
              <p className="text-slate-400 text-lg mb-2">Incoming Call</p>
              <h2 className="text-5xl font-light text-white mb-2">Dad (Home)</h2>
              <p className="text-slate-500 text-sm animate-pulse">Ringing...</p>
            </div>
            <div className="pb-16 px-12 flex justify-between items-center">
              <div className="flex flex-col items-center gap-2">
                <button onClick={() => setShowFakeCall(false)}
                  className="w-18 h-18 w-[72px] h-[72px] rounded-full bg-red-500 flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.5)]">
                  <PhoneCall size={28} className="text-white rotate-[135deg]" />
                </button>
                <span className="text-slate-500 text-xs">Decline</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <button onClick={() => setShowFakeCall(false)}
                  className="w-[72px] h-[72px] rounded-full bg-emerald-500 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.5)] animate-pulse">
                  <PhoneCall size={28} className="text-white" />
                </button>
                <span className="text-slate-500 text-xs">Accept</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── SAFE ZONES DETAILS MODAL ─── */}
      <AnimatePresence>
        {showSafeZonesModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-end justify-center"
            onClick={() => setShowSafeZonesModal(false)}
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-white rounded-t-[32px] w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl border-t border-slate-100"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 mb-4 animate-pulse" />
              
              <div className="px-6 pb-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                    <Shield className="text-blue-500" size={20} />
                    Nearby Safety Hubs
                  </h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                    {safeZones.length} Secure Zones Identified
                  </p>
                </div>
                <button 
                  onClick={() => setShowSafeZonesModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {safeZones.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 font-bold text-sm">
                    <MapPin className="mx-auto mb-2 opacity-50" size={32} />
                    <p>No safety zones found nearby</p>
                  </div>
                ) : (
                  safeZones.map((zone, idx) => {
                    const isPolice = zone.type === 'police';
                    const isHospital = zone.type === 'hospital' || zone.type === 'clinic';
                    const isPharmacy = zone.type === 'pharmacy';
                    const isShelter = zone.type === 'womens_shelter';
                    
                    let typeLabel = 'Safety Center';
                    let typeColor = 'bg-blue-50 text-blue-600 border-blue-100';
                    let ZoneIcon = Shield;
                    
                    if (isPolice) {
                      typeLabel = 'Police Station';
                      typeColor = 'bg-blue-50 text-blue-600 border-blue-100';
                      ZoneIcon = Shield;
                    } else if (isHospital) {
                      typeLabel = 'Medical Support';
                      typeColor = 'bg-emerald-50 text-emerald-600 border-emerald-100';
                      ZoneIcon = Activity;
                    } else if (isPharmacy) {
                      typeLabel = 'Pharmacy';
                      typeColor = 'bg-teal-50 text-teal-600 border-teal-100';
                      ZoneIcon = ShieldCheck;
                    } else if (isShelter) {
                      typeLabel = 'Women\'s Shelter';
                      typeColor = 'bg-rose-50 text-rose-600 border-rose-100';
                      ZoneIcon = Users;
                    }

                    const distStr = formatDistance(lastKnownLocation || { lat: 12.9716, lng: 77.5946 }, zone);

                    return (
                      <div key={idx} className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-start justify-between gap-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className={`p-3 rounded-xl border flex-shrink-0 ${typeColor.split(' ')[0]} ${typeColor.split(' ')[2]}`}>
                            <ZoneIcon size={20} className={typeColor.split(' ')[1]} />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-black text-slate-800 text-sm leading-snug truncate">{zone.name}</h3>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${typeColor}`}>
                                {typeLabel}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400 flex items-center gap-0.5">
                                <MapPin size={10} />
                                {distStr}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button 
                            onClick={() => {
                              window.open(`tel:${isPolice ? '100' : isHospital ? '102' : '112'}`, '_self');
                            }}
                            className="w-9 h-9 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-100 flex items-center justify-center text-rose-600 transition-colors"
                            title="Call Emergency"
                          >
                            <Phone size={15} />
                          </button>
                          <button 
                            onClick={() => {
                              setShowSafeZonesModal(false);
                              navigate('/citizen/tracking');
                            }}
                            className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 flex items-center justify-center text-white shadow-md transition-colors"
                            title="Navigate"
                          >
                            <Navigation size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-5 bg-slate-50 border-t border-slate-100 text-center rounded-b-[32px]">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-normal">
                  In extreme danger, tap the crimson SOS button directly.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const formatDistance = (fromLoc, toLoc) => {
  if (!fromLoc || !toLoc) return 'Calculating...';
  const distMeters = calculateDistance(fromLoc.lat, fromLoc.lng, toLoc.lat, toLoc.lng);
  if (distMeters < 1000) {
    return `${Math.round(distMeters)}m`;
  }
  return `${(distMeters / 1000).toFixed(1)} km`;
};

const StatusPill = ({ icon: Icon, label, active, warning, onClick }) => (
  <button onClick={onClick} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-bold transition-all active:scale-95 hover:bg-white/25 ${
    warning ? 'bg-red-500/30 text-red-200' :
    active  ? 'bg-white/15 text-white' :
    'bg-white/8 text-slate-400'
  }`}>
    <Icon size={11} /> {label}
  </button>
);

const WaveformVisualizer = ({ analyserNode, isActive }) => {
  const canvasRef = React.useRef(null);

  useEffect(() => {
    if (!isActive || !analyserNode) {
      // Draw flatline
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    let animationId;
    const draw = () => {
      animationId = requestAnimationFrame(draw);
      analyserNode.getByteTimeDomainData(dataArray);

      ctx.fillStyle = 'rgba(15, 23, 42, 0.2)'; // semi-transparent background trail
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgb(239, 68, 68)'; // Crimson active line
      ctx.shadowBlur = 8;
      ctx.shadowColor = 'rgb(239, 68, 68)';

      ctx.beginPath();
      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
      ctx.shadowBlur = 0; // Reset shadow
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [analyserNode, isActive]);

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-16 bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden mt-3 shadow-inner"
      width={320}
      height={64}
    />
  );
};

const ScoreCard = ({ value, label, color, onClick }) => (
  <motion.div 
    whileTap={onClick ? { scale: 0.95 } : {}}
    onClick={onClick}
    className={`bg-white rounded-2xl p-3 border border-slate-100 shadow-sm text-center ${onClick ? 'cursor-pointer hover:bg-slate-50 transition-colors' : ''}`}
  >
    <p className={`text-3xl font-black ${color}`}>{value}</p>
    <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 leading-tight">{label}</p>
  </motion.div>
);

export default CitizenHome;
