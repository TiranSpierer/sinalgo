import { useRef, useEffect, useCallback } from 'react';
import { useSimulationStore } from '../store/simulationStore';

export default function MiniMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const state = useSimulationStore((s) => s.state);
  const config = useSimulationStore((s) => s.config);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !state || !config) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = 150, h = 100;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Background
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, w, h);

    // Scale to fit simulation area
    const pad = 4;
    const scaleX = (w - 2 * pad) / config.dimX;
    const scaleY = (h - 2 * pad) / config.dimY;
    const scale = Math.min(scaleX, scaleY);

    // Simulation area
    ctx.fillStyle = '#334155';
    ctx.fillRect(pad, pad, config.dimX * scale, config.dimY * scale);

    // Nodes as small dots
    ctx.fillStyle = '#60a5fa';
    for (const n of state.nodes) {
      const x = pad + n.x * scale;
      const y = pad + n.y * scale;
      ctx.fillRect(x - 0.5, y - 0.5, 1, 1);
    }

    // Border
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, w, h);
  }, [state, config]);

  useEffect(() => {
    draw();
  }, [draw]);

  if (!state || !config) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute bottom-14 right-4 z-30 rounded shadow-lg border border-slate-600 cursor-pointer"
      style={{ width: 150, height: 100 }}
      title="Minimap"
    />
  );
}
