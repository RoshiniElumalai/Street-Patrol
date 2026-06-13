import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Phone, MapPin, Shield, Edit2, LogOut, CheckCircle, PhoneForwarded, Droplet, Mail } from 'lucide-react';
import { useStore } from '../../context/useStore';
import { motion } from 'framer-motion';

const InfoRow = ({ icon: Icon, label, value, iconColor = 'text-slate-400' }) => (
  <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-4">
    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100">
      <Icon size={18} className={iconColor} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="font-bold text-slate-800 text-sm mt-0.5 truncate">{value || 'Not provided'}</p>
    </div>
  </div>
);

const Profile = () => {
  const { currentUser, logout, contacts } = useStore();
  const navigate = useNavigate();
  const primaryContact = contacts.length > 0 ? contacts[0] : null;

  const handleSignOut = () => {
    logout();
    navigate('/');
  };

  if (!currentUser) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-8 text-center">
        <Shield size={52} className="text-slate-300 mb-4" />
        <h2 className="text-xl font-black text-slate-800">Not Logged In</h2>
        <p className="text-slate-500 text-sm mt-2 mb-6">Please log in to view your profile</p>
        <button onClick={() => navigate('/login')}
          className="px-6 py-3 bg-red-500 text-white font-black rounded-xl shadow-lg">
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 pb-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-red-600 to-red-900 pt-8 pb-14 px-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-56 h-56 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-slate-900/20 rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-24 h-24 rounded-full bg-white/20 border-4 border-white/40 flex items-center justify-center mb-4 shadow-xl">
            {currentUser.profileImage
              ? <img src={currentUser.profileImage} alt="Profile" className="w-full h-full object-cover rounded-full" />
              : <User size={44} className="text-white" />}
          </div>
          <h1 className="text-2xl font-black text-white">{currentUser.name}</h1>
          <div className="mt-2 flex items-center gap-2 bg-red-900/30 px-3 py-1 rounded-full border border-red-400/30">
            <CheckCircle size={12} className="text-emerald-400" />
            <span className="text-red-100 text-[10px] font-black uppercase tracking-widest">
              {currentUser.role || 'Citizen'} — Verified
            </span>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-6 space-y-4">
        {/* Personal Info Card */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-md space-y-3">
          <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Personal Details</h2>
          <InfoRow icon={Mail} label="Email" value={currentUser.email} iconColor="text-blue-400" />
          <InfoRow icon={Phone} label="Phone" value={currentUser.phone} iconColor="text-emerald-400" />
          <InfoRow icon={MapPin} label="Address" value={currentUser.address} iconColor="text-purple-400" />
          <InfoRow icon={Droplet} label="Blood Group" value={currentUser.bloodGroup} iconColor="text-red-400" />
        </div>

        {/* Emergency Info */}
        <div className="bg-red-50 rounded-3xl p-5 border border-red-100 shadow-sm space-y-3">
          <h2 className="text-[11px] font-black text-red-400 uppercase tracking-widest">Emergency Information</h2>
          <div className="bg-white rounded-2xl p-4 border border-red-100 flex items-center gap-4">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <PhoneForwarded size={18} className="text-red-500" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black text-red-400 uppercase tracking-wider">Primary SOS Contact</p>
              <p className="font-bold text-slate-800 text-sm mt-0.5">
                {primaryContact ? `${primaryContact.name} — ${primaryContact.phone}` : 'No contact saved'}
              </p>
            </div>
            <button onClick={() => navigate('/citizen/contacts')}
              className="text-xs font-bold text-red-500 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">
              EDIT
            </button>
          </div>
          <p className="text-xs text-red-400 font-medium px-1">
            {contacts.length} guardian{contacts.length !== 1 ? 's' : ''} will be alerted in an emergency
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button onClick={() => navigate('/citizen/settings')}
            className="w-full flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3">
              <Shield size={18} className="text-blue-500" />
              <span className="font-bold text-slate-800 text-sm">Safety Settings</span>
            </div>
            <span className="text-slate-400 text-xs">→</span>
          </button>

          <button onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-3 p-4 bg-white border-2 border-slate-200 rounded-2xl text-slate-500 font-black hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors">
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
