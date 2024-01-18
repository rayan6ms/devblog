'use client'


import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChessBishop,
  faChessKing,
  faChessKnight,
  faChessPawn,
  faChessQueen,
  faChessRook,
} from '@fortawesome/free-solid-svg-icons';
import { useDrag, useDrop } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { useEffect } from 'react';
import CustomDragLayer from './CustomDragLayer';

export default function Square({
  piece,
  squareColor,
  color,
  isLastMove,
  isPossibleMove,
  isSquareSelected,
  isBoardFlipped,
  targetPiece,
  inCheck,
  playerPiece,
  squareName,
  setSelectedSquare,
  setPossibleMoves,
  getPossibleMoves,
  game,
  onClick
}) {
  const [, drop] = useDrop({
    accept: 'PIECE',
    drop: (item) => {
      onClick(item.squareName);
    },
  });

  const textColor = color === (isBoardFlipped ? 'b' : 'w') ? 'text-zinc-200 drop-shadow-[0_0_8px_rgba(10,10,10,0.2)]' : 'text-slate-900 drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]';
  const highlightPossibleMove = isPossibleMove && !targetPiece ? 'after:content-[""] after:w-6 after:h-6 after:bg-indigo-300 after:rounded-full after:inset-x-auto' : '';
  const captureHighlight = targetPiece ? 'bg-red-200/80 border border-red-200/80' : '';
  const finalSquareColor = targetPiece && isPossibleMove ? captureHighlight : isLastMove ? 'bg-orange-200/80 border border-orange-300/75' : inCheck && piece === 'k' ? 'bg-red-500/60 border border-red-500/60' : squareColor;

  const [{ isDragging }, drag, preview] = useDrag({
    type: 'PIECE',
    item: () => {
      if (playerPiece) setSelectedSquare(squareName)
      else return;
      setPossibleMoves(getPossibleMoves(game, squareName));
      return { piece, squareName, type: pieceMap[piece?.toLowerCase()], textColor };
    },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  });

  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true });
  }, [preview]);

  const pieceMap = {
    'r': faChessRook,
    'n': faChessKnight,
    'b': faChessBishop,
    'q': faChessQueen,
    'k': faChessKing,
    'p': faChessPawn,
  };

  return (
    <div className="w-24 h-24" ref={drop}>
      <div
        ref={drag}
        className={`w-full h-full ${finalSquareColor} ${highlightPossibleMove} flex group justify-center items-center`}
        onClick={onClick}
      >
        {isSquareSelected && <CustomDragLayer />}
        {piece && (
          <FontAwesomeIcon
            icon={pieceMap[piece.toLowerCase()]}
            className={`${textColor} ${isDragging && 'hidden'} ${playerPiece && 'group-hover:scale-125'} transition-transform duration-300 fa-3x`}
          />
        )}
      </div>
    </div>
  );
};
