import { useEffect, useRef, useState } from 'react';
import { useSimulationStore } from '../store/simulationStore';

export default function LogPanel() {
  const logLines = useSimulationStore((s) => s.logLines);
  const clearLog = useSimulationStore((s) => s.clearLog);
  const [collapsed, setCollapsed] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logLines]);

  if (logLines.length === 0 && collapsed) return null;

  return (
    <div className="bg-slate-800 border-t border-slate-700">
      <div className="px-3 py-1 flex items-center justify-between border-b border-slate-700">
        <button onClick={() => setCollapsed(!collapsed)} className="text-xs text-slate-400 font-bold hover:text-white">
          Output {logLines.length > 0 && `(${logLines.length})`} {collapsed ? '▸' : '▾'}
        </button>
        {!collapsed && (
          <button onClick={clearLog} className="text-xs text-slate-500 hover:text-white">Clear</button>
        )}
      </div>
      {!collapsed && (
        <div ref={scrollRef} className="max-h-40 overflow-auto px-3 py-1">
          {logLines.length === 0 ? (
            <span className="text-xs text-slate-500">No output yet</span>
          ) : (
            logLines.map((line, i) => (
              <div key={i} className="text-xs text-slate-300 font-mono whitespace-pre-wrap">{line}</div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
