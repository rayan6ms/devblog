'use client';

import { useEffect, useRef } from 'react';
import p5 from 'p5';

type AbilityName = 'pierce' | 'multi shot' | 'quick shot';

type AbilityInfoMap = {
  [K in AbilityName]: {
    effect: (level: number) => number;
  };
};

type Vec2 = { x: number; y: number };

export default function SurvivalShooter({ className = '' }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const p5Ref = useRef<p5 | null>(null);
  const resizeRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    if (!hostRef.current) return;

    const sketch = (p: p5) => {
      let player: Player;
      let enemies: Enemy[] = [];
      let bullets: Bullet[] = [];
      let xpItems: XPItem[] = [];
      let damageTexts: DamageText[] = [];
      let baseEnemySpawnRate = 2000;
      let lastEnemySpawnTime = 0;
      let enemySpawnRate = baseEnemySpawnRate;
      let safeZoneRadius = 150;
      let currentLevel = 1;
      let currentXP = 0;
      let xpNeededForNextLevel = 100;
      let enemyKillCount = 0;
      let totalDamageDealt = 0;
      let frenesi = false;
      let frenesiTimer = 0;

      class Ability {
        name: AbilityName;
        effect: (level: number) => number;
        level: number;
        constructor(name: AbilityName, effect: (level: number) => number, level = 1) {
          this.name = name;
          this.effect = effect;
          this.level = level;
        }
        upgrade() {
          this.level++;
        }
      }

      const abilitiesInfo: AbilityInfoMap = {
        'pierce': { effect: (level) => level },
        'multi shot': { effect: (level) => 2 + level },
        'quick shot': { effect: (level) => 1 + level }
      };

      const availableAbilities: Ability[] = [
        new Ability('pierce', abilitiesInfo['pierce'].effect),
        new Ability('multi shot', abilitiesInfo['multi shot'].effect),
        new Ability('quick shot', abilitiesInfo['quick shot'].effect)
      ];

      type DamageText = { x: number; y: number; damage: number; time: number };

      class Player {
        x: number;
        y: number;
        size: number;
        speed: number;
        weaponCooldown: number;
        lastShotTime: number;
        lives: number;
        damage: number;
        abilities: Ability[];
        constructor(x: number, y: number, lives: number) {
          this.x = x;
          this.y = y;
          this.size = 20;
          this.speed = 2.2;
          this.weaponCooldown = 1000;
          this.lastShotTime = 0;
          this.lives = lives;
          this.damage = 1;
          this.abilities = [];
        }
        move() {
          let moveX = 0;
          let moveY = 0;
          if (p.keyIsDown(65)) moveX -= 1;
          if (p.keyIsDown(68)) moveX += 1;
          if (p.keyIsDown(87)) moveY -= 1;
          if (p.keyIsDown(83)) moveY += 1;
          if (moveX !== 0 && moveY !== 0) {
            const len = Math.hypot(moveX, moveY);
            moveX /= len;
            moveY /= len;
          }
          this.x += moveX * this.speed;
          this.y += moveY * this.speed;
          this.x = p.constrain(this.x, this.size / 2, p.width - this.size / 2);
          this.y = p.constrain(this.y, this.size / 2, p.height - this.size / 2);
        }
        addOrUpdateAbility(abilityName: AbilityName) {
          const ability = this.abilities.find(a => a.name === abilityName);
          if (ability) ability.upgrade();
          else this.abilities.push(new Ability(abilityName, abilitiesInfo[abilityName].effect));
        }
        shoot() {
          const currentTime = p.millis();
          const quickShotLevel = this.getAbilityLevel('quick shot');
          const multiShotExtraBullets = this.getAbilityLevel('multi shot');
          const angleIncrement = multiShotExtraBullets ? 50 : 180;
          const shotsPerVolley = quickShotLevel === 3 ? 3 : (quickShotLevel >= 4 ? 4 : quickShotLevel + 1);
          if (currentTime - this.lastShotTime > this.weaponCooldown && enemies.length > 0) {
            for (let q = 0; q < shotsPerVolley; q++) {
              const delayBetweenShots = 80;
              setTimeout(() => {
                const target = this.findClosestEnemy();
                if (!target) return;
                for (let m = 0; m < multiShotExtraBullets + 1; m++) {
                  const angleOffset = (m - Math.floor(shotsPerVolley / 2)) * p.PI / angleIncrement;
                  const angle = p.atan2(target.y - this.y, target.x - this.x) + angleOffset;
                  const pierceLevel = this.getAbilityLevel('pierce');
                  bullets.push(new Bullet(this.x, this.y, angle, this.damage, pierceLevel));
                }
              }, q * delayBetweenShots);
            }
            this.lastShotTime = currentTime;
          }
        }
        getAbilityLevel(abilityName: AbilityName) {
          const ability = this.abilities.find(a => a.name === abilityName);
          return ability ? ability.level : 0;
        }
        findClosestEnemy() {
          let closestEnemy: Enemy | null = null;
          let closestDist = Infinity;
          for (const enemy of enemies) {
            const d = p.dist(this.x, this.y, enemy.x, enemy.y);
            if (d < closestDist) {
              closestDist = d;
              closestEnemy = enemy;
            }
          }
          return closestEnemy;
        }
        display() {
          p.fill(255);
          p.circle(this.x, this.y, 20);
          p.fill(0);
          p.ellipse(this.x - 5, this.y - 4, 4, 4);
          p.ellipse(this.x + 5, this.y - 4, 4, 4);
          p.noFill();
          p.arc(this.x, this.y + 2, 10, 5, 0, p.PI);
          p.push();
          p.translate(this.x, this.y);
          const target = this.findClosestEnemy();
          if (target) {
            const angle = p.atan2(target.y - this.y, target.x - this.x);
            p.rotate(angle);
            p.fill(80);
            p.rect(10, -3, 20, 6);
            const gripPosition = angle > p.HALF_PI || angle < -p.HALF_PI ? -8 : 4;
            p.rect(0, gripPosition, 6, 6);
          }
          p.pop();
        }
      }

      class Enemy {
        x: number;
        y: number;
        size: number;
        speed: number;
        lives: number;
        initialLives: number;
        originalLives: number;
        isHit: boolean;
        color: p5.Color;
        constructor(x: number, y: number, lives: number) {
          this.x = x;
          this.y = y;
          this.size = 15;
          this.speed = 1;
          this.lives = lives;
          this.initialLives = lives;
          this.originalLives = lives;
          this.isHit = false;
          this.color = p.color(255, 0, 0);
          this.adjustColorForLevel(currentLevel);
        }
        moveTowards(targetX: number, targetY: number) {
          const angle = p.atan2(targetY - this.y, targetX - this.x);
          this.x += p.cos(angle) * this.speed;
          this.y += p.sin(angle) * this.speed;
        }
        adjustColorForLevel(level: number) {
          if (level >= 7) this.color = p.color(255 - Math.min(200, (level - 6) * 10), 0, 0);
          else this.color = p.color(255, 0, 0);
        }
        displayHealthBar() {
          if (this.lives < this.initialLives) {
            const healthPercentage = this.lives / this.initialLives;
            const barWidth = this.size * 2;
            const barHeight = 5;
            const healthColor = healthPercentage > 0.8 ? p.color(0, 255, 0) :
              healthPercentage > 0.6 ? p.color(255, 255, 0) : p.color(255, 0, 0);
            p.stroke(0);
            p.strokeWeight(1);
            p.fill(50);
            p.rect(this.x - barWidth / 2, this.y - this.size - 10, barWidth, barHeight, 3);
            p.noStroke();
            p.fill(healthColor);
            p.rect(this.x - barWidth / 2, this.y - this.size - 10, barWidth * healthPercentage, barHeight, 3);
          }
        }
        display() {
          p.fill(this.isHit ? 255 : this.color);
          this.isHit = false;
          p.circle(this.x, this.y, this.size);
          p.fill(0);
          p.ellipse(this.x - 3, this.y - 2, 3, 3);
          p.ellipse(this.x + 3, this.y - 2, 3, 3);
          p.line(this.x - 4, this.y - 5, this.x - 2, this.y - 4);
          p.line(this.x + 2, this.y - 4, this.x + 4, this.y - 5);
          this.displayHealthBar();
        }
      }

      class Bullet {
        x: number;
        y: number;
        angle: number;
        size: number;
        speed: number;
        damage: number;
        pierceLevel: number;
        piercedEnemies: Enemy[];
        constructor(x: number, y: number, angle: number, damage: number, pierceLevel = 0) {
          this.x = x;
          this.y = y;
          this.angle = angle;
          this.size = 5;
          this.speed = 5;
          this.damage = damage;
          this.pierceLevel = pierceLevel;
          this.piercedEnemies = [];
        }
        move() {
          this.x += p.cos(this.angle) * this.speed;
          this.y += p.sin(this.angle) * this.speed;
        }
        checkCollision() {
          let collision = false;
          for (let i = enemies.length - 1; i >= 0; i--) {
            if (this.piercedEnemies.includes(enemies[i])) continue;
            const distFromEnemy = p.dist(this.x, this.y, enemies[i].x, enemies[i].y);
            if (distFromEnemy < this.size + enemies[i].size / 2) {
              enemies[i].lives -= this.damage;
              enemies[i].isHit = true;
              collision = true;
              this.piercedEnemies.push(enemies[i]);
              if (enemies[i].lives <= 0) {
                const xpShape = determineXPShape(currentLevel);
                const xpValue = determineXPValue(xpShape);
                addDamageText(enemies[i].x, enemies[i].y, this.damage);
                totalDamageDealt += this.damage;
                xpItems.push(new XPItem(enemies[i].x, enemies[i].y, xpShape, xpValue));
                enemies.splice(i, 1);
                enemyKillCount++;
                if (enemyKillCount % 100 === 0) {
                  frenesi = true;
                  frenesiTimer = p.millis();
                  enemies.forEach(e => e.lives = 1);
                }
              } else {
                addDamageText(enemies[i].x, enemies[i].y, this.damage);
                totalDamageDealt += this.damage;
              }
              if (this.piercedEnemies.length >= this.pierceLevel + 1) return true;
              collision = true;
            }
          }
          return collision && this.piercedEnemies.length >= this.pierceLevel + 1;
        }
        display() {
          p.fill(100);
          p.circle(this.x, this.y, this.size);
        }
        isOutOfScreen() {
          return this.x < 0 || this.x > p.width || this.y < 0 || this.y > p.height;
        }
      }

      type XPShape = 'pentagon' | 'hexagon' | 'octagon' | 'decagon';

      class XPItem {
        x: number;
        y: number;
        shape: XPShape;
        value: number;
        collected: boolean;
        constructor(x: number, y: number, shape: XPShape, value: number) {
          this.x = x;
          this.y = y;
          this.shape = shape;
          this.value = value;
          this.collected = false;
        }
        display() {
          p.noStroke();
          p.fill(this.getColor());
          this.drawShape();
        }
        drawShape() {
          p.push();
          p.translate(this.x, this.y);
          p.beginShape();
          const sides = this.shape === 'pentagon' ? 5 : this.shape === 'hexagon' ? 6 : this.shape === 'octagon' ? 8 : 10;
          for (let a = 0; a < p.TWO_PI; a += p.TWO_PI / sides) {
            const vx = p.cos(a) * 6;
            const vy = p.sin(a) * 6;
            p.vertex(vx, vy);
          }
          p.endShape(p.CLOSE);
          p.pop();
        }
        getColor() {
          switch (this.shape) {
            case 'pentagon': return p.color(144, 238, 144);
            case 'hexagon': return p.color(233, 238, 144);
            case 'octagon': return p.color(189, 144, 238);
            case 'decagon': return p.color(144, 235, 238);
            default: return p.color(255);
          }
        }
        moveTowardsPlayer(playerX: number, playerY: number) {
          const d = p.dist(this.x, this.y, playerX, playerY);
          if (d < 120) {
            const stepSize = 5;
            const stepX = (playerX - this.x) / d * stepSize;
            const stepY = (playerY - this.y) / d * stepSize;
            this.x += stepX;
            this.y += stepY;
          }
          if (d < 10) {
            this.collected = true;
            return this.value;
          }
          return 0;
        }
      }

      function extraLifeBasedOnLevel(level: number) {
        return Math.min(10, Math.floor((Math.max(0, level - 6) / 7)) * 2);
      }

      function determineXPShape(level: number): XPShape {
        if (level < 7) return 'pentagon';
        else if (level < 14) return 'hexagon';
        else if (level < 21) return 'octagon';
        return 'decagon';
      }

      function determineXPValue(shape: XPShape) {
        switch (shape) {
          case 'pentagon': return 10;
          case 'hexagon': return 20;
          case 'octagon': return 30;
          case 'decagon': return 40;
          default: return 10;
        }
      }

      function assignPlayerAbility() {
        if ([7, 14, 21].includes(currentLevel)) {
          player.abilities.forEach(a => a.upgrade());
        }
        if (currentLevel === 1 || [7, 14, 21].includes(currentLevel)) {
          const newAbilities = availableAbilities.filter(ab => !player.abilities.some(pab => pab.name === ab.name));
          if (newAbilities.length > 0) {
            const idx = Math.floor(p.random(newAbilities.length));
            const newAbility = newAbilities[idx];
            player.addOrUpdateAbility(newAbility.name);
          }
        }
      }

      function createEnemy() {
        const extraLife = Math.min(7, Math.floor((Math.max(0, currentLevel - 6) / 7)) * 2);
        const initialLives = 3 + extraLife;
        let ex = 0;
        let ey = 0;
        let tries = 0;
        do {
          ex = p.random(p.width);
          ey = p.random(p.height);
          tries++;
          if (tries > 100) break;
        } while (p.dist(ex, ey, player.x, player.y) < safeZoneRadius);
        const e = new Enemy(ex, ey, frenesi ? 1 : initialLives);
        enemies.push(e);
      }

      function resetGame() {
        player = new Player(p.width / 2, p.height / 2, 3);
        enemies = [];
        bullets = [];
        xpItems = [];
        damageTexts = [];
        lastEnemySpawnTime = 0;
        currentLevel = 1;
        currentXP = 0;
        xpNeededForNextLevel = 100;
        enemyKillCount = 0;
        totalDamageDealt = 0;
        frenesi = false;
        frenesiTimer = 0;
        assignPlayerAbility();
      }

      function drawHeart(x: number, y: number, size: number) {
        p.beginShape();
        p.vertex(x, y);
        p.bezierVertex(x - size / 2, y - size / 2, x - size, y + size / 3, x, y + size);
        p.bezierVertex(x + size, y + size / 3, x + size / 2, y - size / 2, x, y);
        p.endShape(p.CLOSE);
      }

      function drawLives() {
        for (let i = 0; i < player.lives; i++) {
          p.fill(255, 0, 0);
          drawHeart(15 + i * 20, 20, 15);
        }
      }

      function drawGrid() {
        p.stroke(100);
        for (let x = 0; x < p.width; x += 40) p.line(x, 0, x, p.height);
        for (let y = 0; y < p.height; y += 40) p.line(0, y, p.width, y);
      }

      function addDamageText(x: number, y: number, damage: number) {
        damageTexts.push({ x, y, damage, time: p.millis() });
      }

      function displayDamageTexts() {
        const displayDuration = 400;
        for (let i = damageTexts.length - 1; i >= 0; i--) {
          const dt = damageTexts[i];
          if (p.millis() - dt.time > displayDuration) {
            damageTexts.splice(i, 1);
            continue;
          }
          p.push();
          p.fill(255, 255, 0);
          p.textSize(16);
          p.textAlign(p.CENTER, p.CENTER);
          p.text(dt.damage, dt.x, dt.y - 20);
          p.pop();
        }
      }

      function drawLevelAndXPBar() {
        p.fill(255);
        p.textSize(16);
        p.textAlign(p.CENTER, p.TOP);
        p.text(`Level: ${currentLevel}`, p.width / 2, 10);
        const xpProgress = currentXP / xpNeededForNextLevel;
        const barWidth = p.width * 0.74;
        const barHeight = 10;
        p.noFill();
        p.stroke(255);
        p.strokeWeight(2);
        p.rect(p.width * 0.12, 35, barWidth, barHeight, 5);
        p.fill(0, 180, 0);
        p.noStroke();
        p.rect(p.width * 0.12, 35, barWidth * p.constrain(xpProgress, 0, 1), barHeight, 5);
      }

      function formatNumber(n: number) {
        if (n < 1000) return `${n}`;
        else if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`;
        else return `${(n / 1_000_000).toFixed(1)}m`;
      }

      function drawStats() {
        p.push();
        p.fill(255);
        p.textSize(16);
        p.textAlign(p.RIGHT, p.TOP);
        const formattedKills = formatNumber(enemyKillCount);
        const formattedDamage = formatNumber(totalDamageDealt);
        p.text(`Kills: ${formattedKills}`, p.width - 10, 10);
        p.text(`Damage: ${formattedDamage}`, p.width - 10, 30);
        let yPos = 50;
        player.abilities.forEach((ability, index) => {
          const cap = ability.name.replace(/\b([a-z])/g, m => m.toUpperCase());
          p.text(`${cap} Lv.${ability.level}`, p.width - 10, yPos + index * 20);
        });
        p.pop();
      }

      function checkPlayerDamage() {
        for (let i = enemies.length - 1; i >= 0; i--) {
          if (p.dist(player.x, player.y, enemies[i].x, enemies[i].y) <= player.size / 2 + enemies[i].size / 2) {
            player.lives -= 1;
            enemies.splice(i, 1);
            if (player.lives <= 0) {
              resetGame();
              return;
            }
          }
        }
      }

      function updateLevel() {
        if (currentXP >= xpNeededForNextLevel) {
          currentLevel++;
          currentXP -= xpNeededForNextLevel;
          xpNeededForNextLevel *= 1.2;
          assignPlayerAbility();
          player.weaponCooldown = Math.max(200, 1000 - Math.min(720, 30 * currentLevel));
          if ([7, 14, 21].includes(currentLevel)) {
            player.lives += 1;
            player.damage += 1;
            enemies.forEach(enemy => {
              enemy.initialLives += 2;
              enemy.adjustColorForLevel(currentLevel);
            });
          }
        }
      }

      function updateGameLogic() {
        const currentTime = p.millis();
        if (enemies.length < 5) enemySpawnRate = Math.max(500, baseEnemySpawnRate - enemies.length * 100);
        else enemySpawnRate = baseEnemySpawnRate + enemies.length * 50;
        if (currentTime - lastEnemySpawnTime > enemySpawnRate) {
          const numberOfEnemies = enemies.length < 10 ? 3 : 2;
          for (let i = 0; i < numberOfEnemies; i++) createEnemy();
          lastEnemySpawnTime = currentTime;
        }
        player.move();
        for (let i = bullets.length - 1; i >= 0; i--) {
          bullets[i].move();
          if (bullets[i].checkCollision() || bullets[i].isOutOfScreen()) bullets.splice(i, 1);
        }
        for (let i = xpItems.length - 1; i >= 0; i--) {
          const gained = xpItems[i].moveTowardsPlayer(player.x, player.y);
          if (xpItems[i].collected) {
            currentXP += xpItems[i].value;
            xpItems.splice(i, 1);
          } else if (gained > 0) {
            currentXP += 0;
          }
        }
        enemies.forEach(e => e.moveTowards(player.x, player.y));
        checkPlayerDamage();
        updateLevel();
      }

      function drawGame() {
        if (frenesi) {
          p.colorMode(p.HSB, 360, 100, 100);
          p.background((p.frameCount % 360), 100, 100);
          p.colorMode(p.RGB, 255, 255, 255);
          if (p.millis() - frenesiTimer > 10000) {
            frenesi = false;
            enemies.forEach(enemy => {
              enemy.lives = Math.max(3, enemy.originalLives + extraLifeBasedOnLevel(currentLevel));
              enemy.initialLives = enemy.lives;
            });
          }
        } else {
          p.background(50);
        }
        drawGrid();
        drawLives();
        drawLevelAndXPBar();
        displayDamageTexts();
        player.display();
        player.shoot();
        bullets.forEach(b => b.display());
        xpItems.forEach(x => { if (!x.collected) x.display(); });
        enemies.forEach(e => e.display());
        if (player.lives <= 0) resetGame();
        drawStats();
      }

      function ensureCanvasSize() {
        const el = hostRef.current;
        if (!el) return;
        const w = Math.max(1, el.clientWidth);
        const h = Math.max(1, el.clientHeight);
        if (p.width !== w || p.height !== h) p.resizeCanvas(w, h);
      }

      p.setup = () => {
        const el = hostRef.current!;
        p.createCanvas(Math.max(1, el.clientWidth), Math.max(1, el.clientHeight)).parent(el);
        p.textFont('system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif');
        resetGame();
      };

      p.draw = () => {
        ensureCanvasSize();
        updateGameLogic();
        drawGame();
      };

      p.windowResized = () => ensureCanvasSize();
    };

    p5Ref.current = new p5(sketch);
    resizeRef.current = new ResizeObserver(() => {
      if (p5Ref.current) p5Ref.current.windowResized();
    });
    resizeRef.current.observe(hostRef.current);

    return () => {
      resizeRef.current?.disconnect();
      resizeRef.current = null;
      p5Ref.current?.remove();
      p5Ref.current = null;
    };
  }, []);

  return <div ref={hostRef} className={`relative w-full h-full overflow-hidden ${className}`} />;
}
