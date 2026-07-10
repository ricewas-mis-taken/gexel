import { useEffect, useRef, useState } from "react";
import AppShell from "./AppShell";
import { useCoins } from "./CoinContext";
import Loseg from "./transitions/Loseg";
import blueGhostSfx from "../assets/pacman/blueghost.mp3";
import ghostEatSfx from "../assets/pacman/ghosteat.mp3";
import ghostReturnSfx from "../assets/pacman/ghostreturn.mp3";
import pacDeathSfx from "../assets/pacman/pacdeath.mp3";
import pacDotSfx from "../assets/pacman/pacdot.mp3";
import { createLoopPlayer, unlockWebAudio } from "./webAudioLoop";

const TS = 16;
const COLS = 28;
const ROWS = 31;
const MAP_W = COLS * TS;
const PANEL_W = 160;
const CANVAS_W = MAP_W + PANEL_W;
const CANVAS_H = ROWS * TS;

const PAC_SPD = 40 / 60;

const RAW = [
  "0000000000000000000000000000",
  "0111111111111001111111111110",
  "0100001000001001000001000010",
  "0300001000001001000001000030",
  "0100001000001001000001000010",
  "0111111111111111111111111110",
  "0100001001000000001001000010",
  "0100001001000000001001000010",
  "0111111001111001111001111110",
  "0000001000002002000001000000",
  "2222201000002002000001022222",
  "2222201002222222222001022222",
  "2222201002000440002001022222",
  "0000001002022222202001000000",
  "2222221222022222202221222222",
  "0000001002022222202001000000",
  "2222201002000000002001022222",
  "2222201002222222222001022222",
  "2222201002000000002001022222",
  "0000001002000000002001000000",
  "0111111111111001111111111110",
  "0100001000001001000001000010",
  "0100001000001001000001000010",
  "0311001111111221111111001130",
  "0001001001000000001001001000",
  "0001001001000000001001001000",
  "0111111001111001111001111110",
  "0100000000001001000000000010",
  "0100000000001001000000000010",
  "0111111111111111111111111110",
  "0000000000000000000000000000",
];

const LAYOUT = RAW.map(r => r.split("").map(Number));
const cloneMap = () => LAYOUT.map(r => [...r]);

const TOTAL_DOTS = LAYOUT.reduce((sum, row) => sum + row.filter(t => t === 1 || t === 3).length, 0);
const HALF_DOTS = Math.floor(TOTAL_DOTS / 2);

const GH_EXIT_ROW = 11;
const GH_EXIT_COL = 13.5;

const GHOST_SPAWNS = [
  { x: 13.5 * TS, y: 11 * TS + TS/2, releaseAt: 0 },
  { x: 13.5 * TS, y: 14 * TS + TS/2, releaseAt: 0 },
  { x: 11.5 * TS, y: 14 * TS + TS/2, releaseAt: 180 },
  { x: 15.5 * TS, y: 14 * TS + TS/2, releaseAt: 360 },
];
const GHOST_COLORS = ["#ff0000", "#ffb8ff", "#00e5ff", "#ffb852"];
const PAC_START = { x: 13.5 * TS + TS/2, y: 23 * TS + TS/2 };

const DOTS_PER_LIFE=20;
const EAT_PAUSE_FRAMES = 60;
const DEFAULT_DEATH_FRAMES = 90;
const PACDOT_LOOP_START_SECONDS = 0.295;
const PACDOT_LOOP_SECONDS = 10.22;
const WIN_FRAMES = 75;

if (typeof window !== "undefined" && !window.__gexelAudioPatched) {
  window.__gexelAudioPatched = true;
  window.__gexelAudioEls = new Set();
  const origPlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function patchedPlay(...args) {
    window.__gexelAudioEls.add(this);
    return origPlay.apply(this, args);
  };
}

function killOtherAudio(keep) {
  if (typeof window === "undefined" || !window.__gexelAudioEls) return;
  window.__gexelAudioEls.forEach((el) => {
    if (keep && keep.has(el)) return;
      try { el.pause(); el.currentTime = 0; } catch {}
  });
}

function drawMaze(ctx, map, frame) {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, MAP_W, CANVAS_H);
  ctx.strokeStyle = "#1a1aff";
  ctx.lineWidth = 2;
  const isW = (cc, rr) => rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS && (map[rr][cc] === 0 || map[rr][cc] === 4);
  const cr = 6;
  ctx.beginPath();
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!isW(c, r)) continue;
      const x = c * TS, y = r * TS;
      const top = isW(c, r-1), bottom = isW(c, r+1);
      const left = isW(c-1, r), right = isW(c+1, r);
      if (!top) { ctx.moveTo(x + (left ? 0 : cr), y); ctx.lineTo(x + TS - (right ? 0 : cr), y); }
      if (!bottom) { ctx.moveTo(x + (left ? 0 : cr), y + TS); ctx.lineTo(x + TS - (right ? 0 : cr), y + TS); }
      if (!left) { ctx.moveTo(x, y + (top ? 0 : cr)); ctx.lineTo(x, y + TS - (bottom ? 0 : cr)); }
      if (!right) { ctx.moveTo(x + TS, y + (top ? 0 : cr)); ctx.lineTo(x + TS, y + TS - (bottom ? 0 : cr)); }
      if (!top && !left) { ctx.moveTo(x, y + cr); ctx.quadraticCurveTo(x, y, x + cr, y); }
      if (!top && !right) { ctx.moveTo(x + TS - cr, y); ctx.quadraticCurveTo(x + TS, y, x + TS, y + cr); }
      if (!bottom && !left) { ctx.moveTo(x + cr, y + TS); ctx.quadraticCurveTo(x, y + TS, x, y + TS - cr); }
      if (!bottom && !right) { ctx.moveTo(x + TS, y + TS - cr); ctx.quadraticCurveTo(x + TS, y + TS, x + TS - cr, y + TS); }
      if (top && left && !isW(c-1, r-1)) { ctx.moveTo(x, y - cr); ctx.quadraticCurveTo(x, y, x - cr, y); }
      if (top && right && !isW(c+1, r-1)) { ctx.moveTo(x + TS, y - cr); ctx.quadraticCurveTo(x + TS, y, x + TS + cr, y); }
      if (bottom && left && !isW(c-1, r+1)) { ctx.moveTo(x, y + TS + cr); ctx.quadraticCurveTo(x, y + TS, x - cr, y + TS); }
      if (bottom && right && !isW(c+1, r+1)) { ctx.moveTo(x + TS, y + TS + cr); ctx.quadraticCurveTo(x + TS, y + TS, x + TS + cr, y + TS); }
    }
  }
  ctx.stroke();
  const pulse = 0.6 + 0.4 * Math.sin(frame * 0.08);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const tile = map[r][c];
      if (tile !== 1 && tile !== 3) continue;
      const cx = c * TS + TS/2, cy = r * TS + TS/2;
      if (tile === 1) {
        ctx.fillStyle = "#ffb897";
        ctx.beginPath(); ctx.arc(cx, cy, 2, 0, Math.PI*2); ctx.fill();
      } else {
        ctx.fillStyle = "rgba(255,184,151," + pulse + ")";
        ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI*2); ctx.fill();
      }
    }
  }
}

function drawPacman(ctx, p, frame) {
  if (!p.alive) return;
  const mouth = 0.08 + 0.18 * Math.abs(Math.sin(frame * 0.22));
  if (p.vx > 0) p.angle = 0;
  else if (p.vx < 0) p.angle = Math.PI;
  else if (p.vy > 0) p.angle = Math.PI/2;
  else if (p.vy < 0) p.angle = -Math.PI/2;
  const angle = p.angle || 0;
  const g = ctx.createRadialGradient(p.x-2, p.y-2, 1, p.x, p.y, 8);
  g.addColorStop(0, "#ffff88");
  g.addColorStop(1, "#ffcc00");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.arc(p.x, p.y, 8, angle + mouth * Math.PI, angle + (2-mouth) * Math.PI);
  ctx.closePath();
  ctx.fill();
  const ex = p.x + Math.cos(angle - Math.PI/3.5) * 4;
  const ey = p.y + Math.sin(angle - Math.PI/3.5) * 4;
  ctx.fillStyle = "#000";
  ctx.beginPath(); ctx.arc(ex, ey, 1.2, 0, Math.PI*2); ctx.fill();
}

function drawPacmanDeath(ctx, p, t) {
  const closeAmt = Math.min(1, Math.max(0, t));
  const span = Math.PI * 2 * (1 - closeAmt);
  if (span <= 0.001) return;
  const startAngle = -Math.PI/2 - span/2;
  const endAngle = -Math.PI/2 + span/2;
  const g = ctx.createRadialGradient(p.x-2, p.y-2, 1, p.x, p.y, 8);
  g.addColorStop(0, "#ffff88");
  g.addColorStop(1, "#ffcc00");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.arc(p.x, p.y, 8, startAngle, endAngle);
  ctx.closePath();
  ctx.fill();
}

function lighten(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((n>>16)&0xff)+70);
  const g = Math.min(255, ((n>>8) &0xff)+70);
  const b = Math.min(255, (n &0xff)+70);
  return "rgb(" + r + "," + g + "," + b + ")";
}

function drawGhost(ctx, g, scared, flash) {
  if (g.eaten) {
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.ellipse(g.x-3, g.y-2, 2.8, 3.5, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(g.x+3, g.y-2, 2.8, 3.5, 0, 0, Math.PI*2); ctx.fill();
    const pdx = g.vx > 0 ? 1.2 : g.vx < 0 ? -1.2 : 0;
    const pdy = g.vy > 0 ? 1.5 : g.vy < 0 ? -1.5 : 0;
    ctx.fillStyle = "#2233ff";
    ctx.beginPath(); ctx.arc(g.x-3+pdx, g.y-2+pdy, 1.6, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(g.x+3+pdx, g.y-2+pdy, 1.6, 0, Math.PI*2); ctx.fill();
    return;
  }
  const r = 8;
  const color = scared ? (flash ? "#fff" : "#2233ff") : g.color;
  const gr = ctx.createRadialGradient(g.x-2, g.y-3, 1, g.x, g.y, r);
  gr.addColorStop(0, scared ? "#5566ff" : lighten(g.color));
  gr.addColorStop(1, color);
  ctx.fillStyle = gr;
  ctx.beginPath();
  ctx.arc(g.x, g.y - 1, r, Math.PI, 0);
  const bY = g.y + r - 1;
  ctx.lineTo(g.x + r, bY);
  const bump = r * 2 / 3;
  for (let i = 0; i < 3; i++) {
    const bx = g.x + r - bump * i;
    ctx.quadraticCurveTo(bx - bump*0.5, bY - 4, bx - bump, bY);
  }
  ctx.lineTo(g.x - r, bY);
  ctx.closePath();
  ctx.fill();
  if (!scared) {
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.ellipse(g.x-3, g.y-2, 2.8, 3.5, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(g.x+3, g.y-2, 2.8, 3.5, 0, 0, Math.PI*2); ctx.fill();
    const pdx = g.vx > 0 ? 1.2 : g.vx < 0 ? -1.2 : 0;
    const pdy = g.vy > 0 ? 1.5 : g.vy < 0 ? -1.5 : 0;
    ctx.fillStyle = "#0033cc";
    ctx.beginPath(); ctx.arc(g.x-3+pdx, g.y-2+pdy, 1.6, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(g.x+3+pdx, g.y-2+pdy, 1.6, 0, Math.PI*2); ctx.fill();
  } else {
    ctx.fillStyle = flash ? "#ff6666" : "#8899ff";
    ctx.fillRect(g.x-4, g.y-3, 2.5, 2.5);
    ctx.fillRect(g.x+2, g.y-3, 2.5, 2.5);
    ctx.strokeStyle = flash ? "#ff6666" : "#8899ff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(g.x-4, g.y+2); ctx.lineTo(g.x-2, g.y);
    ctx.lineTo(g.x, g.y+2); ctx.lineTo(g.x+2, g.y);
    ctx.lineTo(g.x+4, g.y+2);
    ctx.stroke();
  }
}

function drawGhostWilt(ctx, g, t) {
  const scale = Math.max(0, 1-t);
    if (scale <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = scale;
  ctx.translate(g.x, g.y);
  ctx.scale(scale, scale);
  ctx.translate(-g.x, -g.y);
  drawGhost(ctx, g, false, false);
  ctx.restore();
}

const tileOf = (x, y) => ({ c: Math.floor(x/TS), r: Math.floor(y/TS) });

function wallAt(map, x, y) {
  const c = Math.floor(x/TS), r = Math.floor(y/TS);
  if (r < 0 || r >= ROWS) return true;
  if (c < 0 || c >= COLS) return r !== 14;
  return map[r][c] === 0 || map[r][c] === 4;
}

function canMove(map, x, y, margin) {
  const m = margin || 4;
  return !wallAt(map, x-m, y-m) && !wallAt(map, x+m, y-m)
      && !wallAt(map, x-m, y+m) && !wallAt(map, x+m, y+m);
}

function neighborTileOpen(map, col, row, dc, dr, eaten) {
  const c = col + dc, r = row + dr;
  if (r < 0 || r >= ROWS) return false;
  if (c < 0 || c >= COLS) return r === 14;
    const t = map[r][c];
  if (t === 0) return false;
  if (t === 4 && !eaten) return false;
  return true;
}

export default function Pacman({ onFinish }) {
  const canvasRef = useRef(null);
  const { addSessionCoins, commitSession, discardSession } = useCoins();
  const [uiState, setUiState] = useState("playing");
  const stateRef = useRef("playing");
  const [topCoins, setTopCoins] = useState(0);
  const [topLives, setTopLives] = useState(3);

  const ramImgRef = useRef(null);
  const eng = useRef(null);
  const soundsRef = useRef({});
  const deathFramesRef=useRef(DEFAULT_DEATH_FRAMES);
  const pacdotPlayerRef = useRef(null);
  const blueghostPlayerRef = useRef(null);

  const playSound = (key) => {
    if (key === "blueghost") { blueghostPlayerRef.current?.restart(); return; }
    const snd = soundsRef.current[key];
    if (snd) {
      snd.currentTime = 0;
      snd.play().catch(() => {});
    }
  };

  const stopSound = (key) => {
    if (key === "pacdot") { pacdotPlayerRef.current?.stop(); return; }
    if (key === "blueghost") { blueghostPlayerRef.current?.stop(); return; }
    const snd = soundsRef.current[key];
    if (snd) { snd.pause(); snd.currentTime = 0; }
  };

  const muteSound = (key) => {
      if (key === "pacdot") { pacdotPlayerRef.current?.setVolume(0); return; }
    const snd = soundsRef.current[key];
    if(snd) snd.volume=0;
  };

  const stopAllSounds = () => {
    pacdotPlayerRef.current?.stop();
    blueghostPlayerRef.current?.stop();
    if (soundsRef.current) {
      Object.values(soundsRef.current).forEach(snd => {
        if (snd) {
          snd.pause();
          snd.currentTime = 0;
        }
      });
    }
  };

  const makeGhosts = () => GHOST_COLORS.map((color, i) => ({
    id: i,
    x: GHOST_SPAWNS[i].x,
    y: GHOST_SPAWNS[i].y,
    vx: (i === 0) ? -PAC_SPD * 0.9 : 0,
    vy: 0,
    color,
    exiting: i !== 0,
    releaseAt: GHOST_SPAWNS[i].releaseAt,
    free: i === 0,
    eaten: false,
  }));

  const initEng = () => ({
    map: cloneMap(),
    coins: 0,
    lives: 3,
    dotsEaten: 0,
    totalDotsEaten: 0,
    halfBonusGiven: false,
    ramParts: 0,
    powerTimer: 0,
    scatterMode: true,
    modeTimer: 0,

    pac: { x: PAC_START.x, y: PAC_START.y, vx: 0, vy: 0, wantVx: 0, wantVy: 0, alive: true },
    ghosts: makeGhosts(),
    deathTimer: 0,
    eatPause: 0,
    globalFrame: 0,
  });

  const resetEntities = (e) => {
    e.pac = { x: PAC_START.x, y: PAC_START.y, vx: 0, vy: 0, wantVx: 0, wantVy: 0, alive: true };
    e.ghosts = makeGhosts();
    e.powerTimer = 0;
    e.deathTimer = 0;
    e.eatPause = 0;
    e.modeTimer = 0;
    e.scatterMode = true;
    stopSound("blueghost");
    stopSound("ghostreturn");
  };

  const startWinSequence = (e) => {
    if (stateRef.current !== "playing") return;
    stateRef.current = "winning";
    setUiState("winning");
    e.winTimer = WIN_FRAMES;
    stopSound("pacdot");
    stopSound("blueghost");
  };

  const tryAwardHalfBonus = (e) => {
    if (!e.halfBonusGiven && e.totalDotsEaten >= HALF_DOTS) {
      e.halfBonusGiven = true;
      e.ramParts = Math.min(8, e.ramParts + 1);
      if (e.ramParts >= 8) startWinSequence(e);
    }
  };

  const eatGhost = (e, g) => {
    g.eaten = true;
    e.coins += 200;
    addSessionCoins(3);
    e.ramParts = Math.min(8, e.ramParts + 1);
    playSound("ghosteat");
    playSound("ghostreturn");
    e.eatPause = EAT_PAUSE_FRAMES;
    if (e.ramParts >= 8) startWinSequence(e);
  };

  const killRandomGhost = (e) => {
    const target = e.ghosts.find(g => g.free && !g.eaten);
    if (target) eatGhost(e, target);
  };

  function moveGhost(g, e) {
    const gf = e.globalFrame;
    const p = e.pac;
    let speed = PAC_SPD * 0.9;
    if (g.eaten) speed = PAC_SPD * 2.0;
    else if (e.powerTimer > 0) speed = PAC_SPD * 0.55;

    if (g.eaten) {
      const hx = 13.5 * TS;
      const hy = 11 * TS + TS/2;
      if (Math.abs(g.x - hx) < 4 && Math.abs(g.y - hy) < 4) {
        g.eaten = false;
        g.exiting = true;
        g.free = false;
        g.x = 13.5 * TS;
        g.y = 14 * TS + TS/2;
        if (!e.ghosts.some(og => og.eaten)) stopSound("ghostreturn");
        return;
      }
    }

    if (gf < g.releaseAt) {
      g.vy = Math.sin(gf * 0.05) * speed * 0.5;
      g.y += g.vy;
      return;
    }
    if (!g.free) {
      const exitX = GH_EXIT_COL * TS;
      const exitY = GH_EXIT_ROW * TS + TS/2;
      if (Math.abs(g.x - exitX) > 1) {
        g.vx = g.x > exitX ? -speed : speed;
        g.vy = 0;
        g.x += g.vx;
        return;
      }
      g.x = exitX; g.vx = 0;
      if (g.y > exitY) {
        g.vy = -speed; g.y += g.vy;
        return;
      }
      g.y = exitY; g.free = true; g.exiting = false;
      g.vx = speed * (Math.random() > 0.5 ? 1 : -1); g.vy = 0;
      return;
    }

    const col = Math.floor(g.x / TS), row = Math.floor(g.y / TS);
    const centerX = col*TS + TS/2, centerY = row * TS + TS/2;
    const distToCenter = Math.hypot(g.x - centerX, g.y - centerY);

    const atCenter=distToCenter < speed * 0.9;

    let targetX = 0, targetY = 0;
    if (atCenter) {
      g.x = centerX;
      g.y = centerY;

      if (g.eaten) {
        targetX = 13.5 * TS;
        targetY = 11 * TS + TS/2;
      } else if (e.scatterMode) {
        if (g.id === 0) { targetX = COLS * TS; targetY = 0; }
        if (g.id === 1) { targetX = 0; targetY = 0; }
        if (g.id === 2) { targetX = COLS * TS; targetY = ROWS * TS; }
        if (g.id === 3) { targetX = 0; targetY = ROWS * TS; }
      } else {
        if (g.id === 0) { targetX = p.x; targetY = p.y; }
        else if (g.id === 1) {
          const dx = p.vx > 0 ? 4*TS : p.vx < 0 ? -4*TS : 0;
          const dy = p.vy > 0 ? 4*TS : p.vy < 0 ? -4*TS : 0;
          targetX = p.x + dx; targetY = p.y + dy;
        } else if (g.id === 2) {
          const dx = p.vx > 0 ? 2*TS : p.vx < 0 ? -2*TS : 0;
          const dy = p.vy > 0 ? 2*TS : p.vy < 0 ? -2*TS : 0;
          const pivotX = p.x + dx; const pivotY = p.y + dy;
          const bx = e.ghosts[0].x; const by = e.ghosts[0].y;
          targetX = pivotX + (pivotX - bx); targetY = pivotY + (pivotY - by);
        } else if (g.id === 3) {
          if (Math.hypot(p.x - g.x, p.y - g.y) > 8 * TS) { targetX = p.x; targetY = p.y; }
          else { targetX = 0; targetY = ROWS * TS; }
        }
      }

      const dirs = [
        { vx: speed, vy: 0, dc: 1, dr: 0 },
        { vx: -speed, vy: 0, dc: -1, dr: 0 },
        { vx: 0, vy: speed, dc: 0, dr: 1 },
        { vx: 0, vy: -speed, dc: 0, dr: -1 },
      ].filter(d => neighborTileOpen(e.map, col, row, d.dc, d.dr, g.eaten));

      const noReverse = dirs.filter(d => {
        if (Math.sign(d.vx) === -Math.sign(g.vx) && d.vx !== 0 && g.vx !== 0) return false;
        if (Math.sign(d.vy) === -Math.sign(g.vy) && d.vy !== 0 && g.vy !== 0) return false;
        return true;
      });
      const options = noReverse.length > 0 ? noReverse : dirs;

      if (options.length > 0) {
        if (e.powerTimer > 0 && !g.eaten) {
          const pick = options[Math.floor(Math.random() * options.length)];
          g.vx = pick.vx; g.vy = pick.vy;
        } else {
          let best = options[0];
          let minDist = Infinity;
          options.forEach(o => {
            const nextDist = Math.hypot((centerX + o.dc*TS) - targetX, (centerY + o.dr*TS) - targetY);
            if (nextDist < minDist) { minDist = nextDist; best = o; }
          });
          g.vx = best.vx; g.vy = best.vy;
        }
      } else {
        g.vx = 0; g.vy = 0;
      }
    }

    const nc = Math.floor((g.x + g.vx) / TS), nr = Math.floor((g.y + g.vy) / TS);
    const stillOpen = nr >= 0 && nr < ROWS &&
      (nc >= 0 && nc < COLS
        ? (e.map[nr][nc] !== 0 && (e.map[nr][nc] !== 4 || g.eaten))
        : nr === 14);
        
    if (stillOpen) {
      g.x += g.vx; g.y += g.vy;

        if (g.x < -TS/2) g.x = MAP_W + TS/2 - 1;
      if(g.x > MAP_W + TS/2) g.x=-TS/2+1;
    } else {
      g.x = centerX; g.y = centerY;
      g.vx = 0; g.vy = 0;
    }
  }

  useEffect(() => {
    let active = true;
    eng.current = initEng();
    const ram = new Image(); ram.src = "/src/assets/ram-pacman.png";
    ramImgRef.current = ram;

    killOtherAudio();
    soundsRef.current = {
      ghosteat: new Audio(ghostEatSfx),
      ghostreturn: new Audio(ghostReturnSfx),
      pacdeath: new Audio(pacDeathSfx),
    };
    soundsRef.current.ghostreturn.loop=true;
    pacdotPlayerRef.current = createLoopPlayer(pacDotSfx, {
      loopStart: PACDOT_LOOP_START_SECONDS,
      loopEnd: PACDOT_LOOP_SECONDS,
    });
    blueghostPlayerRef.current = createLoopPlayer(blueGhostSfx);
    pacdotPlayerRef.current.start();
    const stopUnlockWebAudio = unlockWebAudio();
    const unlockAllSounds = () => {
      Object.values(soundsRef.current).forEach((snd) => {
        if (!snd) return;
        const wasLoop = snd.loop;
        snd.loop = false;
        snd.play().then(() => {
          snd.pause();
          snd.currentTime = 0;
          snd.loop = wasLoop;
        }).catch(() => { snd.loop = wasLoop; });
      });
      window.removeEventListener("pointerdown", unlockAllSounds);
      window.removeEventListener("keydown", unlockAllSounds);
    };
    window.addEventListener("pointerdown", unlockAllSounds);
    window.addEventListener("keydown", unlockAllSounds);

    soundsRef.current.pacdeath.addEventListener("loadedmetadata", () => {
      if (soundsRef.current.pacdeath.duration && !isNaN(soundsRef.current.pacdeath.duration)) {
        deathFramesRef.current = Math.ceil(soundsRef.current.pacdeath.duration * 60);
      }
    });

    const canvas = canvasRef.current;
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled=false;
      const heldKeys = [];
    const dirForKey = (key) => {
      if (key === "ArrowUp" || key === "w") return [0, -PAC_SPD];
      if (key === "ArrowDown" || key === "s") return [0, PAC_SPD];
      if (key === "ArrowLeft" || key === "a") return [-PAC_SPD, 0];
      if (key === "ArrowRight" || key === "d") return [PAC_SPD, 0];
      return null;
    };
    const handleKey = (e) => {
      if (!dirForKey(e.key)) return;
      e.preventDefault();
      if (!heldKeys.includes(e.key)) heldKeys.push(e.key);
    };
    const handleKeyUp = (e) => {
      const idx = heldKeys.indexOf(e.key);
      if (idx !== -1) heldKeys.splice(idx, 1);
    };
    window.addEventListener("keydown", handleKey);
    window.addEventListener("keyup", handleKeyUp);
    let raf;
    const loop = () => {
      if (!active) return;
      raf = requestAnimationFrame(loop);
      const e = eng.current;
      if (!e) return;
      e.globalFrame++;
      e.modeTimer++;
      if (e.scatterMode && e.modeTimer > 420) { e.scatterMode = false; e.modeTimer = 0; }
      else if (!e.scatterMode && e.modeTimer > 1200) { e.scatterMode = true; e.modeTimer = 0; }

      if (stateRef.current === "winning") {
        stopSound("pacdot");
        stopSound("blueghost");
        stopSound("ghostreturn");
        e.winTimer = Math.max(0, (e.winTimer ?? WIN_FRAMES) - 1);
        const t = 1 - e.winTimer / WIN_FRAMES;
        drawMaze(ctx, e.map, e.globalFrame);
        e.ghosts.forEach(g => drawGhostWilt(ctx, g, t));
        drawPacman(ctx, e.pac, e.globalFrame);
        drawPanel(ctx, e);
        if (e.winTimer <= 0) {
          commitSession();
          stopAllSounds();
          if (onFinish) onFinish();
        }
        return;
      }

      if (stateRef.current !== "playing") {
        stopSound("pacdot");
        stopSound("blueghost");
        drawMaze(ctx, e.map, e.globalFrame);
        e.ghosts.forEach(g => drawGhost(ctx, g, false, false));
        drawPacman(ctx, e.pac, e.globalFrame);
        drawPanel(ctx, e);
        return;
      }

      if (e.eatPause > 0) {
        muteSound("pacdot");
        e.eatPause--;
        drawMaze(ctx, e.map, e.globalFrame);
        const scaredNow = e.powerTimer > 0;
        e.ghosts.forEach(g => drawGhost(ctx, g, scaredNow && !g.eaten, false));
        drawPacman(ctx, e.pac, e.globalFrame);
        drawPanel(ctx, e);
        return;
      }

      if (e.deathTimer > 0) {
        muteSound("pacdot");
        e.deathTimer--;
        const totalFrames = deathFramesRef.current || DEFAULT_DEATH_FRAMES;
        const t = 1 - (e.deathTimer / totalFrames);
        if (e.deathTimer === 0) {
          if (e.lives <= 0) {
            stateRef.current = "lost"; setUiState("lost"); discardSession();
            stopAllSounds();
          }
          else resetEntities(e);
        }
        drawMaze(ctx, e.map, e.globalFrame);
        e.ghosts.forEach(g => drawGhost(ctx, g, false, false));
        drawPacmanDeath(ctx, e.pac, t);
        drawPanel(ctx, e);
        return;
      }

      const p = e.pac;

      if (heldKeys.length > 0) {
        const [vx, vy] = dirForKey(heldKeys[heldKeys.length - 1]);
        if (vx !== p.vx || vy !== p.vy) {
          p.wantVx = vx;
          p.wantVy = vy;
        }
      }

      if (p.wantVx !== 0 || p.wantVy !== 0) {
        const c = Math.floor(p.x / TS);
        const r = Math.floor(p.y / TS);
        const tc = p.wantVx !== 0 ? c + Math.sign(p.wantVx) : c;
        const tr = p.wantVy !== 0 ? r + Math.sign(p.wantVy) : r;
        const open = tr >= 0 && tr < ROWS && tc >= 0 && tc < COLS &&
          e.map[tr][tc] !== 0 && e.map[tr][tc] !== 4;
        if (open) {
          p.x = c * TS + TS/2;
          p.y = r * TS + TS/2;
          p.vx = p.wantVx;
          p.vy = p.wantVy;
          p.wantVx = 0;
          p.wantVy = 0;
        }
      }

      if (canMove(e.map, p.x + p.vx, p.y + p.vy, 4)) {
        p.x += p.vx;
        p.y += p.vy;
      } else {
        p.vx = 0;
        p.vy = 0;
      }

      const dotPlayer = pacdotPlayerRef.current;
      if (dotPlayer) {
        dotPlayer.setVolume(1);
        if (!dotPlayer.isPlaying()) dotPlayer.start();
      }

      if (p.x < -TS/2) p.x = MAP_W + TS/2 - 1;
      if (p.x > MAP_W + TS/2) p.x = -TS/2 + 1;
      const pt = tileOf(p.x, p.y);
      if (pt.c >= 0 && pt.c < COLS && pt.r >= 0 && pt.r < ROWS) {
        const tile = e.map[pt.r][pt.c];
        if (tile === 1) {
          e.map[pt.r][pt.c] = 2; e.coins++;
          addSessionCoins(1);
          e.dotsEaten++;
          e.totalDotsEaten++;
          tryAwardHalfBonus(e);
          if (e.dotsEaten >= DOTS_PER_LIFE) {
            e.dotsEaten -= DOTS_PER_LIFE;
          }
        }
        else if (tile === 3) {
          e.map[pt.r][pt.c] = 2; e.coins += 5; e.powerTimer = 480;
          addSessionCoins(1);
          playSound("blueghost");
          e.totalDotsEaten++;
          tryAwardHalfBonus(e);
        }
      }
      if (!e.map.some(row => row.some(t => t===1||t===3))) e.map = cloneMap();
      if (e.powerTimer > 0) {
        e.powerTimer--;
        if (e.powerTimer === 0) stopSound("blueghost");
      }

      const scared = e.powerTimer > 0;
      const flash = scared && e.powerTimer < 120 && e.powerTimer % 16 < 8;
      e.ghosts.forEach(g => moveGhost(g, e));

      e.ghosts.forEach(g => {
        if (!g.free && !g.eaten) return;
        if (Math.hypot(p.x - g.x, p.y - g.y) < 13) {
          if (scared && !g.eaten) {
            eatGhost(e, g);
          } else if (!g.eaten) {
            e.lives--;
              e.ramParts = Math.max(0, e.ramParts - 1);
            e.deathTimer = deathFramesRef.current || DEFAULT_DEATH_FRAMES;
            p.alive = false;
            stopSound("blueghost");
            stopSound("ghostreturn");
            playSound("pacdeath");
          }
        }
      });
      
      setTopCoins(e.coins); setTopLives(e.lives);
      drawMaze(ctx, e.map, e.globalFrame);

      e.ghosts.forEach(g => drawGhost(ctx, g, scared && !g.eaten, flash && !g.eaten));
      drawPacman(ctx, p, e.globalFrame);
      drawPanel(ctx, e);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      active = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("pointerdown", unlockAllSounds);
      window.removeEventListener("keydown", unlockAllSounds);
      stopUnlockWebAudio();
      stopAllSounds();
      discardSession();
    };
  }, []);

  function drawPanel(ctx,e) {
    const px = MAP_W;
    ctx.fillStyle = "#000"; ctx.fillRect(px, 0, PANEL_W, CANVAS_H);
    const lx = px + 14;
    const ramW = PANEL_W - 22;
    const ramH = CANVAS_H - 60;

    ctx.strokeStyle = "#2ea84a";
    ctx.lineWidth = 2;
    ctx.strokeRect(lx, 28, ramW, ramH);

    const ramY = 28;
    ctx.fillStyle = "#0a1a0a";
    ctx.fillRect(lx + 1, ramY + 1, ramW - 2, ramH - 2);

    if (ramImgRef.current && ramImgRef.current.complete) {
      ctx.save();
      ctx.translate(lx + 1 + ramW / 2, ramY + 1 + ramH / 2);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(ramImgRef.current, 0, 0, 942, 352, -ramH / 2 + 1, -ramW / 2 + 1, ramH - 2, ramW - 2);
      ctx.restore();

      const cols = 4, rows = 2;
      const sw = Math.floor(ramW / cols);
      const sh = Math.floor(ramH / rows);

      ctx.fillStyle = "#000000";
      for (let i = e.ramParts; i < 8; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        ctx.fillRect(Math.floor(lx + (col * sw)), Math.floor(ramY + (row * sh)), sw + 2, sh + 2);
      }
    }
  }

  const btnS = { padding:"10px 24px", background:"#000", border:"3px solid #2ea84a", color:"#2ea84a", cursor:"pointer", fontFamily:"'PokemonClassic',monospace", fontSize:10, letterSpacing:1 };
  const extraLives=Math.max(topLives - 1, 0);

  return (
    <AppShell>
      <div style={{flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:"#000", position:"relative"}}>

        {uiState === "playing" && (
          <button
            onClick={() => killRandomGhost(eng.current)}
            style={{
              position: "absolute",
              top: 20,
              left: 20,
              zIndex: 10,
              ...btnS,
              borderColor: "#ff4444",
              color: "#ff4444"
            }}
          >
            KILL GHOST
          </button>
        )}

        <div style={{
          position: "absolute",
          left: -70,
          top: "50%",
          transform: "translateY(-50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
        }}>
          <div style={{ color: "#2ea84a", fontFamily: "'PokemonClassic',monospace", fontSize: 9, marginBottom: 4, letterSpacing: 1 }}>LIVES</div>
          {Array.from({ length: Math.max(topLives, 0) }, (_, i) => (
            <svg key={i} width="22" height="22" viewBox="0 0 22 22">
              <defs>
                <radialGradient id={`pacGradSide-${i}`} cx="30%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#ffff88" />
                  <stop offset="100%" stopColor="#ffcc00" />
                </radialGradient>
              </defs>
              <path d="M 11 11 L 21 3 A 10 10 0 1 0 21 19 Z" fill={`url(#pacGradSide-${i})`} />
              <circle cx="12" cy="5" r="1.5" fill="#000" />
            </svg>
          ))}
        </div>

        <div style={{position:"relative"}}>
          <canvas ref={canvasRef} style={{display:"block", imageRendering:"pixelated"}}/>
        </div>

        {uiState === "lost" && (
          <div style={{ position: "absolute", inset: 0, zIndex: 200 }}>
            <Loseg onPlayAgain={() => { eng.current = initEng(); stateRef.current = "playing"; setUiState("playing"); }} />
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 14, alignItems: "center" }}>
          {Array.from({ length: extraLives }, (_, i) => (
            <svg key={i} width="22" height="22" viewBox="0 0 22 22">
              <defs>
                <radialGradient id={`pacGradBot-${i}`} cx="30%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#ffff88" />
                  <stop offset="100%" stopColor="#ffcc00" />
                </radialGradient>
              </defs>
              <path d="M 11 11 L 21 3 A 10 10 0 1 0 21 19 Z" fill={`url(#pacGradBot-${i})`} />
              <circle cx="12" cy="5" r="1.5" fill="#000" />
            </svg>
          ))}
        </div>

      </div>
    </AppShell>
  );
}