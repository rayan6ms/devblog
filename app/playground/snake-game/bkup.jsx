'use client'

import { useState, useEffect, useCallback } from 'react';
import useInterval from './useInterval';
import PF from 'pathfinding';
import Board from './Board';

const directions = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};
const BOARD_SIZE = 20;
let direction = Object.values(directions)[Math.floor(Math.random() * 4)];

function SnakeGame() {
  const [segments, setSegments] = useState([{ 
    x: Math.floor(Math.random() * (BOARD_SIZE - 10) + 5), 
    y: Math.floor(Math.random() * (BOARD_SIZE - 10) + 5)
  }]);
  const [apple, setApple] = useState({ x: 10, y: 10 });
  const [score, setScore] = useState(0);
  const [steps, setSteps] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [paused, setPaused] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const [directionQueue, setDirectionQueue] = useState([]);
  const [keysPressed, setKeysPressed] = useState('');

  useEffect(() => {
    placeApple();
  }, []);

  function placeApple() {
    let newApplePosition;
    while (true) {
      newApplePosition = {
        x: Math.floor(Math.random() * BOARD_SIZE),
        y: Math.floor(Math.random() * BOARD_SIZE),
      };
      
      if (!segments.some(seg => seg.x === newApplePosition.x && seg.y === newApplePosition.y)) {
        break;
      }
    }
    setApple(newApplePosition);
  };

  const directionMatrixTopBorder = {
    '0,0':[directions.DOWN], '0,1':[directions.RIGHT, directions.DOWN],
    '0,2':[directions.DOWN], '0,3':[directions.RIGHT, directions.DOWN],
    '0,4':[directions.DOWN], '0,5':[directions.RIGHT, directions.DOWN],
    '0,6':[directions.DOWN], '0,7':[directions.RIGHT, directions.DOWN],
    '0,8':[directions.DOWN], '0,9':[directions.RIGHT, directions.DOWN],
    '0,10':[directions.DOWN], '0,11':[directions.RIGHT, directions.DOWN],
    '0,12':[directions.DOWN], '0,13':[directions.RIGHT, directions.DOWN],
    '0,14':[directions.DOWN], '0,15':[directions.RIGHT, directions.DOWN],
    '0,16':[directions.DOWN], '0,17':[directions.RIGHT, directions.DOWN],
    '0,18':[directions.DOWN], '0,19':[directions.RIGHT]
  };

  const directionMatrixMiddle = [
    [directions.LEFT], [directions.UP, directions.RIGHT], [directions.UP, directions.LEFT], [directions.UP, directions.RIGHT], [directions.UP, directions.LEFT], [directions.UP, directions.RIGHT], [directions.UP, directions.LEFT], [directions.UP, directions.RIGHT], [directions.UP, directions.LEFT], [directions.UP, directions.RIGHT], [directions.UP, directions.LEFT], [directions.UP, directions.RIGHT], [directions.UP, directions.LEFT], [directions.UP, directions.RIGHT], [directions.UP, directions.LEFT], [directions.UP, directions.RIGHT], [directions.UP, directions.LEFT], [directions.UP, directions.RIGHT], [directions.UP, directions.LEFT], [directions.UP, directions.RIGHT],

    [directions.LEFT, directions.DOWN], [directions.RIGHT, directions.DOWN], [directions.LEFT, directions.DOWN], [directions.RIGHT, directions.DOWN], [directions.LEFT, directions.DOWN], [directions.RIGHT, directions.DOWN], [directions.LEFT, directions.DOWN], [directions.RIGHT, directions.DOWN], [directions.LEFT, directions.DOWN], [directions.RIGHT, directions.DOWN], [directions.LEFT, directions.DOWN], [directions.RIGHT, directions.DOWN], [directions.LEFT, directions.DOWN], [directions.RIGHT, directions.DOWN], [directions.LEFT, directions.DOWN], [directions.RIGHT, directions.DOWN], [directions.LEFT, directions.DOWN], [directions.RIGHT, directions.DOWN], [directions.LEFT, directions.DOWN], [directions.RIGHT]
  ];

  const directionMatrixBottomBorder = {
    '19,0':[directions.LEFT], '19,1':[directions.UP],
    '19,2':[directions.UP, directions.LEFT], '19,3':[directions.UP],
    '19,4':[directions.UP, directions.LEFT], '19,5':[directions.UP],
    '19,6':[directions.UP, directions.LEFT], '19,7':[directions.UP],
    '19,8':[directions.UP, directions.LEFT], '19,9':[directions.UP],
    '19,10':[directions.UP, directions.LEFT], '19,11':[directions.UP],
    '19,12':[directions.UP, directions.LEFT], '19,13':[directions.UP],
    '19,14':[directions.UP, directions.LEFT], '19,15':[directions.UP],
    '19,16':[directions.UP, directions.LEFT], '19,17':[directions.UP],
    '19,18':[directions.UP, directions.LEFT], '19,19':[directions.UP]
  };

  let directionMatrix = {};
  for (const [key, value] of Object.entries(directionMatrixTopBorder)) {
    directionMatrix[key] = value;
  }

  for (let x = 1; x < BOARD_SIZE - 1; x += 2) {
    for (let y = 0; y < BOARD_SIZE; y += 1) {
      const key1 = `${x},${y}`;
      const key2 = `${x + 1},${y}`;
      directionMatrix[key1] = directionMatrixMiddle[y];
      directionMatrix[key2] = directionMatrixMiddle[y + BOARD_SIZE];
    }
  }

  for (const [key, value] of Object.entries(directionMatrixBottomBorder)) {
    directionMatrix[key] = value;
  }

  const checkCollision = useCallback((head) => {
    if (head.x < 0 || head.y < 0 || head.x >= BOARD_SIZE || head.y >= BOARD_SIZE) {
      return true;
    }

    for (let i = 1; i < segments.length; i += 1) {
      if (segments[i].x === head.x && segments[i].y === head.y) return true;
    }

    return false;
  }, [segments]);

  const getAStarDirection = useCallback((head) => {
    const grid = new PF.Grid(BOARD_SIZE, BOARD_SIZE);
    const finder = new PF.AStarFinder();
  
    for (const segment of segments) {
      grid.setWalkableAt(segment.x, segment.y, false);
    }
  
    const path = finder.findPath(head.x, head.y, apple.x, apple.y, grid);
  
    if (path.length <= 1) {
      return null;
    }
  
    const nextStep = path[1];
    const dx = nextStep[0] - head.x;
    const dy = nextStep[1] - head.y;
  
    if (dx === 1) return directions.RIGHT;
    if (dx === -1) return directions.LEFT;
    if (dy === 1) return directions.DOWN;
    if (dy === -1) return directions.UP;
  }, [segments, apple]);

  const getHamiltonianDirection = useCallback((head) => {
    const possibleDirections = directionMatrix[`${head.x},${head.y}`].filter(possibleDirection => {
      const newHead = { x: head.x + possibleDirection.x, y: head.y + possibleDirection.y };
      return !segments.some(segment => segment.x === newHead.x && segment.y === newHead.y);
    });
  
    const aStarDirection = getAStarDirection(head);
    if (possibleDirections.includes(aStarDirection)) {
      return aStarDirection;
    }
  
    return possibleDirections[Math.floor(Math.random() * possibleDirections.length)];
  }, [segments, getAStarDirection]);

  function updateGame() {
    if (autoPlay) direction = getHamiltonianDirection(segments[0]);

    const nextDirection = directionQueue[0];
    if (nextDirection) {
      const isOppositeDirection = (
        nextDirection.x === -direction.x && nextDirection.y === direction.y)
        || (nextDirection.y === -direction.y && nextDirection.x === direction.x);

      if (!isOppositeDirection) {
        setDirectionQueue(prevQueue => prevQueue.slice(1));
        direction = nextDirection;
      } else {
        setDirectionQueue(prevQueue => prevQueue.slice(1));
      }
    }

    const head = segments[0];

    if (checkCollision(head)) {
      setGameOver(true);
      setDirectionQueue([]);
      return;
    }

    const newSegments = [{ x: head.x + direction.x, y: head.y + direction.y }, ...segments];

    if (head.x + direction.x === apple.x && head.y + direction.y === apple.y) {
      setScore(score + 1);
      placeApple();
    } else {
      newSegments.pop();
    }
    
    setSegments(newSegments);
    setSteps(steps + 1);
  };

  useInterval(() => {
    updateGame();
  }, gameOver || paused ? null : 200 / speed);

  const handleSpeedChange = (delta) =>  {
    setSpeed(prevSpeed => Math.max(0.5, Math.min(5, prevSpeed + delta)));
  };

  function changeDirection(e) {
    e.preventDefault();

    if (['Tab', 'Alt', 'Control'].includes(e.key)) return;
    if (e.key?.length === 1) setKeysPressed(`${keysPressed}${e.key}`.slice(-7));

    if (gameOver) {
      setSegments([{ 
        x: Math.floor(Math.random() * (BOARD_SIZE - 10) + 5), 
        y: Math.floor(Math.random() * (BOARD_SIZE - 10) + 5)
      }]);
      direction = Object.values(directions)[Math.floor(Math.random() * 4)];
      setScore(0);
      placeApple();
      setGameOver(false);
      setPaused(false);
      setSteps(0);
      return;
    }

    if (e.key === ' ' || e.key === 'Escape') setPaused(true);

    if (paused) setPaused(false); else setAutoPlay(false);

    const newDirection = e.key === 'ArrowUp' || e.key === 'w' ? directions.UP
    : e.key === 'ArrowDown' || e.key === 's' ? directions.DOWN
    : e.key === 'ArrowLeft' || e.key === 'a' ? directions.LEFT
    : e.key === 'ArrowRight' || e.key === 'd' ? directions.RIGHT
    : null;

    if (newDirection) setDirectionQueue(prevQueue => [...prevQueue, newDirection]);
  };

  return (
    <Board
      boardSize={ BOARD_SIZE }
      snake={ segments }
      apple={ apple }
      gameOver={ gameOver }
      paused={ paused }
      score={ score }
      steps={ steps }
      speed={ speed }
      keysPressed={ keysPressed }
      handleSpeedChange={ handleSpeedChange }
      setPaused={ setPaused }
      direction={ direction }
      changeDirection={ changeDirection }
    />
  );
};

export default SnakeGame;
