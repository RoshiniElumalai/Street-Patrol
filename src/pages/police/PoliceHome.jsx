import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSimulation } from '../../context/SimulationContext';
import TacticalCard from '../../components/ui/TacticalCard';
import AnimatedStatusBadge from '../../components/ui/AnimatedStatusBadge';
import NeonButton from '../../components/ui/NeonButton';
import { AlertTriangle, MapPin, AudioLines } from 'lucide-react';

const PoliceHome = () => {
  const navigate = useNavigate();
  const { incidents, dispatchOfficer } = useSimulation();

  const handleDispatch = (incidentId) => {
    dispatchOfficer(incidentId, 'off_1');
    navigate('/police/map');
  };

  return (
    <div style={{ padding: 'var(--space-lg)' }}>
      <div className="flex-between" style={{ marginBottom: 'var(--space-lg)' }}>
        <h2 style={{ margin: 0, color: 'var(--text-primary)', textTransform: 'uppercase' }}>Active Incident Feed</h2>
        <AnimatedStatusBadge status="High Priority" />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {incidents.map((incident, idx) => (
          <TacticalCard 
            key={incident.id}
            title={`Incident #${incident.id.split('_')[1].slice(-4)}`}
            borderGlow={incident.status === 'active' ? 'danger' : 'primary'}
            rightAction={<span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(incident.time).toLocaleTimeString()}</span>}
          >
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <div style={{ padding: '15px', background: incident.status === 'active' ? 'rgba(255,42,42,0.1)' : 'rgba(0,210,255,0.1)', borderRadius: 'var(--radius-sm)' }}>
                {incident.type === 'Manual SOS' ? <AlertTriangle color={incident.status === 'active' ? 'var(--color-danger)' : 'var(--color-primary)'} /> : <AudioLines color={incident.status === 'active' ? 'var(--color-danger)' : 'var(--color-primary)'} />}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, color: incident.status === 'active' ? 'var(--color-danger)' : 'var(--color-primary)' }}>{incident.type} Detected</h3>
                <p style={{ margin: '5px 0', color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <MapPin size={14} /> Sector 7 - [{incident.lat.toFixed(4)}, {incident.lng.toFixed(4)}]
                </p>
                {incident.confidence && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>AI Confidence</span>
                    <div style={{ flex: 1, height: '4px', background: 'var(--color-bg-glass)', borderRadius: '2px' }}>
                      <div style={{ width: `${incident.confidence}%`, height: '100%', background: incident.confidence > 90 ? 'var(--color-danger)' : 'var(--color-warning)', borderRadius: '2px' }}></div>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>{incident.confidence}%</span>
                  </div>
                )}
              </div>
            </div>
            
            {incident.status === 'active' && (
              <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'flex-end' }}>
                <NeonButton variant="danger" onClick={() => handleDispatch(incident.id)} style={{ padding: '8px 20px', fontSize: '0.9rem' }}>
                  ACCEPT & DISPATCH
                </NeonButton>
              </div>
            )}
            {incident.status === 'dispatched' && (
              <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'flex-end' }}>
                <span className="text-neon-blue" style={{ fontSize: '0.9rem' }}>UNIT EN ROUTE</span>
              </div>
            )}
          </TacticalCard>
        ))}
        {incidents.length === 0 && (
          <div className="flex-center" style={{ height: '200px', color: 'var(--text-muted)' }}>
            No active incidents. Area secure.
          </div>
        )}
      </div>
    </div>
  );
};

export default PoliceHome;
