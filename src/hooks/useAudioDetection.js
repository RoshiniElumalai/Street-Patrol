import { useState, useEffect, useRef } from 'react';

export const useAudioDetection = (isMonitoring, onThreatDetected) => {
  const [decibels, setDecibels] = useState(-100);
  const [detectedSound, setDetectedSound] = useState('NONE');
  const [audioConfidence, setAudioConfidence] = useState(0);
  const [audioContextState, setAudioContextState] = useState('UNINITIALIZED');
  const [micPermission, setMicPermission] = useState('PENDING');
  const [analyserNode, setAnalyserNode] = useState(null);
  
  // Calibration
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [baselineDb, setBaselineDb] = useState(-50); // Default relative baseline

  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const microphoneRef = useRef(null);
  const animationFrameRef = useRef(null);
  const recognitionRef = useRef(null);
  const calibrateIntervalRef = useRef(null);
  const isMonitoringRef = useRef(isMonitoring);

  useEffect(() => {
    isMonitoringRef.current = isMonitoring;
  }, [isMonitoring]);

  // List of AI distress detection labels as per Master Vision Prompt
  const threatLabels = [
    'Scream',
    'Help',
    'Save Me',
    'Distress',
    'Fear',
    'Shouting',
    'Glass Breaking'
  ];

  // Web Speech API for phrase recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript.toLowerCase())
          .join('');

        console.log("Speech recognized:", transcript);

        if (
          transcript.includes('help me') || 
          transcript.includes('emergency') || 
          transcript.includes('save me') ||
          transcript.includes('call police')
        ) {
          setDetectedSound('VOICE_SOS');
          setAudioConfidence(1.0);
          if (onThreatDetected && isMonitoring) {
            onThreatDetected({ 
              type: 'VOICE_SOS', 
              confidence: 1.0, 
              label: 'Distress voice keyword detected' 
            });
          }
        }
      };

      recognition.onerror = (e) => {
        console.warn("Speech recognition error:", e.error);
        // Automatically restart if monitoring is active
        if (isMonitoring && e.error === 'no-speech' && recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch(err) {}
        }
      };

      recognition.onend = () => {
        if (isMonitoring && recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch(err) {}
        }
      };

      recognitionRef.current = recognition;

      return () => {
        try {
          recognition.stop();
        } catch (e) {}
      };
    }
  }, [onThreatDetected, isMonitoring]);

  useEffect(() => {
    if (!isMonitoring) {
      stopMonitoring();
      return;
    }

    startMonitoring();

    return () => stopMonitoring();
  }, [isMonitoring]);

  const startMonitoring = async () => {
    try {
      console.log("Requesting microphone permission");
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }, 
        video: false 
      });
      console.log("Microphone permission granted");
      setMicPermission('GRANTED');
      
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContext();
      setAudioContextState(audioContextRef.current.state);
      
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256; // Smaller size for fast dB reads
      setAnalyserNode(analyserRef.current);
      
      microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
      microphoneRef.current.connect(analyserRef.current);
      
      // Start Speech Recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.warn("Speech recognition already running or failed to start", e);
        }
      }

      // Quick calibration
      startCalibration();
      
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setMicPermission('DENIED');
    }
  };

  const startCalibration = () => {
    setIsCalibrating(true);
    setCalibrationProgress(0);
    const dbSamples = [];
    let progress = 0;

    calibrateIntervalRef.current = setInterval(() => {
      progress += 25;
      setCalibrationProgress(progress);

      if (analyserRef.current) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteTimeDomainData(dataArray);
        
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const value = dataArray[i] - 128;
          sum += value * value;
        }
        const rms = Math.sqrt(sum / dataArray.length);
        let db = 20 * Math.log10(rms / 128);
        if (!isFinite(db)) db = -100;
        dbSamples.push(db);
      }

      if (progress >= 100) {
        clearInterval(calibrateIntervalRef.current);
        setIsCalibrating(false);
        const avgDb = dbSamples.reduce((a, b) => a + b, 0) / dbSamples.length;
        setBaselineDb(avgDb > -100 ? Math.round(avgDb) : -50);
        console.log("Calibration complete. Baseline DB:", avgDb);
        if (isMonitoringRef.current) {
          detectLoudness(); // Start actual monitoring
        }
      }
    }, 500); // 2 seconds calibration
  };

  const detectLoudness = () => {
    if (!analyserRef.current || !isMonitoringRef.current) {
      if (animationFrameRef.current) clearInterval(animationFrameRef.current);
      return;
    }

    // Interval to calculate dB level every 150ms
    animationFrameRef.current = setInterval(() => {
      if (!analyserRef.current || !isMonitoringRef.current) {
        clearInterval(animationFrameRef.current);
        return;
      }
      
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteTimeDomainData(dataArray);

      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const value = dataArray[i] - 128;
        sum += value * value;
      }
      const rms = Math.sqrt(sum / dataArray.length);
      
      // True dB calculation
      let db = 20 * Math.log10(rms / 128);
      if (!isFinite(db)) db = -100;
      
      // Clamp between -100 and 0
      db = Math.max(-100, Math.min(0, db));
      setDecibels(Math.round(db));

      // Threshold: 30dB spike above baseline (20dB at night), or absolute -15dB (-25dB at night)
      const hour = new Date().getHours();
      const isNight = hour >= 20 || hour < 6;
      const thresholdSpike = isNight ? 20 : 30;
      const thresholdAbsolute = isNight ? -25 : -15;

      const isSpike = db > (baselineDb + thresholdSpike) || db > thresholdAbsolute;

      if (isSpike) {
        // AI detection simulation from Master Vision lists
        const randomIndex = Math.floor(Math.random() * threatLabels.length);
        const selectedLabel = threatLabels[randomIndex];
        const randomConfidence = parseFloat((0.8 + Math.random() * 0.19).toFixed(2));

        setDetectedSound(selectedLabel);
        setAudioConfidence(randomConfidence);

        if (onThreatDetected) {
          onThreatDetected({ 
            type: 'VOICE_SOS', 
            confidence: randomConfidence, 
            label: selectedLabel 
          });
        }
      } else {
        setDetectedSound('NONE');
        setAudioConfidence(0);
      }
    }, 150);
  };

  const stopMonitoring = () => {
    if (animationFrameRef.current) clearInterval(animationFrameRef.current);
    if (calibrateIntervalRef.current) clearInterval(calibrateIntervalRef.current);
    setIsCalibrating(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    if (microphoneRef.current) microphoneRef.current.disconnect();
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    setDecibels(-100);
    setDetectedSound('NONE');
    setAudioConfidence(0);
    setAnalyserNode(null);
  };

  return { 
    decibels, 
    detectedSound, 
    audioConfidence, 
    isCalibrating, 
    calibrationProgress, 
    baselineDb, 
    micPermission, 
    audioContextState,
    analyserNode
  };
};
