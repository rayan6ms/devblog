"use client";

import { useEffect, useRef, useState } from "react";

type PhaserModule = typeof import("phaser");
type PhaserGame = import("phaser").Game;
type PhaserScene = import("phaser").Scene;
type PhaserGraphics = import("phaser").GameObjects.Graphics;
type PhaserText = import("phaser").GameObjects.Text;
type CursorKeys = import("phaser").Types.Input.Keyboard.CursorKeys;
type PhaserKey = import("phaser").Input.Keyboard.Key;

const ABILITY_LABELS = {
	pierce: "Pierce",
	multiShot: "Multi Shot",
	quickShot: "Quick Shot",
	critChance: "Crit Chance",
	critDamage: "Crit Damage",
	dodge: "Dodge",
	ricochet: "Ricochet",
	poisonTrail: "Poison Trail",
	orbitals: "Orbitals",
	aura: "Shock Aura",
	magnet: "Magnet",
	shrapnel: "Shrapnel",
	novaBurst: "Nova Burst",
	thorns: "Thorns",
} as const;

type AbilityKey = keyof typeof ABILITY_LABELS;
type XpShape = "triangle" | "square" | "pentagon" | "hexagon" | "octagon" | "decagon";

type Player = {
	x: number;
	y: number;
	radius: number;
	speed: number;
	lives: number;
	maxLives: number;
	damage: number;
	shotTimer: number;
	invulnerabilityTimer: number;
};

type Enemy = {
	id: number;
	x: number;
	y: number;
	radius: number;
	speed: number;
	hp: number;
	maxHp: number;
	color: number;
	elite: boolean;
	flashTimer: number;
	auraTickTimer: number;
	trailTickTimer: number;
	orbitalHitTimer: number;
};

type Bullet = {
	x: number;
	y: number;
	vx: number;
	vy: number;
	radius: number;
	damage: number;
	life: number;
	extraHitsRemaining: number;
	ricochetsRemaining: number;
	hitEnemyIds: number[];
};

type XpOrb = {
	x: number;
	y: number;
	radius: number;
	value: number;
	color: number;
	shape: XpShape;
	spin: number;
};

type SceneryBlob = {
	x: number;
	y: number;
	radius: number;
	color: number;
	alpha: number;
};

type TrailCloud = {
	x: number;
	y: number;
	radius: number;
	ttl: number;
	maxTtl: number;
	damage: number;
	spin: number;
};

type Particle = {
	x: number;
	y: number;
	vx: number;
	vy: number;
	radius: number;
	ttl: number;
	maxTtl: number;
	color: number;
	alpha: number;
	shrink: boolean;
};

type DamageText = {
	label: PhaserText;
	x: number;
	y: number;
	ttl: number;
	maxTtl: number;
	velocityY: number;
};

type PendingBurst = {
	delay: number;
};

type ArenaLayout = {
	fieldX: number;
	fieldY: number;
	fieldWidth: number;
	fieldHeight: number;
};

type GameState = {
	player: Player;
	enemies: Enemy[];
	bullets: Bullet[];
	xpOrbs: XpOrb[];
	trailClouds: TrailCloud[];
	particles: Particle[];
	damageTexts: DamageText[];
	abilities: Record<AbilityKey, number>;
	level: number;
	xp: number;
	nextLevelXp: number;
	kills: number;
	totalDamage: number;
	timeSurvived: number;
	spawnTimer: number;
	trailSpawnTimer: number;
	novaTimer: number;
	phase: "start" | "playing" | "paused" | "gameOver";
	overdriveUntil: number;
	overdriveCooldownUntil: number;
	nextOverdriveKillMilestone: number;
	screenFlash: number;
	bannerText: string;
	bannerTimer: number;
	pendingBursts: PendingBurst[];
	worldWidth: number;
	worldHeight: number;
	cameraX: number;
	lastHorizontalDirection: -1 | 1;
	scenery: SceneryBlob[];
};

type KeyMap = {
	W: PhaserKey;
	A: PhaserKey;
	S: PhaserKey;
	D: PhaserKey;
	R: PhaserKey;
	SPACE: PhaserKey;
	ENTER: PhaserKey;
	P: PhaserKey;
};

const TAU = Math.PI * 2;
const WORLD_WIDTH_MULTIPLIER = 12;
const ENEMY_GRID_CELL_SIZE = 72;

const XP_SHAPE_SIDES: Record<XpShape, number> = {
	triangle: 3,
	square: 4,
	pentagon: 5,
	hexagon: 6,
	octagon: 8,
	decagon: 10,
};

const XP_SHAPE_COLORS: Record<XpShape, number> = {
	triangle: 0x7dd3a7,
	square: 0xfde68a,
	pentagon: 0xfb7185,
	hexagon: 0xc084fc,
	octagon: 0x67e8f9,
	decagon: 0x93c5fd,
};

const BASIC_ABILITIES: AbilityKey[] = [
	"quickShot",
	"multiShot",
	"pierce",
	"critChance",
	"critDamage",
	"magnet",
];

const MIDGAME_ABILITIES: AbilityKey[] = [
	...BASIC_ABILITIES,
	"ricochet",
	"poisonTrail",
	"orbitals",
	"aura",
	"shrapnel",
	"novaBurst",
];

const LATEGAME_ABILITIES: AbilityKey[] = [...MIDGAME_ABILITIES, "dodge", "thorns"];

const ENEMY_NORMAL_COLORS = [0xfb7185, 0xf97316, 0xef4444, 0xdc2626];
const ENEMY_ELITE_COLORS = [0xff8f66, 0xff6b6b, 0xfb7185, 0xf43f5e];

function clamp(value: number, min: number, max: number) {
	if (max < min) return min;
	return Math.min(max, Math.max(min, value));
}

function formatCompact(value: number) {
	if (value < 1_000) return `${value}`;
	if (value < 1_000_000) return `${(value / 1_000).toFixed(value < 10_000 ? 1 : 0)}k`;
	return `${(value / 1_000_000).toFixed(1)}m`;
}

function formatTime(totalSeconds: number) {
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = Math.floor(totalSeconds % 60);
	return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatPercent(value: number) {
	return `${Math.round(value * 100)}%`;
}

function blendColors(colorA: number, colorB: number, amount: number) {
	const t = clamp(amount, 0, 1);
	const aRed = (colorA >> 16) & 0xff;
	const aGreen = (colorA >> 8) & 0xff;
	const aBlue = colorA & 0xff;
	const bRed = (colorB >> 16) & 0xff;
	const bGreen = (colorB >> 8) & 0xff;
	const bBlue = colorB & 0xff;
	return (
		(Math.round(aRed + (bRed - aRed) * t) << 16) |
		(Math.round(aGreen + (bGreen - aGreen) * t) << 8) |
		Math.round(aBlue + (bBlue - aBlue) * t)
	);
}

function resolveHostSize(host: HTMLDivElement) {
	const rect = host.getBoundingClientRect();
	return {
		width: Math.max(1, Math.floor(host.clientWidth || rect.width || 1)),
		height: Math.max(1, Math.floor(host.clientHeight || rect.height || 1)),
	};
}

function circleHit(
	ax: number,
	ay: number,
	ar: number,
	bx: number,
	by: number,
	br: number,
) {
	const dx = ax - bx;
	const dy = ay - by;
	const sum = ar + br;
	return dx * dx + dy * dy <= sum * sum;
}

function getArenaLayout(width: number, height: number): ArenaLayout {
	return {
		fieldX: 0,
		fieldY: 0,
		fieldWidth: Math.max(1, width),
		fieldHeight: Math.max(1, height),
	};
}

function getXpShape(level: number): XpShape {
	if (level < 4) return "triangle";
	if (level < 8) return "square";
	if (level < 13) return "pentagon";
	if (level < 18) return "hexagon";
	if (level < 24) return "octagon";
	return "decagon";
}

function getXpValue(level: number, elite: boolean) {
	const shape = getXpShape(level);
	const base =
		shape === "triangle"
			? 7
			: shape === "square"
				? 10
				: shape === "pentagon"
					? 14
					: shape === "hexagon"
						? 18
						: shape === "octagon"
							? 25
							: 34;
	return elite ? Math.round(base * 1.8) : base;
}

function getShotCooldownSeconds(state: GameState) {
	const cooldown = 0.82 - (state.level - 1) * 0.012 - state.abilities.quickShot * 0.05;
	return clamp(cooldown, 0.18, 0.82);
}

function getVolleyCount(state: GameState) {
	return clamp(1 + Math.floor(state.abilities.quickShot / 2), 1, 4);
}

function getProjectileCount(state: GameState) {
	const level = state.abilities.multiShot;
	if (level <= 0) return 1;
	if (level === 1) return 3;
	if (level === 2) return 5;
	return 7;
}

function getCritChance(state: GameState) {
	return clamp(0.05 + state.abilities.critChance * 0.055, 0.05, 0.45);
}

function getCritDamageMultiplier(state: GameState) {
	return 1.6 + state.abilities.critDamage * 0.45;
}

function getDodgeChance(state: GameState) {
	return clamp(state.abilities.dodge * 0.045, 0, 0.3);
}

function getRicochetCount(state: GameState) {
	return clamp(state.abilities.ricochet, 0, 5);
}

function getMagnetRadius(state: GameState) {
	return 150 + state.abilities.magnet * 36;
}

function getPoisonTrailStats(state: GameState) {
	const level = state.abilities.poisonTrail;
	if (level <= 0) return null;
	return {
		radius: 18 + level * 6,
		damage: 1 + level,
		duration: 1.5 + level * 0.35,
		spawnInterval: clamp(0.28 - level * 0.025, 0.12, 0.28),
	};
}

function getAuraStats(state: GameState) {
	const level = state.abilities.aura;
	if (level <= 0) return null;
	return {
		radius: 48 + level * 14,
		damage: 1 + level * 1.25,
		tickInterval: clamp(0.55 - level * 0.04, 0.22, 0.55),
	};
}

function getOrbitalStats(state: GameState) {
	const level = state.abilities.orbitals;
	if (level <= 0) return null;
	return {
		diamonds: clamp(level, 1, 5),
		radius: 44 + level * 8,
		damage: 2 + level * 1.5,
		rotationSpeed: 1.6 + level * 0.35,
		hitCooldown: clamp(0.28 - level * 0.02, 0.12, 0.28),
	};
}

function getShrapnelStats(state: GameState) {
	const level = state.abilities.shrapnel;
	if (level <= 0) return null;
	return {
		radius: 38 + level * 16,
		damage: 1 + level * 1.3,
	};
}

function getNovaBurstStats(state: GameState) {
	const level = state.abilities.novaBurst;
	if (level <= 0) return null;
	return {
		projectiles: 5 + level * 2,
		damage: Math.max(1, Math.round(state.player.damage * (0.5 + level * 0.18))),
		cooldown: clamp(4.6 - level * 0.38, 1.8, 4.6),
		life: 0.8 + level * 0.06,
	};
}

function getThornsStats(state: GameState) {
	const level = state.abilities.thorns;
	if (level <= 0) return null;
	return {
		radius: 54 + level * 12,
		damage: 2 + level * 1.4,
	};
}

function getNextOverdriveKillRequirement(state: GameState) {
	return Math.round(140 + state.level * 6 + state.timeSurvived * 0.95 + state.kills * 0.18);
}

function getOverdriveCooldownDuration(state: GameState) {
	return clamp(15 + state.timeSurvived * 0.03, 15, 26);
}

function getXpBarMetrics(layout: ArenaLayout) {
	const maxWidth = Math.max(120, layout.fieldWidth - 360);
	const width = Math.min(maxWidth, clamp(layout.fieldWidth * 0.26, 180, maxWidth));
	return {
		x: layout.fieldX + (layout.fieldWidth - width) / 2,
		y: layout.fieldY + 30,
		width,
		height: 20,
	};
}

function lightenColor(PhaserLib: PhaserModule, color: number, amount: number) {
	const base = PhaserLib.Display.Color.IntegerToColor(color);
	return PhaserLib.Display.Color.GetColor(
		Math.round(base.red + (255 - base.red) * amount),
		Math.round(base.green + (255 - base.green) * amount),
		Math.round(base.blue + (255 - base.blue) * amount),
	);
}

function dimColor(PhaserLib: PhaserModule, color: number, amount: number) {
	const base = PhaserLib.Display.Color.IntegerToColor(color);
	const factor = clamp(1 - amount, 0, 1);
	return PhaserLib.Display.Color.GetColor(
		Math.round(base.red * factor),
		Math.round(base.green * factor),
		Math.round(base.blue * factor),
	);
}

function mountSurvivalShooter(
	host: HTMLDivElement,
	PhaserLib: PhaserModule,
	onReady: () => void,
) {
	let game: PhaserGame | null = null;
	let graphics: PhaserGraphics | null = null;
	let statsText: PhaserText | null = null;
	let abilityText: PhaserText | null = null;
	let pauseButtonText: PhaserText | null = null;
	let xpTitleText: PhaserText | null = null;
	let xpMetaText: PhaserText | null = null;
	let bannerText: PhaserText | null = null;
	let centerText: PhaserText | null = null;
	let observer: ResizeObserver | null = null;
	let sceneRef: PhaserScene | null = null;
	let cursors: CursorKeys | null = null;
	let keys: KeyMap | null = null;
	let nextEnemyId = 1;
	let restartRequested = false;

	const createState = (sceneWidth: number, sceneHeight: number): GameState => {
		const layout = getArenaLayout(sceneWidth, sceneHeight);
		const worldHeight = layout.fieldHeight;
		const worldWidth = Math.round(layout.fieldWidth * WORLD_WIDTH_MULTIPLIER);
		const playerX = worldWidth / 2;
		const playerY = worldHeight / 2;
		const sceneryCount = Math.max(10, Math.round(worldWidth / Math.max(layout.fieldWidth, 1)) * 2);
		const scenery = Array.from({ length: sceneryCount }, (_, index) => {
			const hue = (0.56 + (index % 5) * 0.07) % 1;
			return {
				x: (worldWidth / sceneryCount) * index + Math.random() * layout.fieldWidth * 0.7,
				y: layout.fieldHeight * (0.16 + Math.random() * 0.68),
				radius: layout.fieldHeight * (0.18 + Math.random() * 0.24),
				color: PhaserLib.Display.Color.HSLToColor(hue, 0.42, 0.18 + Math.random() * 0.08).color,
				alpha: 0.16 + Math.random() * 0.08,
			};
		});

		return {
			player: {
				x: playerX,
				y: playerY,
				radius: 16,
				speed: 230,
				lives: 3,
				maxLives: 3,
				damage: 1,
				shotTimer: 0.15,
				invulnerabilityTimer: 0,
			},
			enemies: [],
			bullets: [],
			xpOrbs: [],
			trailClouds: [],
			particles: [],
			damageTexts: [],
			abilities: {
				pierce: 0,
				multiShot: 0,
				quickShot: 0,
				critChance: 0,
				critDamage: 0,
				dodge: 0,
				ricochet: 0,
				poisonTrail: 0,
				orbitals: 0,
				aura: 0,
				magnet: 0,
				shrapnel: 0,
				novaBurst: 0,
				thorns: 0,
			},
			level: 1,
			xp: 0,
			nextLevelXp: 90,
			kills: 0,
			totalDamage: 0,
			timeSurvived: 0,
			spawnTimer: 1.05,
			trailSpawnTimer: 0,
			novaTimer: 2.2,
			phase: "start",
			overdriveUntil: 0,
			overdriveCooldownUntil: 0,
			nextOverdriveKillMilestone: 140,
			screenFlash: 0,
			bannerText: "Survive the swarm",
			bannerTimer: 2.8,
			pendingBursts: [],
			worldWidth,
			worldHeight,
			cameraX: clamp(
				playerX - layout.fieldWidth / 2,
				0,
				Math.max(0, worldWidth - layout.fieldWidth),
			),
			lastHorizontalDirection: 1,
			scenery,
		};
	};

	let state = createState(1, 1);

	const createTextStyle = (size: number, align: "left" | "right" | "center") => ({
		fontFamily: '"IBM Plex Mono", "Fira Code", ui-monospace, monospace',
		fontSize: `${size}px`,
		color: "#e2e8f0",
		align,
		lineSpacing: 4,
	});

	const getLayout = (scene: PhaserScene) => getArenaLayout(scene.scale.width, scene.scale.height);

	const worldToScreenX = (worldX: number, layout: ArenaLayout) =>
		layout.fieldX + (worldX - state.cameraX);

	const worldToScreenY = (worldY: number, layout: ArenaLayout) => layout.fieldY + worldY;

	const getActiveEnemyIndices = (scene: PhaserScene) => {
		const layout = getLayout(scene);
		const minX = state.cameraX - Math.max(220, layout.fieldWidth * 0.4);
		const maxX = state.cameraX + layout.fieldWidth + Math.max(220, layout.fieldWidth * 0.4);
		const activeIndices: number[] = [];
		for (let index = 0; index < state.enemies.length; index += 1) {
			const enemy = state.enemies[index];
			if (
				enemy.x >= minX &&
				enemy.x <= maxX &&
				enemy.y >= -120 &&
				enemy.y <= state.worldHeight + 120
			) {
				activeIndices.push(index);
			}
		}
		return activeIndices;
	};

	const buildEnemyGrid = (enemyIndices: number[]) => {
		const grid = new Map<string, number[]>();
		for (const index of enemyIndices) {
			const enemy = state.enemies[index];
			const cellX = Math.floor(enemy.x / ENEMY_GRID_CELL_SIZE);
			const cellY = Math.floor(enemy.y / ENEMY_GRID_CELL_SIZE);
			const key = `${cellX}:${cellY}`;
			const bucket = grid.get(key);
			if (bucket) bucket.push(index);
			else grid.set(key, [index]);
		}
		return grid;
	};

	const collectNearbyEnemyIndices = (
		grid: Map<string, number[]>,
		x: number,
		y: number,
		buffer: number[],
	) => {
		buffer.length = 0;
		const baseX = Math.floor(x / ENEMY_GRID_CELL_SIZE);
		const baseY = Math.floor(y / ENEMY_GRID_CELL_SIZE);
		for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
			for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
				const bucket = grid.get(`${baseX + offsetX}:${baseY + offsetY}`);
				if (!bucket) continue;
				for (const enemyIndex of bucket) {
					buffer.push(enemyIndex);
				}
			}
		}
	};

	const pushBanner = (message: string, duration = 2.4) => {
		state.bannerText = message;
		state.bannerTimer = duration;
	};

	const getPauseButtonBounds = () => pauseButtonText?.getBounds() ?? null;

	const findClosestEnemy = (enemyIndices?: number[]) => {
		const indices =
			enemyIndices && enemyIndices.length > 0
				? enemyIndices
				: Array.from({ length: state.enemies.length }, (_, index) => index);
		let closestEnemy: Enemy | null = null;
		let closestDistance = Number.POSITIVE_INFINITY;
		for (const enemyIndex of indices) {
			const enemy = state.enemies[enemyIndex];
			if (!enemy) continue;
			const distance =
				(enemy.x - state.player.x) ** 2 + (enemy.y - state.player.y) ** 2;
			if (distance < closestDistance) {
				closestDistance = distance;
				closestEnemy = enemy;
			}
		}
		return closestEnemy;
	};

	const chooseAbilityToUpgrade = () => {
		const pool =
			state.level < 4
				? BASIC_ABILITIES
				: state.level < 8
					? MIDGAME_ABILITIES
					: LATEGAME_ABILITIES;
		const locked = pool.filter(
			(key) => state.abilities[key] === 0,
		);
		const choices = locked.length > 0 ? locked : pool;
		const lowestLevel = Math.min(...choices.map((key) => state.abilities[key]));
		const candidates = choices.filter((key) => state.abilities[key] === lowestLevel);
		return PhaserLib.Utils.Array.GetRandom(candidates) ?? choices[0];
	};

	const upgradeAbility = () => {
		const ability = chooseAbilityToUpgrade();
		state.abilities[ability] += 1;
		pushBanner(`${ABILITY_LABELS[ability]} Lv.${state.abilities[ability]}`, 2.6);
	};

	const clearDamageTexts = () => {
		for (const item of state.damageTexts) {
			item.label.destroy();
		}
		state.damageTexts = [];
	};

	const beginRun = (scene: PhaserScene) => {
		state.phase = "playing";
		state.bannerText = "Survive the swarm";
		state.bannerTimer = 1.8;
		state.player.shotTimer = 0.15;
		restartRequested = false;
		syncCamera(scene);
		updateHud(scene);
	};

	const togglePause = (scene: PhaserScene) => {
		state.phase = state.phase === "paused" ? "playing" : "paused";
		restartRequested = false;
		updateHud(scene);
	};

	const syncCamera = (scene: PhaserScene) => {
		const layout = getLayout(scene);
		const deadzone = layout.fieldWidth * 0.18;
		const playerScreenX = state.player.x - state.cameraX;
		if (playerScreenX < deadzone) {
			state.cameraX = state.player.x - deadzone;
		} else if (playerScreenX > layout.fieldWidth - deadzone) {
			state.cameraX = state.player.x - (layout.fieldWidth - deadzone);
		}
		state.cameraX = clamp(
			state.cameraX,
			0,
			Math.max(0, state.worldWidth - layout.fieldWidth),
		);
	};

	const resizeWorldState = (scene: PhaserScene) => {
		const layout = getLayout(scene);
		const previousHeight = Math.max(state.worldHeight, 1);
		const ratio = layout.fieldHeight / previousHeight;

		state.worldHeight = layout.fieldHeight;
		state.player.y = clamp(state.player.y * ratio, state.player.radius, state.worldHeight - state.player.radius);

		for (const enemy of state.enemies) {
			enemy.y = clamp(enemy.y * ratio, -80, state.worldHeight + 80);
		}

		for (const orb of state.xpOrbs) {
			orb.y = clamp(orb.y * ratio, -80, state.worldHeight + 80);
		}

		for (const cloud of state.trailClouds) {
			cloud.y = clamp(cloud.y * ratio, -80, state.worldHeight + 80);
			cloud.radius *= ratio;
		}

		for (const particle of state.particles) {
			particle.y = clamp(particle.y * ratio, -120, state.worldHeight + 120);
		}

		for (const bullet of state.bullets) {
			bullet.y = clamp(bullet.y * ratio, -120, state.worldHeight + 120);
		}

		for (const damageText of state.damageTexts) {
			damageText.y *= ratio;
		}

		state.worldWidth = Math.max(state.worldWidth, layout.fieldWidth * WORLD_WIDTH_MULTIPLIER);
		for (const blob of state.scenery) {
			blob.y = clamp(blob.y * ratio, 0, state.worldHeight);
			blob.radius *= ratio;
		}
		syncCamera(scene);
	};

	const resetGame = (scene: PhaserScene) => {
		clearDamageTexts();
		nextEnemyId = 1;
		state = createState(scene.scale.width, scene.scale.height);
		upgradeAbility();
		state.player.shotTimer = 0.15;
		restartRequested = false;
		syncCamera(scene);
		updateHud(scene);
	};

	const resizeGame = () => {
		if (!game) return;
		const nextSize = resolveHostSize(host);
		game.scale.resize(nextSize.width, nextSize.height);
	};

	const updateHudLayout = (scene: PhaserScene) => {
		const layout = getLayout(scene);
		const bar = getXpBarMetrics(layout);
		const headerY = layout.fieldY + 12;
		const xpY = layout.fieldY + 8;

		statsText?.setPosition(layout.fieldX + 18, headerY).setOrigin(0, 0);
		abilityText?.setPosition(layout.fieldX + layout.fieldWidth - 18, headerY).setOrigin(1, 0);
		pauseButtonText?.setPosition(layout.fieldX + layout.fieldWidth - 192, headerY + 2).setOrigin(0.5, 0);
		xpTitleText?.setPosition(layout.fieldX + layout.fieldWidth / 2, xpY).setOrigin(0.5, 0);
		xpMetaText?.setPosition(bar.x + bar.width, xpY).setOrigin(1, 0);
		bannerText
			?.setPosition(layout.fieldX + layout.fieldWidth / 2, bar.y + bar.height + 18)
			.setOrigin(0.5, 0);
		centerText
			?.setPosition(layout.fieldX + layout.fieldWidth / 2, layout.fieldY + layout.fieldHeight / 2)
			.setOrigin(0.5);
	};

	const addCombatText = (
		scene: PhaserScene,
		x: number,
		y: number,
		text: string,
		tint = 0xfef08a,
		size = 15,
		ttl = 0.45,
		velocityY = 34,
	) => {
		const label = scene.add.text(0, 0, text, createTextStyle(size, "center"));
		label.setOrigin(0.5);
		label.setDepth(10);
		label.setTint(tint);
		state.damageTexts.push({
			label,
			x,
			y,
			ttl,
			maxTtl: ttl,
			velocityY,
		});
	};

	const emitParticles = (
		x: number,
		y: number,
		color: number,
		count: number,
		options?: {
			speedMin?: number;
			speedMax?: number;
			radiusMin?: number;
			radiusMax?: number;
			ttlMin?: number;
			ttlMax?: number;
			alpha?: number;
			spread?: number;
			shrink?: boolean;
		},
	) => {
		const {
			speedMin = 28,
			speedMax = 92,
			radiusMin = 1.6,
			radiusMax = 3.8,
			ttlMin = 0.14,
			ttlMax = 0.34,
			alpha = 0.9,
			spread = TAU,
			shrink = true,
		} = options ?? {};
		for (let index = 0; index < count; index += 1) {
			const angle = PhaserLib.Math.FloatBetween(-spread / 2, spread / 2);
			const speed = PhaserLib.Math.FloatBetween(speedMin, speedMax);
			const ttl = PhaserLib.Math.FloatBetween(ttlMin, ttlMax);
			state.particles.push({
				x,
				y,
				vx: Math.cos(angle) * speed,
				vy: Math.sin(angle) * speed,
				radius: PhaserLib.Math.FloatBetween(radiusMin, radiusMax),
				ttl,
				maxTtl: ttl,
				color,
				alpha,
				shrink,
			});
		}
	};

	const triggerOverdrive = () => {
		state.overdriveUntil = state.timeSurvived + 6.5;
		state.overdriveCooldownUntil =
			state.overdriveUntil + getOverdriveCooldownDuration(state);
		state.nextOverdriveKillMilestone =
			state.kills + getNextOverdriveKillRequirement(state);
		for (const enemy of state.enemies) {
			enemy.hp = Math.min(enemy.hp, 1);
		}
		pushBanner("Overdrive engaged", 2.8);
	};

	const levelUpIfNeeded = () => {
		while (state.xp >= state.nextLevelXp) {
			state.xp -= state.nextLevelXp;
			state.level += 1;
			state.nextLevelXp = Math.round(state.nextLevelXp * 1.17 + 18);
			emitParticles(state.player.x, state.player.y, 0x67e8f9, 14, {
				speedMin: 36,
				speedMax: 120,
				radiusMin: 1.8,
				radiusMax: 4.4,
				ttlMin: 0.2,
				ttlMax: 0.48,
				alpha: 0.95,
			});
			emitParticles(state.player.x, state.player.y, 0x22c55e, 10, {
				speedMin: 24,
				speedMax: 92,
				radiusMin: 1.2,
				radiusMax: 3.2,
				ttlMin: 0.16,
				ttlMax: 0.38,
				alpha: 0.8,
			});

			if (state.level % 2 === 0) {
				upgradeAbility();
			}

			if (state.level % 3 === 0) {
				state.player.damage += 1;
				pushBanner(`Weapon power ${state.player.damage}`, 2.2);
			}

			if (state.level % 5 === 0) {
				state.player.speed = Math.min(320, state.player.speed + 8);
				pushBanner(`Mobility ${Math.round(state.player.speed)}`, 2.2);
			}

			if (state.level % 6 === 0) {
				state.player.maxLives = Math.min(8, state.player.maxLives + 1);
				state.player.lives = Math.min(state.player.maxLives, state.player.lives + 1);
				pushBanner(`Armor surge ${state.player.maxLives}`, 2.8);
			}
		}
	};

	const spawnXp = (x: number, y: number, elite: boolean) => {
		const shape = getXpShape(state.level);
		const count = elite ? 2 : 1;
		for (let index = 0; index < count; index += 1) {
			const angle = (TAU / Math.max(count, 1)) * index;
			state.xpOrbs.push({
				x: x + Math.cos(angle) * (elite ? 10 : 0),
				y: y + Math.sin(angle) * (elite ? 10 : 0),
				radius: elite ? 8 : 6,
				value: getXpValue(state.level, elite && index === 0),
				color: XP_SHAPE_COLORS[shape],
				shape,
				spin: PhaserLib.Math.FloatBetween(-1.6, 1.6),
			});
		}
	};

	const createEnemy = (scene: PhaserScene) => {
		const layout = getLayout(scene);
		const cameraLeft = state.cameraX;
		const cameraRight = cameraLeft + layout.fieldWidth;
		const side = PhaserLib.Math.Between(0, 3);
		const pressure = state.level + state.timeSurvived / 45;
		const elite =
			state.level >= 5 && Math.random() < clamp(0.04 + pressure * 0.008, 0.04, 0.22);
		const radius = elite ? PhaserLib.Math.Between(18, 22) : PhaserLib.Math.Between(12, 16);
		const margin = 54;
		let x = 0;
		let y = 0;

		if (side === 0) {
			x = cameraLeft - margin;
			y = PhaserLib.Math.Between(radius, state.worldHeight - radius);
		} else if (side === 1) {
			x = cameraRight + margin;
			y = PhaserLib.Math.Between(radius, state.worldHeight - radius);
		} else if (side === 2) {
			x = PhaserLib.Math.Between(cameraLeft - margin / 2, cameraRight + margin / 2);
			y = -margin;
		} else {
			x = PhaserLib.Math.Between(cameraLeft - margin / 2, cameraRight + margin / 2);
			y = state.worldHeight + margin;
		}

		const maxHp =
			state.overdriveUntil > state.timeSurvived
				? 1
				: Math.round(
						(elite ? 5 : 1.6) +
							(radius - (elite ? 18 : 12)) * (elite ? 0.8 : 0.6) +
							pressure * (elite ? 0.58 : 0.24) +
							PhaserLib.Math.FloatBetween(0, elite ? 1.8 : 1.1),
					);
		const colorTier = Math.min(
			Math.floor(pressure / 4),
			(elite ? ENEMY_ELITE_COLORS : ENEMY_NORMAL_COLORS).length - 1,
		);
		const color = (elite ? ENEMY_ELITE_COLORS : ENEMY_NORMAL_COLORS)[colorTier];

		state.enemies.push({
			id: nextEnemyId++,
			x: clamp(x, -80, state.worldWidth + 80),
			y,
			radius,
			speed:
				(elite ? 74 : 82) +
				pressure * (elite ? 1.7 : 1.2) +
				PhaserLib.Math.FloatBetween(-4, 8),
			hp: maxHp,
			maxHp,
			color,
			elite,
			flashTimer: 0,
			auraTickTimer: 0,
			trailTickTimer: 0,
			orbitalHitTimer: 0,
		});
	};

	const recycleEnemyIfLagging = (enemy: Enemy, scene: PhaserScene) => {
		const layout = getLayout(scene);
		const cameraLeft = state.cameraX;
		const cameraRight = cameraLeft + layout.fieldWidth;
		const recycleDistance = layout.fieldWidth * 0.72;
		const leadSideIsRight = state.lastHorizontalDirection >= 0;

		if (enemy.x < cameraLeft - recycleDistance && leadSideIsRight) {
			enemy.x = Math.min(state.worldWidth + 48, cameraRight + PhaserLib.Math.Between(36, 88));
			enemy.y = clamp(
				state.player.y + PhaserLib.Math.Between(-layout.fieldHeight * 0.35, layout.fieldHeight * 0.35),
				-enemy.radius * 2,
				state.worldHeight + enemy.radius * 2,
			);
		} else if (enemy.x > cameraRight + recycleDistance && !leadSideIsRight) {
			enemy.x = Math.max(-48, cameraLeft - PhaserLib.Math.Between(36, 88));
			enemy.y = clamp(
				state.player.y + PhaserLib.Math.Between(-layout.fieldHeight * 0.35, layout.fieldHeight * 0.35),
				-enemy.radius * 2,
				state.worldHeight + enemy.radius * 2,
			);
		} else if (enemy.x < cameraLeft - layout.fieldWidth * 1.45) {
			enemy.x = Math.min(state.worldWidth + 48, cameraRight + PhaserLib.Math.Between(36, 88));
		} else if (enemy.x > cameraRight + layout.fieldWidth * 1.45) {
			enemy.x = Math.max(-48, cameraLeft - PhaserLib.Math.Between(36, 88));
		}
	};

	const fireBurst = (enemyIndices?: number[]) => {
		if (state.enemies.length === 0) return;

		const target = findClosestEnemy(enemyIndices);

		if (!target) return;

		const projectileCount = getProjectileCount(state);
		const baseAngle = Math.atan2(target.y - state.player.y, target.x - state.player.x);
		const spreadStep = PhaserLib.Math.DegToRad(projectileCount >= 5 ? 8 : 12);
		const startAngle = baseAngle - (spreadStep * (projectileCount - 1)) / 2;

		for (let index = 0; index < projectileCount; index += 1) {
			const angle = startAngle + spreadStep * index;
			const muzzleOffset = state.player.radius + 8;
			const muzzleX = state.player.x + Math.cos(angle) * muzzleOffset;
			const muzzleY = state.player.y + Math.sin(angle) * muzzleOffset;
			state.bullets.push({
				x: muzzleX,
				y: muzzleY,
				vx: Math.cos(angle) * 560,
				vy: Math.sin(angle) * 560,
				radius: 4,
				damage: state.player.damage,
				life: 1.6,
				extraHitsRemaining: state.abilities.pierce,
				ricochetsRemaining: getRicochetCount(state),
				hitEnemyIds: [],
			});
			emitParticles(muzzleX, muzzleY, 0x7dd3fc, 2, {
				speedMin: 10,
				speedMax: 34,
				radiusMin: 1,
				radiusMax: 2.1,
				ttlMin: 0.08,
				ttlMax: 0.16,
				alpha: 0.75,
			});
		}
	};

	const updateDamageLabels = (dt: number, scene: PhaserScene) => {
		const layout = getLayout(scene);
		for (let index = state.damageTexts.length - 1; index >= 0; index -= 1) {
			const entry = state.damageTexts[index];
			entry.ttl -= dt;
			entry.y -= entry.velocityY * dt;
			const alpha = clamp(entry.ttl / Math.max(entry.maxTtl, 0.01), 0, 1);
			const screenX = worldToScreenX(entry.x, layout);
			const screenY = worldToScreenY(entry.y, layout);
			const visible =
				alpha > 0 &&
				screenX >= layout.fieldX - 24 &&
				screenX <= layout.fieldX + layout.fieldWidth + 24 &&
				screenY >= layout.fieldY - 24 &&
				screenY <= layout.fieldY + layout.fieldHeight + 24;
			entry.label.setVisible(visible);
			if (visible) entry.label.setPosition(screenX, screenY).setAlpha(alpha);
			if (entry.ttl <= 0) {
				entry.label.destroy();
				state.damageTexts.splice(index, 1);
			}
		}
	};

	const updateHud = (scene: PhaserScene) => {
		const xpRatio = clamp(state.xp / Math.max(state.nextLevelXp, 1), 0, 1);
		const showHud = state.phase === "playing" || state.phase === "paused";
		const hiddenPerkKeys: AbilityKey[] = ["critChance", "critDamage", "dodge", "magnet"];
		const activePerks = (Object.keys(ABILITY_LABELS) as AbilityKey[])
			.filter((key) => state.abilities[key] > 0 && !hiddenPerkKeys.includes(key))
			.map((key) => `${ABILITY_LABELS[key]} Lv.${state.abilities[key]}`);

		xpTitleText?.setText(`LEVEL ${state.level}   XP ${state.xp}/${state.nextLevelXp}`);
		xpMetaText?.setText(`${Math.round(xpRatio * 100)}% NEXT`);

		statsText?.setText(
			[
				`TIME   ${formatTime(state.timeSurvived)}`,
				`KILLS  ${formatCompact(state.kills)}`,
				`DAMAGE ${formatCompact(Math.round(state.totalDamage))}`,
			].join("\n"),
		);

		abilityText?.setText(
			[
				"TRAITS",
				`Damage      ${state.player.damage}`,
				`Speed       ${Math.round(state.player.speed)}`,
				`Crit Chance ${formatPercent(getCritChance(state))}`,
				`Crit Damage x${getCritDamageMultiplier(state).toFixed(1)}`,
				`Volley      ${getVolleyCount(state)}x${getProjectileCount(state)}`,
				`Dodge       ${formatPercent(getDodgeChance(state))}`,
				`Magnet      ${Math.round(getMagnetRadius(state))}`,
				"",
				"PERKS",
				...(activePerks.length > 0 ? activePerks : ["None yet"]),
			].join("\n"),
		);
		pauseButtonText
			?.setText(state.phase === "paused" ? "|| RESUME" : "|| PAUSE")
			.setVisible(showHud);

		statsText?.setVisible(showHud);
		abilityText?.setVisible(showHud);
		pauseButtonText?.setVisible(showHud);
		xpTitleText?.setVisible(showHud);
		xpMetaText?.setVisible(showHud);

		bannerText
			?.setText(state.bannerText)
			.setVisible(showHud)
			.setAlpha(showHud ? clamp(state.bannerTimer / 1.6, 0, 1) : 0);
		centerText?.setText(
			state.phase === "start"
				? [
						"Survival Shooter",
						"Move with WASD or arrows",
						"Auto-fire tracks the nearest enemy",
						"Press Space or Enter, or click to start",
					].join("\n")
				: state.phase === "paused"
					? [
							"Paused",
							`Survived ${formatTime(state.timeSurvived)}   Kills ${formatCompact(state.kills)}`,
							"Click Resume, press P, or press Space to continue",
						].join("\n")
				: state.phase === "gameOver"
				? [
						"Run terminated",
						`Survived ${formatTime(state.timeSurvived)}   Kills ${formatCompact(state.kills)}`,
						"Press Space, Enter, R, or click to restart",
					].join("\n")
				: state.overdriveUntil > state.timeSurvived
					? "OVERDRIVE"
					: "",
		);
		centerText?.setAlpha(
			state.phase === "playing"
				? state.overdriveUntil > state.timeSurvived
					? 0.82
					: 0
				: 1,
		);
		updateHudLayout(scene);
	};

	const drawPolygon = (
		target: PhaserGraphics,
		x: number,
		y: number,
		radius: number,
		sides: number,
		rotation: number,
		color: number,
		alpha = 1,
	) => {
		target.fillStyle(color, alpha);
		target.beginPath();
		for (let side = 0; side < sides; side += 1) {
			const angle = rotation + (TAU * side) / sides;
			const px = x + Math.cos(angle) * radius;
			const py = y + Math.sin(angle) * radius;
			if (side === 0) target.moveTo(px, py);
			else target.lineTo(px, py);
		}
		target.closePath();
		target.fillPath();
	};

	const tracePolygonPath = (
		target: PhaserGraphics,
		x: number,
		y: number,
		radius: number,
		sides: number,
		rotation: number,
	) => {
		target.beginPath();
		for (let side = 0; side < sides; side += 1) {
			const angle = rotation + (TAU * side) / sides;
			const px = x + Math.cos(angle) * radius;
			const py = y + Math.sin(angle) * radius;
			if (side === 0) target.moveTo(px, py);
			else target.lineTo(px, py);
		}
		target.closePath();
	};

	const drawOutlinedCircle = (
		target: PhaserGraphics,
		x: number,
		y: number,
		radius: number,
		color: number,
		alpha = 1,
		borderWidth = 2,
	) => {
		target.fillStyle(color, alpha);
		target.fillCircle(x, y, radius);
		target.lineStyle(borderWidth, dimColor(PhaserLib, color, 0.42), alpha * 0.95);
		target.strokeCircle(x, y, radius);
	};

	const drawOutlinedPolygon = (
		target: PhaserGraphics,
		x: number,
		y: number,
		radius: number,
		sides: number,
		rotation: number,
		color: number,
		alpha = 1,
		borderWidth = 2,
	) => {
		target.fillStyle(color, alpha);
		tracePolygonPath(target, x, y, radius, sides, rotation);
		target.fillPath();
		target.lineStyle(borderWidth, dimColor(PhaserLib, color, 0.42), alpha * 0.95);
		tracePolygonPath(target, x, y, radius, sides, rotation);
		target.strokePath();
	};

	const drawRhombus = (
		target: PhaserGraphics,
		x: number,
		y: number,
		widthRadius: number,
		heightRadius: number,
		rotation: number,
		color: number,
		alpha = 1,
		borderWidth = 2,
	) => {
		const points = [
			{ x: 0, y: -heightRadius },
			{ x: widthRadius, y: 0 },
			{ x: 0, y: heightRadius },
			{ x: -widthRadius, y: 0 },
		];
		target.fillStyle(color, alpha);
		target.beginPath();
		points.forEach((point, index) => {
			const px = x + point.x * Math.cos(rotation) - point.y * Math.sin(rotation);
			const py = y + point.x * Math.sin(rotation) + point.y * Math.cos(rotation);
			if (index === 0) target.moveTo(px, py);
			else target.lineTo(px, py);
		});
		target.closePath();
		target.fillPath();
		target.lineStyle(borderWidth, dimColor(PhaserLib, color, 0.42), alpha * 0.95);
		target.beginPath();
		points.forEach((point, index) => {
			const px = x + point.x * Math.cos(rotation) - point.y * Math.sin(rotation);
			const py = y + point.x * Math.sin(rotation) + point.y * Math.cos(rotation);
			if (index === 0) target.moveTo(px, py);
			else target.lineTo(px, py);
		});
		target.closePath();
		target.strokePath();
	};

	const drawMouth = (
		target: PhaserGraphics,
		x: number,
		y: number,
		width: number,
		overdriveActive: boolean,
		curveDirection: "up" | "down" = "up",
	) => {
		target.lineStyle(1.4, 0x020617, 0.9);
		target.beginPath();
		if (!overdriveActive) {
			target.moveTo(x - width, y);
			target.lineTo(x + width, y);
		} else {
			const samples = 5;
			for (let index = 0; index < samples; index += 1) {
				const t = index / (samples - 1);
				const px = x - width + width * 2 * t;
				const curve = Math.sin(t * Math.PI) * 3.5;
				const py = curveDirection === "down" ? y + curve : y - curve;
				if (index === 0) target.moveTo(px, py);
				else target.lineTo(px, py);
			}
		}
		target.strokePath();
	};

	const getOrbitalDiamonds = () => {
		const orbitalStats = getOrbitalStats(state);
		if (!orbitalStats) return [];
		return Array.from({ length: orbitalStats.diamonds }, (_, index) => {
			const angle =
				state.timeSurvived * orbitalStats.rotationSpeed +
				(TAU * index) / orbitalStats.diamonds;
			return {
				x: state.player.x + Math.cos(angle) * orbitalStats.radius,
				y: state.player.y + Math.sin(angle) * orbitalStats.radius,
				angle,
			};
		});
	};

	const drawHeart = (
		target: PhaserGraphics,
		x: number,
		y: number,
		size: number,
		filled: boolean,
	) => {
		const drawHeartShape = (scale: number, color: number, alpha: number) => {
			target.fillStyle(color, alpha);
			target.fillCircle(x - size * 0.25 * scale, y - size * 0.18 * scale, size * 0.28 * scale);
			target.fillCircle(x + size * 0.25 * scale, y - size * 0.18 * scale, size * 0.28 * scale);
			target.fillTriangle(
				x - size * 0.56 * scale,
				y - size * 0.02 * scale,
				x + size * 0.56 * scale,
				y - size * 0.02 * scale,
				x,
				y + size * 0.84 * scale,
			);
		};

		drawHeartShape(1, filled ? 0xfb7185 : 0x334155, 0.92);
		drawHeartShape(0.78, filled ? 0xf43f5e : 0x0f172a, 0.98);
	};

	const drawScene = (scene: PhaserScene) => {
		if (!graphics) return;

		const width = scene.scale.width;
		const height = scene.scale.height;
		const layout = getLayout(scene);
		const overdriveActive = state.overdriveUntil > state.timeSurvived;
		const pulse = Math.sin(state.timeSurvived * (overdriveActive ? 8 : 1.8)) * 0.5 + 0.5;
		const auraStats = getAuraStats(state);
		const auraPulse = 0.96 + Math.sin(state.timeSurvived * 2.6) * 0.05;
		const orbitalStats = getOrbitalStats(state);
		const orbitalDiamonds = getOrbitalDiamonds();
		const showHud = state.phase === "playing" || state.phase === "paused";

		graphics.clear();
		graphics.fillStyle(0x07111a, 1);
		graphics.fillRect(0, 0, width, height);

		graphics.fillStyle(0x03101c, 1);
		graphics.fillRoundedRect(layout.fieldX, layout.fieldY, layout.fieldWidth, layout.fieldHeight, 28);

		for (const blob of state.scenery) {
			const screenX = worldToScreenX(blob.x, layout);
			const screenY = worldToScreenY(blob.y, layout);
			if (
				screenX < layout.fieldX - blob.radius - 40 ||
				screenX > layout.fieldX + layout.fieldWidth + blob.radius + 40 ||
				screenY < layout.fieldY - blob.radius - 40 ||
				screenY > layout.fieldY + layout.fieldHeight + blob.radius + 40
			) {
				continue;
			}
			graphics.fillStyle(blob.color, blob.alpha);
			graphics.fillCircle(screenX, screenY, blob.radius);
		}

		graphics.lineStyle(2, overdriveActive ? 0xfb923c : 0x28506d, 0.92);
		graphics.strokeRoundedRect(layout.fieldX + 1, layout.fieldY + 1, layout.fieldWidth - 2, layout.fieldHeight - 2, 28);

		const gridSize = clamp(Math.round(Math.min(layout.fieldWidth, layout.fieldHeight) / 10), 28, 72);
		const worldGridStart = Math.floor(state.cameraX / gridSize) * gridSize;
		graphics.lineStyle(1, overdriveActive ? 0xf97316 : 0x224863, overdriveActive ? 0.18 : 0.22);
		for (let worldX = worldGridStart; worldX <= state.cameraX + layout.fieldWidth; worldX += gridSize) {
			const screenX = worldToScreenX(worldX, layout);
			graphics.beginPath();
			graphics.moveTo(screenX, layout.fieldY);
			graphics.lineTo(screenX, layout.fieldY + layout.fieldHeight);
			graphics.strokePath();
		}
		for (let y = 0; y <= state.worldHeight; y += gridSize) {
			const screenY = worldToScreenY(y, layout);
			graphics.beginPath();
			graphics.moveTo(layout.fieldX, screenY);
			graphics.lineTo(layout.fieldX + layout.fieldWidth, screenY);
			graphics.strokePath();
		}

		if (state.screenFlash > 0) {
			graphics.fillStyle(0xf97316, state.screenFlash * 0.16);
			graphics.fillRoundedRect(layout.fieldX, layout.fieldY, layout.fieldWidth, layout.fieldHeight, 28);
		}

		for (const cloud of state.trailClouds) {
			const screenX = worldToScreenX(cloud.x, layout);
			const screenY = worldToScreenY(cloud.y, layout);
			if (
				screenX < layout.fieldX - cloud.radius - 28 ||
				screenX > layout.fieldX + layout.fieldWidth + cloud.radius + 28 ||
				screenY < layout.fieldY - cloud.radius - 28 ||
				screenY > layout.fieldY + layout.fieldHeight + cloud.radius + 28
			) {
				continue;
			}
			const alpha = clamp(cloud.ttl / Math.max(cloud.maxTtl, 0.01), 0, 1);
			graphics.fillStyle(0x64748b, 0.1 * alpha);
			graphics.fillCircle(screenX, screenY, cloud.radius + 6);
			graphics.fillStyle(0x94a3b8, 0.18 * alpha);
			graphics.fillCircle(screenX, screenY, cloud.radius);
			graphics.lineStyle(1, 0xcbd5e1, 0.16 * alpha);
			graphics.strokeCircle(screenX, screenY, cloud.radius + pulse * 2);
		}

		for (const particle of state.particles) {
			const screenX = worldToScreenX(particle.x, layout);
			const screenY = worldToScreenY(particle.y, layout);
			if (
				screenX < layout.fieldX - 20 ||
				screenX > layout.fieldX + layout.fieldWidth + 20 ||
				screenY < layout.fieldY - 20 ||
				screenY > layout.fieldY + layout.fieldHeight + 20
			) {
				continue;
			}
			const alpha = clamp((particle.ttl / Math.max(particle.maxTtl, 0.01)) * particle.alpha, 0, 1);
			drawOutlinedCircle(
				graphics,
				screenX,
				screenY,
				particle.radius,
				particle.color,
				alpha,
				1,
			);
		}

		for (const orb of state.xpOrbs) {
			const screenX = worldToScreenX(orb.x, layout);
			const screenY = worldToScreenY(orb.y, layout);
			if (
				screenX < layout.fieldX - 20 ||
				screenX > layout.fieldX + layout.fieldWidth + 20 ||
				screenY < layout.fieldY - 20 ||
				screenY > layout.fieldY + layout.fieldHeight + 20
			) {
				continue;
			}
			drawOutlinedPolygon(
				graphics,
				screenX,
				screenY,
				orb.radius,
				XP_SHAPE_SIDES[orb.shape],
				state.timeSurvived * orb.spin,
				orb.color,
				0.95,
				1.5,
			);
			graphics.lineStyle(1, dimColor(PhaserLib, orb.color, 0.6), 0.28);
			graphics.strokeCircle(screenX, screenY, orb.radius + 3);
		}

		const bulletColor = 0x7dd3fc;
		for (const bullet of state.bullets) {
			const screenX = worldToScreenX(bullet.x, layout);
			const screenY = worldToScreenY(bullet.y, layout);
			if (
				screenX < layout.fieldX - 12 ||
				screenX > layout.fieldX + layout.fieldWidth + 12 ||
				screenY < layout.fieldY - 12 ||
				screenY > layout.fieldY + layout.fieldHeight + 12
			) {
				continue;
			}
			drawOutlinedCircle(graphics, screenX, screenY, bullet.radius, bulletColor, 0.96, 1.5);
		}

		for (const enemy of state.enemies) {
			const screenX = worldToScreenX(enemy.x, layout);
			const screenY = worldToScreenY(enemy.y, layout);
			if (
				screenX < layout.fieldX - enemy.radius - 16 ||
				screenX > layout.fieldX + layout.fieldWidth + enemy.radius + 16 ||
				screenY < layout.fieldY - enemy.radius - 16 ||
				screenY > layout.fieldY + layout.fieldHeight + enemy.radius + 16
			) {
				continue;
			}

			const enemyColor =
				enemy.flashTimer > 0 ? lightenColor(PhaserLib, enemy.color, 0.38) : enemy.color;
			drawOutlinedCircle(
				graphics,
				screenX,
				screenY,
				enemy.radius,
				enemyColor,
				1,
				2,
			);
			graphics.fillStyle(0x020617, 0.92);
			graphics.fillCircle(screenX - enemy.radius * 0.28, screenY - enemy.radius * 0.16, 1.8);
			graphics.fillCircle(screenX + enemy.radius * 0.28, screenY - enemy.radius * 0.16, 1.8);
			drawMouth(
				graphics,
				screenX,
				screenY + enemy.radius * 0.22,
				enemy.radius * 0.4,
				overdriveActive,
			);

			if (enemy.hp < enemy.maxHp) {
				const ratio = clamp(enemy.hp / enemy.maxHp, 0, 1);
				const healthWidth = enemy.radius * 2.2;
				const healthX = screenX - healthWidth / 2;
				const healthY = screenY - enemy.radius - 10;
				graphics.fillStyle(0x020617, 0.86);
				graphics.fillRoundedRect(healthX, healthY, healthWidth, 6, 3);
				graphics.fillStyle(ratio > 0.45 ? 0x4ade80 : 0xfb7185, 1);
				graphics.fillRoundedRect(healthX, healthY, healthWidth * ratio, 6, 3);
			}
		}

		const aimTarget = findClosestEnemy(getActiveEnemyIndices(scene));
		const aimAngle = aimTarget
			? Math.atan2(aimTarget.y - state.player.y, aimTarget.x - state.player.x)
			: -Math.PI / 2;
		const playerScreenX = worldToScreenX(state.player.x, layout);
		const playerScreenY = worldToScreenY(state.player.y, layout);

		if (auraStats) {
			const auraColor = 0xfef3a1;
			const auraRadius = auraStats.radius * auraPulse;
			graphics.fillStyle(auraColor, 0.08 + pulse * 0.04);
			graphics.fillCircle(playerScreenX, playerScreenY, auraRadius);
			graphics.lineStyle(2, dimColor(PhaserLib, auraColor, 0.36), 0.34);
			graphics.strokeCircle(playerScreenX, playerScreenY, auraRadius);
			const innerCircles = Math.min(4, Math.max(1, state.abilities.aura));
			for (let index = 1; index <= innerCircles; index += 1) {
				const ratio = index / (innerCircles + 1);
				graphics.lineStyle(1, dimColor(PhaserLib, auraColor, 0.46), 0.18 + ratio * 0.08);
				graphics.strokeCircle(playerScreenX, playerScreenY, auraRadius * ratio);
			}
		}

		if (orbitalStats) {
			graphics.lineStyle(2, dimColor(PhaserLib, bulletColor, 0.38), 0.34);
			graphics.strokeCircle(playerScreenX, playerScreenY, orbitalStats.radius);
			for (const diamond of orbitalDiamonds) {
				drawRhombus(
					graphics,
					worldToScreenX(diamond.x, layout),
					worldToScreenY(diamond.y, layout),
					6,
					9,
					diamond.angle,
					bulletColor,
					0.95,
					1.5,
				);
				graphics.lineStyle(1, dimColor(PhaserLib, bulletColor, 0.52), 0.34);
				graphics.strokeCircle(
					worldToScreenX(diamond.x, layout),
					worldToScreenY(diamond.y, layout),
					10,
				);
			}
		}

		const gunColor = 0x94a3b8;
		graphics.lineStyle(9, dimColor(PhaserLib, gunColor, 0.46), 0.98);
		graphics.beginPath();
		graphics.moveTo(playerScreenX, playerScreenY);
		graphics.lineTo(
			playerScreenX + Math.cos(aimAngle) * 22,
			playerScreenY + Math.sin(aimAngle) * 22,
		);
		graphics.strokePath();
		graphics.lineStyle(5, gunColor, 1);
		graphics.beginPath();
		graphics.moveTo(playerScreenX, playerScreenY);
		graphics.lineTo(
			playerScreenX + Math.cos(aimAngle) * 22,
			playerScreenY + Math.sin(aimAngle) * 22,
		);
		graphics.strokePath();

		const playerColor =
			state.player.invulnerabilityTimer > 0
				? overdriveActive
					? 0xfdba74
					: 0xf8fafc
				: 0xe2e8f0;
		drawOutlinedCircle(
			graphics,
			playerScreenX,
			playerScreenY,
			state.player.radius,
			playerColor,
			state.player.invulnerabilityTimer > 0 ? 0.9 : 1,
			2,
		);
		graphics.fillStyle(0x020617, 0.9);
			graphics.fillCircle(playerScreenX - 5, playerScreenY - 4, 2.1);
			graphics.fillCircle(playerScreenX + 5, playerScreenY - 4, 2.1);
			drawMouth(graphics, playerScreenX, playerScreenY + 4, 5, overdriveActive, "down");

		if (showHud) {
			const bar = getXpBarMetrics(layout);
			const fillWidth = Math.max(0, (bar.width - 6) * clamp(state.xp / state.nextLevelXp, 0, 1));
			graphics.fillStyle(0x020617, 0.94);
			graphics.fillRoundedRect(bar.x, bar.y, bar.width, bar.height, 10);
			graphics.lineStyle(1, 0x475569, 0.88);
			graphics.strokeRoundedRect(bar.x, bar.y, bar.width, bar.height, 10);
			graphics.fillStyle(overdriveActive ? 0xf97316 : 0x22c55e, 1);
			if (fillWidth > 0) {
				if (fillWidth < 12) {
					graphics.fillRect(bar.x + 3, bar.y + 3, fillWidth, bar.height - 6);
				} else {
					graphics.fillRoundedRect(bar.x + 3, bar.y + 3, fillWidth, bar.height - 6, 6);
				}
			}

			for (let index = 0; index < state.player.maxLives; index += 1) {
				drawHeart(
					graphics,
					layout.fieldX + 178 + index * 22,
					layout.fieldY + 28,
					16,
					index < state.player.lives,
				);
			}
		}

		if (state.phase !== "playing" && state.phase !== "paused") {
			graphics.fillStyle(0x020617, 0.82);
			graphics.fillRoundedRect(layout.fieldX, layout.fieldY, layout.fieldWidth, layout.fieldHeight, 28);
		}

		if (state.phase === "paused") {
			graphics.fillStyle(0x020617, 0.62);
			graphics.fillRoundedRect(layout.fieldX, layout.fieldY, layout.fieldWidth, layout.fieldHeight, 28);
		}

		if (state.phase !== "playing") {
			const overlayWidth = layout.fieldWidth * 0.72;
			const overlayHeight = layout.fieldHeight * 0.42;
			const overlayX = layout.fieldX + (layout.fieldWidth - overlayWidth) / 2;
			const overlayY = layout.fieldY + (layout.fieldHeight - overlayHeight) / 2;
			graphics.fillStyle(0x081320, 0.86);
			graphics.fillRoundedRect(
				overlayX,
				overlayY,
				overlayWidth,
				overlayHeight,
				24,
			);
			graphics.lineStyle(1, 0x3b82f6, 0.22);
			graphics.strokeRoundedRect(
				overlayX,
				overlayY,
				overlayWidth,
				overlayHeight,
				24,
			);
		}
	};

	const updateGame = (scene: PhaserScene, dt: number) => {
		const frameDt = Math.min(dt, 0.05);
		state.player.invulnerabilityTimer = Math.max(0, state.player.invulnerabilityTimer - frameDt);
		state.screenFlash = Math.max(0, state.screenFlash - frameDt * 1.8);
		state.bannerTimer = Math.max(0, state.bannerTimer - frameDt);

		const spacePressed = Boolean(
			keys?.SPACE && PhaserLib.Input.Keyboard.JustDown(keys.SPACE),
		);
		const actionPressed = Boolean(
			spacePressed || (keys?.ENTER && PhaserLib.Input.Keyboard.JustDown(keys.ENTER)),
		);
		const restartPressed = Boolean(keys?.R && PhaserLib.Input.Keyboard.JustDown(keys.R));
		const pausePressed = Boolean(
			(keys?.P && PhaserLib.Input.Keyboard.JustDown(keys.P)) || spacePressed,
		);

		updateDamageLabels(frameDt, scene);

		if (state.phase === "start") {
			if (actionPressed || restartRequested) beginRun(scene);
			updateHud(scene);
			drawScene(scene);
			return;
		}

		if (state.phase === "gameOver") {
			if (actionPressed || restartPressed || restartRequested) {
				resetGame(scene);
				beginRun(scene);
			}
			updateHud(scene);
			drawScene(scene);
			return;
		}

		if (state.phase === "paused") {
			if (pausePressed || restartRequested) {
				togglePause(scene);
			}
			updateHud(scene);
			drawScene(scene);
			return;
		}

		if (pausePressed) {
			togglePause(scene);
			updateHud(scene);
			drawScene(scene);
			return;
		}

		if (restartPressed) {
			resetGame(scene);
			beginRun(scene);
			return;
		}

		const moveX =
			(cursors?.left.isDown || keys?.A.isDown ? -1 : 0) +
			(cursors?.right.isDown || keys?.D.isDown ? 1 : 0);
		const moveY =
			(cursors?.up.isDown || keys?.W.isDown ? -1 : 0) +
			(cursors?.down.isDown || keys?.S.isDown ? 1 : 0);
		const moveLength = Math.hypot(moveX, moveY) || 1;

		if (moveX > 0) state.lastHorizontalDirection = 1;
		if (moveX < 0) state.lastHorizontalDirection = -1;

		state.player.x = clamp(
			state.player.x + (moveX / moveLength) * state.player.speed * frameDt,
			state.player.radius,
			state.worldWidth - state.player.radius,
		);
		state.player.y = clamp(
			state.player.y + (moveY / moveLength) * state.player.speed * frameDt,
			state.player.radius,
			state.worldHeight - state.player.radius,
		);
		syncCamera(scene);
		state.timeSurvived += frameDt;

		const trailStats = getPoisonTrailStats(state);
		if (trailStats && (moveX !== 0 || moveY !== 0)) {
			state.trailSpawnTimer -= frameDt;
			if (state.trailSpawnTimer <= 0) {
				state.trailClouds.push({
					x: state.player.x - (moveX / moveLength) * state.player.radius * 0.9,
					y: state.player.y - (moveY / moveLength) * state.player.radius * 0.9,
					radius: trailStats.radius,
					ttl: trailStats.duration,
					maxTtl: trailStats.duration,
					damage: trailStats.damage,
					spin: PhaserLib.Math.FloatBetween(-1.1, 1.1),
				});
				state.trailSpawnTimer = trailStats.spawnInterval;
			}
		} else if (!trailStats) {
			state.trailSpawnTimer = 0;
		}

		for (let index = state.trailClouds.length - 1; index >= 0; index -= 1) {
			const cloud = state.trailClouds[index];
			cloud.ttl -= frameDt;
			cloud.radius += frameDt * 2;
			if (cloud.ttl <= 0) {
				state.trailClouds.splice(index, 1);
			}
		}

		for (let index = state.particles.length - 1; index >= 0; index -= 1) {
			const particle = state.particles[index];
			particle.ttl -= frameDt;
			particle.x += particle.vx * frameDt;
			particle.y += particle.vy * frameDt;
			particle.vx *= 0.96;
			particle.vy *= 0.96;
			if (particle.shrink) particle.radius = Math.max(0.3, particle.radius - frameDt * 3.4);
			if (particle.ttl <= 0) {
				state.particles.splice(index, 1);
			}
		}

		if (
			state.overdriveUntil <= state.timeSurvived &&
			state.timeSurvived >= state.overdriveCooldownUntil &&
			state.kills >= state.nextOverdriveKillMilestone
		) {
			triggerOverdrive();
		}

		state.spawnTimer -= frameDt;
		if (state.spawnTimer <= 0) {
			const intensity = 1 + Math.floor(state.level / 8) + Math.floor(state.timeSurvived / 75);
			const enemiesPerWave = clamp(
				1 + Math.floor(Math.max(0, intensity - state.enemies.length / 8)),
				1,
				4,
			);
			for (let index = 0; index < enemiesPerWave; index += 1) {
				createEnemy(scene);
			}
			state.spawnTimer = clamp(
				1.35 - state.level * 0.018 - Math.min(state.timeSurvived, 240) * 0.0018,
				0.24,
				1.35,
			);
		}

		const activeEnemyIndices = getActiveEnemyIndices(scene);

		state.player.shotTimer -= frameDt;
		if (state.player.shotTimer <= 0 && activeEnemyIndices.length > 0) {
			const volleyCount = getVolleyCount(state);
			for (let index = 0; index < volleyCount; index += 1) {
				state.pendingBursts.push({ delay: index * 0.085 });
			}
			state.player.shotTimer = getShotCooldownSeconds(state);
		}

		for (let index = state.pendingBursts.length - 1; index >= 0; index -= 1) {
			state.pendingBursts[index].delay -= frameDt;
			if (state.pendingBursts[index].delay <= 0) {
				fireBurst(activeEnemyIndices);
				state.pendingBursts.splice(index, 1);
			}
		}

		const novaBurstStats = getNovaBurstStats(state);
		if (novaBurstStats) {
			state.novaTimer -= frameDt;
			if (state.novaTimer <= 0) {
				for (let index = 0; index < novaBurstStats.projectiles; index += 1) {
					const angle = (TAU * index) / novaBurstStats.projectiles;
					state.bullets.push({
						x: state.player.x + Math.cos(angle) * (state.player.radius + 6),
						y: state.player.y + Math.sin(angle) * (state.player.radius + 6),
						vx: Math.cos(angle) * 420,
						vy: Math.sin(angle) * 420,
						radius: 3.6,
						damage: novaBurstStats.damage,
						life: novaBurstStats.life,
						extraHitsRemaining: 0,
						ricochetsRemaining: 0,
						hitEnemyIds: [],
					});
				}
				emitParticles(state.player.x, state.player.y, 0xc084fc, 10, {
					speedMin: 18,
					speedMax: 56,
					radiusMin: 1,
					radiusMax: 2.8,
					ttlMin: 0.1,
					ttlMax: 0.22,
					alpha: 0.75,
				});
				state.novaTimer = novaBurstStats.cooldown;
			}
		} else {
			state.novaTimer = 0;
		}

		for (let bulletIndex = state.bullets.length - 1; bulletIndex >= 0; bulletIndex -= 1) {
			const bullet = state.bullets[bulletIndex];
			bullet.x += bullet.vx * frameDt;
			bullet.y += bullet.vy * frameDt;
			bullet.life -= frameDt;

			const removeBullet =
				bullet.life <= 0 ||
				bullet.x < -240 ||
				bullet.x > state.worldWidth + 240 ||
				bullet.y < -180 ||
				bullet.y > state.worldHeight + 180;

			if (removeBullet) {
				emitParticles(bullet.x, bullet.y, 0x7dd3fc, 2, {
					speedMin: 12,
					speedMax: 30,
					radiusMin: 0.8,
					radiusMax: 1.8,
					ttlMin: 0.06,
					ttlMax: 0.14,
					alpha: 0.45,
				});
				state.bullets.splice(bulletIndex, 1);
			}
		}

		for (const enemyIndex of activeEnemyIndices) {
			const enemy = state.enemies[enemyIndex];
			if (!enemy) continue;
			enemy.flashTimer = Math.max(0, enemy.flashTimer - frameDt);
			enemy.auraTickTimer = Math.max(0, enemy.auraTickTimer - frameDt);
			enemy.trailTickTimer = Math.max(0, enemy.trailTickTimer - frameDt);
			enemy.orbitalHitTimer = Math.max(0, enemy.orbitalHitTimer - frameDt);
			const angle = Math.atan2(state.player.y - enemy.y, state.player.x - enemy.x);
			enemy.x += Math.cos(angle) * enemy.speed * frameDt;
			enemy.y += Math.sin(angle) * enemy.speed * frameDt;
			recycleEnemyIfLagging(enemy, scene);
		}

		let enemyGrid = buildEnemyGrid(activeEnemyIndices);
		for (const enemyIndex of activeEnemyIndices) {
			const enemy = state.enemies[enemyIndex];
			if (!enemy) continue;
			const nearbyEnemyIndices: number[] = [];
			collectNearbyEnemyIndices(enemyGrid, enemy.x, enemy.y, nearbyEnemyIndices);
			for (const otherIndex of nearbyEnemyIndices) {
				if (otherIndex <= enemyIndex) continue;
				const other = state.enemies[otherIndex];
				if (!other) continue;
				const dx = other.x - enemy.x;
				const dy = other.y - enemy.y;
				const minDistance = enemy.radius + other.radius + 4;
				const distanceSq = dx * dx + dy * dy;
				if (distanceSq <= 0.0001 || distanceSq >= minDistance * minDistance) continue;
				const distance = Math.sqrt(distanceSq);
				const overlap = minDistance - distance;
				const nx = dx / distance;
				const ny = dy / distance;
				const push = overlap * 0.5;
				enemy.x -= nx * push;
				enemy.y -= ny * push;
				other.x += nx * push;
				other.y += ny * push;
			}
		}

		for (const enemyIndex of activeEnemyIndices) {
			const enemy = state.enemies[enemyIndex];
			if (!enemy) continue;
			enemy.x = clamp(enemy.x, -80, state.worldWidth + 80);
			enemy.y = clamp(enemy.y, -80, state.worldHeight + 80);
		}

		enemyGrid = buildEnemyGrid(activeEnemyIndices);
		const defeatedEnemyIds = new Set<number>();
		const shrapnelBursts: Array<{
			x: number;
			y: number;
			damage: number;
			radius: number;
			color: number;
		}> = [];
		const shrapnelStats = getShrapnelStats(state);
		const thornsStats = getThornsStats(state);
		const getDamageTint = (
			enemy: Enemy,
			damageAmount: number,
			enemyHpBeforeHit: number,
			crit: boolean,
		) => {
			if (crit) return blendColors(0x93c5fd, 0xe0f2fe, 0.45);
			const impact = clamp(
				damageAmount / Math.max(enemyHpBeforeHit, Math.max(1, enemy.maxHp * 0.55)),
				0,
				1,
			);
			return impact < 0.45
				? blendColors(0xffffff, 0xfacc15, impact / 0.45)
				: blendColors(0xfacc15, 0xef4444, (impact - 0.45) / 0.55);
		};
		const defeatEnemy = (enemy: Enemy) => {
			if (defeatedEnemyIds.has(enemy.id)) return;
			defeatedEnemyIds.add(enemy.id);
			emitParticles(enemy.x, enemy.y, enemy.color, enemy.elite ? 14 : 10, {
				speedMin: 28,
				speedMax: enemy.elite ? 118 : 92,
				radiusMin: 1.4,
				radiusMax: enemy.elite ? 4.6 : 3.8,
				ttlMin: 0.18,
				ttlMax: enemy.elite ? 0.46 : 0.34,
				alpha: 0.9,
			});
			spawnXp(enemy.x, enemy.y, enemy.elite);
			state.kills += 1;
			if (shrapnelStats) {
				shrapnelBursts.push({
					x: enemy.x,
					y: enemy.y,
					damage: shrapnelStats.damage,
					radius: shrapnelStats.radius,
					color: enemy.color,
				});
			}
		};
		const applyEnemyDamage = (
			enemy: Enemy,
			damageAmount: number,
			floatingText?: {
				text: string;
				tint: number;
				size?: number;
				ttl?: number;
				velocityY?: number;
			},
		) => {
			if (enemy.hp <= 0 || defeatedEnemyIds.has(enemy.id)) return;
			const roundedDamage = Math.max(1, Math.round(damageAmount));
			const damageDone = Math.min(enemy.hp, roundedDamage);
			enemy.hp -= roundedDamage;
			enemy.flashTimer = 0.08;
			state.totalDamage += damageDone;
			if (floatingText) {
				addCombatText(
					scene,
					enemy.x,
					enemy.y - enemy.radius * 0.3,
					floatingText.text,
					floatingText.tint,
					floatingText.size,
					floatingText.ttl,
					floatingText.velocityY,
				);
			}
			emitParticles(enemy.x, enemy.y, floatingText?.tint ?? enemy.color, 3, {
				speedMin: 14,
				speedMax: 44,
				radiusMin: 1,
				radiusMax: 2.4,
				ttlMin: 0.08,
				ttlMax: 0.18,
				alpha: 0.72,
			});
			if (enemy.hp <= 0) {
				defeatEnemy(enemy);
			}
		};
		const findRicochetTarget = (sourceEnemy: Enemy, hitEnemyIds: number[]) => {
			let closestEnemy: Enemy | null = null;
			let closestDistance = 260 * 260;
			for (const enemy of state.enemies) {
				if (
					enemy.id === sourceEnemy.id ||
					enemy.hp <= 0 ||
					defeatedEnemyIds.has(enemy.id) ||
					hitEnemyIds.includes(enemy.id)
				) {
					continue;
				}
				const dx = enemy.x - sourceEnemy.x;
				const dy = enemy.y - sourceEnemy.y;
				const distance = dx * dx + dy * dy;
				if (distance < closestDistance) {
					closestDistance = distance;
					closestEnemy = enemy;
				}
			}
			return closestEnemy;
		};
		const auraStats = getAuraStats(state);
		if (auraStats) {
			for (const enemyIndex of activeEnemyIndices) {
				const enemy = state.enemies[enemyIndex];
				if (
					!enemy ||
					enemy.auraTickTimer > 0 ||
					defeatedEnemyIds.has(enemy.id) ||
					!circleHit(
						state.player.x,
						state.player.y,
						auraStats.radius,
						enemy.x,
						enemy.y,
						enemy.radius,
					)
				) {
					continue;
				}
				applyEnemyDamage(enemy, auraStats.damage);
				enemy.auraTickTimer = auraStats.tickInterval;
			}
		}
		const orbitalStats = getOrbitalStats(state);
		const orbitalDiamonds = orbitalStats ? getOrbitalDiamonds() : [];
		if (orbitalStats) {
			for (const enemyIndex of activeEnemyIndices) {
				const enemy = state.enemies[enemyIndex];
				if (!enemy || enemy.orbitalHitTimer > 0 || defeatedEnemyIds.has(enemy.id)) continue;
				for (const diamond of orbitalDiamonds) {
					if (!circleHit(diamond.x, diamond.y, 8, enemy.x, enemy.y, enemy.radius)) continue;
					applyEnemyDamage(enemy, orbitalStats.damage);
					enemy.orbitalHitTimer = orbitalStats.hitCooldown;
					break;
				}
			}
		}
		if (state.trailClouds.length > 0) {
			for (const enemyIndex of activeEnemyIndices) {
				const enemy = state.enemies[enemyIndex];
				if (!enemy || enemy.trailTickTimer > 0 || defeatedEnemyIds.has(enemy.id)) continue;
				for (const cloud of state.trailClouds) {
					if (!circleHit(cloud.x, cloud.y, cloud.radius, enemy.x, enemy.y, enemy.radius)) continue;
					applyEnemyDamage(enemy, cloud.damage);
					enemy.trailTickTimer = 0.34;
					break;
				}
			}
		}

		while (shrapnelBursts.length > 0) {
			const burst = shrapnelBursts.shift();
			if (!burst) break;
			emitParticles(burst.x, burst.y, burst.color, 8, {
				speedMin: 26,
				speedMax: 86,
				radiusMin: 1.2,
				radiusMax: 3.2,
				ttlMin: 0.12,
				ttlMax: 0.28,
				alpha: 0.8,
			});
			for (const enemy of state.enemies) {
				if (enemy.hp <= 0 || defeatedEnemyIds.has(enemy.id)) continue;
				if (!circleHit(burst.x, burst.y, burst.radius, enemy.x, enemy.y, enemy.radius)) continue;
				applyEnemyDamage(enemy, burst.damage);
			}
		}

		for (let bulletIndex = state.bullets.length - 1; bulletIndex >= 0; bulletIndex -= 1) {
			const bullet = state.bullets[bulletIndex];
			let removeBullet = false;
			const nearbyEnemyIndices: number[] = [];
			collectNearbyEnemyIndices(enemyGrid, bullet.x, bullet.y, nearbyEnemyIndices);

			for (const enemyIndex of nearbyEnemyIndices) {
				if (removeBullet) break;
				const enemy = state.enemies[enemyIndex];
				if (!enemy || enemy.hp <= 0 || defeatedEnemyIds.has(enemy.id)) continue;
				if (bullet.hitEnemyIds.includes(enemy.id)) continue;
				if (!circleHit(bullet.x, bullet.y, bullet.radius, enemy.x, enemy.y, enemy.radius)) continue;

				bullet.hitEnemyIds.push(enemy.id);
				const crit = Math.random() < getCritChance(state);
				const damage = bullet.damage * (crit ? getCritDamageMultiplier(state) : 1);
				const roundedDamage = Math.max(1, Math.round(damage));
				const damageTint = getDamageTint(enemy, roundedDamage, enemy.hp, crit);
				applyEnemyDamage(enemy, damage, {
					text: crit ? `${roundedDamage}!` : `${roundedDamage}`,
					tint: damageTint,
				});

				if (bullet.extraHitsRemaining > 0) {
					bullet.extraHitsRemaining -= 1;
				} else if (bullet.ricochetsRemaining > 0) {
					const nextTarget = findRicochetTarget(enemy, bullet.hitEnemyIds);
					if (nextTarget) {
						bullet.ricochetsRemaining -= 1;
						bullet.x = enemy.x;
						bullet.y = enemy.y;
						const angle = Math.atan2(nextTarget.y - enemy.y, nextTarget.x - enemy.x);
						bullet.vx = Math.cos(angle) * 560;
						bullet.vy = Math.sin(angle) * 560;
						bullet.life = Math.max(bullet.life, 0.35);
					} else {
						removeBullet = true;
					}
				} else {
					removeBullet = true;
				}
			}

			if (removeBullet) {
				state.bullets.splice(bulletIndex, 1);
			}
		}

		if (defeatedEnemyIds.size > 0) {
			state.enemies = state.enemies.filter((enemy) => !defeatedEnemyIds.has(enemy.id));
		}

		const collisionEnemyIndices = getActiveEnemyIndices(scene);
		for (let activeIndex = collisionEnemyIndices.length - 1; activeIndex >= 0; activeIndex -= 1) {
			const enemyIndex = collisionEnemyIndices[activeIndex];
			const enemy = state.enemies[enemyIndex];
			if (
				enemy &&
				state.player.invulnerabilityTimer <= 0 &&
				circleHit(state.player.x, state.player.y, state.player.radius, enemy.x, enemy.y, enemy.radius)
			) {
				if (Math.random() < getDodgeChance(state)) {
					state.player.invulnerabilityTimer = 0.35;
					state.screenFlash = Math.max(state.screenFlash, 0.18);
					addCombatText(
						scene,
						state.player.x,
						state.player.y - state.player.radius - 10,
						"DODGE",
						0x93c5fd,
						13,
						0.38,
						28,
					);
					const pushAngle = Math.atan2(enemy.y - state.player.y, enemy.x - state.player.x);
					enemy.x += Math.cos(pushAngle) * 34;
					enemy.y += Math.sin(pushAngle) * 34;
					if (thornsStats) {
						for (const otherEnemy of state.enemies) {
							if (
								otherEnemy.hp <= 0 ||
								defeatedEnemyIds.has(otherEnemy.id) ||
								!circleHit(
									state.player.x,
									state.player.y,
									thornsStats.radius,
									otherEnemy.x,
									otherEnemy.y,
									otherEnemy.radius,
								)
							) {
								continue;
							}
							applyEnemyDamage(otherEnemy, thornsStats.damage);
						}
					}
					continue;
				}
				state.player.lives -= 1;
				state.player.invulnerabilityTimer = 1;
				state.screenFlash = 0.9;
				emitParticles(state.player.x, state.player.y, 0xf8fafc, 12, {
					speedMin: 24,
					speedMax: 100,
					radiusMin: 1.2,
					radiusMax: 4,
					ttlMin: 0.14,
					ttlMax: 0.32,
					alpha: 0.85,
				});
				emitParticles(state.player.x, state.player.y, enemy.color, 6, {
					speedMin: 18,
					speedMax: 82,
					radiusMin: 1,
					radiusMax: 3,
					ttlMin: 0.1,
					ttlMax: 0.26,
					alpha: 0.8,
				});
				if (thornsStats) {
					for (const otherEnemy of state.enemies) {
						if (
							otherEnemy.hp <= 0 ||
							defeatedEnemyIds.has(otherEnemy.id) ||
							!circleHit(
								state.player.x,
								state.player.y,
								thornsStats.radius,
								otherEnemy.x,
								otherEnemy.y,
								otherEnemy.radius,
							)
						) {
							continue;
						}
						applyEnemyDamage(otherEnemy, thornsStats.damage);
					}
				}
				state.enemies.splice(enemyIndex, 1);
				if (state.player.lives <= 0) {
					state.player.lives = 0;
					state.phase = "gameOver";
					state.bannerTimer = 0;
					break;
				}
			}
		}

		for (let index = state.xpOrbs.length - 1; index >= 0; index -= 1) {
			const orb = state.xpOrbs[index];
			const dx = state.player.x - orb.x;
			const dy = state.player.y - orb.y;
			const distance = Math.hypot(dx, dy) || 1;
			const magnetRadius = getMagnetRadius(state);
			if (distance < magnetRadius) {
				const pullSpeed = 140 + (magnetRadius - distance) * 2.2;
				orb.x += (dx / distance) * pullSpeed * frameDt;
				orb.y += (dy / distance) * pullSpeed * frameDt;
			}
			if (distance <= state.player.radius + orb.radius + 4) {
				state.xp += orb.value;
				state.xpOrbs.splice(index, 1);
			}
		}

		levelUpIfNeeded();
		updateHud(scene);
		drawScene(scene);
	};

	class SurvivalShooterScene extends PhaserLib.Scene {
		constructor() {
			super("survival-shooter-phaser");
		}

		create() {
			sceneRef = this;
			graphics = this.add.graphics();
			graphics.setDepth(0);

			statsText = this.add.text(0, 0, "", createTextStyle(14, "left"));
			abilityText = this.add.text(0, 0, "", createTextStyle(14, "right"));
			pauseButtonText = this.add.text(0, 0, "PAUSE", createTextStyle(13, "center"));
			xpTitleText = this.add.text(0, 0, "", createTextStyle(14, "left"));
			xpMetaText = this.add.text(0, 0, "", createTextStyle(13, "right"));
			bannerText = this.add.text(0, 0, "", createTextStyle(14, "center"));
			centerText = this.add.text(0, 0, "", createTextStyle(22, "center"));

			xpTitleText.setTint(0xf8fafc);
			xpMetaText.setTint(0x94a3b8);
			bannerText.setTint(0xf8fafc);
			centerText.setTint(0xf8fafc);
			statsText.setDepth(24).setStroke("#020617", 4);
			abilityText.setDepth(24).setStroke("#020617", 4);
			xpTitleText.setDepth(24).setStroke("#020617", 4);
			xpMetaText.setDepth(24).setStroke("#020617", 4);
			bannerText.setDepth(25).setStroke("#020617", 4);
			centerText.setDepth(26).setStroke("#020617", 5);
			centerText.setLineSpacing(12);
			pauseButtonText
				.setTint(0xe2e8f0)
				.setDepth(25)
				.setStroke("#020617", 4);

			const keyboard = this.input.keyboard;
			if (keyboard) {
				cursors = keyboard.createCursorKeys();
				keys = keyboard.addKeys("W,A,S,D,R,SPACE,ENTER,P") as KeyMap;
			}

			this.input.on("pointerdown", (pointer: { x: number; y: number }) => {
				const pauseBounds = getPauseButtonBounds();
				if (
					pauseBounds &&
					state.phase !== "start" &&
					state.phase !== "gameOver" &&
					pointer.x >= pauseBounds.x &&
					pointer.x <= pauseBounds.x + pauseBounds.width &&
					pointer.y >= pauseBounds.y &&
					pointer.y <= pauseBounds.y + pauseBounds.height
				) {
					togglePause(this);
					return;
				}

				if (state.phase !== "playing") restartRequested = true;
			});

			this.scale.on("resize", () => {
				resizeWorldState(this);
				updateHudLayout(this);
			});

			resetGame(this);
			updateHud(this);
			drawScene(this);
			onReady();
		}

		update(_time: number, delta: number) {
			updateGame(this, delta / 1000);
		}
	}

	host.innerHTML = "";
	const initialSize = resolveHostSize(host);

	game = new PhaserLib.Game({
		type: PhaserLib.CANVAS,
		parent: host,
		width: initialSize.width,
		height: initialSize.height,
		scene: new SurvivalShooterScene() as PhaserScene,
		banner: false,
		disableContextMenu: true,
		audio: { noAudio: true },
		transparent: false,
		antialias: true,
		pixelArt: false,
		backgroundColor: "#07111a",
	});

	observer = new ResizeObserver(() => {
		resizeGame();
	});
	observer.observe(host);

	return () => {
		observer?.disconnect();
		observer = null;
		clearDamageTexts();
		if (game) {
			game.destroy(true);
			game = null;
		}
		graphics = null;
		statsText = null;
		abilityText = null;
		pauseButtonText = null;
		xpTitleText = null;
		xpMetaText = null;
		bannerText = null;
		centerText = null;
		sceneRef = null;
		cursors = null;
		keys = null;
	};
}

export default function SurvivalShooter({
	className = "",
}: {
	className?: string;
}) {
	const hostRef = useRef<HTMLDivElement | null>(null);
	const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

	useEffect(() => {
		const host = hostRef.current;
		if (!host) return;

		let cancelled = false;
		let cleanup: (() => void) | undefined;

		setStatus("loading");

		void (async () => {
			try {
				const PhaserLib = await import("phaser");
				if (cancelled || !hostRef.current) return;

				cleanup = mountSurvivalShooter(hostRef.current, PhaserLib, () => {
					if (!cancelled) setStatus("ready");
				});
			} catch (error) {
				console.error("Unable to initialize Survival Shooter:", error);
				if (!cancelled) setStatus("error");
			}
		})();

		return () => {
			cancelled = true;
			cleanup?.();
		};
	}, []);

	return (
		<div
			className={`relative h-full w-full overflow-hidden rounded-[28px] border border-white/10 bg-slate-950 ${className}`}
		>
			<div ref={hostRef} className="absolute inset-0" />

			{status === "loading" && (
				<div className="absolute inset-0 grid place-items-center bg-slate-950/70 text-sm text-slate-300">
					Booting Phaser scene...
				</div>
			)}

			{status === "error" && (
				<div className="absolute inset-0 grid place-items-center px-6 text-center text-sm text-rose-300">
					Unable to start Survival Shooter.
				</div>
			)}
		</div>
	);
}
