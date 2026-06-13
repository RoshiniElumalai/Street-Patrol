import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ShieldAlert, Map, BellRing, Settings } from 'lucide-react';

const PoliceLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: '/police/home', icon: <BellRing size={24} />, label: 'Feed' },
    { path: '/police/map', icon: <Map size={24} />, label: 'Tactical Map' },
    { path: '/police/status', icon: <ShieldAlert size={24} />, label: 'Status' },
    { path: '/police/settings', icon: <Settings size={24} />, label: 'Comm' }
  ];

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      
      {/* Tactical Top Bar */}
      <div className="bg-slate-900 px-6 py-4 border-b-4 border-primary-red flex justify-between items-center shadow-lg z-20">
        <div className="flex items-center gap-3">
          <div className="bg-red-500/20 p-2 rounded-full">
            <ShieldAlert className="text-primary-red" size={24} />
          </div>
          <span className="text-white font-extrabold tracking-widest text-lg">COMMAND CENTER</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-slate-400 font-bold tracking-wider">UNIT 7A</div>
            <div className="text-[10px] text-emerald-400 font-bold animate-pulse tracking-widest">ON DUTY</div>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-primary-red"></div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Desktop Sidebar / Tablet Navigation */}
        <div className="w-20 bg-white border-r border-slate-200 shadow-sm flex flex-col items-center py-8 z-10">
          {navItems.map((item, idx) => {
            const isActive = location.pathname === item.path;
            return (
              <div 
                key={idx}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center cursor-pointer mb-10 relative w-full ${
                  isActive ? 'text-primary-red' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-0 h-full w-1 bg-primary-red shadow-[0_0_10px_rgba(225,29,72,0.5)] rounded-r-md"></div>
                )}
                <div className={`p-2 rounded-xl transition-colors ${isActive ? 'bg-red-50' : 'bg-transparent'}`}>
                  {item.icon}
                </div>
                <span className="text-[9px] font-bold mt-2 uppercase tracking-wider">{item.label}</span>
              </div>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default PoliceLayout;
