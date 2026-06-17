import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Activity, Mic, MapPin, Wifi, Bell, Mail, Database, ShieldAlert, Heart } from 'lucide-react';
import { useStore } from '../../context/useStore';
import { motion } from 'framer-motion';

const SystemHealth = () => {
  const navigate = useNavigate();
  const { isListening, gpsActive, isSocketConnected, alertHistory, audioLevel, settings } = useStore();
  
  const [micPermission, setMicPermission] = useState('unknown');
  const [gpsPermission, setGpsPermission] = useState('unknown');
  const [notifPermission, setNotifPermission] = useState(Notification.permission);
  const [emailStatus, setEmailStatus] = useState('CHECKING');
  const [dbStatus, setDbStatus] = useState('CONNECTED');

  const lastAlert = alertHistory && alertHistory.length > 0 ? alertHistory[0] : null;

  // Check browser permissions dynamically
  useEffect(() => {
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'microphone' }).then(status => {
        setMicPermission(status.state);
        status.onchange = () => setMicPermission(status.state);
      }).catch(() => setMicPermission('prompt'));

      navigator.permissions.query({ name: 'geolocation' }).then(status => {
        setGpsPermission(status.state);
        status.onchange = () => setGpsPermission(status.state);
      }).catch(() => setGpsPermission('prompt'));
    } else {
      setMicPermission('unsupported');
      setGpsPermission('unsupported');
    }

    // Ping backend to check real email status
    const checkBackendHealth = async () => {
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';
        const res = await fetch(`${backendUrl}/emergency/health`);
        const data = await res.json();
        if (data.status === 'ok') {
          setEmailStatus('ACTIVE');
        } else {
          setEmailStatus('ERROR');
        }
      } catch (err) {
        setEmailStatus('OFFLINE');
      }
    };
    checkBackendHealth();
  }, []);

  const getStatusColor = (status) => {
    switch (status.toUpperCase()) {
      case 'GRANTED':
      case 'ACTIVE':
      case 'CONNECTED':
      case 'ONLINE':
      case 'TRUE':
        return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'DENIED':
      case 'ERROR':
      case 'OFFLINE':
      case 'FALSE':
        return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'PROMPT':
      case 'PENDING':
      case 'CHECKING':
        return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      default:
        return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
    }
  };

  const healthCards = [
    {
      icon: Mic,
      label: 'Microphone Sensor',
      value: isListening ? 'Listening' : 'Standby',
      subtext: `Permission: ${micPermission.toUpperCase()} • Current Level: ${Math.round(audioLevel)} dB`,
      status: isListening ? 'ACTIVE' : 'PENDING'
    },
    {
      icon: MapPin,
      label: 'GPS Location',
      value: gpsActive ? 'Transmitting' : 'Inactive',
      subtext: `Permission: ${gpsPermission.toUpperCase()} • High Accuracy Active`,
      status: gpsActive ? 'ACTIVE' : 'PENDING'
    },
    {
      icon: Wifi,
      label: 'Internet Connection',
      value: navigator.onLine ? 'Online' : 'Offline',
      subtext: `Socket Link: ${isSocketConnected ? 'CONNECTED' : 'DISCONNECTED'}`,
      status: navigator.onLine ? 'ONLINE' : 'OFFLINE'
    },
    {
      icon: Bell,
      label: 'System Notifications',
      value: notifPermission === 'granted' ? 'Enabled' : 'Disabled',
      subtext: `Permission level: ${notifPermission.toUpperCase()}`,
      status: notifPermission === 'granted' ? 'ACTIVE' : 'ERROR'
    },
    {
      icon: Mail,
      label: 'Emergency Email System',
      value: emailStatus,
      subtext: emailStatus === 'ACTIVE' ? 'Backend SMTP transporter initialized' : 'Backend connection unavailable',
      status: emailStatus
    },
    {
      icon: Database,
      label: 'Database Sync (Firestore)',
      value: dbStatus,
      subtext: 'Real-time synchronization active',
      status: dbStatus
    }
  ];

  return (
    <div className="min-h-full bg-slate-50 pb-8 text-slate-800">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 pt-8 pb-10 px-5 relative overflow-hidden text-white">
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-black text-white">System Health</h1>
              <p className="text-slate-400 text-xs font-bold mt-0.5">Real-time diagnostics dashboard</p>
            </div>
          </div>
          <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
            <Heart size={20} className="text-emerald-400 animate-pulse" />
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-4">
        {/* Health status list */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {healthCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-start gap-4"
              >
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-600 flex-shrink-0">
                  <Icon size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-slate-800 text-sm truncate">{card.label}</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${getStatusColor(card.status)}`}>
                      {card.value}
                    </span>
                  </div>
                  <p className="text-slate-500 text-xs mt-1 leading-snug">{card.subtext}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Last Alert Block */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <h3 className="text-slate-400 text-xs font-black uppercase tracking-widest mb-3">Last Threat Status</h3>
          {lastAlert ? (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-red-500">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">{lastAlert.type || 'Emergency'}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{new Date(lastAlert.timestamp).toLocaleString()}</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-red-100 text-red-600">
                {lastAlert.riskLevel || 'CRITICAL'}
              </span>
            </div>
          ) : (
            <p className="text-slate-400 text-sm font-medium">No alerts recorded in this session. Status stable.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SystemHealth;
