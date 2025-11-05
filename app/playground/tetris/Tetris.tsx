'use client';

import React, { useEffect, useRef, useState } from 'react';
import p5 from 'p5';

type PieceKey = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';

const COLS = 10;
const ROWS = 20;

const COLORS: Record<PieceKey, string> = {
  I: '#00f0f0',
  J: '#0000f0',
  L: '#f0a000',
  O: '#f0f000',
  S: '#00f000',
  T: '#a000f0',
  Z: '#f00000',
};

const ORDER: PieceKey[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];

const SHAPES: Record<PieceKey, number[][]> = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
};

function rotateMatrix(m: number[][]): number[][] {
  const h = m.length, w = m[0].length;
  const r: number[][] = Array.from({ length: w }, () => Array(h).fill(0));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) r[x][h - 1 - y] = m[y][x];
  return r;
}
function shapeRotations(key: PieceKey): number[][][] {
  const base = SHAPES[key];
  const r1 = rotateMatrix(base);
  const r2 = rotateMatrix(r1);
  const r3 = rotateMatrix(r2);
  // O-piece effectively has one rotation; keep four for simplicity
  return [base, r1, r2, r3];
}

type ActivePiece = {
  key: PieceKey;
  rot: number;
  x: number;
  y: number;
};

type PlanMove = 'L' | 'R' | 'D' | 'Z' | 'X' | 'SPACE' | 'HOLD';

function rngShuffle<T>(arr: T[], rnd: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function mulberry32(seed: number) {
  return function () {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function TetrisP5() {
  const hostRef = useRef<HTMLDivElement>(null);
  const p5Ref = useRef<p5 | null>(null);
  const [autoplay, setAutoplay] = useState(false);

  useEffect(() => {
    if (!hostRef.current) return;

    let destroyed = false;
    const sketch = (p: p5) => {
      // ------- State -------
      let grid: (PieceKey | 0)[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
      let active: ActivePiece | null = null;
      let hold: PieceKey | null = null;
      let canHold = true;
      let nextQueue: PieceKey[] = [];
      let bag: PieceKey[] = [];
      let rnd = mulberry32(Math.floor(Math.random() * 1e9));

      let score = 0;
      let lines = 0;
      let level = 1;

      let dropMs = 1000;
      let lastFall = 0;
      let softDrop = false;

      let gameOver = false;
      let paused = false;

      let planned: PlanMove[] = [];

      let cw = 640, ch = 640;
      let boardPx = { x: 0, y: 0, s: 24 }; // block size dynamically computed
      const sideW = () => Math.floor(boardPx.s * 6.5);

      // Dellacherie-ish weights
      const W = {
        lines: 0.760666,
        height: -0.510066,
        holes: -0.35663,
        bump: -0.184483,
        wells: -0.1,
      };

      function reset() {
        grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
        active = null;
        hold = null;
        canHold = true;
        nextQueue = [];
        bag = [];
        rnd = mulberry32(Math.floor(Math.random() * 1e9));
        score = 0; lines = 0; level = 1;
        dropMs = levelToMs(level);
        gameOver = false; paused = false;
        planned = [];
        refillNext();
        spawn();
      }

      function levelToMs(lv: number) {
        // Guideline-ish gravity (ms per row), capped
        const t = Math.pow(0.8 - (lv - 1) * 0.007, lv);
        return Math.max(50, t * 1000);
      }

      function refillNext() {
        while (nextQueue.length < 5) {
          if (bag.length === 0) bag = rngShuffle(ORDER, rnd);
          nextQueue.push(bag.pop()!);
        }
      }

      function spawn() {
        canHold = true;
        const key = nextQueue.shift()!;
        refillNext();
        active = {
          key,
          rot: 0,
          x: Math.floor((COLS - shapeRotations(key)[0][0].length) / 2),
          y: -2,
        };
        if (collides(active!)) {
          gameOver = true;
        }
        planned = []; // reset bot plan on new piece
        if (autoplay) planAutoplay();
      }

      function collides(piece: ActivePiece): boolean {
        const shp = shapeRotations(piece.key)[piece.rot];
        for (let y = 0; y < shp.length; y++) {
          for (let x = 0; x < shp[0].length; x++) {
            if (!shp[y][x]) continue;
            const gx = piece.x + x;
            const gy = piece.y + y;
            if (gx < 0 || gx >= COLS || gy >= ROWS) return true;
            if (gy >= 0 && grid[gy][gx]) return true;
          }
        }
        return false;
      }

      function lockPiece() {
        if (!active) return;
        const shp = shapeRotations(active.key)[active.rot];
        for (let y = 0; y < shp.length; y++) {
          for (let x = 0; x < shp[0].length; x++) {
            if (!shp[y][x]) continue;
            const gx = active.x + x;
            const gy = active.y + y;
            if (gy >= 0) grid[gy][gx] = active.key;
          }
        }
        const cleared = clearLines();
        if (cleared > 0) {
          // Simple scoring
          const pts = [0, 100, 300, 500, 800][cleared] * level;
          score += pts;
          lines += cleared;
          const newLevel = 1 + Math.floor(lines / 10);
          if (newLevel !== level) {
            level = newLevel;
            dropMs = levelToMs(level);
          }
        }
        active = null;
        spawn();
      }

      function clearLines(): number {
        let count = 0;
        for (let r = ROWS - 1; r >= 0; r--) {
          if (grid[r].every(c => c)) {
            count++;
            for (let rr = r; rr > 0; rr--) grid[rr] = grid[rr - 1].slice();
            grid[0] = Array(COLS).fill(0);
            r++;
          }
        }
        return count;
      }

      function tryMove(dx: number, dy: number) {
        if (!active) return false;
        const test = { ...active, x: active.x + dx, y: active.y + dy };
        if (!collides(test)) { active = test; return true; }
        return false;
      }

      function tryRotate(dir: 1 | -1) {
        if (!active) return false;
        const nextRot = (active.rot + (dir === 1 ? 1 : 3)) % 4;
        const test0 = { ...active, rot: nextRot };
        // simple kick attempts (not full SRS, but good enough)
        const kicks = [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: -1 }, { x: 0, y: 1 }, { x: -2, y: 0 }, { x: 2, y: 0 }];
        for (const k of kicks) {
          const t = { ...test0, x: test0.x + k.x, y: test0.y + k.y };
          if (!collides(t)) { active = t; return true; }
        }
        return false;
      }

      function hardDrop() {
        if (!active) return;
        while (tryMove(0, 1)) { }
        lockPiece();
      }

      function holdAction() {
        if (!canHold || !active) return;
        const cur = active.key;
        if (hold === null) {
          hold = cur;
          active = null;
          spawn();
        } else {
          const swap = hold;
          hold = cur;
          active = {
            key: swap,
            rot: 0,
            x: Math.floor((COLS - shapeRotations(swap)[0][0].length) / 2),
            y: -2,
          };
          if (collides(active)) gameOver = true;
        }
        canHold = false;
        planned = [];
        if (autoplay) planAutoplay();
      }

      function ghostY(piece: ActivePiece): number {
        const t = { ...piece };
        while (!collides({ ...t, y: t.y + 1 })) t.y++;
        return t.y;
      }

      // ----- Bot -----
      type Eval = { score: number, x: number, rot: number, useHold: boolean };
      function planAutoplay() {
        if (!active) return;
        const opts: Eval[] = [];
        const consider: { key: PieceKey, useHold: boolean }[] = [{ key: active.key, useHold: false }];
        if (canHold) {
          const held = hold ?? nextQueue[0];
          consider.push({ key: held, useHold: true });
        }
        for (const c of consider) {
          const rots = shapeRotations(c.key);
          for (let r = 0; r < 4; r++) {
            const shp = rots[r];
            const minX = -shp[0].length + 1; // conservative sweep
            const maxX = COLS - 1;
            for (let x = minX; x <= maxX; x++) {
              const trial: ActivePiece = { key: c.key, rot: r, x, y: -2 };
              if (collides(trial)) continue;
              const drop = { ...trial };
              while (!collides({ ...drop, y: drop.y + 1 })) drop.y++;
              if (drop.y < -1) continue; // landed above visible, ignore
              const sim = placeOnCopy(grid, drop);
              const linesCleared = countFullRows(sim);
              const sc = evaluate(sim, linesCleared);
              opts.push({ score: sc, x, rot: r, useHold: c.useHold });
            }
          }
        }
        if (opts.length === 0) { planned = ['SPACE']; return; }
        opts.sort((a, b) => b.score - a.score);
        const best = opts[0];
        const plan: PlanMove[] = [];
        if (best.useHold) plan.push('HOLD');
        const start = best.useHold
          ? { key: bestKeyAfterHold(), rot: 0, x: Math.floor((COLS - shapeRotations(bestKeyAfterHold())[0][0].length) / 2), y: -2 }
          : { ...active! };
        // rotate
        const rotDiff = (best.rot - start.rot + 4) % 4;
        for (let i = 0; i < rotDiff; i++) plan.push('X');
        // move horizontally
        const dx = best.x - start.x;
        if (dx < 0) for (let i = 0; i < Math.abs(dx); i++) plan.push('L');
        if (dx > 0) for (let i = 0; i < dx; i++) plan.push('R');
        plan.push('SPACE');
        planned = plan;

        function bestKeyAfterHold(): PieceKey {
          if (!canHold) return active!.key;
          return hold ?? nextQueue[0];
        }
      }

      function placeOnCopy(src: (PieceKey | 0)[][], piece: ActivePiece) {
        const out = src.map(row => row.slice());
        const shp = shapeRotations(piece.key)[piece.rot];
        for (let y = 0; y < shp.length; y++) {
          for (let x = 0; x < shp[0].length; x++) {
            if (!shp[y][x]) continue;
            const gx = piece.x + x;
            const gy = piece.y + y;
            if (gy >= 0 && gy < ROWS && gx >= 0 && gx < COLS) out[gy][gx] = piece.key;
          }
        }
        // simulate line clears
        for (let r = ROWS - 1; r >= 0; r--) {
          if (out[r].every(c => c)) {
            for (let rr = r; rr > 0; rr--) out[rr] = out[rr - 1].slice();
            out[0] = Array(COLS).fill(0);
            r++;
          }
        }
        return out;
      }

      function countFullRows(g: (PieceKey | 0)[][]) {
        let c = 0; for (let r = 0; r < ROWS; r++) if (g[r].every(v => v)) c++;
        return c;
      }

      function evaluate(g: (PieceKey | 0)[][], linesCleared: number) {
        const heights: number[] = Array(COLS).fill(0);
        let holes = 0;
        for (let c = 0; c < COLS; c++) {
          let seenBlock = false;
          for (let r = 0; r < ROWS; r++) {
            if (g[r][c]) { if (!seenBlock) { heights[c] = ROWS - r; seenBlock = true; } }
            else { if (seenBlock) holes++; }
          }
        }
        let bump = 0;
        for (let c = 0; c < COLS - 1; c++) bump += Math.abs(heights[c] - heights[c + 1]);
        let wells = 0;
        for (let c = 0; c < COLS; c++) {
          const l = c === 0 ? Number.MAX_SAFE_INTEGER : heights[c - 1];
          const r = c === COLS - 1 ? Number.MAX_SAFE_INTEGER : heights[c + 1];
          if (heights[c] < l && heights[c] < r) wells += Math.min(l, r) - heights[c];
        }
        const aggHeight = heights.reduce((a, b) => a + b, 0);
        return W.lines * linesCleared + W.height * aggHeight + W.holes * holes + W.bump * bump + W.wells * wells;
      }

      // ------- p5 lifecycle -------
      p.setup = () => {
        const { w, h } = measure();
        cw = w; ch = h;
        p.createCanvas(cw, ch);
        p.frameRate(60);
        reset();
      };

      function measure() {
        const el = hostRef.current!;
        const w = el.clientWidth || 640;
        const h = el.clientHeight || 640;
        return { w, h };
      }

      p.windowResized = () => {
        const { w, h } = measure();
        cw = w; ch = h;
        p.resizeCanvas(cw, ch);
      };

      p.keyPressed = () => {
        if (gameOver) return;
        if (p.key === 'p' || p.key === 'P') { paused = !paused; return; }
        if (paused) return;
        if (!active) return;
        if (p.keyCode === p.LEFT_ARROW) { tryMove(-1, 0); planned = []; if (autoplay) planAutoplay(); }
        else if (p.keyCode === p.RIGHT_ARROW) { tryMove(1, 0); planned = []; if (autoplay) planAutoplay(); }
        else if (p.keyCode === p.DOWN_ARROW) { softDrop = true; }
        else if (p.keyCode === p.UP_ARROW || p.key === 'X' || p.key === 'x') { tryRotate(1); planned = []; if (autoplay) planAutoplay(); }
        else if (p.key === 'z' || p.key === 'Z') { tryRotate(-1); planned = []; if (autoplay) planAutoplay(); }
        else if (p.key === ' ') { hardDrop(); }
        else if (p.key === 'c' || p.key === 'C') { holdAction(); }
        else if (p.key === 'a' || p.key === 'A') { /* toggle from keyboard too */ }
      };
      p.keyReleased = () => {
        if (p.keyCode === p.DOWN_ARROW) softDrop = false;
      };

      function tick(dt: number) {
        if (gameOver || paused) return;
        const interval = softDrop ? Math.max(20, dropMs / 15) : dropMs;
        lastFall += dt;
        if (lastFall >= interval) {
          lastFall = 0;
          if (!tryMove(0, 1)) {
            lockPiece();
          }
        }
        if (autoplay && planned.length && active) {
          // execute ~10 actions per second
          if (p.frameCount % 6 === 0) {
            const act = planned.shift()!;
            if (act === 'HOLD') holdAction();
            else if (act === 'L') tryMove(-1, 0);
            else if (act === 'R') tryMove(1, 0);
            else if (act === 'D') tryMove(0, 1);
            else if (act === 'Z') tryRotate(-1);
            else if (act === 'X') tryRotate(1);
            else if (act === 'SPACE') hardDrop();
          }
        } else if (autoplay && active && planned.length === 0) {
          planAutoplay();
        }
      }

      function layout() {
        // compute block size to fit board + side panel with padding
        const pad = Math.floor(Math.min(cw, ch) * 0.03);
        // Try to allocate ~60–65% width for board, rest for panel
        let s = Math.floor(Math.min((ch - pad * 2) / ROWS, ((cw - pad * 3) * 0.64) / COLS));
        s = Math.max(14, s);
        const boardW = s * COLS;
        const totalW = boardW + pad + sideW();
        let x = Math.floor((cw - totalW) / 2);
        const y = Math.floor((ch - s * ROWS) / 2);
        if (x < pad) x = pad;
        boardPx = { x, y, s };
      }

      function drawBevelBlock(x: number, y: number, key: PieceKey, alpha = 255) {
        const s = boardPx.s;
        const base = p.color(COLORS[key]);
        const b = p.color(p.red(base), p.green(base), p.blue(base), alpha);
        p.noStroke();
        p.fill(b);
        p.rect(x, y, s, s, Math.max(2, s * 0.12));
        // bevel: lighter top/left, darker bottom/right
        const light = p.color(Math.min(255, p.red(base) + 80), Math.min(255, p.green(base) + 80), Math.min(255, p.blue(base) + 80), alpha);
        const dark = p.color(Math.max(0, p.red(base) - 90), Math.max(0, p.green(base) - 90), Math.max(0, p.blue(base) - 90), alpha);
        p.strokeWeight(Math.max(1, s * 0.07));
        p.stroke(light); p.line(x + 1, y + 1, x + s - 1, y + 1); p.line(x + 1, y + 1, x + 1, y + s - 1);
        p.stroke(dark); p.line(x + 1, y + s - 1, x + s - 1, y + s - 1); p.line(x + s - 1, y + 1, x + s - 1, y + s - 1);
        p.noStroke();
      }

      function drawBoard() {
        const s = boardPx.s;
        const w = COLS * s, h = ROWS * s;
        // background
        const bg1 = p.color(20, 20, 28), bg2 = p.color(10, 10, 16);
        for (let i = 0; i < h; i++) {
          const t = i / h;
          const c = p.lerpColor(bg1, bg2, t);
          p.stroke(c); p.line(boardPx.x, boardPx.y + i, boardPx.x + w, boardPx.y + i);
        }
        // subtle grid
        p.stroke(35, 35, 45);
        p.strokeWeight(Math.max(1, s * 0.04));
        for (let c = 0; c <= COLS; c++) {
          const gx = boardPx.x + c * s;
          p.line(gx, boardPx.y, gx, boardPx.y + h);
        }
        for (let r = 0; r <= ROWS; r++) {
          const gy = boardPx.y + r * s;
          p.line(boardPx.x, gy, boardPx.x + w, gy);
        }
        // locked tiles
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            const v = grid[r][c];
            if (!v) continue;
            drawBevelBlock(boardPx.x + c * s, boardPx.y + r * s, v);
          }
        }
        // active + ghost
        if (active) {
          const gy = ghostY(active);
          const shp = shapeRotations(active.key)[active.rot];
          for (let y = 0; y < shp.length; y++) {
            for (let x = 0; x < shp[0].length; x++) {
              if (!shp[y][x]) continue;
              const gx = (active.x + x);
              const gyy = (gy + y);
              if (gyy >= 0) drawBevelBlock(boardPx.x + gx * s, boardPx.y + gyy * s, active.key, 70);
            }
          }
          for (let y = 0; y < shp.length; y++) {
            for (let x = 0; x < shp[0].length; x++) {
              if (!shp[y][x]) continue;
              const gx = (active.x + x);
              const gyy = (active.y + y);
              if (gyy >= 0) drawBevelBlock(boardPx.x + gx * s, boardPx.y + gyy * s, active.key);
            }
          }
        }
      }

      function drawPanel() {
        const s = boardPx.s;
        const x0 = boardPx.x + COLS * s + Math.floor(s * 0.8);
        let y = boardPx.y;
        const title = (t: string) => { p.fill(230); p.noStroke(); p.textSize(Math.floor(s * 0.9)); p.text(t, x0, y); y += Math.floor(s * 1.2); };

        p.textFont('monospace');
        title('NEXT');
        drawMiniQueue(x0, y, nextQueue.slice(0, 5));
        y += Math.floor(s * 8.5);

        title('HOLD');
        drawMiniHold(x0, y, hold);

        y += Math.floor(s * 5.5);
        title('SCORE');
        p.textSize(Math.floor(s * 0.95)); p.fill(200); p.text(`${score}`, x0, y); y += Math.floor(s * 1.2);
        p.fill(230); p.text('LINES', x0, y); y += Math.floor(s * 1.1);
        p.fill(200); p.text(`${lines}`, x0, y); y += Math.floor(s * 1.2);
        p.fill(230); p.text('LEVEL', x0, y); y += Math.floor(s * 1.1);
        p.fill(200); p.text(`${level}`, x0, y); y += Math.floor(s * 1.6);

        p.fill(autoplay ? '#7CFC00' : '#aaa');
        p.text(autoplay ? 'AUTOPLAY ON' : 'AUTOPLAY OFF', x0, y); y += Math.floor(s * 1.2);
        p.fill('#aaa'); p.text(paused ? 'PAUSED' : '', x0, y);
      }

      function drawMiniQueue(x: number, y: number, list: PieceKey[]) {
        const cell = Math.floor(boardPx.s * 0.7);
        let yy = y;
        for (const k of list) {
          drawMiniPiece(x, yy, k, cell);
          yy += Math.floor(cell * 1.6);
        }
      }
      function drawMiniHold(x: number, y: number, k: PieceKey | null) {
        const cell = Math.floor(boardPx.s * 0.9);
        if (k) drawMiniPiece(x, y, k, cell);
        p.noFill(); p.stroke(60); p.rect(x - 4, y - 4, cell * 4, cell * 3, 6);
      }
      function drawMiniPiece(x: number, y: number, key: PieceKey, cell: number) {
        const shp = shapeRotations(key)[0];
        p.noStroke();
        for (let r = 0; r < shp.length; r++) {
          for (let c = 0; c < shp[0].length; c++) {
            if (!shp[r][c]) continue;
            drawBevelBlock(x + c * cell, y + r * cell, key);
          }
        }
      }

      p.draw = () => {
        layout();
        p.background(8, 8, 12);
        tick(p.deltaTime);
        drawBoard();
        drawPanel();

        if (gameOver) {
          p.fill(0, 200); p.noStroke();
          p.rect(0, 0, cw, ch);
          p.fill('#fff'); p.textAlign(p.CENTER, p.CENTER);
          p.textSize(Math.floor(Math.min(cw, ch) * 0.06));
          p.text('GAME OVER', cw / 2, ch / 2 - 20);
          p.textSize(Math.floor(Math.min(cw, ch) * 0.03));
          p.text('Click RESET to play again', cw / 2, ch / 2 + 24);
        }
      };

      // Controls from overlay buttons
      (p as any).__ext = {
        reset,
        togglePause: () => { if (!gameOver) paused = !paused; },
        toggleAutoplay: () => { if (gameOver) return; planned = []; setTimeout(() => { if (active) planAutoplay(); }, 0); },
        hardDrop,
        holdAction,
      };

      // initial state prepared in setup->reset
    };

    const instance = new p5(sketch, hostRef.current);
    p5Ref.current = instance;

    return () => {
      destroyed = true;
      try { instance.remove(); } catch { }
      p5Ref.current = null;
    };
  }, []);

  return (
    <div className="relative w-full h-[80vh] min-h-[520px]">
      <div ref={hostRef} className="absolute inset-0" />
      <div className="absolute top-3 right-3 flex items-center gap-2">
        <button
          onClick={() => {
            if (!p5Ref.current) return;
            setAutoplay(a => !a);
            (p5Ref.current as any).__ext?.toggleAutoplay();
          }}
          className={`px-3 py-2 rounded-md text-sm font-semibold ${autoplay ? 'bg-green-500 text-black' : 'bg-zinc-800 text-zinc-200'} shadow`}
        >
          {autoplay ? 'Autoplay: ON' : 'Autoplay: OFF'}
        </button>
        <button
          onClick={() => (p5Ref.current as any)?.__ext?.togglePause()}
          className="px-3 py-2 rounded-md text-sm font-semibold bg-zinc-800 text-zinc-200 shadow"
        >
          Pause
        </button>
        <button
          onClick={() => (p5Ref.current as any)?.__ext?.reset()}
          className="px-3 py-2 rounded-md text-sm font-semibold bg-zinc-800 text-zinc-200 shadow"
        >
          Reset
        </button>
        <button
          onClick={() => (p5Ref.current as any)?.__ext?.hardDrop()}
          className="px-3 py-2 rounded-md text-sm font-semibold bg-zinc-800 text-zinc-200 shadow"
        >
          Hard Drop
        </button>
        <button
          onClick={() => (p5Ref.current as any)?.__ext?.holdAction()}
          className="px-3 py-2 rounded-md text-sm font-semibold bg-zinc-800 text-zinc-200 shadow"
        >
          Hold
        </button>
      </div>
      <div className="absolute left-3 bottom-3 text-xs text-zinc-300/80 font-mono space-y-1 pointer-events-none">
        <div>← → move • ↓ soft drop • ␣ hard drop</div>
        <div>Z/X rotate • C hold • P pause • A toggle autoplay</div>
      </div>
    </div>
  );
}
