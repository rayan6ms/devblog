'use client';

import { useEffect, useRef } from 'react';
import p5 from 'p5';

type V2 = { x: number; y: number };

export default function LabyrinthExplorer() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const p5Ref = useRef<p5 | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    if (!hostRef.current) return;

    const sketch = (s: p5) => {
      let pts: V2[] = [];
      let vels: V2[] = [];
      let cols: p5.Color[] = [];
      let base: p5.Color;
      let grid = 10;
      let w = 800;
      let h = 800;

      const init = () => {
        s.pixelDensity(1);
        const el = hostRef.current!;
        w = Math.max(1, el.clientWidth);
        h = Math.max(1, el.clientHeight);
        if (s.canvas) s.resizeCanvas(w, h, true);
        else s.createCanvas(w, h);
        s.frameRate(30);
        s.noStroke();
        const n = 30;
        pts = [];
        vels = [];
        cols = [];
        base = s.color(s.random(255), s.random(255), s.random(255));
        for (let i = 0; i < n; i++) {
          pts.push({ x: s.random(w), y: s.random(h) });
          vels.push({ x: s.random(-0.6, 0.6), y: s.random(-0.6, 0.6) });
          const c = s.lerpColor(base, s.color(s.random(255), s.random(255), s.random(255)), s.random(0.4, 0.9));
          cols.push(c);
        }
        grid = Math.max(6, Math.floor(Math.min(w, h) / 120));
      };

      const update = () => {
        for (let i = 0; i < pts.length; i++) {
          const p = pts[i];
          const v = vels[i];
          p.x += v.x;
          p.y += v.y;
          if (p.x >= w) {
            p.x = w; v.x *= -1;
          } else if (p.x <= 0) {
            p.x = 0; v.x *= -1;
          }
          if (p.y >= h) {
            p.y = h; v.y *= -1;
          } else if (p.y <= 0) {
            p.y = 0; v.y *= -1;
          }
        }
      };

      const drawVoronoi = () => {
        for (let x = 0; x < w; x += grid) {
          for (let y = 0; y < h; y += grid) {
            let best = Infinity;
            let idx = 0;
            for (let i = 0; i < pts.length; i++) {
              const dx = x - pts[i].x;
              const dy = y - pts[i].y;
              const d = dx * dx + dy * dy;
              if (d < best) {
                best = d;
                idx = i;
              }
            }
            s.fill(cols[idx]);
            s.rect(x, y, grid, grid);
          }
        }
      };

      s.setup = () => {
        init();
      };

      s.draw = () => {
        s.background(255);
        update();
        drawVoronoi();
      };

      s.windowResized = () => {
        init();
      };
    };

    const inst = new p5(sketch, hostRef.current);
    p5Ref.current = inst;

    const ro = new ResizeObserver(() => {
      if (p5Ref.current) p5Ref.current.windowResized();
    });
    ro.observe(hostRef.current);
    roRef.current = ro;

    return () => {
      roRef.current?.disconnect();
      p5Ref.current?.remove();
      p5Ref.current = null;
    };
  }, []);

  return <div ref={hostRef} className="relative w-full h-full" />;
}
