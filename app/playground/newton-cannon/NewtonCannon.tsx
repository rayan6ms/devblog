'use client'

import React, { useEffect, useRef, useState } from 'react'

export default function NewtonCannonP5() {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const p5Ref = useRef<any>(null)

  // Speed slider (1 → 10), default 5
  const [speed, setSpeed] = useState(5)

  useEffect(() => {
    let p5Instance: any
    let mounted = true

    const start = async () => {
      const p5mod = await import('p5')
      if (!mounted) return

      const sketch = (p: any) => {
        // Canvas/Layout
        let W = 800
        let H = 600

        // World/Planet constants (softer gravity)
        const G = 4.0e-3
        const PLANET_RADIUS = 140
        const PLANET_MASS = 6.0e6
        const MU = G * PLANET_MASS

        // Cannon + projectile
        const CANNON_PIVOT = { x: () => W / 2, y: () => H / 2 - PLANET_RADIUS }
        const BARREL_LEN = 64
        const BALL_RADIUS = 6
        const SHOT_SPEED = 12.0
        const COOLDOWN_MS = 600
        let lastShot = -Infinity

        // Colors
        const planetInner = 'hsl(210 50% 24%)'
        const planetOuter = 'hsl(210 25% 8%)'

        type Vec = { x: number; y: number }
        type Ball = { pos: Vec; vel: Vec; alive: boolean }
        const balls: Ball[] = []
        const staticBalls: Vec[] = [] // remain where they land

        // Particles
        type Particle = { pos: Vec; vel: Vec; life: number; color: string; size: number; grav?: number }
        const particles: Particle[] = []

        // Aim state
        let aimAngleGlobal = -Math.PI / 2
        let cachedMouse: Vec = { x: 0, y: 0 }

        // Utility vector ops
        const v = (x: number, y: number): Vec => ({ x, y })
        const add = (a: Vec, b: Vec) => v(a.x + b.x, a.y + b.y)
        const sub = (a: Vec, b: Vec) => v(a.x - b.x, a.y - b.y)
        const mul = (a: Vec, k: number) => v(a.x * k, a.y * k)
        const mag = (a: Vec) => Math.hypot(a.x, a.y)
        const norm = (a: Vec) => {
          const m = mag(a) || 1
          return v(a.x / m, a.y / m)
        }

        const withinCooldown = () => performance.now() - lastShot < COOLDOWN_MS

        const muzzlePos = () => {
          const pivot = v(CANNON_PIVOT.x(), CANNON_PIVOT.y())
          const dir = v(Math.cos(aimAngleGlobal), Math.sin(aimAngleGlobal))
          return add(pivot, mul(dir, BARREL_LEN))
        }

        const updateAim = (mx: number, my: number) => {
          const pivot = v(CANNON_PIVOT.x(), CANNON_PIVOT.y())
          const rawAngle = Math.atan2(my - pivot.y, mx - pivot.x)
          let rel = normalizeAngle(rawAngle - (-Math.PI / 2))
          rel = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rel))
          aimAngleGlobal = -Math.PI / 2 + rel
        }

        const normalizeAngle = (a: number) => {
          while (a <= -Math.PI) a += 2 * Math.PI
          while (a > Math.PI) a -= 2 * Math.PI
          return a
        }

        const spawnParticles = (origin: Vec, dir: Vec, kind: 'muzzle' | 'fuse' | 'impact') => {
          const n = kind === 'impact' ? 24 : kind === 'muzzle' ? 18 : 8
          for (let i = 0; i < n; i++) {
            const jitter = (Math.random() - 0.5) * (kind === 'impact' ? 1.8 : 1.2)
            const ang = Math.atan2(dir.y, dir.x) + jitter
            const spd = (kind === 'impact' ? 2.2 : kind === 'muzzle' ? 1.6 : 1.0) * (0.6 + Math.random() * 0.8)
            const vel = v(Math.cos(ang) * spd, Math.sin(ang) * spd)
            const color =
              kind === 'impact' ? (Math.random() < 0.5 ? planetInner : planetOuter) : i % 2 ? 'hsl(18 90% 60%)' : 'hsl(55 100% 80%)'
            const size = kind === 'impact' ? 2 + Math.random() * 3 : 2 + Math.random() * 2
            particles.push({ pos: v(origin.x, origin.y), vel, life: 28 + Math.random() * 22, color, size, grav: kind === 'impact' ? 0.06 : 0.02 })
          }
        }

        const shoot = () => {
          if (withinCooldown()) return
          const mpos = muzzlePos()
          const dir = v(Math.cos(aimAngleGlobal), Math.sin(aimAngleGlobal))
          balls.push({ pos: v(mpos.x, mpos.y), vel: mul(dir, SHOT_SPEED), alive: true })
          lastShot = performance.now()
          spawnParticles(mpos, dir, 'muzzle')
        }

        // Physics integration (semi-implicit Euler with substeps + speed scale)
        const BASE_STEP = 1 / 60
        const SUBSTEPS = 2
        const integrate = (b: Ball) => {
          const planetCenter = v(W / 2, H / 2)
          const dt = (BASE_STEP * speed) / SUBSTEPS
          for (let i = 0; i < SUBSTEPS; i++) {
            const rVec = sub(planetCenter, b.pos)
            const r = mag(rVec)
            const aMag = MU / (r * r)
            const acc = mul(norm(rVec), aMag)

            b.vel = add(b.vel, mul(acc, dt))
            b.pos = add(b.pos, mul(b.vel, dt))

            const distToCenter = mag(sub(b.pos, planetCenter))
            if (distToCenter <= PLANET_RADIUS + BALL_RADIUS * 0.8) {
              // Place on surface, keep as static ball and spawn impact particles
              const surfDir = norm(sub(b.pos, planetCenter))
              const surfPos = add(planetCenter, mul(surfDir, PLANET_RADIUS + BALL_RADIUS * 0.1))
              staticBalls.push(surfPos)
              spawnParticles(surfPos, mul(surfDir, -1), 'impact')
              b.alive = false
              break
            }
            if (b.pos.x < -200 || b.pos.x > W + 200 || b.pos.y < -200 || b.pos.y > H + 200) {
              b.alive = false
              break
            }
          }
        }

        // Trajectory preview (denser dotted line; distance-thinned)
        const computePreview = () => {
          const planetCenter = v(W / 2, H / 2)
          const dots: Vec[] = []
          let pos = muzzlePos()
          let vel = v(Math.cos(aimAngleGlobal) * SHOT_SPEED, Math.sin(aimAngleGlobal) * SHOT_SPEED)

          const maxDots = 90
          let lastDot = pos
          let spacing = 8 // closer to look straighter

          for (let i = 0; i < maxDots; i++) {
            spacing = Math.min(24, spacing * 1.03)
            for (let s = 0; s < 5; s++) {
              const rVec = sub(planetCenter, pos)
              const r = mag(rVec)
              const acc = mul(norm(rVec), MU / (r * r))
              const dt = BASE_STEP * speed * 2.2
              vel = add(vel, mul(acc, dt))
              pos = add(pos, mul(vel, dt))
            }
            if (mag(sub(pos, planetCenter)) <= PLANET_RADIUS + BALL_RADIUS) break
            if (pos.x < -50 || pos.x > W + 50 || pos.y < -50 || pos.y > H + 50) break
            if (mag(sub(pos, lastDot)) >= spacing) {
              dots.push(v(pos.x, pos.y))
              lastDot = pos
            }
          }
          return dots
        }

        p.setup = () => {
          const parent = hostRef.current!
          W = parent.clientWidth
          H = parent.clientHeight
          p.createCanvas(W, H)
          p.pixelDensity(1)
        }

        p.windowResized = () => {
          const parent = hostRef.current!
          W = parent.clientWidth
          H = parent.clientHeight
          p.resizeCanvas(W, H)
        }

        p.mouseMoved = () => {
          cachedMouse = { x: p.mouseX, y: p.mouseY }
          updateAim(cachedMouse.x, cachedMouse.y)
        }
        p.mouseDragged = p.mouseMoved

        p.mousePressed = () => {
          if (p.mouseX < 0 || p.mouseX > W || p.mouseY < 0 || p.mouseY > H) return
          shoot()
        }

        p.draw = () => {
          p.background(12)

          // Planet
          const cx = W / 2
          const cy = H / 2
          p.push()
          p.noStroke()
          p.drawingContext.save()
          const grd = p.drawingContext.createRadialGradient(cx, cy, PLANET_RADIUS * 0.25, cx, cy, PLANET_RADIUS * 1.08)
          grd.addColorStop(0, planetInner)
          grd.addColorStop(1, planetOuter)
            ; (p.drawingContext as CanvasRenderingContext2D).fillStyle = grd
          p.circle(cx, cy, PLANET_RADIUS * 2)
          p.drawingContext.restore()
          p.pop()

          // Cannon mount: smaller U-shape facing downward (not rotated)
          const pivot = v(CANNON_PIVOT.x(), CANNON_PIVOT.y())
          p.push()
          p.translate(pivot.x, pivot.y)
          p.fill('hsl(30 18% 30%)')
          p.noStroke()
          p.beginShape()
          p.vertex(-22, 0)
          p.vertex(22, 0)
          p.vertex(22, 10)
          p.bezierVertex(22, 26, -22, 26, -22, 10)
          p.vertex(-22, 0)
          p.endShape()

          // Rotate gun to aim
          p.rotate(aimAngleGlobal)

          // Breech/body as horizontal U (wider round part than enclosure)
          p.noStroke()
          p.fill('hsl(0 0% 82%)')
          p.ellipse(-18, 0, 34, 26) // wider round back
          p.fill('hsl(0 0% 92%)')
          p.rect(-6, -7, BARREL_LEN + 6, 14, 7) // narrow enclosure/tube

          // Diagonal fuse (cooldown) with sparks
          const cdFrac = Math.min(1, Math.max(0, (performance.now() - lastShot) / COOLDOWN_MS))
          if (cdFrac < 1) {
            const ropeLen = 50
            const segs = 18
            const tBurn = cdFrac
            let burnedUntil = Math.floor(segs * tBurn)
            const pts: Vec[] = []
            for (let i = 0; i <= segs; i++) {
              const u = i / segs
              const x = -10 + u * ropeLen
              const y = -12 - u * 10 + Math.sin(u * Math.PI * 2) * 1.5 // diagonal upwards-left → right
              pts.push(v(x, y))
            }
            p.stroke('hsl(42 40% 70%)')
            p.strokeWeight(3)
            p.noFill()
            p.beginShape()
            for (let i = burnedUntil; i <= segs; i++) p.vertex(pts[i].x, pts[i].y)
            p.endShape()
            if (burnedUntil > 0) {
              p.stroke('hsl(30 10% 25%)')
              p.beginShape()
              for (let i = 0; i <= burnedUntil; i++) p.vertex(pts[i].x, pts[i].y)
              p.endShape()
            }
            const tip = pts[burnedUntil]
            p.noStroke()
            p.fill('hsl(18 90% 60%)')
            p.circle(tip.x, tip.y, 6)
            p.fill('hsl(55 100% 80%)')
            p.circle(tip.x, tip.y, 3)
            // sparks from fuse tip
            spawnParticles(v(tip.x, tip.y), v(Math.cos(aimAngleGlobal), Math.sin(aimAngleGlobal)), 'fuse')
          }
          p.pop()

          // Trajectory preview (dotted)
          const dots = computePreview()
          p.push()
          p.noStroke()
          p.fill('hsl(160 70% 60% / 0.85)')
          for (const d of dots) p.circle(d.x, d.y, 3)
          p.pop()

          // Physics + projectiles
          for (const b of balls) if (b.alive) integrate(b)
          for (let i = balls.length - 1; i >= 0; i--) if (!balls[i].alive) balls.splice(i, 1)

          // Draw live balls
          p.push()
          p.noStroke()
          p.fill('hsl(50 90% 62%)')
          for (const b of balls) p.circle(b.pos.x, b.pos.y, BALL_RADIUS * 2)
          p.pop()

          // Draw static balls where they landed
          p.push()
          p.noStroke()
          p.fill('hsl(50 65% 58%)')
          for (const sb of staticBalls) p.circle(sb.x, sb.y, BALL_RADIUS * 2)
          p.pop()

          // Update & draw particles
          for (let i = particles.length - 1; i >= 0; i--) {
            const pr = particles[i]
            const g = pr.grav ?? 0.02
            pr.vel.y += g
            pr.pos = add(pr.pos, pr.vel)
            pr.life -= 1
            if (pr.life <= 0) particles.splice(i, 1)
          }
          p.push()
          for (const pr of particles) {
            p.noStroke()
            p.fill(pr.color)
            p.circle(pr.pos.x, pr.pos.y, pr.size)
          }
          p.pop()
        }
      }

      p5Instance = new p5mod.default(sketch, hostRef.current as any)
      p5Ref.current = p5Instance
    }

    start()

    return () => {
      mounted = false
      try {
        p5Ref.current?.remove?.()
      } catch { }
    }
  }, [speed])

  return (
    <div className="relative w-full h-full overflow-hidden rounded-2xl bg-neutral-900 shadow-inner shadow-black/50">
      {/* Left vertical slider */}
      <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10 flex items-center gap-3 text-white">
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={speed}
          onChange={(e) => setSpeed(parseInt(e.target.value))}
          className="[writing-mode:bt-lr] rotate-[-90deg] h-32 w-32 accent-white"
        />
        <div className="text-xs select-none">Speed {speed}×</div>
      </div>

      {/* Game screen (100% of wrapper) */}
      <div ref={hostRef} className="w-full h-full" />
    </div>
  )
}
