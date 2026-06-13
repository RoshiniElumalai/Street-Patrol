import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ShieldAlert, Activity, Radio, Volume2 } from 'lucide-react';
import { useStore } from '../context/useStore';

export const ProtectionToggle = () => {
  const { threatLevel } = useStore();
  const [mode, setMode] = useState('Disabled'); // Disabled, Basic, Smart, Extreme
  const [scanning, setScanning] = useState(false);

  const handleToggle = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      setMode(prev => prev === 'Disabled' ? 'Smart' : prev === 'Smart' ? 'Extreme' : 'Disabled');
    }, 1500);
  };

  const isActive = mode !== 'Disabled';

  return (
    <div className={`relative p-8 rounded-[2.5rem] flex flex-col items-center justify-center w-full max-w-sm mx-auto shadow-2xl transition-all duration-700 border-t-2 overflow-hidden ${
      mode === 'Extreme' ? 'bg-red-950 border-red-500' : 
      mode === 'Smart' ? 'bg-blue-950 border-blue-500' : 
      'bg-slate-900 border-slate-700'
    }`}>
      
      {/* Background Radar Animation */}
      {isActive && (
        <div className="absolute inset-0 z-0 flex items-center justify-center opacity-20 pointer-events-none">
          <motion.div 
            animate={{ rotate: 360 }} 
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className={`w-[200%] h-[200%] rounded-full border-2 ${mode === 'Extreme' ? 'border-red-500' : 'border-blue-500'}`}
            style={{ borderTopColor: 'transparent', borderLeftColor: 'transparent', borderBottomColor: 'transparent' }}
          />
        </div>
      )}

      {/* Audio Visualization Bars */}
      {isActive && !scanning && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-end gap-1 z-10 opacity-50">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              animate={{ height: [4, Math.random() * 20 + 10, 4] }}
              transition={{ repeat: Infinity, duration: Math.random() * 0.5 + 0.5 }}
              className={`w-1 rounded-t-full ${mode === 'Extreme' ? 'bg-red-500' : 'bg-blue-500'}`}
            />
          ))}
        </div>
      )}

      <div className="relative z-10 text-center flex flex-col items-center">
        
        <div className="text-[10px] font-black uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
          {isActive ? (
            <span className={mode === 'Extreme' ? 'text-red-400' : 'text-blue-400'}>
              <Activity size={12} className="inline mr-1 animate-pulse"/>
              AI Protection: {mode}
            </span>
          ) : (
            <span className="text-slate-500">System Standby</span>
          )}
        </div>

        <button 
          onClick={handleToggle}
          disabled={scanning}
          className={`relative w-36 h-36 rounded-full flex flex-col items-center justify-center transition-all outline-none ${
            scanning ? 'bg-slate-800 scale-95' :
            mode === 'Extreme' ? 'bg-red-600 shadow-[0_0_50px_rgba(220,38,38,0.5)] hover:bg-red-500' :
            mode === 'Smart' ? 'bg-blue-600 shadow-[0_0_40px_rgba(37,99,235,0.4)] hover:bg-blue-500' :
            'bg-slate-800 shadow-inner hover:bg-slate-700'
          }`}
        >
          {/* Glowing Ring Effect */}
          {isActive && !scanning && (
             <div className={`absolute inset-0 rounded-full border-4 animate-ping opacity-30 ${mode === 'Extreme' ? 'border-red-400' : 'border-blue-400'}`} />
          )}

          {scanning ? (
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, ease: 'linear', duration: 1 }}>
               <Radio size={48} className="text-white" />
            </motion.div>
          ) : isActive ? (
             <ShieldAlert size={56} className="text-white" />
          ) : (
             <Shield size={56} className="text-slate-500" />
          )}
        </button>

        <AnimatePresence>
          {scanning && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0 }}
              className="mt-6 text-sm font-bold text-white tracking-widest uppercase animate-pulse"
            >
              Configuring AI...
            </motion.div>
          )}
        </AnimatePresence>

        {!scanning && (
           <p className="mt-6 text-xs text-slate-400 font-medium">
             {mode === 'Disabled' ? 'Tap to arm Smart Protection' : 
              mode === 'Smart' ? 'Tap to arm Extreme Mode' : 
              'Tap to Disarm'}
           </p>
        )}
      </div>
    </div>
  );
};
