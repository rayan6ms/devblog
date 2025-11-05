'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Footer from '@/components/Footer';
import dynamic from 'next/dynamic';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';

type Importer = () => Promise<{ default: React.ComponentType<any> }>;

type GameBase = {
  name: string;
  description: string;
  img: string;
  importer: Importer;
};

type PlayableGame = GameBase & { mode: 'play' };
type WatchGame = GameBase & { mode: 'watch' };
type Game = PlayableGame | WatchGame;

const games: Game[] = [
  {
    name: 'Chess',
    description: 'Classic Chess Game',
    img: 'https://www.hollywoodreporter.com/wp-content/uploads/2021/07/MCDAVEN_EC081-H-2021.jpg?w=1296',
    mode: 'play',
    importer: () => import('./chess/ChessP5'),
  },
  {
    name: 'SnakeGame',
    description: 'Classic Snake Game',
    img: 'https://soundvenue.com/wp-content/uploads/2018/01/scarlett-johansson-3840x2160-black-widow-captain-america-civil-war-4k-755-2192x1233.jpg',
    mode: 'play',
    importer: () => import('./snake-game/SnakeP5'),
  },
  {
    name: 'AntSimulator',
    description: 'Ant colony race — watch the chaos unfold',
    img: 'https://www.playstationlifestyle.net/wp-content/uploads/sites/9/2022/09/new-iron-man-game-by-ea.jpg?w=640',
    mode: 'watch',
    importer: () => import('./ant-simulator/AntSimulator'),
  },
  {
    name: 'SolarSystem',
    description: 'Planetary dance — sit back and enjoy',
    img: 'https://disneyplusbrasil.com.br/wp-content/uploads/2023/05/Peter-Quill-de-capacete.jpg',
    mode: 'watch',
    importer: () => import('./solar-system/SolarSystem'),
  },
  {
    name: 'Terminal',
    description: 'Terminal Linux',
    img: 'https://www.hollywoodreporter.com/wp-content/uploads/2021/07/MCDAVEN_EC081-H-2021.jpg?w=1296',
    mode: 'play',
    importer: () => import('./terminal/Terminal'),
  },
  {
    name: 'Tank Shooter',
    description: 'Tank Shooter',
    img: 'https://www.playstationlifestyle.net/wp-content/uploads/sites/9/2022/09/new-iron-man-game-by-ea.jpg?w=640',
    mode: 'play',
    importer: () => import('./tank-shooter/TankShooter'),
  },
  {
    name: 'Falling Sand',
    description: 'Falling Sand',
    img: 'https://disneyplusbrasil.com.br/wp-content/uploads/2023/05/Peter-Quill-de-capacete.jpg',
    mode: 'play',
    importer: () => import('./falling-sand/FallingSand'),
  },
  {
    name: 'Moving Mountains',
    description: 'Moving Mountains',
    img: 'https://www.hollywoodreporter.com/wp-content/uploads/2021/07/MCDAVEN_EC081-H-2021.jpg?w=1296',
    mode: 'watch',
    importer: () => import('./moving-mountains/MovinMountains'),
  },
  {
    name: 'Survival Shooter',
    description: 'Survival Shooter',
    img: 'https://www.playstationlifestyle.net/wp-content/uploads/sites/9/2022/09/new-iron-man-game-by-ea.jpg?w=640',
    mode: 'play',
    importer: () => import('./survival-shooter/SurvivalShooter'),
  },
  {
    name: 'Tetris',
    description: 'Tetris',
    img: 'https://disneyplusbrasil.com.br/wp-content/uploads/2023/05/Peter-Quill-de-capacete.jpg',
    mode: 'play',
    importer: () => import('./tetris/Tetris'),
  },
  {
    name: 'Binary Pong',
    description: 'Binary Pong',
    img: 'https://www.hollywoodreporter.com/wp-content/uploads/2021/07/MCDAVEN_EC081-H-2021.jpg?w=1296',
    mode: 'watch',
    importer: () => import('./binary-pong/BinaryPong'),
  },
  {
    name: 'Sine Waves',
    description: 'Sine Waves',
    img: 'https://www.playstationlifestyle.net/wp-content/uploads/sites/9/2022/09/new-iron-man-game-by-ea.jpg?w=640',
    mode: 'play',
    importer: () => import('./sine-waves/SineWaves'),
  },
  {
    name: 'Voronoi Wall',
    description: 'Voronoi Wall',
    img: 'https://disneyplusbrasil.com.br/wp-content/uploads/2023/05/Peter-Quill-de-capacete.jpg',
    mode: 'watch',
    importer: () => import('./voronoi-wall/VoronoiWall'),
  },
  {
    name: '2048',
    description: '2048',
    img: 'https://www.hollywoodreporter.com/wp-content/uploads/2021/07/MCDAVEN_EC081-H-2021.jpg?w=1296',
    mode: 'play',
    importer: () => import('./2048/2048'),
  },
  {
    name: 'Pacman',
    description: 'Pacman',
    img: 'https://www.playstationlifestyle.net/wp-content/uploads/sites/9/2022/09/new-iron-man-game-by-ea.jpg?w=640',
    mode: 'play',
    importer: () => import('./pacman/Pacman'),
  },
  {
    name: 'Newton Cannon',
    description: 'Newton Cannon',
    img: 'https://disneyplusbrasil.com.br/wp-content/uploads/2023/05/Peter-Quill-de-capacete.jpg',
    mode: 'play',
    importer: () => import('./newton-cannon/NewtonCannon'),
  },
  {
    name: 'Flappy Bird',
    description: 'Flappy Bird',
    img: 'https://www.hollywoodreporter.com/wp-content/uploads/2021/07/MCDAVEN_EC081-H-2021.jpg?w=1296',
    mode: 'play',
    importer: () => import('./flappy-bird/FlappyBird'),
  },
  {
    name: 'Labyrinth Explorer',
    description: 'Labyrinth Explorer',
    img: 'https://www.playstationlifestyle.net/wp-content/uploads/sites/9/2022/09/new-iron-man-game-by-ea.jpg?w=640',
    mode: 'play',
    importer: () => import('./labyrinth-explorer/LabyrinthExplorer'),
  },
];

function useCardTilt(maxTiltDeg = 16, hoverScale = 1.06) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const setTransform = (rx: number, ry: number, scale = hoverScale) => {
    const el = innerRef.current;
    if (!el) return;
    el.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) scale(${scale})`;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    const container = containerRef.current;
    const inner = innerRef.current;
    if (!container || !inner) return;

    const rect = container.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;

    const ry = (px - 0.5) * (maxTiltDeg * 2);
    const rx = (0.5 - py) * (maxTiltDeg * 2);

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => setTransform(rx, ry));
  };

  const handlePointerLeave = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    requestAnimationFrame(() => setTransform(0, 0, 1));
  };

  return { containerRef, innerRef, handlePointerMove, handlePointerLeave };
}

const GameCard: React.FC<{
  game: Game;
  onClick: (g: Game) => void;
}> = ({ game, onClick }) => {
  const { containerRef, innerRef, handlePointerMove, handlePointerLeave } = useCardTilt(16, 1.06);

  const badge =
    game.mode === 'play'
      ? { text: 'Playable', cls: 'bg-emerald-600/80' }
      : { text: 'Watch-Only', cls: 'bg-sky-600/80' };

  return (
    <div
      ref={containerRef}
      className="group relative w-56 h-64 m-5 select-none cursor-pointer [perspective:1200px]"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={() => onClick(game)}
    >
      <div className="absolute -inset-2 rounded-xl bg-gradient-to-r from-blue-700 via-purple-600 to-indigo-700 opacity-40 blur-lg will-change-transform" />

      <div
        ref={innerRef}
        className="relative h-full w-full rounded-xl overflow-hidden transition-transform duration-150 ease-out will-change-transform transform-gpu [transform-style:preserve-3d] group-hover:brightness-110"
      >
        <img
          src={game.img}
          alt={game.name}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ transform: 'translateZ(30px) scale(1.06)', transformStyle: 'preserve-3d' }}
          draggable={false}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="text-lg font-semibold text-white drop-shadow-sm">{game.name}</h3>
          <p className="text-xs text-zinc-200/90">{game.description}</p>
        </div>
        <div className={`absolute top-2 right-2 rounded-full border border-white/15 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white ${badge.cls}`}>
          {badge.text}
        </div>
      </div>
    </div>
  );
};

const Playground: React.FC = () => {
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [SelectedComponent, setSelectedComponent] = useState<React.ComponentType | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const backdropMouseDownRef = useRef(false);

  const playable = useMemo(() => games.filter(g => g.mode === 'play'), []);
  const watchOnly = useMemo(() => games.filter(g => g.mode === 'watch'), []);

  useEffect(() => {
    let cancelled = false;

    if (selectedGame) {
      const Dyn = dynamic(selectedGame.importer, {
        ssr: false,
        loading: () => <p className="text-zinc-200">Loading...</p>,
      });
      if (!cancelled) setSelectedComponent(() => Dyn);
    } else {
      setSelectedComponent(null);
    }

    return () => {
      cancelled = true;
    };
  }, [selectedGame]);

  const openGame = useCallback((g: Game) => setSelectedGame(g), []);
  const closeGame = useCallback(() => {
    setSelectedGame(null);
    setSelectedComponent(null);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedGame) closeGame();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedGame, closeGame]);

  const isOpen = !!selectedGame;

  useEffect(() => {
    if (!isOpen) {
      document.body.classList.remove('overflow-hidden');
      if (contentRef.current) {
        contentRef.current.removeAttribute('inert');
        contentRef.current.removeAttribute('aria-hidden');
        contentRef.current.classList.remove('pointer-events-none');
      }
      return;
    }

    document.body.classList.add('overflow-hidden');
    if (contentRef.current) {
      contentRef.current.setAttribute('inert', '');
      contentRef.current.setAttribute('aria-hidden', 'true');
      contentRef.current.classList.add('pointer-events-none'); // blocks pointer on background only
    }

    const blockKeys = (e: KeyboardEvent) => {
      const keys = [
        'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
        ' ', 'Spacebar', 'PageUp', 'PageDown', 'Home', 'End'
      ];
      if (keys.includes(e.key)) e.preventDefault();
    };
    const blockWheel = (e: WheelEvent) => e.preventDefault();
    const blockTouch = (e: TouchEvent) => e.preventDefault();

    window.addEventListener('keydown', blockKeys, { passive: false });
    window.addEventListener('wheel', blockWheel, { passive: false });
    window.addEventListener('touchmove', blockTouch, { passive: false });

    return () => {
      window.removeEventListener('keydown', blockKeys);
      window.removeEventListener('wheel', blockWheel as any);
      window.removeEventListener('touchmove', blockTouch as any);
    };
  }, [isOpen]);

  return (
    <>
      <main
        ref={contentRef}
        tabIndex={-1}
        className="mx-auto my-10 w-11/12 lg:w-2/3 min-h-screen rounded-2xl bg-greyBg border border-zinc-700/50 flex flex-col items-center"
      >
        <h1 className="text-5xl font-somerton pt-6 w-full text-center">GAMES</h1>
        <div className="w-1/2 rounded-full border my-6 border-zinc-300/75" />

        <section className="w-full px-4 md:px-8">
          <h2 className="text-wheat text-lg font-semibold tracking-wider uppercase mt-4 mb-3">
            Playable
          </h2>
          <div className="w-1/5 rounded-full border my-3 border-zinc-300/75" />
          <div className="flex flex-wrap">
            {playable.map((game) => (
              <GameCard key={game.name} game={game} onClick={openGame} />
            ))}
          </div>
        </section>

        {watchOnly.length > 0 && (
          <section className="w-full px-4 md:px-8 mt-2 mb-10">
            <h2 className="text-wheat text-lg font-semibold tracking-wider uppercase mt-4 mb-3">
              Watch-Only
            </h2>
            <div className="w-1/5 rounded-full border my-3 border-zinc-300/75" />
            <div className="flex flex-wrap">
              {watchOnly.map((game) => (
                <GameCard key={game.name} game={game} onClick={openGame} />
              ))}
            </div>
          </section>
        )}

      </main>
      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onMouseDown={(e) => {
              if (e.currentTarget === e.target) backdropMouseDownRef.current = true;
            }}
            onMouseUp={(e) => {
              if (backdropMouseDownRef.current && e.currentTarget === e.target) closeGame();
              backdropMouseDownRef.current = false;
            }}
          />

          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-3"
            role="dialog"
            aria-modal="true"
            aria-labelledby="game-title"
            onMouseDown={() => { backdropMouseDownRef.current = false; }}
          >
            <div
              className="relative w-[min(98vw,1600px)] h-[min(94vh,1000px)] rounded-2xl bg-greyBg border border-zinc-700/50 shadow-xl shadow-black/50 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-2 md:top-3 left-4 md:left-5 right-14 md:right-16 flex items-center gap-3 z-20">
                <h3 id="game-title" className="text-white text-lg md:text-2xl font-semibold truncate" title={selectedGame?.name}>
                  {selectedGame?.name}
                </h3>
              </div>

              <button
                className="absolute top-1.5 md:top-2 right-2.5 md:right-3 z-20"
                onClick={closeGame}
                aria-label="Close Game"
              >
                <FontAwesomeIcon
                  icon={faTimes}
                  className="w-8 h-8 p-1 text-wheat hover:text-purpleContrast hover:bg-gray-700/50 rounded-xl transition-colors"
                />
              </button>

              <div className="w-full h-full pt-12 px-3 md:px-4 pb-3 md:pb-4">
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-full h-full max-w-full max-h-full">
                    {SelectedComponent ? <SelectedComponent /> : <p className="text-zinc-200">Loading...</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
      <Footer />
    </>
  );
};

export default Playground;