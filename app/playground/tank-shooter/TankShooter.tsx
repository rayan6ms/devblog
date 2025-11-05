'use client';

import { useEffect, useRef } from 'react';

const installP5GlobalBridge = (p: any) => {
  const g: any = globalThis as any;
  const getP = () => g.__p5ctx;
  const getVM = () => g.__p5vm;
  const getHostEl = () => g.__p5hostEl;

  g.__p5ctx = p;

  if (g.__p5bridgeInstalled) return;

  const defineProp = (name: string, getter: () => any) => {
    if (!(name in g)) {
      Object.defineProperty(g, name, { get: getter, configurable: true });
    }
  };
  
  defineProp('width',  () => getVM()?.active ? getVM().baseW : getP()?.width);
  defineProp('height', () => getVM()?.active ? getVM().baseH : getP()?.height);
  
  defineProp('mouseX', () => {
    const p = getP(), vm = getVM();
    if (!p) return 0;
    return vm?.active ? (p.mouseX - vm.ox) / vm.s : p.mouseX;
  });
  defineProp('mouseY', () => {
    const p = getP(), vm = getVM();
    if (!p) return 0;
    return vm?.active ? (p.mouseY - vm.oy) / vm.s : p.mouseY;
  });
  
  defineProp('windowWidth',  () => getHostEl()?.clientWidth  ?? getP()?.width);
  defineProp('windowHeight', () => getHostEl()?.clientHeight ?? getP()?.height);
  
  if (!('keyIsDown' in g)) {
    Object.defineProperty(g, 'keyIsDown', { value: (...a: any[]) => getP()?.keyIsDown?.(...a), configurable: true });
  }

  Object.defineProperty(g, '__p5ctx', {
    value: p,
    writable: true,
    configurable: true
  });

  const defineMethod = (name: string) => {
    if (!(name in g)) {
      Object.defineProperty(g, name, {
        configurable: true,
        enumerable: false,
        writable: false,
        value: (...args: any[]) => g.__p5ctx?.[name]?.(...args)
      });
    }
  };

  let obj: any = p;

  const defineConst = (name: string) => {
    if (!(name in g)) {
      Object.defineProperty(g, name, {
        get: () => g.__p5ctx?.[name],
        configurable: true
      });
    }
  };
  
  let proto: any = p;
  const seen = new Set<string>();
  while (proto && proto !== Object.prototype) {
    for (const key of Object.getOwnPropertyNames(proto)) {
      if (seen.has(key)) continue;
      seen.add(key);
      const val = (p as any)[key];
      if (typeof val !== 'function' && /^[A-Z0-9_]+$/.test(key)) {
        defineConst(key);
      }
    }
    proto = Object.getPrototypeOf(proto);
  }

  const props = [
    'width','height','windowWidth','windowHeight','mouseX','mouseY','deltaTime','drawingContext','mouseIsPressed'
  ];
  for (const k of props) {
    if (!(k in g)) {
      Object.defineProperty(g, k, { get: () => g.__p5ctx?.[k], configurable: true });
    }
  }

  g.__p5bridgeInstalled = true;
};

export default function GameSketch() {
  const hostRef = useRef<HTMLDivElement>(null);
  const p5Ref = useRef<any>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const P5 = (await import('p5')).default;
      if (!mounted || !hostRef.current) return;
      
      const sketch = (p: any) => {
        installP5GlobalBridge(p);

        let VIRTUAL = { w: 1, h: 1 };

        (globalThis as any).__p5vm = { active: true, baseW: VIRTUAL.w, baseH: VIRTUAL.h, s: 1, ox: 0, oy: 0 };
        (globalThis as any).__p5hostEl = null as HTMLElement | null;

        const bind = (name: keyof typeof p) => (...args: any[]) => (p as any)[name](...args);

        const hostEl = () => {
          const g: any = globalThis as any;
          return (g.__p5hostEl as HTMLElement)
              || ((p as any)._userNode as HTMLElement)
              || p.canvas?.parentElement
              || (document.body as HTMLElement);
        };
        
        const hostSize = () => {
          const el = hostEl() as HTMLElement;
          let w = el?.clientWidth || 1;
          let h = el?.clientHeight || 1;
          if (!w || !h) {
            const r = el.getBoundingClientRect?.();
            if (r) { w = Math.max(1, Math.floor(r.width)); h = Math.max(1, Math.floor(r.height)); }
          }
          return { w, h };
        };

        const updateVirtualFromHost = () => {
          const { w, h } = hostSize();
          VIRTUAL.w = Math.max(1, w);
          VIRTUAL.h = Math.max(1, h);
          (globalThis as any).__p5vm.baseW = VIRTUAL.w;
          (globalThis as any).__p5vm.baseH = VIRTUAL.h;
        };

        const {
          HALF_PI, PI, TAU, DEGREES, RADIANS,
          CENTER, LEFT, RIGHT, BASELINE, BOLD, NORMAL,
          ROUND, MITER, BEVEL, PROJECT, SQUARE,
          ARROW, HAND, LEFT_ARROW, RIGHT_ARROW, UP_ARROW, DOWN_ARROW,
          CLOSE, OPEN, CORNER, CORNERS, RADIUS,
          BLEND
        } = p;
        

        let drawingContext: CanvasRenderingContext2D | undefined;
        let ro: ResizeObserver | null = null;

        const pixelDensity = bind('pixelDensity');

        const createCanvas = (...args: any[]) => {
          const res = (p as any).createCanvas(...args);
          drawingContext = p.drawingContext as CanvasRenderingContext2D;
          return res;
        };

        const resizeCanvas = bind('resizeCanvas');
        const frameRate    = bind('frameRate');
        const background   = bind('background');
        const push         = bind('push');
        const pop          = bind('pop');
        const translate    = bind('translate');
        const rotate       = bind('rotate');
        const scale        = bind('scale');

        const noStroke     = bind('noStroke');
        const stroke       = bind('stroke');
        const strokeWeight = bind('strokeWeight');
        const strokeJoin   = bind('strokeJoin');
        const strokeCap    = bind('strokeCap');
        const noFill       = bind('noFill');
        const fill         = bind('fill');
        const rect         = bind('rect');
        const rectMode     = bind('rectMode');
        const circle       = bind('circle');
        const ellipse      = bind('ellipse');
        const line         = bind('line');
        const triangle     = bind('triangle');
        const beginShape   = bind('beginShape');
        const endShape     = bind('endShape');
        const vertex       = bind('vertex');
        const image        = bind('image');
        const blendMode    = bind('blendMode');

        const text         = bind('text');
        const textAlign    = bind('textAlign');
        const textSize     = bind('textSize');
        const textStyle    = bind('textStyle');
        const textFont     = bind('textFont');
        const textWidth    = bind('textWidth');

        const cursor       = bind('cursor');
        const noCursor     = bind('noCursor');
        const constrain    = bind('constrain');
        const random       = bind('random');
        const dist         = bind('dist');

        const _userKeyPressed =
          typeof (globalThis as any).keyPressed === 'function'
            ? ((globalThis as any).keyPressed as (e: KeyboardEvent) => void)
            : null;

        const _userKeyReleased =
          typeof (globalThis as any).keyReleased === 'function'
            ? ((globalThis as any).keyReleased as (e: KeyboardEvent) => void)
            : null;

        const _userDraw = draw;

        let key: any;
        let keyCode: number;
        let keyIsPressed = false;

        const KEY = (e: KeyboardEvent) => (e.keyCode ?? (e as any).which ?? 0);

        const keyDown = new Map<number, boolean>();
        const edgeQueue = new Set<number>();

        function KD(code: number) { 
          return !!keyDown.get(code);
        }

        function justPressed(code: number) {
          if (edgeQueue.has(code)) { edgeQueue.delete(code); return true; }
          return false;
        }

        const DIGITS_1_8 = [49,50,51,52,53,54,55,56];

        p.mouseReleased = () => { blockShootUntilRelease = false; };

        const toggleCanvasFullscreen = async () => {
          const el = p.canvas as HTMLCanvasElement;
          const docAny = document as any;
          const isFS = !!(document.fullscreenElement || docAny.webkitFullscreenElement);
        
          try {
            if (!isFS) {
              if (el.requestFullscreen) {
                await el.requestFullscreen({ navigationUI: 'hide' } as any);
              } else if ((el as any).webkitRequestFullscreen) {
                (el as any).webkitRequestFullscreen();
              }
              try { setTimeout(() => el.focus(), 0); } catch {}
              try { (navigator as any).keyboard?.lock?.(['Escape']); } catch {}
            } else {
              if (document.exitFullscreen) await document.exitFullscreen();
              else if (docAny.webkitExitFullscreen) docAny.webkitExitFullscreen();
            }
          } catch {}
        };

        const isCanvasFullscreen = () => {
          const d: any = document;
          return !!(document.fullscreenElement || d.webkitFullscreenElement);
        };
        
        (globalThis as any).fullscreen = (v?: boolean) => {
          const d: any = document;
          const el = p.canvas as HTMLCanvasElement;
          const is = !!(document.fullscreenElement || d.webkitFullscreenElement);
          if (typeof v === 'boolean') {
            if (v && !is) { el.requestFullscreen?.({ navigationUI: 'hide' } as any) || (el as any).webkitRequestFullscreen?.(); }
            if (!v && is) { document.exitFullscreen?.() || d.webkitExitFullscreen?.(); }
          }
          return !!(document.fullscreenElement || d.webkitFullscreenElement);
        };

        const userDraw = draw;

        const allowFSKey = (k: string) => k === 'Escape' || k === 'Esc' || k === 'f' || k === 'F';

        document.addEventListener('fullscreenchange', () => {
          const d: any = document;
          const fsEl = d.fullscreenElement || d.webkitFullscreenElement;
          const oldHost = (globalThis as any).__p5hostEl as HTMLElement;
        
          (globalThis as any).__p5hostEl = (fsEl === p.canvas) ? (p.canvas as HTMLElement) : hostEl();
        
          try { ro?.disconnect(); } catch {}
          ro = new ResizeObserver(() => {
            const { w, h } = hostSize();
            resizeCanvas(w, h);
            updateVirtualFromHost();
          });
          ro.observe((globalThis as any).__p5hostEl);
        
          const { w, h } = hostSize();
          (p.canvas as HTMLCanvasElement).style.width  = '';
          (p.canvas as HTMLCanvasElement).style.height = '';
          resizeCanvas(w, h);
          updateVirtualFromHost();
          try { (p.canvas as HTMLCanvasElement).focus(); } catch {}
        });

        p.draw = () => {
          key = p.key; keyCode = p.keyCode; keyIsPressed = p.keyIsPressed;
        
          const cw = p.width, ch = p.height;
          const s  = Math.min(cw / VIRTUAL.w, ch / VIRTUAL.h);
          const rw = VIRTUAL.w * s, rh = VIRTUAL.h * s;
          const ox = (cw - rw) / 2, oy = (ch - rh) / 2;
        
          (globalThis as any).__p5vm = { active: true, baseW: VIRTUAL.w, baseH: VIRTUAL.h, s, ox, oy };
        
          push();
          translate(ox, oy);
          scale(s);
          _userDraw();
          pop();
        
          drawDebugHUD();
        };

        const WORLD = { w: 10000, h: 10000 };
        const GRID_SPACING = 26;

        const COLORS = {
          bg: 160,
          worldFill: 200,
          gridMinor: 190,
          gridMajor: 190,
          bounds: 110,

          playerBody: [0,178,225],
          playerBodyBorderMul: 0.72,
          playerBarrel: [153,153,153],
          playerBarrelBorder: [114,114,114],

          shapeTri:  [252,118,119],
          shapeSqr:  [255,232,105],
          shapePent: [118,141,252],
          shapeDiaPink: [241,119,221],
          shapeHex: [190,127,245],
          shapeShiny: [127,245,213],

          barBg: [0,0,0,190],

          barText: [255,255,255,255],
          xpFill: [234,210,102],
          scoreFill: [102,234,156],
          hpFill: [133,227,125],

          statFills: [
            [231,176,137],
            [229,102,234],
            [166,77,255],
            [102,144,234],
            [234,210,102],
            [234,102,102],
            [146,234,102],
            [102,234,229]
          ],

          miniBg: [180,180,180,180],
          miniBorder: [0,0,0,130],
          miniDot: [30,140,220],

          fpsPanelBg: [0,0,0,140],
          fpsText: [255,255,255,255],
          
          debugCrasherZone: [255,165,0,80],
          debugHexZone: [191,127,245,80],
        };

        const LEVEL_LOSS_THRESHOLD = 12;
        const LEVEL_LOSS_BELOW      = 1;
        const LEVEL_LOSS_AT_OR_ABOVE= 3;

        const SHINY_CHANCE = 1 / 5000;
        const SHINY_XP_HP_MULT = 50;  

        const WORLD_FILL_CSS = `rgb(${COLORS.worldFill},${COLORS.worldFill},${COLORS.worldFill})`;

        const HIT_R = [182,52,52];
        const HIT_R_DARK = [131,37,37];
        const HIT_R_INNER = [191,76,76];
        const HIT_W = [230,230,230];
        const HIT_W_DARK = [165,165,165];
        const HIT_W_INNER = [233,233,233];

        const MINIMAP = { margin: 14, size: 184 };
        const UI = {
          margin: 6,
          statBarW: 210,
          statBarH: 18,
          statRowH: 24,
          barPad: 3,
          hpBarPad: 0.1,
          barOuterR: 10,
          barInnerR: 7,
          statOuterR: 8,
          statInnerR: 6
        };

        const XP_GAIN_MULT = 20;
        const XP_REQUIRED_MULT = 1.0;

        const XP_TOTALS = [
          0,4,13,28,50,78,113,157,211,275,350,437,538,655,787,938,1109,1301,1516,1757,2026,2325,2658,3026,3433,3883,4379,4925,5525,6184,6907,7698,8537,9426,10368,11367,12426,13549,14739,16000,17337,18754,20256,21849,23536
        ];
        const LEVEL_CAP = 45;
        const xpToLevel = (lvl) => Math.floor(XP_TOTALS[lvl] * XP_REQUIRED_MULT);
        const TOTAL_TO_MAX = xpToLevel(LEVEL_CAP - 1);

        const TANK_COMBAT_COOLDOWN = 6.0;
        const REGEN_RATE = [0.0312,0.0326,0.0433,0.0660,0.0851,0.1095,0.1295,0.1560];
        const REGEN_COOLDOWN = 1.3;
        const HYPER_REGEN_AFTER = 30.0;
        const HYPER_REGEN_MULT = 3.0;

        const MAX_HP_BONUS = [0,20,40,60,80,100,120,140];

        const BODY_HIT_SHAPE = [20,24,28,32,36,40,44,48];

        const SHAPES_DEF = {
          sqr:  { color: COLORS.shapeSqr,  r: 22, hp: 10,  body: 8,  xp: 10,  rotSpd: 0.18, orbitSpd: 0.42, orbitR: 26 },
          tri:  { color: COLORS.shapeTri,  r: 26, hp: 30,  body: 8,  xp: 25,  rotSpd: 0.15, orbitSpd: 0.48, orbitR: 32 },
          pent: { color: COLORS.shapePent, r: 40, hp: 100, body: 12, xp: 130, rotSpd: 0.12, orbitSpd: 0.34, orbitR: 36 },
          dia:  { color: COLORS.shapeDiaPink, r: 30, hp: 10,   body: 10, xp: 15, rotSpd: 0.22, orbitSpd: 0.0, orbitR: 0 },
          hex: { color: COLORS.shapeHex, r: 120, hp: 6000, body: 20, xp: 4500, rotSpd: 0.09, orbitSpd: 0.0, orbitR: 10 },
        };

        const BULLET_HP = [7,12,16,21,25,32,37,43];
        const BULLET_DMG = [7,10,13,16,19,22,25,28];
        const RELOAD_SEC = [0.60,0.56,0.52,0.48,0.44,0.40,0.36,0.32];

        const TEAMS = [
          { name: 'blue',   color: [61,184,220],  key: 'tl' },
          { name: 'purple', color: [195,148,234], key: 'tr' },
          { name: 'green',  color: [61,217,139],  key: 'bl' },
          { name: 'red',    color: [229,113,120], key: 'br' }
        ];
        const TEAM_TANK_COLORS = { blue:[0,178,225], purple:[191,127,245], green:[0,225,110], red:[241,78,84] };

        const TEAM_TANK_COLORS_STROKE = {
          blue: [Math.floor(TEAM_TANK_COLORS.blue[0]*COLORS.playerBodyBorderMul), Math.floor(TEAM_TANK_COLORS.blue[1]*COLORS.playerBodyBorderMul), Math.floor(TEAM_TANK_COLORS.blue[2]*COLORS.playerBodyBorderMul)],
          purple: [Math.floor(TEAM_TANK_COLORS.purple[0]*COLORS.playerBodyBorderMul), Math.floor(TEAM_TANK_COLORS.purple[1]*COLORS.playerBodyBorderMul), Math.floor(TEAM_TANK_COLORS.purple[2]*COLORS.playerBodyBorderMul)],
          green: [Math.floor(TEAM_TANK_COLORS.green[0]*COLORS.playerBodyBorderMul), Math.floor(TEAM_TANK_COLORS.green[1]*COLORS.playerBodyBorderMul), Math.floor(TEAM_TANK_COLORS.green[2]*COLORS.playerBodyBorderMul)],
          red: [Math.floor(TEAM_TANK_COLORS.red[0]*COLORS.playerBodyBorderMul), Math.floor(TEAM_TANK_COLORS.red[1]*COLORS.playerBodyBorderMul), Math.floor(TEAM_TANK_COLORS.red[2]*COLORS.playerBodyBorderMul)]
        };

        const _flashCache = { body:{}, barrel:null };
        function getBodyFlash(team) {
          let v=_flashCache.body[team];
          if (!v){
            v=lighten(TEAM_TANK_COLORS[team],0.35);
            _flashCache.body[team]=v;
          }
          return v;
        }
        function getBarrelFlash(){ if (!_flashCache.barrel){ _flashCache.barrel = lighten(COLORS.playerBarrel,0.35); } return _flashCache.barrel; }

        let _spawnerAccum = 0;

        let TEAM_PROTECTORS = [];
        let TEAM_LIMIT_R = [];
        let protectorLocks = [];
        const PROTECTOR_STICKY_SEC = 4.0;
        let nextTankId = 1;

        class Pool {
          constructor(){ this.free=[]; }
          acquire(newObj){ return this.free.pop() || newObj(); }
          release(obj){ this.free.push(obj); }
        }

        function randf(a,b,rf=Math.random){ return a + (b-a)*rf(); }
        function randInt(a,b,rf=Math.random){ return Math.floor(randf(a,b+1,rf)); }
        function distance(ax,ay,bx,by){ const dx=ax-bx, dy=ay-by; return Math.hypot(dx,dy); }
        function withinRect(p,rect){ return p.x>=rect.x && p.x<=rect.x+rect.w && p.y>=rect.y && p.y<=rect.y+rect.h; }

        class Spawner {
          constructor(cfg){
            this.w = cfg.world.w;
            this.h = cfg.world.h;
            this.grid = cfg.gridSize;
            this.weights = cfg.polygonWeights || [0.6,0.3,0.1];
            this.maxHex = cfg.maxHexagons || 2;
            this.minDistFromPlayer = cfg.minDistFromPlayer || 200;
            this.crasherEqualsNest = cfg.crasherEqualsNest !== undefined ? cfg.crasherEqualsNest : true;
            this.maxPlacementAttempts = cfg.maxPlacementAttempts || 10;
            this.rng = cfg.rng || Math.random;
            this.factory = cfg.factory;
            this.getPlayer = cfg.getPlayer;
            this.polygonPool = new Pool();
            this.nestPolygonPool = new Pool();
            this.crasherPool = new Pool();
            this.enemyPool = new Pool();
            this.respawnQueue = [];
            this.rate = { polygons:(cfg.budgets?.rates?.polygons||6), nest:(cfg.budgets?.rates?.nest||3), crashers:(cfg.budgets?.rates?.crashers||2), respawns:(cfg.budgets?.rates?.respawns||1) };
            this.cap  = { polygons:(cfg.budgets?.caps?.polygons||6), nest:(cfg.budgets?.caps?.nest||3), crashers:(cfg.budgets?.caps?.crashers||2), respawns:(cfg.budgets?.caps?.respawns||2) };
            this.budget = { polygons:0, nest:0, crashers:0, respawns:0 };
            this.polygonTarget=0; this.nestTarget=0; this.crasherTarget=0;
            this.polygonCount=0; this.nestCount=0; this.crasherCount=0; this.hexagonCount=0;
            this.enemyCount=[0,0,0,0];
            this.nestBox=null; this.crasherZone=null;
            this.margin=120;
            this.crasherCooldown = 0;
            this.crasherCooldownSec = cfg.crasherCooldownSec || 10;
            this.prevInCrasher = false;
            this.pendingCrasherBurst = 0;
            this.nestPentCooldownSec = (cfg.nestPentCooldownSec || 2.0);
            this.nestPentCooldown = 0;
            this.desiredPentFrac = (cfg.desiredPentFrac || 0.14);
            this.polyCounts = { sqr:0, tri:0, pent:0 };
            this._recountT = 0;
            this._stamp = 1;
            this._failStamp = null;
          }
          reset(){
            const nestSide = this.w / 6.3;
            const nx = (this.w - nestSide)/2, ny = (this.h - nestSide)/2;
            this.nestBox = { x:nx, y:ny, w:nestSide, h:nestSide };
            const czSide = nestSide * 2;
            const cx = (this.w - czSide)/2, cy = (this.h - czSide)/2;
            this.crasherZone = { x:cx, y:cy, w:czSide, h:czSide };
            const A = this.w*this.h;
            this.polygonTarget = Math.floor(A / (180*this.grid*this.grid));
            this.nestTarget    = Math.floor(nestSide*nestSide / (220*this.grid*this.grid));
            this.crasherTarget = this.crasherEqualsNest ? this.nestTarget : Math.max(1, Math.floor(this.nestTarget*0.8));
            this.polygonCount=0; this.nestCount=0; this.crasherCount=0; this.hexagonCount=0;
            this.enemyCount=[0,0,0,0];
            this.respawnQueue.length=0;
            this.budget.polygons=this.cap.polygons;
            this.budget.nest=this.cap.nest;
            this.budget.crashers=this.cap.crashers;
            this.budget.respawns=this.cap.respawns;
            this.prevInCrasher = false;
            this.polyCounts = { sqr:0, tri:0, pent:0 };
            if (!this._failStamp || this._failStamp.length !== CELL_COUNT) this._failStamp = new Int32Array(CELL_COUNT);
            this._stamp = (this._stamp|0) + 1;
            this._recountT = 0;
          }
          enqueueRespawn(q){ this.respawnQueue.push(q); }

          update(dt){
            this._stamp = (this._stamp|0) + 1;
            this.budget.polygons = Math.min(this.cap.polygons, this.budget.polygons + this.rate.polygons*dt);
            this.budget.nest     = Math.min(this.cap.nest,     this.budget.nest     + this.rate.nest*dt);
            this.budget.crashers = Math.min(this.cap.crashers, this.budget.crashers + this.rate.crashers*dt);
            this.budget.respawns = Math.min(this.cap.respawns, this.budget.respawns + this.rate.respawns*dt);

            this.crasherCooldown = Math.max(0, this.crasherCooldown - dt);
            this.nestPentCooldown = Math.max(0, this.nestPentCooldown - dt);

            while (this.polygonCount < this.polygonTarget && this.budget.polygons >= 1) {
              if (!this._spawnPolygon()) break;
              this.budget.polygons -= 1;
              this.polygonCount++;
            }
            while (this.nestCount < this.nestTarget && this.budget.nest >= 1) {
              if (!this._spawnNestPolygon()) break;
              this.budget.nest -= 1;
              this.nestCount++;
            }

            const pl = this.getPlayer && this.getPlayer();
            const inCZ = pl && !pl.dead && withinRect(pl, this.crasherZone);
            const justEntered = inCZ && !this.prevInCrasher;
            const justLeft = (!inCZ && this.prevInCrasher) || (pl && pl.dead && this.prevInCrasher);
            
            if (pl && pl.dead) { this.pendingCrasherBurst = 0; this.crasherCooldown = 0; }

            if (justEntered) {
              if (this.pendingCrasherBurst <= 0) this.pendingCrasherBurst = randInt(2,4,this.rng);
              this.crasherCooldown = randf(9,16,this.rng);
            }

            if (inCZ && this.crasherCooldown <= 0) {
              if (this.pendingCrasherBurst <= 0) this.pendingCrasherBurst = randInt(2,4,this.rng);
              const maxPerFrame = 1;
              const toSpawn = Math.min(
                maxPerFrame,
                this.pendingCrasherBurst,
                this.crasherTarget - this.crasherCount,
                Math.floor(this.budget.crashers)
              );
              for (let i = 0; i < toSpawn; i++) {
                if (!this._spawnCrasher(pl)) break;
                this.crasherCount++;
                this.budget.crashers -= 1;
                this.pendingCrasherBurst--;
              }
              if (this.pendingCrasherBurst <= 0) this.crasherCooldown = randf(9,16,this.rng);
            }

            if (justLeft) {
              this.pendingCrasherBurst = 0;
              this.crasherCooldown = 0;
            }

            const can = Math.min(this.respawnQueue.length, Math.floor(this.budget.respawns));
            for (let i=0;i<can;i++){
              const q = this.respawnQueue.shift();
              if (this._spawnEnemy(q)) this.budget.respawns -= 1;
              else { this.respawnQueue.unshift(q); break; }
            }

            this.prevInCrasher = !!inCZ;
          }
          
          onShapeDied(sh){
            if (sh.isCrasher){
              this.crasherCount = Math.max(0, this.crasherCount - 1);
              console.log('[SPAWNER onShapeDied]', { id: sh.id, type: sh.type, inNest: withinRect({x:sh.x,y:sh.y}, this.nestBox) });
              return;
            }
            const inNest = withinRect({x:sh.x, y:sh.y}, this.nestBox);
            if (sh.type === 'hex'){
              this.nestCount = Math.max(0, this.nestCount - 1); this.hexagonCount = Math.max(0, this.hexagonCount - 1);
              console.log('[SPAWNER onShapeDied]', { id: sh.id, type: sh.type, inNest: withinRect({x:sh.x,y:sh.y}, this.nestBox) });
              return;
            }
            if (sh.type === 'pent'){
              if (inNest) this.nestCount = Math.max(0, this.nestCount - 1);
              else { this.polygonCount = Math.max(0, this.polygonCount - 1); this.polyCounts.pent = Math.max(0, (this.polyCounts.pent||0) - 1); }
              console.log('[SPAWNER onShapeDied]', { id: sh.id, type: sh.type, inNest: withinRect({x:sh.x,y:sh.y}, this.nestBox) });
              return;
            }
            if (sh.type === 'sqr'){
              this.polygonCount = Math.max(0, this.polygonCount - 1); this.polyCounts.sqr = Math.max(0, (this.polyCounts.sqr||0) - 1); 
              console.log('[SPAWNER onShapeDied]', { id: sh.id, type: sh.type, inNest: withinRect({x:sh.x,y:sh.y}, this.nestBox) });return;
            }
            if (sh.type === 'tri'){
              this.polygonCount = Math.max(0, this.polygonCount - 1); this.polyCounts.tri = Math.max(0, (this.polyCounts.tri||0) - 1); 
              console.log('[SPAWNER onShapeDied]', { id: sh.id, type: sh.type, inNest: withinRect({x:sh.x,y:sh.y}, this.nestBox) });return;
            }
          }

          _recount(){
            let poly=0, nest=0, crash=0, hex=0;
            let ps=0, pt=0, pp=0;
            const nz=this.nestBox, cz=this.crasherZone;
            for (let i=0;i<shapes.length;i++){
              if ((S_dead[i]|S_dying[i])!==0) continue;
              const x=S_x[i], y=S_y[i];
              const t=S_type[i]|0;
              if (t===1||t===2||t===3){
                if (x<cz.x||x>cz.x+cz.w||y<cz.y||y>cz.y+cz.h){
                  poly++;
                  if (t===1) ps++; else if (t===2) pt++; else pp++;
                }
              }
              if ((t===5||t===3) && x>=nz.x && x<=nz.x+nz.w && y>=nz.y && y<=nz.y+nz.h){ nest++; if (t===5) hex++; }
              if (t===4){ const sh=shapes[i]; if (sh && sh.isCrasher===true) crash++; }
            }
            this.polygonCount=poly; this.nestCount=nest; this.crasherCount=crash; this.hexagonCount=hex;
            this.polyCounts={sqr:ps,tri:pt,pent:pp};
          }

          _randPolyType(){
            const tot = this.polyCounts.sqr + this.polyCounts.tri + this.polyCounts.pent;
            const pentFrac = tot>0 ? (this.polyCounts.pent/tot) : 0;
            if (pentFrac < this.desiredPentFrac*0.6 && this.rng() < 0.75) return 2;
            if (pentFrac < this.desiredPentFrac && this.rng() < 0.45) return 2;
            const r=this.rng();
            const w0=this.weights[0], w1=w0+this.weights[1];
            if (r < w0) return 0;
            if (r < w1) return 1;
            return 2;
          }

          _randomInRect(rect){
            if (!this._p1) this._p1 = { x:0, y:0 };
            this._p1.x = randf(rect.x+this.margin, rect.x+rect.w-this.margin, this.rng);
            this._p1.y = randf(rect.y+this.margin, rect.y+rect.h-this.margin, this.rng);
            return this._p1;
          }
          _randomInWorld(){
            if (!this._p2) this._p2 = { x:0, y:0 };
            this._p2.x = randf(this.margin, this.w-this.margin, this.rng);
            this._p2.y = randf(this.margin, this.h-this.margin, this.rng);
            return this._p2;
          }

          _placeOk(p, minSep){
            const idx = neighborIndices(p.x, p.y);
            for (let n=0;n<idx.length;n++){
              const s = shapes[idx[n]]; if (!s || s.dead || s.dying) continue;
              const sx = s.cx ?? s.x, sy = s.cy ?? s.y;
              const sr = (s.r||0)*0.7 + minSep;
          
              if ((p.x - sx)**2 + (p.y - sy)**2 < sr*sr) return false;
          
              const srx = s.x ?? sx, sry = s.y ?? sy;
              if ((p.x - srx)**2 + (p.y - sry)**2 < sr*sr) return false;
            }
            return true;
          }

          _spawnPolygon(){
            let attempts=0;
            while (attempts++ < this.maxPlacementAttempts){
              const p=this._randomInWorld();
              const cxi=(p.x / COLL_CELL)|0;
              const cyi=(p.y / COLL_CELL)|0;
              const ci=cellIndexClamped(cxi,cyi);
              if (ci>=0 && this._failStamp && this._failStamp[ci]===this._stamp) continue;

              const inCZ = withinRect(p,this.crasherZone);

              let inBase=false;
              for (let i=0;i<TEAMS.length;i++){
                const r=getTeamBaseRect(i), pad=BASE_NO_SPAWN_PAD;
                if (p.x>=r.x-pad && p.x<=r.x+r.w+pad && p.y>=r.y-pad && p.y<=r.y+r.h+pad){ inBase=true; break; }
              }

              if (inCZ && this.rng() < 0.85) continue;
              if (inBase && this.rng() < 0.90) continue;
              
              const pl = this.getPlayer && this.getPlayer();
              if (pl){
                const minD = this.minDistFromPlayer + (pl.getRadiusScaled ? pl.getRadiusScaled() : (pl.r||0));
                if (distance(p.x,p.y,pl.x,pl.y) < minD) { if (ci>=0 && this._failStamp) this._failStamp[ci]=this._stamp; continue; }
              }
              
              const t = this._randPolyType();
              const kind = t===0?'sqr':(t===1?'tri':'pent');
              const sep = kind==='sqr'?44:kind==='tri'?52:92;
              if (!this._placeOk(p,sep)) { if (ci>=0 && this._failStamp) this._failStamp[ci]=this._stamp; continue; }
              this.polygonPool.acquire(()=>({}));
              this.factory.createPolygon(t,p,false);
              this.polyCounts[kind] = (this.polyCounts[kind]||0) + 1;
              console.log('[SPAWNER spawn]', { kind: 'polygon'|'nest'|'crasher', count: { polygon:this.polygonCount, nest:this.nestCount, crashers:this.crasherCount }});
              return true;
            }
            return false;
          }

          _spawnNestPolygon(){
            let attempts=0;
            while (attempts++ < this.maxPlacementAttempts){
              const p=this._randomInRect(this.nestBox);
              const cxi=(p.x / COLL_CELL)|0;
              const cyi=(p.y / COLL_CELL)|0;
              const ci=cellIndexClamped(cxi,cyi);
              if (ci>=0 && this._failStamp && this._failStamp[ci]===this._stamp) continue;

              const pl = this.getPlayer && this.getPlayer();
              if (pl){
                const minD = this.minDistFromPlayer + (pl.getRadiusScaled ? pl.getRadiusScaled() : (pl.r||0));
                if (distance(p.x,p.y,pl.x,pl.y) < minD) { if (ci>=0 && this._failStamp) this._failStamp[ci]=this._stamp; continue; }
              }
              const prob = this.hexagonCount===0 ? 0.28 : 0.06;
              const isHex = (this.hexagonCount < this.maxHex) && (this.rng() < prob);
              const kind = isHex?3:2;
              const sep = isHex?140:92;
              if (!isHex && this.nestPentCooldown > 0) { if (ci>=0 && this._failStamp) this._failStamp[ci]=this._stamp; continue; }
              if (!this._placeOk(p,sep)) { if (ci>=0 && this._failStamp) this._failStamp[ci]=this._stamp; continue; }
              this.nestPolygonPool.acquire(()=>({}));
              this.factory.createNestPolygon(kind,p);
              if (isHex) this.hexagonCount++;
              else this.nestPentCooldown = this.nestPentCooldownSec;
              console.log('[SPAWNER spawn]', { kind: 'polygon'|'nest'|'crasher', count: { polygon:this.polygonCount, nest:this.nestCount, crashers:this.crasherCount }});
              return true;
            }
            return false;
          }

          _spawnCrasher(anchor){
            let attempts=0;
            const cz=this.crasherZone, nz=this.nestBox;
            while (attempts++ < this.maxPlacementAttempts){
              let p;
              if (anchor && withinRect(anchor, cz)) {
                const r = randf(380,560,this.rng);
                const a = randf(0,TAU,this.rng);
                const tx = anchor.x + Math.cos(a)*r;
                const ty = anchor.y + Math.sin(a)*r;
                const mx = cz.x + this.margin, Mx = cz.x + cz.w - this.margin;
                const my = cz.y + this.margin, My = cz.y + cz.h - this.margin;
                p = { x: Math.max(mx, Math.min(Mx, tx)), y: Math.max(my, Math.min(My, ty)) };
              } else {
                const band = randInt(0,3,this.rng);
                if (band===0){ p={ x: randf(cz.x, nz.x, this.rng), y: randf(cz.y, cz.y+cz.h, this.rng) }; }
                else if (band===1){ p={ x: randf(nz.x+nz.w, cz.x+cz.w, this.rng), y: randf(cz.y, cz.y+cz.h, this.rng) }; }
                else if (band===2){ p={ x: randf(cz.x, cz.x+cz.w, this.rng), y: randf(cz.y, nz.y, this.rng) }; }
                else { p={ x: randf(cz.x, cz.x+cz.w, this.rng), y: randf(nz.y+nz.h, cz.y+cz.h, this.rng) }; }
              }
              const elite = this.rng() < 0.20;
              const sep = elite?60:50;

              const cxi=(p.x / COLL_CELL)|0;
              const cyi=(p.y / COLL_CELL)|0;
              const ci=cellIndexClamped(cxi,cyi);
              if (ci>=0 && this._failStamp && this._failStamp[ci]===this._stamp) continue;

              if (!this._placeOk(p,sep)) { if (ci>=0 && this._failStamp) this._failStamp[ci]=this._stamp; continue; }
              this.crasherPool.acquire(()=>({}));
              this.factory.createCrasher(p, elite);
              console.log('[SPAWNER spawn]', { kind: 'polygon'|'nest'|'crasher', count: { polygon:this.polygonCount, nest:this.nestCount, crashers:this.crasherCount }});
              return true;
            }
            return false;
          }

          _spawnEnemy(q){
            let attempts=0;
            while (attempts++ < this.maxPlacementAttempts){
              const p=this._randomInWorld();
              if (withinRect(p,this.crasherZone)) continue;
              const pl = this.getPlayer && this.getPlayer();
              if (pl){
                const minD = (this.minDistFromPlayer||200) + (pl.getRadiusScaled ? pl.getRadiusScaled() : (pl.r||0));
                if (distance(p.x,p.y,pl.x,pl.y) < minD) continue;
              }
              this.enemyPool.acquire(()=>({}));
              const ok = this.factory.createEnemy(q,p);
              if (ok!==false){ this.enemyCount[q.group]++; return true; }
            }
            return false;
          }
        }

        let spawner=null;
        let tanks=[];
        const TEAM_BASE_SIZE = 2000;
        let fpsAccum=0, fpsFrames=0, fpsShown=60;

        const teamBotCounters = new Array(TEAMS.length).fill(0);
        function teamNameCap(idx: number){ const s = TEAMS[idx].name; return s.charAt(0).toUpperCase() + s.slice(1); }

        function formatShort(n: number){
          const a = Math.abs(n);
          if (a >= 1e9) return (n/1e9).toFixed(1) + 'b';
          if (a >= 1e6) return (n/1e6).toFixed(1) + 'm';
          if (a >= 1e3) return (n/1e3).toFixed(1) + 'k';
          return String(Math.floor(n));
        }

        function teamNameColor(t:any){
          const idx = (t.teamIdx|0);
          const team = TEAMS[idx];
          if (!team) return [255,255,255];
          const base = TEAM_TANK_COLORS[team.name as keyof typeof TEAM_TANK_COLORS];
          return base ? [base[0]|0, base[1]|0, base[2]|0] : [255,255,255];
        }

        function drawOutlinedText(
          txt: string,
          x: number,
          y: number,
          alignH = LEFT,
          alignV = BASELINE,
          size = 14,
          bold = false
        ){
          push();
          blendMode(BLEND);
          if (drawingContext) { drawingContext.shadowBlur = 0; drawingContext.shadowColor = 'rgba(0,0,0,0)'; }
          textAlign(alignH, alignV);
          textSize(size);
          textStyle(bold ? BOLD : NORMAL);
          noStroke();
          fill(0);           text(txt, x+1, y); text(txt, x-1, y); text(txt, x, y+1); text(txt, x, y-1);
          fill(255,255,255); text(txt, x, y);
          pop();
        }

        function drawScoreboard(){
          const margin = UI.margin;
          const w = 240;
          const barH = UI.statBarH;
          const gap = 6;
          const pad = UI.barPad;

          const x = width - margin - w;
          let y = margin + 20;

          drawOutlinedText('Scoreboard', x + w/2, y, CENTER, BASELINE, 22, true);
          y += 12;

          const rows = [];
          for (let i=0;i<tanks.length;i++){
            const t = tanks[i]; if (!t) continue;
            const name = t.isBot ? (t.name || `${teamNameCap(t.teamIdx)} Bot`) : 'You';
            const score = Math.floor(t.xp || 0);
            rows.push({ t, name, score });
          }
          rows.sort((a,b)=> b.score - a.score);
          const maxScore = Math.max(1, rows[0]?.score || 1);

          for (let i=0;i<rows.length;i++){
            const { t, name, score } = rows[i];
            const frac = Math.min(1, score / maxScore);
            const col = TEAM_TANK_COLORS[TEAMS[t.teamIdx].name];

            noStroke(); fill(...COLORS.barBg); rect(x, y, w, barH, UI.barOuterR);
            const ix = x + pad, iy = y + pad, iw = w - pad*2, ih = barH - pad*2;
            fill(40,40,40,140); rect(ix, iy, iw, ih, UI.barInnerR);
            fill(...col); rect(ix, iy, iw * frac, ih, UI.barInnerR);

            drawOutlinedText(`${name} — ${formatShort(score)}`, x + w/2, y + barH/2 + 1, CENTER, CENTER, 12, true);
            y += barH + gap;
          }
        }

        function drawEventMessages(dt: number){
          for (let i=eventMessages.length-1;i>=0;i--){
            eventMessages[i].ttl -= dt;
            if (eventMessages[i].ttl <= 0) eventMessages.splice(i,1);
          }
          const startX = UI.margin + 6;
          const startY = 56;
          let y = startY;
          const line = 16;
          for (let i=0;i<eventMessages.length;i++){
            drawOutlinedText(eventMessages[i].text, startX, y, LEFT, BASELINE, 14);
            y += line;
          }
        }

        let eventBanner: null | { text: string, ttl: number } = null;
        function pushEventMessage(txt: string, ttl = 2.6) {
          eventBanner = { text: txt, ttl };
        }

        function drawEventBanner(dt: number){
          if (!eventBanner) return;
          eventBanner.ttl -= dt;
          if (eventBanner.ttl <= 0){ eventBanner = null; return; }
        
          const msg = eventBanner.text;
          const pad = 12, h = 28;
          textSize(16); textStyle(BOLD);
          const tw = (textWidth ? textWidth(msg) : 160) + pad*2;
          const w = Math.min(tw, width - 40);
          const x = (width - w) / 2;
          const y = 36;
        
          noStroke();
          fill(...COLORS.fpsPanelBg);
          rect(x, y, w, h, 10);
        
          textAlign(CENTER, CENTER);
          fill(...COLORS.fpsText);
          text(msg, x + w/2, y + h/2 + 1);
        }

        const BASE_NO_SPAWN_PAD = 240;
        const CENTER_RING_R = 820;
        const CENTER_CORE_R = 380;

        function moveLevelFactor(level) { return 1 - 0.30 * (level - 1) / (LEVEL_CAP - 1); }

        const BASE_FOV = 1000;
        const MAX_FOV  = 1300;

        function radiusForLevel(L:number){
          return 26 + 0.15 * Math.max(0, ((L|0) - 1));
        }
        function updateTankRadius(t:any){
          t.r = radiusForLevel(t.level|0);
        }
        function fovForTank(t:any){
          const fromSize  = (t.r - 26) * 3;
          const fromLevel = (Math.sqrt(Math.max(1, t.level|0)) - 1) * 80;
          return Math.min(MAX_FOV, BASE_FOV + fromSize + fromLevel);
        }
        function inFOV(t:any, x:number, y:number){
          const r = fovForTank(t); const dx = x - t.x, dy = y - t.y;
          return (dx*dx + dy*dy) <= r*r;
        }
        function isShapeAliveRef(s:any){
          const i = shapes.indexOf(s);
          return i >= 0 && !S_dead[i] && !S_dying[i] && !s.invincible && s.hp > 0;
        }
        function mouseWorld():[number,number]{
          const z = cam.zoom || 1;
          return [cam.x - (width/(2*z)) + mouseX / z, cam.y - (height/(2*z)) + mouseY / z];
        }
        function screenScale(){ return 1 / (cam?.zoom || 1); }
        function expLerp(cur: number, target: number, rate: number, step: number = FIXED_H){
          const alpha = 1 - Math.exp(-rate * step);
          return cur + (target - cur) * alpha;
        }

        let player, cam, bullets = [], shapes = [];

        const DEBUG = true;
        const DEBUG_NO_BOTS = true;

        const debugShapes = {
          spawned: 0,
          killed: 0,
          aliveSet: new Set<number>(),
          lastReportT: 0,
          logSpawn(sh: any) {
            this.spawned++;
            this.aliveSet.add(sh.id);
            console.log('[SPAWN]', { id: sh.id, type: sh.type, x: Math.round(sh.x), y: Math.round(sh.y), hp: sh.hp });
          },
          logKill(sh: any, reason: string) {
            this.killed++;
            this.aliveSet.delete(sh.id);
            console.log('[KILL]',  { id: sh.id, type: sh.type, reason, x: Math.round(sh.x), y: Math.round(sh.y) });
          },
          logDisappear(shId: number, reason: string) {
            if (this.aliveSet.has(shId)) {
              this.aliveSet.delete(shId);
              this.killed++;
              console.warn('[VANISH]', { id: shId, reason });
            }
          },
          report(nowT: number) {
            if (nowT - this.lastReportT >= 1.0) {
              this.lastReportT = nowT;
              const current = this.aliveSet.size;
              const diff = current - this.spawned;
              console.log('[REPORT]', { spawned: this.spawned, killed: this.killed, current, diff });
            }
          }
        };

        let S_CAP = 4096;
        let S_x = new Float32Array(S_CAP);
        let S_y = new Float32Array(S_CAP);
        let S_vx = new Float32Array(S_CAP);
        let S_vy = new Float32Array(S_CAP);
        let S_r = new Float32Array(S_CAP);
        let S_hp = new Float32Array(S_CAP);
        let S_hpVis = new Float32Array(S_CAP);
        let S_dead = new Uint8Array(S_CAP);
        let S_dying = new Uint8Array(S_CAP);
        let S_body = new Int16Array(S_CAP);
        let S_team = new Int16Array(S_CAP);
        let S_type = new Uint8Array(S_CAP);
        let S_visStamp = new Int32Array(S_CAP);
        let _nbrMark = new Int32Array(S_CAP);
        let _nbrStamp = 1;

        let S_minCX = new Int16Array(S_CAP);
        let S_minCY = new Int16Array(S_CAP);
        let S_maxCX = new Int16Array(S_CAP);
        let S_maxCY = new Int16Array(S_CAP);

        S_team.fill(-1);
        S_minCX.fill(-1);
        S_minCY.fill(-1);
        S_maxCX.fill(-1);
        S_maxCY.fill(-1);

        let shapeFree = [];

        let B_CAP = 8192;
        let B_owner = new Int32Array(B_CAP);
        let B_x = new Float32Array(B_CAP);
        let B_y = new Float32Array(B_CAP);
        let B_vx = new Float32Array(B_CAP);
        let B_vy = new Float32Array(B_CAP);
        let B_r = new Float32Array(B_CAP);
        let B_hp = new Float32Array(B_CAP);
        let B_life = new Float32Array(B_CAP);
        let B_dmg = new Float32Array(B_CAP);
        let B_dead = new Uint8Array(B_CAP);
        let B_dying = new Uint8Array(B_CAP);
        let B_team = new Int16Array(B_CAP);
        let B_dieT = new Float32Array(B_CAP);
        let bulletFree = [];
        let nextBulletIdx = 0;

        function ensureShapeCapacity(n){
          if (n <= S_CAP) return;
          let cap = 1; while (cap < n) cap <<= 1;

          function gF32(a){ const b=new Float32Array(cap); b.set(a); return b; }
          function gU8(a){ const b=new Uint8Array(cap); b.set(a); return b; }
          function gI16(a){ const b=new Int16Array(cap); b.set(a); return b; }
          function gI32(a){ const b=new Int32Array(cap); b.set(a); return b; }

          S_visStamp = gI32(S_visStamp);

          S_x = gF32(S_x); S_y = gF32(S_y); S_vx = gF32(S_vx); S_vy = gF32(S_vy);
          S_r = gF32(S_r); S_hp = gF32(S_hp); S_hpVis = gF32(S_hpVis);
          S_dead = gU8(S_dead); S_dying = gU8(S_dying);

          S_body = gI16(S_body); S_team = gI16(S_team); S_type = gU8(S_type);

          const nMinCX = new Int16Array(cap); nMinCX.set(S_minCX); S_minCX = nMinCX;
          const nMinCY = new Int16Array(cap); nMinCY.set(S_minCY); S_minCY = nMinCY;
          const nMaxCX = new Int16Array(cap); nMaxCX.set(S_maxCX); S_maxCX = nMaxCX;
          const nMaxCY = new Int16Array(cap); nMaxCY.set(S_maxCY); S_maxCY = nMaxCY;

          for (let i=S_CAP;i<cap;i++){ S_team[i] = -1; S_minCX[i] = -1; S_minCY[i] = -1; S_maxCX[i] = -1; S_maxCY[i] = -1; }
          _nbrMark = new Int32Array(cap);
          S_CAP = cap;
        }

        function ensureBulletCapacity(n){
          if (n <= B_CAP) return;
          let cap = 1; while (cap < n) cap <<= 1;
          const b1 = new Float32Array(cap); b1.set(B_x); B_x = b1;
          const b2 = new Float32Array(cap); b2.set(B_y); B_y = b2;
          const b3 = new Float32Array(cap); b3.set(B_vx); B_vx = b3;
          const b4 = new Float32Array(cap); b4.set(B_vy); B_vy = b4;
          const b5 = new Float32Array(cap); b5.set(B_r); B_r = b5;
          const b6 = new Float32Array(cap); b6.set(B_hp); B_hp = b6;
          const b7 = new Float32Array(cap); b7.set(B_life); B_life = b7;
          const b8 = new Float32Array(cap); b8.set(B_dmg); B_dmg = b8;
          const b9 = new Uint8Array(cap); b9.set(B_dead); B_dead = b9;
          const b10 = new Uint8Array(cap); b10.set(B_dying); B_dying = b10;
          const b11 = new Int16Array(cap); b11.set(B_team); B_team = b11;
          const b12 = new Float32Array(cap); b12.set(B_dieT); B_dieT = b12;
          const b13 = new Int32Array(cap); b13.set(B_owner); B_owner = b13;
          B_CAP = cap;
        }

        function allocShapeIndex(){
          if (shapeFree.length) return shapeFree.pop();
          const idx = shapes.length;
          ensureShapeCapacity(idx + 1);
          return idx;
        }

        function allocBulletIndex(){
          if (bulletFree.length) return bulletFree.pop();
          const idx = nextBulletIdx++;
          ensureBulletCapacity(idx + 1);
          return idx;
        }

        function shapeTypeCode(k){ if(k==='sqr')return 1; if(k==='tri')return 2; if(k==='pent')return 3; if(k==='dia')return 4; if(k==='hex')return 5; return 0; }

        let _gridTile;
        let _gridPattern = null;

        function _ensureGridTile(){
          if (_gridTile) return;
          const c = document.createElement('canvas');
          c.width = GRID_SPACING; c.height = GRID_SPACING;
          const g = c.getContext('2d');
          g.clearRect(0,0,c.width,c.height);
          g.strokeStyle = `rgba(${COLORS.gridMinor},${COLORS.gridMinor},${COLORS.gridMinor},0.8)`;
          g.lineWidth = 1;
          g.beginPath();
          g.moveTo(0.5, 0); g.lineTo(0.5, GRID_SPACING);
          g.moveTo(0, 0.5); g.lineTo(GRID_SPACING, 0.5);
          g.stroke();
          _gridTile = c;
        }

        let bulletPool = new Pool();
        let input = { ix: 0, iy: 0, firing: false };
        let nextShapeId = 1;
        let now = 0;
        let dFrame = null;
        let hexRespawnCooldown = 0, hexEverDied = false;
        let hexAlive = 0;
        const COLL_CELL = 64;
        const ACTIVE_PAD = 220;

        const GRID_W = Math.ceil(WORLD.w / COLL_CELL);
        const GRID_H = Math.ceil(WORLD.h / COLL_CELL);
        const CELL_COUNT = GRID_W * GRID_H;

        let cellHead = new Int32Array(CELL_COUNT); cellHead.fill(-1);
        let nodeNext = new Int32Array(1024);
        let nodeShape = new Int32Array(1024);
        let nodeCell  = new Int32Array(1024);
        let nodeCount = 0;
        let freeNodeHead = -1;

        let _cellStamp = new Int32Array(CELL_COUNT);
        let _curStamp = 1;

        let _neighborBuf = [];
        let _visibleBuf = [];
        let _visStamp = 0;

        let _binSqr = new Int32Array(256);
        let _binTri = new Int32Array(256);
        let _binPent = new Int32Array(256);
        let _binDia = new Int32Array(256);
        let _binHex = new Int32Array(256);

        function _roundPow2(n){ let x=1; while(x<n) x<<=1; return x; }
        function _ensureBinCapacity(n){
          if (_binSqr.length >= n) return;
          const cap = _roundPow2(n);
          _binSqr = new Int32Array(cap);
          _binTri = new Int32Array(cap);
          _binPent = new Int32Array(cap);
          _binDia = new Int32Array(cap);
          _binHex = new Int32Array(cap);
        }

        function collectVisibleIndices(minX, minY, maxX, maxY){
          _visibleBuf.length = 0;
          _visStamp++;
          const minCX = Math.max(0, (minX / COLL_CELL) | 0);
          const maxCX = Math.min(GRID_W - 1, (maxX / COLL_CELL) | 0);
          const minCY = Math.max(0, (minY / COLL_CELL) | 0);
          const maxCY = Math.min(GRID_H - 1, (maxY / COLL_CELL) | 0);
          for (let cx=minCX; cx<=maxCX; cx++){
            for (let cy=minCY; cy<=maxCY; cy++){
              const ci = cx*GRID_H + cy;
              let n = cellHead[ci];
              while (n !== -1){
                const idx = nodeShape[n]|0;
                if (S_dead[idx]===0){
                  if (S_visStamp[idx] !== _visStamp){ S_visStamp[idx] = _visStamp; _visibleBuf.push(idx); }
                }
                n = nodeNext[n];
              }
            }
          }
          return _visibleBuf;
        }

        function neighborIndices(x,y){
          const cx = (x / COLL_CELL) | 0;
          const cy = (y / COLL_CELL) | 0;
          _neighborBuf.length = 0;
          _nbrStamp++;
          for(let dx=-1; dx<=1; dx++){
            for(let dy=-1; dy<=1; dy++){
              const ci = cellIndexClamped(cx+dx, cy+dy);
              if (ci < 0) continue;
              let n = cellHead[ci];
              while (n !== -1){
                const si = nodeShape[n];
                if (_nbrMark[si] !== _nbrStamp){ _nbrMark[si] = _nbrStamp; _neighborBuf.push(si); }
                n = nodeNext[n];
              }
            }
          }
          return _neighborBuf;
        }

        function cellIndexClamped(cx,cy){ if(cx<0||cy<0||cx>=GRID_W||cy>=GRID_H) return -1; return cx*GRID_H + cy; }

        function worldCellRange(x,y,r){
          const minCX = Math.max(0, ((x - r) / COLL_CELL) | 0);
          const maxCX = Math.min(GRID_W - 1, ((x + r) / COLL_CELL) | 0);
          const minCY = Math.max(0, ((y - r) / COLL_CELL) | 0);
          const maxCY = Math.min(GRID_H - 1, ((y + r) / COLL_CELL) | 0);
          return [minCX,minCY,maxCX,maxCY];
        }

        function ensureNodeCapacity(add){
          const need = nodeCount + add;
          if (need <= nodeNext.length) return;
          let cap = nodeNext.length; while (cap < need) cap <<= 1;
          const nN = new Int32Array(cap); nN.set(nodeNext); nodeNext = nN;
          const nS = new Int32Array(cap); nS.set(nodeShape); nodeShape = nS;
          const nC = new Int32Array(cap); nC.set(nodeCell);  nodeCell  = nC;
        }

        function allocNode(){
          if (freeNodeHead !== -1){ const n=freeNodeHead; freeNodeHead=nodeNext[n]; return n; }
          ensureNodeCapacity(1); return nodeCount++;
        }

        function freeNode(n){ nodeNext[n]=freeNodeHead; freeNodeHead=n; }

        function gridInsertRange(i, minCX, minCY, maxCX, maxCY){
          const span = (maxCX - minCX + 1) * (maxCY - minCY + 1);
          ensureNodeCapacity(span);
          for (let cx=minCX; cx<=maxCX; cx++){
            for (let cy=minCY; cy<=maxCY; cy++){
              const ci = cx*GRID_H + cy;
              const n = allocNode();
              nodeShape[n] = i;
              nodeCell[n] = ci;
              nodeNext[n] = cellHead[ci];
              cellHead[ci] = n;
            }
          }
          S_minCX[i]=minCX; S_minCY[i]=minCY; S_maxCX[i]=maxCX; S_maxCY[i]=maxCY;
        }

        function gridRemoveRange(i, minCX, minCY, maxCX, maxCY){
          for (let cx=minCX; cx<=maxCX; cx++){
            for (let cy=minCY; cy<=maxCY; cy++){
              const ci = cx*GRID_H + cy;
              let head = cellHead[ci], prev = -1, n = head;
              while (n !== -1){
                const nxt = nodeNext[n];
                if (nodeShape[n] === i){
                  if (prev === -1) head = nxt; else nodeNext[prev] = nxt;
                  freeNode(n);
                } else prev = n;
                n = nxt;
              }
              cellHead[ci] = head;
            }
          }
          S_minCX[i]=S_minCY[i]=S_maxCX[i]=S_maxCY[i]=-1;
        }

        function gridMaybeUpdateShape(i){
          const s = shapes[i];
          const x = s.x, y = s.y, r = s.r;
          const minCX = Math.max(0, ((x - r) / COLL_CELL) | 0);
          const maxCX = Math.min(GRID_W - 1, ((x + r) / COLL_CELL) | 0);
          const minCY = Math.max(0, ((y - r) / COLL_CELL) | 0);
          const maxCY = Math.min(GRID_H - 1, ((y + r) / COLL_CELL) | 0);
          const o0=S_minCX[i], o1=S_minCY[i], o2=S_maxCX[i], o3=S_maxCY[i];
          if (o0===minCX && o1===minCY && o2===maxCX && o3===maxCY) return;
          if (o0 !== -1) gridRemoveRange(i,o0,o1,o2,o3);
          gridInsertRange(i,minCX,minCY,maxCX,maxCY);
        }

        function gridRemoveShape(i){
          const o0=S_minCX[i]; if (o0 !== -1) gridRemoveRange(i,o0,S_minCY[i],S_maxCX[i],S_maxCY[i]);
        }

        function gridInit(){
          cellHead.fill(-1);
          nodeCount = 0;
          freeNodeHead = -1;
        }

        const PLAYER_PAIR_BASE = 268435456;
        const FIXED_H = 1/144;
        let _accum = 0;
        let physicsFrame = 0;
        const COOLDOWN_FRAMES = 22;

        const PAIR_TABLE_BITS = 18;
        const PAIR_TABLE_SIZE = 1 << PAIR_TABLE_BITS;
        const PAIR_TABLE_MASK = PAIR_TABLE_SIZE - 1;
        const _pairKeys = new Int32Array(PAIR_TABLE_SIZE);
        const _pairVals = new Int32Array(PAIR_TABLE_SIZE);

        function hash32(x){ x|=0; x ^= x>>>16; x = (x*0x7feb352d)|0; x ^= x>>>15; x = (x*0x846ca68b)|0; x ^= x>>>16; return x|0; }
        function hashPair(k){ const hi = (k/4294967296)|0; const lo = k|0; let h = hash32(hi ^ lo); if (h===0) h = 1; return h; }

        function canPair(k){
          const h = hashPair(k);
          let idx = h & PAIR_TABLE_MASK;
          for (let p=0;p<8;p++){
            const key = _pairKeys[idx];
            if (key===0) return true;
            if (key===h){
              const s = _pairVals[idx]|0;
              return physicsFrame - s > COOLDOWN_FRAMES;
            }
            idx = (idx+1) & PAIR_TABLE_MASK;
          }
          return true;
        }

        function markPair(k){
          const h = hashPair(k);
          let idx = h & PAIR_TABLE_MASK;
          for (let p=0;p<8;p++){
            const key = _pairKeys[idx];
            if (key===0 || key===h){
              _pairKeys[idx]=h;
              _pairVals[idx]=physicsFrame;
              return;
            }
            idx = (idx+1) & PAIR_TABLE_MASK;
          }
          _pairKeys[idx]=h;
          _pairVals[idx]=physicsFrame;
        }

        function bulletPairKey(a:number,b:number){
          const lo = a < b ? a : b;
          const hi = a < b ? b : a;
          return (0x60000000 ^ ((lo * 65537) + hi)) | 0;
        }
        function canPairBullet(a:number,b:number){ return canPair(bulletPairKey(a,b)); }
        function markPairBullet(a:number,b:number){ markPair(bulletPairKey(a,b)); }

        const POLY_UNIT = {};
        function unitPoly(sides){
          let v = POLY_UNIT[sides];
          if (v) return v;
          v = [];
          for (let i=0;i<sides;i++){
            const a = -HALF_PI + i*TAU/sides;
            v.push([Math.cos(a), Math.sin(a)]);
          }
          POLY_UNIT[sides] = v;
          return v;
        }

        const DECAY_RECOIL = Math.exp(-12*FIXED_H);
        const DECAY_PLAYER_DRAG = Math.exp(-3*FIXED_H);
        const DECAY_BULLET_DYING = Math.exp(-8*FIXED_H);
        const DECAY_SHAPE_VEL = Math.exp(-6*FIXED_H);

        const MAX_SHAPE_KNOCKBACK_V = 240;

        let autoShoot = false, autoSpin = false;
        const SPIN_SPEED = 1.8;
        const BULLET_DECEL_K = 0.0012;

        let deathBtnRect = null;
        let blockShootUntilRelease = false;
        let liveCounts = { outer:{sqr:0,tri:0,pent:0}, ring:{sqr:0,tri:0,pent:0}, core:{pent:0} };
        let _cursorState = null;
        let _rvoTmp = [0,0];

        function setup() {
          pixelDensity(1);
          const { w, h } = hostSize();
          updateVirtualFromHost();
          createCanvas(w, h);
          const onKeyDown = (e: KeyboardEvent) => {
            if (!allowFSKey(e.key)) { e.preventDefault(); e.stopPropagation(); }
            const code = KEY(e);
            if (!keyDown.get(code)) {
              keyDown.set(code, true);
              edgeQueue.add(code);
            }
          };
          
          const onKeyUp = (e: KeyboardEvent) => {
            if (!allowFSKey(e.key)) { e.preventDefault(); e.stopPropagation(); }
            const code = KEY(e);
            keyDown.set(code, false);
            edgeQueue.delete(code);
          };
          
          const clearKeys = () => {
            keyDown.clear();
            edgeQueue.clear();
          };
          
          (p.canvas as HTMLCanvasElement).addEventListener('keydown', onKeyDown);
          (p.canvas as HTMLCanvasElement).addEventListener('keyup', onKeyUp);
          window.addEventListener('blur', clearKeys);
          (p.canvas as HTMLCanvasElement).tabIndex = 0;
          try { (p.canvas as HTMLCanvasElement).focus(); } catch {}
          
          (p.canvas as HTMLCanvasElement).style.outline = 'none';
          (p.canvas as HTMLCanvasElement).style.userSelect = 'none';
          (p.canvas as HTMLCanvasElement).style.caretColor = 'transparent';

          p.canvas.addEventListener('mousedown', () => { try { (p.canvas as HTMLCanvasElement).focus(); } catch {} });

          const host = hostEl();
          (globalThis as any).__p5hostEl = host;

          ro = new ResizeObserver(() => {
            const { w, h } = hostSize();
            resizeCanvas(w, h);
            updateVirtualFromHost();
          });
          ro.observe(host);

          const _remove = p.remove.bind(p);
          p.remove = () => {
            try { ro?.disconnect(); } catch {}
            try {
              (p.canvas as HTMLCanvasElement).removeEventListener('keydown', onKeyDown);
              (p.canvas as HTMLCanvasElement).removeEventListener('keyup', onKeyUp);
              window.removeEventListener('blur', clearKeys);
            } catch {}
            _remove();
          };
          (globalThis as any).__p5hostEl = hostEl() as HTMLElement;
          p.canvas.style.display = 'block';
          p.canvas.style.maxWidth = '100%';
          p.canvas.style.maxHeight = '100%';
          
          textFont("monospace");
          textSize(12);
          frameRate(144);

          player = makePlayer();
          player.name = "You";
          player.uid = nextTankId++;
          tanks = [player];
          const _plRef = { x:0, y:0, r:0, getRadiusScaled(){ return this.r; } };
          spawner = new Spawner({
            world:{ w: WORLD.w, h: WORLD.h },
            gridSize: GRID_SPACING,
            polygonWeights: [0.55,0.35,0.10],
            maxHexagons: 2,
            minDistFromPlayer: 240,
            crasherEqualsNest: true,
            maxPlacementAttempts: 12,
            budgets:{ rates:{ polygons:6, nest:3, crashers:0.75, respawns:1 }, caps:{ polygons:6, nest:3, crashers:4, respawns:1 } },
            rng: Math.random,
            getPlayer: ()=>{ _plRef.x = player.x; _plRef.y = player.y; _plRef.r = player.r; _plRef.dead = player.isDead; return _plRef; },
            factory:{
              createPolygon: (type, pos)=>{ const k=type===0?'sqr':type===1?'tri':'pent'; addShape(k,pos.x,pos.y); },
              createNestPolygon: (type, pos)=>{ const k=type===3?'hex':'pent'; addShape(k,pos.x,pos.y); },
              createCrasher: (pos, elite)=>{ const r=elite?24:18; addShape('dia',pos.x,pos.y,{ ai:'seek', seekSpd:260, r, isCrasher:true, rvo:true }); },
              createEnemy: (q,pos)=>{ return true; }
            }
          });
          spawner.reset();
          assignRandomTeam();
          spawnAtTeamBase();
          spawnBotsToFillTeams();

          cam = { x: player.x, y: player.y, vx: 0, vy: 0 };

          initBaseProtectors();
          protectorLocks = [];
          for (let i=0;i<TEAMS.length;i++) protectorLocks[i] = {};
          gridInit();
          ensureNodeCapacity(30000);
          _ensureGridTile();
          _ensureBinCapacity(4096);
          _visibleBuf = new Array(4096);
          _visibleBuf.length = 0;
          _gridPattern = drawingContext.createPattern(_gridTile, 'repeat');
        }

        function windowResized() {
          const { w, h } = hostSize();
          resizeCanvas(w, h);
          updateVirtualFromHost();
        }

        function draw() {
          const dtActual = deltaTime / 1000;
          const dtFrame = Math.min(0.03, dtActual);
          _accum = Math.min(0.25, _accum + dtFrame);
          handleInput();

          while (_accum >= FIXED_H) {
            stepPhysics(FIXED_H);
            physicsFrame++;
            _accum -= FIXED_H;
          }

          if (!dFrame) dFrame = derived(player);

          fpsAccum += dtActual; fpsFrames++;
          if (fpsAccum >= 0.5) { fpsShown = Math.round(fpsFrames / fpsAccum); fpsAccum = 0; fpsFrames = 0; }

          background(COLORS.bg);

          push();
          translate(width/2, height/2);
          scale(cam.zoom || 1);
          translate(-cam.x, -cam.y);
        
          const z = cam.zoom || 1;
          const minX = cam.x - (width  / (2*z)), minY = cam.y - (height / (2*z));
          const maxX = cam.x + (width  / (2*z)), maxY = cam.y + (height / (2*z));

          drawWorld(minX, minY, maxX, maxY);
          drawShapes(minX, minY, maxX, maxY);
          drawBullets(minX, minY, maxX, maxY);
          drawPlayer();
          drawBots();

          pop();

          drawMinimap();
          drawScoreBar();
          drawXPBar();
          drawStatsPanel();
          drawFPS();
          drawEventBanner(dtFrame);
          drawScoreboard();
          if (player.isDead) {
          if (_cursorState !== 'none') { noCursor(); _cursorState = 'none'; }
            drawDeathScreen();
          } else {
            if (_cursorState !== 'arrow') { cursor(ARROW); _cursorState = 'arrow'; }
          }
        }

        function tickSpawnGrace(dt: number) {
          for (let i = 0; i < shapes.length; i++) {
            const sh = shapes[i];
            if (!sh || sh.dead || sh.dying) continue;
            if (sh.spawnGrace && sh.spawnGrace > 0) {
              sh.spawnGrace = Math.max(0, sh.spawnGrace - dt);
            }
          }
        }

        function stepPhysics(h){
          if (spawner) { _spawnerAccum += h; if (_spawnerAccum >= 0.05) { spawner.update(_spawnerAccum); _spawnerAccum = 0; } }
          updateShapes(h);
          updatePlayer(h);
          updateBots(h);
          handleTankTankCollisions(h);
          dFrame = derived(player);
          handleShooting(h);
          updateBullets(h);
          updateCamera(h);
          now += h;
        }

        function relaxOverlapSingle(sh, limit){
          const idx = neighborIndices(sh.x, sh.y);
          let applied=0;
          for(let n=0;n<idx.length && applied<limit; n++){
            const o = shapes[idx[n]];
            if (!o || o===sh || o.dead || o.dying) continue;
            const dx = sh.x - o.x, dy = sh.y - o.y;
            const min = sh.r + o.r + 2;
            const d2 = dx*dx + dy*dy;
            if (d2>0 && d2<min*min){
              const d = Math.sqrt(d2);
              const nx = dx/(d||1), ny = dy/(d||1);
        
              const isProtector = (sh.ai === 'protector');
              const pushMul = isProtector ? 1.6 : 1.0;
              const impMul  = isProtector ? 1.4 : 1.0;
        
              const push = (min - d)*0.5 * pushMul;
              sh.kx  += nx * push; sh.ky  += ny * push;
              sh.kvx += nx * 220 * impMul; sh.kvy += ny * 220 * impMul;
              applied++;
            }
          }
        }

        function makePlayer() {
          return {
            x: WORLD.w/2, y: WORLD.h/2, r: radiusForLevel(1),
            vx: 0, vy: 0,
            lastHit: -1e9, hitTimer: 0,

            reloadTimer: 0,
            recoilX: 0, recoilY: 0,

            level: 1, xp: 0, statPoints: 0,
            stats: { regen:0,maxHP:0,bodyDmg:0,bulletSpd:0,penetration:0,bulletDmg:0,reload:0,moveSpd:0 },
            hp: -1,
            _hpInit: false,
            hpVis: 0,
            barrelKick: 0,
            barrelAng: 0,

            teamIdx: 0,
            isDead: false,
            lifeStartTime: 0,
            lastDamagedBy: null,
            deathInfo: null,
            invincible: false
          };
        }

        function ensurePlayerHPInit() {
          if (!player._hpInit) {
            const d = derived(player);
            player.hp = d.maxHP;
            player.hpVis = player.hp;
            player.lifeStartTime = now;
            player._hpInit = true;
          }
        }

        function getTeamBaseRect(idx){
          const t = TEAMS[idx].key, s = TEAM_BASE_SIZE;
          if (t === 'tl') return { x: 0, y: 0, w: s, h: s };
          if (t === 'tr') return { x: WORLD.w - s, y: 0, w: s, h: s };
          if (t === 'bl') return { x: 0, y: WORLD.h - s, w: s, h: s };
          return { x: WORLD.w - s, y: WORLD.h - s, w: s, h: s };
        }

        function getTeamBaseCenter(idx){
          const r = getTeamBaseRect(idx);
          return { x: r.x + r.w/2, y: r.y + r.h/2 };
        }

        function assignRandomTeam(){ player.teamIdx = Math.floor(random(TEAMS.length)); }

        function spawnAtTeamBase(){
          const r = getTeamBaseRect(player.teamIdx);
          const m = player.r + 40;
          player.x = random(r.x + m, r.x + r.w - m);
          player.y = random(r.y + m, r.y + r.h - m);
          const d = derived(player);
          player.hp = d.maxHP;
          player.hpVis = player.hp;
          player._hpInit = true;
          player.isDead = false;
          player.lifeStartTime = now;
          player.lastDamagedBy = null;
          player.deathInfo = null;
          player.invincible = true;
          autoShoot = false;
        }

        function killerLabel(k: any){
          if (typeof k === 'string' && k.startsWith('tankuid:')) {
            const uid = (+k.split(':')[1])|0;
            const t = getTankByUid(uid);
            return (t && t.name) ? t.name : 'enemy tank';
          }
          if (typeof k === 'string' && k.startsWith('protector:')) {
            const idx = (+k.split(':')[1])|0;
            const name = (TEAMS[idx] && TEAMS[idx].name) ? TEAMS[idx].name : 'unknown';
            return name + ' protectors';
          }
          if (typeof k === 'string' && k.startsWith('tank:')) {
            const idx = (+k.split(':')[1])|0;
            const name = (TEAMS[idx] && TEAMS[idx].name) ? TEAMS[idx].name : 'unknown';
            return name + ' bot';
          }
          if (k === 'bullet') return 'an enemy bullet';
          if (k === 'tri') return 'triangle';
          if (k === 'sqr') return 'square';
          if (k === 'pent') return 'pentagon';
          if (k === 'dia') return 'diamond';
          if (k === 'hex') return 'hexagon';
          return 'unknown';
        }

        function awardKillXPPayload(victim:any, killerUid:number){
          if (!killerUid) return;
          const killer = getTankByUid?.(killerUid);
          if (!killer || killer.isDead) return;
        
          const baseXP   = Math.max(0, Math.floor((victim?.xp ?? 0)));
          const gained   = Math.max(0, Math.floor(baseXP * 0.65));
          if (gained <= 0) return;
          killer.xp = Math.max(0, (killer.xp|0) + gained);
        }

        function onPlayerDeath(k){
          player.isDead = true;
        
          let killerUid = 0;
          if (typeof k === 'string' && k.startsWith('tankuid:')) {
            killerUid = (+k.split(':')[1])|0;
          }
          if (killerUid) awardKillXPPayload(player, killerUid);
        
          const start = (player.lifeStartTime ?? now);
          const alive = Math.max(0, now - start);
        
          player.deathInfo = {
            killer: killerLabel(k),
            score: Math.floor(player.xp),
            level: player.level,
            time: alive,
          };
        
          if (killerUid) {
            const t = getTankByUid(killerUid);
            if (t && t.name) pushEventMessage(`${t.name} killed You`);
          }
          input.firing = false;
          autoShoot = false;
        }

        function onBotDeath(bot: any, killerUid?: number){
          bot.isDead = true;
        
          if (!killerUid && typeof bot.lastDamagedBy === 'string' && bot.lastDamagedBy.startsWith('tankuid:')) {
            killerUid = (+bot.lastDamagedBy.split(':')[1])|0;
          }
        
          if (killerUid) awardKillXPPayload(bot, killerUid);
        
          const start = (bot.lifeStartTime ?? now);
          const alive = Math.max(0, now - start);
          bot.deathInfo = {
            killer: killerUid ? (getTankByUid(killerUid)?.name || 'enemy tank') : (bot.lastDamagedBy || 'unknown'),
            score: Math.floor(bot.xp || 0),
            level: bot.level || 1,
            time: alive,
          };
        
          respawnTankCommon(bot);
        }

        function levelFromXP(xp){
          let L = 1;
          while (L < LEVEL_CAP && xp >= xpToLevel(L)) L++;
          return L;
        }

        function computeRespawnLevel(level){
          const loss = (level < LEVEL_LOSS_THRESHOLD) ? LEVEL_LOSS_BELOW : LEVEL_LOSS_AT_OR_ABOVE;
          return Math.max(1, (level|0) - loss);
        }

        function calcStatPointsForLevel(level){
          let pts = 0;
          for (let L = 2; L <= level; L++) {
            if (L <= 28) pts++;
            else if (L === 30) pts++;
            else if (L > 30 && ((L - 30) % 3 === 0)) pts++;
          }
          return pts;
        }
        
        function respawnTankCommon(t){
          const newLevel = computeRespawnLevel(t.level|0);
          t.level = newLevel;
          updateTankRadius(t);
          t.xp = xpToLevel(newLevel - 1);
          t.stats = { regen:0,maxHP:0,bodyDmg:0,bulletSpd:0,penetration:0,bulletDmg:0,reload:0,moveSpd:0 };
          t.statPoints = calcStatPointsForLevel(newLevel);
          spawnTankAtTeamBase(t);
        }

        function calcStatPointsForLevel(level){
          let pts = 0;
          for (let L = 2; L <= level; L++) {
            if (L <= 28) pts++;
            else if (L === 30) pts++;
            else if (L > 30 && ((L - 30) % 3 === 0)) pts++;
          }
          return pts;
        }

        const STAT_KEYS = ['regen','maxHP','bodyDmg','bulletSpd','penetration','bulletDmg','reload','moveSpd'] as const;

        function statLabel(k: typeof STAT_KEYS[number]) {
          switch (k) {
            case 'regen': return 'Regen';
            case 'maxHP': return 'Max HP';
            case 'bodyDmg': return 'Body Dmg';
            case 'bulletSpd': return 'Bullet Speed';
            case 'penetration': return 'Penetration';
            case 'bulletDmg': return 'Bullet Damage';
            case 'reload': return 'Reload';
            case 'moveSpd': return 'Move Speed';
          }
        }

        function spendStatByIndex(d: number) {
          const idx = d - 1;
          const key = STAT_KEYS[idx];
          if (!player || player.isDead) return;
          if (player.statPoints <= 0) { pushEventMessage('No stat points'); return; }
          if (player.stats[key] >= 7) { pushEventMessage(`${statLabel(key)} is maxed`); return; }
          player.stats[key]++; 
          player.statPoints--;
          pushEventMessage(`+1 ${statLabel(key)} (${player.stats[key]}/7)`);
        }

        function derived(p) {
          const baseHP = 50 + 2 * (p.level - 1);
          const maxHP = baseHP + MAX_HP_BONUS[p.stats.maxHP];
          const regenRate = REGEN_RATE[p.stats.regen];

          const levelSlow = moveLevelFactor(p.level);
          const maxSpeed = (420 + p.stats.moveSpd * 40) * levelSlow;
          const accel    = (900  + p.stats.moveSpd * 100) * levelSlow;

          const reload = RELOAD_SEC[p.stats.reload];

          const bulletSpeed = 360 + p.stats.bulletSpd * 50;

          const bulletDamage = BULLET_DMG[p.stats.bulletDmg];
          const bulletHP = BULLET_HP[p.stats.penetration];

          const bodyHitShape = BODY_HIT_SHAPE[p.stats.bodyDmg];

          return { maxHP, regenRate, accel, maxSpeed, reload, bulletSpeed, bulletDamage, bulletHP, bodyHitShape };
        }

        function handleInput() {
          if (player.isDead) { input.ix = 0; input.iy = 0; input.firing = false; return; }

          if (justPressed(70)) {
            toggleCanvasFullscreen();
          }
          
          if (justPressed(69)) {
            autoShoot = !autoShoot;
            blockShootUntilRelease = false;
            if (autoShoot) {
              input.firing = true;
              player.reloadTimer = 0;
              player.invincible = false;
            } else {
              input.firing = mouseIsPressed;
            }
            pushEventMessage(`Auto-shoot ${autoShoot ? 'ON' : 'OFF'}`);
          }
          
          if (justPressed(67)) {
            autoSpin = !autoSpin;
            if (autoSpin) player.invincible = false;
            pushEventMessage(`Auto-rotate ${autoSpin ? 'ON' : 'OFF'}`);
          }
          
          for (let i = 0; i < 8; i++) {
            if (justPressed(DIGITS_1_8[i])) {
              spendStatByIndex(i + 1);
            }
          }

          let ix = 0, iy = 0;
          if (KD(65) || KD(LEFT_ARROW))  ix -= 1;
          if (KD(68) || KD(RIGHT_ARROW)) ix += 1;
          if (KD(87) || KD(UP_ARROW))    iy -= 1;
          if (KD(83) || KD(DOWN_ARROW))  iy += 1;

          const len = Math.hypot(ix, iy);
          if (len > 0) { ix /= len; iy /= len; }

          const mouseFire = mouseIsPressed && !blockShootUntilRelease;
          input.ix = ix; input.iy = iy;
          input.firing = mouseFire || autoShoot;

          if (player.invincible && (len > 0 || input.firing)) player.invincible = false;
        }

        function updatePlayer(dt) {
          if (player.isDead) {
            const hpAnimSpd = 14;
            player.hpVis += (player.hp - player.hpVis) * Math.min(1, hpAnimSpd * dt);
            player.barrelKick *= Math.exp(-12 * dt);
            const [wx, wy] = mouseWorld();
            const mouseAng = Math.atan2(wy - player.y, wx - player.x);
            if (autoSpin) {
              player.barrelAng += SPIN_SPEED * dt;
              if (player.barrelAng > TAU) player.barrelAng -= TAU;
            } else {
              player.barrelAng = mouseAng;
            }
            return;
          }

          ensurePlayerHPInit();
          const d = derived(player);

          player.vx += input.ix * d.accel * dt;
          player.vy += input.iy * d.accel * dt;

          player.vx += player.recoilX;
          player.vy += player.recoilY;
          player.recoilX *= DECAY_RECOIL; player.recoilY *= DECAY_RECOIL;
          player.vx *= DECAY_PLAYER_DRAG; player.vy *= DECAY_PLAYER_DRAG;
          player.barrelKick *= DECAY_RECOIL;

          const sp = Math.hypot(player.vx, player.vy);
          if (sp > d.maxSpeed) { const s = d.maxSpeed / sp; player.vx *= s; player.vy *= s; }

          player.x = constrain(player.x + player.vx * dt, player.r, WORLD.w - player.r);
          player.y = constrain(player.y + player.vy * dt, player.r, WORLD.h - player.r);

          const sinceHit = now - player.lastHit;
          const wasTankHit = typeof player.lastDamagedBy === 'string' && player.lastDamagedBy.startsWith('tankuid:');
          const inTankCombat = wasTankHit && sinceHit < TANK_COMBAT_COOLDOWN;

          let regenMul = 1;
          if (sinceHit > HYPER_REGEN_AFTER) {
            regenMul = HYPER_REGEN_MULT;
          } else if (inTankCombat) {
            regenMul = 0;
          }

          if (regenMul > 0 && player.hp < d.maxHP) {
            const amt = d.maxHP * d.regenRate * regenMul * dt;
            player.hp = Math.min(player.hp + amt, d.maxHP);
          }
          if (player.hitTimer > 0) player.hitTimer -= dt;

          const hpAnimSpd = 14;
          player.hpVis += (player.hp - player.hpVis) * Math.min(1, hpAnimSpd * dt);

          const [wx, wy] = mouseWorld();
          const mouseAng = Math.atan2(wy - player.y, wx - player.x);
          if (autoSpin) {
            player.barrelAng += SPIN_SPEED * dt;
            if (player.barrelAng > TAU) player.barrelAng -= TAU;
          } else {
            player.barrelAng = mouseAng;
          }

          const idx = neighborIndices(player.x, player.y);
          const maxContacts = Math.min(idx.length, 24);
          for (let n=0; n<maxContacts; n++){
            const sh = shapes[idx[n]];
            if (!sh || sh.dead || sh.dying) continue;

            const dx = sh.x - player.x, dy = sh.y - player.y;
            const rsum = player.r + sh.r;
            const d2 = dx*dx + dy*dy;
            if (d2 <= 0 || d2 >= rsum*rsum) continue;

            const friendlyProtector = (sh.ai === 'protector' && sh.teamIdx === player.teamIdx);
            if (friendlyProtector) continue;

            const key = PLAYER_PAIR_BASE + idx[n];

            const dist = Math.sqrt(d2);
            const nx = dx / (dist || 1), ny = dy / (dist || 1);
            const overlap = (rsum - dist);

            const corr = (overlap + 1.5) * 0.6;
            player.x -= nx * corr * 0.5; player.y -= ny * corr * 0.5;
            sh.kx += nx * corr * 0.5;    sh.ky += ny * 0.5 * corr;

            const impulse = (overlap + 1.5) * 40;
            player.vx -= nx * impulse; player.vy -= ny * impulse;
            const pvs = Math.hypot(player.vx, player.vy);
            const maxPKnock = d.maxSpeed * 1.3;
            if (pvs > maxPKnock) { const s = maxPKnock / pvs; player.vx *= s; player.vy *= s; }

            const mass = sh.type === 'hex' ? 0.2 : 1.0;
            sh.kvx += nx * impulse * mass; sh.kvy += ny * impulse * mass;
            const kvs = Math.hypot(sh.kvx, sh.kvy);
            if (kvs > MAX_SHAPE_KNOCKBACK_V) { const s = MAX_SHAPE_KNOCKBACK_V / kvs; sh.kvx *= s; sh.kvy *= s; }

            if (canPair(key)) {
              if (!sh.invincible && !(sh.spawnGrace && sh.spawnGrace > 0)) {
                sh.hp -= d.bodyHitShape;
                sh.lastHit = now; sh.hitTimer = 0.04; sh.hitTimer2 = 0.08;
                if (sh.hp <= 0) killShape(sh, player);
              } else {
                if (sh.ai === 'protector' && sh.teamIdx !== undefined) {
                  sh.lastHit = now; sh.hitTimer = 0.04; sh.hitTimer2 = 0.08;
                }
              }
              if (!player.invincible) {
                player.hp -= sh.body;
                player.lastDamagedBy = (sh.ai === 'protector' && sh.teamIdx !== undefined) ? ('protector:' + sh.teamIdx) : sh.type;
                player.lastHit = now;
                player.hitTimer = 0.04;
              }
              markPair(key);
            }
          }

          while (player.level < LEVEL_CAP && player.xp >= xpToLevel(player.level)) {
            player.level++;
            updateTankRadius(player);
            if (player.level <= 28) player.statPoints++;
            else if (player.level === 30) player.statPoints++;
            else if (player.level > 30 && ((player.level - 30) % 3 === 0)) player.statPoints++;
            player.hp = Math.min(player.hp + 10, derived(player).maxHP);
          }

          if (player.hp <= 0 && !player.isDead) onPlayerDeath(player.lastDamagedBy);
        }

        function rvoAdjust(sh, desx, desy){
          if (sh.ai === 'protector') {
            const eps = 120;
            const len = Math.hypot(desx, desy) || 1;
            _rvoTmp[0] = desx + (desx/len) * eps;
            _rvoTmp[1] = desy + (desy/len) * eps;
            return _rvoTmp;
          }
          let ax=0, ay=0;
          const vx = desx, vy = desy;
          const idx = neighborIndices(sh.x, sh.y);
          for (let n=0;n<idx.length;n++){
            const j = idx[n];
            const o = shapes[j];
            if (!o || o===sh || o.dead || o.dying) continue;
            if (!(o.ai==='seek' || o.ai==='protector' || o.isCrasher)) continue;
            const dx = o.x - sh.x, dy = o.y - sh.y;
            const dist = Math.hypot(dx,dy);
            const same = (sh.teamIdx !== undefined && sh.teamIdx === o.teamIdx);
            const rad = sh.r + o.r + (same ? 20 : 40);
            if (dist > rad) continue;
            const rvx = (o.vx||0) - (sh.vx||0);
            const rvy = (o.vy||0) - (sh.vy||0);
            if (dx*rvx + dy*rvy >= 0) continue;
            const side = Math.sign(vx*dy - vy*dx) || (Math.random()<0.5?1:-1);
            const mag = (rad - dist)/rad;
            ax += -vy * 1200 * mag * side;
            ay +=  vx * 1200 * mag * side;
          }
          _rvoTmp[0] = desx + ax;
          _rvoTmp[1] = desy + ay;
          return _rvoTmp;
        }

        function handleShooting(dt) {
          if (player.isDead) return;
          if (player.invincible && input.firing) player.invincible = false;
          const d = dFrame;
          player.reloadTimer -= dt;
          if (input.firing && player.reloadTimer <= 0) {
            const baseAng = player.barrelAng;
            const barrelLen = player.r * 2;
            const barrelW   = player.r * 0.68;
            const bR = barrelW / 2;
            const inner = player.r * 0.12;
            const muzzleOffset = inner + barrelLen - bR;
            const spread = 0.08;
            const fireAng = baseAng + random(-spread, spread);
            const vx = Math.cos(fireAng) * d.bulletSpeed;
            const vy = Math.sin(fireAng) * d.bulletSpeed;
            let bx = player.x + Math.cos(fireAng)*muzzleOffset;
            let by = player.y + Math.sin(fireAng)*muzzleOffset;
            {
              const idx = neighborIndices(bx, by);
              for (let n=0;n<idx.length;n++){
                const si = idx[n]|0;
                if ((S_dead[si]|S_dying[si])!==0) continue;
                const sx=S_x[si], sy=S_y[si], sr=S_r[si] + bR;
                const dx=bx - sx, dy=by - sy;
                const d2 = dx*dx + dy*dy;
                if (d2 < sr*sr){
                  const d = Math.sqrt(d2) || 1;
                  const ux = dx/d, uy = dy/d;
                  bx = sx + ux * (sr + 0.01);
                  by = sy + uy * (sr + 0.01);
                }
              }
            }

            const b = bulletPool.acquire(()=> ({}));
            const bi = allocBulletIndex();

            b._bi = bi;
            b.x = bx; b.y = by;
            b.vx = vx; b.vy = vy;
            b.life = 2.0; b.hp = d.bulletHP; b.dmg = d.bulletDamage; b.r = bR;
            b.dying = false; b.deathTimer = 0; b.dead = false;
            b.fromTeamIdx = player.teamIdx;
            bullets.push(b);

            B_x[bi] = bx; B_y[bi] = by; B_vx[bi] = vx; B_vy[bi] = vy;
            B_life[bi] = 2.0; B_hp[bi] = d.bulletHP; B_dmg[bi] = d.bulletDamage; B_r[bi] = bR;
            B_team[bi] = player.teamIdx; B_dead[bi] = 0; B_dying[bi] = 0;
            B_owner[bi] = player.uid | 0;
            B_dieT[bi] = 0;

            const K = 0.0085; player.recoilX -= (vx) * K; player.recoilY -= (vy) * K;
            player.barrelKick = Math.min(1, player.barrelKick + 0.7);
            player.reloadTimer = d.reload;
          }
        }

        function handleTankTankCollisions(dt:number){
          for (let i=0;i<tanks.length;i++){
            const a = tanks[i]; if (!a || a.isDead) continue;
            for (let j=i+1;j<tanks.length;j++){
              const b = tanks[j]; if (!b || b.isDead) continue;
              const dx = b.x - a.x, dy = b.y - a.y;
              const rs = (a.r||0) + (b.r||0);
              const d2 = dx*dx + dy*dy;
              if (d2 <= 0 || d2 >= rs*rs) continue;
              const d = Math.sqrt(d2) || 1, nx = dx/d, ny = dy/d;
              const overlap = (rs - d);
              const push = (overlap + 1.5) * 0.55;
              a.x -= nx * push * 0.5; a.y -= ny * push * 0.5;
              b.x += nx * push * 0.5; b.y += ny * push * 0.5;
              const imp = (overlap + 1.5) * 36;
              a.vx -= nx * imp; a.vy -= ny * imp;
              b.vx += nx * imp; b.vy += ny * imp;
              if ((a.teamIdx|0) !== (b.teamIdx|0)){
                const da = derived(a).bodyHitShape, db = derived(b).bodyHitShape;
                if (!a.invincible){ a.hp -= db; a.lastDamagedBy = 'tankuid:' + (b.uid|0); a.lastHit = now; a.hitTimer = 0.04; }
                if (!b.invincible){ b.hp -= da; b.lastDamagedBy = 'tankuid:' + (a.uid|0); b.lastHit = now; b.hitTimer = 0.04; }
              }
            }
          }
        }

        function collideTankWithShapes(t: any, d: ReturnType<typeof derived>) {
          if (!t || t.isDead) return;
          const idx = neighborIndices(t.x, t.y);
          const maxContacts = Math.min(idx.length, 24);
        
          for (let n=0; n<maxContacts; n++) {
            const si = idx[n]|0;
            if ((S_dead[si]|S_dying[si])!==0) continue;
        
            const sh = shapes[si];
            if (!sh || sh.dead || sh.dying) continue;
        
            const friendlyProtector = (sh.ai === 'protector' && (sh.teamIdx|0) === (t.teamIdx|0));
            if (friendlyProtector) continue;
        
            const dx = sh.x - t.x, dy = sh.y - t.y;
            const rsum = (t.r||0) + (sh.r||0);
            const d2 = dx*dx + dy*dy;
            if (d2 <= 0 || d2 >= rsum*rsum) continue;
        
            const dist = Math.sqrt(d2) || 1;
            const nx = dx / dist, ny = dy / dist;
            const overlap = (rsum - dist);
        
            const corr = (overlap + 1.5) * 0.6;
            t.x -= nx * corr * 0.5; t.y -= ny * corr * 0.5;
            sh.kx += nx * corr * 0.5; sh.ky += ny * 0.5 * corr;
        
            const impulse = (overlap + 1.5) * 40;
            t.vx = (t.vx||0) - nx * impulse;
            t.vy = (t.vy||0) - ny * impulse;
        
            const mass = sh.type === 'hex' ? 0.2 : 1.0;
            sh.kvx = (sh.kvx||0) + nx * impulse * mass;
            sh.kvy = (sh.kvy||0) + ny * impulse * mass;
        
            const kvs = Math.hypot(sh.kvx, sh.kvy);
            if (kvs > MAX_SHAPE_KNOCKBACK_V) {
              const s = MAX_SHAPE_KNOCKBACK_V / kvs; sh.kvx *= s; sh.kvy *= s;
            }
        
            if (!friendlyProtector) {
              const bodyHitShape = d.bodyHitShape;
              if (!sh.invincible && !(sh.spawnGrace && sh.spawnGrace > 0)) {
                sh.hp -= bodyHitShape;
                sh.lastHit = now; sh.hitTimer = 0.04; sh.hitTimer2 = 0.08;
                if (sh.hp <= 0) killShape(sh, t);
              } else if (sh.ai === 'protector') {
                sh.lastHit = now; sh.hitTimer = 0.04; sh.hitTimer2 = 0.08;
              }
            
              if (!t.invincible) {
                t.hp -= (sh.body|0);
                t.lastDamagedBy = (sh.ai === 'protector' && sh.teamIdx !== undefined)
                  ? ('protector:' + (sh.teamIdx|0))
                  : sh.type || 'shape';
                t.lastHit = now;
                t.hitTimer = 0.04;
              }
            }
          }
        }

        function segmentCircleTOI(x0,y0,x1,y1,cx,cy,R){
          const dx = x1 - x0, dy = y1 - y0;
          const fx = x0 - cx, fy = y0 - cy;
          const a = dx*dx + dy*dy;
          const b = 2*(fx*dx + fy*dy);
          const c = fx*fx + fy*fy - R*R;
          const disc = b*b - 4*a*c;
          if (a === 0 || disc < 0) return null;
          const s = Math.sqrt(disc);
          const t1 = (-b - s)/(2*a);
          if (t1 >= 0 && t1 <= 1) return t1;
          const t2 = (-b + s)/(2*a);
          if (t2 >= 0 && t2 <= 1) return t2;
          return null;
        }

        function gridMarchSegment(x0,y0,x1,y1, cs, visit){
          let cx = (x0 / cs) | 0;
          let cy = (y0 / cs) | 0;
          const tx = x1 - x0, ty = y1 - y0;
          const stepX = tx > 0 ? 1 : (tx < 0 ? -1 : 0);
          const stepY = ty > 0 ? 1 : (ty < 0 ? -1 : 0);
          const invTx = tx !== 0 ? 1/tx : 0;
          const invTy = ty !== 0 ? 1/ty : 0;
          const nextBoundX = stepX > 0 ? (cx+1)*cs : cx*cs;
          const nextBoundY = stepY > 0 ? (cy+1)*cs : cy*cs;
          let tMaxX = stepX !== 0 ? (nextBoundX - x0) * invTx : Infinity;
          let tMaxY = stepY !== 0 ? (nextBoundY - y0) * invTy : Infinity;
          const tDeltaX = stepX !== 0 ? (cs * Math.abs(invTx)) : Infinity;
          const tDeltaY = stepY !== 0 ? (cs * Math.abs(invTy)) : Infinity;
          let t = 0;
          _curStamp++;
          let ci = cellIndexClamped(cx,cy);
          if (ci >= 0 && _cellStamp[ci] !== _curStamp){ _cellStamp[ci] = _curStamp; visit(cx,cy); }
          while (t <= 1){
            if (tMaxX < tMaxY){ cx += stepX; t = tMaxX; tMaxX += tDeltaX; }
            else { cy += stepY; t = tMaxY; tMaxY += tDeltaY; }
            ci = cellIndexClamped(cx,cy);
            if (ci >= 0 && _cellStamp[ci] !== _curStamp){ _cellStamp[ci] = _curStamp; visit(cx,cy); }
            if (t > 1) break;
          }
        }

        let _gm_ox=0,_gm_oy=0,_gm_ex=0,_gm_ey=0,_gm_minSegX=0,_gm_maxSegX=0,_gm_minSegY=0,_gm_maxSegY=0,_gm_bestT=Infinity,_gm_bestIdx=-1,_gm_bi=0;
        function _gm_visit(gx,gy){
          for (let dx=-1; dx<=1; dx++){
            for (let dy=-1; dy<=1; dy++){
              const ci = cellIndexClamped(gx+dx, gy+dy);
              if (ci < 0) continue;
              let n = cellHead[ci];
              while (n !== -1){
                const si = nodeShape[n];
                if (!(S_dead[si] | S_dying[si])){
                  const sx = S_x[si], sy = S_y[si], sr = S_r[si] + B_r[_gm_bi];
                  if (sx + sr >= _gm_minSegX && sx - sr <= _gm_maxSegX && sy + sr >= _gm_minSegY && sy - sr <= _gm_maxSegY){
                    if (!(shapes[si] && shapes[si].ai === 'protector' && S_team[si] === (B_team[_gm_bi] | 0))){
                      const R = S_r[si] + B_r[_gm_bi];
                      const t = segmentCircleTOI(_gm_ox,_gm_oy, _gm_ex,_gm_ey, sx, sy, R);
                      if (t !== null && t < _gm_bestT) { _gm_bestT = t; _gm_bestIdx = si; }
                    }
                  }
                }
                n = nodeNext[n];
              }
            }
          }
        }

        function updateBullets(dt) {
          const bulletBins = new Map<number, number[]>();
          for (let j = 0; j < bullets.length; j++) {
            const bi = bullets[j]._bi|0;
            if (B_dead[bi] || B_dying[bi]) continue;
            const cx = (B_x[bi] / COLL_CELL) | 0;
            const cy = (B_y[bi] / COLL_CELL) | 0;
            const key = (cx<<16) | (cy & 0xFFFF);
            let arr = bulletBins.get(key);
            if (!arr){ arr = []; bulletBins.set(key, arr); }
            arr.push(bi);
          }

          function forEachBulletInAABB(minX:number, minY:number, maxX:number, maxY:number, cb:(bj:number)=>void){
            const minCX = (((minX / COLL_CELL) | 0) - 1);
            const maxCX = (((maxX / COLL_CELL) | 0) + 1);
            const minCY = (((minY / COLL_CELL) | 0) - 1);
            const maxCY = (((maxY / COLL_CELL) | 0) + 1);
            const seen = new Set<number>();
            for (let cx=minCX; cx<=maxCX; cx++){
              for (let cy=minCY; cy<=maxCY; cy++){
                const key = (cx<<16) | (cy & 0xFFFF);
                const arr = bulletBins.get(key); if (!arr) continue;
                for (let k=0;k<arr.length;k++){
                  const bj = arr[k]|0;
                  if (!seen.has(bj)) { seen.add(bj); cb(bj); }
                }
              }
            }
          }

          for (let j = 0; j < bullets.length; j++) {
            const bi = bullets[j]._bi|0;
            if (B_dead[bi]) continue;

            if (B_dying[bi]) {
              B_dieT[bi] -= dt;
              B_x[bi] += B_vx[bi] * dt; B_y[bi] += B_vy[bi] * dt;
              B_vx[bi] *= DECAY_BULLET_DYING; B_vy[bi] *= DECAY_BULLET_DYING;
              if (B_dieT[bi] <= 0) { B_dead[bi] = 1; bulletFree.push(bi); }
              continue;
            }

            B_life[bi] -= dt;
            if (B_life[bi] <= 0) { B_dying[bi] = 1; B_dieT[bi] = 0.18; continue; }

            const x0 = B_x[bi], y0 = B_y[bi];
            const x1 = x0 + B_vx[bi] * dt, y1 = y0 + B_vy[bi] * dt;

            let ox = x0, oy = y0;
            const vxTot = x1 - x0, vyTot = y1 - y0;
            let remaining = 1.0;
            let processed = 0;

            while (remaining > 1e-6 && processed < 6 && !B_dying[bi]) {
              const ex = x0 + vxTot * remaining;
              const ey = y0 + vyTot * remaining;
            
              const minSegX = Math.min(ox, ex) - B_r[bi];
              const maxSegX = Math.max(ox, ex) + B_r[bi];
              const minSegY = Math.min(oy, ey) - B_r[bi];
              const maxSegY = Math.max(oy, ey) + B_r[bi];
            
              _gm_bi = bi; _gm_ox = ox; _gm_oy = oy; _gm_ex = ex; _gm_ey = ey;
              _gm_minSegX = minSegX; _gm_maxSegX = maxSegX; _gm_minSegY = minSegY; _gm_maxSegY = maxSegY;
              _gm_bestT = Infinity; _gm_bestIdx = -1;
            
              gridMarchSegment(ox,oy, ex,ey, COLL_CELL, _gm_visit);
            
              let bestTankT = Infinity, bestTank = null;
              const bTeam = B_team[bi] | 0;
              for (let ti=0; ti<tanks.length; ti++){
                const tt = tanks[ti];
                if (!tt || tt.isDead || tt.invincible) continue;
                if ((tt.teamIdx|0) === bTeam) continue;
                const R = (tt.r || 0) + B_r[bi];
                if (tt.x + R < minSegX || tt.x - R > maxSegX || tt.y + R < minSegY || tt.y - R > maxSegY) continue;
                const tHit = segmentCircleTOI(ox,oy, ex,ey, tt.x,tt.y, R);
                if (tHit !== null && tHit < bestTankT){ bestTankT = tHit; bestTank = tt; }
              }
            
              const bestShapeT = _gm_bestT;
              const bestShapeIdx = _gm_bestIdx;

              let bestBulletT = Infinity, bestBulletIdx = -1;
              forEachBulletInAABB(minSegX, minSegY, maxSegX, maxSegY, (bj)=>{
                if (bj === bi) return;
                if (B_dead[bj] || B_dying[bj]) return;
                if ((B_team[bj]|0) === (B_team[bi]|0)) return;
                const R = B_r[bi] + B_r[bj];
                const tHit = segmentCircleTOI(ox,oy, ex,ey, B_x[bj], B_y[bj], R);
                if (tHit !== null && tHit < bestBulletT) { bestBulletT = tHit; bestBulletIdx = bj; }
              });
            
              let hitKind = null;
              if (bestBulletIdx >= 0 && bestBulletT <= 1 && bestBulletT <= bestShapeT && bestBulletT <= bestTankT) hitKind = 'bullet';
              else if (bestTank && bestTankT <= 1 && bestTankT <= bestShapeT) hitKind = 'tank';
              else if (bestShapeIdx >= 0 && bestShapeT <= 1) hitKind = 'shape';
            
              if (hitKind === 'shape') {
                const hx = ox + (ex - ox) * bestShapeT;
                const hy = oy + (ey - oy) * bestShapeT;
                const sh = shapes[bestShapeIdx];
                const dx = hx - sh.x, dy = hy - sh.y;
                const dist = Math.hypot(dx,dy) || 1;
                const nx = dx / dist, ny = dy / dist;
            
                const base = S_body[bestShapeIdx] | 0;
                const effMul = Math.min(1, B_hp[bi] / base);
                const dealt = B_dmg[bi] * effMul;

                if (sh.spawnGrace && sh.spawnGrace > 0) {
                  const segLen = Math.hypot(ex - ox, ey - oy) * bestShapeT;
                  const f = Math.max(0, 1 - BULLET_DECEL_K * segLen);
                  B_vx[bi] *= f; B_vy[bi] *= f;
              
                  B_x[bi] = hx; B_y[bi] = hy;
              
                  const remFrac = remaining * (1 - bestShapeT);
                  remaining = remFrac;
                  ox = B_x[bi] + nx * 0.8;
                  oy = B_y[bi] + ny * 0.8;
                  processed++;
                  continue;
                }
            
                if (!sh.invincible) {
                  sh.hp -= dealt; sh.lastHit = now; sh.hitTimer = 0.04; sh.hitTimer2 = 0.08;
                } else {
                  if (sh.ai === 'protector' && sh.teamIdx !== (B_team[bi] ?? -1)) {
                    sh.lastHit = now; sh.hitTimer = 0.04; sh.hitTimer2 = 0.08;
                  }
                }
            
                B_hp[bi] -= base;
            
                const mass = sh.type === 'hex' ? 0.2 : 1.0;
                const impulse = 28 * mass;
                sh.kvx -= nx * impulse; sh.kvy -= ny * impulse;
                const kvs = Math.hypot(sh.kvx, sh.kvy);
                if (kvs > MAX_SHAPE_KNOCKBACK_V) { const s = MAX_SHAPE_KNOCKBACK_V / kvs; sh.kvx *= s; sh.kvy *= s; }
            
                if (!sh.invincible && sh.hp <= 0) {
                  const ownerUid = B_owner[bi] | 0;
                  const ownerTank = ownerUid ? getTankByUid(ownerUid) : null;
                  killShape(sh, ownerTank);
                }
            
                const segLen = Math.hypot(ex - ox, ey - oy) * bestShapeT;
                const f = Math.max(0, 1 - BULLET_DECEL_K * segLen);
                B_vx[bi] *= f; B_vy[bi] *= f;
            
                B_x[bi] = hx; B_y[bi] = hy;
            
                if (B_hp[bi] <= 0) { B_dying[bi] = 1; B_dieT[bi] = 0.18; break; }
            
                const remFrac = remaining * (1 - bestShapeT);
                remaining = remFrac;
                ox = B_x[bi] + nx * 0.8;
                oy = B_y[bi] + ny * 0.8;
            
                processed++;
              } else if (hitKind === 'tank') {
                const hx = ox + (ex - ox) * bestTankT;
                const hy = oy + (ey - oy) * bestTankT;
                const tt = bestTank;
                const dx = hx - tt.x, dy = hy - tt.y;
                const dist = Math.hypot(dx,dy) || 1;
                const nx = dx / dist, ny = dy / dist;
            
                {
                  const owner = getTankByUid(B_owner[bi]|0);
                  if (tt.invincible) tt.invincible = false;
                
                  tt.hp -= B_dmg[bi];
                  tt.lastDamagedBy = owner ? ('tankuid:' + (owner.uid|0)) : 'bullet';
                  tt.lastHit = now;
                  tt.hitTimer = 0.04;
                
                  const kvImp = 26;
                  tt.vx = (tt.vx||0) - nx * kvImp; tt.vy = (tt.vy||0) - ny * kvImp;
                }
            
                B_x[bi] = hx; B_y[bi] = hy;
                B_hp[bi] = 0; B_dying[bi] = 1; B_dieT[bi] = 0.18;
            
                const remFrac = remaining * (1 - bestTankT);
                remaining = remFrac;
                ox = B_x[bi]; oy = B_y[bi];
                processed++;
              } else if (hitKind === 'bullet') {
                const hx = ox + (ex - ox) * bestBulletT;
                const hy = oy + (ey - oy) * bestBulletT;
                const bj = bestBulletIdx|0;
              
                if (canPairBullet(bi, bj)) {
                  const hpA = B_hp[bi], hpB = B_hp[bj];
              
                  B_x[bi] = hx; B_y[bi] = hy;
                  const segLen = Math.hypot(ex - ox, ey - oy) * bestBulletT;
                  const f = Math.max(0, 1 - BULLET_DECEL_K * segLen);
                  B_vx[bi] *= f; B_vy[bi] *= f;
              
                  B_hp[bi] = hpA - hpB;
                  B_hp[bj] = hpB - hpA;
              
                  if (B_hp[bi] <= 0) { B_dying[bi] = 1; B_dieT[bi] = 0.18; }
                  if (B_hp[bj] <= 0) { B_dying[bj] = 1; B_dieT[bj] = 0.18; }
              
                  markPairBullet(bi, bj);
                }
              
                const remFrac = remaining * (1 - bestBulletT);
                remaining = remFrac;
                ox = B_x[bi]; oy = B_y[bi];
                processed++;
              } else {
                const segLen = Math.hypot(ex - ox, ey - oy);
                const f = Math.max(0, 1 - BULLET_DECEL_K * segLen);
                B_vx[bi] *= f; B_vy[bi] *= f;
                B_x[bi] = ex; B_y[bi] = ey;
                remaining = 0;
              }
            }

            if (B_x[bi] < 0 || B_y[bi] < 0 || B_x[bi] > WORLD.w || B_y[bi] > WORLD.h) { B_dying[bi] = 1; B_dieT[bi] = 0.18; }
          }

          let n=0;
          for (let j=0;j<bullets.length;j++){
            const bi = bullets[j]._bi|0;
            if (!B_dead[bi]) { bullets[n++] = bullets[j]; }
            else { bulletPool.release(bullets[j]); }
          }
          bullets.length = n;
        }

        function addShape(kind, x, y, opts={}) {
          const def = SHAPES_DEF[kind];
          const sides = kind==='tri'?3:kind==='sqr'?4:kind==='pent'?5:kind==='hex'?6:4;
          const sh = {
            id: nextShapeId++,
            type: kind, sides,
            active: 0,
            col: (opts.col || def.color).slice(),
            colBorder: [Math.max(0, Math.floor((opts.col || def.color)[0]*0.72)), Math.max(0, Math.floor((opts.col || def.color)[1]*0.72)), Math.max(0, Math.floor((opts.col || def.color)[2]*0.72))],
            colInner: lighten((opts.col || def.color), 0.12),
            r: opts.r || def.r,
            cx: x, cy: y,
            theta: random(TAU),
            orbitSpd: def.orbitSpd, orbitR: def.orbitR,
            rot: random(TAU), rotSpd: def.rotSpd,
            kx:0, ky:0, kvx:0, kvy:0,
            hp: def.hp, maxHp: def.hp, body: def.body, xp: def.xp,
            lastHit: -1e9, hitTimer: 0, hitTimer2: 0, dying: false, deathTimer: 0, dead: false, hpVis: def.hp
          };
          if (!opts || !opts.forceNoShiny) {
            if ((kind === 'sqr' || kind === 'tri' || kind === 'pent') && Math.random() < SHINY_CHANCE) {
              sh.shiny = true;
              sh.col = COLORS.shapeShiny.slice();
              sh.colBorder = [
                Math.max(0, Math.floor(sh.col[0]*0.72)),
                Math.max(0, Math.floor(sh.col[1]*0.72)),
                Math.max(0, Math.floor(sh.col[2]*0.72))
              ];
              sh.colInner = lighten(sh.col, 0.12);
              sh.hp     *= SHINY_XP_HP_MULT;
              sh.maxHp  *= SHINY_XP_HP_MULT;
              sh.xp     *= SHINY_XP_HP_MULT;
            }
          }
          if (opts.invincible) sh.invincible = true;
          if (opts.ai) {
            sh.ai = opts.ai; sh.seekSpd = opts.seekSpd || 200;
            sh.vx = 0; sh.vy = 0; sh.aiAccel = opts.aiAccel || 1400; sh.friction = 6.0;
            sh.state = 'idle'; sh.stateTimer = 0;
            sh.orbitSpd = 0; sh.orbitR = 0; sh.theta = 0;
            sh.frFactor = Math.exp(-(sh.friction||6.0) * FIXED_H);
            sh.aiKSeek = 1 - Math.exp(-(sh.aiAccel||1400) * FIXED_H / ((sh.seekSpd||200)||1));
            if (sh.ai === 'protector') {
              if (opts.baseCenter && (opts.homeTheta !== undefined) && (opts.homeR !== undefined)) {
                const bc = opts.baseCenter;
                sh.homeX = bc.x + Math.cos(opts.homeTheta) * opts.homeR;
                sh.homeY = bc.y + Math.sin(opts.homeTheta) * opts.homeR;
              }
              const a = (sh.aiAccel||1800);
              sh.aiK1000 = 1 - Math.exp(-a * FIXED_H / 1000);
              sh.aiK520  = 1 - Math.exp(-a * FIXED_H / 520);
              sh.aiK320  = 1 - Math.exp(-a * FIXED_H / 320);
              sh.aiK1    = 1 - Math.exp(-a * FIXED_H / 1);
            }
          } else {
            sh.wobbleA = def.orbitSpd * random(0.2,0.9);
            sh.wobbleF = random(0.4,1.2);
            sh.phase = random(TAU);
            sh.orbitSpd = def.orbitSpd * random(0.8,1.4) * (random()<0.5?-1:1);
            sh.jamp = 22;
            sh.jfx = random(0.6,1.0);
            sh.jfy = random(0.6,1.0);
            sh.jphx = random(TAU);
            sh.jphy = random(TAU);
          }
          if (opts.teamIdx !== undefined) sh.teamIdx = opts.teamIdx;
          if (opts.baseCenter) sh.baseCenter = opts.baseCenter;
          if (opts.homeTheta !== undefined) sh.homeTheta = opts.homeTheta;
          if (opts.homeR !== undefined) sh.homeR = opts.homeR;
          if (opts.limitR !== undefined) sh.limitR = opts.limitR;
          if (opts.idleOmega !== undefined) sh.idleOmega = opts.idleOmega;
          if (opts.isCrasher) sh.isCrasher = true;
          sh.x = sh.cx + Math.cos(sh.theta)*sh.orbitR;
          sh.y = sh.cy + Math.sin(sh.theta)*sh.orbitR;
          const reg = regionFor(x,y);
          sh.spawnRegion = reg;
          if (shouldCount(kind, reg) && !(opts && opts.invincible) && !(opts && opts.ai)) {
            if (reg==='outer') liveCounts.outer[kind]++; else if (reg==='ring') liveCounts.ring[kind]++; else if (reg==='core' && kind==='pent') liveCounts.core.pent++;
          }
          const idx = allocShapeIndex();
          shapes[idx] = sh;
          S_x[idx] = sh.x;
          S_y[idx] = sh.y;
          S_vx[idx] = sh.vx || 0;
          S_vy[idx] = sh.vy || 0;
          S_r[idx] = sh.r;
          S_hp[idx] = sh.hp;
          S_hpVis[idx] = sh.hpVis;
          S_dead[idx] = 0;
          S_dying[idx] = 0;
          S_body[idx] = sh.body|0;
          S_team[idx] = (sh.teamIdx ?? -1)|0;
          S_type[idx] = shapeTypeCode(kind);
          S_visStamp[idx] = 0;

          { const cr = worldCellRange(sh.x, sh.y, sh.r||0); gridInsertRange(idx, cr[0], cr[1], cr[2], cr[3]); }
          if (kind === 'hex') hexAlive++;

          sh.spawnAt = now || 0;
          sh.spawnGrace = 0.35;
          sh.hp = Math.max(1, sh.hp | 0);
          sh.maxHp = Math.max(sh.hp, sh.maxHp | 0);
          S_hp[idx] = sh.hp;
          S_hpVis[idx] = sh.hp;
          if (DEBUG) debugShapes.logSpawn(sh);
          return sh;
        }

        function expelNearbyShapes(sh){
          for (const o of shapes){
            if (o === sh || o.dead || o.dying) continue;
            const dx = o.x - sh.x, dy = o.y - sh.y;
            const d = Math.hypot(dx,dy) || 1;
            const min = sh.r * 2.2 + o.r;
            if (d < min){
              const nx = dx/d, ny = dy/d;
              const overlap = (min - d);
              const imp = 260 + overlap * 140;
              o.kvx += nx * imp; o.kvy += ny * imp;
              o.kx  += nx * overlap * 0.6; o.ky  += ny * overlap * 0.6;
            }
          }
        }

        function spawnShapes() {
          shapeFree.length = 0;
          shapes.length = 0; nextShapeId = 1;
          let hexDesiredMax = 2;
          let centerDiaCooldown = 0;
          let desiredCounts = null;
          hexRespawnCooldown = 0; hexEverDied = false;
          liveCounts = { outer:{sqr:0,tri:0,pent:0}, ring:{sqr:0,tri:0,pent:0}, core:{pent:0} };

          const cx = WORLD.w/2, cy = WORLD.h/2;

          function inNoSpawn(x,y){
            for (let i=0;i<TEAMS.length;i++){
              const r = getTeamBaseRect(i), p = BASE_NO_SPAWN_PAD;
              if (x >= r.x - p && x <= r.x + r.w + p && y >= r.y - p && y <= r.y + r.h + p) {
                if (random() < 0.92) return true;
              }
            }
            return false;
          }
          function ringDist(x,y){ return dist(x,y,cx,cy); }

          function farFromNeighbors(x,y,minSep){
            for (const s of shapes){
              if (s.dead) continue;
              const d = dist(x,y,s.cx,s.cy);
              if (d < minSep + s.r*0.7) return false;
            }
            return true;
          }

          function tryPlace(kind, region, optR, minSep=0) {
            let x,y,ok=false;
            const def = SHAPES_DEF[kind];
            const sep = minSep || def.r*2.1;
            for (let t=0;t<80;t++){
              x = random(120, WORLD.w-120);
              y = random(120, WORLD.h-120);
              if (inNoSpawn(x,y)) continue;
              const d = ringDist(x,y);
              if (region==='outer' && d > CENTER_RING_R) ok = true;
              else if (region==='ring' && d > CENTER_CORE_R && d <= CENTER_RING_R) ok = true;
              else if (region==='core' && d <= CENTER_CORE_R) ok = true;
              if (region === 'ring' && kind !== 'pent' && d <= CENTER_CORE_R + 360) { ok = false; continue; }
              if (!ok) continue;
              if (!farFromNeighbors(x,y,sep)) { ok=false; continue; }
              break;
            }
            if (!ok) return;
            addShape(kind, x, y, optR?{r:optR}:undefined);
          }

          const totalSquaresOuter = 700, totalTrianglesOuter = 380, totalPentsOuter = 80;
          for (let i=0;i<totalSquaresOuter;i++) tryPlace('sqr','outer',null,44);
          for (let i=0;i<totalTrianglesOuter;i++) tryPlace('tri','outer',null,52);
          for (let i=0;i<totalPentsOuter;i++){
            if (random()<0.18){
              const n = 1 + Math.floor(random(0,3));
              let bx,by,t=0;
              do { bx = random(120, WORLD.w-120); by = random(120, WORLD.h-120); t++; }
              while ((inNoSpawn(bx,by) || ringDist(bx,by) <= CENTER_RING_R) && t<40);
              for (let k=0;k<n;k++){
                const a = random(TAU), rr = random(24,90);
                if (farFromNeighbors(bx + Math.cos(a)*rr, by + Math.sin(a)*rr, 80))
                  addShape('pent', bx + Math.cos(a)*rr, by + Math.sin(a)*rr);
              }
            } else {
              tryPlace('pent','outer',null,86);
            }
          }

          const ringSquares = 180, ringTriangles = 140, ringPents = 140;
          for (let i=0;i<ringSquares;i++) tryPlace('sqr','ring',null,46);
          for (let i=0;i<ringTriangles;i++) tryPlace('tri','ring',null,52);
          for (let i=0;i<ringPents;i++) tryPlace('pent','ring',null,92);

          const corePents = 180;
          for (let i=0;i<corePents;i++) tryPlace('pent','core',null,96);

          const hexCount = 2;
          const hr = CENTER_CORE_R * 0.62;
          const startAng = random(TAU);
          for (let i = 0; i < hexCount; i++){
            const a = startAng + i * TAU / hexCount;
            const x = cx + Math.cos(a) * hr;
            const y = cy + Math.sin(a) * hr;
            const h = addShape('hex', x, y);
            expelNearbyShapes(h);
          }
          let initCorePent = 0, cx0 = WORLD.w/2, cy0 = WORLD.h/2;
          for (const s of shapes) if (!s.dead && s.type==='pent' && dist(s.x,s.y,cx0,cy0) <= CENTER_CORE_R) initCorePent++;
          desiredCounts = {
            outer: { sqr: liveCounts.outer.sqr, tri: liveCounts.outer.tri, pent: liveCounts.outer.pent },
            ring:  { sqr: liveCounts.ring.sqr,  tri: liveCounts.ring.tri,  pent: liveCounts.ring.pent },
            core:  { pent: liveCounts.core.pent }
          };
        }

        function spawnTankAtTeamBase(t) {
          const r = getTeamBaseRect(t.teamIdx);
          const m = t.r + 40;
          t.x = random(r.x + m, r.x + r.w - m);
          t.y = random(r.y + m, r.y + r.h - m);
          const d = derived(t);
          t.hp = d.maxHP;
          t.hpVis = t.hp;
          t._hpInit = true;
          t.isDead = false;
          t.lifeStartTime = now;
          t.lastDamagedBy = null;
          t.deathInfo = null;
          t.invincible = true;
          t.reloadTimer = 0;
          t.recoilX = 0; t.recoilY = 0;
        }
        
        function spendRandomStat(t) {
          while (t.statPoints > 0) {
            const keys = ['regen','maxHP','bodyDmg','bulletSpd','penetration','bulletDmg','reload','moveSpd'];
            const k = keys[(Math.random()*keys.length)|0];
            if (t.stats[k] < 7) { t.stats[k]++; t.statPoints--; }
            else {
              let ok = false;
              for (let i=0;i<6;i++){
                const kk = keys[(Math.random()*keys.length)|0];
                if (t.stats[kk] < 7){ t.stats[kk]++; t.statPoints--; ok=true; break; }
              }
              if (!ok) break;
            }
          }
        }
        
        function makeBot(teamIdx) {
          const t = makePlayer();
          t.uid = nextTankId++;
          t.isBot = true;
          t.teamIdx = teamIdx|0;
          t.isBot = true;
          t.name = `${teamNameCap(teamIdx)} Bot ${++teamBotCounters[teamIdx]}`;
          t.ai = { state: 'wander', timer: 0, target: null, wx: 0, wy: 0 };
          spawnTankAtTeamBase(t);
          return t;
        }
        
        function angleTo(ax,ay,bx,by){ return Math.atan2(by - ay, bx - ax); }
        function len2(x,y){ return x*x + y*y; }
        
        const shapeClaims = new Map<number, number>();
        function releaseClaim(bot: any, id?: number){ if (id!=null) shapeClaims.delete(id); else if (bot?.ai?.target) shapeClaims.delete(bot.ai.target.id); }
        function claimTarget(bot: any, shape: any){ if (shape) shapeClaims.set(shape.id, bot.uid|0); }

        function approachAngle(a: number, target: number, maxStep: number){
          let d = ((target - a + Math.PI) % (2*Math.PI)) - Math.PI;
          if (d > maxStep) d = maxStep; else if (d < -maxStep) d = -maxStep;
          a += d;
          if (a > Math.PI) a -= 2*Math.PI; else if (a < -Math.PI) a += 2*Math.PI;
          return a;
        }

        function chooseFarmTarget(bot){
          const ranges = [720, 1100, 1600, 2200];
          for (let ri = 0; ri < ranges.length; ri++){
            const maxR2 = Math.min(ranges[ri] * ranges[ri], fovForTank(bot)**2);
            let best = null, bestScore = -1;
            for (let i=0;i<shapes.length;i++){
              const s = shapes[i];
              if (!s || s.dead || s.dying || s.invincible) continue;
              if (s.type === 'hex') continue;
              const claimed = shapeClaims.get(s.id);
              if (claimed && claimed !== (bot.uid|0)) continue;
        
              const dx = s.x - bot.x, dy = s.y - bot.y;
              const d2 = dx*dx + dy*dy; if (d2 > maxR2) continue;
        
              const w = (s.type==='pent'?1.6 : s.type==='tri'?1.2 : 1.0);
              const score = w * (s.xp||1) / (Math.sqrt(d2)+1);
              if (score > bestScore){ bestScore = score; best = s; }
            }
            if (best) return best;
          }
          return null;
        }

        function chooseEnemyTarget(bot){
          let best = null, bestD2 = Infinity;
          for (let i=0;i<tanks.length;i++){
            const t = tanks[i];
            if (!t || t===bot || t.isDead || t.invincible) continue;
            if ((t.teamIdx|0) === (bot.teamIdx|0)) continue;
            const dx = t.x - bot.x, dy = t.y - bot.y;
            const d2 = dx*dx + dy*dy;
            const f2 = fovForTank(bot)**2;
            if (d2 < bestD2 && d2 <= f2) { bestD2 = d2; best = t; }
          }
          return best;
        }
        
        function fireFromTank(t, dt){
          if (t.isDead || (t.isBot && !t._fireCmd)) return;
          const d = derived(t);
          t.reloadTimer -= dt;
          if (!t._fireCmd || t.reloadTimer > 0) return;
        
          const baseAng = t.barrelAng || 0;
          const barrelLen = t.r * 2;
          const barrelW   = t.r * 0.68;
          const bR = barrelW / 2;
          const inner = t.r * 0.12;
          const muzzleOffset = inner + barrelLen - bR;
          const spread = 0.08;
          const fireAng = baseAng + random(-spread, spread);
          const vx = Math.cos(fireAng) * d.bulletSpeed;
          const vy = Math.sin(fireAng) * d.bulletSpeed;
          let bx = t.x + Math.cos(fireAng)*muzzleOffset;
          let by = t.y + Math.sin(fireAng)*muzzleOffset;
        
          {
            const idx = neighborIndices(bx, by);
            for (let n=0;n<idx.length;n++){
              const si = idx[n]|0;
              if ((S_dead[si]|S_dying[si])!==0) continue;
              const sx=S_x[si], sy=S_y[si], sr=S_r[si] + bR;
              const dx=bx - sx, dy=by - sy;
              const d2 = dx*dx + dy*dy;
              if (d2 < sr*sr){
                const dd = Math.sqrt(d2) || 1;
                const ux = dx/dd, uy = dy/dd;
                bx = sx + ux * (sr + 0.01);
                by = sy + uy * (sr + 0.01);
              }
            }
          }
        
          const b = bulletPool.acquire(()=> ({}));
          const bi = allocBulletIndex();
          b._bi = bi;
          b.x = bx; b.y = by; b.vx = vx; b.vy = vy;
          b.life = 2.0; b.hp = d.bulletHP; b.dmg = d.bulletDamage; b.r = bR;
          b.dying = false; b.deathTimer = 0; b.dead = false;
          b.fromTeamIdx = t.teamIdx;
          bullets.push(b);
        
          B_x[bi] = bx; B_y[bi] = by; B_vx[bi] = vx; B_vy[bi] = vy;
          B_life[bi] = 2.0; B_hp[bi] = d.bulletHP; B_dmg[bi] = d.bulletDamage; B_r[bi] = bR;
          B_team[bi] = t.teamIdx|0; B_dead[bi] = 0; B_dying[bi] = 0;
          B_dieT[bi] = 0; B_owner[bi] = t.uid|0;
        
          const K = 0.0085; t.recoilX -= (vx) * K; t.recoilY -= (vy) * K;
          t.barrelKick = Math.min(1, (t.barrelKick||0) + 0.7);
          t.reloadTimer = d.reload;
        }
        
        function updateTankPhysicsCore(t, dt, ix, iy){
          const d = derived(t);

          if (t.invincible && (ix !== 0 || iy !== 0 || t._fireCmd)) {
            t.invincible = false;
          }
        
          const accelMul = (t.accelMul ?? 1);
          const maxSpdMul = Math.min(1, (t.maxSpeedMul ?? 1));
        
          const effAccel   = d.accel   * accelMul;
          const effMaxSpd  = d.maxSpeed * maxSpdMul;
        
          t.vx = (t.vx||0) + ix * effAccel * dt;
          t.vy = (t.vy||0) + iy * effAccel * dt;
        
          t.vx += t.recoilX || 0; t.vy += t.recoilY || 0;
          t.recoilX = (t.recoilX||0) * DECAY_RECOIL; t.recoilY = (t.recoilY||0) * DECAY_RECOIL;
          t.vx *= DECAY_PLAYER_DRAG; t.vy *= DECAY_PLAYER_DRAG;
          t.barrelKick = (t.barrelKick||0) * DECAY_RECOIL;
        
          const sp = Math.hypot(t.vx, t.vy);
          if (sp > effMaxSpd) { const s = effMaxSpd / sp; t.vx *= s; t.vy *= s; }
        
          t.x = constrain(t.x + t.vx * dt, t.r, WORLD.w - t.r);
          t.y = constrain(t.y + t.vy * dt, t.r, WORLD.h - t.r);
        
          const sinceHit = now - (t.lastHit||-1e9);
          const wasTankHit = typeof t.lastDamagedBy === 'string' && t.lastDamagedBy.startsWith('tankuid:');
          const inTankCombat = wasTankHit && sinceHit < TANK_COMBAT_COOLDOWN;

          let regenMul = 1;
          if (sinceHit > HYPER_REGEN_AFTER) {
            regenMul = HYPER_REGEN_MULT;
          } else if (inTankCombat) {
            regenMul = 0;
          }

          if (regenMul > 0 && t.hp < d.maxHP) {
            const amt = d.maxHP * d.regenRate * regenMul * dt;
            t.hp = Math.min(t.hp + amt, d.maxHP);
          }
          const hpAnimSpd = 14;
          t.hpVis += (t.hp - t.hpVis) * Math.min(1, hpAnimSpd * dt);
          if (t.hitTimer > 0) t.hitTimer -= dt;
        }
        
        function tankVsShapesAndLeveling(t){
          const d = derived(t);
        
          const idx = neighborIndices(t.x, t.y);
          const maxContacts = Math.min(idx.length, 24);
          for (let n=0; n<maxContacts; n++){
            const sh = shapes[idx[n]];
            if (!sh || sh.dead || sh.dying) continue;
        
            const dx = sh.x - t.x, dy = sh.y - t.y;
            const rsum = t.r + sh.r;
            const d2 = dx*dx + dy*dy;
            if (d2 <= 0 || d2 >= rsum*rsum) continue;
        
            const friendlyProtector = (sh.ai === 'protector' && sh.teamIdx === t.teamIdx);
            if (friendlyProtector) continue;
        
            const dist = Math.sqrt(d2);
            const nx = dx / (dist || 1), ny = dy / (dist || 1);
            const overlap = (rsum - dist);
        
            const corr = (overlap + 1.5) * 0.6;
            t.x -= nx * corr * 0.5; t.y -= ny * corr * 0.5;
            sh.kx += nx * corr * 0.5; sh.ky += ny * 0.5 * corr;
        
            const impulse = (overlap + 1.5) * 40;
            t.vx -= nx * impulse; t.vy -= ny * impulse;
            const pvs = Math.hypot(t.vx, t.vy);
            const maxPKnock = d.maxSpeed * 1.3;
            if (pvs > maxPKnock) { const s = maxPKnock / pvs; t.vx *= s; t.vy *= s; }
        
            const mass = sh.type === 'hex' ? 0.2 : 1.0;
            sh.kvx += nx * impulse * mass; sh.kvy += ny * impulse * mass;
            const kvs = Math.hypot(sh.kvx, sh.kvy);
            if (kvs > MAX_SHAPE_KNOCKBACK_V) { const s = MAX_SHAPE_KNOCKBACK_V / kvs; sh.kvx *= s; sh.kvy *= s; }
        
            if (!sh.invincible) sh.hp -= d.bodyHitShape;
            if (!t.invincible) {
              t.hp -= sh.body;
              t.lastDamagedBy = sh.type;
              t.lastHit = now;
              t.hitTimer = 0.04;
            }
            sh.lastHit = now; sh.hitTimer = 0.04; sh.hitTimer2 = 0.08;
            if (!sh.invincible && sh.hp <= 0) killShape(sh, t);
          }
        
          while (t.level < LEVEL_CAP && t.xp >= xpToLevel(t.level)) {
            t.level++;
            updateTankRadius(t);
            if (t.level <= 28) t.statPoints++;
            else if (t.level === 30) t.statPoints++;
            else if (t.level > 30 && ((t.level - 30) % 3 === 0)) t.statPoints++;
            t.hp = Math.min(t.hp + 10, derived(t).maxHP);
          }
          if (t.statPoints > 0) spendRandomStat(t);
        
          if (t.hp <= 0 && !t.isDead) {
            t.isDead = true;
            t._respawnTimer = 1.0;
            t.hitTimer = Math.max(t.hitTimer || 0, 3.0);
          
            const killer = (typeof t.lastDamagedBy === 'string' && t.lastDamagedBy.startsWith('tankuid:'))
              ? getTankByUid(+t.lastDamagedBy.split(':')[1])
              : null;
            if (killer && killer === player) {
              pushEventMessage(`You killed ${t.name}`);
            }
          }
        }
        
        function drawTank(t) {
          const d = derived(t);
          const ang = t.barrelAng||0;
          const barrelLen = t.r * 1.7, barrelW = t.r * 0.74;
        
          const teamName = TEAMS[t.teamIdx].name;
          const baseBody = TEAM_TANK_COLORS[teamName];
          const darker = TEAM_TANK_COLORS_STROKE[teamName];
        
          const flashOn = t.invincible && (((now*4)%1) < 0.5);
          const bodyFlash = getBodyFlash(teamName);
          const barrelBase = COLORS.playerBarrel;
          const barrelFlash = getBarrelFlash();
        
          const bodyFill = t.hitTimer>0 ? [255,110,110] : (flashOn ? bodyFlash : baseBody);
          const barrelFill = flashOn ? barrelFlash : barrelBase;
          const borderCol = t.hitTimer>0 ? [255,110,110] : darker;
        
          push(); translate(t.x, t.y);
        
          push(); rotate(ang);
          stroke(...COLORS.playerBarrelBorder); strokeWeight(4);
          fill(...barrelFill); rectMode(CENTER);
          const inner = t.r * 0.12;
          const retreat = Math.min((t.barrelKick||0) * (t.r * 0.28), inner);
          const cx = inner + barrelLen * 0.5 - retreat;
          rect(cx, 0, barrelLen, barrelW, 2);
          pop();
        
          noStroke(); fill(...bodyFill); circle(0,0, t.r*2);
          noFill(); stroke(...borderCol); strokeWeight(4); circle(0,0, t.r*2 - 3);
        
          pop();
        
          if (t.hp < d.maxHP) {
            const w=64, h=6;
            drawBar(t.x - w/2, t.y + t.r + 10, w, h, Math.max(0, t.hpVis)/d.maxHP, COLORS.hpFill, "", false, true, COLORS.barBg, UI.hpBarPad);
          }
        }

        function botChooseTargets(bot: any){
          const enemy = chooseEnemyTarget(bot);
          if (enemy) return { type: 'tank', target: enemy };
          const farm  = chooseFarmTarget(bot);
          if (farm)  return { type: 'shape', target: farm };
          return { type: 'none', target: null };
        }
        
        function botAim(bot: any, target: any, dt: number){
          const MAX_TURN = 5.2 * dt;
          if (!target) return;
          const desired = Math.atan2((target.y - bot.y), (target.x - bot.x));
          bot.barrelAng = approachAngle(bot.barrelAng || 0, desired, MAX_TURN);
        }
        
        function botMove(bot: any, target: any, dt: number){
          let ix = 0, iy = 0;
          if (target){
            const dx = target.x - bot.x, dy = target.y - bot.y;
            const L = Math.hypot(dx,dy) || 1;
            ix = dx / L; iy = dy / L;
        
            const minKeep = (target.r ?? 28) + bot.r + 40;
            if (L < minKeep) { ix = -ix; iy = -iy; }
          } else {
            const a = (now * 0.5 + (bot.uid|0) * 0.73) % TAU;
            ix = Math.cos(a) * 0.6; iy = Math.sin(a) * 0.6;
          }
        
          const [ax, ay] = rvoAdjust({ x:bot.x, y:bot.y, vx:bot.vx||0, vy:bot.vy||0, r:bot.r, teamIdx:bot.teamIdx }, ix*300, iy*300);
          const L = Math.hypot(ax, ay) || 1;
          const mix = Math.min(1, L / 300);
          const mx = (ix * (1 - mix)) + (ax / L) * mix;
          const my = (iy * (1 - mix)) + (ay / L) * mix;
        
          updateTankPhysicsCore(bot, dt, mx, my);
        }
        
        function botFireDecision(bot: any, tgtInfo: {type:'tank'|'shape'|'none', target:any}, dt: number){
          const d = derived(bot);
          bot._fireCmd = false;
        
          const t = tgtInfo?.target;
          if (!t) return;
        
          const dx = t.x - bot.x, dy = t.y - bot.y;
          const dist2 = dx*dx + dy*dy;
          const maxRange = Math.min(fovForTank(bot), 1200);
          if (dist2 > maxRange*maxRange) return;
        
          const aimDir = bot.barrelAng || 0;
          const tgtAng = Math.atan2(dy, dx);
          let dang = Math.abs(((tgtAng - aimDir + Math.PI) % (2*Math.PI)) - Math.PI);
          if (dang < 0.20) bot._fireCmd = true;
        
          fireFromTank(bot, dt);
        }
        
        function botRegenLevelAndHPVis(bot: any, dt: number){
          const d = derived(bot);
          const sinceHit = now - (bot.lastHit ?? -1e9);
          const wasTankHit = typeof bot.lastDamagedBy === 'string' && bot.lastDamagedBy.startsWith('tankuid:');
          const inTankCombat = wasTankHit && sinceHit < TANK_COMBAT_COOLDOWN;
        
          let regenMul = 1;
          if (sinceHit > HYPER_REGEN_AFTER) regenMul = HYPER_REGEN_MULT;
          else if (inTankCombat) regenMul = 0;
          if (regenMul > 0 && bot.hp < d.maxHP) {
            bot.hp = Math.min(bot.hp + d.maxHP * d.regenRate * regenMul * dt, d.maxHP);
          }
          if (bot.hitTimer > 0) bot.hitTimer -= dt;
        
          const hpAnimSpd = 14;
          bot.hpVis += (bot.hp - bot.hpVis) * Math.min(1, hpAnimSpd * dt);
        
          while ((bot.level|0) < LEVEL_CAP && (bot.xp|0) >= xpToLevel(bot.level|0)) {
            bot.level++;
            updateTankRadius(bot);
            bot.hp = Math.min(bot.hp + 10, derived(bot).maxHP);
            bot.statPoints = (bot.statPoints|0) + 1;
            spendRandomStat(bot);
          }
        }
        
        let bots = [];
        function updateBots(dt:number){
          for (let i=0;i<tanks.length;i++){
            const t = tanks[i];
            if (!t || !t.isBot) continue;
            if (!t || t.isDead) return;
        
            if (!t._hpInit) {
              const d = derived(t);
              t.hp = d.maxHP;
              t.hpVis = t.hp;
              t._hpInit = true;
              t.lifeStartTime = now;
            }
          
            const tgtInfo = botChooseTargets(t);
          
            botAim(t, tgtInfo.target, dt);
            botMove(t, tgtInfo.target, dt);
            botFireDecision(t, tgtInfo, dt);
            botRegenLevelAndHPVis(t, dt);
          
            const d = derived(t);
            collideTankWithShapes(t, d);
            if (t.hp <= 0 && !t.isDead) onBotDeath(t);
          }
        }
        
        function drawBots(){
          for (let i=0;i<tanks.length;i++){
            const t = tanks[i];
            if (!t || !t.isBot) continue;
        
            drawTank(t);
        
            const name  = t.name || 'Bot';
            const score = Math.floor(t.xp || 0);
            const yName  = t.y - t.r - 32;
            const yScore = yName + 12;
        
            const labelS = Math.round(14 * screenScale());
            const scoreS = Math.round(12 * screenScale());
            drawOutlinedText(name, t.x, yName + t.r - 17 * screenScale(), CENTER, BASELINE, labelS, true);
            drawOutlinedText(formatShort(score), t.x, yScore + t.r - 12 * screenScale(), CENTER, BASELINE, scoreS, true);
          }
        }
        
        function spawnBotsToFillTeams(){
          const playerTeam = player.teamIdx|0;
          const wantPerTeam = 3;
        
          const counts = new Array(TEAMS.length).fill(0);
          for (const t of tanks) if (t && !t.isDead) counts[t.teamIdx]++;
        
          for (let ti=0; ti<TEAMS.length; ti++){
            const have = counts[ti] + (ti===playerTeam ? 0 : 0);
            const need = (ti === playerTeam) ? Math.max(0, wantPerTeam - 1) : Math.max(0, wantPerTeam);
            const toMake = need - (have - (ti===playerTeam ? 1 : 0));
            for (let k=0;k<toMake;k++){
              const b = makeBot(ti);
              bots.push(b);
              tanks.push(b);
            }
          }
        }

        function initBaseProtectors(){
          TEAM_PROTECTORS = [];
          TEAM_LIMIT_R = [];
          for (let i=0;i<TEAMS.length;i++){
            const bc = getTeamBaseCenter(i);
            const col = TEAM_TANK_COLORS[TEAMS[i].name];
            const rct = getTeamBaseRect(i);
            const limitR = Math.hypot(rct.w, rct.h)/2 + 640;
            const homeR = 180;
            const idleOmega = 1.2;
            TEAM_LIMIT_R[i] = limitR;
            TEAM_PROTECTORS[i] = [];
            for (let k=0;k<9;k++){
              const th = (k/9)*TAU;
              const sh = addShape('dia', bc.x, bc.y, {
                r: 14, col, invincible: true, ai: 'protector', rvo:true, seekSpd: 1000, aiAccel: 2600, friction: 5.0,
                teamIdx: i, baseCenter: bc, homeTheta: th, homeR, limitR, idleOmega
              });
              TEAM_PROTECTORS[i].push(sh);
              sh.x = bc.x + Math.cos(th)*homeR;
              sh.y = bc.y + Math.sin(th)*homeR;
              sh.rotSpd = 2.8;
            }
          }
        }

        function tryRespawnHexIfNeeded(){
          const alive = hexAlive;
          if (!hexEverDied) return;
          if (hexRespawnCooldown > 0) return;
          const desired = 3;
          if (alive >= desired) return;
          const cx = WORLD.w/2, cy = WORLD.h/2;
          let x,y,t=0;
          function farFromHex(xx,yy){
            for (const s of shapes) if (!s.dead && s.type==='hex') if (dist(xx,yy,s.x,s.y) < 3.2*SHAPES_DEF.hex.r) return false;
            return true;
          }
          do {
            x = cx + random(-CENTER_CORE_R*0.85, CENTER_CORE_R*0.85);
            y = cy + random(-CENTER_CORE_R*0.85, CENTER_CORE_R*0.85);
            t++;
          } while ((!farFromHex(x,y)) && t<80);
          const h = addShape('hex', x, y);
          expelNearbyShapes(h);
          hexRespawnCooldown = 30.0;
        }

        function killShape(sh, awardTo = null) {
          shapeClaims.delete(sh.id);
          if (DEBUG) debugShapes.logKill(sh, 'killShape()');
          if (spawner && spawner.onShapeDied) spawner.onShapeDied(sh);
          if (!sh.dying){
            const reg = sh.spawnRegion || regionFor(sh.cx, sh.cy);
            if (shouldCount(sh.type, reg)) {
              if (reg==='outer') liveCounts.outer[sh.type]--;
              else if (reg==='ring') liveCounts.ring[sh.type]--;
              else if (reg==='core' && sh.type==='pent') liveCounts.core.pent--;
            }
            const receiver = (awardTo && !awardTo.isDead) ? awardTo : player;
            receiver.xp += sh.xp * XP_GAIN_MULT;
            sh.dying = true; sh.deathTimer = 0.28;
            if (sh.type === 'hex') { hexEverDied = true; hexRespawnCooldown = 30.0; hexAlive = Math.max(0, hexAlive - 1); }
          }
        }

        function regionFor(x,y){ const cx=WORLD.w/2, cy=WORLD.h/2; const d=dist(x,y,cx,cy); if (d<=CENTER_CORE_R) return 'core'; if (d<=CENTER_RING_R) return 'ring'; return 'outer'; }
        function shouldCount(kind, region){ if (kind==='pent') return true; if (kind==='sqr'||kind==='tri') return region==='ring' || region==='outer'; return false; }

        function getTankByUid(uid){
          for (let t of tanks){ if (t && t.uid === uid) return t; }
          return null;
        }

        function updateProtectorAssignments(){
          const nowT = now;
          for (let teamIdx=0; teamIdx<TEAMS.length; teamIdx++){
            const bc = getTeamBaseCenter(teamIdx);
            const R = TEAM_LIMIT_R[teamIdx] || 0;

            let invader = null;
            for (let i=0;i<tanks.length;i++){
              const t = tanks[i];
              if (!t || t.isDead) continue;
              if (t.teamIdx === teamIdx) continue;
              const dx = t.x - bc.x, dy = t.y - bc.y;
              if (dx*dx + dy*dy <= R*R){ invader = t; break; }
            }

            const locks = protectorLocks[teamIdx] || (protectorLocks[teamIdx] = {});
            for (const k in locks){ if (locks[k].until < nowT) delete locks[k]; }

            if (!invader) continue;

            const tid = String(invader.uid || 0);
            let entry = locks[tid];
            if (entry && entry.chosenIds && entry.chosenIds.length === 3){ entry.until = nowT + PROTECTOR_STICKY_SEC; continue; }

            const used = {};
            for (const k in locks){
              const e = locks[k];
              const a = e.chosenIds || [];
              for (let j=0;j<a.length;j++) used[a[j]] = 1;
            }

            const arr = TEAM_PROTECTORS[teamIdx] || [];
            let c0=-1, c1=-1, c2=-1, d0=1e20, d1=1e20, d2=1e20;
            for (let i=0;i<arr.length;i++){
              const sh = arr[i];
              if (!sh || sh.dead || sh.dying) continue;
              if (used[sh.id]) continue;
              const dx = sh.x - invader.x, dy = sh.y - invader.y;
              const di = dx*dx + dy*dy;
              if (di < d0){ d2=d1; c2=c1; d1=d0; c1=c0; d0=di; c0=sh.id; }
              else if (di < d1){ d2=d1; c2=c1; d1=di; c1=sh.id; }
              else if (di < d2){ d2=di; c2=sh.id; }
            }
            const chosen = [];
            if (c0>0) chosen.push(c0);
            if (c1>0) chosen.push(c1);
            if (c2>0) chosen.push(c2);
            if (chosen.length) locks[tid] = { chosenIds: chosen, until: nowT + PROTECTOR_STICKY_SEC };
          }
        }

        function assignedTargetForProtector(sh){
          const locks = protectorLocks[sh.teamIdx] || {};
          for (const key of Object.keys(locks)){
            const entry = locks[key];
            if (entry.until < now) continue;
            if (entry.chosenIds && entry.chosenIds.indexOf(sh.id) !== -1){
              const uid = +key;
              return getTankByUid(uid);
            }
          }
          return null;
        }

        function updateShapes(dt) {
          tickSpawnGrace(dt);
          hexRespawnCooldown = Math.max(0, hexRespawnCooldown - dt);
          tryRespawnHexIfNeeded();
          if ((physicsFrame & 7) === 0) updateProtectorAssignments();

          const pad = ACTIVE_PAD;
          const actMinX = cam.x - width/2 - pad;
          const actMaxX = cam.x + width/2 + pad;
          const actMinY = cam.y - height/2 - pad;
          const actMaxY = cam.y + height/2 + pad;

          const velDecay = DECAY_SHAPE_VEL;

          for (let i=0;i<shapes.length;i++) {
            const sh = shapes[i];
            if (!sh) continue;

            if (sh.hitTimer > 0) sh.hitTimer -= dt;
            if (sh.hitTimer2 > 0) sh.hitTimer2 -= dt;

            if (sh.dying) {
              sh.deathTimer -= dt;
              if (sh.deathTimer <= 0) {
                sh.dead = true;
                gridRemoveShape(i);
                shapeFree.push(i);
                sh._freed = true;
              }
            }
            if (sh.dead) { S_dead[i] = 1; continue; }

            const active = (sh.x >= actMinX && sh.x <= actMaxX && sh.y >= actMinY && sh.y <= actMaxY) || sh.ai;
            const wasActive = sh.active|0;
            sh.active = active ? 1 : 0;
            const justActivated = (!wasActive && sh.active);

            if (!active) {
              sh.rot += sh.rotSpd * dt;
              const sinceHit0 = now - sh.lastHit;
              if (sinceHit0 > HYPER_REGEN_AFTER && sh.hp < sh.maxHp) {
                const rate0 = 0.20;
                sh.hp = Math.min(sh.hp + sh.maxHp * rate0 * dt, sh.maxHp);
              }
              const hpAnimSpd0 = 16;
              sh.hpVis += (sh.hp - sh.hpVis) * Math.min(1, hpAnimSpd0 * dt);
              continue;
            }

            if (!sh.dying) {
              if (sh.ai === 'seek') {
                if (sh.isCrasher && player.isDead) { sh.dying = true; sh.deathTimer = 0.18; }
                else {
                  const pvx = player.vx||0, pvy = player.vy||0;
                  const dx0 = player.x - sh.x, dy0 = player.y - sh.y;
                  const d0 = Math.hypot(dx0,dy0) || 1;
                  const lead = Math.min(0.35, d0/900);
                  const px = player.x + pvx*lead, py = player.y + pvy*lead;
                  const tx = px - sh.x, ty = py - sh.y;
                  const td = Math.hypot(tx,ty) || 1;
                  let ux = tx/td, uy = ty/td;

                  const sp = sh.seekSpd || 200;
                  let desx = ux*sp, desy = uy*sp;

                  const tackleR = sh.r + player.r + 24;
                  const useRVO = sh.rvo && d0 > tackleR;

                  if (useRVO) {
                    const adj = rvoAdjust(sh, desx, desy);
                    const ds2 = Math.hypot(adj[0], adj[1]);
                    if (ds2 > sp) { desx = adj[0]/ds2*sp; desy = adj[1]/ds2*sp; } else { desx = adj[0]; desy = adj[1]; }
                  } else {
                    desx += ux*240; desy += uy*240;
                    const tnx = -uy, tny = ux;
                    const tang = (sh.vx||0)*tnx + (sh.vy||0)*tny;
                    sh.vx -= tnx * tang * 0.6; sh.vy -= tny * tang * 0.6;
                  }

                  const ds = Math.hypot(desx,desy); if (ds > sp) { desx = desx/ds*sp; desy = desy/ds*sp; }
                  const k = sh.aiKSeek || 0.2;
                  sh.vx = (sh.vx || 0) + (desx - (sh.vx||0)) * k;
                  sh.vy = (sh.vy || 0) + (desy - (sh.vy||0)) * k;
                  const fr = sh.frFactor || DECAY_SHAPE_VEL;
                  sh.vx *= fr; sh.vy *= fr;
                  sh.cx += sh.vx * dt; sh.cy += sh.vy * dt;
                  sh.rot += sh.rotSpd * dt;
                }
              } else if (sh.ai === 'protector') {
                const bc = sh.baseCenter;
                const tgt = assignedTargetForProtector(sh);
                const enemy = !!tgt && (tgt.teamIdx !== sh.teamIdx);
                const dToBase = enemy ? Math.hypot(tgt.x - bc.x, tgt.y - bc.y) : Infinity;
                const canChase = enemy && dToBase <= sh.limitR;

                if (canChase) { sh.state = 'chase'; sh.stateTimer = 0; }
                else if (sh.state === 'chase') { sh.state = 'coast'; sh.stateTimer = 0.6; }

                let targetX, targetY, targetSpd;

                if (sh.state === 'chase' && tgt) {
                  const pvx = tgt.vx||0, pvy = tgt.vy||0;
                  const dxp = tgt.x - sh.x, dyp = tgt.y - sh.y;
                  const dp = Math.hypot(dxp,dyp) || 1;
                  const lead = Math.min(0.35, dp/900);
                  const px = tgt.x + pvx*lead, py = tgt.y + pvy*lead;
                  const dirAng = (pvx*pvx + pvy*pvy > 16) ? Math.atan2(pvy,pvx) : Math.atan2(py - sh.y, px - sh.x);
                  const m = (sh.id % 3) - 1;
                  const ofsAng = m * 0.7;
                  const rr = Math.min(200, Math.max(90, tgt.r * 3));
                  targetX = px + Math.cos(dirAng + ofsAng) * rr;
                  targetY = py + Math.sin(dirAng + ofsAng) * rr;
                  const tDer = derived(tgt);
                  const curSpd = Math.hypot(pvx,pvy);
                  const tankMaxV = tDer.maxSpeed;
                  const fr = sh.frFactor || DECAY_SHAPE_VEL;
                  const kFor = (s)=> (s>=800? (sh.aiK1000||0.2) : s>=500? (sh.aiK520||0.2) : s>=300? (sh.aiK320||0.2) : (sh.aiK1||0.2));
                  let desired = Math.max(tankMaxV, curSpd) + 140;
                  let cmd = Math.max(sh.seekSpd||700, desired);
                  for (let it=0; it<3; it++){
                    const k = kFor(cmd);
                    const ratio = (fr*k) / (1 - fr + fr*k);
                    const need = desired / Math.max(0.05, ratio);
                    if (need <= cmd) break;
                    cmd = need;
                  }
                  const cap = 2200;
                  targetSpd = Math.min(cap, cmd);
                } else if (sh.state === 'coast') {
                  targetX = sh.cx; targetY = sh.cy; targetSpd = 0;
                  sh.stateTimer -= dt; if (sh.stateTimer <= 0) sh.state = 'return';
                } else if (sh.state === 'return') {
                  targetX = bc.x + Math.cos(sh.homeTheta) * sh.homeR;
                  targetY = bc.y + Math.sin(sh.homeTheta) * sh.homeR;
                  targetSpd = 520;
                  if (dist(sh.cx, sh.cy, targetX, targetY) < 8) sh.state = 'idle';
                } else {
                  sh.homeTheta += (sh.idleOmega || 1.0) * dt;
                  targetX = bc.x + Math.cos(sh.homeTheta) * sh.homeR;
                  targetY = bc.y + Math.sin(sh.homeTheta) * sh.homeR;
                  targetSpd = 320;
                }
                
                let useRVO = true;
                if (tgt) {
                  const vpx = tgt.x - sh.x, vpy = tgt.y - sh.y;
                  const vtx = targetX - sh.x, vty = targetY - sh.y;
                  if (vpx*vtx + vpy*vty < 0) { targetX = tgt.x; targetY = tgt.y; useRVO = false; }
                }

                const tx = targetX - sh.x, ty = targetY - sh.y;
                const td = Math.hypot(tx,ty) || 1;
                let desx = (tx/td) * targetSpd, desy = (ty/td) * targetSpd;


                if (sh.state === 'chase' && tgt) {
                  const tackleR = sh.r + tgt.r + 24;
                  const dpNow = Math.hypot(tgt.x - sh.x, tgt.y - sh.y);
                  useRVO = sh.rvo && dpNow > tackleR;
                  if (!useRVO) {
                    const ux = tx/td, uy = ty/td;
                    desx += ux*300; desy += uy*300;
                    const tnx = -uy, tny = ux;
                    const tang = (sh.vx||0)*tnx + (sh.vy||0)*tny;
                    sh.vx -= tnx * tang * 0.6; sh.vy -= tny * tang * 0.6;
                  }
                }

                if (useRVO) {
                  const adj = rvoAdjust(sh, desx, desy);
                  const ds2 = Math.hypot(adj[0], adj[1]);
                  if (ds2 > targetSpd) { desx = adj[0]/ds2*targetSpd; desy = adj[1]/ds2*targetSpd; } else { desx = adj[0]; desy = adj[1]; }
                }

                let k;
                if (targetSpd >= 800) k = sh.aiK1000 || 0.2;
                else if (targetSpd >= 500) k = sh.aiK520 || 0.2;
                else if (targetSpd >= 300) k = sh.aiK320 || 0.2;
                else k = sh.aiK1 || 0.2;

                sh.vx = (sh.vx || 0) + (desx - (sh.vx||0)) * k;
                sh.vy = (sh.vy || 0) + (desy - (sh.vy||0)) * k;
                const fr = sh.frFactor || DECAY_SHAPE_VEL;
                sh.vx *= fr; sh.vy *= fr;
                sh.cx += sh.vx * dt; sh.cy += sh.vy * dt;

                sh.rot += Math.abs(sh.rotSpd || 2.6) * dt;
                sh.theta = 0;
              } else {
                const wobA = sh.wobbleA || 0, wobF = sh.wobbleF || 1, ph = sh.phase || 0;
                sh.theta += (sh.orbitSpd + wobA * Math.sin(now * wobF + ph)) * dt;
                sh.rot += sh.rotSpd * dt;
              }

              sh.kvx *= velDecay; sh.kvy *= velDecay;
              if (!sh.ai) {
                sh.kvx += Math.cos(now * sh.jfx + sh.jphx) * sh.jamp * dt;
                sh.kvy += Math.sin(now * sh.jfy + sh.jphy) * sh.jamp * dt;
              }
              sh.kx += sh.kvx * dt; sh.ky += sh.kvy * dt;

              const ox = Math.cos(sh.theta||0)*sh.orbitR, oy = Math.sin(sh.theta||0)*sh.orbitR;
              let nx = sh.cx + ox + sh.kx, ny = sh.cy + oy + sh.ky;

              if (nx < sh.r) { nx = sh.r; sh.kvx *= -0.6; }
              if (ny < sh.r) { ny = sh.r; sh.kvy *= -0.6; }
              if (nx > WORLD.w - sh.r) { nx = WORLD.w - sh.r; sh.kvx *= -0.6; }
              if (ny > WORLD.h - sh.r) { ny = WORLD.h - sh.r; sh.kvy *= -0.6; }

              sh.kx = nx - (sh.cx + ox); sh.ky = ny - (sh.cy + oy);
              sh.x = nx; sh.y = ny;
              if (wasActive && !sh.ai && ((physicsFrame + i) & 3) === 0 && sh.x >= actMinX && sh.x <= actMaxX && sh.y >= actMinY && sh.y <= actMaxY) relaxOverlapSingle(sh, 1);
            }

            const sinceHit = now - sh.lastHit;
            if (sinceHit > HYPER_REGEN_AFTER && sh.hp < sh.maxHp) {
              const rate = 0.20; sh.hp = Math.min(sh.hp + sh.maxHp * rate * dt, sh.maxHp);
            }
            const hpAnimSpd = 16;
            sh.hpVis += (sh.hp - sh.hpVis) * Math.min(1, hpAnimSpd * dt);

            S_x[i] = sh.x;
            S_y[i] = sh.y;
            S_vx[i] = sh.vx || 0;
            S_vy[i] = sh.vy || 0;
            S_r[i] = sh.r;
            S_hp[i] = sh.hp;
            S_hpVis[i] = sh.hpVis;
            S_dead[i] = 0;
            S_dying[i] = sh.dying ? 1 : 0;

            if (sh.dead) {
              gridRemoveShape(i);
            } else {
              const needGrid = (sh.active|0) === 1 && (sh.ai || (((physicsFrame + i) & 1) === 0));
              if (needGrid) gridMaybeUpdateShape(i);
            }
          }
        }

        function drawPlayer() {
          const d = dFrame;
          const ang = player.barrelAng;
          const barrelLen = player.r * 1.7, barrelW = player.r * 0.74;

          const teamName = TEAMS[player.teamIdx].name;
          const baseBody = TEAM_TANK_COLORS[teamName];
          const darker = TEAM_TANK_COLORS_STROKE[teamName];

          const flashOn = player.invincible && (((now*4)%1) < 0.5);
          const bodyFlash = getBodyFlash(teamName);
          const barrelBase = COLORS.playerBarrel;
          const barrelFlash = getBarrelFlash();

          const bodyFill = player.hitTimer>0 ? [255,110,110] : (flashOn ? bodyFlash : baseBody);
          const barrelFill = flashOn ? barrelFlash : barrelBase;
          const borderCol = player.hitTimer>0 ? [255,110,110] : darker;

          push(); translate(player.x, player.y);

          push(); rotate(ang);
          stroke(...COLORS.playerBarrelBorder); strokeWeight(4);
          fill(...barrelFill); rectMode(CENTER);
          const inner = player.r * 0.12;
          const retreat = Math.min(player.barrelKick * (player.r * 0.28), inner);
          const cx = inner + barrelLen * 0.5 - retreat;
          rect(cx, 0, barrelLen, barrelW, 2);
          pop();

          noStroke(); fill(...bodyFill); circle(0,0, player.r*2);
          noFill(); stroke(...borderCol); strokeWeight(4); circle(0,0, player.r*2 - 3);

          pop();

          if (player.hp < d.maxHP) {
            const w=64, h=6;
            drawBar(player.x - w/2, player.y + player.r + 10, w, h, Math.max(0, player.hpVis)/d.maxHP, COLORS.hpFill, "", false, true, COLORS.barBg, UI.hpBarPad);
          }
        }

        function drawBullets(minX, minY, maxX, maxY) {
          for (let j = 0; j < bullets.length; j++) {
            const i = bullets[j]._bi|0;
            if (B_dead[i]) continue;

            const x = B_x[i], y = B_y[i], r = B_r[i];
            if (!B_dying[i] && (x < minX || x > maxX || y < minY || y > maxY)) continue;

            const teamIdx = (B_team[i] >= 0 && B_team[i] < TEAMS.length) ? B_team[i] : player.teamIdx;
            const teamName = TEAMS[teamIdx].name;
            const body = TEAM_TANK_COLORS[teamName];
            const darker = TEAM_TANK_COLORS_STROKE[teamName];

            if (!B_dying[i]) {
              fill(...body); stroke(...darker); strokeWeight(4); circle(x, y, r*2);
            } else {
              const t = Math.max(0, B_dieT[i]) / 0.18;
              const alpha = Math.floor(255 * t);
              const grow = 1 + (1 - t) * 0.35;
              noStroke(); fill(body[0],body[1],body[2],alpha); circle(x,y, r*2*grow);
              noFill(); stroke(darker[0],darker[1],darker[2],alpha); strokeWeight(4); circle(x,y, r*2*grow - 1.5);
            }
          }
        }

        function drawWorld(minX, minY, maxX, maxY){
          const x0 = Math.max(0, (minX|0));
          const y0 = Math.max(0, (minY|0));
          const x1 = Math.min(WORLD.w, (maxX|0));
          const y1 = Math.min(WORLD.h, (maxY|0));

          const ctx = drawingContext;
          _ensureGridTile();

          ctx.save();
          ctx.fillStyle = WORLD_FILL_CSS;
          ctx.fillRect(x0-2, y0-2, (x1-x0)+4, (y1-y0)+4);
          if (!_gridPattern) _gridPattern = ctx.createPattern(_gridTile, 'repeat');
          ctx.fillStyle = _gridPattern;
          ctx.fillRect(x0, y0, (x1-x0), (y1-y0));
          ctx.restore();

          if (minX <= 0 || minY <= 0 || maxX >= WORLD.w || maxY >= WORLD.h) {
            noFill();
            stroke(COLORS.bounds);
            strokeWeight(4);
            rect(0.5, 0.5, WORLD.w-1, WORLD.h-1, 8);
          }

          for (let i=0;i<TEAMS.length;i++){
            const r = getTeamBaseRect(i);
            const c = TEAMS[i].color;
            noStroke();
            fill(c[0],c[1],c[2],70);
            rect(r.x, r.y, r.w, r.h, 8);
          }
        }

        function drawShapes(minX, minY, maxX, maxY) {
          const vis = collectVisibleIndices(minX, minY, maxX, maxY);
          _ensureBinCapacity(vis.length);

          let nS=0, nT=0, nP=0, nD=0, nH=0;

          for (let ii=0; ii<vis.length; ii++){
            const i = vis[ii];
            const sh = shapes[i];
            if (!sh || sh.dead) continue;
            if (sh.x+sh.r<minX || sh.x-sh.r>maxX || sh.y+sh.r<minY || sh.y-sh.r>maxY) continue;
            if (sh.type==='sqr') _binSqr[nS++]=i;
            else if (sh.type==='tri') _binTri[nT++]=i;
            else if (sh.type==='pent') _binPent[nP++]=i;
            else if (sh.type==='dia') _binDia[nD++]=i;
            else if (sh.type==='hex') _binHex[nH++]=i;
          }

          function drawOne(sh){
            const baseCol = sh.col;
            const darkerBase = sh.colBorder;

            if (sh.dying) {
              const t = Math.max(0, sh.deathTimer) / 0.28;
              const alpha = Math.floor(255 * t);
              const grow = 1 + (1 - t) * 0.4;
              let col, colDark;
              if (sh.hitTimer>0) { col = HIT_R; colDark = HIT_R_DARK; }
              else if (sh.hitTimer2>0) { col = HIT_W; colDark = HIT_W_DARK; }
              else { col = baseCol; colDark = darkerBase; }
              push(); translate(sh.x, sh.y); rotate(sh.rot);
              noStroke(); fill(col[0],col[1],col[2],alpha);
              if (sh.type === 'dia') {
                drawRhombus(0,0, sh.r*grow, 0.62);
                noFill(); stroke(colDark[0],colDark[1],colDark[2],alpha); strokeWeight(4); strokeJoin(ROUND);
                drawRhombus(0,0, sh.r*grow - 1.5, 0.62);
              } else {
                drawShapePath(0,0, sh.sides, sh.r*grow, true);
                noFill(); stroke(colDark[0],colDark[1],colDark[2],alpha); strokeWeight(4); strokeJoin(ROUND);
                drawShapePath(0,0, sh.sides, sh.r*grow - 1.5, true);
              }
              pop();
              return;
            }

            let useCol, useDark, innerCol;
            if (sh.hitTimer>0) { useCol = HIT_R; useDark = HIT_R_DARK; innerCol = HIT_R_INNER; }
            else if (sh.hitTimer2>0) { useCol = HIT_W; useDark = HIT_W_DARK; innerCol = HIT_W_INNER; }
            else { useCol = baseCol; useDark = darkerBase; innerCol = sh.colInner; }

            push(); translate(sh.x, sh.y); rotate(sh.rot);
            noStroke();
            drawShapeFilledWithCenter(0,0, sh.sides, sh.r, useCol, sh.type, innerCol);
            noFill(); stroke(useDark[0],useDark[1],useDark[2]); strokeWeight(4); strokeJoin(ROUND);
            if (sh.type === 'dia') drawRhombus(0,0, sh.r - 1.5, 0.62);
            else drawShapePath(0,0, sh.sides, sh.r - 1.5, true);
            pop();

            if (sh.hp < sh.maxHp) {
              const w = Math.max(50, sh.r * 1.8), h = 6;
              drawBar(sh.x - w/2, sh.y + sh.r + 8, w, h, Math.max(0, sh.hpVis)/sh.maxHp, COLORS.hpFill, "", false, true, COLORS.barBg, UI.hpBarPad);
            }
          }

          for (let k=0;k<nS;k++) drawOne(shapes[_binSqr[k]]);
          for (let k=0;k<nT;k++) drawOne(shapes[_binTri[k]]);
          for (let k=0;k<nP;k++) drawOne(shapes[_binPent[k]]);
          for (let k=0;k<nD;k++) drawOne(shapes[_binDia[k]]);
          for (let k=0;k<nH;k++) drawOne(shapes[_binHex[k]]);
        }

        function drawShapeFilledWithCenter(x,y,sides,r, baseCol, kind, innerCol) {
          if (kind === 'dia') {
            noStroke(); fill(...baseCol);
            drawRhombus(x,y,r,0.62);
            const c = innerCol || baseCol;
            noStroke(); fill(c[0],c[1],c[2], 140);
            drawRhombus(x,y,r*0.62,0.62);
            return;
          }
          noStroke();
          if (sides === 4) { rectMode(CENTER); fill(...baseCol); rect(x,y, r*2, r*2, 2); }
          else { fill(...baseCol); drawShapePath(x,y,sides,r,true); }
          if (kind === 'tri' || kind === 'sqr') {
            const c = innerCol || baseCol;
            noStroke(); fill(c[0],c[1],c[2], 140);
            const rr = r * 0.62;
            if (sides === 4) { rectMode(CENTER); rect(x,y, rr*2, rr*2, 1); }
            else { drawShapePath(x,y, sides, rr, true); }
          }
        }

        function drawShapePath(x, y, sides, r, rounded=false) {
          if (sides === 4 && rounded) { rectMode(CENTER); rect(x, y, r*2, r*2, 2); return; }
          const v = unitPoly(sides);
          push();
          translate(x, y);
          scale(r, r);
          strokeWeight(4 / r);
          beginShape();
          for (let i=0;i<v.length;i++){ vertex(v[i][0], v[i][1]); }
          endShape(CLOSE);
          pop();
        }

        function drawRhombus(x,y,r,ratio){
          const rx = r*ratio, ry = r;
          beginShape();
          vertex(x, y - ry);
          vertex(x + rx, y);
          vertex(x, y + ry);
          vertex(x - rx, y);
          endShape(CLOSE);
        }

        function lighten(c, amt){
          return [ c[0]+(255-c[0])*amt, c[1]+(255-c[1])*amt, c[2]+(255-c[2])*amt ];
        }

        function drawTeamBases(){
          for (let i=0;i<TEAMS.length;i++){
            const r = getTeamBaseRect(i);
            const c = TEAMS[i].color;
            push();
            noStroke();
            fill(c[0],c[1],c[2],70);
            rect(r.x, r.y, r.w, r.h, 8);
            pop();
          }
        }

        function drawSpawnAreasDebug(){
          if (!spawner) return;
          const cz = spawner.crasherZone;
          const nz = spawner.nestBox;
          push();
          noStroke();
          fill(...COLORS.debugCrasherZone);
          rect(cz.x, cz.y, cz.w, cz.h, 8);
          fill(...COLORS.debugHexZone);
          rect(nz.x, nz.y, nz.w, nz.h, 8);
          pop();
        }

        function drawTextWithOutline(label, x, y, opts={}) {
          const { size=16, bold=true, alignX=CENTER, alignY=CENTER } = opts;
          push();
          textAlign(alignX, alignY);
          textSize(size);
          textStyle(bold ? BOLD : NORMAL);

          fill(0,0,0,220);
          const off = 1.2;
          text(label, x-off, y); text(label, x+off, y);
          text(label, x, y-off); text(label, x, y+off);
          text(label, x-off, y-off); text(label, x+off, y-off);
          text(label, x-off, y+off); text(label, x+off, y+off);

          fill(...COLORS.barText);
          text(label, x, y);
          pop();
        }

        function drawMinimap() {
          const size = MINIMAP.size;
          const x = width - MINIMAP.margin - size;
          const y = height - MINIMAP.margin - size;
        
          push();
          noStroke(); fill(...COLORS.miniBg); rect(x, y, size, size, 3);
        
          const s = size / WORLD.w, ox = x, oy = y;
        
          for (let i=0;i<TEAMS.length;i++){
            const r = getTeamBaseRect(i);
            const c = TEAMS[i].color;
            const rx = ox + r.x * s, ry = oy + r.y * s, rw = r.w * s, rh = r.h * s;
            noStroke(); fill(c[0],c[1],c[2],120);
            rect(rx, ry, rw, rh, 0);
          }
        
          const px = ox + player.x*s, py = oy + player.y*s;
          const ang = player.barrelAng;
          const L = 7, B = 4;
          push();
          translate(px, py);
          rotate(ang);
          noStroke(); fill(60,60,60);
          beginShape();
          vertex(L, 0);
          vertex(-L*0.6, -B);
          vertex(-L*0.6, B);
          endShape(CLOSE);
          pop();
        
          noFill(); stroke(...COLORS.miniBorder); strokeWeight(4); rect(x+0.5, y+0.5, size-1, size-1, 3);
          pop();
        }

        function drawScoreBar() {
          const pct = TOTAL_TO_MAX > 0 ? constrain(player.xp / TOTAL_TO_MAX, 0, 1) : 1;
          const barW = Math.min(340, width - 40), barH = 20;
          const x = (width - barW)/2, y = height - 56;
          drawBar(x, y, barW, barH, pct, COLORS.scoreFill, `Score: ${Math.floor(player.xp)}`, true, false, COLORS.barBg, null, UI.barOuterR, UI.barInnerR, true);
        }

        function drawXPBar() {
          const lvl = player.level;
          const curr = player.xp - xpToLevel(lvl-1);
          const next = (lvl < LEVEL_CAP) ? (xpToLevel(lvl) - xpToLevel(lvl-1)) : 1;
          const pct = (lvl < LEVEL_CAP) ? constrain(curr / next, 0, 1) : 1;

          const barW = Math.min(420, width - 40), barH = 24;
          const x = (width - barW)/2, y = height - 30;
          drawBar(
            x, y, barW, barH, pct, COLORS.xpFill,
            `Level ${lvl} ${Math.floor(curr)}/${Math.max(1, Math.floor(next))}`,
            true, false, COLORS.barBg, null, UI.barOuterR, UI.barInnerR, true
          );
        }

        function drawStatsPanel() {
          const names = [
            "Health Regen","Max Health","Body Damage","Bullet Speed",
            "Bullet Penetration","Bullet Damage","Reload","Movement Speed"
          ];
          const keys = ['regen','maxHP','bodyDmg','bulletSpd','penetration','bulletDmg','reload','moveSpd'];
          const shortcuts = ['1','2','3','4','5','6','7','8'];
          const maxVal = 7;

          const leftX = 140;
          const blockH = names.length * UI.statRowH + 12;
          let y = height - 10 - blockH;

          const labelColW = 120;
          const barX = leftX - labelColW;
          const barRight = barX + UI.statBarW;

          y += 8;

          for (let i = 0; i < names.length; i++) {
            const val = player.stats[keys[i]];
            const fillCol = COLORS.statFills[i];
            const stepW = UI.statBarW / maxVal;

            noStroke();
            fill(...COLORS.barBg);
            rect(barX, y + 3, UI.statBarW, UI.statBarH, UI.statOuterR);

            const pad = UI.barPad;
            const ix = barX + pad, iy = y + 3 + pad;
            const iw = UI.statBarW - pad*2, ih = UI.statBarH - pad*2;

            const gap = 2;
            const segW = iw / maxVal;
            noStroke(); fill(...fillCol);
            for (let s = 0; s < val; s++) {
              const sx = ix + s * segW + gap * 0.5;
              const sw = Math.max(0, segW - gap);
              rect(sx, iy, sw, ih, 0);
            }

            drawTextWithOutline(names[i], barX + UI.statBarW/2, y + 3 + UI.statBarH/2 + 1, { size: 12, bold: false, alignX: CENTER, alignY: CENTER });

            const scX = barX + stepW * (maxVal - 0.5);
            drawTextWithOutline(`[${shortcuts[i]}]`, scX, y + 3 + UI.statBarH/2 + 1, { size: 12, bold: true, alignX: CENTER, alignY: CENTER });

            y += UI.statRowH;
          }
          if (player.statPoints > 0) {
            const baseY0 = height - 10 - blockH;
            push();
            translate(barRight + 10, baseY0 + 20);
            rotate(PI/15);
            drawTextWithOutline(`x${player.statPoints}`, 0, 0, { size: 18, bold: true, alignX: LEFT, alignY: BASELINE });
            pop();
          }
          textAlign(LEFT, BASELINE);
        }

        function drawBar(
          x, y, w, h, pct, fillColor, label,
          thickText=false, border=false, bgColor=null,
          padOverride=null, outerR=UI.barOuterR, innerR=UI.barInnerR,
          textOutline=false
        ) {
          const bg = bgColor || COLORS.barBg;

          noStroke(); fill(...bg); rect(x, y, w, h, outerR);
          if (border) {
            noFill(); stroke(bg[0], bg[1], bg[2], bg[3] !== undefined ? bg[3] : 255);
            strokeWeight(4); rect(x+0.5, y+0.5, w-1, h-1, outerR);
          }

          const pad = (padOverride !== null && padOverride !== undefined) ? padOverride : UI.barPad;
          const ix = x + pad, iy = y + pad;
          const iw = w - pad*2, ih = h - pad*2;
          noStroke(); fill(...fillColor); rect(ix, iy, iw * pct, ih, innerR);

          if (label) {
            const size = thickText ? 16 : 12;
            if (textOutline) {
              drawTextWithOutline(label, x + w/2, y + h/2 + 1, { size, bold: thickText });
            } else {
              push(); fill(...COLORS.barText); textAlign(CENTER, CENTER);
              if (thickText) { textStyle(BOLD); textSize(size); } else { textSize(size); }
              text(label, x + w/2, y + h/2 + 1);
              pop();
            }
          }
        }

        function drawDeathScreen(){
          push();
          noStroke(); fill(120,120,120,170); rect(0,0,width,height);

          const topY = height*0.25;
          drawTextWithOutline('You were killed by', width/2, topY, { size: 26, bold: true, alignX: CENTER, alignY: CENTER });
          const killer = player.deathInfo && player.deathInfo.killer ? player.deathInfo.killer : 'unknown';
          drawTextWithOutline(killer, width/2, topY + 36, { size: 32, bold: true, alignX: CENTER, alignY: CENTER });

          const midY = height*0.5;
          const sc = player.deathInfo ? player.deathInfo.score : Math.floor(player.xp);
          const lvl = player.deathInfo ? player.deathInfo.level : player.level;
          const tsec = player.deathInfo ? Math.floor(player.deathInfo.time) : 0;
          const mm = Math.floor(tsec/60);
          const ss = tsec % 60;

          drawTextWithOutline(`Score: ${sc}`, width/2, midY - 22, { size: 22, bold: true, alignX: CENTER, alignY: CENTER });
          drawTextWithOutline(`Level: ${lvl}`, width/2, midY + 2, { size: 22, bold: true, alignX: CENTER, alignY: CENTER });
          drawTextWithOutline(`Time alive: ${mm}m ${ss}s`, width/2, midY + 26, { size: 22, bold: true, alignX: CENTER, alignY: CENTER });

          const bw = 260, bh = 60;
          const bx = (width - bw)/2, by = height*0.78 - bh/2;
          const top = [142,178,254], bot = [117,146,207];
          const bd = [Math.floor(top[0]*0.72), Math.floor(top[1]*0.72), Math.floor(top[2]*0.72)];

          noStroke(); fill(top[0],top[1],top[2]); rect(bx, by, bw, bh/2, 10);
          fill(bot[0],bot[1],bot[2]); rect(bx, by+bh/2, bw, bh/2, 10);
          noFill(); stroke(bd[0],bd[1],bd[2]); strokeWeight(4); rect(bx+0.5, by+0.5, bw-1, bh-1, 10);

          drawTextWithOutline('Continue', width/2, by + bh/2 + 1, { size: 22, bold: true, alignX: CENTER, alignY: CENTER });
          pop();

          deathBtnRect = { x: bx, y: by, w: bw, h: bh };

          if (mouseX >= bx && mouseX <= bx + bw && mouseY >= by && mouseY <= by + bh) cursor(HAND); else cursor(ARROW);
        }

        function drawFPS() {
          const s = `FPS: ${fpsShown}`;
          const tw = textWidth(s) + 16, th = 20;
          const x = (width - tw)/2, y = 8;
          push(); noStroke(); fill(...COLORS.fpsPanelBg); rect(x, y, tw, th, 6);
          fill(...COLORS.fpsText); textAlign(CENTER, CENTER); textStyle(BOLD); text(s, x+tw/2, y+th/2+1);
          textStyle(NORMAL); textAlign(LEFT, BASELINE); pop();
        }

        function updateCamera(h?: number){
          const step = (typeof h === 'number' ? h : FIXED_H);
          const tx = (width >= WORLD.w) ? WORLD.w/2 : constrain(player.x, width/2, WORLD.w - width/2);
          const ty = (height >= WORLD.h) ? WORLD.h/2 : constrain(player.y, height/2, WORLD.h - height/2);
          const d = dFrame;
          const sp = Math.hypot(player.vx, player.vy);
          const moveRatio = Math.min(1, sp / (d.maxSpeed * 0.5));
          const k = 2 + (7 - 2) * moveRatio;
          cam.x = expLerp(cam.x, tx, k, h);
          cam.y = expLerp(cam.y, ty, k, h);
          cam.x = (width >= WORLD.w) ? WORLD.w/2 : constrain(cam.x, width/2, WORLD.w - width/2);
          cam.y = (height >= WORLD.h) ? WORLD.h/2 : constrain(cam.y, height/2, WORLD.h - height/2);
          cam.vx = 0; cam.vy = 0;
          const targetZoom = Math.max(0.65, Math.min(1.6, BASE_FOV / fovForTank(player)));
          const z0 = cam.zoom ?? targetZoom;
          const kZoom = 1 - Math.exp(-8 * step);
          const kPos  = 1 - Math.exp(-6 * step);

          cam.zoom = z0 + (targetZoom - z0) * kZoom;
          cam.x += (player.x - cam.x) * kPos;
          cam.y += (player.y - cam.y) * kPos;

          const z  = cam.zoom || 1;
          const hw = width  / (2 * z);
          const hh = height / (2 * z);

          const eps = 0.5 / z;
          cam.x = constrain(cam.x, hw - eps, WORLD.w - hw + eps);
          cam.y = constrain(cam.y, hh - eps, WORLD.h - hh + eps);
        }

        function mousePressed(){
          if (player && player.isDead && deathBtnRect){
            if (mouseX >= deathBtnRect.x && mouseX <= deathBtnRect.x + deathBtnRect.w && mouseY >= deathBtnRect.y && mouseY <= deathBtnRect.y + deathBtnRect.h){
              respawnTankCommon(player);
              blockShootUntilRelease = true;
              return;
            }
          }
        }

        function mouseReleased(){
          blockShootUntilRelease = false;
        }

        function keyPressed() {
          if (key === 'F' || key === 'f' || (keyCode === ENTER && keyIsDown(ALT))) {
            const fs = fullscreen();
            fullscreen(!fs);
            return;
          }
          if (key === 'E' || key === 'e') { autoShoot = !autoShoot; return; }
          if (key === 'C' || key === 'c') { autoSpin = !autoSpin; if (autoSpin) { const wx = cam.x - width/2 + mouseX; const wy = cam.y - height/2 + mouseY; player.barrelAng = Math.atan2(wy - player.y, wx - player.x); } return; }
          const map = {'1':'regen','2':'maxHP','3':'bodyDmg','4':'bulletSpd','5':'penetration','6':'bulletDmg','7':'reload','8':'moveSpd'};
          const k = map[key];
          if (k && player.statPoints > 0 && player.stats[k] < 7) {
            player.stats[k] += 1; player.statPoints -= 1;
            if (k === 'maxHP') { const d = dFrame; player.hp = Math.min(player.hp + 20, d.maxHP); }
          }
        }

        p.setup = setup;
        p.draw = draw;
        if (typeof windowResized === 'function') p.windowResized = windowResized;
        if (typeof mousePressed   === 'function') p.mousePressed   = mousePressed;
        if (typeof mouseReleased  === 'function') p.mouseReleased  = mouseReleased;
        if (typeof keyPressed     === 'function') p.keyPressed     = keyPressed;
        if (typeof keyReleased    === 'function') p.keyReleased    = keyReleased;
      };

      if (mounted && hostRef.current) {
        p5Ref.current = new P5(sketch, hostRef.current);
        if (hostRef.current) {
          const el = hostRef.current;
          const ro = new ResizeObserver(() => {
            const w = el.clientWidth  || 1;
            const h = el.clientHeight || 1;
            p5Ref.current?.resizeCanvas(w, h, true);
          });
          ro.observe(el);
        
          return () => {
            ro.disconnect();
            p5Ref.current?.remove();
          };
        }
      }
    })();

    return () => {
      mounted = false;
      if (p5Ref.current) {
        try { p5Ref.current.remove(); } catch {}
        p5Ref.current = null;
      }
    };
  }, []);

  return <div ref={hostRef} style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }} />;
}
