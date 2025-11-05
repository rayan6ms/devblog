'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import type p5Types from 'p5';
import { Chess, type Color, type Square, type PieceSymbol } from 'chess.js';

const COLORS = {
  light: '#a1a1aa',
  dark:  '#374151',
  selected: 'rgba(199,210,254,0.8)',
  lastMove:'rgba(254,215,170,0.8)',
  capture: 'rgba(254,202,202,0.8)',
  check:   'rgba(239,68,68,0.6)',
  dot:     'rgba(165,180,252,1)',
  whitePiece:'#e5e7eb',
  blackPiece:'#0f172a',
  dim:     'rgba(0,0,0,0.55)',
  hint:    'rgba(240,209,86,0.70)',
};

const GLYPH: Record<PieceSymbol,{w:string;b:string}> = {
  p:{w:'♙',b:'♟'}, r:{w:'♖',b:'♜'}, n:{w:'♘',b:'♞'},
  b:{w:'♗',b:'♝'}, q:{w:'♕',b:'♛'}, k:{w:'♔',b:'♚'},
};

const PIECE_VALUE: Record<PieceSymbol, number> = { p:1, n:3, b:3, r:5, q:9, k:0 };

function materialTotals(g: Chess){
  let w = 0, b = 0;
  for (let f = 0; f < 8; f++) for (let r = 0; r < 8; r++){
    const sq = toSquare(f, r); const pc = g.get(sq); if(!pc) continue;
    if (pc.color === 'w') w += PIECE_VALUE[pc.type]; else b += PIECE_VALUE[pc.type];
  }
  return { w, b };
}

const MOVE_TIME_LIMIT_MS = 3 * 60 * 1000;

function materialScore(g: Chess){
  let w = 0, b = 0;
  for(let f=0; f<8; f++) for(let r=0; r<8; r++){
    const sq = toSquare(f,r); const pc = g.get(sq); if(!pc) continue;
    (pc.color==='w' ? (w+=PIECE_VALUE[pc.type]) : (b+=PIECE_VALUE[pc.type]));
  }
  return w - b;
}

function fmtSec(ms:number){ return (ms/1000).toFixed(1)+'s'; }

type PlayAs = 'w'|'b'|null;
type LoggedMove = {
  from: Square; to: Square; color: Color;
  fenBefore: string; fenAfter: string;
  promotion?: PieceSymbol; san?: string; piece?: PieceSymbol;
  captured?: PieceSymbol; timeMs?: number; acc?: number;
};
const DEFAULT_DEPTH = 1;
const SKILL_FOR_DEPTH: Record<number, number> = { 1: 1, 3: 5, 6: 10, 10: 20 };
const HUMAN_ENGINE_DELAY_BASE = 4200;
const AI_VS_AI_DELAY_BASE = 3600;
const ENGINE_TIMEOUT_MS = 3200;
function thinkDelay(base:number, variance=0.45, min=2100, max=5200){
  const jitter = base * variance;
  const d = Math.round(base + (Math.random()*2 - 1) * jitter);
  return Math.max(min, Math.min(max, d));
}

function useStockfish(){
  const workerRef = useRef<Worker|null>(null);
  const [ready,setReady] = useState(false);

  useEffect(() => {
    const w = new Worker('/stockfish.js');
    workerRef.current = w;
  
    const onMsg = (e: MessageEvent<any>) => {
      const d = e.data;
      const line = typeof d === 'string' ? d : (d?.type ?? '');
      if (line.includes('uciok') || line === 'uciok' || line === 'readyok') {
        setReady(true);
      }
    };
  
    w.addEventListener('message', onMsg);
    w.postMessage('uci');
    w.postMessage('isready');
    return () => { w.removeEventListener('message', onMsg); w.terminate(); workerRef.current = null; };
  }, []);

  const setOptions = (opts: Record<string, string|number|boolean>)=>{
    const w = workerRef.current; if(!w) return;
    for(const [k,v] of Object.entries(opts)){
      w.postMessage(`setoption name ${k} value ${v}`);
    }
  };

  const go = (
    fen:string,
    depth:number,
    opts:{
      onBest:(uci:string)=>void; onTimeout?:()=>void; timeoutMs?:number;
      skill?:number; movetime?:number;
    }
  )=>{
    const w = workerRef.current; if(!w) return () => {};
    w.postMessage('stop');
    let done = false;

    const handle = (e:MessageEvent<string>)=>{
      const t = e.data || '';
      if(!t.startsWith('bestmove')) return;
      if(done) return;
      done = true;
      w.removeEventListener('message', handle);
      clearTimeout(timer);
      opts.onBest(t.split(/\s+/)[1]);
    };

    w.addEventListener('message', handle);
    if (opts.skill != null) w.postMessage(`setoption name Skill Level value ${opts.skill}`);
    w.postMessage(`position fen ${fen}`);
    w.postMessage(opts.movetime ? `go movetime ${opts.movetime}` : `go depth ${depth}`);

    const timer = window.setTimeout(()=>{
      if(done) return;
      done = true;
      w.removeEventListener('message', handle);
      w.postMessage('stop');
      opts.onTimeout?.();
    }, opts.timeoutMs ?? 5000);

    return ()=>{
      if(done) return;
      done = true;
      w.removeEventListener('message', handle);
      w.postMessage('stop');
      clearTimeout(timer);
    };
  };

  return {ready,setOptions,go};
}

function toSquare(f:number,r:number):Square{ return (String.fromCharCode(97+f)+(r+1)) as Square; }
function parseUCIMove(uci:string){ return { from:uci.slice(0,2) as Square, to:uci.slice(2,4) as Square, promotion: uci[4] as any }; }
function findCheckedKingSquare(g:Chess):Square|null{
  if(!g.inCheck()) return null; const c:Color = g.turn();
  for(let f=0; f<8; f++) for(let r=0; r<8; r++){
    const sq=toSquare(f,r), p=g.get(sq);
    if(p && p.type==='k' && p.color===c) return sq;
  }
  return null;
}

function randomLegalUCIMove(fen:string){ const g=new Chess(fen); const ms=g.moves({ verbose:true }); if(ms.length===0) return ''; const m=ms[Math.floor(Math.random()*ms.length)]; return `${m.from}${m.to}${m.promotion||''}`; }

export default function ChessP5(){
  const containerRef = useRef<HTMLDivElement|null>(null);
  const pRef = useRef<p5Types|null>(null);

  const [game, setGame] = useState(()=>new Chess());
  const [playAs, setPlayAs] = useState<PlayAs>('w');
  const [boardH, setBoardH] = useState<number>(560);
  const [flip, setFlip] = useState(false);
  const [depth, setDepth] = useState<number>(DEFAULT_DEPTH);
  const [selected, setSelected] = useState<Square|null>(null);
  const [moves, setMoves] = useState<Square[]>([]);
  const [lastMove, setLastMove] = useState<{from:Square;to:Square}|null>(null);
  const [overlay, setOverlay] = useState<string|null>(null);
  const [thinking, setThinking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [taken, setTaken] = useState<{ w: PieceSymbol[]; b: PieceSymbol[] }>({ w:[], b:[] });
  const [pairs, setPairs] = useState<Array<{ index:number; w:{ san:string; piece:PieceSymbol; timeMs:number; acc:number }; b:{ san:string; piece:PieceSymbol; timeMs:number; acc:number } }>>([]);
  type HintsMode = 'off'|'once'|'auto';
  const [hintsMode, setHintsMode] = useState<HintsMode>('off');
  const [hintMove, setHintMove] = useState<{from:Square; to:Square} | null>(null);
  const hintCancelRef = useRef<null | (()=>void)>(null);
  
  const turnStartRef = useRef<number>(performance.now());
  const pauseStartedAtRef = useRef<number | null>(null);
  const hiddenStartedAtRef = useRef<number | null>(null);
  
  const moveSetRef = useRef<Set<Square>>(new Set());
  const engineCancelRef = useRef<null | (()=>void)>(null);
  const [redoCount, setRedoCount] = useState(0);
  const waitingRef = useRef(false);
  const aiTimerRef = useRef<number|null>(null);
  const moveLogRef = useRef<LoggedMove[]>([]);
  const redoStackRef = useRef<LoggedMove[]>([]);
  const moveListRef = useRef<HTMLDivElement|null>(null);
  const { ready:engineReady, go:engineGo,   setOptions:engineSetOptions   } = useStockfish();

  useEffect(()=>{
    if (!engineReady) return;
    try {
      const threads = Math.max(1, Math.min(4, (navigator as any).hardwareConcurrency || 2));
      engineSetOptions({ Threads: threads, Hash: 32 });
    } catch {}
  }, [engineReady, engineSetOptions]);

  const rRef = useRef({ game, playAs, flip, selected, moves, lastMove, overlay, paused, hintMove });
  useEffect(()=>{ rRef.current = { game, playAs, flip, selected, moves, lastMove, overlay, paused, hintMove }; },
    [game, playAs, flip, selected, moves, lastMove, overlay, paused, hintMove]);

  useEffect(() => {
    const el = moveListRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [pairs.length]);

  useEffect(() => {
    const p = pRef.current;
    if (!p) return;
    if (paused || overlay) p.noLoop();
    else p.loop();
  }, [paused, overlay]);

  useEffect(() => {
    const onVis = () => {
      const p = pRef.current;
      if (document.hidden) {
        if (hiddenStartedAtRef.current == null) hiddenStartedAtRef.current = performance.now();
        p?.noLoop();
      } else {
        if (hiddenStartedAtRef.current != null) {
          turnStartRef.current += performance.now() - hiddenStartedAtRef.current;
          hiddenStartedAtRef.current = null;
        }
        if (!paused && !overlay) p?.loop();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [paused, overlay]);

  useEffect(()=>{ setFlip(playAs==='b'); },[playAs]);
  useEffect(()=>{ turnStartRef.current = performance.now(); },[]);

  useEffect(() => {
    const p = pRef.current;
    if (!p) return;
    if (paused || overlay) p.redraw();
  }, [hintMove, paused, overlay]);

  const instRef = useRef<p5Types | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);

  const totals = useMemo(()=>materialTotals(game), [game.fen()]);

  const whitePct = useMemo(() => {
    const { w, b } = materialTotals(game);
    const sum = w + b;
    return sum ? (w / sum) : 0.5;
  }, [game.fen()]);

  useEffect(() => {
    let cancelled = false;

    const sketch = (p: p5Types) => {
      pRef.current = p;
      p.setup = () => {
        const w = containerRef.current?.clientWidth ?? 560;
        const c = p.createCanvas(w, w);
        c.parent(containerRef.current!);
        p.textAlign(p.CENTER, p.CENTER);
        setBoardH(w);

        p.pixelDensity(1);
        p.frameRate(30);
      };

      p.draw = () => {
        const rr = rRef.current;
        const showHint = rr.hintMove;
        drawBoard(p, rr.game, rr.flip, rr.lastMove, rr.selected, rr.moves, showHint);

        if (rr.overlay || rr.paused) {
          p.fill(COLORS.dim); p.noStroke(); p.rect(0,0,p.width,p.height);
          p.fill('#fff'); p.textSize(Math.floor(p.width*0.06));
          p.text(rr.overlay ?? 'Paused', p.width/2, p.height/2);
          p.cursor('default');
          return;
        }

        const q = p.width / 8;
        const x = p.mouseX, y = p.mouseY;
        if (x >= 0 && y >= 0 && x < p.width && y < p.height) {
          const fDisp = Math.floor(x / q), rDisp = Math.floor(y / q);
          const f = rr.flip ? 7 - fDisp : fDisp;
          const rk = rr.flip ? rDisp : 7 - rDisp;
          const sq = toSquare(f, rk);
          const piece = rr.game.get(sq);
          p.cursor(piece ? 'pointer' : 'default');
        } else {
          p.cursor('default');
        }
      };

      p.mousePressed = () => {
        const rr = rRef.current;
        if (rr.overlay || rr.paused) return;
        const q = p.width/8, x=p.mouseX, y=p.mouseY;
        if (x<0||y<0||x>=p.width||y>=p.height) return;

        const fDisp = Math.floor(x/q), rDisp = Math.floor(y/q);
        const f = rr.flip ? 7-fDisp : fDisp;
        const rk = rr.flip ? rDisp : 7-rDisp;
        const sq = toSquare(f, rk);

        const turn = rr.game.turn();
        const piece = rr.game.get(sq);
        const isHumanTurn = rr.playAs!==null && turn===rr.playAs;

        if (rr.selected && rr.selected === sq) {
          setSelected(null);
          setMoves([]);
          moveSetRef.current = new Set();
          return;
        }

        if (rr.selected===null) {
          if (isHumanTurn && piece && piece.color===turn) {
            setSelected(sq);
            const list = rr.game.moves({ square: sq, verbose: true }).map(m=>m.to as Square);
            setMoves(list);
            moveSetRef.current = new Set(list);
          }
          return;
        }

        if (piece && piece.color===turn) {
          setSelected(sq);
          const list = rr.game.moves({ square: sq, verbose: true }).map(m=>m.to as Square);
          setMoves(list);
          moveSetRef.current = new Set(list);
          return;
        }

        if (moveSetRef.current.has(sq)) {
          applyMove({ from: rr.selected, to: sq });
          return;
        }
      };
    };

    import('p5').then(({ default: P5 }) => {
      if (cancelled) return;
      const inst = new P5(sketch);
      instRef.current = inst;

      const ro = new ResizeObserver(entries => {
        if (!instRef.current) return;
        for (const e of entries) {
          const w = Math.floor(e.contentRect.width);
          instRef.current.resizeCanvas(w, w);
          setBoardH(w);
        }
      });
      roRef.current = ro;
      if (containerRef.current) ro.observe(containerRef.current);
    });

    return () => {
      cancelled = true;
      roRef.current?.disconnect();
      roRef.current = null;
      instRef.current?.remove();
      instRef.current = null;
      pRef.current = null;
    };
  }, []);

  useEffect(()=>{
    if(aiTimerRef.current){ clearTimeout(aiTimerRef.current); aiTimerRef.current=null; }
    if(engineCancelRef.current){ engineCancelRef.current(); engineCancelRef.current=null; }

    waitingRef.current = false;
    setThinking(false);
  
    if(overlay || paused || !engineReady) { setThinking(false); return; }
  
    const turn = game.turn();
    const useRandom = depth <= 1;
  
    const scheduleApply = (uciOrEmpty:string, baseDelay:number)=>{
      aiTimerRef.current = window.setTimeout(()=>{
        waitingRef.current = false; setThinking(false);
  
        if(!uciOrEmpty || uciOrEmpty === '(none)'){
          const test = new Chess(rRef.current.game.fen());
          const ms = test.moves({ verbose:true });
          if(ms.length){
            const m = ms[Math.floor(Math.random()*ms.length)];
            applyMove({ from:m.from as Square, to:m.to as Square, promotion:(m.promotion as any) });
          } else {
            const out = gameOutcome(test); if(out) setOverlay(out);
          }
          return;
        }
  
        const {from,to,promotion} = parseUCIMove(uciOrEmpty);
        applyMove({ from, to, promotion });
      }, thinkDelay(baseDelay));
    };
  
    if(playAs===null){
      if(!waitingRef.current){
        waitingRef.current = true; setThinking(true);
        if(useRandom){
          scheduleApply(randomLegalUCIMove(game.fen()), AI_VS_AI_DELAY_BASE);
        }else{
          const skill = SKILL_FOR_DEPTH[depth] ?? 5;

          engineCancelRef.current = engineGo(game.fen(), depth, {
            timeoutMs: ENGINE_TIMEOUT_MS,
            skill,
            onBest:    (uci)=> scheduleApply(uci, AI_VS_AI_DELAY_BASE),
            onTimeout: ()=>  scheduleApply('',   AI_VS_AI_DELAY_BASE),
          });
        }
      }
      return;
    }
  
    if(turn!==playAs && !waitingRef.current){
      waitingRef.current = true; setThinking(true);
      if(useRandom){
        scheduleApply(randomLegalUCIMove(game.fen()), HUMAN_ENGINE_DELAY_BASE);
      }else{
        const skill = SKILL_FOR_DEPTH[depth] ?? 5;

        engineCancelRef.current = engineGo(game.fen(), depth, {
          timeoutMs: ENGINE_TIMEOUT_MS,
          skill,
          onBest:    (uci)=> scheduleApply(uci, HUMAN_ENGINE_DELAY_BASE),
          onTimeout: ()=>  scheduleApply('',   HUMAN_ENGINE_DELAY_BASE),
        });
      }
    }
  }, [game.fen(), playAs, engineReady, depth, overlay, paused]);

  useEffect(() => {
    if (playAs === null) return;
  
    const myTurn = game.turn() === playAs;
  
    if (!myTurn) {
      if (hintCancelRef.current) { hintCancelRef.current(); hintCancelRef.current = null; }
      setHintMove(null);
      return;
    }
  
    if (!engineReady) return;
  
    if (hintsMode === 'auto' || hintsMode === 'once') {
      requestHint();
    }
  }, [game.fen(), hintsMode, playAs, engineReady]);

  function gameOutcome(g: Chess): string | null {
    if (g.isCheckmate()) return g.turn() === 'w' ? 'Black wins (checkmate)' : 'White wins (checkmate)';
    if (g.isStalemate()) return 'Stalemate';
    if (g.isThreefoldRepetition()) return 'Threefold repetition';
    if (g.isInsufficientMaterial()) return 'Insufficient material';
    if (g.isDraw()) return 'Draw';
    return null;
  }

  function rebuildFromLog(){
    const tk = { w:[] as PieceSymbol[], b:[] as PieceSymbol[] };
    const pr: Array<{ index:number; w:{ san:string; piece:PieceSymbol; timeMs:number; acc:number }; b:{ san:string; piece:PieceSymbol; timeMs:number; acc:number } }> = [];
    let idx = 1; let curW: { san:string; piece:PieceSymbol; timeMs:number; acc:number } | null = null;
  
    for(const m of moveLogRef.current){
      if(m.captured){ (m.color==='w' ? tk.b : tk.w).push(m.captured as PieceSymbol); }
      const md = { san: m.san || '', piece: (m.piece as PieceSymbol) || 'p', timeMs: m.timeMs || 0, acc: m.acc ?? 50 };
      if (m.color === 'w') {
        curW = md;
      } else {
        if (curW) { pr.push({ index: idx, w: curW, b: md }); idx++; curW = null; }
      }
    }
  
    setTaken(tk);
    setPairs(pr);
  }

  function requestHint() {
    const rr = rRef.current;
    if (rr.playAs === null || rr.game.turn() !== rr.playAs) return;
    if (!engineReady) { setHintMove(null); return; }
  
    if (hintCancelRef.current) { hintCancelRef.current(); hintCancelRef.current = null; }
  
    const d = depth;
    const skill = SKILL_FOR_DEPTH[d] ?? 5;
  
    hintCancelRef.current = engineGo(rr.game.fen(), d, {
      timeoutMs: ENGINE_TIMEOUT_MS,
      skill,
      onBest: (uci) => {
        const next = parseUCIMove(uci);
        setHintMove(prev => (prev && prev.from===next.from && prev.to===next.to ? prev : next));
      },
      onTimeout: () => setHintMove(null),
    });
  }

  function startNewGame(next:PlayAs|null=playAs){
    if(aiTimerRef.current){ clearTimeout(aiTimerRef.current); aiTimerRef.current=null; }
    if(engineCancelRef.current){ engineCancelRef.current(); engineCancelRef.current=null; }

    if (hintCancelRef.current) { hintCancelRef.current(); hintCancelRef.current = null; }
    setHintMove(null);
    setHintsMode('off');
  
    const g = new Chess();
    setGame(g); setPlayAs(next); setFlip(next==='b');
    setSelected(null); setMoves([]); setLastMove(null);
    moveSetRef.current = new Set();
    moveLogRef.current = [];
    redoStackRef.current = [];
    setRedoCount(0);
    setOverlay(null); waitingRef.current=false; setThinking(false);
    setTaken({ w:[], b:[] });
    setPairs([]);
    turnStartRef.current = performance.now();
  }
  

  function applyMove(m:{from:Square;to:Square;promotion?:'q'|'r'|'b'|'n'}){
    const base = rRef.current.game;
    const fenBefore = base.fen();
    const g = new Chess(fenBefore);
    const nowTs = performance.now();
    const timeMs = nowTs - turnStartRef.current;
  
    const ok = g.moves({ verbose:true }).some(mm =>
      (mm.from as Square) === m.from && (mm.to as Square) === m.to
    );
    if(!ok) return;
  
    const piece = g.get(m.from);
    const needsPromo = piece?.type === 'p' && (m.to[1] === '1' || m.to[1] === '8');
  
    const mv = g.move({ from:m.from, to:m.to, promotion: needsPromo ? 'q' : m.promotion });
    if(!mv) return;

    const beforeScore = materialScore(new Chess(fenBefore));
    const fenAfter = g.fen();
    const afterScore = materialScore(g);

    const delta = afterScore - beforeScore;

    const SCALE = 50 / 9;
    let accMove = 50;
    if ((mv as any).color === 'w') {
      accMove = Math.max(0, Math.min(100, 50 + delta * SCALE));
    } else {
      accMove = Math.max(0, Math.min(100, 50 - delta * SCALE));
    }

    if((mv as any).captured){
      const cap = (mv as any).captured as PieceSymbol;
      if((mv as any).color==='w') setTaken(prev=>({ ...prev, b:[...prev.b, cap] }));
      else setTaken(prev=>({ ...prev, w:[...prev.w, cap] }));
    }
  
    const fenAfterFinal = g.fen();
    moveLogRef.current.push({
      from: mv.from as Square,
      to:   mv.to   as Square,
      promotion: (mv as any).promotion,
      color: mv.color as Color,
      fenBefore,
      fenAfter: fenAfterFinal,
      san: (mv as any).san,
      piece: (mv as any).piece,
      captured: (mv as any).captured as any,
      timeMs,
      acc: accMove,
    });
  
    redoStackRef.current = [];
    setRedoCount(0);
    setGame(g);
    setLastMove({ from: mv.from as Square, to: mv.to as Square });

    const mover = (mv as any).color as Color;
    if (mover === rRef.current.playAs) {
      if (hintCancelRef.current) { hintCancelRef.current(); hintCancelRef.current = null; }
      setHintMove(null);
      setHintsMode(prev => (prev === 'once' ? 'off' : prev));
    }

    turnStartRef.current = performance.now();
  
    setSelected(null);
    setMoves([]);
    moveSetRef.current = new Set();
  
    const out = gameOutcome(g);
    if(out) setOverlay(out);
    rebuildFromLog();
  }

  function undo(){
    if(overlay) setOverlay(null);
    if(playAs===null) return;
  
    if(aiTimerRef.current){ clearTimeout(aiTimerRef.current); aiTimerRef.current=null; }
    if(engineCancelRef.current){ engineCancelRef.current(); engineCancelRef.current=null; }
    waitingRef.current=false; setThinking(false);
  
    const log = moveLogRef.current;
    if(!log.length) return;
  
    if(log.length && log[log.length-1].color !== playAs){
      const ai = log.pop()!;
      redoStackRef.current.push(ai);
      setRedoCount(redoStackRef.current.length);
    }
    
    if(!log.length || log[log.length-1].color !== playAs) return;
    const mine = log.pop()!;
    redoStackRef.current.push(mine);
    setRedoCount(redoStackRef.current.length);
  
    const g = log.length ? new Chess(log[log.length-1].fenAfter) : new Chess();
    setGame(g);
  
    if(log.length){
      const last = log[log.length-1];
      setLastMove({ from: last.from, to: last.to });
    }else{
      setLastMove(null);
    }
  
    setSelected(null); setMoves([]); moveSetRef.current = new Set();
    rebuildFromLog();
  }
  
  function redo(){
    const next = redoStackRef.current.pop(); if(!next) return;
    setRedoCount(redoStackRef.current.length);
  
    setGame(new Chess(next.fenAfter));
    moveLogRef.current.push(next);
    setLastMove({ from: next.from, to: next.to });
  
    setSelected(null); setMoves([]); moveSetRef.current = new Set();
    const out = gameOutcome(new Chess(next.fenAfter)); if(out) setOverlay(out);
    rebuildFromLog();
  }
  
  function surrender(){
    const winner = rRef.current.game.turn()==='w' ? 'Black wins' : 'White wins';
    setOverlay(`${winner} (surrender)`);
  }

  const isAIvAI = playAs===null;
  const effectivePlayAs: 'w' | 'b' = playAs ?? 'w';
  const turnLabel   = game.turn()==='w' ? 'White' : 'Black';
  const playingLabel= isAIvAI ? 'AI vs AI' : (playAs==='w' ? 'White' : 'Black');

  function cycleHints(){
    if (isAIvAI) return;
  
    if (hintCancelRef.current) { hintCancelRef.current(); hintCancelRef.current = null; }
    setHintMove(null);
  
    setHintsMode(prev => {
      const next: HintsMode = prev === 'off' ? 'once' : prev === 'once' ? 'auto' : 'off';
  
      const rr = rRef.current;
      if (rr.playAs !== null && rr.game.turn() === rr.playAs && (next === 'once' || next === 'auto')) {
        requestHint();
      }
      return next;
    });
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="w-fit mx-auto mt-1 mb-2 rounded-xl border border-zinc-700/50 bg-zinc-900/60 px-3 py-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-300">Play as</span>
          <div className="inline-flex rounded-lg overflow-hidden border border-zinc-700/60">
            <button onClick={()=>startNewGame('w')}
              className={`px-4 py-1.5 text-sm ${playAs==='w'?'bg-zinc-200 text-zinc-900':'bg-zinc-800/60 text-zinc-200 hover:bg-zinc-700/60'}`}>White</button>
            <button onClick={()=>startNewGame('b')}
              className={`px-4 py-1.5 text-sm ${playAs==='b'?'bg-zinc-200 text-zinc-900':'bg-zinc-800/60 text-zinc-200 hover:bg-zinc-700/60'}`}>Black</button>
            <button onClick={()=>startNewGame(null)}
              className={`px-4 py-1.5 text-sm ${isAIvAI?'bg-zinc-200 text-zinc-900':'bg-zinc-800/60 text-zinc-200 hover:bg-zinc-700/60'}`}>AI vs AI</button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-zinc-300">Difficulty</label>
          <select value={depth} onChange={e=>setDepth(Number(e.target.value))}
            className="rounded-md border border-zinc-700 bg-zinc-800/70 py-1.5 text-sm text-center text-zinc-100">
            <option value={1}>Easy</option><option value={3}>Medium</option>
            <option value={6}>Hard</option><option value={10}>No Way</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={cycleHints}
            disabled={isAIvAI}
            className={`rounded-md border px-4 py-1.5 text-sm select-none ${
              isAIvAI
              ? 'border-zinc-700/40 bg-zinc-800/30 text-zinc-500 cursor-not-allowed'
              : hintsMode==='off'
                ? 'border-zinc-700 bg-zinc-800/70 text-zinc-100 hover:bg-zinc-700'
                : hintsMode==='once'
                  ? 'border-yellow-500/60 bg-yellow-500/20 text-yellow-100 hover:bg-yellow-500/30'
                  : 'border-yellow-500/60 bg-yellow-500/30 text-yellow-100 hover:bg-yellow-500/40'
            }`}
            title="Cycle: Once → Always → Off"
          >
            💡 Hints: {hintsMode==='off' ? 'Off' : hintsMode==='once' ? 'Once' : 'Always'}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={()=>{
              const next = !paused;
              setPaused(next);
              const now = performance.now();
            
              if (next) {
                pauseStartedAtRef.current = now;
                if (aiTimerRef.current) { clearTimeout(aiTimerRef.current); aiTimerRef.current = null; }
                waitingRef.current = false;
                setThinking(false);
              } else {
                if (pauseStartedAtRef.current != null) {
                  turnStartRef.current += (now - pauseStartedAtRef.current);
                  pauseStartedAtRef.current = null;
                }
              }
            }}
            className="rounded-md border border-zinc-700 bg-zinc-800/70 px-4 py-1.5 text-sm text-zinc-100 hover:bg-zinc-700"
          >
            {paused ? '▶ Resume' : '⏸ Pause'}
          </button>
          <button onClick={()=>startNewGame(playAs)}
            className="rounded-md border border-zinc-700 bg-zinc-800/70 px-4 py-1.5 text-sm text-zinc-100 hover:bg-zinc-700">New</button>
          <button onClick={undo}
            className="rounded-md border border-zinc-700 bg-zinc-800/70 px-4 py-1.5 text-sm text-zinc-100 hover:bg-zinc-700">Undo</button>
          <button onClick={redo} disabled={redoCount===0}
            className={`rounded-md border px-4 py-1.5 text-sm ${
              redoCount
                ? 'border-zinc-700 bg-zinc-800/70 text-zinc-100 hover:bg-zinc-700'
                : 'border-zinc-700/40 bg-zinc-800/30 text-zinc-500 cursor-not-allowed'
            }`}>Redo</button>
          <button onClick={surrender}
            className="rounded-md border border-red-600/40 bg-red-600/20 px-4 py-1.5 text-sm text-red-200 hover:bg-red-600/30">Surrender</button>
        </div>
      </div>

      <div className="relative grid grid-cols-[36px_1fr_360px] gap-3 items-stretch">
        <div className="hidden sm:flex items-stretch">
          <div className="relative w-9 rounded-lg overflow-hidden border border-zinc-700/60 bg-zinc-800/60">
            <div className="absolute inset-0 bg-zinc-900" />
            {flip ? (
              <div className="absolute inset-x-0 top-0" style={{ height: `${whitePct*100}%`, background: '#e4e4e7' }} />
            ) : (
              <div className="absolute inset-x-0 bottom-0" style={{ height: `${whitePct*100}%`, background: '#e4e4e7' }} />
            )}
            {flip ? (
              <>
                <div className="absolute left-0 top-1 py-1 w-full text-center text-[10px] leading-none font-bold text-zinc-800">
                  {totals.w}
               </div>
               <div className="absolute left-0 bottom-1 py-1 w-full text-center text-[10px] leading-none font-bold text-zinc-200">
                {totals.b}
               </div>
              </>
            ) : (
              <>
                <div className="absolute left-0 top-1 py-1 w-full text-center text-[10px] leading-none font-bold text-zinc-200">
                  {totals.b}
               </div>
               <div className="absolute left-0 bottom-1 py-1 w-full text-center text-[10px] leading-none font-bold text-zinc-800">
                {totals.w}
               </div>
              </>
            )}
          </div>
        </div>

        <div className="relative">
          <div ref={containerRef} className="relative mx-auto aspect-square w-full max-w-3xl overflow-hidden rounded-lg" />
          {overlay && <div className="absolute inset-0" onClick={()=>setOverlay(null)} />}
        </div>

        <div
          className="w-[360px] rounded-xl border border-zinc-700/50 bg-zinc-900/60 p-3 flex flex-col h-full min-h-0"
          style={{ maxHeight: boardH }}
        >
          <div className="flex-1 flex flex-col justify-start gap-3 min-h-0">
            <div className="flex items-start justify-between gap-2 h-20 shrink-0">
              <div className="flex flex-wrap gap-1 text-2xl leading-none overflow-hidden">
                {(effectivePlayAs==='w' ? taken.w : taken.b).map((t, i)=><span key={i}>{GLYPH[t][effectivePlayAs==='w'?'b':'w']}</span>)}
              </div>
              <div className="select-none">
                <div
                  className="rounded-xl px-2 py-1 text-2xl font-extrabold"
                  style={{
                    background: effectivePlayAs === 'w' ? '#2d2e2e' : '#e4e4e7',
                    color:      effectivePlayAs === 'w' ? '#ffffff' : '#2d2e2e'
                  }}
                >
                  {(effectivePlayAs === 'w' ?  (100 - whitePct * 100) : (whitePct * 100)).toFixed(1)}
                </div>
              </div>
            </div>

            <div ref={moveListRef} className="flex-1 overflow-auto -mx-3 min-h-64">
              {pairs.map((row, i)=>{
                const even = (i%2)===1;
                const rowCls = even ? 'bg-zinc-800/40' : 'bg-zinc-900/40';
                const wBar = Math.min(1, row.w.timeMs / MOVE_TIME_LIMIT_MS);
                const bBar = Math.min(1, row.b.timeMs / MOVE_TIME_LIMIT_MS);

                return (
                <div key={row.index} className={`${rowCls} py-1 pr-2 flex items-center gap-2`}>
                    <span className="w-7 text-right text-zinc-300">{row.index}.</span>

                  <div className="flex items-center gap-2 text-zinc-100">
                      <span className="text-lg leading-none">{GLYPH[row.w.piece].b}</span>
                      <span className="text-sm">{row.w.san}</span>
                    </div>

                  <div className="flex items-center gap-2 text-zinc-500">
                      <span className="text-lg leading-none">{GLYPH[row.b.piece].w}</span>
                      <span className="text-sm">{row.b.san}</span>
                    </div>

                    <div className="ml-auto w-36">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1">
                          <div className="relative h-3 flex-1">
                            <div className="absolute inset-y-0 right-0 rounded-sm bg-zinc-200" style={{ width: `${wBar * 100}%` }} />
                          </div>
                          <span className="text-[10px] leading-none text-zinc-300">{fmtSec(row.w.timeMs)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="relative h-3 flex-1">
                            <div className="absolute inset-y-0 right-0 rounded-sm bg-zinc-500" style={{ width: `${bBar * 100}%` }} />
                          </div>
                          <span className="text-[10px] leading-none text-zinc-400">{fmtSec(row.b.timeMs)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-end justify-between gap-2 h-20 shrink-0">
              <div className="flex flex-wrap gap-1 text-2xl leading-none overflow-hidden">
                {(effectivePlayAs==='w' ? taken.b : taken.w).map((t, i)=><span key={i}>{GLYPH[t][effectivePlayAs==='w'?'w':'b']}</span>)}
              </div>
              <div className="select-none">
                <div
                  className="rounded-xl px-2 py-1 text-2xl font-extrabold"
                  style={{
                    background: effectivePlayAs === 'w' ? '#e4e4e7' : '#2d2e2e',
                    color:      effectivePlayAs === 'w' ? '#2d2e2e' : '#ffffff'
                  }}
                >
                  {(effectivePlayAs === 'w' ? (whitePct * 100) : (100 - whitePct * 100)).toFixed(1)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-2 w-fit px-3 py-1.5 text-sm text-zinc-200 flex items-center gap-2">
        <span>Turn: <strong>{turnLabel}</strong></span>
        <span>•</span>
        <span>Playing as: <strong>{playingLabel}</strong></span>
        <span>•</span>
        <span>AI: <strong className={thinking ? 'animate-pulse' : ''}>{thinking ? 'Thinking…' : 'Idle'}</strong></span>
      </div>
    </div>
  );
}

function drawBoard(
  p:p5Types, g:Chess, flipped:boolean,
  last:{from:Square;to:Square}|null,
  sel:Square|null, toMoves:Square[],
  hint:{from:Square;to:Square}|null
){
  const q = p.width/8;

  for(let rf=0; rf<64; rf++){
    const f=rf%8, r=Math.floor(rf/8);
    const fx=flipped?7-f:f, ry=flipped?r:7-r;
    const x=fx*q, y=ry*q;
    const isLight=(f+r)%2===0;
    p.noStroke();
    p.fill(isLight?COLORS.light:COLORS.dark);
    p.rect(x,y,q,q);
  }

  if(last){ [last.from,last.to].forEach(sq=>tintSquare(p,sq,flipped,q,COLORS.lastMove)); }
  if(sel) tintSquare(p,sel,flipped,q,COLORS.selected);

  toMoves.forEach(to=>{
    const pc = g.get(to);
    if(pc) tintSquare(p,to,flipped,q,COLORS.capture);
    else dot(p,to,flipped,q,COLORS.dot);
  });

  const labelPad = q * 0.08;
  const coordSize = q * 0.18;

  const labelFill = (isLightSquare:boolean) => {
    return isLightSquare ? COLORS.blackPiece : COLORS.whitePiece;
  };

  p.textAlign(p.LEFT, p.TOP);
  p.textSize(coordSize);
  p.textStyle(p.BOLD);
  for (let ry = 0; ry < 8; ry++) {
    const fxDisp = 0;
    const fyDisp = ry;
    const fActual = flipped ? 7 - fxDisp : fxDisp;
    const rActual = flipped ? fyDisp : 7 - fyDisp;

    const isLight = ((fActual + rActual) % 2) === 0;
    p.fill(labelFill(isLight));

    const x = fxDisp * q;
    const y = fyDisp * q;
    const rankLabel = flipped ? (1 + fyDisp) : (8 - fyDisp);
    p.text(String(rankLabel), x + labelPad, y + labelPad);
  }

  p.textAlign(p.RIGHT, p.BOTTOM);
  p.textSize(coordSize);
  p.textStyle(p.BOLD);
  for (let fx = 0; fx < 8; fx++) {
    const fyDisp = 7;
    const fxDisp = fx;

    const fActual = flipped ? 7 - fxDisp : fxDisp;
    const rActual = flipped ? fyDisp : 7 - fyDisp;

    const isLight = ((fActual + rActual) % 2) === 0;
    p.fill(labelFill(isLight));

    const x = fxDisp * q;
    const y = fyDisp * q;

    const fileCharCode = flipped ? ('h'.charCodeAt(0) - fx) : ('a'.charCodeAt(0) + fx);
    const fileLabel = String.fromCharCode(fileCharCode);
    p.text(fileLabel, x + q - labelPad, y + q - labelPad);
  }

  p.textStyle(p.NORMAL);
  p.textAlign(p.CENTER, p.CENTER);

  const checkSq = findCheckedKingSquare(g);
  if(checkSq) tintSquare(p,checkSq,flipped,q,COLORS.check);

  for(let f=0; f<8; f++){
    for(let r=0; r<8; r++){
      const sq = toSquare(f,r);
      const pc = g.get(sq); if(!pc) continue;

      const fx=flipped?7-f:f, ry=flipped?r:7-r;
      const cx=fx*q+q/2, cy=ry*q+q/2;

      const isSel = sel===sq;
      const size = q * (isSel ? 0.82 : 0.70);

      p.fill(pc.color==='w'?COLORS.whitePiece:COLORS.blackPiece);
      p.textSize(size);
      p.text(GLYPH[pc.type][pc.color], cx, cy + q*0.02);
    }
  }

  if (hint) {
    drawArrow(p, hint.from, hint.to, flipped, q);
  }
}

function tintSquare(p:p5Types, sq:Square, flipped:boolean, q:number, color:string){
  const f=sq.charCodeAt(0)-97, r=Number(sq[1])-1;
  const fx=flipped?7-f:f, ry=flipped?r:7-r;
  const x=fx*q, y=ry*q;
  p.noStroke(); p.fill(color); p.rect(x,y,q,q);
}

function dot(p:p5Types, sq:Square, flipped:boolean, q:number, color:string){
  const f=sq.charCodeAt(0)-97, r=Number(sq[1])-1;
  const fx=flipped?7-f:f, ry=flipped?r:7-r;
  const cx=fx*q+q/2, cy=ry*q+q/2;
  p.noStroke(); p.fill(color); p.circle(cx,cy,q*0.25);
}

function drawArrow(p:p5Types, from:Square, to:Square, flipped:boolean, q:number){
  const f1=from.charCodeAt(0)-97, r1=Number(from[1])-1;
  const f2=to.charCodeAt(0)-97,   r2=Number(to[1])-1;

  const fx1=flipped?7-f1:f1, ry1=flipped?r1:7-r1;
  const fx2=flipped?7-f2:f2, ry2=flipped?r2:7-r2;

  const x1=fx1*q+q/2, y1=ry1*q+q/2;
  const x2=fx2*q+q/2, y2=ry2*q+q/2;

  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 1) return;

  const startOffset = q * 0.24;
  const shaftW      = Math.max(q * 0.18, 8);
  const headLen     = Math.max(q * 0.36, 16);
  const headW       = Math.max(shaftW * 2.2, headLen * 0.9);

  const ux = dx / len, uy = dy / len;
  const px = -uy, py = ux;

  const sx = x1 + ux * startOffset;
  const sy = y1 + uy * startOffset;
  const bx = x2 - ux * headLen;
  const by = y2 - uy * headLen;

  const halfS = shaftW / 2;
  const halfH = headW  / 2;

  const sLx = sx - px * halfS, sLy = sy - py * halfS;
  const sRx = sx + px * halfS, sRy = sy + py * halfS;
  const bLx = bx - px * halfH, bLy = by - py * halfH;
  const bRx = bx + px * halfH, bRy = by + py * halfH;

  p.push();
  p.noStroke();
  p.fill(COLORS.hint);
  p.beginShape();
  p.vertex(sLx, sLy);
  p.vertex(sRx, sRy);
  p.vertex(bRx, bRy);
  p.vertex(x2,  y2);
  p.vertex(bLx, bLy);
  p.endShape(p.CLOSE);
  p.pop();
}