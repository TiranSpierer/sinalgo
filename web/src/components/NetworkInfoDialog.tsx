import { useSimulationStore } from '../store/simulationStore';

export default function NetworkInfoDialog({ onClose }: { onClose: () => void }) {
  const state = useSimulationStore((s) => s.state);

  if (!state) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 w-96 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-white font-bold text-lg mb-4">Network Information</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Nodes:</span>
            <span className="text-white">{state.nodes.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Edges:</span>
            <span className="text-white">{state.edges.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Messages this round:</span>
            <span className="text-white">{state.messagesThisRound}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Messages total:</span>
            <span className="text-white">{state.messagesTotal}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Current time:</span>
            <span className="text-white">{state.time}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Mode:</span>
            <span className="text-white">{state.async ? 'Asynchronous' : 'Synchronous'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Project:</span>
            <span className="text-white">{state.project}</span>
          </div>
          {state.async && state.events && (
            <div className="flex justify-between">
              <span className="text-slate-400">Pending events:</span>
              <span className="text-white">{state.events.length}</span>
            </div>
          )}
        </div>
        <button onClick={onClose} className="w-full mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white font-medium">
          Close
        </button>
      </div>
    </div>
  );
}
