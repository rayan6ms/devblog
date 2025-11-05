export type PlanetDef = {
  name: string;
  textureUrl: string;          
  axialTiltDeg: number;        
  rotationPeriodHours: number; 
  orbitalPeriodDays: number;   
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
const distUnits = (au: number) => (au <= 0 ? 0 : DIST_BASE * Math.pow(au, DIST_EXP));

const P = {
  Sun:      { rER: 109,   aAU: 0.0,   tilt: 7.25,  rotH: 648.0,    yearD: 0 },
  Mercury:  { rER: 0.383, aAU: 0.39,  tilt: 0.03,  rotH: 1407.6,   yearD: 87.97 },
  Venus:    { rER: 0.949, aAU: 0.72,  tilt: 177.0, rotH: -5832.5,  yearD: 224.70 },
  Earth:    { rER: 1.0,   aAU: 1.00,  tilt: 23.44, rotH: 23.93,    yearD: 365.25 },
  Mars:     { rER: 0.532, aAU: 1.52,  tilt: 25.19, rotH: 24.62,    yearD: 686.98 },
  Jupiter:  { rER: 11.21, aAU: 5.20,  tilt: 3.13,  rotH: 9.93,     yearD: 4332.59 },
  Saturn:   { rER: 9.45,  aAU: 9.58,  tilt: 26.73, rotH: 10.7,     yearD: 10759 },
  Uranus:   { rER: 4.01,  aAU: 19.2,  tilt: 97.77, rotH: -17.24,   yearD: 30688.5 },
  Neptune:  { rER: 3.88,  aAU: 30.1,  tilt: 28.32, rotH: 16.11,    yearD: 60182 }
};

export const planets: PlanetDef[] = [
  {
    name: 'Sun',
    textureUrl: '/textures/sun.jpg',
    axialTiltDeg: P.Sun.tilt,
    rotationPeriodHours: P.Sun.rotH,
    orbitalPeriodDays: 0,
    radiusUnits: radiusUnits(P.Sun.rER),
    distanceUnits: distUnits(P.Sun.aAU)
  },
  {
    name: 'Mercury',
    textureUrl: '/textures/mercury.jpg',
    axialTiltDeg: P.Mercury.tilt,
    rotationPeriodHours: P.Mercury.rotH,
    orbitalPeriodDays: P.Mercury.yearD,
    radiusUnits: radiusUnits(P.Mercury.rER),
    distanceUnits: distUnits(P.Mercury.aAU)
  },
  {
    name: 'Venus',
    textureUrl: '/textures/venus.jpg',
    axialTiltDeg: P.Venus.tilt,
    rotationPeriodHours: P.Venus.rotH,
    orbitalPeriodDays: P.Venus.yearD,
    radiusUnits: radiusUnits(P.Venus.rER),
    distanceUnits: distUnits(P.Venus.aAU)
  },
  {
    name: 'Earth',
    textureUrl: '/textures/earth.jpg',
    axialTiltDeg: P.Earth.tilt,
    rotationPeriodHours: P.Earth.rotH,
    orbitalPeriodDays: P.Earth.yearD,
    radiusUnits: radiusUnits(P.Earth.rER),
    distanceUnits: distUnits(P.Earth.aAU)
  },
  {
    name: 'Mars',
    textureUrl: '/textures/mars.jpg',
    axialTiltDeg: P.Mars.tilt,
    rotationPeriodHours: P.Mars.rotH,
    orbitalPeriodDays: P.Mars.yearD,
    radiusUnits: radiusUnits(P.Mars.rER),
    distanceUnits: distUnits(P.Mars.aAU)
  },
  {
    name: 'Jupiter',
    textureUrl: '/textures/jupiter.jpg',
    axialTiltDeg: P.Jupiter.tilt,
    rotationPeriodHours: P.Jupiter.rotH,
    orbitalPeriodDays: P.Jupiter.yearD,
    radiusUnits: radiusUnits(P.Jupiter.rER),
    distanceUnits: distUnits(P.Jupiter.aAU)
  },
  {
    name: 'Saturn',
    textureUrl: '/textures/saturn.jpg',
    axialTiltDeg: P.Saturn.tilt,
    rotationPeriodHours: P.Saturn.rotH,
    orbitalPeriodDays: P.Saturn.yearD,
    radiusUnits: radiusUnits(P.Saturn.rER),
    distanceUnits: distUnits(P.Saturn.aAU),
    ring: {
      textureUrl: '/textures/saturn_ring_alpha.png',
      innerUnits: radiusUnits(9.45) * 1.2,
      outerUnits: radiusUnits(9.45) * 2.0
    }
  },
  {
    name: 'Uranus',
    textureUrl: '/textures/uranus.jpg',
    axialTiltDeg: P.Uranus.tilt,
    rotationPeriodHours: P.Uranus.rotH,
    orbitalPeriodDays: P.Uranus.yearD,
    radiusUnits: radiusUnits(P.Uranus.rER),
    distanceUnits: distUnits(P.Uranus.aAU)
  },
  {
    name: 'Neptune',
    textureUrl: '/textures/neptune.jpg',
    axialTiltDeg: P.Neptune.tilt,
    rotationPeriodHours: P.Neptune.rotH,
    orbitalPeriodDays: P.Neptune.yearD,
    radiusUnits: radiusUnits(P.Neptune.rER),
    distanceUnits: distUnits(P.Neptune.aAU)
  }
];

export const moon: MoonDef = {
  name: 'Moon',
  textureUrl: '/textures/moon.jpg',
  orbitalPeriodDays: 27.32,
  radiusUnits: radiusUnits(0.273),
  distanceUnits: 2.3
};