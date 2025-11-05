'use client';

import { useEffect, useRef, useState } from 'react';
import type p5Type from 'p5';

const DEFAULT_CELL = 4;
const DEFAULT_BRUSH_DIAM = 7;
const BRUSH_DENSITY = 0.75;
const GRAVITY = 0.12;
const VEL_MAX = 14;
const SLEEP_CHECK = 8;
const NOISE_Z1 = 83492791;
const NOISE_Z2 = 196613;

function fastNoise(c: number, r: number, z: number) {
  let n = (c * 73856093) ^ (r * 19349663) ^ (z * NOISE_Z1);
  n = (n ^ (n >>> 13)) * 1274126177;
  n ^= n >>> 16;
  return ((n >>> 8) & 0xffff) / 65535 - 0.5;
}

let fpsAccMs = 0, fpsAccFrames = 0, fpsDisplay = 60;

type Particle = {
  col: number;
  row: number;
  v: number;
  hue: number;
  stuck: number;
  vMul: number;
};


type Brush = 'circle' | 'square' | 'spray';
type HueMode = 'cycle' | 'random' | 'randomLerp' | 'single';
type Cohesion = 'none' | 'checker' | 'rings' | 'cross';
type Palette = 'off' | 'analogous' | 'complementary' | 'triad' | 'mono';
type NoiseMode = 'off' | 'hue' | 'liquid' | 'granular';

function lerpHue(a: number, b: number, t: number) {
  let d = ((b - a + 540) % 360) - 180;
  return (a + d * t + 360) % 360;
}

function hexToHsv(hex: string) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return { h: 0, s: 0, v: 0 };
  const r = parseInt(m[1], 16) / 255;
  const g = parseInt(m[2], 16) / 255;
  const b = parseInt(m[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
      case g: h = ((b - r) / d + 2) * 60; break;
      case b: h = ((r - g) / d + 4) * 60; break;
    }
  }
  const s = max === 0 ? 0 : d / max;
  const v = max;
  return { h, s, v };
}

export default function FallingSand() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const p5Ref = useRef<p5Type | null>(null);
  const resetWorldRef = useRef<() => void>();

  const [cell, setCell] = useState<number>(DEFAULT_CELL);
  const [brushDiam, setBrushDiam] = useState<number>(DEFAULT_BRUSH_DIAM);
  const [eraser, setEraser] = useState<boolean>(false);
  const [brush, setBrush] = useState<Brush>('circle');
  const [hueMode, setHueMode] = useState<HueMode>('cycle');
  const [cohesion, setCohesion] = useState<Cohesion>('none');
  const [solid, setSolid] = useState(false);
  const [palette, setPalette] = useState<Palette>('off');
  const [noiseMode, setNoiseMode] = useState<NoiseMode>('off');
  const [noiseScale, setNoiseScale] = useState<number>(0.045);
  const [shadow, setShadow] = useState<boolean>(false);
  const [shadowLayers, setShadowLayers] = useState<number>(3);
  const [shadowDist, setShadowDist] = useState<number>(2);


  const [singleHex, setSingleHex] = useState<string>('#3B82F6');
  const singleHSV = hexToHsv(singleHex);
  const singleHue = singleHSV.h;

  const [colorName, setColorName] = useState<string>('—');
  const [contrastHex, setContrastHex] = useState<string>('#FFFFFF');

  const settingsRef = useRef({
    brush: 'circle' as Brush,
    hueMode: 'cycle' as HueMode,
    cohesion: 'none' as Cohesion,
    singleHue: 210,
    singleHex: '#3B82F6',
    singleS: 1,
    singleV: 1,
    randTargetHue: Math.random() * 360,
    randCurrentHue: Math.random() * 360,
    randT: 0,
    solid: false,
    cell: DEFAULT_CELL,
    brushDiam: DEFAULT_BRUSH_DIAM,
    eraser: false,
    palette: 'off' as Palette,
    noiseMode: 'off' as NoiseMode,
    noiseScale: 0.045,
    shadow: false,
    shadowLayers: 3,
    shadowDist: 2,
  });

  useEffect(() => { settingsRef.current.brush = brush; }, [brush]);
  useEffect(() => { settingsRef.current.hueMode = hueMode; }, [hueMode]);
  useEffect(() => { settingsRef.current.cohesion = cohesion; }, [cohesion]);
  useEffect(() => { settingsRef.current.solid = solid; }, [solid]);
  useEffect(() => { settingsRef.current.cell = cell; }, [cell]);
  useEffect(() => { settingsRef.current.brushDiam = brushDiam; }, [brushDiam]);
  useEffect(() => { settingsRef.current.eraser = eraser; }, [eraser]);
  useEffect(() => { settingsRef.current.palette = palette; }, [palette]);
  useEffect(() => { settingsRef.current.noiseMode = noiseMode; }, [noiseMode]);
  useEffect(() => { settingsRef.current.noiseScale = noiseScale; }, [noiseScale]);
  useEffect(() => { settingsRef.current.shadow = shadow; }, [shadow]);
  useEffect(() => { settingsRef.current.shadowLayers = shadowLayers; }, [shadowLayers]);
  useEffect(() => { settingsRef.current.shadowDist = shadowDist; }, [shadowDist]);
  useEffect(() => {
    settingsRef.current.singleHue = singleHue;
    settingsRef.current.singleHex = singleHex;
    settingsRef.current.singleS = singleHSV.s;
    settingsRef.current.singleV = singleHSV.v;
  }, [singleHue, singleHex]);
  useEffect(() => {
    resetWorldRef.current?.();
  }, [cell]);

  useEffect(() => {
    let ac = new AbortController();
    const hex = singleHex.replace('#', '');
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`https://www.thecolorapi.com/id?hex=${hex}`, { signal: ac.signal });
        const data = await res.json();
        setColorName(data?.name?.value ?? 'Unnamed');
        setContrastHex(data?.contrast?.value ?? '#FFFFFF');
      } catch { }
    }, 150);
    return () => { ac.abort(); clearTimeout(t); };
  }, [singleHex]);

  useEffect(() => {
    let mounted = true;
    let ro: ResizeObserver | null = null;

    (async () => {
      const p5Module = await import('p5');
      if (!mounted) return;
      const p5 = p5Module.default;

      let grid: Int32Array;
      let cols = 0, rows = 0;
      let particles: Particle[] = [];
      let active: number[] = [];
      let nextActive: number[] = [];
      let hueValue = 200;

      let staticLayer!: p5Type.Graphics;
      let renderer: p5Type.Renderer | null = null;
      let frameId = 0;

      const idx = (c: number, r: number) => r * cols + c;
      const inBounds = (c: number, r: number) => (c >= 0 && c < cols && r >= 0 && r < rows);

      const makeWorld = (pg: p5Type, w: number, h: number) => {
        const cfg = settingsRef.current;
        cols = Math.max(1, Math.floor(w / cfg.cell));
        rows = Math.max(1, Math.floor(h / cfg.cell));
        grid = new Int32Array(cols * rows);
        grid.fill(-1);
        particles = [];
        active = [];
        nextActive = [];
      };

      const wrap360 = (h: number) => (h % 360 + 360) % 360;

      const applyPalette = (base: number) => {
        const cfg = settingsRef.current;
        const b = wrap360(base);
        if (cfg.palette === 'mono') return b;
        if (cfg.palette === 'off') return b;

        const jitter = () => (Math.random() * 12 - 6);
        if (cfg.palette === 'analogous') {
          const offsets = [-30, -15, 0, 15, 30];
          return wrap360(b + offsets[Math.floor(Math.random() * offsets.length)] + jitter());
        }
        if (cfg.palette === 'complementary') {
          const useComp = Math.random() < 0.55;
          const o = useComp ? 180 : (Math.random() < 0.5 ? -20 : 20);
          return wrap360(b + o + jitter());
        }
        if (cfg.palette === 'triad') {
          const offsets = [0, 120, 240];
          const pick = offsets[Math.floor(Math.random() * offsets.length)];
          return wrap360(b + pick + (Math.random() < 0.5 ? jitter() : 0));
        }
        return b;
      };

      const svFor = (pg: p5Type, c: number, r: number) => {
        const cfg = settingsRef.current;
        if (cfg.palette !== 'mono') {
          const s255 = cfg.hueMode === 'single' ? Math.round(cfg.singleS * 255) : 255;
          const v255 = cfg.hueMode === 'single' ? Math.round(cfg.singleV * 255) : 255;
          return { s255, v255 };
        }
        const freq = 1 / Math.max(0.0001, cfg.noiseScale);
        const n = pg.noise(c / freq, r / freq, pg.frameCount * 0.01);
        const s255 = Math.round(160 + n * 95);
        const v255 = Math.round(160 + (1 - n) * 95);
        return { s255, v255 };
      };

      const noiseHueDelta = (pg: p5Type, c: number, r: number) => {
        const cfg = settingsRef.current;
        const freq = 1 / Math.max(0.0001, cfg.noiseScale);
        const n = fastNoise(Math.floor(c / freq), Math.floor(r / freq), Math.floor(pg.frameCount * 0.6));
        return n * 90;
      };

      const drawShadowCell = (pg: p5Type, c: number, r: number, hue: number) => {
        const cfg = settingsRef.current;
        if (!cfg.shadow) return;
        const layers = Math.max(1, cfg.shadowLayers);
        for (let i = 1; i <= layers; i++) {
          const off = i * Math.max(0, cfg.shadowDist);
          const rr = r + off;
          if (!inBounds(c, rr)) continue;
          const stripe = ((c + rr) & 1) === 0;
          if (!stripe) continue;
          const t = i / (layers + 1);
          const vMul = Math.max(0.18, 0.38 - 0.06 * (i - 1)) * (0.9 + 0.05 * t);
          if (cfg.solid) {
            const { s255, v255 } = svFor(pg, c, rr);
            const id = idx(c, rr);
            if (grid[id] === -1) {
              grid[id] = -2;
              staticLayer.noStroke();
              staticLayer.fill(hue, s255, Math.max(12, Math.round(v255 * vMul)));
              staticLayer.square(c * cfg.cell, rr * cfg.cell, cfg.cell);
            }
          } else {
            addParticle(c, rr, hue, vMul);
          }
        }
      };

      const addParticle = (c: number, r: number, hue: number, vMul: number = 1) => {
        if (!inBounds(c, r)) return;
        const id = idx(c, r);
        if (grid[id] !== -1) return;
        const p: Particle = { col: c, row: r, v: 1, hue, stuck: 0, vMul };
        const i = particles.push(p) - 1;
        grid[id] = i;
        active.push(i);
      };

      const wakeAt = (c: number, r: number) => {
        if (!inBounds(c, r)) return;
        const id = idx(c, r);
        const k = grid[id];
        if (k >= 0) {
          particles[k].stuck = 0;
          active.push(k);
        }
      };

      const tryMoveTo = (pg: p5Type, i: number, nc: number, nr: number): boolean => {
        const p = particles[i];
        if (!inBounds(nc, nr)) return false;
        const nId = idx(nc, nr);
        if (grid[nId] !== -1) return false;
        grid[idx(p.col, p.row)] = -1;
        grid[nId] = i;
        p.col = nc; p.row = nr;
        return true;
      };

      const hasSolidBelow = (p: Particle) => {
        const r = p.row + 1;
        if (r >= rows) return true;
        return grid[idx(p.col, r)] !== -1;
      };

      const bakeStatic = (pg: p5Type, p: Particle) => {
        const { s255, v255 } = svFor(pg, p.col, p.row);
        staticLayer.noStroke();
        staticLayer.fill(p.hue, s255, Math.max(0, Math.min(255, Math.round(v255 * p.vMul))));
        staticLayer.square(p.col * settingsRef.current.cell, p.row * settingsRef.current.cell, settingsRef.current.cell);
      };

      const compactParticles = () => {
        const map = new Int32Array(particles.length);
        map.fill(-1);

        let newCount = 0;
        for (let gi = 0; gi < grid.length; gi++) {
          const old = grid[gi];
          if (old >= 0 && map[old] === -1) {
            map[old] = newCount++;
          }
        }

        if (newCount === particles.length) return;

        const newParticles = new Array<Particle>(newCount);
        for (let gi = 0; gi < grid.length; gi++) {
          const old = grid[gi];
          if (old >= 0) {
            const neo = map[old];
            grid[gi] = neo;
          }
        }

        for (let i = 0; i < particles.length; i++) {
          const neo = map[i];
          if (neo !== -1) newParticles[neo] = particles[i];
        }

        const newActive: number[] = [];
        for (let k = 0; k < active.length; k++) {
          const old = active[k];
          const neo = old < map.length ? map[old] : -1;
          if (neo !== -1) newActive.push(neo);
        }

        particles = newParticles;
        active = newActive;
        nextActive.length = 0;
      };

      const sketch = (pg: p5Type) => {
        p5Ref.current = pg;

        const allocate = (width: number, height: number) => {
          const cfg = settingsRef.current;
          const cw = Math.max(cfg.cell, Math.floor(width / cfg.cell) * cfg.cell);
          const ch = Math.max(cfg.cell, Math.floor(height / cfg.cell) * cfg.cell);

          if (!renderer) {
            renderer = pg.createCanvas(cw, ch).parent(hostRef.current!);
            pg.noSmooth();
            pg.pixelDensity(1);
            pg.colorMode(pg.HSB, 360, 255, 255, 255);
          } else {
            pg.resizeCanvas(cw, ch);
          }

          staticLayer = pg.createGraphics(cw, ch);
          staticLayer.colorMode(pg.HSB, 360, 255, 255, 255);
          staticLayer.background(0);
          makeWorld(pg, cw, ch);
        };

        resetWorldRef.current = () => {
          staticLayer.background(0);
          makeWorld(pg, pg.width, pg.height);
          frameId = 0;
        };

        pg.setup = () => {
          const host = hostRef.current!;
          pg.pixelDensity(1);
          pg.frameRate(60);
          pg.textFont('ui-monospace, SFMono-Regular, Menlo, monospace');

          const w = host.clientWidth || host.getBoundingClientRect().width;
          const h = host.clientHeight || host.getBoundingClientRect().height;
          allocate(w, h);

          ro = new ResizeObserver(() => {
            if (!host) return;
            const nw = host.clientWidth || host.getBoundingClientRect().width;
            const nh = host.clientHeight || host.getBoundingClientRect().height;
            if (nw > 0 && nh > 0) allocate(nw, nh);
          });
          ro.observe(host);
        };

        const spawnAtMouse = () => {
          if (!pg.mouseIsPressed) return;
          if (pg.mouseX < 0 || pg.mouseX >= pg.width || pg.mouseY < 0 || pg.mouseY >= pg.height) return;

          const cfg = settingsRef.current;
          const mc = Math.floor(pg.mouseX / cfg.cell);
          const mr = Math.floor(pg.mouseY / cfg.cell);
          const brushExtent = Math.floor(cfg.brushDiam / 2);
          const r2 = brushExtent * brushExtent;

          const mask = (dx: number, dy: number) => {
            const cfg = settingsRef.current;
            switch (cfg.cohesion) {
              case 'checker': return ((dx & 1) ^ (dy & 1)) === 0;
              case 'rings': return (Math.floor(Math.hypot(dx, dy)) % 2) === 0;
              case 'cross': return dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy);
              default: return true;
            }
          };

          if (cfg.hueMode === 'cycle') {
            hueValue = (hueValue + 0.9) % 360;
          } else if (cfg.hueMode === 'randomLerp') {
            cfg.randT += 0.08;
            if (cfg.randT >= 1) {
              cfg.randCurrentHue = cfg.randTargetHue;
              cfg.randTargetHue = Math.random() * 360;
              cfg.randT = 0;
            }
          }

          const hueFor = (c: number, r: number) => {
            let baseHue: number;
            switch (cfg.hueMode) {
              case 'single':
                baseHue = cfg.singleHue;
                break;
              case 'random':
                baseHue = pg.random(360);
                break;
              case 'randomLerp': {
                const t = cfg.randT < 0 ? 0 : (cfg.randT > 1 ? 1 : cfg.randT);
                const h = lerpHue(cfg.randCurrentHue, cfg.randTargetHue, t);
                baseHue = (h + (Math.random() * 70 - 35) + 360) % 360;
                break;
              }
              case 'cycle':
              default:
                baseHue = hueValue;
                break;
            }
            let h2 = applyPalette(baseHue);
            if (cfg.noiseMode === 'hue') {
              h2 = wrap360(h2 + noiseHueDelta(pg, c, r));
            }
            return h2;
          };

          if (cfg.brush === 'spray') {
            for (let k = 0; k < 96; k++) {
              const dx = Math.floor(pg.random(-brushExtent, brushExtent + 1));
              const dy = Math.floor(pg.random(-brushExtent, brushExtent + 1));
              if (!mask(dx, dy)) continue;
              if (dx * dx + dy * dy > r2) continue;
              const c = mc + dx, r = mr + dy;
              if (!(Math.random() < BRUSH_DENSITY)) continue;
              if (c >= 0 && c < cols && r >= 0 && r < rows) {
                const id = r * cols + c;
                if (cfg.eraser) {
                  if (grid[id] !== -1) {
                    if (grid[id] >= 0) particles[grid[id]].col = -1;
                    grid[id] = -1;
                  }
                  staticLayer.noStroke();
                  staticLayer.erase();
                  staticLayer.square(c * cfg.cell, r * cfg.cell, cfg.cell);
                  staticLayer.noErase();
                } else if (cfg.solid) {
                  if (grid[id] === -1) {
                    grid[id] = -2;
                    const h = hueFor(c, r);
                    drawShadowCell(pg, c, r, h);
                    const sv0 = svFor(pg, c, r);
                    staticLayer.noStroke();
                    staticLayer.fill(h, sv0.s255, sv0.v255);
                    staticLayer.square(c * cfg.cell, r * cfg.cell, cfg.cell);
                  }
                } else {
                  { const h = hueFor(c, r); drawShadowCell(pg, c, r, h); addParticle(c, r, h, 1); }
                }
              }
            }
          } else {
            for (let dy = -brushExtent; dy <= brushExtent; dy++) {
              for (let dx = -brushExtent; dx <= brushExtent; dx++) {
                if (!mask(dx, dy)) continue;
                if (cfg.brush === 'circle' && dx * dx + dy * dy > r2) continue;
                const c = mc + dx, r = mr + dy;
                if (!(Math.random() < BRUSH_DENSITY)) continue;
                if (c >= 0 && c < Math.floor(pg.width / cfg.cell) && r >= 0 && r < Math.floor(pg.height / cfg.cell)) {
                  const wCells = Math.floor(pg.width / cfg.cell);
                  const id = r * wCells + c;
                  if (cfg.eraser) {
                    if (grid[id] !== -1) {
                      if (grid[id] >= 0) particles[grid[id]].col = -1;
                      grid[id] = -1;
                    }
                    staticLayer.noStroke();
                    staticLayer.erase();
                    staticLayer.square(c * cfg.cell, r * cfg.cell, cfg.cell);
                    staticLayer.noErase();
                  } else if (cfg.solid) {
                    if (grid[id] === -1) {
                      grid[id] = -2;
                      const h = hueFor(c, r);
                      drawShadowCell(pg, c, r, h);
                      const sv0 = svFor(pg, c, r);
                      staticLayer.noStroke();
                      staticLayer.fill(h, sv0.s255, sv0.v255);
                      staticLayer.square(c * cfg.cell, r * cfg.cell, cfg.cell);
                    }
                  } else {
                    { const h = hueFor(c, r); drawShadowCell(pg, c, r, h); addParticle(c, r, h, 1); }
                  }
                }
              }
            }
          }
        };

        const update = () => {
          const z1 = frameId * 3 + NOISE_Z2;
          const z2 = frameId * 2 + NOISE_Z2;
          const nm = settingsRef.current.noiseMode;
          const gMul = nm === 'liquid' ? 0.7 : nm === 'granular' ? 1.1 : 1.0;
          const driftMul = nm === 'liquid' ? 2.4 : nm === 'granular' ? 0.55 : 1.0;
          const sleepThresh = nm === 'liquid' ? Math.round(SLEEP_CHECK * 1.8) : nm === 'granular' ? Math.max(3, Math.round(SLEEP_CHECK * 0.75)) : SLEEP_CHECK;

          nextActive.length = 0;
          const leftFirst = (frameId & 1) === 0;

          const len = active.length;
          if (len === 0) return;

          const start = len > 0 ? (frameId * 9973) % len : 0;

          for (let t = 0; t < len; t++) {
            const k = (start + t) % len;
            const i = active[k];
            const p = particles[i];

            const gid = idx(p.col, p.row);
            if (gid < 0 || gid >= grid.length || grid[gid] !== i) continue;

            p.v = Math.min(VEL_MAX, p.v + GRAVITY * gMul);

            let moved = false;

            const driftNoise = (nm === 'hue' || nm === 'liquid') ? fastNoise(p.col, p.row, z1) : 0;

            const drift = Math.sign(driftNoise) * (Math.abs(driftNoise) > 0.02 ? 1 : 0) * driftMul;
            const granJitter = nm === 'granular' ? (Math.random() < 0.25 ? (Math.random() < 0.5 ? -1 : 1) : 0) : 0;

            const steps = Math.max(1, Math.floor(p.v));
            for (let s = 0; s < steps; s++) {
              if (tryMoveTo(p5Ref.current!, i, p.col, p.row + 1)) { moved = true; continue; }

              const tryDiag = (dc: number) => tryMoveTo(p5Ref.current!, i, p.col + dc, p.row + 1);
              if (leftFirst) {
                if (tryDiag(-1)) { moved = true; continue; }
                if (tryDiag(1)) { moved = true; continue; }
              } else {
                if (tryDiag(1)) { moved = true; continue; }
                if (tryDiag(-1)) { moved = true; continue; }
              }

              if (drift !== 0 && tryMoveTo(p5Ref.current!, i, p.col + drift, p.row)) { moved = true; continue; }
              if (granJitter !== 0 && tryMoveTo(p5Ref.current!, i, p.col + granJitter, p.row)) { moved = true; continue; }

              break;
            }

            if (!moved && nm === 'liquid') {
              const flow = fastNoise(p.col, p.row, z2);
              const dir = flow >= 0 ? 1 : -1;
              if (tryMoveTo(p5Ref.current!, i, p.col + dir, p.row)) moved = true;
            }

            if (moved) {
              p.stuck = 0;
              nextActive.push(i);
            } else {
              if (hasSolidBelow(p)) {
                p.stuck++;
                if (p.v > VEL_MAX * 0.9 && p.stuck >= sleepThresh) {
                  bakeStatic(p5Ref.current!, p);
                  continue;
                }
              } else {
                p.stuck = Math.max(0, p.stuck - 1);
              }
              nextActive.push(i);
            }
          }

          const tmp = active;
          active = nextActive;
          nextActive = tmp;
        };

        const drawActive = () => {
          pg.noStroke();
          for (let k = 0; k < active.length; k++) {
            const p = particles[active[k]];
            const sv = svFor(pg, p.col, p.row);
            pg.fill(p.hue, sv.s255, Math.max(0, Math.min(255, Math.round(sv.v255 * p.vMul))));
            const cfg = settingsRef.current;
            pg.square(p.col * cfg.cell, p.row * cfg.cell, cfg.cell);
          }
        };

        function showFPS() {
          fpsAccMs += pg.deltaTime;
          fpsAccFrames += 1;
          if (fpsAccMs >= 600) {
            fpsDisplay = (fpsAccFrames * 1000) / fpsAccMs;
            fpsAccMs = 0;
            fpsAccFrames = 0;
          }
          const label = `FPS: ${Math.round(fpsDisplay)}`;

          const padX = 10;
          pg.textSize(12);
          pg.textFont('ui-monospace, SFMono-Regular, Menlo, monospace');
          const tw = pg.textWidth(label);
          const w = tw + padX * 2;
          const h = 22;

          pg.noStroke();
          pg.fill(58, 58, 60, 230);
          pg.rect(8, 8, w, h, 999);

          pg.fill(245);
          pg.textAlign(pg.LEFT, pg.CENTER);
          pg.text(label, 8 + padX, 8 + h / 2 + 0.5);
        }

        pg.draw = () => {
          frameId++;
          spawnAtMouse();
          update();

          if ((frameId & 511) === 0) compactParticles();

          pg.background(0);
          pg.image(staticLayer, 0, 0);
          drawActive();
          showFPS();
        };
      };

      const instance = new p5(sketch);

      return () => {
        instance.remove();
        p5Ref.current = null;
      };
    })();

    return () => { mounted = false; ro?.disconnect(); };
  }, []);

  return (
    <div className="w-full h-full flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-300">Brush</span>
          <div className="inline-flex rounded-lg overflow-hidden border border-zinc-700/60">
            {(['circle', 'square', 'spray'] as Brush[]).map(b => (
              <button
                key={b}
                onClick={() => setBrush(b)}
                className={`px-2 py-1.5 text-sm ${brush === b ? 'bg-zinc-200 text-zinc-900' : 'bg-zinc-800/60 text-zinc-200 hover:bg-zinc-700/60'}`}
              >
                {b[0].toUpperCase() + b.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-300">Color</span>
          <div className="inline-flex rounded-lg overflow-hidden border border-zinc-700/60">
            {([
              ['cycle', 'Cycle'],
              ['random', 'Random'],
              ['randomLerp', 'Random Lerp'],
              ['single', 'Single'],
            ] as [HueMode, string][])
              .map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setHueMode(key)}
                  className={`px-2 py-1.5 text-sm ${hueMode === key ? 'bg-zinc-200 text-zinc-900' : 'bg-zinc-800/60 text-zinc-200 hover:bg-zinc-700/60'}`}
                >
                  {label}
                </button>
              ))}
          </div>
          {hueMode === 'single' && (
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={singleHex}
                onChange={(e) => setSingleHex(e.target.value)}
                className="h-8 w-10 rounded border border-zinc-700/60 bg-zinc-900"
                style={{ colorScheme: 'dark' }}
                title="Pick color"
              />
              <div
                className="px-3 py-1.5 rounded-xl border text-sm"
                style={{
                  background: singleHex,
                  color: contrastHex,
                  borderColor: 'rgba(255,255,255,0.15)',
                  textAlign: 'center',
                }}
              >
                {colorName}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-300">Palette</span>
          <select
            value={palette}
            onChange={(e) => setPalette(e.target.value as Palette)}
            className="rounded-md border border-zinc-700 bg-zinc-800/70 py-1.5 text-center text-sm text-zinc-100"
          >
            <option value="off">Off</option>
            <option value="analogous">Analogous</option>
            <option value="complementary">Complementary</option>
            <option value="triad">Triad</option>
            <option value="mono">Monochrome</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-300">Cohesion</span>
          <select
            value={cohesion}
            onChange={(e) => setCohesion(e.target.value as Cohesion)}
            className="rounded-md border border-zinc-700 bg-zinc-800/70 py-1.5 text-center text-sm text-zinc-100"
          >
            <option value="none">None</option>
            <option value="checker">Checker</option>
            <option value="rings">Rings</option>
            <option value="cross">Cross</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-300">Noise</span>
          <select
            value={noiseMode}
            onChange={(e) => setNoiseMode(e.target.value as NoiseMode)}
            className="rounded-md border border-zinc-700 bg-zinc-800/70 py-1.5 text-center text-sm text-zinc-100"
          >
            <option value="off">Off</option>
            <option value="hue">Hue</option>
            <option value="liquid">Liquid</option>
            <option value="granular">Granular</option>
          </select>
          <span className="text-sm text-zinc-300">Scale</span>
          <input
            type="range"
            min={0.01}
            max={0.12}
            step={0.005}
            value={noiseScale}
            onChange={(e) => setNoiseScale(parseFloat(e.target.value))}
            className="w-24 accent-zinc-200"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSolid(s => !s)}
            className={`px-3 py-1.5 text-sm rounded-lg border ${solid ? 'bg-emerald-400 text-emerald-900 border-emerald-500' : 'bg-zinc-800/60 text-zinc-200 border-zinc-700/60 hover:bg-zinc-700/60'}`}
          >
            {solid ? 'Solid: On' : 'Solid: Off'}
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-300">Pixel</span>
            <select
              value={cell}
              onChange={(e) => setCell(parseInt(e.target.value, 10))}
              className="rounded-md border border-zinc-700 bg-zinc-800/70 py-1.5 text-center text-sm text-zinc-100"
            >
              <option value={3}>Small (3)</option>
              <option value={4}>Medium (4)</option>
              <option value={6}>Large (6)</option>
              <option value={8}>Huge (8)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-300">Brush</span>
            <input
              type="range"
              min={3}
              max={25}
              step={2}
              value={brushDiam}
              onChange={(e) => setBrushDiam(parseInt(e.target.value, 10))}
              className="w-20 accent-zinc-200"
            />
            <span className="text-xs text-zinc-400 w-fit text-right">{brushDiam}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShadow(v => !v)}
              className={`px-3 py-1.5 text-sm rounded-lg border ${shadow ? 'bg-sky-400 text-sky-900 border-sky-500' : 'bg-zinc-800/60 text-zinc-200 border-zinc-700/60 hover:bg-zinc-700/60'}`}
            >
              {shadow ? 'Shadow: On' : 'Shadow: Off'}
            </button>
            <span className="text-sm text-zinc-300">Layers</span>
            <input
              type="range"
              min={1}
              max={6}
              step={1}
              value={shadowLayers}
              onChange={(e) => setShadowLayers(parseInt(e.target.value, 10))}
              className="w-16 accent-zinc-200"
            />
            <span className="text-sm text-zinc-300">Offset</span>
            <input
              type="range"
              min={0}
              max={6}
              step={1}
              value={shadowDist}
              onChange={(e) => setShadowDist(parseInt(e.target.value, 10))}
              className="w-16 accent-zinc-200"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setEraser(v => !v)}
              className={`px-3 py-1.5 text-sm rounded-lg border ${eraser ? 'bg-rose-400 text-rose-950 border-rose-500' : 'bg-zinc-800/60 text-zinc-200 border-zinc-700/60 hover:bg-zinc-700/60'}`}
            >
              {eraser ? 'Eraser: On' : 'Eraser: Off'}
            </button>
          </div>
          <button
            onClick={() => resetWorldRef.current?.()}
            className="px-3 py-1.5 text-sm rounded-lg border bg-red-500 text-white border-red-400 hover:bg-red-400"
          >
            Reset
          </button>
        </div>
      </div>

      <div
        ref={hostRef}
        className="flex-1 min-h-0 rounded-2xl bg-neutral-900 shadow-xl overflow-hidden"
      />
    </div>
  );
}
