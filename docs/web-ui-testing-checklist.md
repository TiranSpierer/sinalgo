# Sinalgo Web UI — Feature Testing Checklist

Use this document to verify that the web UI replicates the features of the original Swing GUI.
Test side by side:

- **Original GUI:** `export JAVA_HOME="$PWD/.local-jdk" GRADLE_USER_HOME="$PWD/.gradle-home" && ./gradlew run --args="-gui -project sample1"`
- **New Web UI:** `./run.sh run` (opens http://localhost:8765)

> **Note:** The web UI currently defaults to `sample1`. To test other projects, edit `run.sh` or run:
> `./gradlew run -PwebMode --args="-project sample4"`

---

## Legend

- [ ] = Not yet tested
- [x] = Works correctly
- [!] = Works but with differences (note them)
- [N/A] = Not applicable to web UI (Swing-only feature)

---

## 1. Startup & Connection

| # | Feature | Swing | Web | Notes |
|---|---------|-------|-----|-------|
| 1.1 | [ ] Application starts without errors | `-gui -project sample1` | `./run.sh run` | |
| 1.2 | [ ] Project name shown in title/header | Window title | Header bar shows "sample1 · Sync mode" | |
| 1.3 | [ ] Sync/Async mode indicated | In control panel | Header shows mode | |

---

## 2. Node Generation

| # | Feature | Swing | Web | Notes |
|---|---------|-------|-----|-------|
| 2.1 | [ ] Open Generate Nodes dialog | Simulation > Generate Nodes (F3) | "Generate Nodes" button | |
| 2.2 | [ ] Set number of nodes | Number field | Number field | |
| 2.3 | [ ] Select node type from dropdown | Node Implementation dropdown | Node Type dropdown | |
| 2.4 | [ ] Select distribution model | Distribution Model dropdown | Distribution dropdown | |
| 2.5 | [ ] Select connectivity model | Connectivity Model dropdown | Connectivity dropdown | |
| 2.6 | [ ] Generate nodes and see them on canvas | Nodes appear in graph panel | Nodes appear on canvas | |
| 2.7 | [ ] Nodes have correct positions (within dimX/dimY) | Check visually | Check visually | |
| 2.8 | [ ] Edge connections drawn between nodes | Lines between connected nodes | Lines between connected nodes | |
| 2.9 | [ ] Node count updates in status | Control panel shows count | Status bar: "Nodes: N" | |

---

## 3. Simulation Control

| # | Feature | Swing | Web | Notes |
|---|---------|-------|-----|-------|
| 3.1 | [ ] Set number of rounds | "Rounds to do" input | Number input next to Start | |
| 3.2 | [ ] Start simulation | Start button or Enter key | "Start" button | |
| 3.3 | [ ] Round counter increments | Time display updates | "Round: N" updates | |
| 3.4 | [ ] Nodes move (if mobility enabled) | Nodes reposition each round | Nodes reposition on canvas | sample1 has mobility=true |
| 3.5 | [ ] Edges update after movement | Connections re-evaluated | Edges redraw | |
| 3.6 | [ ] Stop simulation mid-run | Abort button | "Stop" button | |
| 3.7 | [ ] Simulation stops after N rounds | Automatically stops | Automatically stops, "Running" indicator disappears | |
| 3.8 | [ ] Messages sent counter updates | "Messages sent" display | "Msgs: N" in status bar | |
| 3.9 | [ ] Can start another simulation after one finishes | Press Start again | Press Start again | |

---

## 4. Canvas Interaction

| # | Feature | Swing | Web | Notes |
|---|---------|-------|-----|-------|
| 4.1 | [ ] Pan/scroll the view | Left-click drag on empty space | Left-click drag on empty space | |
| 4.2 | [ ] Zoom in/out with mouse wheel | Mouse wheel | Mouse wheel | |
| 4.3 | [ ] Auto-fit view on first data | Zoom To Fit (F12) | Auto-fits when first nodes appear | |
| 4.4 | [ ] Click node to select it | Left-click on node | Left-click on node shows info panel | |
| 4.5 | [ ] Selected node highlighted | Highlighted in graph | Yellow ring around selected node | |
| 4.6 | [ ] Right-click node for context menu | NodePopupMenu appears | Context menu with Info, methods, Delete | |
| 4.7 | [ ] Node tooltips on hover | Multi-line tooltip with node.toString() | N/A (use click > Info instead) | Web uses click-to-inspect |

---

## 5. Node Info & Management

| # | Feature | Swing | Web | Notes |
|---|---------|-------|-----|-------|
| 5.1 | [ ] View node details (type, position, color) | NodeInfoDialog | NodeInfoPanel (right side) | |
| 5.2 | [ ] See node.toString() output | Info text in dialog | "Info" section in panel | |
| 5.3 | [ ] See connection count | NodeInfoDialog fields | "Connections: N" | |
| 5.4 | [ ] Delete a node | NodePopupMenu > Delete | Context menu > Delete, or panel Delete button | |
| 5.5 | [ ] Delete updates canvas immediately | Graph redraws | Canvas redraws after poll | |

---

## 6. Graph Management

| # | Feature | Swing | Web | Notes |
|---|---------|-------|-----|-------|
| 6.1 | [ ] Clear all nodes | Simulation > Clear Graph (F4) | "Clear" button | |
| 6.2 | [ ] Reevaluate connections | Simulation > Reevaluate (F6) | "Reevaluate" button | |
| 6.3 | [ ] Canvas is empty after clear | No nodes/edges drawn | No nodes/edges drawn | |

---

## 7. Global Methods (@GlobalMethod)

Test with sample1 which has "stopSending" and "Echo" methods:

| # | Feature | Swing | Web | Notes |
|---|---------|-------|-----|-------|
| 7.1 | [ ] Global methods appear in UI | Global menu items | Purple buttons in control panel | |
| 7.2 | [ ] Invoke "Echo" method | Global > Echo | Click "Echo" purple button | |
| 7.3 | [ ] Query dialog appears | JOptionPane input dialog | Modal with text input appears in browser | |
| 7.4 | [ ] Enter text and click OK | Dialog returns text | Dialog returns text | |
| 7.5 | [ ] Message dialog shows the response | JOptionPane message dialog | Modal with OK button shows response | |
| 7.6 | [ ] "stopSending" method works | Toggles message sending | Click button, verify behavior | |

---

## 8. Custom Buttons (@CustomButton)

| # | Feature | Swing | Web | Notes |
|---|---------|-------|-----|-------|
| 8.1 | [ ] Custom buttons appear | In Project Control section | Amber buttons in control panel | |
| 8.2 | [ ] Tooltip shows on hover | Button tooltip text | HTML title attribute on hover | |
| 8.3 | [ ] Click executes the method | Method runs | Method runs | |

---

## 9. Node Popup Methods (@NodePopupMethod)

Test with sample4 (has "Unicast Gray", "Unicast CYAN", "send DIRECT PINK"):

| # | Feature | Swing | Web | Notes |
|---|---------|-------|-----|-------|
| 9.1 | [ ] Right-click node shows popup methods | NodePopupMenu lists methods | Context menu lists methods | |
| 9.2 | [ ] "Info" shows node details | Opens NodeInfoDialog | Opens NodeInfoPanel | |
| 9.3 | [ ] Custom popup method executes | Method runs on click | Method runs on click | |
| 9.4 | [ ] Node selection mode (e.g. "Unicast Gray") | Prompt bar at top of graph, click to select target | Amber banner at top of canvas, click to select target | |
| 9.5 | [ ] Cancel node selection | Click Cancel area | Click Cancel button | |
| 9.6 | [ ] Selected node receives the action | Message sent to selected node | Message sent to selected node | |

---

## 10. Async Mode (sample4)

Run with: `./gradlew run -PwebMode --args="-project sample4"`

| # | Feature | Swing | Web | Notes |
|---|---------|-------|-----|-------|
| 10.1 | [ ] Async mode indicated | Control panel shows events | Header: "Async mode" | |
| 10.2 | [ ] Events input field | "Events to do" | Rounds input (functions as events) | |
| 10.3 | [ ] Start processes N events | Events execute | Events execute | |
| 10.4 | [ ] Time display shows event time | Continuous time | "Round: X.XXX" (event time) | |

---

## 11. 3D Mode (sample5)

Run with: `./gradlew run -PwebMode --args="-project sample5"`

| # | Feature | Swing | Web | Notes |
|---|---------|-------|-----|-------|
| 11.1 | [ ] 3D project loads | 3D graph panel | Canvas renders (2D projection) | Web currently uses 2D canvas only |
| 11.2 | [ ] Nodes visible | 3D rendered nodes | Nodes at (x,y) positions | Z-axis shown in node info |
| 11.3 | [ ] Simulation runs | Rounds execute | Rounds execute | |

> **Known limitation:** The web UI currently renders 3D projects as a 2D top-down projection (x,y only). A Three.js 3D canvas is planned but not yet implemented.

---

## 12. Message Animations & Packets

| # | Feature | Swing | Web | Notes |
|---|---------|-------|-----|-------|
| 12.1 | [ ] Packets in flight shown during simulation | Envelope animation (if enabled) | Yellow dots moving along edges | |
| 12.2 | [ ] Packet progress is visible | Animated envelope moves | Dot interpolates between sender/receiver | |

---

## 13. Performance (Large Networks)

| # | Feature | Test | Notes |
|---|---------|------|-------|
| 13.1 | [ ] Generate 1,000 nodes | Generate and verify render | |
| 13.2 | [ ] Generate 5,000 nodes | Generate and verify render is smooth | |
| 13.3 | [ ] Generate 10,000 nodes | Generate and verify render is acceptable | |
| 13.4 | [ ] Pan/zoom remains responsive at 5k+ nodes | Drag and wheel zoom | |
| 13.5 | [ ] Run simulation at 5k+ nodes | Start 10 rounds, verify completion | |

---

## Features Not Yet Migrated (Swing-Only)

These features exist in the Swing GUI but are not yet available in the web UI. They are listed here for future implementation:

| Feature | Swing Location | Priority |
|---------|---------------|----------|
| Project selector at startup (choose project from browser) | ProjectSelector.java | Medium |
| Create node by double-clicking empty space | GraphPanel mouseClicked | Low |
| Draw edge by dragging from node to node | GraphPanel mouseDragged | Medium |
| Drag node to reposition | GraphPanel right-click drag | Medium |
| Zoom rectangle (Ctrl+drag) | GraphPanel mouseDragged | Low |
| Edge info dialog | EdgeInfoDialog | Low |
| Edge right-click menu (info, delete) | EdgePopupMenu | Low |
| Network info dialog (statistics) | GraphInfoDialog | Low |
| Preferences dialog (draw arrows, draw nodes/edges toggles) | GraphPreferencesDialog | Low |
| Global settings viewer | GlobalSettingsDialog | Low |
| Export to EPS | GUI menu | Low |
| Run forever mode | RunPopupMenu | Low |
| Mini-map (zoom panel) | ZoomPanel | Low |
| Output text panel | MaximizedControlPanel | Medium |
| Event queue display (async mode) | MaximizedControlPanel | Medium |
| Navigate between nodes (prev/next) in info dialog | NodeInfoDialog | Low |
| Edit node position in info dialog | NodeInfoDialog | Low |
| Full screen toggle (F11) | GUI | Low |
| 3D rendering with Three.js | Transformation3D | Medium |
| Node highlighting on hover | GraphPanel mouseMoved | Low |
