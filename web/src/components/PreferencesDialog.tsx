import { useState, useEffect } from 'react';
import { useSimulationStore } from '../store/simulationStore';
import { api } from '../api/client';

export default function PreferencesDialog({ onClose }: { onClose: () => void }) {
  const config = useSimulationStore((s) => s.config);
  const [drawArrows, setDrawArrows] = useState(config?.drawArrows ?? false);
  const [drawEdges, setDrawEdges] = useState(config?.drawEdges ?? true);
  const [drawNodes, setDrawNodes] = useState(config?.drawNodes ?? true);
  const [showMessageAnimations, setShowMessageAnimations] = useState(config?.showMessageAnimations ?? false);

  useEffect(() => {
    api.preferences().then((prefs) => {
      setDrawArrows(prefs.drawArrows);
      setDrawEdges(prefs.drawEdges);
      setDrawNodes(prefs.drawNodes);
      setShowMessageAnimations(prefs.showMessageAnimations);
    }).catch(() => {});
  }, []);

  const handleApply = async () => {
    await api.setPreferences({ drawArrows, drawEdges, drawNodes, showMessageAnimations });
    // Re-fetch config to update the store
    const newConfig = await api.config();
    useSimulationStore.setState({ config: newConfig });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 w-96 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-white font-bold text-lg mb-4">Preferences</h2>
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
            <input type="checkbox" checked={drawArrows} onChange={(e) => setDrawArrows(e.target.checked)} className="rounded" />
            Draw arrows on edges
          </label>
          <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
            <input type="checkbox" checked={drawEdges} onChange={(e) => setDrawEdges(e.target.checked)} className="rounded" />
            Draw edges
          </label>
          <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
            <input type="checkbox" checked={drawNodes} onChange={(e) => setDrawNodes(e.target.checked)} className="rounded" />
            Draw nodes
          </label>
          <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
            <input type="checkbox" checked={showMessageAnimations} onChange={(e) => setShowMessageAnimations(e.target.checked)} className="rounded" />
            Show message envelope animations
          </label>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={handleApply} className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white font-medium">
            Apply
          </button>
          <button onClick={onClose} className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded text-white">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
