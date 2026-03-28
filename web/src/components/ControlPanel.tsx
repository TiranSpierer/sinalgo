import { useState } from 'react';
import { api } from '../api/client';
import { useSimulationStore } from '../store/simulationStore';

export default function ControlPanel() {
  const state = useSimulationStore((s) => s.state);
  const config = useSimulationStore((s) => s.config);
  const globalMethods = useSimulationStore((s) => s.globalMethods);
  const customButtons = useSimulationStore((s) => s.customButtons);
  const pollState = useSimulationStore((s) => s.pollState);
  const setShowGenerateDialog = useSimulationStore((s) => s.setShowGenerateDialog);
  const [rounds, setRounds] = useState(1);
  const [refreshRate, setRefreshRate] = useState(config?.refreshRate ?? 1);

  const handleStart = async () => {
    await api.start(rounds);
    const poll = setInterval(async () => {
      await pollState();
      const s = useSimulationStore.getState().state;
      if (s && !s.running) clearInterval(poll);
    }, 200);
  };

  const handleRunForever = async () => {
    await api.start(-1);
    const poll = setInterval(async () => {
      await pollState();
      const s = useSimulationStore.getState().state;
      if (s && !s.running) clearInterval(poll);
    }, 200);
  };

  const handleStop = async () => {
    await api.stop();
    await pollState();
  };

  const handleClear = async () => {
    await api.clear();
    await pollState();
  };

  const handleReevaluate = async () => {
    await api.reevaluate();
    await pollState();
  };

  const handleGlobalMethod = async (id: number) => {
    await api.invokeGlobalMethod(id);
    await pollState();
  };

  return (
    <div className="bg-slate-800 border-b border-slate-700 px-4 py-2 flex items-center gap-3 flex-wrap text-sm">
      {/* Simulation controls */}
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          value={rounds}
          onChange={(e) => setRounds(Math.max(1, parseInt(e.target.value) || 1))}
          className="w-20 px-2 py-1 bg-slate-900 border border-slate-600 rounded text-white text-center"
        />
        <button
          onClick={handleStart}
          disabled={state?.running}
          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 rounded text-white font-medium"
        >
          {state?.running ? 'Running...' : 'Start'}
        </button>
        <button
          onClick={handleRunForever}
          disabled={state?.running}
          className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 disabled:bg-slate-600 rounded text-white font-medium"
          title="Run until stopped"
        >
          Run ∞
        </button>
        <button
          onClick={handleStop}
          disabled={!state?.running}
          className="px-3 py-1 bg-red-600 hover:bg-red-500 disabled:bg-slate-600 rounded text-white font-medium"
        >
          Stop
        </button>
        <span className="text-slate-500 text-xs">Refresh:</span>
        <input
          type="number"
          min={1}
          value={refreshRate}
          onChange={(e) => {
            const v = Math.max(1, parseInt(e.target.value) || 1);
            setRefreshRate(v);
            api.setRefreshRate(v);
          }}
          className="w-16 px-2 py-1 bg-slate-900 border border-slate-600 rounded text-white text-center"
          title="Refresh rate (redraw every N rounds)"
        />
      </div>

      <div className="w-px h-6 bg-slate-600" />

      {/* Node management */}
      <button
        onClick={() => setShowGenerateDialog(true)}
        className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-white"
      >
        Generate Nodes
      </button>
      <button
        onClick={handleReevaluate}
        className="px-3 py-1 bg-slate-600 hover:bg-slate-500 rounded text-white"
      >
        Reevaluate
      </button>
      <button
        onClick={handleClear}
        className="px-3 py-1 bg-slate-600 hover:bg-slate-500 rounded text-white"
      >
        Clear
      </button>

      {/* Global methods */}
      {globalMethods.length > 0 && (
        <>
          <div className="w-px h-6 bg-slate-600" />
          {globalMethods.map((m) => (
            <button
              key={m.id}
              onClick={() => handleGlobalMethod(m.id)}
              className="px-3 py-1 bg-purple-600 hover:bg-purple-500 rounded text-white"
              title={m.subMenu ? `${m.subMenu} > ${m.menuText}` : m.menuText}
            >
              {m.menuText === '...' ? m.name : m.menuText}
            </button>
          ))}
        </>
      )}

      {/* Custom buttons */}
      {customButtons.map((b) => (
        <button
          key={b.id}
          onClick={async () => {
            await api.invokeGlobalMethod(b.id);
            await pollState();
          }}
          className="px-3 py-1 bg-amber-600 hover:bg-amber-500 rounded text-white"
          title={b.toolTipText}
        >
          {b.buttonText || b.name}
        </button>
      ))}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Status */}
      <div className="text-slate-400 flex items-center gap-3">
        <span>Round: {state?.time ?? 0}</span>
        <span>Nodes: {state?.nodes.length ?? 0}</span>
        <span>Edges: {state?.edges.length ?? 0}</span>
        <span>Msgs: {state?.messagesTotal ?? 0}</span>
        <span>This Round: {state?.messagesThisRound ?? 0}</span>
        {state?.running && (
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            Running
          </span>
        )}
      </div>
    </div>
  );
}
