import React from 'react';
import { useSimulation } from '../../context/SimulationContext';
import LiveMap from '../../components/map/LiveMap';
import TacticalCard from '../../components/ui/TacticalCard';
import { Navigation } from 'lucide-react';

const PoliceMap = () => {
  const { incidents } = useSimulation();
  
  // Find dispatched incidents for current officer (mock 'off_1')
  const myIncidents = incidents.filter(inc => inc.status === 'dispatched');

  // Format incidents into markers for LiveMap
  const markers = incidents.map(inc => ({
    lat: inc.lat,
    lng: inc.lng,
    color: inc.status === 'active' ? '#e11d48' : '#f59e0b'
  }));

  return (
    <div style={{ height: '100%', position: 'relative', overflow: 'hidden', padding: '16px' }}>
      
      {/* Background Map */}
      <div style={{ position: 'absolute', top: 16, left: 16, right: 16, bottom: 16 }}>
        <LiveMap markers={markers} />
      </div>

      {/* Overlay UI */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', pointerEvents: 'none', padding: 'var(--space-md)' }}>
        
        {myIncidents.length > 0 && (
          <TacticalCard 
            title="CURRENT OBJECTIVE" 
            borderGlow="warning"
            className="animate-float"
            style={{ pointerEvents: 'auto', maxWidth: '400px', background: 'var(--color-bg-elevated)', backdropFilter: 'blur(20px)' }}
          >
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <div style={{ background: 'rgba(255, 179, 0, 0.2)', padding: '15px', borderRadius: '50%' }}>
                <Navigation color="var(--color-warning)" />
              </div>
              <div>
                <h3 style={{ margin: 0, color: 'var(--color-warning)' }}>Proceed to Scene</h3>
                <p style={{ margin: '5px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  {myIncidents[0].type} at [{myIncidents[0].lat.toFixed(4)}, {myIncidents[0].lng.toFixed(4)}]
                </p>
                <div style={{ color: 'var(--text-primary)', marginTop: '5px', fontWeight: 'bold' }}>ETA: 3 MIN</div>
              </div>
            </div>
          </TacticalCard>
        )}

      </div>
    </div>
  );
};

export default PoliceMap;
