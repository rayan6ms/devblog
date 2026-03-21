"use client";

import dynamic from "next/dynamic";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FaXmark } from "react-icons/fa6";
import Footer from "@/components/Footer";
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
		if (e.pointerType === "touch") return;
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
	const { messages } = useI18n();
	const { containerRef, innerRef, handlePointerMove, handlePointerLeave } =
		useCardTilt(16, 1.06);
	const gameText = messages.playgroundPage.games[game.id];

	const badge =
		game.mode === "play"
			? {
					text: messages.playgroundPage.badges.playable,
					cls: "bg-emerald-600/80",
				}
			: {
					text: messages.playgroundPage.badges.watchOnly,
					cls: "bg-sky-600/80",
				};

	return (
		<div
			ref={containerRef}
			className="group relative h-64 w-full max-w-[240px] select-none cursor-pointer [perspective:1200px]"
			onPointerMove={handlePointerMove}
			onPointerLeave={handlePointerLeave}
			onClick={() => onClick(game)}
		>
			<div className="absolute -inset-1 rounded-[28px] bg-gradient-to-r from-sky-500/20 via-purpleContrast/25 to-amber-300/15 blur-md will-change-transform" />

			<div
				ref={innerRef}
				className="relative h-full w-full overflow-hidden rounded-[24px] border border-zinc-200/10 bg-zinc-950/70 transition-transform duration-150 ease-out will-change-transform transform-gpu [transform-style:preserve-3d] group-hover:brightness-110"
			>
				<img
					src={game.img}
					alt={gameText.name}
					className="absolute inset-0 h-full w-full object-cover"
					style={{
						transform: "translateZ(30px) scale(1.06)",
						transformStyle: "preserve-3d",
					}}
					draggable={false}
				/>
				<div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
				<div className="absolute bottom-0 left-0 right-0 p-4">
					<h3 className="text-lg font-semibold text-white drop-shadow-sm">
						{gameText.name}
					</h3>
					<p className="mt-1 text-xs leading-5 text-zinc-200/90">
						{gameText.description}
					</p>
				</div>
				<div
					className={`absolute right-3 top-3 rounded-full border border-white/15 px-2.5 py-1 text-[10px] uppercase tracking-wide text-white backdrop-blur-sm ${badge.cls}`}
				>
					{badge.text}
				</div>
			</div>
		</div>
	);
};

const GameShelf: React.FC<{
	title: string;
	description: string;
	games: Game[];
	onOpen: (g: Game) => void;
}> = ({ title, description, games, onOpen }) => {
	const { messages } = useI18n();

	return (
		<section className="rounded-[30px] border border-zinc-700/50 bg-lessDarkBg/90 px-6 py-8 shadow-xl shadow-zinc-950/20 sm:px-8">
			<div className="flex flex-col gap-4 border-b border-zinc-700/50 pb-6 sm:flex-row sm:items-end sm:justify-between">
				<div className="max-w-2xl">
					<p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
						{messages.common.playground}
					</p>
					<h2 className="mt-2 text-3xl font-somerton uppercase text-wheat">
						{title}
					</h2>
					<p className="mt-3 text-sm leading-7 text-zinc-400">
						{description}
					</p>
				</div>
				<div className="rounded-2xl border border-zinc-700/50 bg-greyBg/75 px-4 py-4">
					<p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
						{messages.playgroundPage.projects}
					</p>
					<p className="mt-2 text-3xl font-semibold text-wheat">
						{games.length}
					</p>
				</div>
			</div>
			<div className="mt-8 flex flex-wrap justify-center gap-6 xl:justify-start">
				{games.map((game) => (
					<GameCard key={game.id} game={game} onClick={onOpen} />
				))}
			</div>
		</section>
	);
};

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
		let cancelled = false;

		if (selectedGame) {
			const Dyn = dynamic(selectedGame.importer, {
				ssr: false,
				loading: () => (
					<p className="text-zinc-200">{messages.playgroundPage.loading}</p>
				),
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
			<div className="min-h-screen bg-darkBg text-gray">
				<main
					ref={contentRef}
					tabIndex={-1}
					className="mx-auto w-full max-w-[1440px] px-4 pb-10 pt-8 sm:px-6 lg:px-8"
				>
					<section className="overflow-hidden rounded-[30px] border border-zinc-700/50 bg-lessDarkBg/90 shadow-xl shadow-zinc-950/20">
						<div className="border-b border-zinc-700/50 px-6 py-10 sm:px-8">
							<div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
								<div className="max-w-2xl">
									<p className="text-xs uppercase tracking-[0.28em] text-zinc-500">
										{messages.common.playground}
									</p>
									<h1 className="mt-3 text-4xl font-somerton uppercase text-wheat sm:text-5xl">
										{messages.playgroundPage.title}
									</h1>
									<p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
										{messages.playgroundPage.description}
									</p>
								</div>
								<div className="flex flex-wrap gap-3 lg:justify-end">
									<div className="w-fit rounded-2xl border border-zinc-700/50 bg-greyBg/75 px-4 py-3">
										<p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
											{messages.playgroundPage.totalProjects}
										</p>
										<p className="mt-2 text-2xl font-semibold text-wheat">
											{games.length}
										</p>
									</div>
									<div className="w-fit rounded-2xl border border-zinc-700/50 bg-greyBg/75 px-4 py-3">
										<p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
											{messages.playgroundPage.badges.playable}
										</p>
										<p className="mt-2 text-2xl font-semibold text-wheat">
											{playable.length}
										</p>
									</div>
									<div className="w-fit rounded-2xl border border-zinc-700/50 bg-greyBg/75 px-4 py-3">
										<p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
											{messages.playgroundPage.badges.watchOnly}
										</p>
										<p className="mt-2 text-2xl font-semibold text-wheat">
											{watchOnly.length}
										</p>
									</div>
								</div>
							</div>
						</div>

						<div className="grid gap-4 px-6 py-8 sm:px-8">
							<GameShelf
								title={messages.playgroundPage.playableTitle}
								description={messages.playgroundPage.playableDescription}
								games={playable}
								onOpen={openGame}
							/>
							{watchOnly.length > 0 && (
								<GameShelf
									title={messages.playgroundPage.watchOnlyTitle}
									description={messages.playgroundPage.watchOnlyDescription}
									games={watchOnly}
									onOpen={openGame}
								/>
							)}
						</div>
					</section>
				</main>
			</div>
			{isOpen && (
				<>
					<div
						className="fixed inset-0 z-40 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.12),transparent_32%),linear-gradient(to_bottom,rgba(9,9,11,0.72),rgba(0,0,0,0.88))] backdrop-blur-md"
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
								className={`relative flex flex-col overflow-hidden border border-zinc-700/50 bg-lessDarkBg/95 shadow-[0_32px_90px_rgba(0,0,0,0.55)] ${
									isMobileViewport
										? "h-[min(96dvh,1000px)] w-full max-w-[1600px] rounded-[26px]"
										: "h-[min(94vh,1000px)] w-[min(98vw,1600px)] rounded-[30px]"
								}`}
								onClick={(e) => e.stopPropagation()}
							>
								<div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.14),transparent_60%)]" />

								<div className="relative z-20 border-b border-zinc-700/50 bg-lessDarkBg/92 px-4 py-3 backdrop-blur-sm md:px-5 md:py-4">
									<div className="flex items-center justify-between gap-3 pr-12 md:pr-16">
										<div className="min-w-0">
											<p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">
												{messages.common.playground}
											</p>
											<h3
												id="game-title"
												className="mt-1 truncate font-somerton text-lg uppercase tracking-[0.08em] text-wheat md:text-xl"
												title={selectedGameText?.name}
											>
												{selectedGameText?.name}
											</h3>
										</div>
										<div className="rounded-2xl border border-zinc-700/50 bg-greyBg/75 px-3 py-2">
											<p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
												{messages.playgroundPage.mode}
											</p>
											<p className="mt-1 text-sm font-semibold text-wheat">
												{selectedGame?.mode === "play"
													? messages.playgroundPage.badges.playable
													: messages.playgroundPage.badges.watchOnly}
											</p>
										</div>
									</div>
								</div>

								<button
									className="absolute right-3 top-3 z-30 md:right-4 md:top-4"
									onClick={closeGame}
									aria-label={messages.playgroundPage.closeGame}
								>
									<FaXmark className="h-9 w-9 rounded-xl border border-zinc-700/60 bg-greyBg/80 p-1.5 text-wheat transition-colors hover:border-zinc-500/70 hover:bg-zinc-800/90 hover:text-purpleContrast" />
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

											<div ref={gameViewportRef} className="min-h-0 flex-1">
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
										<div ref={gameViewportRef} className="min-h-0 flex-1">
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
			<Footer />
		</>
	);
};

export default Playground;
