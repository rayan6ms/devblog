'use client';

import { useEffect, useRef, useState } from 'react';
import type p5Type from 'p5';

type HueMode = 'cycle' | 'random' | 'randomLerp' | 'single';
type Palette = 'off' | 'analogous' | 'complementary' | 'triad' | 'mono';
type Cohesion = 'none' | 'checker' | 'rings' | 'cross';
type NoiseMode = 'off' | 'hue' | 'liquid' | 'granular';

function hexToHsl(hex: string) {
  const v = hex.replace('#', '');
  const bigint = parseInt(v, 16);
  const r = ((bigint >> 16) & 255) / 255;
  const g = ((bigint >> 8) & 255) / 255;
  const b = (bigint & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
        break;
      case g:
        h = ((b - r) / d + 2) * 60;
        break;
      default:
        h = ((r - g) / d + 4) * 60;
    }
  }
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return { h: (h + 360) % 360, s: s * 100, l: l * 100 };
}

function contrastBW(hex: string) {
  const v = hex.replace('#', '');
  const r = parseInt(v.substring(0, 2), 16);
  const g = parseInt(v.substring(2, 4), 16);
  const b = parseInt(v.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? '#111111' : '#FFFFFF';
}

export default function MovingMountains() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const pRef = useRef<p5Type | null>(null);
  const resizeObsRef = useRef<ResizeObserver | null>(null);

  const [hueMode, setHueMode] = useState<HueMode>('cycle');
  const [singleHex, setSingleHex] = useState<string>('#7c3aed');
  const [palette, setPalette] = useState<Palette>('off');
  const [cohesion, setCohesion] = useState<Cohesion>('none');
  const [noiseMode, setNoiseMode] = useState<NoiseMode>('off');
  const [noiseScale, setNoiseScale] = useState<number>(0.06);

  const resetWorldRef = useRef<(() => void) | null>(null);

  const hueModeRef = useRef(hueMode);
  const singleHueRef = useRef(hexToHsl(singleHex).h);
  const paletteRef = useRef(palette);
  const cohesionRef = useRef(cohesion);
  const noiseModeRef = useRef(noiseMode);
  const noiseScaleRef = useRef(noiseScale);

  useEffect(() => { hueModeRef.current = hueMode; }, [hueMode]);
  useEffect(() => { singleHueRef.current = hexToHsl(singleHex).h; }, [singleHex]);
  useEffect(() => { paletteRef.current = palette; }, [palette]);
  useEffect(() => { cohesionRef.current = cohesion; }, [cohesion]);
  useEffect(() => { noiseModeRef.current = noiseMode; }, [noiseMode]);
  useEffect(() => { noiseScaleRef.current = noiseScale; }, [noiseScale]);

  useEffect(() => {
    let disposed = false;
    let mountCancelled = false;

    const start = async () => {
      const p5mod = await import('p5');
      if (mountCancelled) return;

      const sketch = (p: p5Type) => {
        let cols = 0;
        let rows = 0;
        let scale = 12;
        let yOffset = 0;
        let speed = 0.033;
        let terrainA: Float32Array | null = null;
        let terrainB: Float32Array | null = null;
        let useA = true;
        let width3D = 0;
        let height3D = 0;

        const paletteFrom = (base: number, kind: Palette) => {
          if (kind === 'analogous') return [base, (base + 20) % 360, (base + 340) % 360];
          if (kind === 'complementary') return [base, (base + 180) % 360];
          if (kind === 'triad') return [base, (base + 120) % 360, (base + 240) % 360];
          if (kind === 'mono') return [base];
          return [base];
        };

        const hueFor = (x: number, y: number, z: number, t: number) => {
          const mode = hueModeRef.current;
          const pal = paletteFrom(singleHueRef.current, paletteRef.current);
          let h = pal[0];
          if (mode === 'cycle') h = (t * 40 + x * 0.9 + y * 0.6) % 360;
          if (mode === 'random') h = (x * 37.7 + y * 19.3 + Math.floor(t * 10) * 11.1) % 360;
          if (mode === 'randomLerp') {
            const h1 = (x * 29.1 + t * 33) % 360;
            const h2 = (y * 41.2 + t * 47) % 360;
            const a = ((x + y + t * 60) % 100) / 100;
            h = (h1 * (1 - a) + h2 * a) % 360;
          }
          if (mode === 'single') h = pal[Math.floor((x + y) % pal.length)];

          const c = cohesionRef.current;
          if (c === 'checker') h = (h + ((x ^ y) & 1) * 20) % 360;
          if (c === 'cross') h = (h + (x % 7 === 0 || y % 7 === 0 ? 28 : 0)) % 360;
          if (c === 'rings') {
            const dx = x - cols * 0.5;
            const dy = y - rows * 0.5;
            const r = Math.sqrt(dx * dx + dy * dy);
            h = (h + (Math.floor(r / 4) % 2) * 24) % 360;
          }

          const nMode = noiseModeRef.current;
          const ns = Math.max(0.0001, noiseScaleRef.current);
          if (nMode === 'hue') h = (h + p.noise(x * ns, y * ns, t * 0.2) * 80) % 360;
          return h;
        };

        const zJitter = (x: number, y: number, t: number) => {
          const nMode = noiseModeRef.current;
          const ns = Math.max(0.0001, noiseScaleRef.current);
          if (nMode === 'liquid') return (p.noise(x * ns, y * ns + t * 0.3) - 0.5) * 45;
          if (nMode === 'granular') return (p.noise(x * ns * 2.2, y * ns * 2.2, t * 0.6) - 0.5) * 18;
          return 0;
        };

        const fit = () => {
          const el = hostRef.current;
          if (!el) return;
          const w = el.clientWidth;
          const h = el.clientHeight;
          if (w <= 0 || h <= 0) return;
          p.resizeCanvas(w, h, true);
          p.pixelDensity(1);
          scale = Math.max(8, Math.round(Math.min(w, h) / 60));
          cols = Math.floor(w / scale) + 2;
          rows = Math.floor(h / scale) + 4;
          width3D = cols * scale;
          height3D = rows * scale;
          terrainA = new Float32Array(cols);
          terrainB = new Float32Array(cols);
          for (let i = 0; i < cols; i++) {
            terrainA[i] = 0;
            terrainB[i] = 0;
          }
        };

        p.setup = () => {
          const el = hostRef.current!;
          p.createCanvas(el.clientWidth, el.clientHeight, p.WEBGL);
          p.pixelDensity(1);
          p.colorMode(p.HSB, 360, 100, 100, 255);
          p.noStroke();
          p.frameRate(60);
          p.perspective(p.PI / 3, p.width / p.height, 0.1, 800);
          fit();
          yOffset = 0;
          resetWorldRef.current = () => {
            yOffset = 0;
          };
        };

        p.windowResized = () => {
          fit();
          p.perspective(p.PI / 3, Math.max(1, p.width) / Math.max(1, p.height), 0.1, 800);
        };

        const makeRow = (baseY: number, out: Float32Array) => {
          let xo = 0;
          const ns = Math.max(0.0001, noiseScaleRef.current);
          for (let x = 0; x < cols; x++) {
            const n = p.noise(xo, baseY);
            const z = p.map(n, 0, 1.22, -100, 100);
            out[x] = z;
            xo += ns * 1.6667;
          }
        };

        p.draw = () => {
          yOffset -= speed;
          const startY = yOffset;
          if (!terrainA || !terrainB) return;

          p.background(25);
          p.push();
          p.translate(-width3D * 0.5, -height3D * 0.35, -220);
          p.rotateX(p.PI / 3);

          makeRow(startY, terrainA);
          let rowY = 0;
          for (let y = 0; y < rows - 1; y++) {
            makeRow(startY + (y + 1) * (noiseScaleRef.current * 1.6667 || 0.1), terrainB);
            p.beginShape(p.TRIANGLE_STRIP);
            for (let x = 0; x < cols; x++) {
              const z1 = terrainA[x] + zJitter(x, y, p.frameCount * 0.01);
              const z2 = terrainB[x] + zJitter(x, y + 1, p.frameCount * 0.01);
              const h1 = p.map(z1, -100, 50, 250, 0);
              const h2 = p.map(z2, -100, 50, 250, 0);
              const hh1 = hueFor(x, y, z1, p.frameCount * 0.01);
              const hh2 = hueFor(x, y + 1, z2, p.frameCount * 0.01);
              p.fill(hh1, 60, 90, 220);
              p.vertex(x * scale, rowY * scale, z1);
              p.fill(hh2, 60, 90, 220);
              p.vertex(x * scale, (rowY + 1) * scale, z2);
            }
            p.endShape();
            const tmp = terrainA;
            terrainA = terrainB;
            terrainB = tmp;
            rowY += 1;
          }
          p.pop();
        };
      };

      const inst = new p5mod.default(sketch, hostRef.current as HTMLElement);
      pRef.current = inst;

      if (hostRef.current && !resizeObsRef.current) {
        resizeObsRef.current = new ResizeObserver(() => {
          pRef.current?.windowResized();
        });
        resizeObsRef.current.observe(hostRef.current);
      }
    };

    start();

    return () => {
      mountCancelled = true;
      if (resizeObsRef.current && hostRef.current) {
        resizeObsRef.current.unobserve(hostRef.current);
      }
      if (pRef.current) {
        pRef.current.remove();
        pRef.current = null;
      }
      disposed = true;
    };
  }, []);

  const contrastHex = contrastBW(singleHex);
  const colorName = 'Custom';

  return (
    <div className="w-full h-full flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
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

        <button
          onClick={() => resetWorldRef.current?.()}
          className="px-3 py-1.5 text-sm rounded-lg border bg-red-500 text-white border-red-400 hover:bg-red-400"
        >
          Reset
        </button>
      </div>

      <div
        ref={hostRef}
        className="flex-1 min-h-0 rounded-2xl bg-neutral-900 shadow-xl overflow-hidden"
      />
    </div>
  );
}
