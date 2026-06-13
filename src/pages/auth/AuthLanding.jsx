import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, UserPlus, LogIn } from 'lucide-react';

const AuthLanding = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-primary-red opacity-[0.03] rounded-full blur-[100px]"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-slate-800 opacity-[0.03] rounded-full blur-[100px]"></div>

      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12 z-10"
      >
        <div className="flex justify-center mb-6">
          <div className="bg-primary-red p-4 rounded-2xl shadow-lg shadow-red-200">
            <Shield size={48} className="text-white" />
          </div>
        </div>
        <h1 className="text-4xl font-black text-slate-800 tracking-tight uppercase">StreetSentinel</h1>
        <p className="text-slate-500 font-bold tracking-widest text-sm mt-2 uppercase">AI Powered Urban Safety System</p>
      </motion.div>

      <div className="w-full max-w-sm space-y-4 z-10">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-center cursor-pointer border border-slate-100 hover:border-primary-red hover:shadow-lg transition-all bg-white"
          onClick={() => navigate('/role-selection?type=login')}
        >
          <div className="bg-slate-50 p-4 rounded-full mb-4 text-slate-700">
            <LogIn size={32} />
          </div>
          <h3 className="font-bold text-slate-800 text-xl">Login</h3>
          <p className="text-slate-400 text-sm mt-1 text-center font-medium">Access your existing account</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-center cursor-pointer border border-slate-100 hover:border-slate-800 hover:shadow-lg transition-all bg-white"
          onClick={() => navigate('/role-selection?type=signup')}
        >
          <div className="bg-slate-50 p-4 rounded-full mb-4 text-slate-700">
            <UserPlus size={32} />
          </div>
          <h3 className="font-bold text-slate-800 text-xl">Sign Up</h3>
          <p className="text-slate-400 text-sm mt-1 text-center font-medium">Register a new identity profile</p>
        </motion.div>
      </div>
    </div>
  );
};

export default AuthLanding;
