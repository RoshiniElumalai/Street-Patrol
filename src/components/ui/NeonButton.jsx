import React from 'react';
import { motion } from 'framer-motion';
import './NeonButton.css'; // We'll add some specific styling here or use global classes

const NeonButton = ({ children, variant = 'primary', onClick, className = '', ...props }) => {
  const baseClass = `neon-btn neon-btn-${variant} ${className}`;
  
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={baseClass}
      onClick={onClick}
      {...props}
    >
      {children}
    </motion.button>
  );
};

export default NeonButton;
