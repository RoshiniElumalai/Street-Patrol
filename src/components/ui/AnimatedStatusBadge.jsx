import React from 'react';
import { motion } from 'framer-motion';

const AnimatedStatusBadge = ({ status, type = 'default' }) => {
  let color = 'var(--text-secondary)';
  let bg = 'rgba(255, 255, 255, 0.1)';
  let glow = 'none';
  let isPulsing = false;

  if (status.toLowerCase() === 'active' || status.toLowerCase() === 'high') {
    color = 'var(--color-danger)';
    bg = 'rgba(255, 42, 42, 0.1)';
    glow = '0 0 10px rgba(255, 42, 42, 0.5)';
    isPulsing = true;
  } else if (status.toLowerCase() === 'dispatched' || status.toLowerCase() === 'elevated') {
    color = 'var(--color-warning)';
    bg = 'rgba(255, 179, 0, 0.1)';
    glow = '0 0 10px rgba(255, 179, 0, 0.3)';
  } else if (status.toLowerCase() === 'resolved' || status.toLowerCase() === 'safe' || status.toLowerCase() === 'available') {
    color = 'var(--color-success)';
    bg = 'rgba(0, 230, 118, 0.1)';
    glow = '0 0 10px rgba(0, 230, 118, 0.3)';
  }

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '4px 10px',
      borderRadius: 'var(--radius-full)',
      backgroundColor: bg,
      border: `1px solid ${color}`,
      boxShadow: glow,
      color: color,
      fontSize: '0.8rem',
      fontWeight: '600',
      letterSpacing: '1px',
      textTransform: 'uppercase'
    }}>
      {isPulsing && (
        <motion.div 
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: color,
            marginRight: '6px',
            boxShadow: `0 0 5px ${color}`
          }}
        />
      )}
      {!isPulsing && (
        <div style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: color,
          marginRight: '6px'
        }} />
      )}
      {status}
    </div>
  );
};

export default AnimatedStatusBadge;
