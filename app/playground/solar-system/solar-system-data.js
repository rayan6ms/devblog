const distanceScale = 130;
const radiusScale = 0.5;
const rotationSpeedScale = 0.2;
const orbitSpeedScale = 0.0001;

export const planets = [
  {
    name: 'Sun',
    mass: 33300,
    radius: 42 * radiusScale,
    orbitRadius: 0,
    rotationSpeed: 6 * rotationSpeedScale,
    orbitSpeed: 0, // O sol não orbita
    axialTilt: 7.25,
    texture: 'sun.jpg',
  },
  {
    name: 'Mercury',
    mass: 0.0553,
    radius: 3.6 * radiusScale,
    orbitRadius: 0.3 * distanceScale,
    rotationSpeed: 30 * rotationSpeedScale,
    orbitSpeed: (365.25 / 0.6) * orbitSpeedScale, // 88 dias terrestres
    axialTilt: 0.01,
    texture: 'mercury.jpg',
  },
  {
    name: 'Venus',
    mass: 0.815,
    radius: 5.36 * radiusScale,
    orbitRadius: 0.40 * distanceScale,
    rotationSpeed: (-80 * rotationSpeedScale) * -1, // Rotação retrógrada
    orbitSpeed: (365.25 / 0.56) * orbitSpeedScale, // 225 dias terrestres
    axialTilt: 177.3,
    texture: 'venus.jpg',
  },
  {
    name: 'Earth',
    mass: 1,
    radius: 6.5 * radiusScale,
    orbitRadius: 0.52 * distanceScale,
    rotationSpeed: 1 * rotationSpeedScale,
    orbitSpeed: (365.25 * orbitSpeedScale), // 365.25 dias terrestres
    axialTilt: 23.45,
    texture: 'earth.jpg',
  },
  {
    name: 'Mars',
    mass: 0.107,
    radius: 5.6 * radiusScale,
    orbitRadius: 0.66 * distanceScale,
    rotationSpeed: 1.03 * rotationSpeedScale,
    orbitSpeed: (365.25 / 1.66) * orbitSpeedScale, // 687 dias terrestres
    axialTilt: 25.19,
    texture: 'mars.jpg',
  },
  {
    name: 'Jupiter',
    mass: 317.8,
    radius: 16 * radiusScale,
    orbitRadius: 0.88 * distanceScale,
    rotationSpeed: 0.414 * rotationSpeedScale,
    orbitSpeed: (365.25 / 5.6) * orbitSpeedScale, // ~12 anos terrestres
    axialTilt: 3.13,
    texture: 'jupiter.jpg',
  },
  {
    name: 'Saturn',
    mass: 95.2,
    radius: 13 * radiusScale,
    orbitRadius: 1.1 * distanceScale,
    rotationSpeed: 0.445 * rotationSpeedScale,
    orbitSpeed: (365.25 / 6) * orbitSpeedScale, // ~29 anos terrestres
    axialTilt: 26.73,
    texture: 'saturn.jpg',
  },
  {
    name: 'Uranus',
    mass: 14.5,
    radius: 7.2 * radiusScale,
    orbitRadius: 1.38 * distanceScale,
    rotationSpeed: (-0.680 * rotationSpeedScale) * -1, // Rotação retrógrada
    orbitSpeed: (365.25 / 6.5) * orbitSpeedScale, // ~84 anos terrestres
    axialTilt: 97.77,
    texture: 'uranus.jpg',
  },
  {
    name: 'Neptune',
    mass: 17.1,
    radius: 7.35 * radiusScale,
    orbitRadius: 1.54 * distanceScale,
    rotationSpeed: 0.600 * rotationSpeedScale,
    orbitSpeed: (365.25 / 6.2) * orbitSpeedScale, // ~165 anos terrestres
    axialTilt: 28.32,
    texture: 'neptune.jpg',
  }
];

export const moon = {
  name: 'Moon',
  mass: 0.0123,
  radius: 2 * radiusScale,
  orbitRadius: 0.47 * distanceScale,
  rotationSpeed: 23.32 * rotationSpeedScale,
  orbitSpeed: 365.24 * orbitSpeedScale,
  axialTilt: 6.68,
  texture: 'moon.jpg',
};