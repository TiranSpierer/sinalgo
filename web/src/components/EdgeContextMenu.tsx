import { useState } from 'react';
import { useSimulationStore } from '../store/simulationStore';
import { api } from '../api/client';
import type { EdgeInfo } from '../api/client';

export default function EdgeContextMenu() {
  const edgeContextMenu = useSimulationStore((s) => s.edgeContextMenu);
  const setEdgeContextMenu = useSimulationStore((s) => s.setEdgeContextMenu);
  const pollState = useSimulationStore((s) => s.pollState);
  const [edgeInfo, setEdgeInfo] = useState<EdgeInfo | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  if (!edgeContextMenu) return null;

  const handleInfo = async () => {
    try {
      const info = await api.edgeInfo(edgeContextMenu.from, edgeContextMenu.to);
      setEdgeInfo(info);
      setShowInfo(true);
    } catch { /* ignore */ }
    setEdgeContextMenu(null);
  };

  const handleDelete = async () => {
    try {
      await api.deleteEdge(edgeContextMenu.from, edgeContextMenu.to);
      await pollState();
    } catch { /* ignore */ }
    setEdgeContextMenu(null);
  };

  if (showInfo && edgeInfo) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
        onClick={() => { setShowInfo(false); setEdgeInfo(null); }}>
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-4 min-w-[280px] shadow-xl"
          onClick={(e) => e.stopPropagation()}>
          <h3 className="text-white font-bold mb-3">Edge Info</h3>
          <div className="space-y-1 text-sm text-slate-300">
            <div><span className="text-slate-400">From:</span> {edgeInfo.from}</div>
            <div><span className="text-slate-400">To:</span> {edgeInfo.to}</div>
            <div><span className="text-slate-400">Type:</span> {edgeInfo.type}</div>
            <div><span className="text-slate-400">Color:</span> <span style={{ color: edgeInfo.color }}>{edgeInfo.color}</span></div>
            <div><span className="text-slate-400">ToString:</span> {edgeInfo.toString}</div>
          </div>
          <button onClick={() => { setShowInfo(false); setEdgeInfo(null); }}
            className="mt-3 px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-white text-sm">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50" onClick={() => setEdgeContextMenu(null)}>
      <div
        className="absolute bg-slate-800 border border-slate-600 rounded-lg py-1 shadow-xl min-w-[160px]"
        style={{ left: edgeContextMenu.x, top: edgeContextMenu.y }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-3 py-1.5 text-xs text-slate-400 border-b border-slate-700">
          Edge {edgeContextMenu.from} → {edgeContextMenu.to}
        </div>
        <button onClick={handleInfo}
          className="w-full text-left px-3 py-1.5 text-sm text-white hover:bg-slate-700">
          Info
        </button>
        <div className="border-t border-slate-700 mt-1 pt-1">
          <button onClick={handleDelete}
            className="w-full text-left px-3 py-1.5 text-sm text-red-400 hover:bg-slate-700">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
