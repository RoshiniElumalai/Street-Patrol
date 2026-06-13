import React from 'react';
import { useStore } from '../../context/useStore';
import { MapPin, Battery, Clock, Activity, ShieldAlert, ArrowLeft, Phone, Users } from 'lucide-react';
import LiveMap from '../../components/map/LiveMap';
import { useSafeZones } from '../../hooks/useSafeZones';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const Guardians = () => {
  const { globalRouteCoords, lastKnownLocation, isEmergencyMode, contacts, triggerEmergency } = useStore();
  const navigate = useNavigate();

  const trackingLocation = lastKnownLocation || { lat: 13.0827, lng: 80.2707 };
  const { safeZones } = useSafeZones(trackingLocation, 5000);

  return (
    <div className="min-h-full bg-slate-50 pb-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 to-purple-900 pt-8 pb-10 px-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Users size={18} className="text-purple-400" />
            <span className="text-purple-400 text-xs font-black uppercase tracking-widest">Guardian Network</span>
          </div>
          <h1 className="text-3xl font-black text-white">Guardians</h1>
          <p className="text-slate-400 text-sm mt-1">Live tracking for your trusted network</p>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-4">
        {/* My Live Location Card */}
        <div className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-md">
          <div className="p-5 pb-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-blue-100 rounded-full flex items-center justify-center font-black text-blue-600 text-lg">
                  Me
                </div>
                <div>
                  <p className="font-bold text-slate-800">My Live Location</p>
                  <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase mt-0.5 ${
                    isEmergencyMode ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-emerald-100 text-emerald-600'
                  }`}>
                    <div className={`w-1 h-1 rounded-full ${isEmergencyMode ? 'bg-red-500' : 'bg-emerald-500'}`} />
                    {isEmergencyMode ? 'EMERGENCY' : 'SAFE'}
                  </div>
                </div>
              </div>
              {isEmergencyMode && (
                <button onClick={() => triggerEmergency('Guardian Emergency Trigger')}
                  className="bg-red-500 text-white px-3 py-1.5 rounded-xl font-bold text-xs shadow-md">
                  SOS ACTIVE
                </button>
              )}
            </div>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-slate-50 rounded-xl p-2.5 text-center border border-slate-100">
                <MapPin size={14} className="text-blue-500 mx-auto mb-1" />
                <p className="text-[10px] text-slate-400 font-bold uppercase">GPS</p>
                <p className="text-xs font-black text-slate-700">{lastKnownLocation ? 'Active' : 'Pending'}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-2.5 text-center border border-slate-100">
                <Clock size={14} className="text-purple-500 mx-auto mb-1" />
                <p className="text-[10px] text-slate-400 font-bold uppercase">Updated</p>
                <p className="text-xs font-black text-slate-700">Now</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-2.5 text-center border border-slate-100">
                <Activity size={14} className="text-emerald-500 mx-auto mb-1" />
                <p className="text-[10px] text-slate-400 font-bold uppercase">Status</p>
                <p className="text-xs font-black text-slate-700">{isEmergencyMode ? 'SOS' : 'Safe'}</p>
              </div>
            </div>
          </div>
          {/* Map */}
          <div className="h-48 border-t border-slate-100">
            <LiveMap
              interactive={true}
              zoom={14}
              userLocation={trackingLocation}
              routeCoords={globalRouteCoords}
              markers={[
                { lat: trackingLocation.lat, lng: trackingLocation.lng, color: isEmergencyMode ? '#ef4444' : '#3b82f6' },
                ...safeZones,
              ]}
            />
          </div>
        </div>

        {/* Emergency Contacts as Guardians */}
        <div>
          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Emergency Contacts (Guardians)</h3>
          {contacts.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center border border-slate-100 shadow-sm">
              <Users size={36} className="text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-600">No guardians configured</p>
              <p className="text-slate-400 text-xs mt-1">Add contacts to enable guardian tracking</p>
              <button onClick={() => navigate('/citizen/contacts')}
                className="mt-3 px-5 py-2 bg-purple-500 text-white font-bold rounded-xl text-sm">
                Add Guardians
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {contacts.map(contact => (
                <motion.div key={contact.id}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className="w-11 h-11 bg-purple-100 rounded-full flex items-center justify-center font-black text-purple-600 text-lg flex-shrink-0">
                    {contact.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800">{contact.name}</p>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{contact.relation || 'Guardian'}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                      <span className="text-[10px] text-slate-500 font-bold">Will be alerted in emergencies</span>
                    </div>
                  </div>
                  <a href={`tel:${contact.phone}`}
                    className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Phone size={16} className="text-emerald-600" />
                  </a>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Check-in Timer */}
        <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-3xl p-5 text-white">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={18} className="text-purple-200" />
            <h3 className="font-black text-white">Check-in Timer</h3>
          </div>
          <p className="text-purple-200 text-sm mb-4">Set a safety timer — if you don't check in, your guardians will be alerted automatically.</p>
          <button onClick={() => navigate('/citizen/tracking')}
            className="w-full py-3 bg-white/20 border border-white/30 rounded-2xl text-white font-bold text-sm">
            Set via SafeWalk
          </button>
        </div>
      </div>
    </div>
  );
};

export default Guardians;
