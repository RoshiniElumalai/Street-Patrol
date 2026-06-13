import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, MapPin, Radio, ShieldCheck, X } from 'lucide-react';
import { useStore } from '../../context/useStore';

const EmergencyOverlay = () => {
  const { isEmergencyMode, emergencyData, cancelEmergency } = useStore();
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    let interval;
    if (isEmergencyMode) {
      setCountdown(0);
      interval = setInterval(() => {
        setCountdown(c => c + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isEmergencyMode]);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <AnimatePresence>
      {isEmergencyMode && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] pointer-events-none"
        >
          {/* Flashing Red Border */}
          <motion.div 
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="absolute inset-0 border-[12px] border-red-600 pointer-events-none z-10"
          />

          {/* Dark Red Overlay */}
          <div className="absolute inset-0 bg-red-950/90 backdrop-blur-md pointer-events-auto flex flex-col items-center justify-center p-6 text-center">
            
            <button 
              onClick={cancelEmergency} 
              className="absolute top-8 right-8 p-3 bg-red-900/50 rounded-full text-white hover:bg-red-800 transition-colors border border-red-500/30"
            >
              <X size={24} />
            </button>

            <motion.div 
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-32 h-32 bg-red-600 rounded-full flex items-center justify-center shadow-[0_0_100px_rgba(220,38,38,0.8)] mb-8"
            >
              <ShieldAlert size={64} className="text-white" />
            </motion.div>

            <h1 className="text-4xl md:text-5xl font-black text-white tracking-widest uppercase mb-2 drop-shadow-lg">
              EMERGENCY MODE ACTIVATED
            </h1>
            <p className="text-red-300 font-bold tracking-widest text-lg uppercase mb-12">
              {emergencyData?.reason || 'SOS Triggered'}
            </p>

            {/* Live Tracking Panel */}
            <div className="bg-black/40 backdrop-blur-md border border-red-500/30 rounded-[2rem] p-8 w-full max-w-lg shadow-2xl mb-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-red-500 overflow-hidden">
                <motion.div 
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="w-1/2 h-full bg-white shadow-[0_0_15px_white]"
                />
              </div>

              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2 text-red-400 font-bold uppercase tracking-widest text-sm">
                  <Radio size={18} className="animate-pulse" />
                  Live Tracking Active
                </div>
                <div className="text-3xl font-black text-white font-mono">
                  {formatTime(countdown)}
                </div>
              </div>

              {/* Police Dispatch Simulation */}
              {emergencyData?.assignedOfficer ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-blue-900/40 border border-blue-500/50 rounded-xl p-4 flex items-center gap-4 text-left"
                >
                  <div className="p-3 bg-blue-500/20 text-blue-400 rounded-lg">
                    <ShieldCheck size={32} />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">{emergencyData.assignedOfficer}</h3>
                    <p className="text-blue-300 font-semibold text-sm">ETA: <span className="text-white animate-pulse">{emergencyData.eta}</span></p>
                  </div>
                </motion.div>
              ) : (
                <div className="bg-red-900/40 border border-red-500/50 rounded-xl p-4 flex items-center gap-4">
                  <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                  <div className="text-left">
                    <h3 className="text-white font-bold">Dispatching Nearest Authorities</h3>
                    <p className="text-red-300 text-sm">Please remain calm...</p>
                  </div>
                </div>
              )}
            </div>

            <p className="text-red-400 text-sm font-bold uppercase tracking-widest animate-pulse">
              <MapPin size={16} className="inline mr-1" />
              Location actively transmitting to Guardian Network
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default EmergencyOverlay;
