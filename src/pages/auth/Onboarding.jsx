import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MapPin, ShieldAlert, ArrowRight } from 'lucide-react';

const slides = [
  {
    id: 1,
    title: 'AI Sound Detection',
    description: 'Our AI sentinel continuously listens for screams, glass breaking, and gunshots to automatically alert authorities.',
    icon: <div className="p-6 bg-red-50 rounded-full text-primary-red mb-6"><Mic size={48} className="animate-pulse" /></div>
  },
  {
    id: 2,
    title: 'Instant Emergency Response',
    description: 'One tap or voice trigger sends your exact live GPS location to the nearest police units instantly.',
    icon: <div className="p-6 bg-red-100 rounded-full text-primary-red mb-6"><MapPin size={48} className="animate-bounce" /></div>
  },
  {
    id: 3,
    title: 'Smart City Police Integration',
    description: 'Officers receive tactical, real-time dispatch routes to your exact location, drastically reducing response times.',
    icon: <div className="p-6 bg-slate-800 rounded-full text-white mb-6"><ShieldAlert size={48} className="animate-pulse" /></div>
  }
];

const Onboarding = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(curr => curr + 1);
    } else {
      navigate('/auth-home');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 p-6 pt-12">
      
      <div className="flex-1 flex items-center justify-center w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center text-center max-w-sm"
          >
            {slides[currentSlide].icon}
            <h2 className="text-2xl font-bold text-slate-800 mb-4">
              {slides[currentSlide].title}
            </h2>
            <p className="text-slate-500 leading-relaxed font-medium">
              {slides[currentSlide].description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="w-full max-w-sm mx-auto flex justify-between items-center pb-12">
        <div className="flex gap-2">
          {slides.map((_, index) => (
            <div 
              key={index} 
              className={`h-2 rounded-full transition-all duration-300 ${index === currentSlide ? 'w-6 bg-primary-red' : 'w-2 bg-slate-300'}`}
            />
          ))}
        </div>
        
        <button 
          onClick={handleNext}
          className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-semibold shadow-md hover:bg-slate-800 transition-colors"
        >
          {currentSlide === slides.length - 1 ? 'Get Started' : 'Next'} <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};

export default Onboarding;
