'use client'

import React, { useEffect, useRef, useState } from 'react'
import p5 from 'p5'

type Pipe = {
  x: number
  gapY: number
  passed: boolean
}

const VIRT_W = 288
const VIRT_H = 512

const GRAVITY = 0.25
const FLAP_VELOCITY = -4.0
const MAX_VELOCITY = 10
const PIPE_SPEED = -2
const PIPE_GAP = 100
const SPAWN_FRAMES = 90
const GROUND_H = 112
const BIRD_X = 52

function useResizeObserver<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  useEffect(() => {
    if (!ref.current) return
    const el = ref.current
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const cr = entry.contentRect
        setSize({ width: Math.max(1, cr.width), height: Math.max(1, cr.height) })
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return { ref, size }
}

export default function FlappyBird() {
  const { ref, size } = useResizeObserver<HTMLDivElement>()
  const p5Ref = useRef<p5 | null>(null)
  const controlsRef = useRef({ autoplay: false, paused: false })
  const [autoplay, setAutoplay] = useState(false)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    controlsRef.current.autoplay = autoplay
  }, [autoplay])
  useEffect(() => {
    controlsRef.current.paused = paused
  }, [paused])

  useEffect(() => {
    if (!ref.current) return

    let sketch = (s: p5) => {
      let scaleF = 1
      let viewX = 0
      let viewY = 0

      let birdY = VIRT_H / 2
      let birdV = 0
      let pipes: Pipe[] = []
      let groundOffset = 0
      let frameCounter = 0
      let score = 0
      let alive = true
      let noiseZ = 0

      const reset = () => {
        birdY = VIRT_H / 2
        birdV = 0
        pipes = []
        groundOffset = 0
        frameCounter = 0
        score = 0
        alive = true
        noiseZ = 0
      }

      const flap = () => {
        if (!alive) return
        birdV = FLAP_VELOCITY
      }

      const spawnPipe = () => {
        const t = s.noise(noiseZ)
        noiseZ += 0.05
        const margin = 24
        const minY = margin
        const maxY = VIRT_H - GROUND_H - margin
        const gapCenter = s.map(t, 0, 1, minY + PIPE_GAP / 2, maxY - PIPE_GAP / 2)
        pipes.push({ x: VIRT_W + 10, gapY: gapCenter, passed: false })
      }

      const updateScale = () => {
        const w = Math.max(1, s.width)
        const h = Math.max(1, s.height)
        const sx = w / VIRT_W
        const sy = h / VIRT_H
        scaleF = Math.min(sx, sy)
        viewX = (w - VIRT_W * scaleF) / 2
        viewY = (h - VIRT_H * scaleF) / 2
      }

      const collide = () => {
        if (controlsRef.current.autoplay) return false
        if (birdY + 12 >= VIRT_H - GROUND_H) return true
        if (birdY - 12 <= 0) return true
        for (const pipe of pipes) {
          const left = pipe.x - 26
          const right = pipe.x + 26
          const topGap = pipe.gapY - PIPE_GAP / 2
          const botGap = pipe.gapY + PIPE_GAP / 2
          const bx = BIRD_X
          const by = birdY
          if (bx + 12 > left && bx - 12 < right) {
            if (by - 12 < topGap || by + 12 > botGap) return true
          }
        }
        return false
      }

      const drawBackground = () => {
        s.noStroke()
        s.fill(0, 191, 255)
        s.rect(0, 0, VIRT_W, VIRT_H - GROUND_H)
        s.fill(240, 240, 240)
        for (let i = 0; i < 6; i++) {
          const cx = (i * 60 + (frameCounter * 0.5) % 60)
          s.ellipse(cx, 90 + (i % 2) * 20, 50, 20)
        }
      }

      const drawGround = () => {
        s.noStroke()
        s.fill(222, 216, 149)
        s.rect(0, VIRT_H - GROUND_H, VIRT_W, GROUND_H)
        s.fill(173, 164, 91)
        const tileW = 24
        groundOffset = (groundOffset + -PIPE_SPEED) % tileW
        for (let x = -tileW + groundOffset; x < VIRT_W + tileW; x += tileW) {
          s.rect(x, VIRT_H - 20, tileW - 4, 16, 3)
        }
      }

      const drawPipes = () => {
        s.noStroke()
        for (const pipe of pipes) {
          s.fill(83, 228, 68)
          const w = 52
          const lipH = 20
          const topH = pipe.gapY - PIPE_GAP / 2
          s.rect(pipe.x - w / 2, 0, w, topH)
          s.rect(pipe.x - w / 2 - 3, topH - lipH, w + 6, lipH)
          const bottomY = pipe.gapY + PIPE_GAP / 2
          const bottomH = VIRT_H - GROUND_H - bottomY
          s.rect(pipe.x - w / 2, bottomY, w, bottomH)
          s.rect(pipe.x - w / 2 - 3, bottomY, w + 6, lipH)
        }
      }

      const drawBird = () => {
        s.push()
        s.translate(BIRD_X, birdY)
        const rot = s.constrain(s.map(birdV, -8, MAX_VELOCITY, -0.35, 0.6), -0.6, 0.6)
        s.rotate(rot)
        s.noStroke()
        s.fill(255, 230, 0)
        s.ellipse(0, 0, 24, 18)
        s.fill(255, 120, 0)
        s.triangle(8, 0, 16, -3, 16, 3)
        s.fill(255)
        s.ellipse(-4, -4, 6, 6)
        s.fill(0)
        s.ellipse(-4, -4, 2, 2)
        s.pop()
      }

      const drawUI = () => {
        s.fill(255)
        s.textSize(24)
        s.textAlign(s.CENTER, s.TOP)
        s.text(`${score}`, VIRT_W / 2, 12)
        if (!alive) {
          s.textSize(16)
          s.text('Tap / Space to restart', VIRT_W / 2, 44)
        }
      }

      const updateAutoplay = () => {
        if (!controlsRef.current.autoplay || !alive) return
        let next = pipes.find(p => p.x > BIRD_X - 10)
        const target = next ? next.gapY : VIRT_H / 2
        const k = 0.08
        const dv = (target - birdY) * k
        if (birdY > target && birdV > -2 + dv) birdV = FLAP_VELOCITY
        if (birdY < 24) birdY = 24
      }

      s.setup = () => {
        s.createCanvas(ref.current!.clientWidth, ref.current!.clientHeight)
        s.frameRate(60)
        updateScale()
        reset()
      }

      s.windowResized = () => {
        s.resizeCanvas(ref.current!.clientWidth, ref.current!.clientHeight)
        updateScale()
      }

      s.mousePressed = () => {
        if (controlsRef.current.paused) return
        if (!alive) { reset(); return }
        if (!controlsRef.current.autoplay) flap()
      }

      s.keyPressed = () => {
        const k = s.key.toLowerCase()
        if (k === ' ') {
          if (!alive) { reset(); return }
          if (!controlsRef.current.autoplay) flap()
        } else if (k === 'p') {
          controlsRef.current.paused = !controlsRef.current.paused
        } else if (k === 'a') {
          controlsRef.current.autoplay = !controlsRef.current.autoplay
        }
      }

      s.draw = () => {
        s.clear(0, 0, 0, 0)
        if (controlsRef.current.paused) {
          s.push()
          s.translate(viewX, viewY)
          s.scale(scaleF)
          drawBackground()
          drawGround()
          drawPipes()
          drawBird()
          drawUI()
          s.pop()
          return
        }

        s.push()
        s.translate(viewX, viewY)
        s.scale(scaleF)

        frameCounter++
        birdV = Math.min(MAX_VELOCITY, birdV + GRAVITY)
        birdY += birdV

        updateAutoplay()

        if (frameCounter % SPAWN_FRAMES === 0) spawnPipe()

        pipes.forEach(p => (p.x += PIPE_SPEED))
        pipes = pipes.filter(p => p.x > -80)

        for (const p of pipes) {
          if (!p.passed && p.x + 26 < BIRD_X - 12) {
            p.passed = true
            score++
          }
        }

        drawBackground()
        drawPipes()
        drawGround()
        drawBird()
        drawUI()

        if (collide()) {
          alive = false
        }

        if (!alive) {
          birdV += 0.5
          if (birdY + 12 >= VIRT_H - GROUND_H) {
            birdY = VIRT_H - GROUND_H - 12
            birdV = 0
          }
        }

        s.pop()
      }
    }

    const instance = new p5(sketch, ref.current)
    p5Ref.current = instance

    return () => {
      p5Ref.current?.remove()
      p5Ref.current = null
    }
  }, [ref])

  return (
    <div className="relative w-full h-full" ref={ref}>
      <div className="pointer-events-none absolute left-2 top-2 flex flex-col gap-2 text-white/90">
        <div className="rounded-lg bg-black/40 px-3 py-2 text-xs backdrop-blur">
          <div className="font-medium">Flappy Bird</div>
          <div>Space/Click: flap • A: autoplay • P: pause</div>
        </div>
      </div>
      <div className="pointer-events-auto absolute right-2 top-2 flex gap-2">
        <button
          className={`rounded-xl px-3 py-2 text-sm font-medium shadow ${autoplay ? 'bg-green-500 text-black' : 'bg-white/90'
            }`}
          onClick={() => setAutoplay(v => !v)}
        >
          {autoplay ? 'Autoplay: ON' : 'Autoplay: OFF'}
        </button>
        <button
          className={`rounded-xl px-3 py-2 text-sm font-medium shadow ${paused ? 'bg-yellow-400 text-black' : 'bg-white/90'
            }`}
          onClick={() => setPaused(v => !v)}
        >
          {paused ? 'Resume' : 'Pause'}
        </button>
      </div>
    </div>
  )
}
