'use client';

import React, { useEffect, useRef, useState } from 'react';
import p5 from 'p5';

const ICE_OFF_WHITE = '#EAF1EE';
const DARK_CYAN = '#0E4C5A';

const GRID_COLS = 30;
const BALL_RADIUS_CELLS = 0.5;

function randBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export default function BinaryPong() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const p5Ref = useRef<p5 | null>(null);

  const [speed, setSpeed] = useState(1.25);
  const [paused, setPaused] = useState(false);
  const [winner, setWinner] = useState<'ICE' | 'CYAN' | null>(null);
  const [scores, setScores] = useState({ ice: 0, cyan: 0 });
  const [canvasSize, setCanvasSize] = useState(600);

  useEffect(() => {
    if (!hostRef.current) return;

    let sketch: p5;

    const createSketch = (p: p5) => {
      let canvasSizeLocal = 600;
      let cellSize = 10;
      let grid: number[][] = [];

      type Ball = {
        x: number;
        y: number;
        vx: number;
        vy: number;
        colorIndex: 0 | 1;
        lastHitC: number | null;
        lastHitR: number | null;
      };

      const balls: Ball[] = [];
      let baseSpeedPxPerFrame = 4.5;
      let speedMult = 1.0;
      let isPaused = false;

      const toCell = (px: number) => Math.floor(px / cellSize);

      function computeCanvasSize() {
        if (!hostRef.current) return;
        const rect = hostRef.current.getBoundingClientRect();
        const maxSq = Math.max(200, Math.min(rect.width, rect.height));
        const cell = Math.max(6, Math.floor(maxSq / GRID_COLS));
        canvasSizeLocal = cell * GRID_COLS;
        cellSize = cell;
        setCanvasSize(canvasSizeLocal);
      }

      function resetGrid() {
        grid = Array.from({ length: GRID_COLS }, (_, c) =>
          Array.from({ length: GRID_COLS }, () => (c < GRID_COLS / 2 ? 0 : 1))
        );
      }

      function randomUnitVector(): { x: number; y: number } {
        const a = Math.random() * Math.PI * 2;
        return { x: Math.cos(a), y: Math.sin(a) };
      }

      function placeBalls() {
        balls.length = 0;
        const midYMin = canvasSizeLocal * 0.3;
        const midYMax = canvasSizeLocal * 0.7;

        const leftX = randBetween(canvasSizeLocal * 0.18, canvasSizeLocal * 0.32);
        const leftY = randBetween(midYMin, midYMax);
        let v1 = randomUnitVector();
        balls.push({
          x: leftX,
          y: leftY,
          vx: v1.x * baseSpeedPxPerFrame,
          vy: v1.y * baseSpeedPxPerFrame,
          colorIndex: 1,
          lastHitC: null,
          lastHitR: null,
        });

        const rightX = randBetween(canvasSizeLocal * 0.68, canvasSizeLocal * 0.82);
        const rightY = randBetween(midYMin, midYMax);
        let v2 = randomUnitVector();
        balls.push({
          x: rightX,
          y: rightY,
          vx: v2.x * baseSpeedPxPerFrame,
          vy: v2.y * baseSpeedPxPerFrame,
          colorIndex: 0,
          lastHitC: null,
          lastHitR: null,
        });
      }

      function checkWinner(): 0 | 1 | -1 {
        let ice = 0;
        let cyan = 0;
        for (let c = 0; c < GRID_COLS; c++) {
          for (let r = 0; r < GRID_COLS; r++) {
            if (grid[c][r] === 0) ice++;
            else cyan++;
          }
        }
        if (ice === GRID_COLS * GRID_COLS) return 0;
        if (cyan === GRID_COLS * GRID_COLS) return 1;
        return -1;
      }

      function drawGrid() {
        for (let c = 0; c < GRID_COLS; c++) {
          for (let r = 0; r < GRID_COLS; r++) {
            p.fill(grid[c][r] === 0 ? ICE_OFF_WHITE : DARK_CYAN);
            p.rect(c * cellSize, r * cellSize, cellSize + 1, cellSize + 1);
          }
        }
      }

      function flipCell(c: number, r: number) {
        if (c < 0 || r < 0 || c >= GRID_COLS || r >= GRID_COLS) return;
        grid[c][r] = grid[c][r] === 0 ? 1 : 0;
      }

      function collideAndFlipSingle(ball: Ball, dx: number, dy: number) {
        const radiusPx = BALL_RADIUS_CELLS * cellSize;
        const nx = ball.x + dx;
        const ny = ball.y + dy;

        let hitC: number | null = null;
        let hitR: number | null = null;
        let reflectX = false;
        let reflectY = false;

        const minC = Math.max(0, toCell(nx - radiusPx));
        const maxC = Math.min(GRID_COLS - 1, toCell(nx + radiusPx));
        const minR = Math.max(0, toCell(ny - radiusPx));
        const maxR = Math.min(GRID_COLS - 1, toCell(ny + radiusPx));

        const cx = Math.sign(dx);
        const cy = Math.sign(dy);

        const candidates: Array<[number, number]> = [];
        for (let c = minC; c <= maxC; c++) {
          for (let r = minR; r <= maxR; r++) {
            candidates.push([c, r]);
          }
        }

        candidates.sort((a, b) => {
          const ax = (a[0] + 0.5) * cellSize;
          const ay = (a[1] + 0.5) * cellSize;
          const bx = (b[0] + 0.5) * cellSize;
          const by = (b[1] + 0.5) * cellSize;
          const da =
            (ax - ball.x) * (dx || 1e-6) +
            (ay - ball.y) * (dy || 1e-6);
          const db =
            (bx - ball.x) * (dx || 1e-6) +
            (by - ball.y) * (dy || 1e-6);
          return da - db;
        });

        const r2 = radiusPx * radiusPx;
        for (const [c, r] of candidates) {
          if (grid[c][r] !== ball.colorIndex) continue;
          if (ball.lastHitC === c && ball.lastHitR === r) continue;

          const cxp = (c + 0.5) * cellSize;
          const cyp = (r + 0.5) * cellSize;

          const nearestX = Math.max(c * cellSize, Math.min(nx, (c + 1) * cellSize));
          const nearestY = Math.max(r * cellSize, Math.min(ny, (r + 1) * cellSize));
          const dxn = nearestX - nx;
          const dyn = nearestY - ny;
          const dist2 = dxn * dxn + dyn * dyn;

          if (dist2 <= r2) {
            hitC = c;
            hitR = r;

            if (Math.abs(dxn) > Math.abs(dyn)) reflectX = true;
            else if (Math.abs(dyn) > Math.abs(dxn)) reflectY = true;
            else {
              if (Math.abs(dx) >= Math.abs(dy)) reflectX = true;
              else reflectY = true;
            }
            break;
          }
        }

        if (hitC !== null && hitR !== null) {
          flipCell(hitC, hitR);
          ball.lastHitC = hitC;
          ball.lastHitR = hitR;
          if (reflectX) ball.vx = -ball.vx;
          if (reflectY) ball.vy = -ball.vy;
          return true;
        } else {
          ball.lastHitC = null;
          ball.lastHitR = null;
          return false;
        }
      }

      function boundaryBounce(ball: Ball, dx: number, dy: number) {
        const radiusPx = BALL_RADIUS_CELLS * cellSize;
        const minXY = radiusPx;
        const maxXY = canvasSizeLocal - radiusPx;
        const nx = ball.x + dx;
        const ny = ball.y + dy;
        let blockX = false;
        let blockY = false;

        if (nx < minXY) { ball.vx = Math.abs(ball.vx); ball.x = minXY; blockX = true; }
        else if (nx > maxXY) { ball.vx = -Math.abs(ball.vx); ball.x = maxXY; blockX = true; }

        if (ny < minXY) { ball.vy = Math.abs(ball.vy); ball.y = minXY; blockY = true; }
        else if (ny > maxXY) { ball.vy = -Math.abs(ball.vy); ball.y = maxXY; blockY = true; }

        return { blockX, blockY };
      }

      function drawBalls() {
        const radiusPx = BALL_RADIUS_CELLS * cellSize;
        for (const b of balls) {
          p.noStroke();
          p.fill(b.colorIndex === 0 ? ICE_OFF_WHITE : DARK_CYAN);
          p.circle(b.x, b.y, radiusPx * 2);
        }
      }

      function step() {
        for (const b of balls) {
          const totalDx = b.vx * speedMult;
          const totalDy = b.vy * speedMult;
          const totalDist = Math.hypot(totalDx, totalDy);
          const maxStep = cellSize * 0.25;
          const subSteps = Math.max(1, Math.ceil(totalDist / maxStep));

          for (let s = 0; s < subSteps; s++) {
            const dx = totalDx / subSteps;
            const dy = totalDy / subSteps;

            const { blockX, blockY } = boundaryBounce(b, dx, dy);
            const hit = collideAndFlipSingle(b, blockX ? 0 : dx, blockY ? 0 : dy);

            b.x += hit ? 0 : (blockX ? 0 : dx);
            b.y += hit ? 0 : (blockY ? 0 : dy);

            if (hit) break;
          }
        }
      }

      function resetAll() {
        computeCanvasSize();
        p.resizeCanvas(canvasSizeLocal, canvasSizeLocal);
        resetGrid();
        placeBalls();
        balls.forEach(b => {
          const jitter = 0.35;
          b.vx *= randBetween(1 - jitter, 1 + jitter);
          b.vy *= randBetween(1 - jitter, 1 + jitter);
          b.lastHitC = null;
          b.lastHitR = null;
        });
      }

      p.setup = () => {
        computeCanvasSize();
        const cnv = p.createCanvas(canvasSizeLocal, canvasSizeLocal);
        cnv.parent(hostRef.current!);
        p.pixelDensity(1);
        p.frameRate(60);
        p.noStroke();
        resetGrid();
        placeBalls();
      };

      p.draw = () => {
        p.background(0);
        drawGrid();

        if (!isPaused && winner === null) {
          step();
        }

        drawBalls();

        let ice = 0, cyan = 0;
        for (let c = 0; c < GRID_COLS; c++) {
          for (let r = 0; r < GRID_COLS; r++) {
            if (grid[c][r] === 0) ice++; else cyan++;
          }
        }
        setScores({ ice, cyan });

        const w = checkWinner();
        if (w !== -1 && winner === null) {
          setWinner(w === 0 ? 'ICE' : 'CYAN');
        }
      };

      const ro = new ResizeObserver(() => {
        computeCanvasSize();
        p.resizeCanvas(canvasSizeLocal, canvasSizeLocal);
      });
      if (hostRef.current) ro.observe(hostRef.current!);

      (p as any).__resetAll = resetAll;
      (p as any).__setBaseSpeed = (v: number) => { baseSpeedPxPerFrame = v; };
      (p as any).__setPaused = (v: boolean) => { isPaused = v; };
      (p as any).__setSpeedMult = (v: number) => { speedMult = v; };

      return () => {
        ro.disconnect();
      };
    };

    sketch = new p5(createSketch);
    p5Ref.current = sketch;

    return () => {
      if (p5Ref.current) {
        p5Ref.current.remove();
        p5Ref.current = null;
      }
    };
  }, []);

  useEffect(() => {
    (p5Ref.current as any)?.__setSpeedMult?.(speed);
  }, [speed]);

  const onRestart = () => {
    setWinner(null);
    setPaused(false);
    (p5Ref.current as any)?.__setPaused?.(false);
    (p5Ref.current as any)?.__resetAll?.();
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="relative flex items-center px-3 py-3">
        <div className="flex-1 h-px bg-zinc-800/60 rounded-full mr-3" />
        <div className="mx-auto flex items-center gap-3">
          <button
            onClick={() => {
              const v = !paused;
              (p5Ref.current as any)?.__setPaused?.(v);
              setPaused(v);
            }}
            className="px-3 py-1.5 rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-zinc-200 text-zinc-900 text-xs shadow"
          >
            {paused ? 'Resume' : 'Pause'}
          </button>
          <button
            onClick={onRestart}
            className="px-3 py-1.5 rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-zinc-200 text-zinc-900 text-xs shadow"
          >
            Restart
          </button>

          <div className="flex items-center gap-2 pl-2 ml-2 border-l border-zinc-800/60">
            <label className="text-zinc-300 text-xs">Speed</label>
            <input
              type="range"
              min={0.25}
              max={20}
              step={0.1}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="accent-zinc-200 w-40"
              aria-label="Speed multiplier"
            />
          </div>
        </div>
        <div className="hidden md:block flex-1 h-px bg-zinc-800/60 rounded-full ml-3" />
      </div>

      <div className="w-full pb-2">
        <div
          className="mx-auto flex items-center justify-center gap-4"
          style={{ width: canvasSize, maxWidth: '100%' }}
        >
          <div className="relative w-1/2 max-w-[420px] h-10 rounded-lg overflow-hidden border border-zinc-800/70">
            <div className="absolute inset-y-0 left-0 w-1/2 flex items-center justify-center font-semibold"
              style={{ color: DARK_CYAN, background: ICE_OFF_WHITE }}>
              Ice: {scores.ice}
            </div>
            <div className="absolute inset-y-0 right-0 w-1/2 flex items-center justify-center font-semibold"
              style={{ color: ICE_OFF_WHITE, background: DARK_CYAN }}>
              Cyan: {scores.cyan}
            </div>
          </div>
        </div>
      </div>

      <div ref={hostRef} className="relative flex-1 grid place-items-center p-2">
        {winner && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="pointer-events-auto bg-zinc-900/70 backdrop-blur rounded-2xl px-6 py-5 border border-zinc-700/60 text-center shadow-2xl">
              <div className="text-zinc-200 text-lg font-semibold mb-1">
                {winner === 'ICE' ? 'Ice Off-White wins!' : 'Dark Cyan wins!'}
              </div>
              <div className="text-zinc-400 text-sm mb-4">the board has been fully conquered</div>
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={onRestart}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-700/60 text-zinc-100 text-xs"
                >
                  Play again
                </button>
                <button
                  onClick={() => {
                    const v = !paused;
                    (p5Ref.current as any)?.__setPaused?.(v);
                    setPaused(v);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-700/60 text-zinc-100 text-xs"
                >
                  {paused ? 'Resume' : 'Pause'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
