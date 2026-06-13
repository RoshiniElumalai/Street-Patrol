import { useState, useCallback } from 'react';

export const useRiskEngine = () => {
  const [riskScore, setRiskScore] = useState(0);

  const calculateRisk = useCallback(({
    audioConfidence = 0,
    dbSeverity = 0,
    movementAnomaly = 0
  }) => {
    // Night time factor
    const hour = new Date().getHours();
    const isNight = hour >= 22 || hour <= 5;
    const nightTimeFactor = isNight ? 1.0 : 0.0;

    // Calculate score
    const score = (audioConfidence * 0.5) +
                  (dbSeverity * 0.2) +
                  (movementAnomaly * 0.2) +
                  (nightTimeFactor * 0.1);

    // Bound between 0 and 1
    const finalScore = Math.min(Math.max(score, 0), 1);
    setRiskScore(finalScore);

    // Determine level
    let level = 'SAFE';
    if (finalScore >= 0.85) level = 'EMERGENCY';
    else if (finalScore >= 0.70) level = 'HIGH_RISK';
    else if (finalScore >= 0.50) level = 'WARNING';

    return { score: finalScore, level };
  }, []);

  return { riskScore, calculateRisk };
};
