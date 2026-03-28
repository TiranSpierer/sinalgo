import { useState, useEffect } from 'react';
import { api } from '../api/client';

export default function GlobalSettingsDialog({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState<string>('Loading...');

  useEffect(() => {
    api.settings().then((data) => setSettings(data.settings)).catch((e) => setSettings('Error loading settings: ' + e.message));
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 w-[600px] max-h-[80vh] shadow-xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-white font-bold text-lg mb-4">Global Settings</h2>
        <pre className="flex-1 overflow-auto text-slate-300 text-xs font-mono bg-slate-900 p-3 rounded border border-slate-700 whitespace-pre-wrap">
          {settings}
        </pre>
        <button onClick={onClose} className="w-full mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white font-medium">
          Close
        </button>
      </div>
    </div>
  );
}
