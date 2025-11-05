import Sketch from 'react-p5';
import { ReactElement, useRef } from 'react';
import p5Types from 'p5';

export default function P5Background(): ReactElement {
  const colors = useRef<{
    baseColor: p5Types.Color,
    secondColor: p5Types.Color,
    thirdColor: p5Types.Color,
    fourthColor: p5Types.Color
  } | null>(null);

  const time = useRef<number>(0);
  const cellSize = 20;
  const noiseScale = 0.002;

  function setup(p5: p5Types, canvasParentRef: Element): void {
    p5.createCanvas(p5.windowWidth, p5.windowHeight).parent(canvasParentRef);
    p5.pixelDensity(1);
    p5.colorMode(p5.RGB);

    selectColors(p5);
  }

  function draw(p5: p5Types): void {
    p5.background(255, 255, 255, 25);

    if (colors.current) {
      drawGrid(p5, time.current, colors.current);
    }

    time.current += 0.005;
  }

  function windowResized(p5: p5Types): void {
    p5.resizeCanvas(p5.windowWidth, p5.windowHeight);
  }

  function drawGrid(
    p5: p5Types,
    t: number,
    { baseColor, secondColor, thirdColor, fourthColor }: {
      baseColor: p5Types.Color,
      secondColor: p5Types.Color,
      thirdColor: p5Types.Color,
      fourthColor: p5Types.Color
    }
  ): void {
    for (let x = 0; x < p5.width; x += cellSize) {
      for (let y = 0; y < p5.height; y += cellSize) {
        const noiseVal = p5.noise(x * noiseScale + t, y * noiseScale);
        let col;
        
        if (noiseVal < 0.33) {
          col = p5.lerpColor(
            baseColor,
            secondColor,
            p5.map(noiseVal, 0, 0.33, 0, 1)
          );
        } else if (noiseVal < 0.66) {
          col = p5.lerpColor(
            secondColor,
            thirdColor,
            p5.map(noiseVal, 0.33, 0.66, 0, 1)
          );
        } else {
          col = p5.lerpColor(
            thirdColor,
            fourthColor,
            p5.map(noiseVal, 0.66, 1, 0, 1)
          );
        }

        p5.noStroke();
        p5.fill(col);
        p5.rect(x, y, cellSize, cellSize);
      }
    }
  }

  function selectColors(p5: p5Types): void {
    let base = getRandomColor(p5);
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

    colors.current = { baseColor: base, secondColor: second, thirdColor: third, fourthColor: fourth };
  }

  function getRandomColor(p5: p5Types): p5Types.Color {
    return p5.color(p5.random(255), p5.random(255), p5.random(255));
  }

  function colorDistance(p5: p5Types, c1: p5Types.Color, c2: p5Types.Color): number {
    const rDiff = p5.red(c1) - p5.red(c2);
    const gDiff = p5.green(c1) - p5.green(c2);
    const bDiff = p5.blue(c1) - p5.blue(c2);
    return p5.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff);
  }

  return (
    <Sketch
      className="absolute"
      setup={setup}
      draw={draw}
      windowResized={windowResized}
    />
  );
};