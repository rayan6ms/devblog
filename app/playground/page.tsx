"use client";

import dynamic from "next/dynamic";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FaXmark } from "react-icons/fa6";
import Footer from "@/components/Footer";

type Importer = () => Promise<{ default: React.ComponentType<any> }>;

type GameBase = {
	name: string;
	description: string;
	img: string;
	importer: Importer;
};

type PlayableGame = GameBase & { mode: "play" };
type WatchGame = GameBase & { mode: "watch" };
type Game = PlayableGame | WatchGame;

const games: Game[] = [
	{
		name: "Chess",
		description: "Classic Chess Game",
		img: "https://www.hollywoodreporter.com/wp-content/uploads/2021/07/MCDAVEN_EC081-H-2021.jpg?w=1296",
		mode: "play",
		importer: () => import("./chess/ChessPhaser"),
	},
	{
		name: "SnakeGame",
		description: "Classic Snake Game",
		img: "https://soundvenue.com/wp-content/uploads/2018/01/scarlett-johansson-3840x2160-black-widow-captain-america-civil-war-4k-755-2192x1233.jpg",
		mode: "play",
		importer: () => import("./snake-game/SnakePhaser"),
	},
	{
		name: "AntSimulator",
		description: "Ant colony race — watch the chaos unfold",
		img: "https://www.playstationlifestyle.net/wp-content/uploads/sites/9/2022/09/new-iron-man-game-by-ea.jpg?w=640",
		mode: "watch",
		importer: () => import("./ant-simulator/AntSimulator"),
	},
	{
		name: "SolarSystem",
		description: "Planetary dance — sit back and enjoy",
		img: "https://disneyplusbrasil.com.br/wp-content/uploads/2023/05/Peter-Quill-de-capacete.jpg",
		mode: "watch",
		importer: () => import("./solar-system/SolarSystem"),
	},
	{
		name: "Terminal",
		description: "Terminal Linux",
		img: "https://www.hollywoodreporter.com/wp-content/uploads/2021/07/MCDAVEN_EC081-H-2021.jpg?w=1296",
		mode: "play",
		importer: () => import("./terminal/Terminal"),
	},
	{
		name: "Tank Shooter",
		description: "Tank Shooter",
		img: "https://www.playstationlifestyle.net/wp-content/uploads/sites/9/2022/09/new-iron-man-game-by-ea.jpg?w=640",
		mode: "play",
		importer: () => import("./tank-shooter/TankShooter"),
	},
	{
		name: "Falling Sand",
		description: "Falling Sand",
		img: "https://disneyplusbrasil.com.br/wp-content/uploads/2023/05/Peter-Quill-de-capacete.jpg",
		mode: "play",
		importer: () => import("./falling-sand/FallingSand"),
	},
	{
		name: "Moving Mountains",
		description: "Moving Mountains",
		img: "https://www.hollywoodreporter.com/wp-content/uploads/2021/07/MCDAVEN_EC081-H-2021.jpg?w=1296",
		mode: "watch",
		importer: () => import("./moving-mountains/MovinMountains"),
	},
	{
		name: "Survival Shooter",
		description: "Survival Shooter",
		img: "https://www.playstationlifestyle.net/wp-content/uploads/sites/9/2022/09/new-iron-man-game-by-ea.jpg?w=640",
		mode: "play",
		importer: () => import("./survival-shooter/SurvivalShooter"),
	},
	{
		name: "Tetris",
		description: "Tetris",
		img: "https://disneyplusbrasil.com.br/wp-content/uploads/2023/05/Peter-Quill-de-capacete.jpg",
		mode: "play",
		importer: () => import("./tetris/Tetris"),
	},
	{
		name: "Binary Pong",
		description: "Binary Pong",
		img: "https://www.hollywoodreporter.com/wp-content/uploads/2021/07/MCDAVEN_EC081-H-2021.jpg?w=1296",
		mode: "watch",
		importer: () => import("./binary-pong/BinaryPong"),
	},
	{
		name: "Sine Waves",
		description: "Sine Waves",
		img: "https://www.playstationlifestyle.net/wp-content/uploads/sites/9/2022/09/new-iron-man-game-by-ea.jpg?w=640",
		mode: "play",
		importer: () => import("./sine-waves/SineWaves"),
	},
	{
		name: "Voronoi Wall",
		description: "Voronoi Wall",
		img: "https://disneyplusbrasil.com.br/wp-content/uploads/2023/05/Peter-Quill-de-capacete.jpg",
		mode: "watch",
		importer: () => import("./voronoi-wall/VoronoiWall"),
	},
	{
		name: "2048",
		description: "2048",
		img: "https://www.hollywoodreporter.com/wp-content/uploads/2021/07/MCDAVEN_EC081-H-2021.jpg?w=1296",
		mode: "play",
		importer: () => import("./2048/2048"),
	},
	{
		name: "Pacman",
		description: "Pacman",
		img: "https://www.playstationlifestyle.net/wp-content/uploads/sites/9/2022/09/new-iron-man-game-by-ea.jpg?w=640",
		mode: "play",
		importer: () => import("./pacman/Pacman"),
	},
	{
		name: "Newton Cannon",
		description: "Newton Cannon",
		img: "https://disneyplusbrasil.com.br/wp-content/uploads/2023/05/Peter-Quill-de-capacete.jpg",
		mode: "play",
		importer: () => import("./newton-cannon/NewtonCannon"),
	},
	{
		name: "Flappy Bird",
		description: "Flappy Bird",
		img: "https://www.hollywoodreporter.com/wp-content/uploads/2021/07/MCDAVEN_EC081-H-2021.jpg?w=1296",
		mode: "play",
		importer: () => import("./flappy-bird/FlappyBird"),
	},
	{
		name: "Labyrinth Explorer",
		description: "Labyrinth Explorer",
		img: "https://www.playstationlifestyle.net/wp-content/uploads/sites/9/2022/09/new-iron-man-game-by-ea.jpg?w=640",
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
	const { containerRef, innerRef, handlePointerMove, handlePointerLeave } =
		useCardTilt(16, 1.06);

	const badge =
		game.mode === "play"
			? { text: "Playable", cls: "bg-emerald-600/80" }
			: { text: "Watch-Only", cls: "bg-sky-600/80" };

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
					alt={game.name}
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
						{game.name}
					</h3>
					<p className="mt-1 text-xs leading-5 text-zinc-200/90">
						{game.description}
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
	return (
		<section className="rounded-[30px] border border-zinc-700/50 bg-lessDarkBg/90 px-6 py-8 shadow-xl shadow-zinc-950/20 sm:px-8">
			<div className="flex flex-col gap-4 border-b border-zinc-700/50 pb-6 sm:flex-row sm:items-end sm:justify-between">
				<div className="max-w-2xl">
					<p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
						Playground
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
						Projects
					</p>
					<p className="mt-2 text-3xl font-semibold text-wheat">
						{games.length}
					</p>
				</div>
			</div>
			<div className="mt-8 flex flex-wrap justify-center gap-6 xl:justify-start">
				{games.map((game) => (
					<GameCard key={game.name} game={game} onClick={onOpen} />
				))}
			</div>
		</section>
	);
};

const Playground: React.FC = () => {
	const [selectedGame, setSelectedGame] = useState<Game | null>(null);
	const [SelectedComponent, setSelectedComponent] =
		useState<React.ComponentType | null>(null);
	const contentRef = useRef<HTMLDivElement | null>(null);
	const backdropMouseDownRef = useRef(false);

	const playable = useMemo(() => games.filter((g) => g.mode === "play"), []);
	const watchOnly = useMemo(() => games.filter((g) => g.mode === "watch"), []);

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
			if (e.key === "Escape" && selectedGame) closeGame();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [selectedGame, closeGame]);

	const isOpen = !!selectedGame;

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
		const blockWheel = (e: WheelEvent) => e.preventDefault();
		const blockTouch = (e: TouchEvent) => e.preventDefault();

		window.addEventListener("keydown", blockKeys, { passive: false });
		window.addEventListener("wheel", blockWheel, { passive: false });
		window.addEventListener("touchmove", blockTouch, { passive: false });

		return () => {
			window.removeEventListener("keydown", blockKeys);
			window.removeEventListener("wheel", blockWheel as any);
			window.removeEventListener("touchmove", blockTouch as any);
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
							<div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] lg:items-end">
								<div className="max-w-3xl">
									<p className="text-xs uppercase tracking-[0.28em] text-zinc-500">
										Interactive archive
									</p>
									<h1 className="mt-3 text-4xl font-somerton uppercase text-wheat sm:text-5xl">
										Games, sketches, and playable detours
									</h1>
									<p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
										The playground keeps the experimental side of the project in
										view. Some pieces are meant to be played, some are meant to
										be watched, and all of them keep the site from feeling too
										static.
									</p>
								</div>
								<div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
									<div className="rounded-2xl border border-zinc-700/50 bg-greyBg/75 px-4 py-4">
										<p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
											Total projects
										</p>
										<p className="mt-2 text-3xl font-semibold text-wheat">
											{games.length}
										</p>
									</div>
									<div className="rounded-2xl border border-zinc-700/50 bg-greyBg/75 px-4 py-4">
										<p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
											Playable
										</p>
										<p className="mt-2 text-3xl font-semibold text-wheat">
											{playable.length}
										</p>
									</div>
									<div className="rounded-2xl border border-zinc-700/50 bg-greyBg/75 px-4 py-4">
										<p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
											Watch-only
										</p>
										<p className="mt-2 text-3xl font-semibold text-wheat">
											{watchOnly.length}
										</p>
									</div>
								</div>
							</div>
						</div>

						<div className="grid gap-4 px-6 py-8 sm:px-8">
							<GameShelf
								title="Playable"
								description="Hands-on experiments you can control directly, from games to toy systems."
								games={playable}
								onOpen={openGame}
							/>
							{watchOnly.length > 0 && (
								<GameShelf
									title="Watch-only"
									description="Visual pieces that are better treated like motion studies than score-based games."
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
						className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
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
						className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-3"
						role="dialog"
						aria-modal="true"
						aria-labelledby="game-title"
						onMouseDown={() => {
							backdropMouseDownRef.current = false;
						}}
					>
						<div
							className="relative h-[min(94vh,1000px)] w-[min(98vw,1600px)] overflow-hidden rounded-[28px] border border-zinc-700/50 bg-greyBg shadow-xl shadow-black/50"
							onClick={(e) => e.stopPropagation()}
						>
							<div className="absolute top-2 md:top-3 left-4 md:left-5 right-14 md:right-16 flex items-center gap-3 z-20">
								<h3
									id="game-title"
									className="text-white text-lg md:text-2xl font-semibold truncate"
									title={selectedGame?.name}
								>
									{selectedGame?.name}
								</h3>
							</div>

							<button
								className="absolute top-1.5 md:top-2 right-2.5 md:right-3 z-20"
								onClick={closeGame}
								aria-label="Close Game"
							>
								<FaXmark className="w-8 h-8 p-1 text-wheat hover:text-purpleContrast hover:bg-gray-700/50 rounded-xl transition-colors" />
							</button>

							<div className="w-full h-full pt-12 px-3 md:px-4 pb-3 md:pb-4">
								<div className="w-full h-full flex items-center justify-center">
									<div className="w-full h-full max-w-full max-h-full">
										{SelectedComponent ? (
											<SelectedComponent />
										) : (
											<p className="text-zinc-200">Loading...</p>
										)}
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
