'use client';

import { useEffect, useRef } from 'react';
import type p5Type from 'p5';
import p5 from 'p5';

export default function LabyrinthExplorer() {
  const hostRef = useRef<HTMLDivElement>(null);
  const p5Ref = useRef<p5Type | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    if (!hostRef.current) return;

    const sketch = (p: p5Type) => {
      let cols = 0;
      let rows = 0;
      let w = 80;
      let grid: Cell[] = [];
      let wallSegments: { x1: number; y1: number; x2: number; y2: number }[] = [];
      let player: Player;
      let fov = Math.PI / 2;
      let prism = { x: 0, y: 0 };
      let score = 0;
      let baseTime = 60;
      let timeLeft = baseTime;
      let round = 1;
      let maxRounds = 8;
      let roundActive = true;

      const state = {
        lastSize: { w: 0, h: 0 },
        mapScale: 0.5
      };

      class Cell {
        i: number;
        j: number;
        walls: [boolean, boolean, boolean, boolean];
        visited: boolean;
        constructor(i: number, j: number) {
          this.i = i;
          this.j = j;
          this.walls = [true, true, true, true];
          this.visited = false;
        }
        checkNeighbors() {
          const neighbors: Cell[] = [];
          const top = grid[index(this.i, this.j - 1)];
          const right = grid[index(this.i + 1, this.j)];
          const bottom = grid[index(this.i, this.j + 1)];
          const left = grid[index(this.i - 1, this.j)];
          if (top && !top.visited) neighbors.push(top);
          if (right && !right.visited) neighbors.push(right);
          if (bottom && !bottom.visited) neighbors.push(bottom);
          if (left && !left.visited) neighbors.push(left);
          if (neighbors.length > 0) {
            return neighbors[p.floor(p.random(neighbors.length))];
          }
          return undefined;
        }
        show() {
          const x = this.i * w * state.mapScale + (p.width - cols * w * state.mapScale);
          const y = this.j * w * state.mapScale;
          p.stroke(255);
          if (this.walls[0]) p.line(x, y, x + w * state.mapScale, y);
          if (this.walls[1]) p.line(x + w * state.mapScale, y, x + w * state.mapScale, y + w * state.mapScale);
          if (this.walls[2]) p.line(x + w * state.mapScale, y + w * state.mapScale, x, y + w * state.mapScale);
          if (this.walls[3]) p.line(x, y + w * state.mapScale, x, y);
        }
      }

      class Player {
        x: number = 0;
        y: number = 0;
        angle: number = 0;
        fov: number = Math.PI / 2;
        viewDistance: number = 800;
        speed: number = 2;
        update() {
          let nx = this.x;
          let ny = this.y;
          if (p.keyIsDown(87)) {
            nx += this.speed * Math.cos(this.angle);
            ny += this.speed * Math.sin(this.angle);
          }
          if (p.keyIsDown(83)) {
            nx -= this.speed * Math.cos(this.angle);
            ny -= this.speed * Math.sin(this.angle);
          }
          if (canMove(this.x, this.y, nx, ny)) {
            this.x = nx;
            this.y = ny;
          }
          if (p.keyIsDown(68)) this.angle += 0.1;
          if (p.keyIsDown(65)) this.angle -= 0.1;
        }
        show() {
          const offsetX = p.width - cols * w * state.mapScale;
          const offsetY = 0;
          const mx = this.x * state.mapScale + offsetX;
          const my = this.y * state.mapScale + offsetY;
          p.fill(0, 255, 0);
          p.push();
          p.translate(mx, my);
          p.rotate(this.angle + Math.PI / 2);
          p.triangle(-5, 5, 5, 5, 0, -8);
          p.pop();
        }
      }

      function index(i: number, j: number) {
        if (i < 0 || j < 0 || i >= cols || j >= rows) return -1;
        return i + j * cols;
      }

      function removeWalls(a: Cell, b: Cell) {
        const x = a.i - b.i;
        if (x === 1) {
          a.walls[3] = false;
          b.walls[1] = false;
        } else if (x === -1) {
          a.walls[1] = false;
          b.walls[3] = false;
        }
        const y = a.j - b.j;
        if (y === 1) {
          a.walls[0] = false;
          b.walls[2] = false;
        } else if (y === -1) {
          a.walls[2] = false;
          b.walls[0] = false;
        }
      }

      function getAccessibleNeighbors(i: number, j: number) {
        const res: { i: number; j: number }[] = [];
        const c = grid[index(i, j)];
        if (!c) return res;
        if (!c.walls[0]) res.push({ i, j: j - 1 });
        if (!c.walls[1]) res.push({ i: i + 1, j });
        if (!c.walls[2]) res.push({ i, j: j + 1 });
        if (!c.walls[3]) res.push({ i: i - 1, j });
        return res;
      }

      function findFarthestCell(startI: number, startJ: number) {
        const distArr = new Array(grid.length).fill(-1);
        const startIdx = index(startI, startJ);
        distArr[startIdx] = 0;
        const q: { i: number; j: number }[] = [{ i: startI, j: startJ }];
        let maxDist = 0;
        let farI = startI;
        let farJ = startJ;
        while (q.length) {
          const { i, j } = q.shift()!;
          const idxCell = index(i, j);
          const cur = distArr[idxCell];
          const nb = getAccessibleNeighbors(i, j);
          for (const n of nb) {
            const nbIdx = index(n.i, n.j);
            if (distArr[nbIdx] === -1) {
              distArr[nbIdx] = cur + 1;
              q.push({ i: n.i, j: n.j });
              if (distArr[nbIdx] > maxDist) {
                maxDist = distArr[nbIdx];
                farI = n.i;
                farJ = n.j;
              }
            }
          }
        }
        return grid[index(farI, farJ)];
      }

      function generateMaze() {
        grid = [];
        const mapPixels = Math.max(140, Math.floor(p.width * 0.35));
        state.mapScale = 0.5;
        w = Math.max(40, Math.min(100, Math.floor((mapPixels / state.mapScale) / 12)));
        cols = Math.max(8, Math.floor((p.width * 0.35) / (w * state.mapScale)));
        rows = Math.max(6, Math.floor(p.height / (w)));
        for (let j = 0; j < rows; j++) {
          for (let i = 0; i < cols; i++) {
            grid.push(new Cell(i, j));
          }
        }
        let current = grid[0];
        const stack: Cell[] = [];
        current.visited = true;
        for (; ;) {
          const next = current.checkNeighbors();
          if (next) {
            next.visited = true;
            stack.push(current);
            removeWalls(current, next);
            current = next;
          } else if (stack.length > 0) {
            current = stack.pop()!;
          } else break;
        }
        for (const c of grid) c.visited = false;
        player = new Player();
        player.x = w / 2;
        player.y = w / 2;
        const farCell = findFarthestCell(0, 0);
        prism.x = farCell.i * w + w / 2;
        prism.y = farCell.j * w + w / 2;
        buildWallSegments();
      }

      function buildWallSegments() {
        wallSegments = [];
        for (let j = 0; j < rows; j++) {
          for (let i = 0; i < cols; i++) {
            const c = grid[index(i, j)];
            const x0 = i * w;
            const y0 = j * w;
            const x1 = (i + 1) * w;
            const y1 = (j + 1) * w;
            if (c.walls[0]) wallSegments.push({ x1: x0, y1: y0, x2: x1, y2: y0 });
            if (c.walls[1]) wallSegments.push({ x1: x1, y1: y0, x2: x1, y2: y1 });
            if (c.walls[2]) wallSegments.push({ x1: x1, y1: y1, x2: x0, y2: y1 });
            if (c.walls[3]) wallSegments.push({ x1: x0, y1: y1, x2: x0, y2: y0 });
          }
        }
      }

      function canMove(oldX: number, oldY: number, newX: number, newY: number) {
        const oldI = Math.floor(oldX / w);
        const oldJ = Math.floor(oldY / w);
        const newI = Math.floor(newX / w);
        const newJ = Math.floor(newY / w);
        if (oldI === newI && oldJ === newJ) return true;
        if (newI < 0 || newJ < 0 || newI >= cols || newJ >= rows) return false;
        const oldCell = grid[index(oldI, oldJ)];
        const newCell = grid[index(newI, newJ)];
        if (!oldCell || !newCell) return false;
        if (newI === oldI + 1 && newJ === oldJ) return !oldCell.walls[1] && !newCell.walls[3];
        if (newI === oldI - 1 && newJ === oldJ) return !oldCell.walls[3] && !newCell.walls[1];
        if (newJ === oldJ + 1 && newI === oldI) return !oldCell.walls[2] && !newCell.walls[0];
        if (newJ === oldJ - 1 && newI === oldI) return !oldCell.walls[0] && !newCell.walls[2];
        return false;
      }

      function showPrismOnMap() {
        const offsetX = p.width - cols * w * state.mapScale;
        const offsetY = 0;
        const mx = prism.x * state.mapScale + offsetX;
        const my = prism.y * state.mapScale + offsetY;
        p.fill(100, 180, 255);
        p.noStroke();
        p.push();
        p.translate(mx, my);
        p.beginShape();
        p.vertex(0, -6);
        p.vertex(6, 0);
        p.vertex(0, 6);
        p.vertex(-6, 0);
        p.endShape(p.CLOSE);
        p.pop();
      }

      function checkPrismCollision() {
        const d = p.dist(player.x, player.y, prism.x, prism.y);
        if (d < 20) {
          score++;
          nextRound();
        }
      }

      function nextRound() {
        let timeTaken = baseTime - timeLeft;
        if (timeTaken < 0) timeTaken = 0;
        round++;
        if (round > maxRounds) {
          roundActive = false;
          return;
        }
        let nextTime = baseTime - 0.5 * timeTaken;
        if (timeTaken < 15) nextTime += 3;
        if (nextTime < 10) nextTime = 10;
        timeLeft = nextTime;
        generateMaze();
      }

      function raySegmentIntersection(px: number, py: number, dx: number, dy: number, x1: number, y1: number, x2: number, y2: number) {
        const denom = (x2 - x1) * dy - (y2 - y1) * dx;
        if (Math.abs(denom) < 1e-6) return { hit: false, t: 0 };
        const t = ((x1 - px) * (y2 - y1) - (y1 - py) * (x2 - x1)) / denom;
        const u = ((x1 - px) * dy - (y1 - py) * dx) / denom;
        if (t < 0) return { hit: false, t: 0 };
        if (u < 0 || u > 1) return { hit: false, t: 0 };
        return { hit: true, t };
      }

      function render3D() {
        const h = p.height;
        p.noStroke();
        p.fill(100);
        p.rect(0, 0, p.width, h / 2);
        p.fill(50);
        p.rect(0, h / 2, p.width, h / 2);
        for (let i = 0; i < p.width; i++) {
          const rayAngle = player.angle - fov / 2 + (fov * i) / p.width;
          const dx = Math.cos(rayAngle);
          const dy = Math.sin(rayAngle);
          let closestT = Infinity;
          for (const seg of wallSegments) {
            const r = raySegmentIntersection(player.x, player.y, dx, dy, seg.x1, seg.y1, seg.x2, seg.y2);
            if (r.hit && r.t < closestT) closestT = r.t;
          }
          if (closestT < Infinity) {
            const corrected = closestT * Math.cos(player.angle - rayAngle);
            const wallHeight = (w / Math.max(0.0001, corrected)) * 300;
            const topY = (h - wallHeight) / 2;
            const sliceH = wallHeight;
            const bright = p.map(corrected, 0, player.viewDistance, 255, 0, true);
            p.fill(bright);
            p.rect(i, topY, 1, sliceH);
          }
        }
      }

      function drawMinimapWalls() {
        for (let i = 0; i < grid.length; i++) grid[i].show();
      }

      function ensureCanvasSize() {
        const el = hostRef.current!;
        const cw = el.clientWidth;
        const ch = el.clientHeight;
        if (cw !== state.lastSize.w || ch !== state.lastSize.h) {
          state.lastSize.w = cw;
          state.lastSize.h = ch;
          p.resizeCanvas(cw, ch);
          generateMaze();
        }
      }

      p.setup = () => {
        const el = hostRef.current!;
        const cw = el.clientWidth || 800;
        const ch = el.clientHeight || 600;
        p.createCanvas(cw, ch);
        p.pixelDensity(1);
        generateMaze();
      };

      p.draw = () => {
        if (!roundActive) {
          p.background(0);
          p.textAlign(p.CENTER, p.CENTER);
          p.textSize(28);
          p.fill(255, 0, 0);
          if (round > maxRounds) {
            p.text('You win! Rounds completed: ' + maxRounds, p.width / 2, p.height / 2);
          } else {
            p.text("Time's up! Game over.", p.width / 2, p.height / 2);
          }
          return;
        }
        ensureCanvasSize();
        p.background(0);
        timeLeft -= p.deltaTime / 1000;
        if (timeLeft <= 0) {
          roundActive = false;
          timeLeft = 0;
        }
        player.update();
        render3D();
        drawMinimapWalls();
        player.show();
        showPrismOnMap();
        checkPrismCollision();
        p.fill(255);
        p.textAlign(p.LEFT, p.TOP);
        p.textSize(16);
        p.text('Score: ' + score, 16, 16);
        p.text('Round: ' + round, 16, 38);
        p.text('Tempo: ' + p.nf(timeLeft, 1, 1) + ' s', 16, 60);
      };
    };

    p5Ref.current = new p5(sketch, hostRef.current);

    roRef.current = new ResizeObserver(() => {
      const inst = p5Ref.current;
      if (!inst) return;
      const el = hostRef.current!;
      inst.resizeCanvas(el.clientWidth, el.clientHeight);
    });
    roRef.current.observe(hostRef.current);

    return () => {
      roRef.current?.disconnect();
      p5Ref.current?.remove();
      p5Ref.current = null;
    };
  }, []);

  return <div ref={hostRef} className="w-full h-full relative bg-black" />;
}
