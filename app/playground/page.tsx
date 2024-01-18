'use client'


import React, { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';

const Chess = dynamic(() => import('./chess/Chess'), {
  loading: () => <p>Loading...</p>,
  ssr: false
});
const SnakeGame = dynamic(() => import('./snake-game/SnakeGame'), {
  loading: () => <p>Loading...</p>,
  ssr: false
});
const AntSimulator = dynamic(() => import('./ant-simulator/AntSimulator'), {
  loading: () => <p>Loading...</p>,
  ssr: false
});
const SolarSystem = dynamic(() => import('./solar-system/SolarSystem'), {
  loading: () => <p>Loading...</p>,
  ssr: false
});
const Terminal = dynamic(() => import('./terminal/Terminal'), {
  loading: () => <p>Loading...</p>,
  ssr: false
});

type GameComponent = typeof Chess | typeof SnakeGame | typeof AntSimulator | typeof SolarSystem | typeof Terminal;

function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  return (...args: Parameters<T>) => {
    const now = new Date().getTime();
    if (now - lastCall < delay) {
      return;
    }
    lastCall = now;
    return func(...args);
  };
}

interface Game {
  name: string;
  component: GameComponent;
  description: string;
  img: string;
}

const games: Game[] = [
  {
    name: 'Chess',
    component: Chess,
    description: 'Classic Chess Game',
    img: "https://www.hollywoodreporter.com/wp-content/uploads/2021/07/MCDAVEN_EC081-H-2021.jpg?w=1296"
  },
  {
    name: 'SnakeGame',
    component: SnakeGame,
    description: 'Classic Snake Game',
    img: "https://soundvenue.com/wp-content/uploads/2018/01/scarlett-johansson-3840x2160-black-widow-captain-america-civil-war-4k-755-2192x1233.jpg"
  },
  {
    name: 'AntSimulator',
    component: AntSimulator,
    description: 'Ant Simulator',
    img: "https://www.playstationlifestyle.net/wp-content/uploads/sites/9/2022/09/new-iron-man-game-by-ea.jpg?w=640"
  },
  {
    name: 'SolarSystem',
    component: SolarSystem,
    description: 'Solar System Simulator',
    img: "https://disneyplusbrasil.com.br/wp-content/uploads/2023/05/Peter-Quill-de-capacete.jpg",
  },
  {
    name: 'Terminal',
    component: Terminal,
    description: 'Terminal Linux',
    img: "https://www.hollywoodreporter.com/wp-content/uploads/2021/07/MCDAVEN_EC081-H-2021.jpg?w=1296"
  }
];

const Playground: React.FC = () => {
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const gameRef = useRef<HTMLDivElement | null>(null);
  const [rotates, setRotates] = useState<{ [key: string]: { x: number; y: number } }>({});
  const [showBackdrop, setShowBackdrop] = useState(false);

  useEffect(() => {
    if (selectedGame) {
      gameRef.current?.classList.remove('scale-0');
      gameRef.current?.classList.add('scale-100');
    } else {
      gameRef.current?.classList.remove('scale-100');
      gameRef.current?.classList.add('scale-0');
    }
    setShowBackdrop(!!selectedGame);
  }, [selectedGame]);

  const onMouseMove = useCallback(
    throttle((gameName, e: React.MouseEvent<HTMLDivElement>) => {
      const card = e.currentTarget;
      const box = card.getBoundingClientRect();
      const x = e.clientX - box.left;
      const y = e.clientY - box.top;
      const centerX = box.width / 2;
      const centerY = box.height / 2;
      const rotateX = (centerY - y) / 7;
      const rotateY = (x - centerX) / 7;
      setRotates((prev) => ({ ...prev, [gameName]: { x: rotateX, y: rotateY } }));
    }, 100),
    []
  );

  const onMouseLeave = (gameName: string) => {
    setRotates((prev) => ({ ...prev, [gameName]: { x: 0, y: 0 } }));
  };

  const selectedGameComponent = games.find((g) => g.name === selectedGame)?.component;

  return (
    <main className="mx-auto my-10 w-2/3 h-screen rounded-2xl bg-greyBg border border-zinc-700/50 flex flex-col items-center">
      <h1 className="text-5xl font-somerton pt-6 w-full text-center">GAMES</h1>
      <div className="w-1/2 rounded-full border my-6 border-zinc-300/75" />
      <div className="flex flex-wrap">
        {games.map((game) => (
          <div
            key={game.name}
            className="game-card relative w-52 h-56 m-5 cursor-pointer transition-all transform will-change-transform duration-700 group hover:scale-110 hover:z-10"
            onMouseMove={(e) => onMouseMove(game.name, e)}
            onMouseLeave={() => onMouseLeave(game.name)}
            onClick={() => setSelectedGame(game.name)}
            style={{
              transform: rotates[game.name]
                ? `perspective(1000px) rotateX(${rotates[game.name].x}deg) rotateY(${rotates[game.name].y}deg)`
                : '',
            }}
          >
          <div className="absolute -inset-2 rounded-lg bg-gradient-to-r from-blue-700 via-purpleContrast to-indigo-700 opacity-40 blur-lg" />
          <div className="relative h-full w-full flex items-center justify-center rounded-lg text-sm font-light text-slate-300">
            <img
              src={game.img}
              alt={game.name}
              className="object-cover w-full h-full rounded-xl mb-2.5"
            />
            </div>
            <h3 className="text-xl brightness-110 font-bold text-white">{game.name}</h3>
            <p className="text-zinc-200">{game.description}</p>
          </div>
        ))}
      </div>

      <div
        className={`fixed inset-0 bg-black/50 ${showBackdrop ? 'visible' : 'invisible'} backdrop-blur z-50 transition-all duration-300 ease-in`}
        onClick={() => setSelectedGame(null)}
      />

      <div
        ref={gameRef}
        className="fixed flex justify-center m-10 rounded-2xl p-6 inset-0 bg-greyBg border border-zinc-700/50 shadow-md shadow-zinc-900 z-50 transform scale-0 transition-transform duration-700"
      >
        {selectedGame && selectedGameComponent ? React.createElement(selectedGameComponent) : null}
        <button
          className="absolute top-6 right-8"
          onClick={() => setSelectedGame(null)}
          aria-label="Close Game"
        >
          <FontAwesomeIcon
            icon={faTimes}
            className="w-8 h-8 p-1 text-wheat hover:text-purpleContrast hover:bg-gray-700/50 rounded-xl transition-colors ease-in-out duration-200"
          />
        </button>
      </div>
    </main>
  );
};

export default Playground;