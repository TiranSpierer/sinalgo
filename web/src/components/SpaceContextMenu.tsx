import { useSimulationStore } from '../store/simulationStore';
import { api } from '../api/client';

export default function SpaceContextMenu() {
  const spaceContextMenu = useSimulationStore((s) => s.spaceContextMenu);
  const setSpaceContextMenu = useSimulationStore((s) => s.setSpaceContextMenu);
  const pollState = useSimulationStore((s) => s.pollState);

  if (!spaceContextMenu) return null;

  const handleAddNode = async () => {
    try {
      await api.addNode(spaceContextMenu.wx, spaceContextMenu.wy, 0);
      await pollState();
    } catch { /* ignore */ }
    setSpaceContextMenu(null);
  };

  return (
    <div className="fixed inset-0 z-50" onClick={() => setSpaceContextMenu(null)}>
      <div
        className="absolute bg-slate-800 border border-slate-600 rounded-lg py-1 shadow-xl min-w-[160px]"
        style={{ left: spaceContextMenu.x, top: spaceContextMenu.y }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={handleAddNode}
          className="w-full text-left px-3 py-1.5 text-sm text-white hover:bg-slate-700">
          Add Node Here
        </button>
      </div>
    </div>
  );
}
