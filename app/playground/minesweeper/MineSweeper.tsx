"use client";

import React, { useEffect, useRef } from "react";
import p5 from "p5";

// Classic Minesweeper levels
type Level = { name: string; cols: number; rows: number; mines: number };
const LEVELS: Level[] = [
  { name: "Beginner", cols: 9, rows: 9, mines: 10 },
  { name: "Intermediate", cols: 16, rows: 16, mines: 40 },
  { name: "Expert", cols: 30, rows: 16, mines: 99 },
];

// Number colors like the original (approx.)
const NUM_COLORS: Record<number, [number, number, number]> = {
  1: [0, 0, 255],
  2: [0, 128, 0],
  3: [255, 0, 0],
  4: [0, 0, 128],
  5: [128, 0, 0],
  6: [0, 128, 128],
  7: [0, 0, 0],
  8: [128, 128, 128],
};

type Cell = {
  mine: boolean;
  r: number;
  c: number;
  adj: number;
  revealed: boolean;
  flagged: boolean;
  question: boolean;
};

type GameState = "ready" | "playing" | "dead" | "won";

type SketchConfig = {
  levelIndex: number;
  auto: boolean;
};

function useP5Minesweeper(config: SketchConfig, host: HTMLDivElement) {
  const instance = new p5((p) => {
    // --- Layout constants for classic look ---
    const TILE = 16; // classic tile size in design pixels
    const PAD = 6; // outer padding
    const BEVEL = 2; // border thickness per ridge

    // base (design) sizes; we scale entire UI to fit wrapper
    let level = LEVELS[config.levelIndex] ?? LEVELS[1];
    let cols = level.cols;
    let rows = level.rows;
    let minesTarget = level.mines;

    const headerH = 40; // classic header panel height
    const boardW = cols * TILE;
    const boardH = rows * TILE;
    const baseW = PAD * 2 + BEVEL * 4 + boardW;
    const baseH = PAD * 2 + BEVEL * 4 + headerH + 4 + boardH; // +4 gap under header

    // runtime sizes
    let scaleFactor = 1;
    let cw = baseW;
    let ch = baseH;

    // game state
    let grid: Cell[] = [];
    let placedMines = 0;
    let flagsLeft = minesTarget;
    let revealedCount = 0;
    let state: GameState = "ready";
    let firstRevealDone = false;
    let startMillis = 0;
    let elapsed = 0; // seconds

    // UI interaction
    let hovered: { r: number; c: number } | null = null;
    let pressLeft = false;
    let pressRight = false;
    let autoPlay = config.auto;
    let autoTickCooldown = 0;

    // convenience indices
    const idx = (r: number, c: number) => r * cols + c;

    function neighbors(r: number, c: number) {
      const out: [number, number][] = [];
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const rr = r + dr;
          const cc = c + dc;
          if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) out.push([rr, cc]);
        }
      }
      return out;
    }

    function reset() {
      grid = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          grid.push({ mine: false, r, c, adj: 0, revealed: false, flagged: false, question: false });
        }
      }
      placedMines = 0;
      flagsLeft = minesTarget;
      revealedCount = 0;
      state = "ready";
      firstRevealDone = false;
      startMillis = 0;
      elapsed = 0;
    }

    function computeAdj() {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cell = grid[idx(r, c)];
          if (cell.mine) {
            cell.adj = 9;
          } else {
            let a = 0;
            for (const [rr, cc] of neighbors(r, c)) if (grid[idx(rr, cc)].mine) a++;
            cell.adj = a;
          }
        }
      }
    }

    function placeMinesSafe(firstR: number, firstC: number) {
      const forbidden = new Set<number>();
      forbidden.add(idx(firstR, firstC));
      for (const [rr, cc] of neighbors(firstR, firstC)) forbidden.add(idx(rr, cc));
      let need = minesTarget;
      while (need > 0) {
        const r = Math.floor(p.random(rows));
        const c = Math.floor(p.random(cols));
        const k = idx(r, c);
        if (forbidden.has(k)) continue;
        const cell = grid[k];
        if (!cell.mine) {
          cell.mine = true;
          need--;
        }
      }
      placedMines = minesTarget;
      computeAdj();
    }

    function reveal(r: number, c: number) {
      const cell = grid[idx(r, c)];
      if (cell.revealed || cell.flagged || state === "dead" || state === "won") return;
      if (!firstRevealDone) {
        placeMinesSafe(r, c);
        firstRevealDone = true;
        startMillis = p.millis();
      }
      cell.revealed = true;
      revealedCount++;
      if (cell.mine) {
        state = "dead";
        return;
      }
      if (cell.adj === 0) floodReveal(r, c);
      checkWin();
    }

    function floodReveal(r: number, c: number) {
      const stack: [number, number][] = [[r, c]];
      const seen = new Set<number>();
      while (stack.length) {
        const [rr, cc] = stack.pop()!;
        for (const [nr, nc] of neighbors(rr, cc)) {
          const k = idx(nr, nc);
          if (seen.has(k)) continue;
          const n = grid[k];
          if (!n.revealed && !n.flagged && !n.mine) {
            n.revealed = true;
            revealedCount++;
            if (n.adj === 0) stack.push([nr, nc]);
          }
          seen.add(k);
        }
      }
    }

    function toggleFlag(r: number, c: number) {
      const cell = grid[idx(r, c)];
      if (cell.revealed || state === "dead" || state === "won") return;
      if (cell.flagged) {
        cell.flagged = false;
        flagsLeft++;
      } else {
        if (flagsLeft <= 0) return;
        cell.flagged = true;
        flagsLeft--;
      }
    }

    function chord(r: number, c: number) {
      const cell = grid[idx(r, c)];
      if (!cell.revealed || cell.adj <= 0) return;
      let flags = 0;
      const unknowns: [number, number][] = [];
      for (const [rr, cc] of neighbors(r, c)) {
        const n = grid[idx(rr, cc)];
        if (n.flagged) flags++;
        else if (!n.revealed) unknowns.push([rr, cc]);
      }
      if (flags === cell.adj) {
        for (const [rr, cc] of unknowns) reveal(rr, cc);
      }
    }

    function checkWin() {
      const safeTiles = cols * rows - minesTarget;
      if (revealedCount >= safeTiles && state !== "dead") state = "won";
    }

    // --- Solver (deterministic + small-cluster enumeration + probability) ---
    function solverStep(): boolean {
      if (state === "dead" || state === "won") return false;
      if (!firstRevealDone) {
        const center = [Math.floor(rows / 2), Math.floor(cols / 2)];
        reveal(center[0], center[1]);
        return true;
      }

      let acted = false;
      // Basic rules
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cell = grid[idx(r, c)];
          if (!cell.revealed || cell.adj <= 0) continue;
          let flagCount = 0;
          const unknowns: [number, number][] = [];
          for (const [rr, cc] of neighbors(r, c)) {
            const n = grid[idx(rr, cc)];
            if (n.flagged) flagCount++;
            else if (!n.revealed) unknowns.push([rr, cc]);
          }
          if (unknowns.length === 0) continue;
          if (flagCount === cell.adj) {
            for (const [rr, cc] of unknowns) {
              reveal(rr, cc);
              acted = true;
            }
          } else if (flagCount + unknowns.length === cell.adj) {
            for (const [rr, cc] of unknowns) {
              const n = grid[idx(rr, cc)];
              if (!n.flagged) {
                toggleFlag(rr, cc);
                acted = true;
              }
            }
          }
        }
      }
      if (acted) return true;

      // Build frontier constraints
      type FrontierCell = { r: number; c: number; adj: number; flags: number; unknowns: [number, number][] };
      const frontier: FrontierCell[] = [];
      const unknownSet = new Set<number>();
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cell = grid[idx(r, c)];
          if (!cell.revealed || cell.adj <= 0) continue;
          let flags = 0;
          const unknowns: [number, number][] = [];
          for (const [rr, cc] of neighbors(r, c)) {
            const n = grid[idx(rr, cc)];
            if (n.flagged) flags++;
            else if (!n.revealed) {
              unknowns.push([rr, cc]);
              unknownSet.add(idx(rr, cc));
            }
          }
          if (unknowns.length > 0) frontier.push({ r, c, adj: cell.adj, flags, unknowns });
        }
      }

      const unknownList = Array.from(unknownSet);
      if (frontier.length === 0 && unknownList.length) {
        // No constraints visible; pick a corner preference to reduce risk
        const corners: [number, number][] = [
          [0, 0],
          [0, cols - 1],
          [rows - 1, 0],
          [rows - 1, cols - 1],
        ];
        for (const [rr, cc] of corners) {
          const n = grid[idx(rr, cc)];
          if (!n.revealed && !n.flagged) {
            reveal(rr, cc);
            return true;
          }
        }
        // Otherwise choose uniformly among unknowns
        const pick = unknownList[Math.floor(p.random(unknownList.length))];
        const rr = Math.floor(pick / cols);
        const cc = pick % cols;
        reveal(rr, cc);
        return true;
      }

      // Partition unknowns into clusters connected by shared constraints
      const uNeighbors = new Map<number, Set<number>>();
      for (const f of frontier) {
        const set = f.unknowns.map(([rr, cc]) => idx(rr, cc));
        for (const a of set) {
          if (!uNeighbors.has(a)) uNeighbors.set(a, new Set());
          for (const b of set) if (a !== b) uNeighbors.get(a)!.add(b);
        }
      }
      const clusters: number[][] = [];
      const visited = new Set<number>();
      for (const u of unknownList) {
        if (visited.has(u)) continue;
        const stack = [u];
        const comp: number[] = [];
        visited.add(u);
        while (stack.length) {
          const x = stack.pop()!;
          comp.push(x);
          for (const y of uNeighbors.get(x) ?? []) {
            if (!visited.has(y)) {
              visited.add(y);
              stack.push(y);
            }
          }
        }
        clusters.push(comp);
      }

      // For each cluster, attempt exact enumeration if small
      type Prob = { k: number; probMine: number };
      const decisions: Prob[] = [];

      for (const comp of clusters) {
        if (comp.length <= 12) {
          // constraints affecting this component
          const relevant = frontier.filter((f) => f.unknowns.some(([rr, cc]) => comp.includes(idx(rr, cc))));
          const compIndex = new Map<number, number>();
          comp.forEach((k, i) => compIndex.set(k, i));

          // gather per-constraint masks
          const masks = relevant.map((f) => {
            const mask = new Array(comp.length).fill(0);
            let totalUnknownHere = 0;
            for (const [rr, cc] of f.unknowns) {
              const k = idx(rr, cc);
              if (compIndex.has(k)) {
                mask[compIndex.get(k)!] = 1;
                totalUnknownHere++;
              }
            }
            return { mask, need: f.adj - f.flags };
          });

          const n = comp.length;
          const tally = new Array(n).fill(0);
          let worlds = 0;

          function valid(assign: number[]) {
            for (const { mask, need } of masks) {
              let sum = 0;
              for (let i = 0; i < n; i++) if (mask[i]) sum += assign[i];
              if (sum < 0 || sum > need) return false;
            }
            for (const { mask, need } of masks) {
              let sum = 0;
              for (let i = 0; i < n; i++) if (mask[i]) sum += assign[i];
              if (sum !== need) return false;
            }
            return true;
          }

          function backtrack(i: number, assign: number[]) {
            if (i === n) {
              if (valid(assign)) {
                worlds++;
                for (let j = 0; j < n; j++) tally[j] += assign[j];
              }
              return;
            }
            assign[i] = 0;
            backtrack(i + 1, assign);
            assign[i] = 1;
            backtrack(i + 1, assign);
          }
          backtrack(0, new Array(n).fill(0));

          if (worlds > 0) {
            for (let i = 0; i < n; i++) {
              decisions.push({ k: comp[i], probMine: tally[i] / worlds });
            }
          }
        }
      }

      if (decisions.length) {
        decisions.sort((a, b) => a.probMine - b.probMine);
        const best = decisions[0];
        const rr = Math.floor(best.k / cols);
        const cc = best.k % cols;
        if (best.probMine <= 0) {
          reveal(rr, cc);
        } else if (best.probMine >= 1) {
          toggleFlag(rr, cc);
        } else {
          reveal(rr, cc);
        }
        return true;
      }

      // Fallback: global guess by density
      const hidden: number[] = [];
      for (let k = 0; k < grid.length; k++) {
        const cell = grid[k];
        if (!cell.revealed && !cell.flagged) hidden.push(k);
      }
      if (hidden.length) {
        const pick = hidden[Math.floor(p.random(hidden.length))];
        const rr = Math.floor(pick / cols);
        const cc = pick % cols;
        reveal(rr, cc);
        return true;
      }

      return false;
    }

    // --- Drawing helpers ---
    function setScaleToHost() {
      const w = host.clientWidth || baseW;
      const h = host.clientHeight || baseH;
      const s = Math.min(w / baseW, h / baseH);
      scaleFactor = Math.max(0.5, s);
      cw = Math.floor(baseW * scaleFactor);
      ch = Math.floor(baseH * scaleFactor);
      p.resizeCanvas(cw, ch);
      p.pixelDensity(1);
    }

    function designToScreen(x: number) {
      return Math.round(x * scaleFactor);
    }

    function drawBevelRect(x: number, y: number, w: number, h: number, raised: boolean) {
      p.noStroke();
      p.fill(192);
      p.rect(designToScreen(x), designToScreen(y), designToScreen(w), designToScreen(h));
      // edges
      const tl = raised ? 255 : 128;
      const br = raised ? 128 : 255;
      p.stroke(tl);
      p.line(designToScreen(x), designToScreen(y), designToScreen(x + w - 1), designToScreen(y));
      p.line(designToScreen(x), designToScreen(y), designToScreen(x), designToScreen(y + h - 1));
      p.stroke(br);
      p.line(designToScreen(x), designToScreen(y + h - 1), designToScreen(x + w - 1), designToScreen(y + h - 1));
      p.line(designToScreen(x + w - 1), designToScreen(y), designToScreen(x + w - 1), designToScreen(y + h - 1));
      p.noStroke();
    }

    function drawOuterBorder() {
      p.background(192);
      p.strokeWeight(designToScreen(1));
      // outer ridge
      p.stroke(255);
      p.rect(designToScreen(0.5), designToScreen(0.5), designToScreen(baseW - 1), designToScreen(baseH - 1));
      p.stroke(128);
      p.rect(designToScreen(1.5), designToScreen(1.5), designToScreen(baseW - 3), designToScreen(baseH - 3));
    }

    function drawLED(x: number, y: number, value: number, digits = 3) {
      const str = Math.max(-999, Math.min(999, value)).toString().padStart(digits, value < 0 ? digits : digits, "0");
      const segW = 9;
      const segH = 15;
      drawBevelRect(x, y, digits * (segW + 2) + 6, segH + 6, true);
      p.fill(0);
      p.rect(designToScreen(x + 3), designToScreen(y + 3), designToScreen(digits * (segW + 2)), designToScreen(segH));
      const mapDigit: Record<string, number[]> = {
        "0": [0, 1, 2, 4, 5, 6],
        "1": [2, 5],
        "2": [0, 2, 3, 4, 6],
        "3": [0, 2, 3, 5, 6],
        "4": [1, 2, 3, 5],
        "5": [0, 1, 3, 5, 6],
        "6": [0, 1, 3, 4, 5, 6],
        "7": [0, 2, 5],
        "8": [0, 1, 2, 3, 4, 5, 6],
        "9": [0, 1, 2, 3, 5, 6],
        "-": [3],
      };
      for (let i = 0; i < digits; i++) {
        const d = str[str.length - digits + i] ?? "0";
        const on = mapDigit[d] ?? [];
        const ox = x + 3 + i * (segW + 2);
        const oy = y + 3;
        p.push();
        p.translate(designToScreen(ox), designToScreen(oy));
        p.fill(255, 0, 0);
        const seg = (s: number, x1: number, y1: number, x2: number, y2: number) => {
          if (!on.includes(s)) return;
          p.noStroke();
          p.rect(0, 0, 0, 0);
          p.beginShape();
          p.vertex(designToScreen(x1), designToScreen(y1));
          p.vertex(designToScreen(x2), designToScreen(y1));
          p.vertex(designToScreen(x2), designToScreen(y2));
          p.vertex(designToScreen(x1), designToScreen(y2));
          p.endShape(p.CLOSE);
        };
        seg(0, 1, 0, segW - 1, 2);
        seg(3, 1, segH / 2 - 1, segW - 1, segH / 2 + 1);
        seg(6, 1, segH - 2, segW - 1, segH);
        seg(1, 0, 1, 2, segH / 2 - 1);
        seg(4, 0, segH / 2 + 1, 2, segH - 1);
        seg(2, segW - 2, 1, segW, segH / 2 - 1);
        seg(5, segW - 2, segH / 2 + 1, segW, segH - 1);
        p.pop();
      }
    }

    function drawFace(x: number, y: number) {
      const size = 24;
      drawBevelRect(x, y, size + 8, size + 8, true);
      const cx = x + 4 + size / 2;
      const cy = y + 4 + size / 2;
      p.push();
      p.translate(designToScreen(cx), designToScreen(cy));
      p.scale(scaleFactor);
      p.noStroke();
      p.fill(255, 255, 0);
      p.circle(0, 0, size);
      p.fill(0);
      // eyes
      p.circle(-5, -3, 3);
      p.circle(5, -3, 3);
      // mouth by state
      p.stroke(0);
      p.noFill();
      p.strokeWeight(2);
      if (state === "dead") {
        p.line(-6, 5, -2, 1);
        p.line(6, 5, 2, 1);
        p.line(-4, -1, -2, 1);
        p.line(4, -1, 2, 1);
      } else if (state === "won") {
        p.strokeWeight(2);
        p.arc(0, 2, 12, 10, 0, p.PI);
        p.rect(-8, -7, 16, 4);
      } else if (pressLeft) {
        p.line(-6, 6, 6, 6);
      } else {
        p.arc(0, 6, 12, 10, 0, p.PI);
      }
      p.pop();
    }

    function cellAtMouse(mx: number, my: number): { r: number; c: number } | null {
      const bx = PAD + BEVEL * 2;
      const by = PAD + BEVEL * 2 + headerH + 4;
      const x = mx / scaleFactor - bx;
      const y = my / scaleFactor - by;
      if (x < 0 || y < 0) return null;
      const c = Math.floor(x / TILE);
      const r = Math.floor(y / TILE);
      if (r < 0 || r >= rows || c < 0 || c >= cols) return null;
      return { r, c };
    }

    function drawTile(cell: Cell) {
      const bx = PAD + BEVEL * 2;
      const by = PAD + BEVEL * 2 + headerH + 4;
      const x = bx + cell.c * TILE;
      const y = by + cell.r * TILE;

      if (!cell.revealed) {
        drawBevelRect(x, y, TILE, TILE, true);
        if (cell.flagged) {
          p.push();
          p.translate(designToScreen(x), designToScreen(y));
          p.scale(scaleFactor);
          p.stroke(0);
          p.line(4, 12, 4, 3);
          p.fill(255, 0, 0);
          p.triangle(5, 3, 5, 9, 11, 6);
          p.pop();
        } else if (cell.question) {
          p.push();
          p.translate(designToScreen(x), designToScreen(y));
          p.scale(scaleFactor);
          p.fill(0);
          p.textSize(12);
          p.textAlign(p.CENTER, p.CENTER);
          p.text("?", TILE / 2, TILE / 2 + 1);
          p.pop();
        }
        return;
      }

      // revealed face
      p.noStroke();
      p.fill(192);
      p.rect(designToScreen(x), designToScreen(y), designToScreen(TILE), designToScreen(TILE));
      p.stroke(128);
      p.line(designToScreen(x), designToScreen(y), designToScreen(x + TILE - 1), designToScreen(y));
      p.line(designToScreen(x), designToScreen(y), designToScreen(x), designToScreen(y + TILE - 1));

      if (cell.mine) {
        p.push();
        p.translate(designToScreen(x + TILE / 2), designToScreen(y + TILE / 2));
        p.scale(scaleFactor);
        p.fill(0);
        p.circle(0, 0, 10);
        for (let a = 0; a < 8; a++) {
          const ang = (p.TWO_PI * a) / 8;
          p.rectMode(p.CENTER);
          p.push();
          p.rotate(ang);
          p.rect(0, 0, 12, 2);
          p.pop();
        }
        p.fill(200);
        p.circle(-2, -2, 3);
        p.pop();
        return;
      }

      if (cell.adj > 0) {
        const col = NUM_COLORS[cell.adj] ?? [0, 0, 0];
        p.fill(col[0], col[1], col[2]);
        p.textAlign(p.CENTER, p.CENTER);
        p.textSize(designToScreen(12));
        p.text(`${cell.adj}`, designToScreen(x + TILE / 2), designToScreen(y + TILE / 2 + 1));
      }
    }

    function drawHeader() {
      const x = PAD + BEVEL * 2;
      const y = PAD + BEVEL * 2;
      drawBevelRect(x, y, boardW, headerH, true);
      drawLED(x + 6, y + 6, Math.max(-99, Math.min(999, flagsLeft)));
      drawFace(x + boardW / 2 - 16, y + 6);
      elapsed = state === "playing" || firstRevealDone ? Math.min(999, Math.floor((p.millis() - startMillis) / 1000)) : 0;
      if (state === "dead" || state === "won") {
        elapsed = Math.min(999, Math.floor((startMillis ? (p.millis() - startMillis) : 0) / 1000));
      }
      drawLED(x + boardW - 6 - (9 + 2) * 3 - 6, y + 6, elapsed);
    }

    function drawBoardFrame() {
      const x = PAD;
      const y = PAD;
      drawBevelRect(x, y, BEVEL * 4 + boardW, BEVEL * 2 + headerH + 4 + BEVEL * 2 + boardH, true);
      drawBevelRect(x + BEVEL, y + BEVEL, BEVEL * 2 + boardW, headerH + 4 + BEVEL * 2 + boardH, false);
      drawBevelRect(x + BEVEL * 2, y + BEVEL * 2, boardW, headerH, true);
      drawBevelRect(x + BEVEL * 2, y + BEVEL * 2 + headerH + 4, boardW, boardH, true);
    }

    // --- p5 lifecycle ---
    p.setup = () => {
      p.createCanvas(baseW, baseH);
      setScaleToHost();
      reset();
      // Disable context menu on right-click
      (p.canvas as any).oncontextmenu = (e: MouseEvent) => e.preventDefault();
      p.textFont("system-ui, -apple-system, Segoe UI, Arial");
    };

    p.windowResized = () => {
      setScaleToHost();
    };

    p.draw = () => {
      drawOuterBorder();
      drawBoardFrame();
      drawHeader();

      hovered = null;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) drawTile(grid[idx(r, c)]);
      }

      // auto-play pacing
      if (autoPlay && state !== "dead" && state !== "won") {
        if (!firstRevealDone) state = "playing";
        autoTickCooldown--;
        let steps = 0;
        while (autoTickCooldown <= 0 && steps < 16) {
          const moved = solverStep();
          if (!moved) {
            autoTickCooldown = 10; // brief pause when stuck
            break;
          }
          steps++;
          autoTickCooldown = 0;
        }
      }
    };

    p.mousePressed = () => {
      const pos = cellAtMouse(p.mouseX, p.mouseY);
      const faceX = PAD + BEVEL * 2 + boardW / 2 - 16;
      const faceY = PAD + BEVEL * 2 + 6;
      const inFace =
        p.mouseX >= designToScreen(faceX) &&
        p.mouseX <= designToScreen(faceX + 24 + 8) &&
        p.mouseY >= designToScreen(faceY) &&
        p.mouseY <= designToScreen(faceY + 24 + 8);

      if (inFace) {
        reset();
        return;
      }

      if (pos) {
        if (p.mouseButton === p.LEFT) {
          pressLeft = true;
          if (state === "ready") state = "playing";
        } else if (p.mouseButton === p.RIGHT) {
          pressRight = true;
        }
      }
    };

    p.mouseReleased = () => {
      const pos = cellAtMouse(p.mouseX, p.mouseY);
      if (pressLeft && pressRight && pos) {
        chord(pos.r, pos.c);
      } else if (pressLeft && pos) {
        reveal(pos.r, pos.c);
      } else if (pressRight && pos) {
        const cell = grid[idx(pos.r, pos.c)];
        if (!cell.revealed) toggleFlag(pos.r, pos.c);
      }
      pressLeft = false;
      pressRight = false;
    };

    p.keyPressed = () => {
      if (p.key === "r" || p.key === "R") reset();
      if (p.key === "a" || p.key === "A") autoPlay = !autoPlay;
      if (p.key === "1") {
        level = LEVELS[0];
        cols = level.cols; rows = level.rows; minesTarget = level.mines;
        reset();
      }
      if (p.key === "2") {
        level = LEVELS[1];
        cols = level.cols; rows = level.rows; minesTarget = level.mines;
        reset();
      }
      if (p.key === "3") {
        level = LEVELS[2];
        cols = level.cols; rows = level.rows; minesTarget = level.mines;
        reset();
      }
      if (p.key === "s" || p.key === "S") {
        solverStep();
      }
    };
  }, host);

  return instance;
}

export default function MinesweeperClassic(): JSX.Element {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hostRef.current) return;
    const p = useP5Minesweeper({ levelIndex: 1, auto: false }, hostRef.current);
    return () => p.remove();
  }, []);

  return (
    <div className="w-full h-full bg-[#C0C0C0]" ref={hostRef} />
  );
}
