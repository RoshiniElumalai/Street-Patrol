import { useState, useEffect } from 'react';
import { useStore } from '../context/useStore';
import { useAudioDetection } from './useAudioDetection';
import { useLocationTracking } from './useLocationTracking';
import { useMotionDetection } from './useMotionDetection';
import { useRiskEngine } from './useRiskEngine';

export const useHardwareTriggers = () => {
  const { 
    triggerEmergency, 
    setAudioLevel, 
    setGpsActive, 
    setLastGpsUpdateTime 
  } = useStore();
  
  const [isListening, setIsListening] = useState(false);
  const { riskScore, calculateRisk } = useRiskEngine();

  // Audio Pipeline (Calibration + Web Speech + Simulated Threat Labels)
  const handleAudioThreat = (threatInfo) => {
    console.log("Audio Threat Detected:", threatInfo);
    if (threatInfo.type === 'VOICE_SOS') {
      triggerEmergency("AI Audio Threat Detected", threatInfo.label, threatInfo.confidence);
    }
  };

  const { 
    decibels, 
    detectedSound, 
    audioConfidence, 
    isCalibrating, 
    calibrationProgress, 
    baselineDb,
    micPermission,
    audioContextState,
    analyserNode
  } = useAudioDetection(isListening, handleAudioThreat);

  // Sync Audio DB to Store
  useEffect(() => {
    if (isListening && !isCalibrating) {
      setAudioLevel(decibels);
    } else if (!isListening) {
      setAudioLevel(-100);
    }
  }, [decibels, isListening, isCalibrating, setAudioLevel]);

  // Motion Pipeline
  useMotionDetection(isListening, () => {
    console.log("Shake SOS Triggered!");
    triggerEmergency("Shake SOS Detected");
  });

  // Location Pipeline
  const { gpsActive, batteryLevel } = useLocationTracking(isListening, (locationData) => {
    setGpsActive(true);
    const timeStr = new Date(locationData.timestamp).toLocaleTimeString('en-US', { hour12: false });
    setLastGpsUpdateTime(timeStr);
    
    // Save last known location in store
    useStore.setState({ lastKnownLocation: { lat: locationData.lat, lng: locationData.lng } });
  });

  // Risk Evaluation Pipeline
  useEffect(() => {
    if (isListening && !isCalibrating) {
      // Calculate db severity
      let dbSeverity = 0;
      if (decibels > baselineDb + 20) {
        dbSeverity = Math.min((decibels - baselineDb - 20) / 40, 1); 
      }
      
      const { level } = calculateRisk({
        audioConfidence,
        dbSeverity,
        movementAnomaly: 0 // integrate with motion if needed
      });

      if (level === 'EMERGENCY' || level === 'HIGH_RISK') {
        // Trigger emergency if risk score is very high
        if (level === 'EMERGENCY') {
          triggerEmergency("High Risk Score Detected");
        }
      }
    }
  }, [isListening, decibels, audioConfidence, calculateRisk, baselineDb, isCalibrating, triggerEmergency]);

  return {
    isListening,
    setIsListening,
    detectedSound,
    audioConfidence,
    isCalibrating,
    calibrationProgress,
    batteryLevel,
    micPermission,
    audioContextState,
    analyserNode
  };
};
