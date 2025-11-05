'use client'

import { useEffect, useRef, useState } from 'react'
import p5 from 'p5'

type Point = { x: number; y: number }
type Dir = { x: number; y: number }

const DIRS = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
} as const

function equal(a: Point, b: Point) { return a.x === b.x && a.y === b.y }
function isOpposite(a: Dir, b: Dir) { return a.x === -b.x && a.y === -b.y }

function buildDirectionMatrix(n: number): Dir[][][] {
  const M: Dir[][][] = Array.from({ length: n }, () => Array.from({ length: n }, () => [] as Dir[]))
  for (let y = 0; y < n; y++) {
    if (y === 0) M[y][0] = [DIRS.DOWN]
    else if (y === n - 1) M[y][0] = [DIRS.RIGHT]
    else if (y % 2 === 1) M[y][0] = [DIRS.RIGHT, DIRS.DOWN]
    else M[y][0] = [DIRS.DOWN]
  }
  for (let x = 1; x <= n - 2; x++) {
    if (x % 2 === 1) {
      for (let y = 0; y < n; y++) {
        if (y === 0) M[y][x] = [DIRS.LEFT]
        else if (y % 2 === 1) M[y][x] = [DIRS.UP, DIRS.RIGHT]
        else M[y][x] = [DIRS.UP, DIRS.LEFT]
      }
    } else {
      for (let y = 0; y < n; y++) {
        if (y === 0) M[y][x] = [DIRS.LEFT, DIRS.DOWN]
        else if (y === n - 1) M[y][x] = [DIRS.RIGHT]
        else if (y % 2 === 1) M[y][x] = [DIRS.RIGHT, DIRS.DOWN]
        else M[y][x] = [DIRS.LEFT, DIRS.DOWN]
      }
    }
  }
  for (let y = 0; y < n; y++) {
    if (y === 0) M[y][n - 1] = [DIRS.LEFT]
    else if (y === n - 1) M[y][n - 1] = [DIRS.UP]
    else if (y % 2 === 0) M[y][n - 1] = [DIRS.UP, DIRS.LEFT]
    else M[y][n - 1] = [DIRS.UP]
  }
  return M
}

export default function SnakeP5({ boardSize = 20, cellPx = 40, initialSpeed = 5, className = '' }: { boardSize?: number; cellPx?: number; initialSpeed?: number; className?: string }) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const p5Ref = useRef<p5 | null>(null)

  const [score, setScore] = useState(0)
  const [steps, setSteps] = useState(0)
  const [speed, setSpeed] = useState(initialSpeed)
  const [paused, setPaused] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [win, setWin] = useState(false)
  const [autoPlay, setAutoPlay] = useState(true)
  const [showArrows, setShowArrows] = useState(false)

  const speedRef = useRef(speed)
  const pausedRef = useRef(paused)
  const autoRef = useRef(autoPlay)
  const arrowsRef = useRef(showArrows)
  const overRef = useRef(gameOver)
  const winRef = useRef(false)
  const resetBus = useRef(false)
  const justReset = useRef(false)
  const scoreR = useRef(0)
  const stepsR = useRef(0)
  const lastUiSync = useRef(0)

  useEffect(() => { speedRef.current = speed }, [speed])
  useEffect(() => { pausedRef.current = paused }, [paused])
  useEffect(() => { autoRef.current = autoPlay }, [autoPlay])
  useEffect(() => { arrowsRef.current = showArrows }, [showArrows])
  useEffect(() => { overRef.current = gameOver }, [gameOver])
  useEffect(() => { winRef.current = win }, [win])

  useEffect(() => {
    if (!containerRef.current) return

    const sketch = (p: p5) => {
      const N = boardSize
      const CELL = cellPx
      const W = N * CELL
      const H = N * CELL
      const dirmat = buildDirectionMatrix(N)

      const SIZE = N * N
      const IDX = (x: number, y: number) => y * N + x
      const toPoint = (i: number): Point => ({ x: i % N, y: (i / N) | 0 })

      const adj: Int16Array[] = Array.from({ length: SIZE }, () => new Int16Array(4).fill(-1))
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const i = IDX(x, y)
        const dirs = dirmat[y][x]
        let k = 0
        for (let d of dirs) {
          const nx = x + d.x, ny = y + d.y
          if (nx >= 0 && ny >= 0 && nx < N && ny < N) adj[i][k++] = IDX(nx, ny)
        }
      }

      const nbr4: Int16Array[] = Array.from({ length: SIZE }, () => new Int16Array(4).fill(-1))
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const i = IDX(x, y)
        let k = 0
        const C: [number, number][] = [[1,0],[-1,0],[0,1],[0,-1]]
        for (const [dx, dy] of C) {
          const nx = x + dx, ny = y + dy
          if (nx >= 0 && ny >= 0 && nx < N && ny < N) nbr4[i][k++] = IDX(nx, ny)
        }
      }

      let snake: Point[] = []
      let appleSprite: p5.Graphics | null = null
      let dir: Dir = Object.values(DIRS)[Math.floor(Math.random() * 4)]
      let queued: Dir | null = null
      let apple: Point = { x: 0, y: 0 }
      let mps = speedRef.current
      let stepMs = 1000 / mps
      let acc = 0

      function reset() {
        snake = [{ x: Math.floor(Math.random() * Math.max(4, N - 10)) + 3,
                   y: Math.floor(Math.random() * Math.max(4, N - 10)) + 3 }]
        queued = null
        placeApple()
        dir = pickInitialDir()
        acc = 0
        setPaused(false)
        setScore(0); scoreR.current = 0
        setSteps(0); stepsR.current = 0
        setGameOver(false)
        setWin(false)
        justReset.current = true
      }

      function placeApple() {
        const occ = new Set(snake.map(s => `${s.x},${s.y}`))
        const free: Point[] = []
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          if (!occ.has(`${x},${y}`)) free.push({ x, y })
        }
      
        if (free.length === 0) {
          setWin(true)
          setGameOver(true)
          setPaused(true)
          apple = { x: -1, y: -1 }
          return
        }
      
        apple = free[Math.floor(Math.random() * free.length)]
      }

      function neighborsAllowed(a: Point) {
        const out: Point[] = []
        const dirs = dirmat[a.y][a.x]
        for (let i = 0; i < dirs.length; i++) {
          const nx = a.x + dirs[i].x
          const ny = a.y + dirs[i].y
          if (nx >= 0 && ny >= 0 && nx < N && ny < N) out.push({ x: nx, y: ny })
        }
        return out
      }

      function pickInitialDir(): Dir {
        const head = snake[0]
      
        const path = bfs()
        if (path && path.length >= 2) {
          const n1 = path[1]
          const dx = Math.sign(n1.x - head.x)
          const dy = Math.sign(n1.y - head.y)
          return dx === 1 ? DIRS.RIGHT :
                 dx === -1 ? DIRS.LEFT  :
                 dy === 1 ? DIRS.DOWN   : DIRS.UP
        }
      
        const nb = neighborsAllowed(head)
        if (nb.length) {
          const n1 = nb[0]
          return { x: Math.sign(n1.x - head.x), y: Math.sign(n1.y - head.y) }
        }
      
        const candidates: Dir[] = [DIRS.RIGHT, DIRS.LEFT, DIRS.DOWN, DIRS.UP]
        for (const d of candidates) {
          const nx = head.x + d.x, ny = head.y + d.y
          if (nx >= 0 && ny >= 0 && nx < N && ny < N) return d
        }
        return DIRS.RIGHT
      }

      function keyPt(p: Point) { return `${p.x},${p.y}` }
      function manhattan(a: Point, b: Point) { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) }

      function blockedGridCurrent(): Uint8Array {
        const b = new Uint8Array(SIZE)
        for (let i = 0; i < snake.length; i++) b[IDX(snake[i].x, snake[i].y)] = 1
        return b
      }
      
      function blockedGridAfterMove(nh: Point, willGrow: boolean): Uint8Array {
        const b = new Uint8Array(SIZE)
        const limit = snake.length - (willGrow ? 0 : 1)
        for (let i = 0; i < limit; i++) b[IDX(snake[i].x, snake[i].y)] = 1
        b[IDX(nh.x, nh.y)] = 1
        return b
      }
      
      function countFreeComponentsFast(blocked: Uint8Array) {
        const seen = new Uint8Array(SIZE)
        const q = new Int32Array(SIZE)
        let count = 0
        let minSize = Infinity
      
        for (let i = 0; i < SIZE; i++) {
          if (blocked[i] || seen[i]) continue
          count++
          let size = 0
          let head = 0, tail = 0
          q[tail++] = i
          seen[i] = 1
          while (head < tail) {
            const cur = q[head++]
            size++
            const nb = nbr4[cur]
            for (let k = 0; k < 4; k++) {
              const v = nb[k]
              if (v === -1) continue
              if (blocked[v] || seen[v]) continue
              seen[v] = 1
              q[tail++] = v
            }
          }
          if (size < minSize) minSize = size
        }
        if (minSize === Infinity) minSize = 0
        return { count, minSize }
      }

      function wouldCollide(nh: Point, willGrow: boolean) {
        const limit = snake.length - (willGrow ? 0 : 1)
        for (let i = 1; i < limit; i++) if (equal(snake[i], nh)) return true
        return false
      }

      function bfs(): Point[] | null {
        if (apple.x < 0 || apple.y < 0) return null
      
        const startI = IDX(snake[0].x, snake[0].y)
        const goalI  = IDX(apple.x, apple.y)
        if (goalI < 0 || goalI >= SIZE) return null
        if (startI === goalI) return [snake[0]]
      
        const blocked = new Uint8Array(SIZE)
        for (let i = 0; i < snake.length - 1; i++) blocked[IDX(snake[i].x, snake[i].y)] = 1
      
        const visited = new Uint8Array(SIZE)
        const came    = new Int32Array(SIZE); came.fill(-1)
      
        const q = new Int32Array(SIZE)
        let head = 0, tail = 0
        q[tail++] = startI
        visited[startI] = 1
      
        while (head < tail) {
          const cur = q[head++]
          const nbrs = adj[cur]
          for (let k = 0; k < 4; k++) {
            const nb = nbrs[k]
            if (nb === -1) continue
            if (visited[nb]) continue
            if (blocked[nb]) continue
            visited[nb] = 1
            came[nb] = cur
            if (nb === goalI) { head = tail; break }
            q[tail++] = nb
          }
        }
      
        if (came[goalI] === -1) return null
      
        const idxPath: number[] = []
        for (let cur = goalI; cur !== -1; cur = came[cur]) {
          idxPath.push(cur)
          if (idxPath.length > SIZE) return null
        }
        idxPath.reverse()
        return idxPath.map(toPoint)
      }

      function dirEq(a: Dir, b: Dir) { return a.x === b.x && a.y === b.y }
      function rightOf(d: Dir): Dir {
        if (d.x ===  1 && d.y === 0) return { x: 0,  y: 1 }
        if (d.x === -1 && d.y === 0) return { x: 0,  y:-1 }
        if (d.x ===  0 && d.y === 1) return { x:-1, y: 0 }
        return { x: 1, y: 0 }
      }
      function cellMoveInside(p: Point): Dir {
        if ((p.y & 1) === 0) return (p.x & 1) === 0 ? DIRS.DOWN  : DIRS.LEFT
        return                 (p.x & 1) === 0 ? DIRS.RIGHT : DIRS.UP
      }
      function cellMoveOutside(p: Point): Dir {
        if ((p.y & 1) === 0) return (p.x & 1) === 0 ? DIRS.LEFT  : DIRS.UP
        return                 (p.x & 1) === 0 ? DIRS.DOWN  : DIRS.RIGHT
      }
      function isCellMove(p: Point, d: Dir) {
        const a = cellMoveInside(p), b = cellMoveOutside(p)
        return dirEq(d, a) || dirEq(d, b)
      }
      function cellOf(p: Point) { return { x: p.x >> 1, y: p.y >> 1 } }

      const NOT_VIS: Point | null = null
      function buildCellTreeParentsFromSnake() {
        const CW = N >> 1, CH = N >> 1
        const parents: (Point | null)[][] = Array.from({ length: CH }, () => Array(CW).fill(NOT_VIS))
        let parent: Point = { x: -2, y: -2 }
        for (let i = snake.length - 1; i >= 0; --i) {
          const c = cellOf(snake[i])
          if (parents[c.y][c.x] === NOT_VIS) parents[c.y][c.x] = parent
          parent = c
        }
        return parents
      }

      function canMoveInCellTree(parents: (Point | null)[][], a: Point, b: Point, d: Dir, blocked: Uint8Array) {
        if (!isCellMove(a, d)) return false
        if (b.x < 0 || b.y < 0 || b.x >= N || b.y >= N) return false
        if (blocked[IDX(b.x, b.y)]) return false

        const ca = cellOf(a), cb = cellOf(b)
        if (cb.x === ca.x && cb.y === ca.y) return true
        if (parents[cb.y][cb.x] === NOT_VIS) return true
        const pa = parents[ca.y][ca.x]
        return !!pa && pa.x === cb.x && pa.y === cb.y
      }

      function normDir(a: Point, b: Point): Dir { return { x: Math.sign(b.x - a.x), y: Math.sign(b.y - a.y) } }

      function aStarWithPenalties(start: Point, goal: Point, parents: (Point | null)[][], blocked: Uint8Array) {
        const INF = 1e15, STEP = 1000
        const dist = new Float64Array(SIZE).fill(INF)
        const came = new Int32Array(SIZE).fill(-1)
        const open = new Uint8Array(SIZE)
        const h = (p: Point) => (Math.abs(p.x - goal.x) + Math.abs(p.y - goal.y)) * STEP
        const startI = IDX(start.x, start.y), goalI = IDX(goal.x, goal.y)
        dist[startI] = 0; open[startI] = 1

        const getMinF = () => {
          let best = -1, bestF = INF
          for (let i = 0; i < SIZE; i++) if (open[i]) {
            const p = toPoint(i)
            const f = dist[i] + h(p)
            if (f < bestF) { bestF = f; best = i }
          }
          return best
        }

        const penaltyCfg = {
          same: 50, parent: 5, nuovo: 0,
          edgeIn: 4, edgeOut: 2,
          wallIn: 6, wallOut: 3,
          openIn: 20, openOut: 2,
        }

        while (true) {
          const u = getMinF()
          if (u === -1) break
          open[u] = 0
          if (u === goalI) break

          const a = toPoint(u)
          const cand: Dir[] = [DIRS.RIGHT, DIRS.LEFT, DIRS.DOWN, DIRS.UP]
          for (const d of cand) {
            const b = { x: a.x + d.x, y: a.y + d.y }
            if (!canMoveInCellTree(parents, a, b, d, blocked)) continue

            const ca = cellOf(a), cb = cellOf(b)
            const pa = parents[ca.y][ca.x]
            const toParent = !!pa && pa.x === cb.x && pa.y === cb.y
            const toSame = (ca.x === cb.x && ca.y === cb.y)

            const r = rightOf(d)
            const br = { x: b.x + r.x, y: b.y + r.y }
            const hugsEdge = (br.x < 0 || br.y < 0 || br.x >= N || br.y >= N)
            const hugsWall = !hugsEdge && blocked[IDX(br.x, br.y)]

            let base = STEP
              + (toParent ? penaltyCfg.parent : toSame ? penaltyCfg.same : penaltyCfg.nuovo)
              + (toSame
                ? (hugsEdge ? penaltyCfg.edgeIn : hugsWall ? penaltyCfg.wallIn : penaltyCfg.openIn)
                : (hugsEdge ? penaltyCfg.edgeOut : hugsWall ? penaltyCfg.wallOut : penaltyCfg.openOut))

            if (a.x === start.x && a.y === start.y) {
              if (dir && (dir.x !== 0 || dir.y !== 0)) {
                base += (d.x === dir.x && d.y === dir.y) ? -5 : +5
              }
            }

            const v = IDX(b.x, b.y)
            const nd = dist[u] + base
            if (nd < dist[v]) { dist[v] = nd; came[v] = u; open[v] = 1 }
          }
        }

      if (came[goalI] === -1) return { path: null as Point[] | null, dist, came }
        const path: Point[] = []
        for (let cur = goalI; cur !== startI; cur = came[cur]) {
          if (cur === -1) return { path: null as Point[] | null, dist, came }
          path.push(toPoint(cur))
        }
        path.reverse()
        return { path, dist, came }
      }

      function firstStepToward(came: Int32Array, startI: number, toI: number) {
        let cur = toI, prev = came[cur]
        if (cur === -1) return null
        while (prev !== startI && prev !== -1) { cur = prev; prev = came[cur] }
        if (prev !== startI) return null
        return toPoint(cur)
      }

      function simulateAfterMoves(path: Point[]) {
        const grid = blockedGridCurrent().slice()
        const snk = snake.map(s => ({ x: s.x, y: s.y }))
        for (let i = 0; i < path.length; i++) {
          const p2 = path[i]
          grid[IDX(p2.x, p2.y)] = 1
          snk.unshift({ x: p2.x, y: p2.y })
          if (!equal(p2, apple)) {
            const tail = snk.pop()!
            grid[IDX(tail.x, tail.y)] = 0
          }
        }
        return { grid, snakeAfter: snk, headAfter: snk[0] }
      }

      function floodReachable(parents: (Point | null)[][], grid: Uint8Array, start: Point) {
        const seen = new Uint8Array(SIZE)
        const q = new Int32Array(SIZE)
        let head = 0, tail = 0

        const sI = IDX(start.x, start.y)
        q[tail++] = sI
        seen[sI] = 1

        const pushIfOK = (a: Point, d: Dir) => {
          const b = { x: a.x + d.x, y: a.y + d.y }
          if (b.x < 0 || b.y < 0 || b.x >= N || b.y >= N) return
          if (grid[IDX(b.x, b.y)]) return
          if (!isCellMove(a, d)) return

          const ca = cellOf(a), cb = cellOf(b)
          const sameCell = (ca.x === cb.x && ca.y === cb.y)
          const unvisited = parents[cb.y][cb.x] === NOT_VIS
          const pa = parents[ca.y][ca.x]
          const parentLink = !!pa && pa.x === cb.x && pa.y === cb.y

          if (!(sameCell || unvisited || parentLink)) return

          const v = IDX(b.x, b.y)
          if (seen[v]) return
          seen[v] = 1; q[tail++] = v
        }

        while (head < tail) {
          const u = q[head++], a = toPoint(u)
          pushIfOK(a, DIRS.RIGHT); pushIfOK(a, DIRS.LEFT); pushIfOK(a, DIRS.DOWN); pushIfOK(a, DIRS.UP)
        }
        return seen
      }

      let lastCell: Point | null = null
      let insideStreak = 0

      function autoDir(): Dir | null {
        const head = snake[0]
        if (apple.x < 0 || apple.y < 0) return null
      
        const parents = buildCellTreeParentsFromSnake()
        const blocked = blockedGridCurrent()
        const { path, dist, came } = aStarWithPenalties(head, apple, parents, blocked)
      
        if (!path || path.length === 0) {
          const pth = bfs()
          if (pth && pth.length >= 2) return normDir(head, pth[1])
          const nb = neighborsAllowed(head)
          const occ = new Set(snake.map(s => `${s.x},${s.y}`))
          for (let i = 0; i < nb.length; i++) if (!occ.has(`${nb[i].x},${nb[i].y}`)) return normDir(head, nb[i])
          return null
        }
      
        if (stepsR.current > 110) {
          const after = simulateAfterMoves(path)
          const parentsAfter = (() => {
            const CW = N >> 1, CH = N >> 1
            const p2: (Point | null)[][] = Array.from({ length: CH }, () => Array(CW).fill(NOT_VIS))
            let parent: Point = { x: -2, y: -2 }
            for (let i = after.snakeAfter.length - 1; i >= 0; --i) {
              const c = cellOf(after.snakeAfter[i])
              if (p2[c.y][c.x] === NOT_VIS) p2[c.y][c.x] = parent
              parent = c
            }
            return p2
          })()
          const reach = floodReachable(parentsAfter, after.grid, after.headAfter)
          let bestI = -1, bestD = Infinity
          for (let i = 0; i < SIZE; i++) {
            if (blocked[i]) continue
            if (!reach[i]) {
              const d2 = dist[i]
              if (d2 < bestD) { bestD = d2; bestI = i }
            }
          }
          if (bestI !== -1 && bestD < 1e15) {
            const stepPt = firstStepToward(came, IDX(head.x, head.y), bestI)
            if (stepPt) return normDir(head, stepPt)
          }
        }
      
        let d = normDir(head, path[0])
      
        const curCell = cellOf(head)
        const appleCell = cellOf(apple)
        const suggestedInside = dirEq(d, cellMoveInside(head))
        if (lastCell && lastCell.x === curCell.x && lastCell.y === curCell.y) {
          insideStreak = suggestedInside ? insideStreak + 1 : 0
        } else {
          insideStreak = suggestedInside ? 1 : 0
        }
        lastCell = curCell
      
        if (insideStreak >= 3 && !(appleCell.x === curCell.x && appleCell.y === curCell.y)) {
          const forced = cellMoveOutside(head)
          const nh = { x: head.x + forced.x, y: head.y + forced.y }
          if (nh.x >= 0 && nh.y >= 0 && nh.x < N && nh.y < N) {
            const willGrow = equal(nh, apple)
            if (!wouldCollide(nh, willGrow)) insideStreak = 0, d = forced
          }
        }
      
        return d
      }

      function step() {
        if (apple.x < 0 || apple.y < 0) { setGameOver(true); setPaused(true); return }
        if (pausedRef.current || overRef.current) return
      
        if (autoRef.current) {
          const d = autoDir()
          const allowReverseOnce = justReset.current
          if (d && (!isOpposite(d, dir) || allowReverseOnce)) {
            dir = d
            justReset.current = false
          }
        } else if (queued && !isOpposite(queued, dir)) {
          dir = queued
        }
        queued = null
      
        const h = snake[0];
        const nh: Point = { x: h.x + dir.x, y: h.y + dir.y };
      
        if (nh.x < 0 || nh.y < 0 || nh.x >= N || nh.y >= N) {
          setGameOver(true); setPaused(true); return;
        }
      
        const willGrow = equal(nh, apple);
      
        const limit = snake.length - (willGrow ? 0 : 1);
        for (let i = 1; i < limit; i++) {
          if (equal(snake[i], nh)) { setGameOver(true); setPaused(true); return; }
        }
      
        snake.unshift(nh)

        if (equal(nh, apple)) {
          scoreR.current += 1
          if (snake.length === SIZE) {
            apple = { x: -1, y: -1 }
            setWin(true); setGameOver(true); setPaused(true)
            return
          }
          placeApple()
        } else {
          snake.pop()
        }
      
        stepsR.current += 1;
      }

      p.setup = () => {
        p.createCanvas(W, H)
        appleSprite = p.createGraphics(CELL, CELL)
        appleSprite.noStroke()
        appleSprite.pixelDensity(1)
        appleSprite.noSmooth()
        ;(appleSprite.drawingContext as any).imageSmoothingEnabled = false
        const art = [
          [null, '#2EAD53', null, null, null],
          [null, '#BA222E', '#2EAD53', '#BA222E', null],
          ['#821C29', '#BA222E', '#BA222E', '#BA222E', '#BA222E'],
          ['#821C29', '#BA222E', '#BA222E', '#BA222E', '#BA222E'],
          ['#821C29', '#821C29', '#BA222E', '#BA222E', '#BA222E'],
          [null, '#821C29', '#821C29', '#821C29', null],
        ]

        const rows = art.length
        const cols = art[0].length
        const tw = Math.floor(CELL / cols)
        const th = Math.floor(CELL / rows)
        const extraW = CELL - tw * cols
        const extraH = CELL - th * rows

        for (let i = 0, oy = 0; i < rows; i++) {
          const h = th + (i < extraH ? 1 : 0)
          for (let j = 0, ox = 0; j < cols; j++) {
            const c = art[i][j]
            const w = tw + (j < extraW ? 1 : 0)
            if (c) {
              appleSprite.fill(p.color(c))
              appleSprite.rect(ox, oy, w, h)
            }
            ox += w
          }
          oy += h
        }
        p.frameRate(60)
        p.noStroke()
        reset()
      }

      p.draw = () => {
        if (resetBus.current) { resetBus.current = false; reset() }
        if (mps !== speedRef.current) { mps = speedRef.current; stepMs = 1000 / mps }
        p.background(18, 18, 18)
        p.fill(120, 120, 120, 220)
        const pad = Math.floor(CELL * 0.2)
        const gap = (pad >> 1)
        for (let x = 0; x < N; x++) {
          for (let y = 0; y < N; y++) {
            p.rect(x * CELL + gap, y * CELL + gap, CELL - pad, CELL - pad, 3)
          }
        }
        if (arrowsRef.current) {
          p.push()
          p.stroke(220, 80, 120)
          p.strokeWeight(1.25)
          p.fill(220, 80, 120)
          for (let y = 0; y < N; y++) {
            for (let x = 0; x < N; x++) {
              const cx = x * CELL + CELL / 2
              const cy = y * CELL + CELL / 2
              const dirs = dirmat[y][x]
              for (let k = 0; k < dirs.length; k++) {
                const dx = dirs[k].x * CELL * 0.45
                const dy = dirs[k].y * CELL * 0.45
                const ex = cx + dx
                const ey = cy + dy
                const ang = Math.atan2(dy, dx)
                const ah = CELL * 0.16
                const x1 = ex + Math.cos(ang + Math.PI * 0.8) * ah
                const y1 = ey + Math.sin(ang + Math.PI * 0.8) * ah
                const x2 = ex + Math.cos(ang - Math.PI * 0.8) * ah
                const y2 = ey + Math.sin(ang - Math.PI * 0.8) * ah
                p.line(cx, cy, ex, ey)
                p.triangle(ex, ey, x1, y1, x2, y2)
              }
            }
          }
          p.pop()
        }
        acc += p.deltaTime
        while (acc >= stepMs) {
          step()
          acc -= stepMs
          if (apple.x < 0 || apple.y < 0) break
        }
        if (arrowsRef.current && !overRef.current && !winRef.current) {
          const path = bfs();
          if (path && path.length > 1) {
            p.push();
            p.noFill();
            p.stroke(70, 150, 255);
            p.strokeWeight(Math.max(2, CELL * 0.08));
            p.beginShape();
            for (let i = 0; i < path.length; i++) {
              const cx = path[i].x * CELL + CELL / 2;
              const cy = path[i].y * CELL + CELL / 2;
              p.vertex(cx, cy);
            }
            p.endShape();
        
            p.noStroke();
            p.fill(70, 150, 255, 140);
            const r = Math.max(3, CELL * 0.12);
            for (let i = 0; i < path.length; i++) {
              const cx = path[i].x * CELL + CELL / 2;
              const cy = path[i].y * CELL + CELL / 2;
              p.circle(cx, cy, r);
            }
            p.pop();
          }
        }
        for (let i = 0; i < snake.length; i++) {
          const s = snake[i]
          const intensity = Math.floor(255 - i * (255 / (snake.length * 1.7)))
          p.fill(0, intensity, 255 - intensity)
          p.rect(s.x * CELL, s.y * CELL, CELL, CELL, 4)
          if (i === 0) {
            p.fill(255, 64, 64)
            const eye = CELL / 5
            if (dir.x === 1) { p.rect(s.x * CELL + CELL * 0.6, s.y * CELL + CELL * 0.25, eye, eye, 2); p.rect(s.x * CELL + CELL * 0.6, s.y * CELL + CELL * 0.6, eye, eye, 2) }
            else if (dir.x === -1) { p.rect(s.x * CELL + CELL * 0.2, s.y * CELL + CELL * 0.25, eye, eye, 2); p.rect(s.x * CELL + CELL * 0.2, s.y * CELL + CELL * 0.6, eye, eye, 2) }
            else if (dir.y === -1) { p.rect(s.x * CELL + CELL * 0.25, s.y * CELL + CELL * 0.2, eye, eye, 2); p.rect(s.x * CELL + CELL * 0.6, s.y * CELL + CELL * 0.2, eye, eye, 2) }
            else { p.rect(s.x * CELL + CELL * 0.25, s.y * CELL + CELL * 0.6, eye, eye, 2); p.rect(s.x * CELL + CELL * 0.6, s.y * CELL + CELL * 0.6, eye, eye, 2) }
          }
        }
        if (apple.x >= 0 && !overRef.current && !winRef.current && appleSprite) {
          p.image(appleSprite, apple.x * CELL, apple.y * CELL)
        }
        if (pausedRef.current || overRef.current) {
          p.push()
          p.fill(0, 0, 0, 150)
          p.rect(0, 0, W, H)
          p.fill(255)
          p.textAlign(p.CENTER, p.CENTER)
          p.textSize(22)
          p.text(overRef.current ? (winRef.current ? 'You Win!' : 'Game Over') : 'Paused', W / 2, H / 2 - 16)
          p.textSize(14)
          p.text('Enter to restart • Space to toggle pause', W / 2, H / 2 + 10)
          p.pop()
        }
        if (p.millis() - lastUiSync.current > 100) {
          setScore(scoreR.current)
          setSteps(stepsR.current)
          lastUiSync.current = p.millis()
        }
      }

      p.keyPressed = () => {
        const k = p.key.toLowerCase()
        if (overRef.current) {
          if (p.keyCode === p.ENTER) { resetBus.current = true; setPaused(false); setGameOver(false) }
          return
        }
        if (k === ' ' || p.keyCode === p.ESCAPE) { setPaused(v => !v); return }
        if (pausedRef.current) return
        let nd: Dir | null = null
        if (k === 'w' || p.keyCode === p.UP_ARROW) nd = DIRS.UP
        else if (k === 's' || p.keyCode === p.DOWN_ARROW) nd = DIRS.DOWN
        else if (k === 'a' || p.keyCode === p.LEFT_ARROW) nd = DIRS.LEFT
        else if (k === 'd' || p.keyCode === p.RIGHT_ARROW) nd = DIRS.RIGHT
        if (nd) { queued = nd }
      }
    }

    p5Ref.current = new p5(sketch, containerRef.current)

    return () => { p5Ref.current?.remove(); p5Ref.current = null }
  }, [boardSize, cellPx])

  const holdRAF = useRef<number | null>(null)
  const holdStart = useRef(0)
  const holdDir = useRef<1 | -1>(1)
  const holdClicksAcc = useRef(0)

  function stepSpeed(dir: 1 | -1, clicks = 1) {
    setSpeed(s => {
      let next = s + dir * 0.5 * clicks
      if (!isFinite(next)) next = s
      next = Math.max(0.5, Math.min(200, next))
      return +next.toFixed(1)
    })
  }

  function cancelHold() {
    if (holdRAF.current) {
      cancelAnimationFrame(holdRAF.current)
      holdRAF.current = null
    }
  }

  function startHold(dir: 1 | -1) {
    holdDir.current = dir
    holdStart.current = performance.now()
    holdClicksAcc.current = 0

    const DELAY = 300
    const R0 = 0.35
    const K = 5

    let last = performance.now()
    let seeded = false

    const loop = (now: number) => {
      if (!holdRAF.current) return
      const elapsed = now - holdStart.current

      if (elapsed >= DELAY && !seeded) {
        seeded = true
        stepSpeed(holdDir.current, 1)
        holdClicksAcc.current = 0
        last = now
      }

      if (elapsed < DELAY) {
        holdRAF.current = requestAnimationFrame(loop)
        return
      }

      const dt = (now - last) / 1000
      last = now
      const t = (elapsed - DELAY) / 1000
      const clicksPerSec = R0 * Math.exp(K * t)

      holdClicksAcc.current += clicksPerSec * dt

      const whole = Math.floor(holdClicksAcc.current)
      if (whole >= 1) {
        stepSpeed(holdDir.current, whole)
        holdClicksAcc.current -= whole
      }

      holdRAF.current = requestAnimationFrame(loop)
    }

    holdRAF.current = requestAnimationFrame(loop)
  }

  function endHold(dir: 1 | -1, applyTap: boolean) {
    const elapsed = performance.now() - holdStart.current
    cancelHold()
    if (applyTap && elapsed < 300) stepSpeed(dir, 1)
  }

  return (
    <div ref={rootRef} className={`snake-root flex flex-col items-center gap-3 ${className}`}>
      <style jsx>{`
        .snake-root, .snake-root * { -webkit-user-select: none !important; user-select: none !important; }
      `}</style>
      <div className="flex flex-wrap items-center gap-3 text-zinc-200" onMouseDown={(e) => e.preventDefault()}>
        <div className="px-3 py-1 rounded bg-zinc-800/80 border border-zinc-700">
          <span className="font-semibold">Speed:</span>{' '}
          <button
            type="button"
            className="px-2 hover:text-white text-purple-300"
            onPointerDown={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); startHold(-1) }}
            onPointerUp={() => endHold(-1, true)}
            onPointerCancel={() => cancelHold()}
            onPointerLeave={() => cancelHold()}
            onContextMenu={(e) => e.preventDefault()}
          >–</button>
          <span className="mx-1 tabular-nums inline-block text-right">{speed.toFixed(1)}</span>
          <button
            type="button"
            className="px-2 hover:text-white text-purple-300"
            onPointerDown={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); startHold(+1) }}
            onPointerUp={() => endHold(+1, true)}
            onPointerCancel={() => cancelHold()}
            onPointerLeave={() => cancelHold()}
            onContextMenu={(e) => e.preventDefault()}
          >+</button>
        </div>
        <div className="px-3 py-1 rounded bg-zinc-800/80 border border-zinc-700"><span className="font-semibold">Score:</span> <span className="tabular-nums">{score}</span></div>
        <div className="px-3 py-1 rounded bg-zinc-800/80 border border-zinc-700"><span className="font-semibold">Steps:</span> <span className="tabular-nums">{steps}</span></div>
        <button type="button" className={`px-3 py-1 rounded border border-zinc-700 ${paused ? 'bg-zinc-700' : 'bg-zinc-800/80 hover:bg-zinc-700'}`} onClick={() => setPaused(v => !v)}>{paused ? 'Resume' : 'Pause'}</button>
        <button type="button" className={`px-3 py-1 rounded border border-zinc-700 ${autoPlay ? 'bg-emerald-700' : 'bg-zinc-800/80 hover:bg-zinc-700'}`} onClick={() => setAutoPlay(v => !v)}>{autoPlay ? 'Autoplay' : 'Manual'}</button>
        <button type="button" className={`px-3 py-1 rounded border border-zinc-700 ${showArrows ? 'bg-fuchsia-700' : 'bg-zinc-800/80 hover:bg-zinc-700'}`} onClick={() => setShowArrows(v => !v)}>{showArrows ? 'Arrows On' : 'Arrows Off'}</button>
        <button
          type="button"
          className="px-3 py-1 rounded bg-zinc-800/80 border border-zinc-700 hover:bg-zinc-700"
          onClick={() => { resetBus.current = true; setPaused(false); setGameOver(false) }}
        >
          Restart
        </button>
      </div>
      <div ref={containerRef} className="rounded-lg overflow-hidden shadow-lg" style={{ width: boardSize * cellPx, height: boardSize * cellPx }} />
      <div className="text-sm text-zinc-400">WASD/Arrows • Space pause • Enter restart</div>
    </div>
  )
}
