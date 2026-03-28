import { useSimulationStore } from '../store/simulationStore';
import { api } from '../api/client';

export default function NodeContextMenu() {
  const contextMenu = useSimulationStore((s) => s.contextMenu);
  const nodePopupMethods = useSimulationStore((s) => s.nodePopupMethods);
  const setContextMenu = useSimulationStore((s) => s.setContextMenu);
  const setSelectedNode = useSimulationStore((s) => s.setSelectedNode);
  const pollState = useSimulationStore((s) => s.pollState);

  if (!contextMenu) return null;

  const handleMethod = async (methodId: number) => {
    await api.invokeNodePopupMethod(contextMenu.nodeId, methodId);
    await pollState();
    setContextMenu(null);
  };

  const handleInfo = () => {
    setSelectedNode(contextMenu.nodeId);
    setContextMenu(null);
  };

  const handleDelete = async () => {
    await api.deleteNode(contextMenu.nodeId);
    await pollState();
    setContextMenu(null);
  };

  return (
    <div
      className="fixed inset-0 z-50"
      onClick={() => setContextMenu(null)}
    >
      <div
        className="absolute bg-slate-800 border border-slate-600 rounded-lg py-1 shadow-xl min-w-[160px]"
        style={{ left: contextMenu.x, top: contextMenu.y }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-3 py-1.5 text-xs text-slate-400 border-b border-slate-700">
          Node {contextMenu.nodeId}
        </div>
        <button
          onClick={handleInfo}
          className="w-full text-left px-3 py-1.5 text-sm text-white hover:bg-slate-700"
        >
          Info
        </button>
        {nodePopupMethods.map((m) => (
          <button
            key={m.id}
            onClick={() => handleMethod(m.id)}
            className="w-full text-left px-3 py-1.5 text-sm text-white hover:bg-slate-700"
          >
            {m.menuText}
          </button>
        ))}
        <div className="border-t border-slate-700 mt-1 pt-1">
          <button
            onClick={handleDelete}
            className="w-full text-left px-3 py-1.5 text-sm text-red-400 hover:bg-slate-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
