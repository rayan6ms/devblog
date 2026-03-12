export type PlanetDef = {
	name: string;
	textureUrl: string;
	accent: string;
	summary: string;
	axialTiltDeg: number;
	rotationPeriodHours: number;
	orbitalPeriodDays: number;
	radiusEarths: number;
	distanceAU: number;
	radiusUnits: number;
	distanceUnits: number;
	ring?: { textureUrl: string; innerUnits: number; outerUnits: number };
};

export type MoonDef = {
	name: string;
	textureUrl: string;
	orbitalPeriodDays: number;
	radiusUnits: number;
	distanceUnits: number;
};

const RADIUS_BASE = 0.6;
const DIST_BASE = 100;
const DIST_EXP = 0.15;

const radiusUnits = (earthRadii: number) => earthRadii * RADIUS_BASE;
const distUnits = (au: number) => (au <= 0 ? 0 : DIST_BASE * au ** DIST_EXP);

const P = {
	Sun: { rER: 109, aAU: 0.0, tilt: 7.25, rotH: 648.0, yearD: 0 },
	Mercury: { rER: 0.383, aAU: 0.39, tilt: 0.03, rotH: 1407.6, yearD: 87.97 },
	Venus: { rER: 0.949, aAU: 0.72, tilt: 177.0, rotH: -5832.5, yearD: 224.7 },
	Earth: { rER: 1.0, aAU: 1.0, tilt: 23.44, rotH: 23.93, yearD: 365.25 },
	Mars: { rER: 0.532, aAU: 1.52, tilt: 25.19, rotH: 24.62, yearD: 686.98 },
	Jupiter: { rER: 11.21, aAU: 5.2, tilt: 3.13, rotH: 9.93, yearD: 4332.59 },
	Saturn: { rER: 9.45, aAU: 9.58, tilt: 26.73, rotH: 10.7, yearD: 10759 },
	Uranus: { rER: 4.01, aAU: 19.2, tilt: 97.77, rotH: -17.24, yearD: 30688.5 },
	Neptune: { rER: 3.88, aAU: 30.1, tilt: 28.32, rotH: 16.11, yearD: 60182 },
};

export const planets: PlanetDef[] = [
	{
		name: "Sun",
		textureUrl: "/textures/sun.jpg",
		accent: "#f7b955",
		summary: "A bright anchor with a warm corona that lights the whole miniature system.",
		axialTiltDeg: P.Sun.tilt,
		rotationPeriodHours: P.Sun.rotH,
		orbitalPeriodDays: 0,
		radiusEarths: P.Sun.rER,
		distanceAU: P.Sun.aAU,
		radiusUnits: radiusUnits(P.Sun.rER),
		distanceUnits: distUnits(P.Sun.aAU),
	},
	{
		name: "Mercury",
		textureUrl: "/textures/mercury.jpg",
		accent: "#c9b7a8",
		summary: "A scorched inner world racing closest to the star.",
		axialTiltDeg: P.Mercury.tilt,
		rotationPeriodHours: P.Mercury.rotH,
		orbitalPeriodDays: P.Mercury.yearD,
		radiusEarths: P.Mercury.rER,
		distanceAU: P.Mercury.aAU,
		radiusUnits: radiusUnits(P.Mercury.rER),
		distanceUnits: distUnits(P.Mercury.aAU),
	},
	{
		name: "Venus",
		textureUrl: "/textures/venus.jpg",
		accent: "#e9c07a",
		summary: "A cloudy amber sphere spinning slowly in retrograde.",
		axialTiltDeg: P.Venus.tilt,
		rotationPeriodHours: P.Venus.rotH,
		orbitalPeriodDays: P.Venus.yearD,
		radiusEarths: P.Venus.rER,
		distanceAU: P.Venus.aAU,
		radiusUnits: radiusUnits(P.Venus.rER),
		distanceUnits: distUnits(P.Venus.aAU),
	},
	{
		name: "Earth",
		textureUrl: "/textures/earth.jpg",
		accent: "#59b8ff",
		summary: "Blue oceans, bright clouds, and a familiar moon tracing a tight orbit.",
		axialTiltDeg: P.Earth.tilt,
		rotationPeriodHours: P.Earth.rotH,
		orbitalPeriodDays: P.Earth.yearD,
		radiusEarths: P.Earth.rER,
		distanceAU: P.Earth.aAU,
		radiusUnits: radiusUnits(P.Earth.rER),
		distanceUnits: distUnits(P.Earth.aAU),
	},
	{
		name: "Mars",
		textureUrl: "/textures/mars.jpg",
		accent: "#ff8b6e",
		summary: "A rust-red world with a sharp tilt and a colder path beyond Earth.",
		axialTiltDeg: P.Mars.tilt,
		rotationPeriodHours: P.Mars.rotH,
		orbitalPeriodDays: P.Mars.yearD,
		radiusEarths: P.Mars.rER,
		distanceAU: P.Mars.aAU,
		radiusUnits: radiusUnits(P.Mars.rER),
		distanceUnits: distUnits(P.Mars.aAU),
	},
	{
		name: "Jupiter",
		textureUrl: "/textures/jupiter.jpg",
		accent: "#d8a46b",
		summary: "A striped gas giant dominating the middle of the system.",
		axialTiltDeg: P.Jupiter.tilt,
		rotationPeriodHours: P.Jupiter.rotH,
		orbitalPeriodDays: P.Jupiter.yearD,
		radiusEarths: P.Jupiter.rER,
		distanceAU: P.Jupiter.aAU,
		radiusUnits: radiusUnits(P.Jupiter.rER),
		distanceUnits: distUnits(P.Jupiter.aAU),
	},
	{
		name: "Saturn",
		textureUrl: "/textures/saturn.jpg",
		accent: "#efd7a6",
		summary: "Elegant rings and a pale glow make it the showpiece of the outer planets.",
		axialTiltDeg: P.Saturn.tilt,
		rotationPeriodHours: P.Saturn.rotH,
		orbitalPeriodDays: P.Saturn.yearD,
		radiusEarths: P.Saturn.rER,
		distanceAU: P.Saturn.aAU,
		radiusUnits: radiusUnits(P.Saturn.rER),
		distanceUnits: distUnits(P.Saturn.aAU),
		ring: {
			textureUrl: "/textures/saturn_ring_alpha.png",
			innerUnits: radiusUnits(9.45) * 1.2,
			outerUnits: radiusUnits(9.45) * 2.0,
		},
	},
	{
		name: "Uranus",
		textureUrl: "/textures/uranus.jpg",
		accent: "#8dd8dd",
		summary: "An icy cyan planet tipped dramatically onto its side.",
		axialTiltDeg: P.Uranus.tilt,
		rotationPeriodHours: P.Uranus.rotH,
		orbitalPeriodDays: P.Uranus.yearD,
		radiusEarths: P.Uranus.rER,
		distanceAU: P.Uranus.aAU,
		radiusUnits: radiusUnits(P.Uranus.rER),
		distanceUnits: distUnits(P.Uranus.aAU),
	},
	{
		name: "Neptune",
		textureUrl: "/textures/neptune.jpg",
		accent: "#6a8fff",
		summary: "Deep blue, distant, and gliding through the darkest edge of the scene.",
		axialTiltDeg: P.Neptune.tilt,
		rotationPeriodHours: P.Neptune.rotH,
		orbitalPeriodDays: P.Neptune.yearD,
		radiusEarths: P.Neptune.rER,
		distanceAU: P.Neptune.aAU,
		radiusUnits: radiusUnits(P.Neptune.rER),
		distanceUnits: distUnits(P.Neptune.aAU),
	},
];

export const moon: MoonDef = {
	name: "Moon",
	textureUrl: "/textures/moon.jpg",
	orbitalPeriodDays: 27.32,
	radiusUnits: radiusUnits(0.273),
	distanceUnits: 2.3,
};
