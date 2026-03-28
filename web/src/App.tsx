import { useEffect } from 'react';
import { useSimulationStore } from './store/simulationStore';
import Canvas2D from './components/Canvas2D';
import ControlPanel from './components/ControlPanel';
import GenerateNodesDialog from './components/GenerateNodesDialog';
import NodeInfoPanel from './components/NodeInfoPanel';
import NodeContextMenu from './components/NodeContextMenu';
import EdgeContextMenu from './components/EdgeContextMenu';
import SpaceContextMenu from './components/SpaceContextMenu';
import DialogOverlay from './components/DialogOverlay';
import PreferencesDialog from './components/PreferencesDialog';
import NetworkInfoDialog from './components/NetworkInfoDialog';
import GlobalSettingsDialog from './components/GlobalSettingsDialog';
import EventQueuePanel from './components/EventQueuePanel';
import LogPanel from './components/LogPanel';

function App() {
  const init = useSimulationStore((s) => s.init);
  const connected = useSimulationStore((s) => s.connected);
  const state = useSimulationStore((s) => s.state);
  const showGenerateDialog = useSimulationStore((s) => s.showGenerateDialog);
  const setShowGenerateDialog = useSimulationStore((s) => s.setShowGenerateDialog);
  const showNodeInfo = useSimulationStore((s) => s.showNodeInfo);
  const setSelectedNode = useSimulationStore((s) => s.setSelectedNode);
  const showPreferences = useSimulationStore((s) => s.showPreferences);
  const setShowPreferences = useSimulationStore((s) => s.setShowPreferences);
  const showNetworkInfo = useSimulationStore((s) => s.showNetworkInfo);
  const setShowNetworkInfo = useSimulationStore((s) => s.setShowNetworkInfo);
  const showGlobalSettings = useSimulationStore((s) => s.showGlobalSettings);
  const setShowGlobalSettings = useSimulationStore((s) => s.setShowGlobalSettings);

  useEffect(() => {
    init();
  }, [init]);

  if (!connected) {
    return (
      <div className="h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Sinalgo</h1>
          <p className="text-slate-400 mb-4">Connecting to backend...</p>
          <div className="w-8 h-8 border-2 border-slate-600 border-t-blue-400 rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-700 px-4 py-2 flex items-center gap-3">
        <span className="text-white font-bold text-lg">Sinalgo</span>
        {state && (
          <span className="text-slate-400 text-sm">
            {state.project} &middot; {state.async ? 'Async' : 'Sync'} mode
          </span>
        )}
        <div className="flex-1" />
        <button onClick={() => setShowPreferences(true)} className="px-2 py-1 text-xs text-slate-300 hover:bg-slate-700 rounded" title="Preferences">Prefs</button>
        <button onClick={() => setShowNetworkInfo(true)} className="px-2 py-1 text-xs text-slate-300 hover:bg-slate-700 rounded" title="Network Info">Info</button>
        <button onClick={() => setShowGlobalSettings(true)} className="px-2 py-1 text-xs text-slate-300 hover:bg-slate-700 rounded" title="Global Settings">Settings</button>
      </div>

      <ControlPanel />

      {/* Main area */}
      <div className="flex-1 relative overflow-hidden">
        <Canvas2D />

        {showNodeInfo && (
          <NodeInfoPanel onClose={() => setSelectedNode(null)} />
        )}
      </div>

      <EventQueuePanel />
      <LogPanel />

      <NodeContextMenu />
      <EdgeContextMenu />
      <SpaceContextMenu />

      <DialogOverlay />

      {showGenerateDialog && (
        <GenerateNodesDialog onClose={() => setShowGenerateDialog(false)} />
      )}
      {showPreferences && (
        <PreferencesDialog onClose={() => setShowPreferences(false)} />
      )}
      {showNetworkInfo && (
        <NetworkInfoDialog onClose={() => setShowNetworkInfo(false)} />
      )}
      {showGlobalSettings && (
        <GlobalSettingsDialog onClose={() => setShowGlobalSettings(false)} />
      )}
    </div>
  );
}

export default App;
