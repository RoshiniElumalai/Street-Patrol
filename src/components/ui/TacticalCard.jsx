import React from 'react';
import { motion } from 'framer-motion';

const TacticalCard = ({ title, children, rightAction, borderGlow = 'primary', className = '' }) => {
  const borderColor = borderGlow === 'danger' ? 'var(--color-danger)' : 'var(--color-primary)';
  
  return (
    <motion.div 
      className={`glass-card ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ 
        padding: 'var(--space-md)', 
        borderLeft: `4px solid ${borderColor}`,
        marginBottom: 'var(--space-md)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Decorative tactical corner markers */}
      <div style={{ position: 'absolute', top: 0, right: 0, width: '10px', height: '2px', background: borderColor }}></div>
      <div style={{ position: 'absolute', top: 0, right: 0, width: '2px', height: '10px', background: borderColor }}></div>
      <div style={{ position: 'absolute', bottom: 0, right: 0, width: '10px', height: '2px', background: 'rgba(255,255,255,0.2)' }}></div>
      
      <div className="flex-between" style={{ marginBottom: 'var(--space-sm)' }}>
        <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '2px' }}>
          {title}
        </h3>
        {rightAction && <div>{rightAction}</div>}
      </div>
      
      <div style={{ marginTop: 'var(--space-sm)' }}>
        {children}
      </div>
    </motion.div>
  );
};

export default TacticalCard;
