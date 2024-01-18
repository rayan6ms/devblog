'use client'

import { useState, useEffect } from 'react';
import Canvas from './Canvas';

function Board(
  { snake, apple, score, steps, boardSize,
    speed, handleSpeedChange, gameOver, keysPressed,
    paused, setPaused, direction, changeDirection,
  }) {
  const [showArrows, setShowArrows] = useState(false);
  const [currentColor, setCurrentColor] = useState([])
  const formatNumber = (num) => num >= 1000 ? `${(num / 1000).toFixed(1)}k` : num;
  const win = gameOver && score >= 399;
  useEffect(() => {
    if (gameOver) {
      setCurrentColor([]);
    }
  }, [gameOver]);

  return (
    <div
      className={`relative w-fit h-fit xxl:flex flex-col justify-center items-center rounded-sm select-none border border-zinc-400 bg-zinc-dark ${(gameOver || paused) && 'cursor-pointer'}`}
      onKeyDown={ changeDirection }
      tabIndex="0"
    >
      <div className="flex my-1.5 gap-1 items-center justify-center w-full" onClick={ () => setPaused(true)}>
        <p className="text-2xl">
          Speed:</p>
        <button
          className="text-3xl outline-none text-purpleContrast hover:text-white"
          onClick={ () => handleSpeedChange(-0.5) }
        >
          &lt;
        </button>
         <span className="text-2xl">{ speed }</span>
        <button
          className="text-3xl mr-4 outline-none text-purpleContrast hover:text-white"
          onClick={ () => handleSpeedChange(0.5)}
        >
          &gt;
        </button>
        <span className="text-2xl mr-4">Score: { formatNumber(score) }</span>
        <span className="text-2xl">Steps: { formatNumber(steps) }</span>
      </div>
      <div className="w-full h-[94.1%] outline-none"
      onClick={ (e) => {
        setPaused(!paused);
        changeDirection(e)
      }}
      >
        { (gameOver || paused) && (
          <div className="absolute bottom-0 w-full h-[94.1%] bg-black bg-opacity-50 flex flex-col gap-2 justify-center items-center">
            {gameOver && <p className="text-xl">{win ? 'You win' : 'Game Over'}</p>}
            <p className="text-2xl">Score: { score }</p>
            <div className="flex items-center gap-1 text-xl group">
              <span>&lt;</span>
              <button
                className="group-hover:text-purpleContrast"
                onClick={ () => setShowArrows(!showArrows) }
              >
                  Show Arrows
              </button>
              <span>&gt;</span>
            </div>
            <p className="text-xl text-zinc-300 w-5/6 mt-2 text-center">Pressione qualquer tecla para jogar</p>
          </div>)}
        <Canvas
          snake={ snake }
          apple={ apple }
          direction={ direction }
          boardSize={ boardSize }
          currentColor={ currentColor }
          setCurrentColor={ setCurrentColor }
          showArrows={ showArrows }
          keysPressed={ keysPressed } />
      </div>
    </div>
  );
};

export default Board;