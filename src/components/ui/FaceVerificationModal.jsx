import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, ScanFace, X } from 'lucide-react';

const FaceVerificationModal = ({ isOpen, onClose, onSuccess }) => {
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setScanning(false);
      setProgress(0);
    }
  }, [isOpen]);

  useEffect(() => {
    let interval;
    if (scanning) {
      interval = setInterval(() => {
        setProgress(p => {
          if (p >= 100) {
            clearInterval(interval);
            setTimeout(() => {
              onSuccess();
            }, 800);
            return 100;
          }
          return p + 2;
        });
      }, 50);
    }
    return () => clearInterval(interval);
  }, [scanning, onSuccess]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div 
          className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col items-center p-8 relative"
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
        >
          {/* Close button if not scanning */}
          {!scanning && progress === 0 && (
            <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          )}

          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-slate-800">Verify Safe Arrival</h2>
            <p className="text-slate-500 text-sm mt-2">Biometric face scan required to disarm SafeWalk.</p>
          </div>

          <div className="relative w-48 h-48 rounded-full border-4 border-slate-100 overflow-hidden flex items-center justify-center bg-slate-50 mb-6">
            {scanning ? (
              <>
                <motion.div 
                  className="absolute top-0 left-0 w-full h-full bg-red-500/10"
                  animate={{ y: ['-100%', '100%'] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                />
                <ScanFace size={64} className={progress === 100 ? 'text-emerald-500' : 'text-primary-red'} />
              </>
            ) : (
              <ScanFace size={64} className="text-slate-300" />
            )}

            {/* Progress Circle Overlay */}
            {scanning && (
              <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                <circle cx="96" cy="96" r="92" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-100" />
                <circle 
                  cx="96" cy="96" r="92" 
                  stroke="currentColor" 
                  strokeWidth="4" 
                  fill="transparent" 
                  strokeDasharray="578" 
                  strokeDashoffset={578 - (578 * progress) / 100} 
                  className={progress === 100 ? 'text-emerald-500 transition-all duration-300' : 'text-primary-red transition-all duration-75'} 
                />
              </svg>
            )}
          </div>

          {progress === 100 ? (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-2 text-emerald-500 font-bold">
              <ShieldCheck size={24} /> Verified Safely
            </motion.div>
          ) : !scanning ? (
            <button 
              onClick={() => setScanning(true)}
              className="w-full py-4 bg-primary-red hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-500/30 transition-all"
            >
              Initiate Face Scan
            </button>
          ) : (
            <div className="text-slate-500 font-bold">{progress}% Scanning...</div>
          )}

        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default FaceVerificationModal;
