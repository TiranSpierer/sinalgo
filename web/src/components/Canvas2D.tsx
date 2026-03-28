import { useRef, useEffect, useCallback, useState } from 'react';
import { useSimulationStore } from '../store/simulationStore';
import { api } from '../api/client';
import type { NodeData, EdgeData } from '../api/client';
import MiniMap from './MiniMap';

export default function Canvas2D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const state = useSimulationStore((s) => s.state);
  const config = useSimulationStore((s) => s.config);
  const setSelectedNode = useSimulationStore((s) => s.setSelectedNode);
  const setContextMenu = useSimulationStore((s) => s.setContextMenu);
  const nodeSelection = useSimulationStore((s) => s.nodeSelection);
  const selectNodeForRequest = useSimulationStore((s) => s.selectNodeForRequest);
  const cancelNodeSelection = useSimulationStore((s) => s.cancelNodeSelection);
  const pollState = useSimulationStore((s) => s.pollState);

  // Pan/zoom state
  const viewRef = useRef({ offsetX: 0, offsetY: 0, scale: 1 });
  const dragRef = useRef<{ startX: number; startY: number; startOffsetX: number; startOffsetY: number } | null>(null);
  const nodeDragRef = useRef<{ nodeId: number; startWx: number; startWy: number } | null>(null);
  const edgeDrawRef = useRef<{ fromId: number; fromSx: number; fromSy: number; toSx: number; toSy: number } | null>(null);
  const needsRedraw = useRef(true);

  // Tooltip state
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  const toScreen = useCallback((x: number, y: number) => {
    const v = viewRef.current;
    return { sx: x * v.scale + v.offsetX, sy: y * v.scale + v.offsetY };
  }, []);

  const toWorld = useCallback((sx: number, sy: number) => {
    const v = viewRef.current;
    return { x: (sx - v.offsetX) / v.scale, y: (sy - v.offsetY) / v.scale };
  }, []);

  // Zoom to fit
  const zoomToFit = useCallback(() => {
    const currentConfig = useSimulationStore.getState().config;
    const canvas = canvasRef.current;
    if (!currentConfig || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const padding = 40;
    const scaleX = (rect.width - 2 * padding) / currentConfig.dimX;
    const scaleY = (rect.height - 2 * padding) / currentConfig.dimY;
    const scale = Math.min(scaleX, scaleY);
    viewRef.current = { scale, offsetX: padding, offsetY: padding };
    needsRedraw.current = true;
  }, []);

  // Auto-fit on first data
  const hasAutoFit = useRef(false);
  useEffect(() => {
    if (!state || !config || !canvasRef.current || hasAutoFit.current) return;
    if (state.nodes.length === 0) return;
    zoomToFit();
    hasAutoFit.current = true;
  }, [state, config, zoomToFit]);

  // Mark for redraw when state changes
  useEffect(() => { needsRedraw.current = true; }, [state]);

  // Animation loop
  useEffect(() => {
    let animId: number;
    const render = () => {
      animId = requestAnimationFrame(render);
      // Always redraw if edge drawing is in progress (for the preview line)
      if (!needsRedraw.current && !edgeDrawRef.current) return;
      needsRedraw.current = false;

      const canvas = canvasRef.current;
      const currentState = useSimulationStore.getState().state;
      const currentConfig = useSimulationStore.getState().config;
      if (!canvas || !currentState) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);

      // Background — light gray outside simulation area
      ctx.fillStyle = '#e5e7eb';
      ctx.fillRect(0, 0, rect.width, rect.height);

      // Viewport bounds in world coords (for culling)
      const vtl = toWorld(0, 0);
      const vbr = toWorld(rect.width, rect.height);
      const viewMinX = Math.min(vtl.x, vbr.x);
      const viewMaxX = Math.max(vtl.x, vbr.x);
      const viewMinY = Math.min(vtl.y, vbr.y);
      const viewMaxY = Math.max(vtl.y, vbr.y);
      const margin = 50 / viewRef.current.scale;

      // Simulation area — white fill with black border
      if (currentConfig) {
        const tl = toScreen(0, 0);
        const br = toScreen(currentConfig.dimX, currentConfig.dimY);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(tl.sx, tl.sy, br.sx - tl.sx, br.sy - tl.sy);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(tl.sx, tl.sy, br.sx - tl.sx, br.sy - tl.sy);
      }

      const nodeMap = new Map<number, NodeData>();
      for (const n of currentState.nodes) nodeMap.set(n.id, n);

      const scale = viewRef.current.scale;
      const shouldDrawEdges = currentConfig?.drawEdges !== false;
      const shouldDrawNodes = currentConfig?.drawNodes !== false;
      const drawArrows = currentConfig?.drawArrows === true;
      const showEnvelopes = currentConfig?.showMessageAnimations === true;

      // Draw edges
      if (shouldDrawEdges) {
        ctx.lineWidth = Math.max(0.5, scale / 2);
        for (const e of currentState.edges) {
          const from = nodeMap.get(e.from);
          const to = nodeMap.get(e.to);
          if (!from || !to) continue;
          if ((from.x < viewMinX - margin && to.x < viewMinX - margin) ||
              (from.x > viewMaxX + margin && to.x > viewMaxX + margin) ||
              (from.y < viewMinY - margin && to.y < viewMinY - margin) ||
              (from.y > viewMaxY + margin && to.y > viewMaxY + margin)) continue;
          const s1 = toScreen(from.x, from.y);
          const s2 = toScreen(to.x, to.y);
          ctx.strokeStyle = e.color;
          ctx.beginPath();
          ctx.moveTo(s1.sx, s1.sy);
          ctx.lineTo(s2.sx, s2.sy);
          ctx.stroke();

          if (drawArrows) {
            const len = Math.hypot(s2.sx - s1.sx, s2.sy - s1.sy);
            if (len < 1) continue;
            let al = 8 * scale;
            const aw = 2 * scale;
            if (2 * al >= len) al = len / 3;
            const ux = (s1.sx - s2.sx) / len;
            const uy = (s1.sy - s2.sy) / len;
            const ix = s2.sx + al * ux;
            const iy = s2.sy + al * uy;
            ctx.fillStyle = e.color;
            ctx.beginPath();
            ctx.moveTo(s2.sx, s2.sy);
            ctx.lineTo(ix + aw * uy, iy - aw * ux);
            ctx.lineTo(ix - aw * uy, iy + aw * ux);
            ctx.closePath();
            ctx.fill();
          }
        }
      }

      // Draw packets in flight
      if (currentState.packets.length > 0 && currentState.time > 0) {
        for (const pkt of currentState.packets) {
          const from = nodeMap.get(pkt.from);
          const to = nodeMap.get(pkt.to);
          if (!from || !to) continue;
          const progress = Math.min(1, Math.max(0,
            (currentState.time - pkt.sendTime) / (pkt.arriveTime - pkt.sendTime)));
          const px = from.x + (to.x - from.x) * progress;
          const py = from.y + (to.y - from.y) * progress;
          if (px < viewMinX - margin || px > viewMaxX + margin ||
              py < viewMinY - margin || py > viewMaxY + margin) continue;
          const s = toScreen(px, py);

          if (showEnvelopes) {
            const envW = 30 * scale, envH = 20 * scale;
            const ex = s.sx - envW / 2, ey = s.sy - envH / 2;
            ctx.fillStyle = '#fbbf24';
            ctx.fillRect(ex, ey, envW, envH);
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            ctx.strokeRect(ex, ey, envW, envH);
            ctx.beginPath();
            ctx.moveTo(ex, ey);
            ctx.lineTo(ex + envW / 2, ey + envH / 2);
            ctx.lineTo(ex + envW, ey);
            ctx.stroke();
          } else {
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(s.sx, s.sy, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Draw nodes
      if (shouldDrawNodes) {
        const selectedId = useSimulationStore.getState().selectedNodeId;
        const baseSize = currentConfig?.nodeDefaultSize ?? 2;
        const nodeSize = Math.max(3, baseSize * scale);
        const half = nodeSize / 2;

        for (const n of currentState.nodes) {
          if (n.x < viewMinX - margin || n.x > viewMaxX + margin ||
              n.y < viewMinY - margin || n.y > viewMaxY + margin) continue;
          const s = toScreen(n.x, n.y);

          if (n.id === selectedId) {
            ctx.fillStyle = n.color === '#ff0000' ? '#000000' : '#ff0000';
            ctx.fillRect(s.sx - half - 2, s.sy - half - 2, nodeSize + 4, nodeSize + 4);
          }

          ctx.fillStyle = n.color;
          ctx.fillRect(s.sx - half, s.sy - half, nodeSize, nodeSize);
        }
      }

      // Draw edge preview line during edge drawing
      if (edgeDrawRef.current) {
        const ed = edgeDrawRef.current;
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ed.fromSx, ed.fromSy);
        ctx.lineTo(ed.toSx, ed.toSy);
        ctx.stroke();
      }
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [toScreen, toWorld]);

  // Hit-testing helpers
  const findNodeAt = useCallback((sx: number, sy: number): NodeData | null => {
    const currentState = useSimulationStore.getState().state;
    if (!currentState) return null;
    const { x: wx, y: wy } = toWorld(sx, sy);
    const threshold = 15 / viewRef.current.scale;
    let closest: NodeData | null = null;
    let closestDist = Infinity;
    for (const n of currentState.nodes) {
      const dist = Math.hypot(n.x - wx, n.y - wy);
      if (dist < threshold && dist < closestDist) {
        closest = n;
        closestDist = dist;
      }
    }
    return closest;
  }, [toWorld]);

  const findEdgeAt = useCallback((sx: number, sy: number): EdgeData | null => {
    const currentState = useSimulationStore.getState().state;
    if (!currentState) return null;
    const nodeMap = new Map<number, NodeData>();
    for (const n of currentState.nodes) nodeMap.set(n.id, n);
    const threshold = 5; // screen pixels
    let closestEdge: EdgeData | null = null;
    let closestDist = Infinity;
    for (const e of currentState.edges) {
      const from = nodeMap.get(e.from);
      const to = nodeMap.get(e.to);
      if (!from || !to) continue;
      const s1 = toScreen(from.x, from.y);
      const s2 = toScreen(to.x, to.y);
      // Point-to-segment distance
      const dx = s2.sx - s1.sx, dy = s2.sy - s1.sy;
      const lenSq = dx * dx + dy * dy;
      if (lenSq === 0) continue;
      let t = ((sx - s1.sx) * dx + (sy - s1.sy) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));
      const px = s1.sx + t * dx, py = s1.sy + t * dy;
      const dist = Math.hypot(sx - px, sy - py);
      if (dist < threshold && dist < closestDist) {
        closestEdge = e;
        closestDist = dist;
      }
    }
    return closestEdge;
  }, [toScreen]);

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setTooltip(null);
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const node = findNodeAt(sx, sy);

    if (e.button === 0) { // Left click
      if (nodeSelection) {
        if (node) selectNodeForRequest(node.id);
        return;
      }
      if (node) {
        // Left-click on node: start edge drawing
        const s = toScreen(node.x, node.y);
        edgeDrawRef.current = { fromId: node.id, fromSx: s.sx, fromSy: s.sy, toSx: s.sx, toSy: s.sy };
        setSelectedNode(node.id);
      } else {
        setSelectedNode(null);
        dragRef.current = {
          startX: e.clientX, startY: e.clientY,
          startOffsetX: viewRef.current.offsetX, startOffsetY: viewRef.current.offsetY,
        };
      }
    } else if (e.button === 2) { // Right click (for node drag — context menu handled separately)
      if (node) {
        nodeDragRef.current = { nodeId: node.id, startWx: node.x, startWy: node.y };
      }
    }
  }, [findNodeAt, setSelectedNode, nodeSelection, selectNodeForRequest, toScreen]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    if (dragRef.current) {
      viewRef.current.offsetX = dragRef.current.startOffsetX + (e.clientX - dragRef.current.startX);
      viewRef.current.offsetY = dragRef.current.startOffsetY + (e.clientY - dragRef.current.startY);
      needsRedraw.current = true;
    } else if (edgeDrawRef.current) {
      edgeDrawRef.current.toSx = sx;
      edgeDrawRef.current.toSy = sy;
      needsRedraw.current = true;
    } else if (nodeDragRef.current) {
      const { x: wx, y: wy } = toWorld(sx, sy);
      nodeDragRef.current.startWx = wx;
      nodeDragRef.current.startWy = wy;
      needsRedraw.current = true;
    } else {
      // Hover tooltip
      const node = findNodeAt(sx, sy);
      if (node) {
        setTooltip({ x: e.clientX + 12, y: e.clientY + 12, text: `Node ${node.id}` });
      } else {
        setTooltip(null);
      }
    }
  }, [toWorld, findNodeAt]);

  const handleMouseUp = useCallback(async (e: React.MouseEvent) => {
    if (edgeDrawRef.current && e.button === 0) {
      const rect = canvasRef.current!.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const targetNode = findNodeAt(sx, sy);
      if (targetNode && targetNode.id !== edgeDrawRef.current.fromId) {
        try {
          await api.addEdge(edgeDrawRef.current.fromId, targetNode.id);
          pollState();
        } catch { /* ignore */ }
      }
      edgeDrawRef.current = null;
      needsRedraw.current = true;
    }
    if (nodeDragRef.current && e.button === 2) {
      const nd = nodeDragRef.current;
      try {
        await api.moveNode(nd.nodeId, nd.startWx, nd.startWy, 0);
        pollState();
      } catch { /* ignore */ }
      nodeDragRef.current = null;
    }
    dragRef.current = null;
  }, [findNodeAt, pollState]);

  const handleDoubleClick = useCallback(async (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const node = findNodeAt(sx, sy);
    if (!node) {
      const { x: wx, y: wy } = toWorld(sx, sy);
      try {
        await api.addNode(wx, wy, 0);
        pollState();
      } catch { /* ignore */ }
    }
  }, [findNodeAt, toWorld, pollState]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    const v = viewRef.current;
    const newScale = v.scale * factor;
    v.offsetX = mx - (mx - v.offsetX) * (newScale / v.scale);
    v.offsetY = my - (my - v.offsetY) * (newScale / v.scale);
    v.scale = newScale;
    needsRedraw.current = true;
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (nodeSelection) return;
    // Don't open context menu if we were dragging a node
    if (nodeDragRef.current) {
      nodeDragRef.current = null;
      return;
    }
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const node = findNodeAt(sx, sy);
    if (node) {
      setContextMenu({ x: e.clientX, y: e.clientY, nodeId: node.id });
    } else {
      // Check for edge click
      const edge = findEdgeAt(sx, sy);
      if (edge) {
        // Store edge context menu in the store (reuse contextMenu with edge data)
        useSimulationStore.getState().setEdgeContextMenu({ x: e.clientX, y: e.clientY, from: edge.from, to: edge.to });
      } else {
        setContextMenu(null);
        // Space context menu with world coords
        const { x: wx, y: wy } = toWorld(sx, sy);
        useSimulationStore.getState().setSpaceContextMenu({ x: e.clientX, y: e.clientY, wx, wy });
      }
    }
  }, [findNodeAt, findEdgeAt, setContextMenu, nodeSelection, toWorld]);

  const zoomIn = useCallback(() => {
    const v = viewRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2, cy = rect.height / 2;
    const newScale = v.scale * 1.2;
    v.offsetX = cx - (cx - v.offsetX) * (newScale / v.scale);
    v.offsetY = cy - (cy - v.offsetY) * (newScale / v.scale);
    v.scale = newScale;
    needsRedraw.current = true;
  }, []);

  const zoomOut = useCallback(() => {
    const v = viewRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2, cy = rect.height / 2;
    const newScale = v.scale / 1.2;
    v.offsetX = cx - (cx - v.offsetX) * (newScale / v.scale);
    v.offsetY = cy - (cy - v.offsetY) * (newScale / v.scale);
    v.scale = newScale;
    needsRedraw.current = true;
  }, []);

  return (
    <div className="flex-1 w-full relative">
      <canvas
        ref={canvasRef}
        className={`w-full h-full ${nodeSelection ? 'cursor-pointer' : 'cursor-crosshair'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { dragRef.current = null; edgeDrawRef.current = null; setTooltip(null); }}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
      />
      {/* Zoom buttons */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1">
        <button onClick={zoomIn} className="w-8 h-8 bg-white border border-gray-400 rounded shadow text-lg font-bold hover:bg-gray-100" title="Zoom In">+</button>
        <button onClick={zoomOut} className="w-8 h-8 bg-white border border-gray-400 rounded shadow text-lg font-bold hover:bg-gray-100" title="Zoom Out">−</button>
        <button onClick={zoomToFit} className="w-8 h-8 bg-white border border-gray-400 rounded shadow text-xs font-bold hover:bg-gray-100" title="Zoom to Fit">Fit</button>
      </div>
      <MiniMap />
      {/* Node selection overlay */}
      {nodeSelection && (
        <div className="absolute top-0 left-0 right-0 bg-amber-600/90 px-4 py-2 flex items-center justify-between">
          <span className="text-white font-medium">{nodeSelection.text}</span>
          <button onClick={cancelNodeSelection} className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded text-white text-sm">Cancel</button>
        </div>
      )}
      {/* Tooltip */}
      {tooltip && (
        <div className="fixed pointer-events-none bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg z-50 max-w-xs whitespace-pre-wrap"
          style={{ left: tooltip.x, top: tooltip.y }}>
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
