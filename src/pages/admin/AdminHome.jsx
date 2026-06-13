import React from 'react';
import { motion } from 'framer-motion';
import { useSimulation } from '../../context/SimulationContext';
import TacticalCard from '../../components/ui/TacticalCard';
import MapSimulator from '../../components/map/MapSimulator';
import { Activity, ShieldAlert, Users, Zap } from 'lucide-react';

const StatCard = ({ title, value, icon, color }) => (
  <motion.div 
    className="glass-card"
    whileHover={{ y: -5 }}
    style={{ padding: 'var(--space-lg)', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', borderTop: `2px solid ${color}` }}
  >
    <div className="flex-between">
      <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase' }}>{title}</span>
      {icon}
    </div>
    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: color }}>{value}</div>
  </motion.div>
);

const AdminHome = () => {
  const { incidents, officers, cityThreatLevel } = useSimulation();

  const activeIncidents = incidents.filter(i => i.status === 'active' || i.status === 'dispatched').length;
  const availableOfficers = officers.filter(o => o.status === 'Available').length;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, color: 'var(--color-neon-purple)', textTransform: 'uppercase', letterSpacing: '2px' }}>City Overwatch</h2>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Threat Level: <span style={{ color: cityThreatLevel === 'High' ? 'var(--color-danger)' : 'var(--color-warning)' }}>{cityThreatLevel}</span>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'flex', gap: 'var(--space-lg)' }}>
        <StatCard title="Active Incidents" value={activeIncidents} icon={<ShieldAlert color="var(--color-danger)" />} color="var(--color-danger)" />
        <StatCard title="Available Units" value={availableOfficers} icon={<Activity color="var(--color-primary)" />} color="var(--color-primary)" />
        <StatCard title="AI Accuracy" value="98.2%" icon={<Zap color="var(--color-neon-purple)" />} color="var(--color-neon-purple)" />
        <StatCard title="Active Citizens" value="14,204" icon={<Users color="var(--color-success)" />} color="var(--color-success)" />
      </div>

      {/* Map and Feed */}
      <div style={{ display: 'flex', gap: 'var(--space-lg)', flex: 1, minHeight: '400px' }}>
        <TacticalCard title="Live Heatmap" borderGlow="purple" style={{ flex: 2, display: 'flex', flexDirection: 'column', padding: 0 }}>
          <div style={{ flex: 1, borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
            <MapSimulator zoom={12} showIncidents={true} showOfficers={true} />
          </div>
        </TacticalCard>

        <TacticalCard title="AI Detection Log" borderGlow="purple" style={{ flex: 1, overflowY: 'auto' }}>
          {incidents.slice(0, 5).map(inc => (
            <div key={inc.id} style={{ 
              padding: '10px', 
              borderBottom: '1px solid var(--border-glass)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <div style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>{inc.type}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Conf: {inc.confidence}% | Sector 7</div>
              </div>
              <div style={{ 
                width: '8px', height: '8px', borderRadius: '50%', 
                background: inc.status === 'active' ? 'var(--color-danger)' : 'var(--color-warning)',
                boxShadow: `0 0 5px ${inc.status === 'active' ? 'var(--color-danger)' : 'var(--color-warning)'}`
              }}></div>
            </div>
          ))}
        </TacticalCard>
      </div>

    </div>
  );
};

export default AdminHome;
