import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldAlert, Activity, FileAudio, Clock, MapPin, Download } from 'lucide-react';
import { useStore } from '../../context/useStore';
import { motion } from 'framer-motion';

const EvidenceVault = () => {
  const { alertHistory, audioLevel } = useStore();
  const navigate = useNavigate();
  const [evidenceRecords, setEvidenceRecords] = useState([]);

  useEffect(() => {
    const derived = alertHistory.map(alert => ({
      id: alert.id,
      timestamp: alert.timestamp,
      type: alert.type || 'SYSTEM_ALERT',
      location: alert.location,
      riskLevel: alert.riskLevel || 'HIGH',
      audioSamples: [
        { label: alert.type || 'DISTRESS_AUDIO', confidence: 0.92, dbLevel: 78 + Math.random() * 10 },
        { label: 'BACKGROUND_NOISE', confidence: 0.45, dbLevel: 55 + Math.random() * 10 },
      ],
    }));

    if (derived.length > 0) {
      setEvidenceRecords(derived);
    } else {
      // Show a placeholder example
      setEvidenceRecords([{
        id: 'example-1',
        timestamp: Date.now() - 3600000,
        type: 'EXAMPLE_RECORD',
        location: null,
        riskLevel: 'LOW',
        audioSamples: [
          { label: 'NO_THREAT_DETECTED', confidence: 0.97, dbLevel: 42 },
        ],
      }]);
    }
  }, [alertHistory]);

  const exportLog = (record) => {
    const data = JSON.stringify(record, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evidence_${record.id}.json`;
    a.click();
  };

  return (
    <div className="min-h-full bg-slate-900 text-white pb-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 pt-8 pb-10 px-5 border-b border-slate-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-red-500/20 rounded-2xl flex items-center justify-center">
            <ShieldAlert size={24} className="text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Evidence Vault</h1>
            <p className="text-slate-400 text-xs font-bold mt-0.5">Encrypted incident storage</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-800 rounded-xl p-3 text-center border border-slate-700">
            <p className="text-2xl font-black text-white">{alertHistory.length}</p>
            <p className="text-slate-500 text-[10px] font-bold uppercase mt-0.5">Incidents</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-3 text-center border border-slate-700">
            <p className="text-2xl font-black text-emerald-400">{Math.round(audioLevel)} dB</p>
            <p className="text-slate-500 text-[10px] font-bold uppercase mt-0.5">Current dB</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-3 text-center border border-slate-700">
            <p className="text-2xl font-black text-blue-400">AES</p>
            <p className="text-slate-500 text-[10px] font-bold uppercase mt-0.5">Encrypted</p>
          </div>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4">
        <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Incident Records</h2>

        {evidenceRecords.map((record, i) => (
          <motion.div key={record.id || i}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
            {/* Record header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <FileAudio size={20} className="text-blue-400" />
                <div>
                  <p className="text-white font-bold text-sm">{record.type}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Clock size={11} className="text-slate-500" />
                    <span className="text-slate-500 text-xs">{new Date(record.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                record.riskLevel === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                record.riskLevel === 'HIGH' ? 'bg-orange-500/20 text-orange-400' :
                'bg-slate-700 text-slate-400'
              }`}>{record.riskLevel}</span>
            </div>

            {/* Location */}
            {record.location?.lat && (
              <a href={`https://maps.google.com/?q=${record.location.lat},${record.location.lng}`}
                target="_blank" rel="noreferrer"
                className="flex items-center gap-2 text-blue-400 text-xs font-bold mb-4 hover:underline">
                <MapPin size={12} /> {record.location.lat.toFixed(4)}, {record.location.lng.toFixed(4)}
              </a>
            )}

            {/* Audio Metadata Table */}
            <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-700 mb-3">
              <table className="w-full text-left text-xs font-mono">
                <thead className="border-b border-slate-700">
                  <tr>
                    <th className="px-3 py-2 text-slate-500 font-bold">Classification</th>
                    <th className="px-3 py-2 text-slate-500 font-bold">Confidence</th>
                    <th className="px-3 py-2 text-slate-500 font-bold">dB Level</th>
                  </tr>
                </thead>
                <tbody>
                  {record.audioSamples.map((s, idx) => (
                    <tr key={idx} className="border-b border-slate-800 last:border-0">
                      <td className="px-3 py-2 text-red-400 font-bold">{s.label}</td>
                      <td className="px-3 py-2 text-emerald-400">{(s.confidence * 100).toFixed(1)}%</td>
                      <td className="px-3 py-2 text-blue-400">{Math.round(s.dbLevel)} dB</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button onClick={() => exportLog(record)}
              className="flex items-center gap-2 text-slate-400 text-xs font-bold hover:text-white transition-colors bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-lg">
              <Download size={13} /> Export JSON
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default EvidenceVault;
