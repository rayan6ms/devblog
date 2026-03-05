"use client";

import { NextReactP5Wrapper } from "@p5-wrapper/next";
import type { Sketch } from "@p5-wrapper/react";
import type p5Types from "p5";
import { useCallback, useRef } from "react";
import { useElementSize } from "@/hooks/useElementSize";

type V2 = { x: number; y: number };

type SketchProps = { width: number; height: number };

export default function LabyrinthExplorer() {
	const { ref: hostRef, size } = useElementSize<HTMLDivElement>();
	const sizeRef = useRef<SketchProps>({ width: 1, height: 1 });

	const sketch = useCallback<Sketch<SketchProps>>((s) => {
		let pts: V2[] = [];
		let vels: V2[] = [];
		let cols: p5Types.Color[] = [];
		let base: p5Types.Color;
		let grid = 10;
		let w = 800;
		let h = 800;

		const init = () => {
			s.pixelDensity(1);
			w = Math.max(1, sizeRef.current.width);
			h = Math.max(1, sizeRef.current.height);
			if (s.canvas) s.resizeCanvas(w, h, true);
			else s.createCanvas(w, h);
			s.frameRate(30);
			s.noStroke();
			const n = 30;
			pts = [];
			vels = [];
			cols = [];
			base = s.color(s.random(255), s.random(255), s.random(255));
			for (let i = 0; i < n; i++) {
				pts.push({ x: s.random(w), y: s.random(h) });
				vels.push({ x: s.random(-0.6, 0.6), y: s.random(-0.6, 0.6) });
				const c = s.lerpColor(
					base,
					s.color(s.random(255), s.random(255), s.random(255)),
					s.random(0.4, 0.9),
				);
				cols.push(c);
			}
			grid = Math.max(6, Math.floor(Math.min(w, h) / 120));
		};

		const update = () => {
			for (let i = 0; i < pts.length; i++) {
				const p = pts[i];
				const v = vels[i];
				p.x += v.x;
				p.y += v.y;
				if (p.x >= w) {
					p.x = w;
					v.x *= -1;
				} else if (p.x <= 0) {
					p.x = 0;
					v.x *= -1;
				}
				if (p.y >= h) {
					p.y = h;
					v.y *= -1;
				} else if (p.y <= 0) {
					p.y = 0;
					v.y *= -1;
				}
			}
		};

		const drawVoronoi = () => {
			for (let x = 0; x < w; x += grid) {
				for (let y = 0; y < h; y += grid) {
					let best = Infinity;
					let idx = 0;
					for (let i = 0; i < pts.length; i++) {
						const dx = x - pts[i].x;
						const dy = y - pts[i].y;
						const d = dx * dx + dy * dy;
						if (d < best) {
							best = d;
							idx = i;
						}
					}
					s.fill(cols[idx]);
					s.rect(x, y, grid, grid);
				}
			}
		};

		s.setup = () => {
			s.createCanvas(1, 1);
			init();
		};

		s.draw = () => {
			s.background(255);
			update();
			drawVoronoi();
		};

		s.updateWithProps = (props) => {
			if (!props?.width || !props?.height) return;
			if (
				props.width !== sizeRef.current.width ||
				props.height !== sizeRef.current.height
			) {
				sizeRef.current = { width: props.width, height: props.height };
				init();
			}
		};
	}, []);

	return (
		<div ref={hostRef} className="relative w-full h-full">
			<NextReactP5Wrapper
				sketch={sketch}
				width={size.width}
				height={size.height}
			/>
		</div>
	);
}
