import { useEffect, useRef, useState } from "react";
import AppShell from "./AppShell";
import Loseg from "./transitions/Loseg";
import TetrisEnding from "./transitions/TetrisEnding";
import { useCoins } from "./CoinContext";
import { fadeOutAudio } from "./audioFade";
import { ensureAudioPlays } from "./audioUnlock";
import deathMusicSrc from "../assets/galaga/deathmusic.mp3";

const COLS = 10;
const ROWS = 20;
const CELL = 26;
const DANGER_ROW=4;

const COLORS = {
  I: { base: "#2ee6e6", dark: "#1aa3a3", light: "#9ffcfc" },
  J: { base: "#2b3fd6", dark: "#1a2694", light: "#8f9bff" },
  L: { base: "#ff9c1a", dark: "#c26e00", light: "#ffd18f" },
  O: { base: "#ffe11a", dark: "#c2a800", light: "#fff59f" },
  S: { base: "#2ecc40", dark: "#1a8c26", light: "#9ff5a8" },
  T: { base: "#a020f0", dark: "#6e10a8", light: "#e2b3ff" },
  Z: { base: "#ff2020", dark: "#c21010", light: "#ff9f9f" },
};

const SHAPES = {
  I: [[1, 1, 1, 1]],
  J: [
    [1, 0, 0],
    [1, 1, 1],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
  ],
};

const TYPES = Object.keys(SHAPES);
const MAX_APPLE = 8;
const BLOCKS_PER_REGEN = 15;
const WORM_SPEED = 0.012;
const SEGMENT_DELAY=0.035;

function cellDelay(count){ return count * SEGMENT_DELAY; }
function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}
function easeInOutQuad(t) { return t<0.5 ? 2*t*t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

function shuffledBag() {
  const bag = [...TYPES, "I", "I"];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

function rotateMatrix(m) {
  const rows = m.length, cols = m[0].length;
  const res = Array.from({ length: cols }, () => Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      res[c][rows - 1 - r] = m[r][c];
  return res;
}

function drawBlock(ctx, x, y, size, colorSet) {
  const { base, dark, light } = colorSet;
  ctx.fillStyle = base;
  ctx.fillRect(x, y, size, size);

  ctx.fillStyle = light;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + size, y);
  ctx.lineTo(x + size * 0.75, y + size * 0.25);
  ctx.lineTo(x + size * 0.25, y + size * 0.25);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + size);
  ctx.lineTo(x + size * 0.25, y + size * 0.75);
  ctx.lineTo(x + size * 0.25, y + size * 0.25);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.moveTo(x + size, y + size);
  ctx.lineTo(x, y + size);
  ctx.lineTo(x + size * 0.25, y + size * 0.75);
  ctx.lineTo(x + size * 0.75, y + size * 0.75);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(x + size, y + size);
  ctx.lineTo(x + size, y);
  ctx.lineTo(x + size * 0.75, y + size * 0.25);
  ctx.lineTo(x + size * 0.75, y + size * 0.75);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
}

function emptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function nextFromBag(bagRef) {
  if (bagRef.current.length === 0) bagRef.current = shuffledBag();
  return bagRef.current.shift();
}

let appleImages = {};
try {
  const modules = import.meta.glob("../assets/tetris/*.png", { eager: true, import: "default" });
  for (const path in modules) {
    const match = path.match(/apple(\d+)\.png$/i);
    if (match) appleImages[parseInt(match[1], 10)] = modules[path];
  }
} catch (e) {
  appleImages = {};
}

let tetrisLogo = null;
try {
  const logoModules = import.meta.glob("../assets/tetris/*.png", { eager: true, import: "default" });
  for (const path in logoModules) if (/tetrislogo\.png$/i.test(path)) tetrisLogo = logoModules[path];
} catch (e) {}

const LOGO_WIDTH=240;

let winArtifact = null;
try {
  const winModules = import.meta.glob("../assets/sf2/*.png", { eager: true, import: "default" });
  for (const path in winModules) if (/tetriswin\.png$/i.test(path)) winArtifact = winModules[path];
} catch (e) {}

let sfx = {};
try {
  const audioModules = import.meta.glob("../assets/tetris/*.mp3", { eager: true, import: "default" });
  for (const path in audioModules) {
    if (/applebite\.mp3$/i.test(path)) sfx.applebite = audioModules[path];
    else if (/tetrismusic\.mp3$/i.test(path)) sfx.music = audioModules[path];
    else if (/tetrisdanger\.mp3$/i.test(path)) sfx.danger = audioModules[path];
    else if(/tetrisyay\.mp3$/i.test(path)) sfx.yay = audioModules[path];
  }
} catch (e) {
  sfx = {};
}

function MatrixRain() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let W, H, columns, drops;
    const fontSize = 16;
    const chars = "01$#%&+-*/<>=";

    function resize() {
      W = canvas.width = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
      columns = Math.floor(W / fontSize);
      drops = Array.from({ length: columns }, () => Math.random() * -50);
    }
    resize();
    window.addEventListener("resize", resize);

    let raf;
    let last = 0;
    const FRAME_INTERVAL=90;

    const draw = (time) => {
      raf = requestAnimationFrame(draw);
      if (time - last < FRAME_INTERVAL) return;
      last = time;

      ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#2ea84a";
      ctx.font = `${fontSize}px monospace`;
      for (let i = 0; i < columns; i++) {
        const ch = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(ch, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > H && Math.random() > 0.985) drops[i] = 0;
        drops[i] += 0.5;
      }
    };
    raf = requestAnimationFrame(draw);
    return () => { window.removeEventListener("resize", resize); cancelAnimationFrame(raf); };
  }, []);

  return <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", background: "#000" }} />;
}

export default function Tetris({ onFinish }) {
  const { addSessionCoins, commitSession, discardSession } = useCoins();
  const canvasRef = useRef(null);
  const nextCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const containerRef = useRef(null);
  const appleBoxRef = useRef(null);

  const boardRef = useRef(emptyBoard());
  const pieceRef = useRef(null);
  const bagRef = useRef(null);
  if (bagRef.current === null) bagRef.current = shuffledBag();
  const nextTypeRef = useRef(null);
  if (nextTypeRef.current === null) nextTypeRef.current = nextFromBag(bagRef);
  const dropCounterRef = useRef(0);
  const dropIntervalRef = useRef(800);
  const lastTimeRef = useRef(0);
  const gameOverRef = useRef(false);
  const wormRef = useRef(null);
  const wormActiveRef = useRef(false);
  const wormPhaseRef=useRef("crawl");
  const blocksPlacedRef = useRef(0);
  const appleIndexRef = useRef(1);
  const completedRef = useRef(false);
  const dangerActiveRef = useRef(false);

  const musicRef = useRef(null);
  const musicUnlockRef = useRef(null);
  const dangerRef = useRef(null);
  const biteRef = useRef(null);
  const yayRef = useRef(null);
  const deathMusicRef = useRef(null);
  const [appleIndex, setAppleIndexState] = useState(1);
  const [nextType, setNextType] = useState(nextTypeRef.current);
  const [gameOver, setGameOver] = useState(false);
  const [paused, setPaused] = useState(false);
  const [loadedApple, setLoadedApple] = useState(null);
  const [appleFlash, setAppleFlash] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [appleGone, setAppleGone] = useState(false);
  const [showArtifact, setShowArtifact] = useState(false);
  const [fadeBlack, setFadeBlack] = useState(0);
  const [ending, setEnding] = useState(false);

  function setApple(updater) {
    const newVal = typeof updater === "function" ? updater(appleIndexRef.current) : updater;
    appleIndexRef.current = newVal;
    setAppleIndexState(newVal);
  }

  useEffect(() => {
    const src = appleImages[appleIndex] || appleImages[1];
    if (!src) {
      setLoadedApple(null);
      return;
    }
    const img = new Image();
    img.onload = () => setLoadedApple(img);
    img.src = src;
  }, [appleIndex]);

  useEffect(() => {
    if(sfx.applebite) {
      biteRef.current = new Audio(sfx.applebite);
    }
    if (sfx.yay) {
      yayRef.current = new Audio(sfx.yay);
    }
    if (sfx.danger) {
      dangerRef.current = new Audio(sfx.danger);
      dangerRef.current.loop = true;
      dangerRef.current.volume = 0.6;
    }
    return () => {
        if (dangerRef.current) { dangerRef.current.pause(); dangerRef.current.currentTime = 0; }
    };
  }, []);

  useEffect(() => {
    if (!sfx.music) return;
    const music = new Audio(sfx.music);
    music.loop = true;
    music.volume = 0.5;
    musicRef.current = music;
    return () => {
      if (musicUnlockRef.current) { musicUnlockRef.current(); musicUnlockRef.current = null; }
      music.pause();
      music.currentTime = 0;
      musicRef.current = null;
      discardSession();
    };
  }, []);

  useEffect(() => {
    const music = musicRef.current;
    if (!music) return;
    if (!gameOver && !paused && !ending) {
      music.volume = 0.5;
      if (musicUnlockRef.current) musicUnlockRef.current();
      musicUnlockRef.current = ensureAudioPlays(
        music,
        () => musicRef.current === music && !gameOverRef.current && !paused
      );
    } else {
      if (musicUnlockRef.current) { musicUnlockRef.current(); musicUnlockRef.current = null; }
      if (gameOver || ending) {
        fadeOutAudio(music);
      } else {
          music.pause();
      }
    }
    return () => {
      if (musicUnlockRef.current) { musicUnlockRef.current(); musicUnlockRef.current = null; }
    };
  }, [gameOver, paused, ending]);

  useEffect(() => {
    if (gameOver || ending) {
      if (dangerRef.current) fadeOutAudio(dangerRef.current);
      dangerActiveRef.current = false;
    }
  }, [gameOver, ending]);

  function playBite() {
    if (biteRef.current) {
      biteRef.current.currentTime = 0;
      biteRef.current.play().catch(() => {});
    }
  }




  function updateDangerState() {
    const board = boardRef.current;
    let stacked = false;
    for (let r = 0; r < DANGER_ROW; r++) {
      if (board[r].some((c) => c !== null)) { stacked = true; break; }
    }
    if (stacked && !dangerActiveRef.current) {
      dangerActiveRef.current = true;
      dangerRef.current?.play().catch(() => {});
    } else if (!stacked && dangerActiveRef.current) {
      dangerActiveRef.current = false;
      dangerRef.current?.pause();
      if (dangerRef.current) dangerRef.current.currentTime = 0;
    }
  }

  function spawnPiece() {
    const type = nextTypeRef.current;
    const shape = SHAPES[type].map((row) => [...row]);
    const piece = {
      type,
      shape,
      row: 0,
      col: Math.floor((COLS - shape[0].length) / 2),
    };
    if (collides(boardRef.current, piece, 0, 0)) {
      gameOverRef.current = true;
      setGameOver(true);
      discardSession();
      return;
    }
    pieceRef.current = piece;
    nextTypeRef.current = nextFromBag(bagRef);
    setNextType(nextTypeRef.current);
  }

  function collides(board, piece, dRow, dCol, shapeOverride) {
    const shape = shapeOverride || piece.shape;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const nr = piece.row + r + dRow;
        const nc = piece.col + c + dCol;
        if (nc < 0 || nc >= COLS || nr >= ROWS) return true;
        if (nr >= 0 && board[nr][nc]) return true;
      }
    }
    return false;
  }

  function registerBlocksPlaced(count) {
    blocksPlacedRef.current += count;
    while (blocksPlacedRef.current >= BLOCKS_PER_REGEN) {
      blocksPlacedRef.current -= BLOCKS_PER_REGEN;
      setApple((idx) => Math.max(1, idx - 1));
    }
  }

  function mergePiece() {
    const piece = pieceRef.current;
    const board = boardRef.current;
    let cellCount = 0;
    for (let r = 0; r < piece.shape.length; r++) {
      for (let c = 0; c < piece.shape[r].length; c++) {
        if (!piece.shape[r][c]) continue;
        cellCount++;
        const nr = piece.row + r;
        const nc = piece.col + c;
        if (nr >= 0) board[nr][nc] = piece.type;
      }
    }
    registerBlocksPlaced(cellCount);
    addSessionCoins(1);
    checkLines();
    updateDangerState();
  }

  function checkLines() {
    const board = boardRef.current;
    let fullRow = -1;
    for (let r = 0; r < ROWS; r++) {
      if (board[r].every((cell) => cell !== null)) { fullRow = r; break; }
    }
    if (fullRow === -1) {
      spawnPiece();
      return;
    }



    const cells = board[fullRow].map((type) => type);

    const containerRect = containerRef.current.getBoundingClientRect();
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const appleRect = appleBoxRef.current.getBoundingClientRect();

    const startX = canvasRect.right - containerRect.left;
    const startY = canvasRect.top - containerRect.top + fullRow * CELL + CELL / 2;
    const endX = appleRect.left + appleRect.width / 2 - containerRect.left;
    const endY = appleRect.top + appleRect.height / 2 - containerRect.top;

    wormRef.current = { cells, startX, startY, endX, endY, t: 0 };
    wormActiveRef.current = true;

    const newBoard = board.filter((_, r) => r !== fullRow);
    newBoard.unshift(Array(COLS).fill(null));
    boardRef.current = newBoard;
  }

  function hardDrop() {
    const piece = pieceRef.current;
    if (!piece || wormActiveRef.current) return;
    let d = 0;
    while (!collides(boardRef.current, piece, d + 1, 0)) d++;
    piece.row += d;
    mergePiece();
  }

  function move(dCol) {
    const piece = pieceRef.current;
    if (!piece || gameOverRef.current || wormActiveRef.current) return;
    if (!collides(boardRef.current, piece, 0, dCol)) piece.col += dCol;
  }

  function softDrop() {
    const piece = pieceRef.current;
    if (!piece || gameOverRef.current || wormActiveRef.current) return;
    if (!collides(boardRef.current, piece, 1, 0)) {
      piece.row += 1;
    } else {
      mergePiece();
    }
  }

  function rotate() {
    const piece = pieceRef.current;
    if (!piece || gameOverRef.current || wormActiveRef.current) return;
    const rotated = rotateMatrix(piece.shape);
    const kicks = [0, -1, 1, -2, 2];
    for (const k of kicks) {
      if (!collides(boardRef.current, piece, 0, k, rotated)) {
        piece.shape = rotated;
        piece.col += k;
        return;
      }
    }
  }

  function insertTestRow() {
    if (wormActiveRef.current || gameOverRef.current) return;
    const board = boardRef.current;
    const bottom = ROWS - 1;
    board[bottom] = Array.from({ length: COLS }, () => TYPES[Math.floor(Math.random() * TYPES.length)]);
    checkLines();
  }

  function restart() {
    boardRef.current = emptyBoard();
    wormRef.current = null;
    wormActiveRef.current = false;
    wormPhaseRef.current = "crawl";
    completedRef.current = false;
    dropIntervalRef.current = 800;
    dropCounterRef.current = 0;
    gameOverRef.current = false;
    blocksPlacedRef.current = 0;
    bagRef.current = shuffledBag();
    nextTypeRef.current = nextFromBag(bagRef);
    setNextType(nextTypeRef.current);
    setApple(1);
    setCompleted(false);
    setGameOver(false);
    setAppleGone(false);
    setShowArtifact(false);
    setFadeBlack(0);
    setEnding(false);
    dangerActiveRef.current = false;
    dangerRef.current?.pause();
    if (dangerRef.current) dangerRef.current.currentTime = 0;
    spawnPiece();
  }

  useEffect(() => {
    spawnPiece();
    const handler = (e) => {
      if (gameOverRef.current) {
        if (e.key === "Enter") restart();
        return;
      }
      if (e.key === "ArrowLeft") move(-1);
      else if (e.key === "ArrowRight") move(1);
      else if (e.key === "ArrowDown") softDrop();
      else if (e.key === "ArrowUp") rotate();
      else if (e.key === " ") { e.preventDefault(); hardDrop(); }
      else if (e.key === "p" || e.key === "P") setPaused((p) => !p);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    let raf;
    let active = true;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = COLS * CELL;
    canvas.height = ROWS * CELL;

    const loop = (time) => {
      if (!active) return;
      const delta = time - lastTimeRef.current;
      lastTimeRef.current = time;

      if (!paused && !gameOverRef.current) {
        if (wormActiveRef.current) {
          const w = wormRef.current;
          if (wormPhaseRef.current === "crawl") {
            w.t += WORM_SPEED;
            const totalT = 1 + cellDelay(w.cells.length);
            if (w.t > totalT) {
              if (appleIndexRef.current >= MAX_APPLE) {
                wormActiveRef.current = false;
                wormRef.current = null;
                gameOverRef.current = true;
                completedRef.current = true;
                setGameOver(true);
                setCompleted(true);
                setAppleGone(true);
                setShowArtifact(true);
                commitSession();

                if (yayRef.current) {
                  yayRef.current.currentTime = 0;
                  yayRef.current.play().catch(() => {});
                }
                const deathMusic = new Audio(deathMusicSrc);
                deathMusic.volume = 0.8;
                deathMusicRef.current = deathMusic;
                deathMusic.play().catch(() => {});
                setTimeout(() => {
                  if (deathMusicRef.current === deathMusic) {
                    deathMusic.pause();
                    deathMusicRef.current = null;
                  }
                  onFinish && onFinish();
                }, 3500);
              } else {
                wormActiveRef.current = false;
                wormRef.current = null;
                setApple((idx) => Math.min(MAX_APPLE, idx + 1));
                setAppleFlash(true);
                playBite();
                setTimeout(() => setAppleFlash(false), 350);
                spawnPiece();
              }
            }
          }
        } else {
          dropCounterRef.current += delta;
          if (dropCounterRef.current > dropIntervalRef.current) {
            dropCounterRef.current = 0;
            softDrop();
          }
        }
      }

      ctx.fillStyle = "#0a0a12";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      for (let c = 0; c <= COLS; c++) {
        ctx.beginPath();
        ctx.moveTo(c * CELL, 0);
        ctx.lineTo(c * CELL, ROWS * CELL);
        ctx.stroke();
      }
      for (let r = 0; r <= ROWS; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * CELL);
        ctx.lineTo(COLS * CELL, r * CELL);
        ctx.stroke();
      }

      const board = boardRef.current;
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const type = board[r][c];
          if (type) drawBlock(ctx, c * CELL, r * CELL, CELL, COLORS[type]);
        }
      }

      const piece = pieceRef.current;
      if (piece && !gameOverRef.current && !wormActiveRef.current) {
        let ghostRow = piece.row;
        while (!collides(board, piece, ghostRow - piece.row + 1, 0)) ghostRow++;
        ctx.globalAlpha = 0.25;
        for (let r = 0; r < piece.shape.length; r++) {
          for (let c = 0; c < piece.shape[r].length; c++) {
            if (!piece.shape[r][c]) continue;
            drawBlock(ctx, (piece.col + c) * CELL, (ghostRow + r) * CELL, CELL, COLORS[piece.type]);
          }
        }
        ctx.globalAlpha = 1;

        for (let r = 0; r < piece.shape.length; r++) {
          for (let c = 0; c < piece.shape[r].length; c++) {
            if (!piece.shape[r][c]) continue;
            const nr = piece.row + r;
            if (nr < 0) continue;
            drawBlock(ctx, (piece.col + c) * CELL, nr * CELL, CELL, COLORS[piece.type]);
          }
        }
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { active = false; cancelAnimationFrame(raf); };
  }, [paused]);

  useEffect(() => {
    let raf;
    let active = true;
    const overlay = overlayCanvasRef.current;
    const ctx = overlay.getContext("2d");

    function resize() {
      const rect = containerRef.current.getBoundingClientRect();
      overlay.width = rect.width;
      overlay.height = rect.height;
    }
    resize();
    window.addEventListener("resize", resize);

    const draw = (time) => {
      if (!active) return;
      ctx.clearRect(0, 0, overlay.width, overlay.height);

      if (wormActiveRef.current && wormRef.current) {
        const w = wormRef.current;
        const n = w.cells.length;
        const phase = wormPhaseRef.current;

        if (phase === "crawl") {
          for (let i = n - 1; i >= 0; i--) {
            const localT = clamp(w.t - i * SEGMENT_DELAY, 0, 1);
            if (localT <= 0) continue;
            const ease = easeInOutQuad(localT);
            const x = w.startX + (w.endX - w.startX) * ease;
            const y = w.startY + (w.endY - w.startY) * ease;
            const wiggle = Math.sin(time / 110 + i * 0.9) * 8 * (1 - ease);
            const size = CELL * (1 - 0.55 * ease);
            drawBlock(ctx, x - size / 2, y + wiggle - size / 2, size, COLORS[w.cells[i]] || COLORS.I);
          }
        }
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { active = false; window.removeEventListener("resize", resize); cancelAnimationFrame(raf); };
  }, []);

  useEffect(() => {
    const canvas = nextCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = 120;
    canvas.height = 80;
    ctx.fillStyle = "#0a0a12";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const shape = SHAPES[nextType];
    const size = 20;
    const w = shape[0].length * size;
    const h = shape.length * size;
    const offX = (canvas.width - w) / 2;
    const offY = (canvas.height - h) / 2;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) drawBlock(ctx, offX + c * size, offY + r * size, size, COLORS[nextType]);
      }
    }
  }, [nextType]);

  if (ending) return <TetrisEnding onFinish={onFinish} />;

  return (
    <>
      <AppShell>
        <style>{`
          @font-face { font-family: 'PokemonClassic'; src: url('/fonts/PokemonClassic.ttf') format('truetype'); }
          @keyframes applePulse {
            0% { transform: scale(1); filter: drop-shadow(0 0 0px #2ea84a); }
            50% { transform: scale(1.15); filter: drop-shadow(0 0 20px #2ea84a); }
            100% { transform: scale(1); filter: drop-shadow(0 0 0px #2ea84a); }
          }
        `}</style>
        <div ref={containerRef} style={{
          flex: 1, background: "#000", display: "grid",
          gridTemplateColumns: "260px 1fr 260px", alignItems: "center",
          position: "relative", overflow: "hidden",
        }}>
          <MatrixRain />
          <canvas ref={overlayCanvasRef} style={{
            position: "absolute", inset: 0, width: "100%", height: "100%",
            pointerEvents: "none", zIndex: 50,
          }} />

          <button onClick={insertTestRow} style={{
            position: "absolute", top: 8, left: 8, zIndex: 100,
            background: "#333", color: "#0f0", border: "1px solid #0f0", borderRadius: 4,
            padding: "6px 14px", cursor: "pointer", fontFamily: "monospace", fontSize: 12,
          }}>DEV: Instant Row</button>

          <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
            {tetrisLogo && <img src={tetrisLogo} alt="Tetris" style={{ width: LOGO_WIDTH, height: "auto" }} />}
          </div>

          <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
            <canvas ref={canvasRef} style={{ border: "3px solid #444", borderRadius: 4, display: "block" }} />
            {paused && !gameOver && !completed && (
              <div style={{
                position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, color: "#fff", fontFamily: "monospace",
              }}>PAUSED</div>
            )}
          </div>

          <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
            <div style={{
              fontFamily: "'PokemonClassic', monospace", fontSize: 22, color: "#ff2020",
              letterSpacing: 2, textShadow: "0 0 8px #ff202088",
            }}>NEXT</div>
            <canvas ref={nextCanvasRef} style={{ background: "#0a0a12", border: "2px solid #333", borderRadius: 4 }} />

            <div ref={appleBoxRef} style={{
              width: 220, height: 220, background: "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              overflow: "visible",
              animation: appleFlash ? "applePulse 0.35s ease" : "none",
            }}>
              {showArtifact && winArtifact ? (
                <img src={winArtifact} alt="artifact" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              ) : appleGone ? null : loadedApple ? (
                <img src={loadedApple.src} alt="apple" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              ) : (
                <div style={{ fontSize: 11, color: "#555", textAlign: "center", padding: 8, fontFamily: "monospace" }}>
                  no apple image
                </div>
              )}
            </div>
          </div>

          {gameOver && !completed && (
            <div style={{ position: "absolute", inset: 0, zIndex: 200 }}>
              <Loseg onPlayAgain={restart} />
            </div>
          )}

          {fadeBlack > 0 && !ending && (
            <div style={{ position: "absolute", inset: 0, background: "#000", opacity: fadeBlack, zIndex: 300, pointerEvents: "none" }} />
          )}
        </div>
      </AppShell>
    </>
  );
}