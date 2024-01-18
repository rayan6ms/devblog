import dynamic from 'next/dynamic';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import CapturedPieces from './CapturedPieces';
import ChessActions from './ChessActions';
import { useEffect, useState } from 'react';
import { initGame, makeMove, getSquareColor, getPossibleMoves } from './chess';

const stockfish = new Worker('/stockfish.js');

const ChessBoard = dynamic(() => import('./ChessBoard'), {
  ssr: false,
});

export default function Chess() {
  const [board, setBoard] = useState([]);
  const [game, setGame] = useState(null);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [possibleMoves, setPossibleMoves] = useState([]);
  const [capturedPieces, setCapturedPieces] = useState([]);
  const [playerTurn, setPlayerTurn] = useState(false);
  const [isBoardFlipped, setIsBoardFlipped] = useState(false);
  const [waitingForStockfish, setWaitingForStockfish] = useState(false);
  const [stockfishDifficulty, setStockfishDifficulty] = useState('4');

  const startGame = () => {
    const { chess } = initGame();
    setGame(chess);
    setBoard(chess.board());
  }

  const resetGame = () => {
    game.reset();
    setBoard(game.board());
    setCapturedPieces([]);
  };

  const handleUndoMove = () => {
    game.undo();
    setBoard(game.board());
  };

  const handleSwitchTeams = (team) => {
    // if (team === 'b') setIsBoardFlipped(true);
    // else setIsBoardFlipped(false);

    resetGame();
    setPlayerTurn(team);
    setWaitingForStockfish(false);
  };

  const handleSurrender = () => {
    const winner = game.turn() === 'w' ? 'Black' : 'White';
    alert(`${winner} wins!`);
    resetGame();
  }

  const changeDifficulty = (e) => {
    setStockfishDifficulty(e.target.value);
  };

  const callStockfish = () => {
    stockfish.postMessage(`position fen ${game.fen()}`);
    stockfish.postMessage(`go depth ${stockfishDifficulty}`);
    setWaitingForStockfish(true);
  };

  const handleGameOver = () => {
    const gameOverScenarios = [
      { method: 'isCheckmate', message: 'wins!' },
      { method: 'isDraw', message: 'Draw!' },
      { method: 'isStalemate', message: 'Stalemate!' },
      { method: 'isThreefoldRepetition', message: 'Threefold Repetition!' },
      { method: 'isInsufficientMaterial', message: 'Insufficient Material!' },
    ];
  
    for (const { method, message } of gameOverScenarios) {
      if (game[method]()) {
        const winner = game.turn() === 'w' ? 'Black' : 'White';
        alert(message === 'wins!' ? `${winner} ${message}` : message);
        resetGame();
        break;
      }
    }
  };
  
  const handleSquareAction = (square) => {
    const squareColor = getSquareColor(game, square.toLowerCase());
  
    if (selectedSquare === square) {
      setSelectedSquare(null);
      setPossibleMoves([]);
      return;
    }
  
    if (squareColor === game.turn() && game.turn() === playerTurn) {
      setSelectedSquare(square);
      setPossibleMoves(getPossibleMoves(game, square));
    } else if (possibleMoves.includes(square.toLowerCase())) {
      const move = makeMove(game, selectedSquare.toLowerCase(), square.toLowerCase());
  
      if (move) {
        setSelectedSquare(null);
        setPossibleMoves([]);
        setBoard(game.board());
      }
    }
  };

  useEffect(() => {
    let timeoutId;
    stockfish.onmessage = (event) => {
      const message = event.data || event;
      if (message.startsWith('bestmove') && waitingForStockfish) {
        const bestMove = message.split(' ')[1];
        const validMove = makeMove(game, bestMove.slice(0, 2), bestMove.slice(2, 4));

        if (validMove) {
          setBoard(game.board());
          setWaitingForStockfish(false);
        } else {
          stockfish.postMessage(`go depth ${stockfishDifficulty}`);
        }
      }
    };

    if (waitingForStockfish) {
      timeoutId = setTimeout(() => {
        setWaitingForStockfish(false);
        callStockfish();
      }, 4000);
    }
    
    return () => {
      clearTimeout(timeoutId)
    };
  }, [game, waitingForStockfish]);

  useEffect(() => {
    if (game) handleGameOver();

    if (game && (playerTurn === false || game.turn() !== playerTurn) && !waitingForStockfish) {
      callStockfish();
    }

    const captured = game?.history({ verbose: true })?.filter((move) => move.captured);
    if (captured && captured.length > capturedPieces.length) {
      const newCapturedPiece = captured[captured.length - 1];
      setCapturedPieces([...capturedPieces, newCapturedPiece]);
    }
    console.log(capturedPieces);  
  }, [game, game?.turn(), playerTurn, waitingForStockfish]);

  const blackCapturedPieces = capturedPieces.filter(
    (piece) => piece.color === 'b'
  );

  const whiteCapturedPieces = capturedPieces.filter(
    (piece) => piece.color === 'w'
  );

  console.log('black: ', blackCapturedPieces, 'white: ', whiteCapturedPieces)

  return (
    <>
      <div className="bg-gray-900/50 my-3.5 p-4 text-white rounded-xl shadow-2xl shadow-purpleContrast/20 border border-zinc-700/50 flex justify-center items-center relative">
        <DndProvider backend={HTML5Backend}>
            <ChessBoard
              board={board}
              game={game}
              startGame={startGame}
              selectedSquare={selectedSquare}
              setSelectedSquare={setSelectedSquare}
              possibleMoves={possibleMoves}
              setPossibleMoves={setPossibleMoves}
              getPossibleMoves={getPossibleMoves}
              handleSquareAction={handleSquareAction}
              playerTurn={playerTurn}
              isBoardFlipped={isBoardFlipped}
            />
        </DndProvider>
      </div>
      <div className="flex flex-col items-center gap-8 bg-greyBg border border-zinc-700/50 rounded-xl my-3.5 p-4 absolute right-28 top-8">
          <CapturedPieces pieces={blackCapturedPieces} />
          <ChessActions
            handleUndoMove={handleUndoMove}
            handleSurrender={handleSurrender}
            handleSwitchTeams={handleSwitchTeams}
            changeDifficulty={changeDifficulty}
          />
          <CapturedPieces pieces={whiteCapturedPieces} />
      </div>
    </>
  );
}
