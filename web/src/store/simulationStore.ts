import { create } from 'zustand';
import type { SimState, ConfigData, MethodInfo, NodeInfo } from '../api/client';
import { api } from '../api/client';
import { subscribeToState, subscribeToDialogs, subscribeToLogs } from '../api/websocket';
import type { DialogRequest } from '../api/websocket';

interface DialogState {
  type: 'message' | 'query' | 'confirm';
  token: string;
  text: string;
}

interface NodeSelectionState {
  token: string;
  text: string;
}

interface SimulationStore {
  // Connection
  connected: boolean;

  // State
  state: SimState | null;
  config: ConfigData | null;
  globalMethods: MethodInfo[];
  customButtons: MethodInfo[];

  // UI state
  selectedNodeId: number | null;
  selectedNodeInfo: NodeInfo | null;
  showGenerateDialog: boolean;
  showNodeInfo: boolean;
  showPreferences: boolean;
  showNetworkInfo: boolean;
  showGlobalSettings: boolean;
  contextMenu: { x: number; y: number; nodeId: number } | null;
  edgeContextMenu: { x: number; y: number; from: number; to: number } | null;
  spaceContextMenu: { x: number; y: number; wx: number; wy: number } | null;
  nodePopupMethods: MethodInfo[];

  // Dialog state
  dialog: DialogState | null;
  nodeSelection: NodeSelectionState | null;

  // Log state
  logLines: string[];

  // Actions
  init: () => Promise<void>;
  pollState: () => Promise<void>;
  setSelectedNode: (id: number | null) => void;
  setShowGenerateDialog: (show: boolean) => void;
  setShowPreferences: (show: boolean) => void;
  setShowNetworkInfo: (show: boolean) => void;
  setShowGlobalSettings: (show: boolean) => void;
  setContextMenu: (menu: { x: number; y: number; nodeId: number } | null) => void;
  setEdgeContextMenu: (menu: { x: number; y: number; from: number; to: number } | null) => void;
  setSpaceContextMenu: (menu: { x: number; y: number; wx: number; wy: number } | null) => void;
  dismissDialog: (value?: string) => void;
  selectNodeForRequest: (nodeId: number) => void;
  cancelNodeSelection: () => void;
  clearLog: () => void;
}

export const useSimulationStore = create<SimulationStore>((set, get) => ({
  connected: false,
  state: null,
  config: null,
  globalMethods: [],
  customButtons: [],
  selectedNodeId: null,
  selectedNodeInfo: null,
  showGenerateDialog: false,
  showNodeInfo: false,
  showPreferences: false,
  showNetworkInfo: false,
  showGlobalSettings: false,
  contextMenu: null,
  edgeContextMenu: null,
  spaceContextMenu: null,
  nodePopupMethods: [],
  dialog: null,
  nodeSelection: null,
  logLines: [],

  init: async () => {
    try {
      await api.health();
      const [config, globalMethods, customButtons] = await Promise.all([
        api.config(),
        api.globalMethods(),
        api.customButtons(),
      ]);
      set({ connected: true, config, globalMethods, customButtons });

      // Subscribe to WebSocket state updates
      subscribeToState((state) => {
        set({ state });
      });

      // Subscribe to dialog requests from backend
      subscribeToDialogs((request: DialogRequest) => {
        if (request.type === 'message_dialog') {
          set({ dialog: { type: 'message', token: request.token, text: request.text } });
        } else if (request.type === 'query_dialog') {
          set({ dialog: { type: 'query', token: request.token, text: request.text } });
        } else if (request.type === 'confirm_dialog') {
          set({ dialog: { type: 'confirm', token: request.token, text: request.text } });
        } else if (request.type === 'select_node_request') {
          set({ nodeSelection: { token: request.token, text: request.text } });
        }
      });

      // Subscribe to log messages
      subscribeToLogs((text: string) => {
        set((s) => ({ logLines: [...s.logLines, text].slice(-500) }));
      });

      // Also do an initial fetch
      const state = await api.state();
      set({ state });
    } catch {
      set({ connected: false });
      setTimeout(() => get().init(), 2000);
    }
  },

  pollState: async () => {
    try {
      const state = await api.state();
      set({ state });
    } catch {
      // ignore
    }
  },

  setSelectedNode: async (id) => {
    set({ selectedNodeId: id, selectedNodeInfo: null, showNodeInfo: id !== null });
    if (id !== null) {
      try {
        const info = await api.node(id);
        set({ selectedNodeInfo: info });
      } catch {
        // ignore
      }
    }
  },

  setShowGenerateDialog: (show) => set({ showGenerateDialog: show }),

  setShowPreferences: (show) => set({ showPreferences: show }),

  setShowNetworkInfo: (show) => set({ showNetworkInfo: show }),

  setShowGlobalSettings: (show) => set({ showGlobalSettings: show }),

  setContextMenu: async (menu) => {
    set({ contextMenu: menu, nodePopupMethods: [] });
    if (menu) {
      try {
        const methods = await api.nodePopupMethods(menu.nodeId);
        set({ nodePopupMethods: methods });
      } catch {
        // ignore
      }
    }
  },

  setEdgeContextMenu: (menu) => set({ edgeContextMenu: menu }),

  setSpaceContextMenu: (menu) => set({ spaceContextMenu: menu }),

  dismissDialog: (value) => {
    const dialog = get().dialog;
    if (dialog) {
      api.dialogResponse(dialog.token, value).catch(() => {});
      set({ dialog: null });
    }
  },

  selectNodeForRequest: (nodeId) => {
    const sel = get().nodeSelection;
    if (sel) {
      api.selectNode(sel.token, nodeId).catch(() => {});
      set({ nodeSelection: null });
    }
  },

  cancelNodeSelection: () => {
    const sel = get().nodeSelection;
    if (sel) {
      api.selectNode(sel.token, -1).catch(() => {});
      set({ nodeSelection: null });
    }
  },

  clearLog: () => set({ logLines: [] }),
}));
