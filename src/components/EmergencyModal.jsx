import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, X, PhoneCall } from 'lucide-react';

export const EmergencyModal = ({ isOpen, onClose, onSendAlert }) => {
  const emergencyNumbers = [
    { label: "Police", number: "100", color: "bg-blue-500" },
    { label: "National Emergency", number: "112", color: "bg-red-600" },
    { label: "Ambulance", number: "108", color: "bg-emerald-500" },
    { label: "Women Helpline", number: "1091", color: "bg-pink-500" },
    { label: "Child Helpline", number: "1098", color: "bg-amber-500" },
    { label: "Fire Service", number: "101", color: "bg-orange-500" },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-sm bg-white rounded-[2rem] overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="bg-primary-red px-6 py-8 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2" />
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="w-16 h-16 bg-white/20 rounded-full mx-auto flex items-center justify-center mb-4"
              >
                <ShieldAlert size={32} className="text-white" />
              </motion.div>
              <h2 className="text-2xl font-black text-white tracking-widest uppercase">SOS Override</h2>
              <p className="text-red-200 text-xs font-bold mt-1 uppercase tracking-widest">Immediate Dispatch</p>
            </div>
            
            {/* Body */}
            <div className="p-6">
              
              <button 
                onClick={onSendAlert}
                className="w-full py-4 bg-slate-900 text-white font-black rounded-xl mb-6 shadow-lg shadow-slate-300 hover:bg-slate-800 transition-colors uppercase tracking-widest"
              >
                Broadcast Location to Police
              </button>

              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">Or Quick Dial Authorities</p>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {emergencyNumbers.map((em) => (
                  <a 
                    key={em.label}
                    href={`tel:${em.number}`}
                    className={`${em.color} text-white p-3 rounded-xl flex flex-col items-center justify-center shadow-sm hover:scale-105 transition-transform`}
                  >
                    <PhoneCall size={20} className="mb-1 opacity-80" />
                    <span className="font-black text-lg">{em.number}</span>
                    <span className="text-[9px] font-bold uppercase opacity-90">{em.label}</span>
                  </a>
                ))}
              </div>
              
              <button
                onClick={onClose}
                className="w-full py-4 px-4 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors flex justify-center items-center gap-2"
              >
                <X size={18} /> Cancel Override
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
