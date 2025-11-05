'use client';

import React, { useEffect, useRef, useState } from 'react';

type SpeedMode = 'Slow' | 'Normal' | 'Fast';

export default function Game2048P5() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const p5ref = useRef<any>(null);

  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const [speed, setSpeed] = useState<SpeedMode>('Normal');

  useEffect(() => {
    let mounted = true;
    let cleanup: (() => void) | null = null;

    const onState = (s: Partial<{ score: number; best: number; autoPlay: boolean; speed: SpeedMode }>) => {
      if (s.score !== undefined) setScore(s.score);
      if (s.best !== undefined) setBest(s.best);
      if (s.autoPlay !== undefined) setAutoPlay(s.autoPlay);
      if (s.speed !== undefined) setSpeed(s.speed);
    };

    const boot = async () => {
      const P5 = (await import('p5')).default;

      const sketch = (p: any) => {
        type Dir = 0 | 1 | 2 | 3;
        type Grid = number[][];
        const N = 4;
        const CHANCE_4 = 0.1;

        const PALETTE = {
          bg: '#0e0f11',
          board: '#1a1c20',
          gridHole: '#22252b',
          cellInner: '#2a2e35',
          overlay: 'rgba(0,0,0,0.55)',
          tileBorder: '#2f343c',
          text: '#e5e7eb',
        };

        let grid: Grid = empty();
        let prevGrid: Grid = empty();
        let afterGrid: Grid = empty();

        let _score = 0;
        let _best = 0;

        let rngSeed = Math.floor(Math.random() * 2 ** 31);

        let animating = false;
        let animT = 0;
        let animDur = 150;
        let moveTransitions: { r0: number; c0: number; r1: number; c1: number; e: number; merged: boolean }[] = [];
        let spawnPulse: { r: number; c: number; t: number } | null = null;
        let mergePulse: number[][] = Array.from({ length: N }, () => Array.from({ length: N }, () => 0));

        let auto = false;
        let autoEveryMs = 70;
        let lastAutoAt = 0;

        let searchDeadline = 0;

        let speedMode: SpeedMode = 'Normal';

        let CW = 0, CH = 0;

        function empty(): Grid { return Array.from({ length: N }, () => Array.from({ length: N }, () => 0)); }
        function clone(g: Grid): Grid { return g.map(r => r.slice()); }
        function valFromExp(e: number) { return e === 0 ? 0 : (1 << e); }

        function rand() { let x = rngSeed || 2463534242; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; rngSeed = x; return ((x >>> 0) % 1_000_000) / 1_000_000; }

        function addRandomTile(g: Grid, force?: { r: number; c: number }) {
          const emp: { r: number; c: number }[] = [];
          for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (g[r][c] === 0) emp.push({ r, c });
          if (!emp.length) return null;
          const s = force ?? emp[Math.floor(rand() * emp.length)];
          g[s.r][s.c] = rand() < CHANCE_4 ? 2 : 1;
          return s;
        }

        function loadBest() { try { const b = localStorage.getItem('g2048_best'); if (b) _best = parseInt(b); } catch { } }
        function saveBest() { try { _best = Math.max(_best, _score); localStorage.setItem('g2048_best', String(_best)); } catch { } }

        function startNewGame() {
          grid = empty(); prevGrid = empty(); afterGrid = empty();
          _score = 0; saveBest();
          moveTransitions = []; spawnPulse = null;
          addRandomTile(grid); addRandomTile(grid);
          onState({ score: _score, best: _best });
        }

        function setSpeed(mode: SpeedMode) {
          speedMode = mode;
          if (mode === 'Slow') { animDur = 260; autoEveryMs = 160; }
          else if (mode === 'Normal') { animDur = 150; autoEveryMs = 70; }
          else { animDur = 95; autoEveryMs = 32; }
          onState({ speed: speedMode });
        }

        function setAutoplay(v: boolean) { auto = v; onState({ autoPlay: auto }); }

        function rotateLeft(g: Grid): Grid {
          const n = g.length, r: Grid = empty();
          for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) r[n - j - 1][i] = g[i][j];
          return r;
        }

        function applyMoveLeft(g: Grid) {
          const out = clone(g);
          const trans: { r0: number; c0: number; r1: number; c1: number; e: number; merged: boolean }[] = [];
          let moved = false;
          let gained = 0;

          const merged: boolean[][] = Array.from({ length: N }, () => Array.from({ length: N }, () => false));

          for (let r = 0; r < N; r++) {
            let targetCol = 0;
            let lastExp = 0;
            for (let c = 0; c < N; c++) {
              const e = out[r][c]; if (!e) continue;
              out[r][c] = 0;
              if (lastExp === e && targetCol > 0 && !merged[r][targetCol - 1]) {
                out[r][targetCol - 1] = lastExp + 1;
                merged[r][targetCol - 1] = true;
                trans.push({ r0: r, c0: c, r1: r, c1: targetCol - 1, e, merged: true });
                gained += (1 << (lastExp + 1));
                lastExp = 0;
                moved = true;
              } else {
                lastExp = e;
                out[r][targetCol] = e;
                trans.push({ r0: r, c0: c, r1: r, c1: targetCol, e, merged: false });
                moved = moved || c !== targetCol;
                targetCol++;
              }
            }
          }
          return { grid: out, moved, transitions: trans, gained };
        }

        function applyMove(g: Grid, dir: Dir) {
          let tmp = clone(g);
          for (let i = 0; i < dir; i++) tmp = rotateLeft(tmp);
          const res = applyMoveLeft(tmp);
          tmp = res.grid;
          for (let i = 0; i < (4 - dir) % 4; i++) tmp = rotateLeft(tmp);
          const transitions = res.transitions.map(t => rotateTransition(t, (4 - dir) % 4));
          return { grid: tmp, moved: res.moved, transitions, gained: res.gained };
        }

        function rotateTransition(t: { r0: number; c0: number; r1: number; c1: number; e: number; merged: boolean }, rot: number) {
          let { r0, c0, r1, c1 } = t;
          for (let i = 0; i < rot; i++) { const nr0 = N - c0 - 1, nc0 = r0, nr1 = N - c1 - 1, nc1 = r1; r0 = nr0; c0 = nc0; r1 = nr1; c1 = nc1; }
          return { r0, c0, r1, c1, e: t.e, merged: t.merged };
        }

        function getEmpties(g: Grid) { const a: { r: number; c: number }[] = []; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (g[r][c] === 0) a.push({ r, c }); return a; }

        function anyMovesAvailable(g: Grid) {
          if (getEmpties(g).length) return true;
          for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
            const e = g[r][c];
            if ((r + 1 < N && g[r + 1][c] === e) || (c + 1 < N && g[r][c + 1] === e)) return true;
          }
          return false;
        }

        function legalMoves(g: Grid): Dir[] {
          const ds: Dir[] = [];
          for (const d of [0, 1, 2, 3] as Dir[]) {
            if (applyMove(g, d).moved) ds.push(d);
          }
          return ds;
        }

        function simulateSpawn(g: Grid): Grid {
          const ng = clone(g);
          addRandomTile(ng);
          return ng;
        }

        const zobrist: number[][][] = (() => {
          let s = Math.floor(Math.random() * 2 ** 31);
          const next = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0); };
          const Z: number[][][] = [];
          for (let r = 0; r < N; r++) {
            Z[r] = [];
            for (let c = 0; c < N; c++) {
              Z[r][c] = [];
              for (let e = 0; e <= 18; e++) Z[r][c][e] = next();
            }
          }
          return Z;
        })();

        function hash(g: Grid) {
          let h = 0 >>> 0;
          for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) h ^= zobrist[r][c][g[r][c]];
          return h >>> 0;
        }

        const ttable = new Map<string, number>();

        const SNAKES: number[][][] = [
          [
            [6, 5, 4, 3],
            [7, 8, 9, 2],
            [12, 11, 10, 1],
            [13, 14, 15, 0],
          ],
          [
            [3, 2, 1, 0],
            [4, 9, 10, 15],
            [5, 8, 11, 14],
            [6, 7, 12, 13],
          ],
          [
            [0, 1, 2, 3],
            [15, 10, 9, 4],
            [14, 11, 8, 5],
            [13, 12, 7, 6],
          ],
          [
            [13, 14, 15, 0],
            [12, 11, 10, 1],
            [7, 8, 9, 2],
            [6, 5, 4, 3],
          ],
        ];

        const GRAD_TL: number[][] = [
          [16, 15, 14, 13],
          [1, 2, 3, 12],
          [0, 5, 4, 11],
          [7, 8, 9, 10],
        ];

        function manhattan(a: [number, number], b: [number, number]) {
          return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
        }

        function evaluate(g: Grid) {
          const n = g.length;

          let empties = 0;
          let maxE = 0, maxPos: [number, number] = [0, 0];
          for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
            const e = g[r][c];
            if (e === 0) { empties++; continue; }
            if (e > maxE) { maxE = e; maxPos = [r, c]; }
          }

          let smooth = 0;
          for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
            const e = g[r][c]; if (!e) continue;
            if (r + 1 < n && g[r + 1][c] !== 0) smooth -= Math.abs(e - g[r + 1][c]);
            if (c + 1 < n && g[r][c + 1] !== 0) smooth -= Math.abs(e - g[r][c + 1]);
          }

          let monoBest = -Infinity;
          for (const SN of SNAKES) {
            let s = 0;
            for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
              s += g[r][c] * SN[r][c];
            }
            if (s > monoBest) monoBest = s;
          }

          let mergePot = 0;
          for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
            const e = g[r][c]; if (!e) continue;
            if (r + 1 < n && g[r + 1][c] === e) mergePot += (1 << e);
            if (c + 1 < n && g[r][c + 1] === e) mergePot += (1 << e);
          }

          let islands = 0;
          const seen = Array.from({ length: n }, () => Array(n).fill(false));
          const inb = (r: number, c: number) => r >= 0 && c >= 0 && r < n && c < n;
          for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
            if (g[r][c] === 0 || seen[r][c]) continue;
            islands++;
            const q = [[r, c]];
            seen[r][c] = true;
            while (q.length) {
              const [rr, cc] = q.pop()!;
              const nb = [[rr + 1, cc], [rr - 1, cc], [rr, cc + 1], [rr, cc - 1]];
              for (const [nr, nc] of nb) {
                if (inb(nr, nc) && g[nr][nc] !== 0 && !seen[nr][nc]) {
                  seen[nr][nc] = true; q.push([nr, nc]);
                }
              }
            }
          }

          const corners: [number, number][] = [[0, 0], [0, n - 1], [n - 1, 0], [n - 1, n - 1]];
          const maxInCorner = corners.some(([r, c]) => g[r][c] === maxE);
          const cornerBonus = maxInCorner ? (1 << maxE) * 0.35 : 0;
          const distTL = manhattan(maxPos, [0, 0]);
          const cornerStick = -(distTL * (1 << Math.max(1, maxE - 3)) * 0.02);

          const emptyW = empties >= 8 ? 900 : empties >= 4 ? 1100 : 1400;

          const score =
            emptyW * empties +
            220 * monoBest +
            45 * smooth +
            0.35 * mergePot +
            cornerBonus + cornerStick -
            260 * islands;

          return score;
        }

        function policyDir(g: Grid): Dir | null {
          const dirs = legalMoves(g);
          if (!dirs.length) return null;

          let best: { d: Dir; s: number } | null = null;
          for (const d of dirs) {
            const { grid: ng, moved, gained } = applyMove(g, d);
            if (!moved) continue;

            const empties = getEmpties(ng).length;
            const maxE = Math.max(...ng.flat());
            const inCorner =
              ng[0][0] === maxE || ng[0][N - 1] === maxE ||
              ng[N - 1][0] === maxE || ng[N - 1][N - 1] === maxE;

            let monoBest = -Infinity;
            for (const SN of SNAKES) {
              let m = 0;
              for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) m += ng[r][c] * SN[r][c];
              if (m > monoBest) monoBest = m;
            }

            const s = empties * 6 + monoBest * 0.02 + (inCorner ? 12 : 0) + (gained > 0 ? 8 : 0);
            if (!best || s > best.s) best = { d, s };
          }
          return best ? best.d : null;
        }

        function rolloutOnce(g0: Grid, maxPlies = 24): number {
          let g = clone(g0);
          let plies = 0;
          while (plies < maxPlies && anyMovesAvailable(g)) {
            const d = policyDir(g);
            if (d == null) break;
            const { grid: ng } = applyMove(g, d);
            g = simulateSpawn(ng);
            plies++;
          }
          return evaluate(g);
        }

        function monteCarloScoreAfterMove(g: Grid, d: Dir, budgetMs: number): number {
          const { grid: ng, moved } = applyMove(g, d);
          if (!moved) return -1e9;
          const start = p.millis();
          let acc = 0, n = 0;
          while (n < 6) { acc += rolloutOnce(simulateSpawn(ng)); n++; }
          while (p.millis() - start < budgetMs) { acc += rolloutOnce(simulateSpawn(ng)); n++; }
          return acc / Math.max(1, n);
        }

        function orderMoves(g: Grid, moves: Dir[]): Dir[] {
          const scored = moves.map(d => {
            const { grid: ng, moved, gained } = applyMove(g, d);
            const e = moved ? evaluate(ng) + gained * 0.6 : -1e12;
            return { d, s: e };
          });
          scored.sort((a, b) => b.s - a.s);
          return scored.map(x => x.d);
        }

        // Track search generation so we can keep a persistent ttable without manual clears
        let TT_GEN = 1;
        const ttableVal = new Map<number, { gen: number, depth: number, val: number, isPlayer: boolean }>();

        function ttLookup(h: number, depth: number, isPlayer: boolean): number | null {
          const rec = ttableVal.get(h);
          if (!rec) return null;
          if (rec.gen !== TT_GEN) return null;
          if (rec.isPlayer !== isPlayer) return null;
          if (rec.depth >= depth) return rec.val;
          return null;
        }
        function ttStore(h: number, depth: number, isPlayer: boolean, val: number) {
          ttableVal.set(h, { gen: TT_GEN, depth, isPlayer, val });
        }

        function quiescenceBonus(prev: Grid, next: Grid, gained: number): number {
          const e0 = getEmpties(prev).length;
          const e1 = getEmpties(next).length;
          let bonus = 0;
          if (gained > 0) bonus += 1;
          if (e1 > e0) bonus += 1;
          return bonus;
        }

        function expectimax(g: Grid, depth: number, isPlayer: boolean, prob: number): number {
          if (p.millis() > searchDeadline || depth <= 0 || !anyMovesAvailable(g) || prob < 0.00005) {
            return evaluate(g);
          }

          const h = hash(g) ^ ((depth << 1) ^ (isPlayer ? 1 : 0));
          const probe = ttLookup(h, depth, isPlayer);
          if (probe !== null) return probe;

          if (isPlayer) {
            let best = -Infinity;
            const moves = orderMoves(g, legalMoves(g));
            if (!moves.length) return evaluate(g);

            for (const d of moves) {
              if (p.millis() > searchDeadline) break;
              const res = applyMove(g, d);
              if (!res.moved) continue;

              const ext = quiescenceBonus(g, res.grid, res.gained);
              const v = expectimax(res.grid, depth - 1 + ext, false, prob);
              if (v > best) best = v;
            }
            const val = best === -Infinity ? evaluate(g) : best;
            ttStore(h, depth, true, val);
            return val;
          } else {
            const empties = getEmpties(g);
            if (!empties.length) return evaluate(g);

            let acc = 0, norm = 0;

            if (empties.length <= 6) {
              const p2 = 0.9 / empties.length;
              const p4 = 0.1 / empties.length;
              for (const e of empties) {
                if (p.millis() > searchDeadline) break;
                const g2 = clone(g); g2[e.r][e.c] = 1;
                acc += p2 * expectimax(g2, depth - 1, true, prob * p2);
                const g4 = clone(g); g4[e.r][e.c] = 2;
                acc += p4 * expectimax(g4, depth - 1, true, prob * p4);
              }
              norm = 1;
            } else {
              const frontier = empties.map(pos => {
                let near = 0;
                const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
                for (const [dr, dc] of nb) {
                  const rr = pos.r + dr, cc = pos.c + dc;
                  if (rr >= 0 && cc >= 0 && rr < N && cc < N && g[rr][cc] !== 0) near++;
                }
                return { pos, w: 1 + near };
              });
              const totalW = frontier.reduce((s, x) => s + x.w, 0);
              const K = Math.min(8, frontier.length);
              for (let i = 0; i < K; i++) {
                if (p.millis() > searchDeadline) break;
                let r = rand() * totalW, pick = frontier[0];
                for (const f of frontier) { r -= f.w; if (r <= 0) { pick = f; break; } }
                const w = pick.w / totalW;
                const p2 = 0.9, p4 = 0.1;
                const g2 = clone(g); g2[pick.pos.r][pick.pos.c] = 1;
                acc += w * p2 * expectimax(g2, depth - 1, true, prob * p2 * w);
                const g4 = clone(g); g4[pick.pos.r][pick.pos.c] = 2;
                acc += w * p4 * expectimax(g4, depth - 1, true, prob * p4 * w);
                norm += w;
              }
            }

            const val = norm > 0 ? acc / norm : evaluate(g);
            ttStore(h, depth, false, val);
            return val;
          }
        }

        function bestMoveBudget(g: Grid, maxMs: number): Dir | null {
          const start = p.millis();
          searchDeadline = start + Math.max(6, maxMs - 2);

          const moves0 = legalMoves(g);
          if (!moves0.length) return null;

          const moves = orderMoves(g, moves0);

          const empties = getEmpties(g).length;
          const maxE = Math.max(...g.flat());
          let baseDepth = empties >= 7 ? 4 : empties >= 4 ? 5 : 6;
          if (maxE >= 11) baseDepth += 1;

          let bestDir: Dir | null = moves[0] ?? null;
          let pv: Dir[] = moves.slice();

          TT_GEN++;

          const emVals = new Map<Dir, number>();
          for (const d of moves) emVals.set(d, -Infinity);

          for (let dpth = baseDepth; dpth <= baseDepth + 2; dpth++) {
            for (const d of pv) {
              if (p.millis() > searchDeadline) break;
              const { grid: ng, moved } = applyMove(g, d);
              if (!moved) { emVals.set(d, -1e12); continue; }
              const v = expectimax(ng, dpth, false, 1);
              emVals.set(d, v);
            }
            // update PV
            pv = [...moves].sort((a, b) => (emVals.get(b)! - emVals.get(a)!));
            bestDir = pv[0] ?? bestDir;
            if (p.millis() > searchDeadline) break;
          }

          return bestDir;
        }

        function shuffle<T>(arr: T[]) {
          for (let i = arr.length - 1; i > 0; i--) {
            const j = (Math.random() * (i + 1)) | 0;
            [arr[i], arr[j]] = [arr[j], arr[i]];
          }
          return arr;
        }

        p.setup = () => {
          p.createCanvas(10, 10);
          p.frameRate(60);
          (p as any).drawingContext.imageSmoothingEnabled = true;

          loadBest();
          setSpeed('Normal');
          startNewGame();
          fitCanvas();

          (p as any).__controls = {
            newGame: startNewGame,
            toggleAuto: () => setAutoplay(!auto),
            cycleSpeed: () => setSpeed(speedMode === 'Slow' ? 'Normal' : speedMode === 'Normal' ? 'Fast' : 'Slow'),
          };
        };

        p.windowResized = () => fitCanvas();
        function fitCanvas() {
          if (!hostRef.current) return;
          const bb = hostRef.current.getBoundingClientRect();
          CW = Math.max(1, Math.floor(bb.width));
          CH = Math.max(1, Math.floor(bb.height));
          p.resizeCanvas(CW, CH);
        }

        let keyLock = false;
        p.keyPressed = () => {
          if (keyLock) return;
          keyLock = true;
          const k = p.key;
          if (k === 'ArrowLeft' || k === 'a' || k === 'A') doMove(0);
          else if (k === 'ArrowUp' || k === 'w' || k === 'W') doMove(1);
          else if (k === 'ArrowRight' || k === 'd' || k === 'D') doMove(2);
          else if (k === 'ArrowDown' || k === 's' || k === 'S') doMove(3);
        };
        p.keyReleased = () => { keyLock = false; };

        let touchStart: { x: number; y: number } | null = null;
        p.touchStarted = () => { touchStart = { x: p.mouseX, y: p.mouseY }; };
        p.touchEnded = () => {
          if (!touchStart) return;
          const dx = p.mouseX - touchStart.x, dy = p.mouseY - touchStart.y;
          const ax = Math.abs(dx), ay = Math.abs(dy);
          if (Math.max(ax, ay) > 20) { if (ax > ay) doMove(dx < 0 ? 0 : 2); else doMove(dy < 0 ? 1 : 3); }
          touchStart = null;
        };

        function doMove(dir: Dir) {
          if (animating) return false;
          prevGrid = clone(grid);
          const { grid: next, moved, transitions, gained } = applyMove(grid, dir);
          if (!moved) return false;
          grid = next;
          _score += gained;
          saveBest();
          onState({ score: _score, best: _best });

          moveTransitions = transitions;
          animating = true;
          animT = 0;
          afterGrid = clone(grid);
          const spawnAt = addRandomTile(afterGrid);
          spawnPulse = spawnAt ? { r: spawnAt.r, c: spawnAt.c, t: 0 } : null;
          return true;
        }

        const tileColors: Record<number, string> = {
          0: '#2b2f37', 2: '#475569', 4: '#6782a8', 8: '#a86b3f', 16: '#bf6a41', 32: '#cf5e48', 64: '#e04a37',
          128: '#bfa34a', 256: '#cbb04b', 512: '#d5ba4c', 1024: '#dfc44d', 2048: '#e8cd4e', 4096: '#e0c04a', 8192: '#d6b446'
        };
        function tileColorFromVal(v: number) { return (tileColors)[v] || ('#1f232a'); }

        function layoutBoard() {
          const pad = Math.floor(Math.min(CW, CH) * 0.04);
          const size = Math.min(CW - pad * 2, CH - pad * 2);
          const x = Math.floor((CW - size) / 2);
          const y = Math.floor((CH - size) / 2);
          return { x, y, size, pad };
        }

        p.draw = () => {
          p.background(PALETTE.bg);

          const { x, y, size } = layoutBoard();
          drawBoard(x, y, size);

          const now = p.millis();
          if (animating) {
            animT += p.deltaTime;
            if (spawnPulse) spawnPulse.t = Math.min(1, animT / animDur);
            if (animT >= animDur) {
              animating = false;
              grid = clone(afterGrid);
              prevGrid = clone(grid);

              for (const m of moveTransitions) {
                if (m.merged) mergePulse[m.r1][m.c1] = 1;
              }

              moveTransitions = [];
            }
          } else {
            if (spawnPulse) { spawnPulse.t += p.deltaTime / 220; if (spawnPulse.t >= 1) spawnPulse = null; }
            if (auto && now - lastAutoAt > autoEveryMs && anyMovesAvailable(grid)) {
              const dir = bestMoveBudget(grid, speedMode === 'Fast' ? 12 : speedMode === 'Normal' ? 18 : 26);
              if (dir !== null) doMove(dir);
              lastAutoAt = now;
            }
          }
          const decay = p.deltaTime / 220;
          for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
            if (mergePulse[r][c] > 0) mergePulse[r][c] = Math.max(0, mergePulse[r][c] - decay);
          }
        };

        function drawBoard(x: number, y: number, size: number) {
          const gap = Math.floor(size * 0.02);
          const tile = Math.floor((size - gap * (N + 1)) / N);
          const ctx = (p as any).drawingContext;

          p.noStroke(); p.fill(PALETTE.board);
          ctx.shadowColor = 'rgba(0,0,0,0.45)';
          ctx.shadowBlur = 24;
          p.rect(x, y, size, size, 18);
          ctx.shadowBlur = 0;

          for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
            const cx = x + gap + c * (tile + gap), cy = y + gap + r * (tile + gap);
            p.noStroke(); p.fill(PALETTE.gridHole); p.rect(cx, cy, tile, tile, 12);
            p.noFill(); p.stroke(PALETTE.cellInner); p.strokeWeight(Math.max(0.5, tile * 0.0125));
            p.rect(cx + 1, cy + 1, tile - 2, tile - 2, 10);
          }

          if (animating) {
            const t = easeOutCubic(Math.min(1, animT / animDur));
            const movingFrom: boolean[][] = [[false, false, false, false], [false, false, false, false], [false, false, false, false], [false, false, false, false]];
            for (const m of moveTransitions) movingFrom[m.r0][m.c0] = true;

            for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
              if (!movingFrom[r][c] && prevGrid[r][c] !== 0) {
                const e = prevGrid[r][c];
                drawTile(e, x + gap + c * (tile + gap), y + gap + r * (tile + gap), tile, 1);
              }
            }
            for (const m of moveTransitions) {
              const sx = x + gap + m.c0 * (tile + gap), sy = y + gap + m.r0 * (tile + gap);
              const ex = x + gap + m.c1 * (tile + gap), ey = y + gap + m.r1 * (tile + gap);
              drawTile(m.e, sx + (ex - sx) * t, sy + (ey - sy) * t, tile, 1);
            }
            if (spawnPulse) {
              const spx = x + gap + spawnPulse.c * (tile + gap);
              const spy = y + gap + spawnPulse.r * (tile + gap);
              const s = 0.5 + 0.5 * t;
              const e = afterGrid[spawnPulse.r][spawnPulse.c];
              drawTile(e, spx, spy, tile, s);
            }
          } else {
            for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
              const e = grid[r][c]; if (!e) continue;
              const pulse = mergePulse[r][c];
              const s = pulse > 0 ? 1 + 0.12 * easeOutBack(pulse) : 1;
              drawTile(e, x + gap + c * (tile + gap), y + gap + r * (tile + gap), tile, s);
            }
          }

          if (!anyMovesAvailable(grid)) {
            p.fill(PALETTE.overlay); p.rect(x, y, size, size, 18);
            p.fill('#ffffff'); p.textAlign(p.CENTER, p.CENTER); p.textStyle(p.BOLD);
            p.textSize(Math.floor(size * 0.08)); p.text('Game Over', x + size / 2, y + size / 2 - 10);
            p.textSize(Math.floor(size * 0.04)); p.text('Click on New Game', x + size / 2, y + size / 2 + 28);
          }
        }

        function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3); }
        function easeOutBack(t: number) {
          const c1 = 1.70158, c3 = c1 + 1;
          return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
        }

        function drawTile(exp: number, x: number, y: number, size: number, scale: number) {
          const s = size * scale;
          const dx = x + (size - s) / 2;
          const dy = y + (size - s) / 2;
          const val = valFromExp(exp);
          const col = tileColorFromVal(val);
          const ctx = (p as any).drawingContext;

          ctx.shadowColor = 'rgba(0,0,0,0.16)'; ctx.shadowBlur = 18;
          p.noStroke(); p.fill(col); p.rect(dx, dy, s, s, 12);
          ctx.shadowBlur = 0;

          p.noFill(); p.stroke(darkenOrLighten(col, 0.12));
          p.strokeWeight(Math.max(0.5, size * 0.012));
          p.rect(dx + 1, dy + 1, s - 2, s - 2, 10);

          p.noStroke(); p.fill(255, 255, 255, 16); p.rect(dx + s * 0.08, dy + s * 0.06, s * 0.84, s * 0.36, 10);

          p.fill(val <= 4 ? ('#e5e7eb') : '#f9f6f2');
          p.textAlign(p.CENTER, p.CENTER);
          const digits = String(val).length;
          const f = digits <= 2 ? s * 0.42 : digits === 3 ? s * 0.38 : digits === 4 ? s * 0.32 : s * 0.28;
          p.textSize(Math.floor(f)); p.textStyle(p.BOLD); p.text(`${val}`, dx + s / 2, dy + s / 2);
        }

        function darkenOrLighten(hex: string, amt: number) {
          const c = p.color(hex);
          const r = p.red(c), g = p.green(c), b = p.blue(c);
          const f = (v: number) => Math.max(0, Math.min(255, v + 255 * amt));
          return p.color(f(r), f(g), f(b));
        }
      };

      if (!mounted || !hostRef.current) return;
      const inst = new P5(sketch, hostRef.current);
      p5ref.current = inst;

      cleanup = () => { try { (p5ref.current as any)?.remove?.(); } catch { } };
    };

    boot();
    return () => { mounted = false; cleanup?.(); };
  }, []);

  const callControls = (fn: (controls: any) => void) => {
    const controls = (p5ref.current as any)?.__controls;
    if (controls) fn(controls);
  };

  return (
    <div className="w-full h-full flex flex-col gap-3" style={{ minHeight: 520 }}>
      <div className="flex items-center gap-2 p-3 rounded-xl border border-zinc-700/50 bg-zinc-900/50 backdrop-blur-sm">
        <button
          onClick={() => callControls(api => api.newGame())}
          className="px-4 py-2 rounded-lg bg-zinc-200 hover:bg-zinc-300/80 text-zinc-900 font-semibold"
        >
          New Game
        </button>

        <button
          onClick={() => callControls(api => api.toggleAuto())}
          className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700/80 border border-zinc-700/20"
        >
          Autoplay: <b>{autoPlay ? 'ON' : 'OFF'}</b>
        </button>

        <button
          onClick={() => callControls(api => api.cycleSpeed())}
          className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700/80 border border-zinc-700/20"
        >
          Speed: <b>{speed}</b>
        </button>

        <div className="ml-auto flex gap-2">
          <div className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700/20 text-center text-sm">
            <div className="opacity-60 text-[11px] leading-none">SCORE</div>
            <div className="font-bold text-base">{score}</div>
          </div>
          <div className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700/20 text-center text-sm">
            <div className="opacity-60 text-[11px] leading-none">BEST</div>
            <div className="font-bold text-base">{best}</div>
          </div>
        </div>
      </div>
      <div
        ref={hostRef}
        className="relative flex-1 rounded-xl overflow-hidden border border-zinc-700/50"
      />
    </div>
  );
}
