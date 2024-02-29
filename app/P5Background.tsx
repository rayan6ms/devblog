import Sketch from 'react-p5';
import { ReactElement, useRef } from 'react';
import p5Types from 'p5';

export default function P5Background(): ReactElement {
  const colors = useRef<{
    baseColor: p5Types.Color,
    secondColor: p5Types.Color,
    thirdColor: p5Types.Color,
    fourthColor: p5Types.Color
  }>();

  let noiseScale: number = 0.002;
  let time = useRef<number>(0);

  function setup(p5: p5Types, canvasParentRef: Element) {
    p5.createCanvas(p5.windowWidth, p5.windowHeight).parent(canvasParentRef);
    p5.pixelDensity(1);
    p5.colorMode(p5.RGB);

    colors.current = {
      baseColor: p5.color(p5.random(255), p5.random(255), p5.random(255)),
      secondColor: getRandomColor(p5),
      thirdColor: getRandomColor(p5),
      fourthColor: getRandomColor(p5),
    };

    selectColors(p5);
  };

  function draw(p5: p5Types) {
    p5.background(255, 255, 255, 25);
    if (colors.current) {
      drawGrid(p5, time.current, colors.current);
    }

    time.current += 0.005;
  };

  function drawGrid (p5: p5Types, t: number, { baseColor, secondColor, thirdColor, fourthColor }: {
    baseColor: p5Types.Color,
    secondColor: p5Types.Color,
    thirdColor: p5Types.Color,
    fourthColor: p5Types.Color
  }) {
    for (let x = 0; x < p5.width; x += 20) {
      for (let y = 0; y < p5.height; y += 20) {
        let noiseVal = p5.noise(x * noiseScale + t, y * noiseScale);
        let col;

        if (noiseVal < 0.33) {
          col = p5.lerpColor(baseColor, secondColor, p5.map(noiseVal, 0, 0.33, 0, 1));
        } else if (noiseVal < 0.66) {
          col = p5.lerpColor(secondColor, thirdColor, p5.map(noiseVal, 0.33, 0.66, 0, 1));
        } else {
          col = p5.lerpColor(thirdColor, fourthColor, p5.map(noiseVal, 0.66, 1, 0, 1));
        }

        p5.fill(col);
        p5.noStroke();
        p5.rect(x, y, 20, 20);
      }
    }
  };

  function selectColors(p5: p5Types) {
    baseColor = p5.color(p5.random(255), p5.random(255), p5.random(255));
    secondColor = getRandomColor(p5);
    thirdColor = getRandomColor(p5);
    fourthColor = getRandomColor(p5);

    while (colorDistance(p5, baseColor, secondColor) < 50) {
      secondColor = getRandomColor(p5);
    }

    while (colorDistance(p5, baseColor, thirdColor) < 50 || colorDistance(p5, secondColor, thirdColor) < 50) {
      thirdColor = getRandomColor(p5);
    }

    while (
      colorDistance(p5, baseColor, fourthColor) < 50
        || colorDistance(p5, secondColor, fourthColor) < 50
        || colorDistance(p5, thirdColor, fourthColor) < 50
    ) {
      fourthColor = getRandomColor(p5);
    }
  };

  function  getRandomColor(p5: p5Types): p5Types.Color {
    return p5.color(p5.random(255), p5.random(255), p5.random(255));
  };

  function colorDistance(p5: p5Types, c1: p5Types.Color, c2: p5Types.Color): number {
    let rDiff = p5.red(c1) - p5.red(c2);
    let gDiff = p5.green(c1) - p5.green(c2);
    let bDiff = p5.blue(c1) - p5.blue(c2);
    return p5.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff);
  };

  let baseColor;
  let secondColor;
  let thirdColor;
  let fourthColor;

  return <Sketch className="absolute" setup={setup} draw={draw} />;
};