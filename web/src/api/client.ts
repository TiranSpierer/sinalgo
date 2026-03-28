const BASE = import.meta.env.DEV ? '' : '';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path}: ${res.status}`);
  return res.json();
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`POST ${path}: ${res.status}`);
  return res.json();
}

async function del<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`DELETE ${path}: ${res.status}`);
  return res.json();
}

export interface NodeData {
  id: number;
  x: number;
  y: number;
  z: number;
  color: string;
  type: string;
}

export interface EdgeData {
  from: number;
  to: number;
  color: string;
}

export interface PacketData {
  from: number;
  to: number;
  sendTime: number;
  arriveTime: number;
  type: string;
}

export interface SimState {
  time: number;
  running: boolean;
  async: boolean;
  project: string;
  messagesThisRound: number;
  messagesTotal: number;
  nodes: NodeData[];
  edges: EdgeData[];
  packets: PacketData[];
  events?: EventData[];
}

export interface EventData {
  time: number;
  kind: string;
  from?: number;
  to?: number;
  node?: number;
}

export interface ConfigData {
  dimX: number;
  dimY: number;
  dimZ: number;
  dimensions: number;
  async: boolean;
  mobility: boolean;
  interference: boolean;
  refreshRate: number;
  edgeType: string;
  defaultNodeImpl: string;
  defaultConnectivity: string;
  defaultDistribution: string;
  defaultMobility: string;
  defaultReliability: string;
  defaultInterference: string;
  defaultMsgTransmission: string;
  drawArrows: boolean;
  drawEdges: boolean;
  drawNodes: boolean;
  showMessageAnimations: boolean;
  nodeDefaultSize: number;
}

export interface MethodInfo {
  id: number;
  name: string;
  menuText: string;
  subMenu?: string;
  order?: number;
  buttonText?: string;
  toolTipText?: string;
}

export interface NodeInfo {
  id: number;
  x: number;
  y: number;
  z: number;
  color: string;
  type: string;
  connections: number;
  toString: string;
  connectivityModel?: string;
  mobilityModel?: string;
  interferenceModel?: string;
  reliabilityModel?: string;
}

export interface EdgeInfo {
  from: number;
  to: number;
  type: string;
  color: string;
  toString: string;
}

export const api = {
  health: () => get<{ status: string }>('/api/health'),
  projects: () => get<string[]>('/api/projects'),
  config: () => get<ConfigData>('/api/config'),
  state: () => get<SimState>('/api/state'),
  start: (rounds: number) => post<{ started: boolean }>('/api/start', { rounds }),
  stop: () => post<{ stopped: boolean }>('/api/stop'),
  clear: () => post<{ cleared: boolean }>('/api/clear'),
  generateNodes: (opts: {
    count: number;
    nodeType?: string;
    distribution?: string;
    connectivity?: string;
    mobility?: string;
    reliability?: string;
    interference?: string;
  }) => post<{ generated: number }>('/api/generate-nodes', opts),
  reevaluate: () => post<{ reevaluated: boolean }>('/api/reevaluate'),
  node: (id: number) => get<NodeInfo>(`/api/node/${id}`),
  deleteNode: (id: number) => del<{ removed: number }>(`/api/node/${id}`),
  moveNode: (id: number, x: number, y: number, z: number) =>
    post<{ moved: boolean }>(`/api/node/${id}/move`, { x, y, z }),
  addNode: (x: number, y: number, z: number, type?: string) =>
    post<{ id: number }>('/api/add-node', { x, y, z, type }),
  addEdge: (from: number, to: number) =>
    post<{ added: boolean }>('/api/add-edge', { from, to }),
  edgeInfo: (from: number, to: number) =>
    get<EdgeInfo>(`/api/edge/${from}/${to}`),
  deleteEdge: (from: number, to: number) =>
    del<{ removed: boolean }>(`/api/edge/${from}/${to}`),
  globalMethods: () => get<MethodInfo[]>('/api/global-methods'),
  customButtons: () => get<MethodInfo[]>('/api/custom-buttons'),
  invokeGlobalMethod: (id: number) => post<{ invoked: number }>(`/api/global-method/${id}`),
  nodePopupMethods: (nodeId: number) => get<MethodInfo[]>(`/api/node/${nodeId}/popup-methods`),
  invokeNodePopupMethod: (nodeId: number, methodId: number) =>
    post<{ invoked: number }>(`/api/node/${nodeId}/popup-method/${methodId}`),
  implementations: (type: string) => get<string[]>(`/api/implementations/${type}`),
  dialogResponse: (token: string, value?: string) =>
    post<{ ok: boolean }>('/api/dialog-response', { token, value }),
  selectNode: (token: string, nodeId: number) =>
    post<{ ok: boolean }>('/api/select-node', { token, nodeId }),
  setRefreshRate: (rate: number) =>
    post<{ refreshRate: number }>('/api/set-refresh-rate', { rate }),
  preferences: () => get<{ drawArrows: boolean; drawEdges: boolean; drawNodes: boolean; showMessageAnimations: boolean }>('/api/preferences'),
  setPreferences: (prefs: { drawArrows?: boolean; drawEdges?: boolean; drawNodes?: boolean; showMessageAnimations?: boolean }) =>
    post<{ drawArrows: boolean; drawEdges: boolean; drawNodes: boolean; showMessageAnimations: boolean }>('/api/preferences', prefs),
  settings: () => get<{ settings: string }>('/api/settings'),
};
