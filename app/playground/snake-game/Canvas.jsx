import { useRef, useEffect, useState } from "react";

const colors = {
  'awesome': ['#FF84F6', '#C781FF', '#72ADFF', '#75FFA7', '#FFF96E', '#FF8A5B', '#FF446C', '#93FFFA'],
  'lgbt': ['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet'],
  'bi': ['#B00B69', '#420A55', '#042069'],
  'trans': ['#69D1CC', '#F3A8B5', 'white', '#F3A8B5', '#69D1CC'],
};

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
  }
}

function Canvas({snake, apple, direction, boardSize,
  currentColor, setCurrentColor, showArrows, keysPressed}) {
  const canvasRef = useRef(null)
  const [isAwesome, setIsAwesome] = useState(false);

  const directionMatrixTopBorder = [
    ['DOWN'], ['RIGHT', 'DOWN'], ['DOWN'], ['RIGHT', 'DOWN'], ['DOWN'], ['RIGHT', 'DOWN'], ['DOWN'], ['RIGHT', 'DOWN'], ['DOWN'], ['RIGHT', 'DOWN'], ['DOWN'], ['RIGHT', 'DOWN'], ['DOWN'], ['RIGHT', 'DOWN'], ['DOWN'], ['RIGHT', 'DOWN'], ['DOWN'], ['RIGHT', 'DOWN'], ['DOWN'], ['RIGHT']
  ];

  const directionMatrixMiddle =[
    ['LEFT'], ['UP', 'RIGHT'], ['UP', 'LEFT'], ['UP', 'RIGHT'], ['UP', 'LEFT'], ['UP', 'RIGHT'], ['UP', 'LEFT'], ['UP', 'RIGHT'], ['UP', 'LEFT'], ['UP', 'RIGHT'], ['UP', 'LEFT'], ['UP', 'RIGHT'], ['UP', 'LEFT'], ['UP', 'RIGHT'], ['UP', 'LEFT'], ['UP', 'RIGHT'], ['UP', 'LEFT'], ['UP', 'RIGHT'], ['UP', 'LEFT'], ['UP', 'RIGHT'],

    ['LEFT', 'DOWN'], ['RIGHT', 'DOWN'], ['LEFT', 'DOWN'], ['RIGHT', 'DOWN'], ['LEFT', 'DOWN'], ['RIGHT', 'DOWN'], ['LEFT', 'DOWN'], ['RIGHT', 'DOWN'], ['LEFT', 'DOWN'], ['RIGHT', 'DOWN'], ['LEFT', 'DOWN'], ['RIGHT', 'DOWN'], ['LEFT', 'DOWN'], ['RIGHT', 'DOWN'], ['LEFT', 'DOWN'], ['RIGHT', 'DOWN'], ['LEFT', 'DOWN'], ['RIGHT', 'DOWN'], ['LEFT', 'DOWN'], ['RIGHT']
  ];

  const directionMatrixBottomBorder = [
    ['LEFT'], ['UP'], ['UP', 'LEFT'], ['UP'], ['UP', 'LEFT'], ['UP'], ['UP', 'LEFT'], ['UP'], ['UP', 'LEFT'], ['UP'], ['UP', 'LEFT'], ['UP'], ['UP', 'LEFT'], ['UP'], ['UP', 'LEFT'], ['UP'], ['UP', 'LEFT'], ['UP'], ['UP', 'LEFT'], ['UP']
  ];

  const directionMatrix = directionMatrixTopBorder;
  for  (let i = 0; i < (boardSize - 2) / 2; i += 1) {
    directionMatrix.push(...directionMatrixMiddle);
  }
  directionMatrix.push(...directionMatrixBottomBorder);

  const matrixSize = Math.sqrt(directionMatrix.length);
  const matrix = [];
  for(let i = 0; i < matrixSize; i++) {
    matrix[i] = directionMatrix.slice(i * matrixSize, (i + 1) * matrixSize);
  }

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    const dpi = window.devicePixelRatio;
    const style_height = Math.min(200, +getComputedStyle(canvas).getPropertyValue("height").slice(0, -2));
    const style_width = Math.min(200, +getComputedStyle(canvas).getPropertyValue("width").slice(0, -2));
    canvas.setAttribute('height', style_height * dpi);
    canvas.setAttribute('width', style_width * dpi);

    const tileSize = canvas.width / boardSize;
    const tilePadding = tileSize * 0.2;
    const arrowSize = tileSize * 0.13;

    const drawArrow = (i, j, direction) => {
      context.beginPath();
      context.fillStyle = 'red';
      context.strokeStyle = 'red';
      context.lineWidth = 2; // ajuste a espessura da linha conforme necessário
    
      let startX = i * tileSize + tileSize / 2;
      let startY = j * tileSize + tileSize / 2;
    
      let endX = startX;
      let endY = startY;
    
      // Define a direção da seta
      switch (direction) {
        case 'UP':
          endY = startY - tileSize / 2 + arrowSize;
          break;
        case 'DOWN':
          endY = startY + tileSize / 2 - arrowSize;
          break;
        case 'LEFT':
          endX = startX - tileSize / 2 + arrowSize;
          break;
        case 'RIGHT':
          endX = startX + tileSize / 2 - arrowSize;
          break;
      }
    
      // Desenha a linha da seta
      context.moveTo(startX, startY);
      context.lineTo(endX, endY);
    
      // Desenha a ponta da seta
      context.moveTo(endX, endY);
      switch (direction) {
        case 'UP':
          context.lineTo(endX - arrowSize, endY + arrowSize);
          context.lineTo(endX + arrowSize, endY + arrowSize);
          break;
        case 'DOWN':
          context.lineTo(endX - arrowSize, endY - arrowSize);
          context.lineTo(endX + arrowSize, endY - arrowSize);
          break;
        case 'LEFT':
          context.lineTo(endX + arrowSize, endY - arrowSize);
          context.lineTo(endX + arrowSize, endY + arrowSize);
          break;
        case 'RIGHT':
          context.lineTo(endX - arrowSize, endY - arrowSize);
          context.lineTo(endX - arrowSize, endY + arrowSize);
          break;
      }
    
      context.closePath();
      context.fill();
      context.stroke();
    }

    const draw = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);

      context.fillStyle = "rgba(120, 120, 120, 0.96)";
      for (let i = 0; i < boardSize; i++) {
        for (let j = 0; j < boardSize; j++) {
          context.fillRect(i * tileSize + tilePadding / 2, j * tileSize + tilePadding / 2, tileSize - tilePadding, tileSize - tilePadding);
        }
      }

      // desenha as setas na posição da directionMatrix
      if (showArrows) {
        for (let i = 0; i < boardSize; i++) {
          for (let j = 0; j < boardSize; j++) {
            const directions = matrix[i][j];
            for (let k = 0; k < directions.length; k++) {
              drawArrow(i, j, directions[k]);
            }
          }
        }
      }
    
      function getColorScheme(key, colorObject) {
        for (let i = 0; i < Object.keys(colorObject).length; i++) {
          if (key.includes(Object.keys(colorObject)[i])) {
            setIsAwesome(key === 'awesome' ? true : false);
            return colorObject[Object.keys(colorObject)[i]];
          }
        }
        return;
      }

      for (let i = 0; i < snake.length; i += 1) {
        const segment = snake[i];
        const colorIntensity = Math.floor(255 - i * (255 / (snake.length * 1.7)));
        const defaultColor = `rgb(0, ${colorIntensity}, ${255-colorIntensity})`;

        let colorScheme = getColorScheme(keysPressed, colors);
        if (colorScheme) setCurrentColor(colorScheme);
        currentColor = currentColor.slice(0, snake.length);
        let segmentsPerColor = Math.floor(snake.length / currentColor?.length);
        let colorIndex = isAwesome
          ? i % currentColor?.length
          : Math.floor(i / segmentsPerColor);
        if (isAwesome) shuffleArray(currentColor);
        
        context.fillStyle = currentColor[0] ? currentColor[colorIndex] : defaultColor;
        context.fillRect(segment.x * tileSize, segment.y * tileSize, tileSize, tileSize);
    
        if (i === 0) { // Desenho dos olhos da cobra
          context.fillStyle = currentColor[0] === 'red' ? 'purple' : 'red';
          if (direction.x === 1) {
            context.fillRect((segment.x + 0.6) * tileSize, (segment.y + 0.25) * tileSize, tileSize / 5, tileSize / 5);
            context.fillRect((segment.x + 0.6) * tileSize, (segment.y + 0.6) * tileSize, tileSize / 5, tileSize / 5);
          } else if (direction.x === -1) {
            context.fillRect((segment.x + 0.2) * tileSize, (segment.y + 0.25) * tileSize, tileSize / 5, tileSize / 5);
            context.fillRect((segment.x + 0.2) * tileSize, (segment.y + 0.6) * tileSize, tileSize / 5, tileSize / 5);
          } else if (direction.y === -1) {
            context.fillRect((segment.x + 0.25) * tileSize, (segment.y + 0.2) * tileSize, tileSize / 5, tileSize / 5);
            context.fillRect((segment.x + 0.6) * tileSize, (segment.y + 0.2) * tileSize, tileSize / 5, tileSize / 5);
          } else {
            context.fillRect((segment.x + 0.25) * tileSize, (segment.y + 0.6) * tileSize, tileSize / 5, tileSize / 5);
            context.fillRect((segment.x + 0.6) * tileSize, (segment.y + 0.6) * tileSize, tileSize / 5, tileSize / 5);
          }
        }
      }
    
      const applePixelArt = [
        [null, '#2EAD53', null, null, null], 
        [null, '#BA222E', '#2EAD53', '#BA222E', null],
        ['#821C29', '#BA222E', '#BA222E', '#BA222E', '#BA222E'],
        ['#821C29', '#BA222E', '#BA222E', '#BA222E', '#BA222E'],
        ['#821C29', '#821C29', '#BA222E', '#BA222E', '#BA222E'],
        [null, '#821C29', '#821C29', '#821C29', null],
      ];
      
      for (let i = 0; i < applePixelArt.length; i++) {
        for (let j = 0; j < applePixelArt[i].length; j++) {
          if (applePixelArt[i][j]) {
            context.fillStyle = applePixelArt[i][j];
            context.fillRect(
              apple.x * tileSize + j * tileSize / applePixelArt[i].length,
              apple.y * tileSize + i * tileSize / applePixelArt.length,
              tileSize / applePixelArt[i].length,
              tileSize / applePixelArt.length
            );
          }
        }
      }
    
      context.strokeStyle = "transparent";
      for (let i = 0; i <= boardSize; i += 1) {
        context.beginPath();
        context.moveTo(i * tileSize, 0);
        context.lineTo(i * tileSize, boardSize * tileSize);
        context.stroke();

        context.beginPath();
        context.moveTo(0, i * tileSize);
        context.lineTo(boardSize * tileSize, i * tileSize);
        context.stroke();
      }
    }

    context.clearRect(0, 0, canvas.width, canvas.height)
    draw();
  }, [snake, apple, boardSize, direction])

  return <canvas ref={canvasRef} style={{width: "800px", height: "800px"}} />
}

export default Canvas;
