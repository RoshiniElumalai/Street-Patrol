import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldAlert } from 'lucide-react';

const Splash = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/onboarding');
    }, 3000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex items-center justify-center flex-col min-h-screen bg-slate-50 relative overflow-hidden">
      
      {/* Background Pulse Rings */}
      <div className="absolute w-[300px] h-[300px] rounded-full border border-red-200 animate-ping opacity-20 z-0"></div>
      <div className="absolute w-[500px] h-[500px] rounded-full border border-red-100 animate-ping opacity-10 z-0" style={{ animationDelay: '1s' }}></div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="z-10 text-center flex flex-col items-center"
      >
        <div className="bg-primary-red p-4 rounded-full mb-6 shadow-xl shadow-red-500/30">
          <ShieldAlert size={48} className="text-white" />
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight m-0">STREET</h1>
        <h1 className="text-4xl font-light text-primary-red tracking-[0.2em] m-0 mt-1">SENTINEL</h1>
        <p className="mt-6 text-slate-500 tracking-widest uppercase text-sm font-semibold">Your Safety. Amplified.</p>
      </motion.div>
    </div>
  );
};

export default Splash;
