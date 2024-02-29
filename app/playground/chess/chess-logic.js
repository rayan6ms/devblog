import { Chess } from 'chess.js';

export const initGame = () => {
  const chess = new Chess();
  return { chess };
};

export const getPossibleMoves = (chess, square) => {
  const moves = chess.moves({ square, verbose: true }).map(move => move.to);
  return moves;
};

export const makeMove = (chess, from, to) => {
  const move = { from, to };
  const piece = chess.get(from);
  const moves = chess.moves({ verbose: true });

  const validMove = moves.some(
    (m) => m.from === from && m.to === to
  );

  if (!validMove) {
    return null;
  }

  if (piece && piece.type === 'p' && (to[1] === '1' || to[1] === '8')) {
    move.promotion = 'q';
  }

  return chess.move(move);
};

export const getSquareColor = (chess, square) => {
  const piece = chess.get(square);
  return piece ? piece.color : null;
};