"use client";

import React, { useEffect, useRef } from "react";
import type p5 from "p5";

type GridPos = { c: number; r: number };

type Ghost = {
  c: number;
  r: number;
  x: number;
  y: number;
  color: p5.Color | null;
  path: GridPos[];
  speed: number;
};

const MAZE: string[] = [
  "############################",
  "#............##............#",
  "#.####.#####.##.#####.####.#",
  "#o####.#####.##.#####.####o#",
  "#.####.#####.##.#####.####.#",
  "#..........................#",
  "#.####.##.########.##.####.#",
  "#.####.##.########.##.####.#",
  "#......##....##....##......#",
  "######.##### ## #####.######",
  "######.##### ## #####.######",
  "######.##          ##.######",
  "######.## ###GG### ##.######",
  "      .   #      #   .      ",
  "######.## # #### # ##.######",
  "######.## # #### # ##.######",
  "######.## #      # ##.######",
  "######.## ######## ##.######",
  "#............##............#",
  "#.####.#####.##.#####.####.#",
  "#o..##................##..o#",
  "###.##.##.########.##.##.###",
  "#......##....##....##......#",
  "#.##########.##.##########.#",
  "#..........................#",
  "############################",
];

const COLS = MAZE[0].length;
const ROWS = MAZE.length;

const TILE_MARGIN = 0.15;

const PacmanSketch: React.FC = () => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const p5Ref = useRef<p5 | null>(null);
  const resizeObs = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    if (!hostRef.current) return;

    const sketch = (p: p5) => {
      let cell: number = 16;
      let offsetX = 0;
      let offsetY = 0;

      const pelletSet = new Set<string>();

      const passable = (c: number, r: number) => {
        if (r < 0 || r >= ROWS) return false;
        if (c < 0) c = COLS - 1;
        if (c >= COLS) c = 0;
        const ch = MAZE[r][c];
        return ch !== "#";
      };

      const keyOf = (c: number, r: number) => `${c},${r}`;

      const neighbors = (c: number, r: number): GridPos[] => {
        const dirs = [
          { c: 1, r: 0 },
          { c: -1, r: 0 },
          { c: 0, r: 1 },
          { c: 0, r: -1 },
        ];
        const out: GridPos[] = [];
        for (const d of dirs) {
          let nc = c + d.c;
          let nr = r + d.r;
          if (nc < 0) nc = COLS - 1;
          if (nc >= COLS) nc = 0;
          if (passable(nc, nr)) out.push({ c: nc, r: nr });
        }
        return out;
      };

      const bfs = (start: GridPos, goal: GridPos): GridPos[] => {
        if (start.c === goal.c && start.r === goal.r) return [start];
        const q: GridPos[] = [start];
        const prev = new Map<string, string | null>();
        prev.set(keyOf(start.c, start.r), null);
        while (q.length) {
          const cur = q.shift()!;
          for (const nb of neighbors(cur.c, cur.r)) {
            const k = keyOf(nb.c, nb.r);
            if (prev.has(k)) continue;
            prev.set(k, keyOf(cur.c, cur.r));
            if (nb.c === goal.c && nb.r === goal.r) {
              const path: GridPos[] = [goal];
              let at: string | null = k;
              while (at) {
                const [sc, sr] = at.split(",").map(Number);
                path.push({ c: sc, r: sr });
                at = prev.get(at) ?? null;
              }
              path.reverse();
              return path;
            }
            q.push(nb);
          }
        }
        return [start];
      };

      const player = {
        c: 13,
        r: 17,
        x: 13,
        y: 17,
        dir: { x: 0, y: 0 },
        nextDir: { x: 0, y: 0 },
        speed: 6,
        mouth: 0,
        mouthDir: 1,
      };

      const ghosts: Ghost[] = [
        { c: 13, r: 12, x: 13, y: 12, color: null, path: [], speed: 5 },
        { c: 14, r: 12, x: 14, y: 12, color: null, path: [], speed: 5 },
        { c: 12, r: 12, x: 12, y: 12, color: null, path: [], speed: 5 },
        { c: 13, r: 13, x: 13, y: 13, color: null, path: [], speed: 5 },
      ];

      const layoutPellets = () => {
        pelletSet.clear();
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            const ch = MAZE[r][c];
            if (ch === "." || ch === "o" || ch === " ") {
              pelletSet.add(keyOf(c, r));
            }
          }
        }
      };

      const fitToParent = () => {
        const el = hostRef.current!;
        const w = el.clientWidth;
        const h = el.clientHeight;
        const cw = w;
        const ch = h;
        p.resizeCanvas(cw, ch, true);
        cell = Math.floor(Math.min(cw / COLS, ch / ROWS));
        const totalW = cell * COLS;
        const totalH = cell * ROWS;
        offsetX = Math.floor((cw - totalW) / 2);
        offsetY = Math.floor((ch - totalH) / 2);
      };

      const toPx = (c: number, r: number) => {
        return {
          x: offsetX + c * cell + cell * 0.5,
          y: offsetY + r * cell + cell * 0.5,
        };
      };

      const drawWalls = () => {
        p.push();
        p.noFill();
        p.stroke(0, 120, 255);
        p.strokeWeight(Math.max(2, Math.floor(cell * 0.18)));
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            if (MAZE[r][c] !== "#") continue;
            const x = offsetX + c * cell;
            const y = offsetY + r * cell;
            p.rect(x + TILE_MARGIN * cell, y + TILE_MARGIN * cell, cell * (1 - 2 * TILE_MARGIN), cell * (1 - 2 * TILE_MARGIN), cell * 0.25);
          }
        }
        p.pop();
      };

      const drawPellets = () => {
        p.push();
        p.noStroke();
        for (const k of pelletSet) {
          const [c, r] = k.split(",").map(Number);
          if (MAZE[r][c] === "#") continue;
          const { x, y } = toPx(c, r);
          const big = MAZE[r][c] === "o";
          p.fill(255);
          p.circle(x, y, big ? cell * 0.35 : cell * 0.18);
        }
        p.pop();
      };

      const wrap = (val: number, max: number) => {
        if (val < 0) return max - 0.001;
        if (val >= max) return 0;
        return val;
      };

      const updatePlayer = (dt: number) => {
        const toDir = (dx: number, dy: number) => {
          const nc = Math.round(player.x + Math.sign(dx) * 0.5);
          const nr = Math.round(player.y + Math.sign(dy) * 0.5);
          const tc = dx !== 0 ? nc : Math.round(player.x);
          const tr = dy !== 0 ? nr : Math.round(player.y);
          return passable(tc, tr) ? { x: dx, y: dy } : player.dir;
        };

        if (player.nextDir.x !== player.dir.x || player.nextDir.y !== player.dir.y) {
          const tc = Math.round(player.x);
          const tr = Math.round(player.y);
          const atCenter = Math.abs(player.x - tc) < 0.05 && Math.abs(player.y - tr) < 0.05;
          if (atCenter) {
            const nd = toDir(player.nextDir.x, player.nextDir.y);
            if (nd !== player.dir) player.dir = nd;
          }
        }

        const vx = player.dir.x * (player.speed * dt);
        const vy = player.dir.y * (player.speed * dt);
        let nx = player.x + vx;
        let ny = player.y + vy;

        const tc = Math.round(player.x);
        const tr = Math.round(player.y);
        const aheadC = Math.round(nx);
        const aheadR = Math.round(ny);
        if (!passable(aheadC, tr) && player.dir.x !== 0) nx = player.x;
        if (!passable(tc, aheadR) && player.dir.y !== 0) ny = player.y;

        nx = wrap(nx, COLS);
        ny = Math.max(0, Math.min(ROWS - 1, ny));

        player.x = nx;
        player.y = ny;

        player.mouth += player.mouthDir * 8 * dt;
        if (player.mouth > 0.9) player.mouthDir = -1;
        if (player.mouth < 0.1) player.mouthDir = 1;
      };

      const drawPlayer = () => {
        const { x, y } = toPx(player.x, player.y);
        const ang = Math.atan2(player.dir.y, player.dir.x);
        const open = player.mouth * Math.PI * 0.25;
        p.push();
        p.translate(x, y);
        p.fill(255, 220, 0);
        p.noStroke();
        if (player.dir.x === 0 && player.dir.y === 0) {
          p.circle(0, 0, cell * 0.9);
        } else {
          p.arc(0, 0, cell * 0.9, cell * 0.9, ang + open, ang - open + Math.PI * 2, p.PIE);
        }
        p.pop();
      };

      const recalcGhostPaths = () => {
        const goal: GridPos = { c: Math.round(player.x), r: Math.round(player.y) };
        for (const g of ghosts) {
          const path = bfs({ c: Math.round(g.x), r: Math.round(g.y) }, goal);
          g.path = path.length > 1 ? path.slice(1) : path;
        }
      };

      const updateGhosts = (dt: number) => {
        for (const g of ghosts) {
          if (!g.path.length) continue;
          const tgt = g.path[0];
          const dx = tgt.c + 0.0 - g.x;
          const dy = tgt.r + 0.0 - g.y;
          const len = Math.hypot(dx, dy) || 1;
          const ux = dx / len;
          const uy = dy / len;
          const nx = g.x + ux * g.speed * dt;
          const ny = g.y + uy * g.speed * dt;
          g.x = wrap(nx, COLS);
          g.y = Math.max(0, Math.min(ROWS - 1, ny));
          if (Math.hypot(tgt.c - g.x, tgt.r - g.y) < 0.12) {
            g.c = tgt.c;
            g.r = tgt.r;
            g.x = tgt.c;
            g.y = tgt.r;
            g.path.shift();
          }
        }
      };

      const drawGhost = (g: Ghost) => {
        const { x, y } = toPx(g.x, g.y);
        const bodyW = cell * 0.9;
        const bodyH = cell * 0.9;
        const foot = bodyH * 0.25;
        p.push();
        p.translate(x, y);
        p.noStroke();
        p.fill(g.color!);
        p.arc(0, -foot * 0.2, bodyW, bodyH, Math.PI, 0, p.CHORD);
        p.rectMode(p.CENTER);
        p.rect(0, bodyH * 0.1 - foot * 0.2, bodyW, bodyH * 0.5, cell * 0.12);
        const bumps = 4;
        const step = bodyW / bumps;
        for (let i = 0; i < bumps; i++) {
          p.circle(-bodyW / 2 + step * (i + 0.5), bodyH * 0.35, foot);
        }
        p.fill(255);
        p.ellipse(-bodyW * 0.18, 0, cell * 0.22, cell * 0.28);
        p.ellipse(bodyW * 0.18, 0, cell * 0.22, cell * 0.28);
        p.fill(50, 80, 255);
        p.circle(-bodyW * 0.18, 0, cell * 0.12);
        p.circle(bodyW * 0.18, 0, cell * 0.12);
        p.pop();
      };

      p.setup = () => {
        const el = hostRef.current!;
        const w = el.clientWidth || 640;
        const h = el.clientHeight || 480;
        p.createCanvas(w, h);
        fitToParent();
        layoutPellets();
        ghosts[0].color = p.color(255, 0, 0);
        ghosts[1].color = p.color(255, 184, 255);
        ghosts[2].color = p.color(0, 255, 255);
        ghosts[3].color = p.color(255, 184, 82);
      };

      let last = 0;
      let pathTimer = 0;

      p.draw = () => {
        const now = p.millis() * 0.001;
        const dt = Math.min(0.05, now - last || 0.016);
        last = now;

        pathTimer += dt;
        if (pathTimer > 0.2) {
          recalcGhostPaths();
          pathTimer = 0;
        }

        p.background(0);
        drawWalls();
        drawPellets();
        updatePlayer(dt);
        updateGhosts(dt);
        drawPlayer();
        for (const g of ghosts) drawGhost(g);
      };

      p.keyPressed = () => {
        if (p.keyCode === p.LEFT_ARROW || p.key === "a") player.nextDir = { x: -1, y: 0 };
        else if (p.keyCode === p.RIGHT_ARROW || p.key === "d") player.nextDir = { x: 1, y: 0 };
        else if (p.keyCode === p.UP_ARROW || p.key === "w") player.nextDir = { x: 0, y: -1 };
        else if (p.keyCode === p.DOWN_ARROW || p.key === "s") player.nextDir = { x: 0, y: 1 };
      };

      p.windowResized = () => {
        fitToParent();
      };
    };

    const P5Ctor = require("p5").default as typeof p5;
    const inst = new P5Ctor(sketch, hostRef.current);
    p5Ref.current = inst;

    resizeObs.current = new ResizeObserver(() => {
      if (p5Ref.current) p5Ref.current.windowResized();
    });
    resizeObs.current.observe(hostRef.current);

    return () => {
      resizeObs.current?.disconnect();
      resizeObs.current = null;
      p5Ref.current?.remove();
      p5Ref.current = null;
    };
  }, []);

  return <div ref={hostRef} style={{ width: "100%", height: "100%", position: "relative" }} />;
};

export default PacmanSketch;
