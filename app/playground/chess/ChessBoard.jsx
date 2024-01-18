'use client';


import { useEffect } from 'react';
import Square from './Square';

export default function ChessBoard({
  board,
  game,
  startGame,
  selectedSquare,
  setSelectedSquare,
  possibleMoves,
  setPossibleMoves,
  getPossibleMoves,
  handleSquareAction,
  playerTurn,
  isBoardFlipped,
}) {
  useEffect(() => {
    startGame();
  }, []);

  const rows = [8, 7, 6, 5, 4, 3, 2, 1];
  const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  return (
    <div className="flex items-end relative">
      <div className="mb-10 flex flex-col h-full select-none">
        {rows.map((r, idx) => (
          <span className="w-6 h-24 flex justify-center items-center text-lg font-somerton" key={idx}>
            {r}
          </span>
        ))}
      </div>
      <div className="flex flex-col">
        <div className="grid grid-cols-8 gap-0 rounded-lg m-4 overflow-hidden border border-zinc-700">
          {board.map((row, i) =>
          row.map((square, j) => {
            const squareName = `${cols[j]}${rows[i]}`.toLowerCase();
            const isSquareSelected = squareName === selectedSquare;
            const isPossibleMove = possibleMoves.includes(squareName);
            const targetPiece = isPossibleMove ? board[i][j] : null;
            const squareColor = isBoardFlipped ? (i + j) % 2 !== 0 : (i + j) % 2 === 0;

            const lastMove = game.history({ verbose: true }).slice(-1)[0];
            const isLastMove = lastMove && (lastMove.from === squareName.toLowerCase() || lastMove.to === squareName.toLowerCase());

            return (
              <Square
                key={`${i}-${j}`}
                piece={square ? square.type : null}
                squareColor={isSquareSelected ? 'bg-indigo-200/80 border border-indigo-200/50' : (squareColor ? 'bg-zinc-400/80 border border-zinc-400/80' : 'bg-gray-700 border border-gray-800/30')}
                color={square ? square.color : null}
                isLastMove={isLastMove}
                isPossibleMove={isPossibleMove}
                isSquareSelected={isSquareSelected}
                isBoardFlipped={isBoardFlipped}
                setSelectedSquare={setSelectedSquare}
                setPossibleMoves={setPossibleMoves}
                getPossibleMoves={getPossibleMoves}
                game={game}
                targetPiece={targetPiece ? targetPiece.type : null}
                squareName={squareName}
                onClick={() => handleSquareAction(squareName)}
                inCheck={game?.inCheck() && game?.turn() === square?.color}
                playerPiece={square?.color === playerTurn}
              />
            );
          }),
        )}
        </div>
        <div className="ml-4 flex w-full select-none">
          {cols.map((c, idx) => (
            <span className="w-24 h-6 flex justify-center items-center font-somerton text-lg" key={idx}>
              {c}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
