import { useSimulationStore } from '../store/simulationStore';

export default function EventQueuePanel() {
  const state = useSimulationStore((s) => s.state);

  if (!state || !state.async || !state.events || state.events.length === 0) return null;

  return (
    <div className="bg-slate-800 border-t border-slate-700 max-h-48 overflow-auto">
      <div className="px-3 py-1 text-xs text-slate-400 font-bold border-b border-slate-700 sticky top-0 bg-slate-800">
        Event Queue ({state.events.length} events)
      </div>
      <table className="w-full text-xs text-slate-300">
        <thead>
          <tr className="text-slate-400 border-b border-slate-700">
            <th className="px-2 py-1 text-left">Time</th>
            <th className="px-2 py-1 text-left">Kind</th>
            <th className="px-2 py-1 text-left">Details</th>
          </tr>
        </thead>
        <tbody>
          {state.events.map((ev, i) => (
            <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-700/30">
              <td className="px-2 py-0.5">{ev.time.toFixed(2)}</td>
              <td className="px-2 py-0.5">{ev.kind}</td>
              <td className="px-2 py-0.5">
                {ev.kind === 'packet' && `${ev.from} → ${ev.to}`}
                {ev.kind === 'timer' && ev.node !== undefined && `Node ${ev.node}`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
