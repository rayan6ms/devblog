"use client";

import React, { useEffect, useRef, useState } from "react";
import p5 from "p5";

export default function SineWaves() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const p5Ref = useRef<p5 | null>(null);
  const [mounted, setMounted] = useState(false);

  const [numCircles, setNumCircles] = useState(5);
  const [baseRadius, setBaseRadius] = useState(120);
  const [decay, setDecay] = useState(0.65);
  const [speedK, setSpeedK] = useState(0.02);
  const [trailRatio, setTrailRatio] = useState(0.5);
  const [showGuides, setShowGuides] = useState(true);
  const [strokeWeightPx, setStrokeWeightPx] = useState(2);
  const [waveAxis, setWaveAxis] = useState<"x" | "y">("y");

  const settingsRef = useRef({
    numCircles: 5,
    baseRadius: 120,
    decay: 0.65,
    speedK: 0.02,
    trailRatio: 0.5,
    showGuides: true,
    strokeWeightPx: 2,
    waveAxis: "y" as "x" | "y",
  });

  useEffect(() => {
    settingsRef.current = {
      numCircles,
      baseRadius,
      decay,
      speedK,
      trailRatio,
      showGuides,
      strokeWeightPx,
      waveAxis,
    };
  }, [numCircles, baseRadius, decay, speedK, trailRatio, showGuides, strokeWeightPx, waveAxis]);

  useEffect(() => {
    if (!hostRef.current) return;
    setMounted(true);

    let sketch = (p: p5) => {
      let angles: number[] = [];
      let wave: number[] = [];
      let ro: ResizeObserver | null = null;
      const fit = () => {
        if (!hostRef.current) return;
        const r = hostRef.current.getBoundingClientRect();
        p.resizeCanvas(r.width, r.height);
      };

      p.setup = () => {
        const rect = hostRef.current!.getBoundingClientRect();
        p.createCanvas(rect.width, rect.height);
        p.noFill();
        resetAngles();
        ro = new ResizeObserver(fit);
        ro.observe(hostRef.current!);
      };

      const resetAngles = () => {
        angles = [];
        for (let i = 0; i < settingsRef.current.numCircles; i++) angles.push(-p.HALF_PI);
      };

      const ensureArrays = () => {
        const target = settingsRef.current.numCircles;
        if (angles.length !== target) {
          if (angles.length < target) {
            for (let i = angles.length; i < target; i++) angles.push(-p.HALF_PI);
          } else {
            angles.length = target;
          }
        }
      };

      p.draw = () => {
        const s = settingsRef.current;
        ensureArrays();
        p.background(20);
        p.strokeWeight(s.strokeWeightPx);

        const centerX = p.width * 0.25;
        const centerY = p.height * 0.5;

        let xCurrent = centerX;
        let yCurrent = centerY;
        let radius = s.baseRadius;

        for (let i = 0; i < s.numCircles; i++) {
          const xNext = xCurrent + radius * Math.cos(angles[i]);
          const yNext = yCurrent + radius * Math.sin(angles[i]);

          if (s.showGuides) {
            p.stroke(255, 255, 255, 80);
            p.ellipse(xCurrent, yCurrent, radius * 2);
          }

          if (s.showGuides && i === s.numCircles - 1) {
            p.stroke(0, 255, 0);
            p.line(xCurrent, yCurrent - radius, xCurrent, yCurrent + radius);
            p.stroke(255, 0, 0);
            p.line(xCurrent - radius, yCurrent, xCurrent + radius, yCurrent);
          }

          xCurrent = xNext;
          yCurrent = yNext;
          radius *= s.decay;
          angles[i] += (i + 1) * s.speedK;
        }

        if (s.showGuides) {
          p.stroke(100, 100, 255);
          if (s.waveAxis === "y") p.line(xCurrent, yCurrent, p.width / 2, yCurrent);
          else p.line(xCurrent, yCurrent, xCurrent, p.height / 2);
        }

        p.fill(255);
        p.noStroke();
        p.circle(xCurrent, yCurrent, 8);
        if (s.showGuides) {
          p.circle(s.waveAxis === "y" ? p.width / 2 : xCurrent, s.waveAxis === "y" ? yCurrent : p.height / 2, 8);
        }

        if (s.showGuides) {
          p.stroke(255, 165, 0);
          p.noFill();
          if (s.waveAxis === "y") {
            p.line(xCurrent, yCurrent, xCurrent, centerY);
            p.line(xCurrent, yCurrent, centerX, yCurrent);
            p.circle(xCurrent, centerY, 8);
            p.circle(centerX, yCurrent, 8);
          } else {
            p.line(xCurrent, yCurrent, centerX, yCurrent);
            p.line(xCurrent, yCurrent, xCurrent, centerY);
            p.circle(centerX, yCurrent, 8);
            p.circle(xCurrent, centerY, 8);
          }
        }

        if (s.waveAxis === "y") wave.unshift(yCurrent);
        else wave.unshift(xCurrent);

        p.noFill();
        p.stroke(255);
        p.beginShape();
        if (s.waveAxis === "y") {
          for (let i = 0; i < wave.length; i++) p.vertex(p.width / 2 + i, wave[i]);
        } else {
          for (let i = 0; i < wave.length; i++) p.vertex(wave[i], p.height / 2 + i);
        }
        p.endShape();

        const maxTrail = Math.floor((s.waveAxis === "y" ? p.width : p.height) * s.trailRatio);
        if (wave.length > maxTrail) wave.pop();
      };

      p.mousePressed = () => { };

      p.remove = new Proxy(p.remove, {
        apply(target, thisArg, argArray) {
          if (ro && hostRef.current) ro.disconnect();
          return Reflect.apply(target, thisArg, argArray);
        },
      });
    };

    p5Ref.current = new p5(sketch, hostRef.current);

    return () => {
      if (p5Ref.current) {
        p5Ref.current.remove();
        p5Ref.current = null;
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      <div className="absolute inset-0" ref={hostRef} />

      <div className="absolute top-0 left-0 right-0 z-10 backdrop-blur bg-black/40 text-white border-b border-white/10">
        <div className="max-w-screen-xl mx-auto px-4 py-3 flex flex-wrap items-center gap-4">
          <div className="text-sm font-semibold tracking-wide uppercase">Sine Waves</div>

          <div className="flex items-center gap-2">
            <label className="text-xs opacity-90">Circles</label>
            <input
              type="range"
              min={1}
              max={24}
              value={numCircles}
              onChange={(e) => setNumCircles(parseInt(e.target.value))}
              className="w-32 accent-white"
            />
            <span className="text-xs tabular-nums w-6 text-center">{numCircles}</span>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs opacity-90">Base Radius</label>
            <input
              type="range"
              min={40}
              max={300}
              value={baseRadius}
              onChange={(e) => setBaseRadius(parseInt(e.target.value))}
              className="w-32 accent-white"
            />
            <span className="text-xs tabular-nums w-10 text-center">{baseRadius}</span>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs opacity-90">Decay</label>
            <input
              type="range"
              min={0.3}
              max={0.95}
              step={0.01}
              value={decay}
              onChange={(e) => setDecay(parseFloat(e.target.value))}
              className="w-32 accent-white"
            />
            <span className="text-xs tabular-nums w-10 text-center">{decay.toFixed(2)}</span>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs opacity-90">Speed</label>
            <input
              type="range"
              min={0.001}
              max={0.08}
              step={0.001}
              value={speedK}
              onChange={(e) => setSpeedK(parseFloat(e.target.value))}
              className="w-32 accent-white"
            />
            <span className="text-xs tabular-nums w-12 text-center">{speedK.toFixed(3)}</span>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs opacity-90">Trail</label>
            <input
              type="range"
              min={0.05}
              max={1}
              step={0.01}
              value={trailRatio}
              onChange={(e) => setTrailRatio(parseFloat(e.target.value))}
              className="w-32 accent-white"
            />
            <span className="text-xs tabular-nums w-10 text-center">{Math.round(trailRatio * 100)}%</span>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs opacity-90">Stroke</label>
            <input
              type="range"
              min={1}
              max={6}
              value={strokeWeightPx}
              onChange={(e) => setStrokeWeightPx(parseInt(e.target.value))}
              className="w-24 accent-white"
            />
            <span className="text-xs tabular-nums w-6 text-center">{strokeWeightPx}</span>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs opacity-90">Wave Axis</label>
            <select
              value={waveAxis}
              onChange={(e) => setWaveAxis(e.target.value as "x" | "y")}
              className="bg-white/10 border border-white/20 rounded-md px-2 py-1 text-xs"
            >
              <option value="y">Horizontal</option>
              <option value="x">Vertical</option>
            </select>
          </div>

          <label className="flex items-center gap-2 ml-auto text-xs">
            <input
              type="checkbox"
              checked={showGuides}
              onChange={(e) => setShowGuides(e.target.checked)}
              className="accent-white"
            />
            Show Guides
          </label>
        </div>
      </div>

      <div className="absolute inset-0 pt-12" />

      {!mounted && (
        <div className="absolute inset-0 grid place-items-center text-white/70 text-sm">
          Initializing…
        </div>
      )}
    </div>
  );
}
