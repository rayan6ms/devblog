"use client";

import Image from "next/image";
import type React from "react";
import {
	memo,
	startTransition,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { FaXmark } from "react-icons/fa6";
import Footer from "@/components/Footer";
import PageIntro from "@/components/PageIntro";
import { useI18n } from "@/components/LocaleProvider";

type Importer = () => Promise<{ default: React.ComponentType<any> }>;
type GameId =
	| "chess"
	| "snakeGame"
	| "minesweeper"
	| "antSimulator"
	| "solarSystem"
	| "terminal"
	| "tankShooter"
	| "fallingSand"
	| "movingMountains"
	| "survivalShooter"
	| "tetris"
	| "binaryPong"
	| "sineWaves"
	| "voronoiWall"
	| "2048"
	| "pacman"
	| "newtonCannon"
	| "flappyBird"
	| "labyrinthExplorer";

type GameBase = {
	id: GameId;
	img: string;
	importer: Importer;
};

type PlayableGame = GameBase & { mode: "play" };
type WatchGame = GameBase & { mode: "watch" };
type Game = PlayableGame | WatchGame;

const games: Game[] = [
	{
		id: "chess",
		img: "playground/chess.png",
		mode: "play",
		importer: () => import("./chess/ChessPhaser"),
	},
	{
		id: "snakeGame",
		img: "playground/snake.png",
		mode: "play",
		importer: () => import("./snake-game/SnakePhaser"),
	},
	{
		id: "minesweeper",
		img: "playground/mine-sweeper.png",
		mode: "play",
		importer: () => import("./minesweeper/MineSweeper"),
	},
	{
		id: "antSimulator",
		img: "playground/ant-simulator.png",
		mode: "watch",
		importer: () => import("./ant-simulator/AntSimulator"),
	},
	{
		id: "solarSystem",
		img: "playground/solar-system.png",
		mode: "watch",
		importer: () => import("./solar-system/SolarSystem"),
	},
	{
		id: "terminal",
		img: "playground/terminal.png",
		mode: "play",
		importer: () => import("./terminal/Terminal"),
	},
	{
		id: "tankShooter",
		img: "playground/tank-shooter.png",
		mode: "play",
		importer: () => import("./tank-shooter/TankShooter"),
	},
	{
		id: "fallingSand",
		img: "playground/falling-sand.png",
		mode: "play",
		importer: () => import("./falling-sand/FallingSand"),
	},
	{
		id: "movingMountains",
		img: "playground/moving-mountains.png",
		mode: "watch",
		importer: () => import("./moving-mountains/MovinMountains"),
	},
	{
		id: "survivalShooter",
		img: "playground/survival-shooter.png",
		mode: "play",
		importer: () => import("./survival-shooter/SurvivalShooter"),
	},
	{
		id: "tetris",
		img: "playground/tetris.png",
		mode: "play",
		importer: () => import("./tetris/Tetris"),
	},
	{
		id: "binaryPong",
		img: "playground/binary-pong.png",
		mode: "watch",
		importer: () => import("./binary-pong/BinaryPong"),
	},
	{
		id: "sineWaves",
		img: "playground/sine-waves.png",
		mode: "play",
		importer: () => import("./sine-waves/SineWaves"),
	},
	{
		id: "voronoiWall",
		img: "playground/voronoi-wall.png",
		mode: "watch",
		importer: () => import("./voronoi-wall/VoronoiWall"),
	},
	{
		id: "2048",
		img: "playground/2048.png",
		mode: "play",
		importer: () => import("./2048/2048"),
	},
	{
		id: "pacman",
		img: "playground/pacman.png",
		mode: "play",
		importer: () => import("./pacman/Pacman"),
	},
	{
		id: "newtonCannon",
		img: "playground/newton-cannon.png",
		mode: "play",
		importer: () => import("./newton-cannon/NewtonCannon"),
	},
	{
		id: "flappyBird",
		img: "playground/flappy-bird.png",
		mode: "play",
		importer: () => import("./flappy-bird/FlappyBird"),
	},
	{
		id: "labyrinthExplorer",
		img: "playground/labyrinth-explorer.png",
		mode: "play",
		importer: () => import("./labyrinth-explorer/LabyrinthExplorer"),
	},
];

const GameCard = memo(function GameCard({ game, onClick }: { game: Game; onClick: (g: Game) => void }) {
 const { messages } = useI18n();
 const copy = messages.playgroundPage.games[game.id];
 return <button type="button" className="game-card" onClick={() => onClick(game)}><span className="game-card__image"><Image src={`/${game.img}`} alt="" fill sizes="(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 300px" /></span><span className="game-card__body"><span className="game-card__title">{copy.name}</span><span className="game-card__description">{copy.description}</span></span></button>;
});

const GameShelf = ({ title, description, games, onOpen }: { title: string; description: string; games: Game[]; onOpen: (g: Game) => void }) => <section className="content-section"><div className="section-heading"><div><h2 className="section-title">{title}</h2><p className="mt-3 text-sm text-zinc-400">{description}</p></div></div><div className="game-grid">{games.map(game => <GameCard key={game.id} game={game} onClick={onOpen} />)}</div></section>;

const Playground: React.FC = () => {
	const { messages } = useI18n();
	const [selectedGame, setSelectedGame] = useState<Game | null>(null);
	const [SelectedComponent, setSelectedComponent] =
		useState<React.ComponentType | null>(null);
	const [isMobileViewport, setIsMobileViewport] = useState(false);
	const [isGameMountReady, setIsGameMountReady] = useState(false);
	const [gameMountVersion, setGameMountVersion] = useState(0);
	const contentRef = useRef<HTMLDivElement | null>(null);
	const gameViewportRef = useRef<HTMLDivElement | null>(null);
	const backdropMouseDownRef = useRef(false);

	const playable = useMemo(() => games.filter((g) => g.mode === "play"), []);
	const watchOnly = useMemo(() => games.filter((g) => g.mode === "watch"), []);

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}

		const mediaQuery = window.matchMedia("(max-width: 767px)");
		const syncViewport = () => setIsMobileViewport(mediaQuery.matches);

		syncViewport();
		mediaQuery.addEventListener("change", syncViewport);

		return () => {
			mediaQuery.removeEventListener("change", syncViewport);
		};
	}, []);

	useEffect(() => {
		if (!selectedGame) {
			setSelectedComponent(null);
			return;
		}

		let cancelled = false;
		setSelectedComponent(null);

		void selectedGame.importer().then((module) => {
			if (!cancelled) {
				setSelectedComponent(() => module.default);
			}
		});

		return () => {
			cancelled = true;
		};
	}, [selectedGame]);

	const openGame = useCallback((g: Game) => {
		startTransition(() => setSelectedGame(g));
	}, []);
	const closeGame = useCallback(() => {
		startTransition(() => {
			setSelectedGame(null);
			setSelectedComponent(null);
		});
	}, []);
	const selectedGameText = selectedGame
		? messages.playgroundPage.games[selectedGame.id]
		: null;

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape" && selectedGame) closeGame();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [selectedGame, closeGame]);

	const isOpen = !!selectedGame;
	const gameComponentKey = selectedGame
		? `${selectedGame.id}-${gameMountVersion}`
		: "playground-game";

	useEffect(() => {
		if (!isOpen) {
			setIsGameMountReady(false);
			return;
		}

		let cancelled = false;
		let ready = false;
		let rafId = 0;
		let observer: ResizeObserver | null = null;
		let observedNode: HTMLDivElement | null = null;
		let stableSince = 0;
		let lastSignature = "";
		let attempts = 0;
		const MIN_VIEWPORT_WIDTH = 320;
		const MIN_VIEWPORT_HEIGHT = 240;
		const STABLE_FOR_MS = 160;

		const stopObserving = () => {
			observer?.disconnect();
			observer = null;
			observedNode = null;
		};

		const markReady = () => {
			if (cancelled || ready) {
				return;
			}

			ready = true;
			stopObserving();
			setIsGameMountReady(true);
			setGameMountVersion((version) => version + 1);
		};

		const scheduleCheck = () => {
			window.cancelAnimationFrame(rafId);
			rafId = window.requestAnimationFrame(waitForStableViewport);
		};

		const waitForStableViewport = () => {
			if (cancelled || ready) {
				return;
			}

			const viewport = gameViewportRef.current;
			if (!viewport) {
				scheduleCheck();
				return;
			}

			if (observedNode !== viewport) {
				stopObserving();
				observer = new ResizeObserver(() => {
					if (ready || cancelled) return;
					attempts = 0;
					scheduleCheck();
				});
				observer.observe(viewport);
				observedNode = viewport;
			}

			const rect = viewport.getBoundingClientRect();
			const width = Math.round(rect.width);
			const height = Math.round(rect.height);
			const hasUsableSize =
				width >= MIN_VIEWPORT_WIDTH && height >= MIN_VIEWPORT_HEIGHT;

			if (!hasUsableSize) {
				stableSince = 0;
				lastSignature = "";
			} else {
				const nextSignature = `${width}x${height}`;
				const now = performance.now();
				if (nextSignature === lastSignature) {
					if (stableSince > 0 && now - stableSince >= STABLE_FOR_MS) {
						markReady();
						return;
					}
				} else {
					lastSignature = nextSignature;
					stableSince = now;
				}
			}

			attempts += 1;
			if (attempts >= 90 && hasUsableSize) {
				markReady();
				return;
			}

			scheduleCheck();
		};

		setIsGameMountReady(false);
		scheduleCheck();

		return () => {
			cancelled = true;
			stopObserving();
			window.cancelAnimationFrame(rafId);
		};
	}, [isOpen, selectedGame?.id, isMobileViewport]);

	useEffect(() => {
		if (!isOpen) {
			document.body.classList.remove("overflow-hidden");
			if (contentRef.current) {
				contentRef.current.removeAttribute("inert");
				contentRef.current.removeAttribute("aria-hidden");
				contentRef.current.classList.remove("pointer-events-none");
			}
			return;
		}

		document.body.classList.add("overflow-hidden");
		if (contentRef.current) {
			contentRef.current.setAttribute("inert", "");
			contentRef.current.setAttribute("aria-hidden", "true");
			contentRef.current.classList.add("pointer-events-none"); // blocks pointer on background only
		}

		const isEditableTarget = (target: EventTarget | null) => {
			if (!(target instanceof HTMLElement)) {
				return false;
			}

			if (target.isContentEditable) {
				return true;
			}

			return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
		};

		const blockKeys = (e: KeyboardEvent) => {
			if (isEditableTarget(e.target)) {
				return;
			}

			const keys = [
				"ArrowUp",
				"ArrowDown",
				"ArrowLeft",
				"ArrowRight",
				" ",
				"Spacebar",
				"PageUp",
				"PageDown",
				"Home",
				"End",
			];
			if (keys.includes(e.key)) e.preventDefault();
		};
		window.addEventListener("keydown", blockKeys, { passive: false });

		return () => {
			window.removeEventListener("keydown", blockKeys);
		};
	}, [isOpen]);

	return (
		<>
   {!isOpen && <main ref={contentRef} tabIndex={-1} className="site-container page-content"><PageIntro title={messages.playgroundPage.title} description={messages.playgroundPage.description} /><GameShelf title={messages.playgroundPage.playableTitle} description={messages.playgroundPage.playableDescription} games={playable} onOpen={openGame} /><GameShelf title={messages.playgroundPage.watchOnlyTitle} description={messages.playgroundPage.watchOnlyDescription} games={watchOnly} onOpen={openGame} /></main>}

				{isOpen && (
					<>
						<div
							className="fixed inset-0 z-40 bg-darkBg"
							onMouseDown={(e) => {
								if (e.currentTarget === e.target)
									backdropMouseDownRef.current = true;
							}}
							onMouseUp={(e) => {
								if (backdropMouseDownRef.current && e.currentTarget === e.target)
									closeGame();
								backdropMouseDownRef.current = false;
							}}
						/>

						<div
							className="fixed inset-0 z-50 overflow-y-auto p-2 md:flex md:items-center md:justify-center md:p-3"
							role="dialog"
							aria-modal="true"
							aria-labelledby="game-title"
							onMouseDown={() => {
								backdropMouseDownRef.current = false;
							}}
						>
							<div className="flex min-h-full items-start justify-center md:min-h-0">
								<div
									className={`relative flex flex-col overflow-hidden border border-zinc-800 bg-lessDarkBg ${
										isMobileViewport
											? "h-[min(96dvh,1000px)] w-full max-w-[1600px] rounded-[26px]"
											: "h-[min(94vh,1000px)] w-[min(98vw,1600px)] rounded-[30px]"
									}`}
									onClick={(e) => e.stopPropagation()}
								>
									<div className="relative z-20 border-b border-zinc-800 bg-lessDarkBg px-4 py-3 md:px-5 md:py-4">
										<div className="flex items-center gap-3 pr-12 md:pr-16">
											<div className="min-w-0">
												<p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">
													{messages.common.playground} /{" "}
													{selectedGame?.mode === "play"
														? messages.playgroundPage.badges.playable
														: messages.playgroundPage.badges.watchOnly}
												</p>
												<h3
													id="game-title"
													className="mt-1 truncate font-somerton text-lg uppercase tracking-[0.08em] text-wheat md:text-xl"
													title={selectedGameText?.name}
												>
													{selectedGameText?.name}
												</h3>
											</div>
										</div>
									</div>

									<button
										className="absolute right-3 top-3 z-30 md:right-4 md:top-4"
										onClick={closeGame}
										aria-label={messages.playgroundPage.closeGame}
									>
										<FaXmark className="h-9 w-9 rounded-xl border border-zinc-800 bg-darkBg p-1.5 text-wheat transition-colors hover:border-zinc-700 hover:bg-lessDarkBg hover:text-wheat" />
									</button>

								{isMobileViewport ? (
									<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
										<div className="flex min-h-full flex-col">
											<div className="border-b border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100 md:px-5">
												<p className="font-semibold uppercase tracking-[0.18em] text-amber-200/90">
													{messages.playgroundPage.mobileNoticeTitle}
												</p>
												<p className="mt-1 max-w-4xl text-amber-100/90">
													{messages.playgroundPage.mobileNoticeBody}
												</p>
											</div>

											<div
												ref={gameViewportRef}
												className="min-h-0 flex-1 overflow-hidden"
												style={{
													contain: "strict",
													isolation: "isolate",
												}}
											>
												{SelectedComponent && isGameMountReady ? (
													<SelectedComponent key={gameComponentKey} />
												) : (
													<p className="p-6 text-zinc-200">
														{messages.playgroundPage.loading}
													</p>
												)}
											</div>
										</div>
									</div>
									) : (
										<div
											ref={gameViewportRef}
											className="min-h-0 flex-1 overflow-hidden"
											style={{
												contain: "strict",
												isolation: "isolate",
											}}
										>
											{SelectedComponent && isGameMountReady ? (
												<SelectedComponent key={gameComponentKey} />
											) : (
												<p className="p-6 text-zinc-200">
													{messages.playgroundPage.loading}
												</p>
											)}
										</div>
									)}
							</div>
						</div>
					</div>
				</>
			)}
			{!isOpen && <Footer />}
		</>
	);
};

export default Playground;
