import type { SimState } from './client';

type StateHandler = (state: SimState) => void;
type LogHandler = (text: string) => void;

export type DialogRequest =
  | { type: 'message_dialog'; token: string; text: string }
  | { type: 'query_dialog'; token: string; text: string }
  | { type: 'confirm_dialog'; token: string; text: string }
  | { type: 'select_node_request'; token: string; text: string };

type DialogHandler = (request: DialogRequest) => void;

let ws: WebSocket | null = null;
let stateHandler: StateHandler | null = null;
let dialogHandler: DialogHandler | null = null;
let logHandler: LogHandler | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

function getWsUrl(): string {
  const loc = window.location;
  const proto = loc.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${loc.host}/ws`;
}

function connect() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  ws = new WebSocket(getWsUrl());

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      // Dialog/selection requests have a "type" field
      if (data.type === 'message_dialog' || data.type === 'query_dialog' || data.type === 'confirm_dialog' || data.type === 'select_node_request') {
        dialogHandler?.(data as DialogRequest);
      } else if (data.type === 'log_append') {
        logHandler?.(data.text);
      } else {
        // Simulation state update (has "nodes", "time", etc.)
        stateHandler?.(data as SimState);
      }
    } catch {
      // ignore parse errors
    }
  };

  ws.onclose = () => {
    reconnectTimer = setTimeout(connect, 2000);
  };

  ws.onerror = () => {
    ws?.close();
  };
}

export function subscribeToState(onState: StateHandler) {
  stateHandler = onState;
  connect();
}

export function subscribeToDialogs(onDialog: DialogHandler) {
  dialogHandler = onDialog;
}

export function subscribeToLogs(onLog: LogHandler) {
  logHandler = onLog;
}

export function unsubscribeFromState() {
  stateHandler = null;
  dialogHandler = null;
  logHandler = null;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  ws?.close();
  ws = null;
}
