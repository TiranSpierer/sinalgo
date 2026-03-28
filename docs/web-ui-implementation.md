# Sinalgo Web UI — Implementation Audit

This document describes every change made to replace the Swing GUI with a browser-based React frontend. Use this as a reference for future development sessions.

## Architecture Overview

```
+------------------------+         +----------------------------+
|   Java Backend         |  REST   |   React Frontend           |
|                        |<------->|                            |
|  Simulation Engine     |  WS     |  Canvas2D (HTML5)          |
|  (unchanged)           |<------->|  Controls, Dialogs         |
|                        |         |                            |
|  + WebRuntime (new)    |         |  Vite + Tailwind + TS      |
|  + Javalin HTTP/WS     |         |  Zustand state management  |
+------------------------+         +----------------------------+
```

- **WebRuntime** — new `SinalgoRuntime` subclass, embeds Javalin HTTP+WebSocket server on port 8765
- **REST API** — commands (start, stop, generate nodes, invoke methods, etc.)
- **WebSocket** — real-time state streaming + dialog/selection requests from backend to browser
- **React frontend** — built by Vite, served as static files from Java classpath

## Files Created

### Java (Backend)

| File | Purpose |
|---|---|
| `src/main/java/sinalgo/runtime/WebRuntime.java` | New `SinalgoRuntime` subclass. Starts Javalin on port 8765, registers all REST/WS endpoints, manages WebSocket client set, pushes simulation state. |
| `src/main/java/sinalgo/web/SimulationStateSerializer.java` | Serializes simulation state to JSON: nodes (id, x, y, z, color, type), edges (from, to, color), packets in flight (from, to, sendTime, arriveTime), events (async mode). Also `buildNodeInfo()` for detailed single-node data. |
| `src/main/java/sinalgo/web/AnnotationScanner.java` | Reflection-based scanner for `@GlobalMethod`, `@CustomButton`, `@NodePopupMethod` annotations. Returns method metadata as JSON-serializable lists. Supports invoking methods by index. |
| `src/main/java/sinalgo/web/WebDialogManager.java` | Manages interactive dialogs via WebSocket. Handles `showMessage` (blocking), `showQuery` (blocking, returns user input), `requestNodeSelection` (async with callback). Uses `CountDownLatch` for blocking and `ConcurrentHashMap` for pending responses. |

### React Frontend (`web/`)

| File | Purpose |
|---|---|
| `web/src/api/client.ts` | Typed REST client. Interfaces: `NodeData`, `EdgeData`, `PacketData`, `SimState`, `ConfigData`, `MethodInfo`, `NodeInfo`. All API methods as typed functions. |
| `web/src/api/websocket.ts` | WebSocket manager with auto-reconnect. Dispatches messages to state handler (simulation updates) or dialog handler (dialog/selection requests from backend). |
| `web/src/store/simulationStore.ts` | Zustand store. Holds: connection state, simulation state, config, global/custom methods, selected node, dialog state, node selection mode. Actions: init, pollState, setSelectedNode, dismissDialog, selectNodeForRequest, cancelNodeSelection. |
| `web/src/components/Canvas2D.tsx` | HTML5 Canvas renderer. Pan (drag), zoom (wheel), auto-fit on first data. Viewport culling for performance. `requestAnimationFrame` loop with dirty flag. Node selection mode overlay (amber banner). |
| `web/src/components/ControlPanel.tsx` | Toolbar: rounds input, Start/Stop, Generate Nodes, Reevaluate, Clear. Dynamic `@GlobalMethod` buttons (purple), `@CustomButton` buttons (amber). Status bar with round/node/edge/message counts. |
| `web/src/components/GenerateNodesDialog.tsx` | Modal: node count, node type dropdown, distribution dropdown, connectivity dropdown. Populated from `/api/implementations/{type}`. |
| `web/src/components/NodeInfoPanel.tsx` | Side panel showing selected node details: type, position, color, connections, toString output, delete button. |
| `web/src/components/NodeContextMenu.tsx` | Right-click context menu: Info, `@NodePopupMethod` entries, Delete. |
| `web/src/components/DialogOverlay.tsx` | Modal for backend-initiated dialogs: message (OK button) and query (text input + OK/Cancel). |
| `web/src/App.tsx` | Root component. Loading spinner while connecting, then header + ControlPanel + Canvas2D + overlays. |

### Config / Build

| File | Purpose |
|---|---|
| `web/package.json` | React 19, Vite 8, Zustand 5, Tailwind CSS 4, TypeScript |
| `web/vite.config.ts` | React plugin, Tailwind plugin, dev proxy for `/api` and `/ws` to localhost:8765 |
| `web/tsconfig.json` | TypeScript config |
| `web/index.html` | Vite entry point |

## Files Modified

### Java

| File | Change |
|---|---|
| `build.gradle` | Added Javalin 4.6.8, Jackson 2.13.3, slf4j-simple 1.7.36 dependencies. Added `buildFrontend` (Exec), `copyFrontend` (Copy) tasks. `processResources.dependsOn copyFrontend`. Added `-PwebMode` JVM property support in `run` block. |
| `src/main/java/sinalgo/Run.java` | Added web mode detection via `sinalgo.webMode` system property. Passes `-web` to child Main process. Filters duplicate `-project` and `-web` from args. Throws fatal error if web mode has no project. |
| `src/main/java/sinalgo/runtime/Main.java` | Added `guiBatch == 3` dispatch for web mode: sets `Global.setWebMode(true)`, creates `WebRuntime`. Also checks `sinalgo.webMode` system property as fallback. |
| `src/main/java/sinalgo/runtime/Global.java` | Added `@Getter @Setter private static boolean isWebMode` field. |
| `src/main/java/sinalgo/runtime/SinalgoRuntime.java` | Added `-web` to known CLI modifiers whitelist. |
| `src/main/java/sinalgo/runtime/SynchronousRuntimeThread.java` | Added web mode abort check (`WebRuntime.isAbortRequested()`). Added periodic `WebRuntime.pushStateIfActive()` during simulation loop (respects refreshRate). Added final state push when simulation ends. Guarded `System.exit()` paths with `Global.isWebMode()`. |
| `src/main/java/sinalgo/runtime/AsynchronousRuntimeThread.java` | Same changes as SynchronousRuntimeThread: abort check, periodic state push, end-of-simulation push, guarded exit paths. |
| `src/main/java/sinalgo/tools/Tools.java` | Added `-web` to `parseGuiBatch()` returning `guiBatch=3`. Updated `showMessageDialog()`, `showQueryDialog()`, `getNodeSelectedByUser()` to use `WebDialogManager` in web mode. |
| `run.sh` | `./run.sh run` starts with `-PwebMode --args="-project sample1"`, polls health endpoint, opens browser. Other commands pass through to Gradle. |
| `.gitignore` | Added `web/node_modules/`, `web/dist/`, `src/main/resources/web/`. |

## REST API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Readiness check `{"status":"ok"}` |
| GET | `/api/projects` | List available project names |
| GET | `/api/state` | Full simulation snapshot (nodes, edges, packets, events) |
| GET | `/api/config` | Configuration fields (dimensions, models, flags) |
| POST | `/api/start` | Start simulation `{"rounds": N}` |
| POST | `/api/stop` | Stop running simulation |
| POST | `/api/clear` | Remove all nodes |
| POST | `/api/generate-nodes` | Create N nodes `{"count", "nodeType", "distribution", "connectivity"}` |
| POST | `/api/reevaluate` | Reevaluate all connections |
| GET | `/api/node/{id}` | Detailed node info |
| DELETE | `/api/node/{id}` | Remove a node |
| GET | `/api/global-methods` | List `@GlobalMethod` entries |
| POST | `/api/global-method/{id}` | Invoke a global method by index |
| GET | `/api/custom-buttons` | List `@CustomButton` entries |
| GET | `/api/node/{id}/popup-methods` | List `@NodePopupMethod` for a node |
| POST | `/api/node/{id}/popup-method/{mid}` | Invoke a node popup method |
| GET | `/api/implementations/{type}` | List model implementations (NODES_IMPLEMENTATIONS, MODELS_DISTRIBUTION, etc.) |
| POST | `/api/dialog-response` | Frontend responds to a dialog `{"token", "value"}` |
| POST | `/api/select-node` | Frontend responds to node selection `{"token", "nodeId"}` |

## WebSocket Protocol

**Endpoint:** `ws://localhost:8765/ws`

**Server -> Client messages:**

1. **Simulation state** (no `type` field, has `nodes`, `time`, etc.) — sent on connect and periodically during simulation
2. `{"type": "message_dialog", "token": "...", "text": "..."}` — show message modal
3. `{"type": "query_dialog", "token": "...", "text": "..."}` — show input modal
4. `{"type": "select_node_request", "token": "...", "text": "..."}` — enter node selection mode

## How It All Connects

### Startup Flow
1. `./run.sh run` calls `./gradlew run -PwebMode --args="-project sample1"`
2. Gradle's `run` block adds `-Dsinalgo.webMode=true` JVM arg
3. `sinalgo.Run.main()` receives `-project sample1`, detects web mode via system property
4. `Run` spawns child process: `java ... sinalgo.runtime.Main -project sample1 -web`
5. `Main.go()` parses `-web` → `guiBatch=3` → creates `WebRuntime`
6. `WebRuntime.initConcreteRuntime()` starts Javalin on port 8765
7. `run.sh` polls `/api/health`, opens browser when ready

### Simulation State Push
- `SynchronousRuntimeThread` / `AsynchronousRuntimeThread` call `WebRuntime.pushStateIfActive()` at each refresh interval
- This serializes all nodes/edges/packets via `SimulationStateSerializer.buildFullState()` and broadcasts to all WebSocket clients
- Frontend receives the JSON and updates the Zustand store, which triggers a Canvas2D redraw

### Dialog Flow (e.g. "Echo" global method)
1. Project code calls `Tools.showQueryDialog("Enter text:")`
2. In web mode, `WebDialogManager.showQuery()` sends a WebSocket message and blocks the calling thread
3. Frontend shows a modal with text input
4. User types text, clicks OK → frontend POSTs to `/api/dialog-response`
5. `WebDialogManager.handleDialogResponse()` unblocks the calling thread, returns the value

### Node Selection Flow (e.g. "Unicast Gray" popup method)
1. Project code calls `Tools.getNodeSelectedByUser(handler, "Select target node")`
2. In web mode, `WebDialogManager.requestNodeSelection()` sends a WebSocket message (non-blocking)
3. Frontend shows amber banner on canvas: "Select target node [Cancel]"
4. User clicks a node → frontend POSTs to `/api/select-node`
5. `WebDialogManager.handleNodeSelection()` calls `handler.handleNodeSelectedEvent(node)`

## What Was NOT Changed

- All simulation engine code (`nodes/`, `models/`, `runtime/` core, `events/`)
- All project code (`projects/sample1` through `sample6`)
- Configuration system (`configuration/`, XML parsing)
- Batch mode (`BatchRuntime`)
- GUI mode (`GUIRuntime`, all Swing files in `gui/`) — untouched, still works with `-gui`
- Tools utility methods (except the 3 dialog/selection methods)
- Logging, IO, statistics

## Running

```bash
# Web UI (default)
./run.sh run

# Original Swing GUI
export JAVA_HOME="$PWD/.local-jdk" GRADLE_USER_HOME="$PWD/.gradle-home"
./gradlew run --args="-gui -project sample1"

# Batch mode (unchanged)
./gradlew run --args="-batch -project sample1 -rounds 100"

# Frontend dev server (hot reload)
# Terminal 1: start backend
./gradlew run -PwebMode --args="-project sample1"
# Terminal 2: start Vite dev server
cd web && npm run dev
# Open http://localhost:5173
```
