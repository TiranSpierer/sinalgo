import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useSimulationStore } from '../store/simulationStore';

interface Props {
  onClose: () => void;
}

export default function GenerateNodesDialog({ onClose }: Props) {
  const config = useSimulationStore((s) => s.config);
  const pollState = useSimulationStore((s) => s.pollState);
  const [count, setCount] = useState(100);
  const [nodeType, setNodeType] = useState('');
  const [distribution, setDistribution] = useState('');
  const [connectivity, setConnectivity] = useState('');
  const [mobility, setMobility] = useState('');
  const [reliability, setReliability] = useState('');
  const [interference, setInterference] = useState('');
  const [nodeTypes, setNodeTypes] = useState<string[]>([]);
  const [distributions, setDistributions] = useState<string[]>([]);
  const [connectivities, setConnectivities] = useState<string[]>([]);
  const [mobilities, setMobilities] = useState<string[]>([]);
  const [reliabilities, setReliabilities] = useState<string[]>([]);
  const [interferences, setInterferences] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([
      api.implementations('NODES_IMPLEMENTATIONS'),
      api.implementations('MODELS_DISTRIBUTION'),
      api.implementations('MODELS_CONNECTIVITY'),
      api.implementations('MODELS_MOBILITY'),
      api.implementations('MODELS_RELIABILITY'),
      api.implementations('MODELS_INTERFERENCE'),
    ]).then(([nt, dist, conn, mob, rel, intf]) => {
      setNodeTypes(nt);
      setDistributions(dist);
      setConnectivities(conn);
      setMobilities(mob);
      setReliabilities(rel);
      setInterferences(intf);
    });
  }, []);

  useEffect(() => {
    if (config) {
      setNodeType(config.defaultNodeImpl);
      setDistribution(config.defaultDistribution);
      setConnectivity(config.defaultConnectivity);
      setMobility(config.defaultMobility);
      setReliability(config.defaultReliability);
      setInterference(config.defaultInterference);
    }
  }, [config]);

  const handleGenerate = async () => {
    await api.generateNodes({
      count,
      nodeType: nodeType || undefined,
      distribution: distribution || undefined,
      connectivity: connectivity || undefined,
      mobility: mobility || undefined,
      reliability: reliability || undefined,
      interference: interference || undefined,
    });
    await pollState();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 w-96" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-white mb-4">Generate Nodes</h2>

        <div className="space-y-3">
          <div>
            <label className="text-slate-400 text-sm">Number of Nodes</label>
            <input
              type="number"
              min={1}
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value) || 1)}
              className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white"
            />
          </div>

          <div>
            <label className="text-slate-400 text-sm">Node Type</label>
            <select
              value={nodeType}
              onChange={(e) => setNodeType(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white"
            >
              {nodeTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-slate-400 text-sm">Distribution Model</label>
            <select
              value={distribution}
              onChange={(e) => setDistribution(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white"
            >
              {distributions.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-slate-400 text-sm">Connectivity Model</label>
            <select
              value={connectivity}
              onChange={(e) => setConnectivity(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white"
            >
              {connectivities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-slate-400 text-sm">Mobility Model</label>
            <select
              value={mobility}
              onChange={(e) => setMobility(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white"
            >
              {mobilities.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-slate-400 text-sm">Reliability Model</label>
            <select
              value={reliability}
              onChange={(e) => setReliability(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white"
            >
              {reliabilities.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-slate-400 text-sm">Interference Model</label>
            <select
              value={interference}
              onChange={(e) => setInterference(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white"
            >
              {interferences.map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button
            onClick={handleGenerate}
            className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded text-white font-medium"
          >
            Generate
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded text-white"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
