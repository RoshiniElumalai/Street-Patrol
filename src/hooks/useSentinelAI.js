import { useState, useEffect } from 'react';

export const useSentinelAI = () => {
  const [isProtectionActive, setIsProtectionActive] = useState(false);
  const [safetyScore, setSafetyScore] = useState(94);
  const [threatLevel, setThreatLevel] = useState('Low');
  const [aiMessage, setAiMessage] = useState('Area scan complete. No threats detected.');
  const [isVoiceStressDetected, setIsVoiceStressDetected] = useState(false);

  const toggleProtection = () => {
    setIsProtectionActive(prev => !prev);
  };

  useEffect(() => {
    if (!isProtectionActive) {
      setSafetyScore(94);
      setThreatLevel('Low');
      setAiMessage('Protection Disarmed. Stay vigilant.');
      setIsVoiceStressDetected(false);
      return;
    }

    setAiMessage('Sentinel AI monitoring active.');

    // Simulate AI discovering a risk zone and voice stress after 15 seconds
    const timer = setTimeout(() => {
      setSafetyScore(62);
      setThreatLevel('High');
      setIsVoiceStressDetected(true);
      setAiMessage('Elevated voice stress detected! Safe route recalculating...');
      
      // Auto-revert back after some time to simulate passing the danger
      setTimeout(() => {
        setSafetyScore(88);
        setThreatLevel('Medium');
        setIsVoiceStressDetected(false);
        setAiMessage('Safer alternative route found. Proceed carefully.');
      }, 10000);
      
    }, 15000);

    return () => clearTimeout(timer);
  }, [isProtectionActive]);

  return {
    isProtectionActive,
    toggleProtection,
    safetyScore,
    aiMessage,
    threatLevel,
    isVoiceStressDetected
  };
};
