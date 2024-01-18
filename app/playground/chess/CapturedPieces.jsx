'use client';


import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChessBishop,
  faChessKing,
  faChessKnight,
  faChessPawn,
  faChessQueen,
  faChessRook,
} from '@fortawesome/free-solid-svg-icons';

const pieceMap = {
  'r': faChessRook,
  'n': faChessKnight,
  'b': faChessBishop,
  'q': faChessQueen,
  'k': faChessKing,
  'p': faChessPawn,
};

export default function CapturedPieces({ pieces }) {
  const [capturedGrid, setCapturedGrid] = useState(new Array(16).fill("empty"));

  useEffect(() => {
    let newCapturedGrid = [...capturedGrid];
    
    pieces.forEach((piece) => {
      let randomIndex;
      do {
        randomIndex = Math.floor(Math.random() * 16);
      } while (newCapturedGrid[randomIndex] !== "empty");
      
      newCapturedGrid[randomIndex] = piece;
    });

    setCapturedGrid(newCapturedGrid);
  }, [pieces]);

  return (
    <div className="grid grid-cols-4 gap-2 w-full place-items-center">
      {capturedGrid.map((piece, i) => (
        <div key={i}>
          {piece !== "empty" ? (
            <FontAwesomeIcon
              icon={pieceMap[piece.piece.toLowerCase()]}
              className={`${piece.color === 'w' ? 'text-zinc-200' : 'text-slate-900'}`}
              style={{ transform: `rotate(${Math.floor(Math.random() * 180)}deg)` }}
            />
          ) : (
            <div className="w-4 h-8" />
          )}
        </div>
      ))}
    </div>
  );
}