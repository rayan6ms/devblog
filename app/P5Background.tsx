"use client";

import { NextReactP5Wrapper } from "@p5-wrapper/next";
import type { Sketch } from "@p5-wrapper/react";
import type p5Types from "p5";
import { type ReactElement, useCallback, useRef } from "react";

const CELL_SIZE = 20;
const NOISE_SCALE = 0.002;

type Palette = {
	baseColor: p5Types.Color;
	secondColor: p5Types.Color;
	thirdColor: p5Types.Color;
	fourthColor: p5Types.Color;
};

function getRandomColor(p5: p5Types): p5Types.Color {
	return p5.color(p5.random(255), p5.random(255), p5.random(255));
}

function colorDistance(
	p5: p5Types,
	c1: p5Types.Color,
	c2: p5Types.Color,
): number {
	const rDiff = p5.red(c1) - p5.red(c2);
	const gDiff = p5.green(c1) - p5.green(c2);
	const bDiff = p5.blue(c1) - p5.blue(c2);
	return p5.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff);
}

function selectColors(p5: p5Types): Palette {
	const base = getRandomColor(p5);
	let second = getRandomColor(p5);
	let third = getRandomColor(p5);
	let fourth = getRandomColor(p5);

	while (colorDistance(p5, base, second) < 50) {
		second = getRandomColor(p5);
	}
	while (
		colorDistance(p5, base, third) < 50 ||
		colorDistance(p5, second, third) < 50
	) {
		third = getRandomColor(p5);
	}
	while (
		colorDistance(p5, base, fourth) < 50 ||
		colorDistance(p5, second, fourth) < 50 ||
		colorDistance(p5, third, fourth) < 50
	) {
		fourth = getRandomColor(p5);
	}

	return {
		baseColor: base,
		secondColor: second,
		thirdColor: third,
		fourthColor: fourth,
	};
}

function drawGrid(
	p5: p5Types,
	t: number,
	{ baseColor, secondColor, thirdColor, fourthColor }: Palette,
): void {
	for (let x = 0; x < p5.width; x += CELL_SIZE) {
		for (let y = 0; y < p5.height; y += CELL_SIZE) {
			const noiseVal = p5.noise(x * NOISE_SCALE + t, y * NOISE_SCALE);
			let col: p5Types.Color;

			if (noiseVal < 0.33) {
				col = p5.lerpColor(
					baseColor,
					secondColor,
					p5.map(noiseVal, 0, 0.33, 0, 1),
				);
			} else if (noiseVal < 0.66) {
				col = p5.lerpColor(
					secondColor,
					thirdColor,
					p5.map(noiseVal, 0.33, 0.66, 0, 1),
				);
			} else {
				col = p5.lerpColor(
					thirdColor,
					fourthColor,
					p5.map(noiseVal, 0.66, 1, 0, 1),
				);
			}

			p5.noStroke();
			p5.fill(col);
			p5.rect(x, y, CELL_SIZE, CELL_SIZE);
		}
	}
}

export default function P5Background(): ReactElement {
	const colors = useRef<Palette | null>(null);

	const time = useRef<number>(0);

	const sketch = useCallback<Sketch>((p5) => {
		p5.setup = () => {
			p5.createCanvas(p5.windowWidth, p5.windowHeight);
			p5.pixelDensity(1);
			p5.colorMode(p5.RGB);
			colors.current = selectColors(p5);
		};

		p5.draw = () => {
			p5.background(255, 255, 255, 25);

			if (colors.current) {
				drawGrid(p5, time.current, colors.current);
			}

			time.current += 0.005;
		};

		p5.windowResized = () => {
			p5.resizeCanvas(p5.windowWidth, p5.windowHeight);
		};
	}, []);

	return <NextReactP5Wrapper sketch={sketch} />;
}
