import { useState, useEffect } from 'react';
import { useSimulationStore } from '../store/simulationStore';
import { api } from '../api/client';

interface Props {
  onClose: () => void;
}

export default function NodeInfoPanel({ onClose }: Props) {
  const selectedNodeInfo = useSimulationStore((s) => s.selectedNodeInfo);
  const selectedNodeId = useSimulationStore((s) => s.selectedNodeId);
  const state = useSimulationStore((s) => s.state);
  const setSelectedNode = useSimulationStore((s) => s.setSelectedNode);
  const pollState = useSimulationStore((s) => s.pollState);

  const [editX, setEditX] = useState('');
  const [editY, setEditY] = useState('');
  const [editZ, setEditZ] = useState('');

  useEffect(() => {
    if (selectedNodeInfo) {
      setEditX(selectedNodeInfo.x.toFixed(2));
      setEditY(selectedNodeInfo.y.toFixed(2));
      setEditZ(selectedNodeInfo.z.toFixed(2));
    }
  }, [selectedNodeInfo]);

  if (!selectedNodeId) return null;

  const sortedNodeIds = state ? [...state.nodes].sort((a, b) => a.id - b.id).map((n) => n.id) : [];
  const currentIdx = sortedNodeIds.indexOf(selectedNodeId);

  const handlePrev = () => {
    if (currentIdx > 0) setSelectedNode(sortedNodeIds[currentIdx - 1]);
  };
  const handleNext = () => {
    if (currentIdx < sortedNodeIds.length - 1) setSelectedNode(sortedNodeIds[currentIdx + 1]);
  };

  const handleDelete = async () => {
    await api.deleteNode(selectedNodeId);
    await pollState();
    onClose();
  };

  const handleMoveNode = async () => {
    const x = parseFloat(editX);
    const y = parseFloat(editY);
    const z = parseFloat(editZ);
    if (isNaN(x) || isNaN(y) || isNaN(z)) return;
    await api.moveNode(selectedNodeId, x, y, z);
    await pollState();
    setSelectedNode(selectedNodeId); // re-fetch info
  };

  return (
    <div className="absolute right-4 top-4 bg-slate-800 border border-slate-600 rounded-lg p-4 w-72 z-40 shadow-xl">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <button onClick={handlePrev} disabled={currentIdx <= 0}
            className="px-1.5 py-0.5 text-xs bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 rounded text-white">&lt;</button>
          <h3 className="text-white font-semibold">Node {selectedNodeId}</h3>
          <button onClick={handleNext} disabled={currentIdx >= sortedNodeIds.length - 1}
            className="px-1.5 py-0.5 text-xs bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 rounded text-white">&gt;</button>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white">&times;</button>
      </div>

      {selectedNodeInfo ? (
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Type</span>
            <span className="text-white font-mono text-xs">{selectedNodeInfo.type.split('.').pop()}</span>
          </div>
          <div>
            <span className="text-slate-400 text-xs">Position</span>
            <div className="flex gap-1 mt-1">
              <input value={editX} onChange={(e) => setEditX(e.target.value)}
                onBlur={handleMoveNode} onKeyDown={(e) => e.key === 'Enter' && handleMoveNode()}
                className="w-1/3 px-1.5 py-0.5 bg-slate-900 border border-slate-600 rounded text-white text-xs text-center" title="X" />
              <input value={editY} onChange={(e) => setEditY(e.target.value)}
                onBlur={handleMoveNode} onKeyDown={(e) => e.key === 'Enter' && handleMoveNode()}
                className="w-1/3 px-1.5 py-0.5 bg-slate-900 border border-slate-600 rounded text-white text-xs text-center" title="Y" />
              <input value={editZ} onChange={(e) => setEditZ(e.target.value)}
                onBlur={handleMoveNode} onKeyDown={(e) => e.key === 'Enter' && handleMoveNode()}
                className="w-1/3 px-1.5 py-0.5 bg-slate-900 border border-slate-600 rounded text-white text-xs text-center" title="Z" />
            </div>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Color</span>
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedNodeInfo.color }} />
              <span className="text-white font-mono text-xs">{selectedNodeInfo.color}</span>
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Connections</span>
            <span className="text-white">{selectedNodeInfo.connections}</span>
          </div>
          {selectedNodeInfo.connectivityModel && (
            <div className="flex justify-between">
              <span className="text-slate-400">Connectivity</span>
              <span className="text-white text-xs">{selectedNodeInfo.connectivityModel}</span>
            </div>
          )}
          {selectedNodeInfo.mobilityModel && (
            <div className="flex justify-between">
              <span className="text-slate-400">Mobility</span>
              <span className="text-white text-xs">{selectedNodeInfo.mobilityModel}</span>
            </div>
          )}
          {selectedNodeInfo.interferenceModel && (
            <div className="flex justify-between">
              <span className="text-slate-400">Interference</span>
              <span className="text-white text-xs">{selectedNodeInfo.interferenceModel}</span>
            </div>
          )}
          {selectedNodeInfo.reliabilityModel && (
            <div className="flex justify-between">
              <span className="text-slate-400">Reliability</span>
              <span className="text-white text-xs">{selectedNodeInfo.reliabilityModel}</span>
            </div>
          )}
          {selectedNodeInfo.toString && (
            <div className="mt-2 pt-2 border-t border-slate-700">
              <span className="text-slate-400 text-xs">Info</span>
              <pre className="text-white text-xs mt-1 whitespace-pre-wrap bg-slate-900 p-2 rounded">
                {selectedNodeInfo.toString}
              </pre>
            </div>
          )}
          <button
            onClick={handleDelete}
            className="w-full mt-2 px-3 py-1.5 bg-red-600 hover:bg-red-500 rounded text-white text-sm"
          >
            Delete Node
          </button>
        </div>
      ) : (
        <div className="text-slate-400 text-sm">Loading...</div>
      )}
    </div>
  );
}
