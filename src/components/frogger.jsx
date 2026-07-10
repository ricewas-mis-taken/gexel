import { useState, useEffect, useRef, useCallback } from "react";
import Loseg from "./transitions/Loseg";
import CoinCounter from "./CoinCounter";
import { useCoins } from "./CoinContext";
import { fadeOutAudio } from "./audioFade";
import { ensureAudioPlays } from "./audioUnlock";

const IMAGE_MODULES = import.meta.glob("../assets/**/*.png", { eager: true, import: "default" });
const AUDIO_MODULES = import.meta.glob("../assets/**/*.mp3", { eager: true, import: "default" });

function resolveImage(name)
{
  return IMAGE_MODULES[`../assets/${name}.png`];
}
function resolveAudio(name) {
  return AUDIO_MODULES[`../assets/frogger/${name}.mp3`];
}

function playSfx(name, volume=0.6) {
  try {
      const url = resolveAudio(name);
    if (!url) { console.warn("Missing sfx:", name); return; }
    const audio = new Audio(url);
    audio.volume = volume;
    audio.play().catch(() => {});
  } catch {}
}

export const selectStyle = { fontSize: 13, padding: "2px 4px", border: "1px solid #555", borderRadius: 2, width: 130, background: "#3a3a3a", color: "#e0e0e0" };
export const ribbonBtn   = { fontSize: 13, padding: "3px 10px", cursor: "pointer", border: "1px solid #555", borderRadius: 2, color: "#e0e0e0" };
export const cornerCell  = { background: "#2a2a2a", border: "1px solid #444", width: 40, minWidth: 40 };
export const headerCell  = { background: "#2a2a2a", border: "1px solid #444", width: 80, minWidth: 80, textAlign: "center", fontWeight: "normal", padding: "2px 0", color: "#aaa" };
export const rowHeader   = { background: "#2a2a2a", border: "1px solid #444", textAlign: "center", width: 40, minWidth: 40, fontSize: 12, color: "#aaa" };

export function AppShell({ children, rightSlot }) {
  return (
    <div style={{ background: "#000", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 900, height: 600, position: "relative", border: "2px solid #2ea84a", borderRadius: 6, overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 0 40px #2ea84a33" }}>
        <div style={{ background: "#2ea84a", color: "white", padding: "6px 12px", fontSize: 14, display: "flex", alignItems: "center", gap: 16, flexShrink: 0, borderBottom: "2px solid #1a5c37" }}>
          <span style={{ fontWeight: "bold" }}>Gexel</span>
          {["File","Home","Insert","Page Layout","Formulas","Data","Review","View"].map(m => (
            <span key={m} style={{ opacity: 0.85 }}>{m}</span>
          ))}
          {rightSlot && <span style={{ marginLeft: "auto" }}>{rightSlot}</span>}
        </div>
        <CoinCounter />
        <div style={{ flex: 1, display: "flex", background: "#000a06", overflow: "hidden", position: "relative" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

const COLS = 13;
const CELL=34;
const TIMER_START = 60;
const WARN_1 = 30;
const WARN_2=10;

const ROW_TYPES = [
  "lilypad",
  "river",
  "river",
  "river",
  "river",
  "river",
  "safe",
  "road",
  "road",
  "road",
  "road",
  "road",
  "start",
];
const LILYPAD_ROW_MULT = 1.8;
const ROW_HEIGHTS = ROW_TYPES.map((t) => (t === "lilypad" ? CELL * LILYPAD_ROW_MULT : CELL));
const ROW_TOPS = (() => {
    let acc = 0;
  return ROW_HEIGHTS.map((h) => { const t = acc; acc += h; return t; });
})();
const BOARD_W = COLS * CELL;
const BOARD_H=ROW_HEIGHTS.reduce((a, b) => a + b, 0);
const START_ROW = ROW_TYPES.length - 1;

const FLY_SPAWN_INTERVAL = 6;
const FLY_LIFETIME       = 8;
const FLY_COIN_VALUE     = 75;
const FLY_ROWS = [6, 7, 8, 9, 10, 11];

const LANE_CONFIG = {
  7:  { dir:  1, speed: 1.1, sprite: "truck", gap: 6,   len: 2 },
  8:  { dir: -1, speed: 1.4, sprite: "suv1",  gap: 5,   len: 1 },
  9:  { dir:  1, speed: 1.5, sprite: "suv2",  gap: 5.5, len: 1 },
  10: { dir: -1, speed: 1.9, sprite: "race1", gap: 6,   len: 1 },
  11: { dir:  1, speed: 2.1, sprite: "race2", gap: 6.5, len: 1 },
};

const RIVER_CONFIG = {
  1: { dir: -1, speed: 0.9, type: "log",   gap: 5.5, len: 3   },
  2: { dir:  1, speed: 1.3, type: "email", gap: 5,   len: 1   },
  3: { dir: -1, speed: 1.1, type: "log",   gap: 6,   len: 2.5 },
  4: { dir:  1, speed: 1.5, type: "email", gap: 4.5, len: 1   },
  5: { dir: -1, speed: 0.8, type: "log",   gap: 6.5, len: 3.5 },
};

const START_PORTS  = [2, 4, 6, 8, 10];
const LILYPAD_COL_MIN = 4;
const LILYPAD_COL_MAX = 8;
const HOP_MS = 140;
const JUMP_ANIM_MS = 140;
const FLY_EAT_FREEZE_MS = 1600;
const PAD_ENTER_MS = 600;

function Sprite({ name, style, className, flip })
{
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [name]);
  const url=resolveImage(name);
  if (failed || !url) return <FallbackGlyph name={name} style={style} className={className} />;
  return (
    <img
      src={url}
      alt={name}
      draggable={false}
      onError={() => setFailed(true)}
      style={{
        ...style,
        transform: `${style?.transform || ""} ${flip ? "scaleX(-1)" : ""}`.trim(),
        imageRendering: "pixelated",
        pointerEvents: "none",
        userSelect: "none",
      }}
      className={className}
    />
  );
}

function FallbackGlyph({ name, style, className }) {
  const map = {
    truck:      { bg: "#0f3d1f", label: "TRK" },
    race1:      { bg: "#0a5c2a", label: "RC1" },
    race2:      { bg: "#0a5c2a", label: "RC2" },
    suv1:       { bg: "#0d4a24", label: "SV1" },
    suv2:       { bg: "#0d4a24", label: "SV2" },
    log:        { bg: "#1a3a1a", label: "LOG" },
    email:      { bg: "#062b10", label: "@"   },
    frog:       { bg: "#00ff66", label: "F"   },
    "frogger/frog":     { bg: "#00ff66", label: "F"   },
    fly:        { bg: "#003300", label: "✦"   },
    "frogger/frogjump": { bg: "#00ff66", label: "JMP" },
    "frogger/deathfrog": { bg: "#4d0000", label: "X_X" },
    "frogger/homed":    { bg: "#00ff66", label: "WIN" },
    "frogger/frogriver": { bg: "#0a5c2a", label: "PAD" },
    "frogger/hdmi":     { bg: "#1c1c1c", label: "HDMI" },
  };
  const m=map[name] || { bg: "#003300", label: "?" };
  return (
    <div className={className} style={{
      ...style,
      background: m.bg, border: "1px solid #00ff66", borderRadius: 4,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#00ff66", fontFamily: "monospace", fontSize: 10, fontWeight: "bold",
      textShadow: "0 0 4px #00ff66", boxShadow: "0 0 8px rgba(0,255,102,0.4)",
    }}>
      {m.label}
    </div>
  );
}

const GLYPHS = "01アイウエオカキクケコ$#%&ABCDEFXYZ".split("");
function useMatrixRows(count)
{
  const ref = useRef(
    Array.from({ length: count }, (_, i) => ({
      ch: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
      y: (i / count) * 100 + Math.random() * 2,
      delay: Math.random() * 3,
      dur: 3 + Math.random() * 4,
      reverse: Math.random() > 0.5,
    }))
  );
  return ref.current;
}

function RiverRow() {
  const glyphs=useMatrixRows(10);
  return (
    <div className="river-row">
      {glyphs.map((g, i) => (
        <span
          key={i}
          className={`matrix-glyph${g.reverse ? " rev" : ""}`}
          style={{ top: `${g.y}%`, animationDelay: `${g.delay}s`, animationDuration: `${g.dur}s` }}
        >
          {g.ch}
        </span>
      ))}
    </div>
  );
}

export default function FroggerApp({ onFinish }) {
  return <AppShell><FroggerBoard onFinish={onFinish} /></AppShell>;
}

function FroggerBoard({ onFinish }) {
  const [, forceTick]    = useState(0);
  const [delivered, setDelivered] = useState([]);
  const [gameState, setGameState] = useState("playing");

  const { addSessionCoins, commitSession, discardSession } = useCoins();
  const [coinPop, setCoinPop]           = useState(null);

  const [message, setMessage]      = useState("");
  const [timeLeft, setTimeLeft]    = useState(TIMER_START);
  const [warningFlash, setWarningFlash] = useState(null);

  const [fly, setFly]           = useState(null);
  const flyLifeRef              = useRef(0);
  const flySpawnRef             = useRef(FLY_SPAWN_INTERVAL);
  const flyConsumedRef          = useRef(false);

  const vehiclesRef   = useRef({});
  const logsRef       = useRef({});
  const lastTimeRef   = useRef(performance.now());
  const rafRef        = useRef(null);

  const deliveredCountRef = useRef(0);

  const frogRef = useRef({
    col: START_PORTS[0], row: START_ROW,
    isJumping: false, deadType: null, isHomed: false,
  });

  const jumpTORef     = useRef(null);
  const restartTORef  = useRef(null);
  const timerRef      = useRef(null);
  const warnedRef     = useRef({ w30: false, w10: false });
  const flashTORef    = useRef(null);
  const coinPopTORef  = useRef(null);
  const facingRef     = useRef("up");
  const frozenRef     = useRef(false);
  const freezeTORef   = useRef(null);
  const padTORef      = useRef(null);
  const bgMusicRef    = useRef(null);

  useEffect(() => {
    const v = {};
    Object.entries(LANE_CONFIG).forEach(([row, cfg]) => {
        const n = Math.ceil(COLS / cfg.gap) + 2;
      v[row] = Array.from({ length: n }, (_, i) => ({
        x: i * cfg.gap - (n * cfg.gap) / 2,
      }));
    });
    vehiclesRef.current=v;

    const l = {};
    Object.entries(RIVER_CONFIG).forEach(([row, cfg]) => {
      const n = Math.ceil(COLS / cfg.gap) + 2;
      l[row] = Array.from({ length: n }, (_, i) => ({
        x: i * cfg.gap - (n * cfg.gap) / 2,
      }));
    });
    logsRef.current = l;

    return () => {
      clearTimeout(jumpTORef.current);
      clearTimeout(freezeTORef.current);
      clearTimeout(padTORef.current);
    };
  }, []);

  useEffect(() => {
    const url = resolveAudio("frogmusic");
    if (!url) return;
    const audio = new Audio(url);
    audio.loop = true;
    audio.volume = 0.85;
    bgMusicRef.current = audio;
    const stopUnlock = ensureAudioPlays(audio, () => bgMusicRef.current === audio);
    return () => {
      stopUnlock();
      audio.pause();
      audio.currentTime = 0;
      bgMusicRef.current = null;
      discardSession();
    };
  }, []);

  useEffect(() => {
    if (!bgMusicRef.current) return;
    if (gameState === "won" || gameState === "timeout")
    {
      fadeOutAudio(bgMusicRef.current);
    } else if (gameState === "playing") {
        bgMusicRef.current.volume = 0.85;
      bgMusicRef.current.play().catch(() => {});
    }
  }, [gameState]);

  useEffect(() => {
    if (gameState !== "playing") { clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => {
      if (frozenRef.current) return;
      setTimeLeft((prev) => {
        const next = prev - 1;
        if (next <= WARN_1 && next > WARN_1 - 2 && !warnedRef.current.w30) {
          warnedRef.current.w30 = true; triggerWarn("30");
        }
        if (next <= WARN_2 && next > WARN_2 - 2 && !warnedRef.current.w10) {
          warnedRef.current.w10 = true; triggerWarn("10");
        }
        if (next <= 0) { clearInterval(timerRef.current); setGameState("timeout"); return 0; }
        return next;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [gameState]);

  function triggerWarn(label) {
    setWarningFlash(label);
    playSfx("timewarningfrogger");
    clearTimeout(flashTORef.current);
    flashTORef.current = setTimeout(() => setWarningFlash(null), 2200);
  }

  const resetFrog = useCallback(() => {
    const idx = Math.min(deliveredCountRef.current, START_PORTS.length - 1);
    frogRef.current = {
      col: START_PORTS[idx], row: START_ROW,
      isJumping: false, deadType: null, isHomed: false,
    };
  }, []);

  const die = useCallback((msg, deathEnvironment = "road") => {
    setMessage(msg);
    frogRef.current.deadType = deathEnvironment;
    setTimeout(() => {
      playSfx(deathEnvironment === "river" ? "drown" : "landdie");
    }, HOP_MS);
    setGameState("dead");
  }, []);

  const landOnLilypad = useCallback((col) => {
    frogRef.current = { ...frogRef.current, col, row: 0, isHomed: true };
    playSfx("homed");
    setDelivered((d) => {
      const nd = [...d, d.length];
      deliveredCountRef.current = nd.length;
      if (nd.length >= START_PORTS.length) {
        commitSession();
        setGameState("won");
      }
      return nd;
    });

    clearTimeout(padTORef.current);
    padTORef.current = setTimeout(() => resetFrog(), PAD_ENTER_MS);
  }, [resetFrog]);

  useEffect(() => {
    if (gameState === "dead") {
      restartTORef.current = setTimeout(() => {
        resetFrog();
        setGameState("playing");
        setMessage("");
      }, 900);
    }
    return () => clearTimeout(restartTORef.current);
  }, [gameState, resetFrog]);

  const eatFly = useCallback(() => {
    if (flyConsumedRef.current) return;
    flyConsumedRef.current = true;
    setFly(null);
    flyLifeRef.current = 0;

    addSessionCoins(FLY_COIN_VALUE);

    const { col, row } = frogRef.current;
    setCoinPop({ x: col * CELL + CELL / 2, y: ROW_TOPS[row] });
    clearTimeout(coinPopTORef.current);
    coinPopTORef.current = setTimeout(() => setCoinPop(null), 900);

    playSfx("flyeat");
    frozenRef.current = true;
    clearTimeout(freezeTORef.current);
    freezeTORef.current = setTimeout(() => {
      frozenRef.current = false;
    }, FLY_EAT_FREEZE_MS);
  }, []);

  useEffect(() => {
    function loop(now) {
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = now;

      if (gameState === "playing" && !frozenRef.current) {
        Object.entries(LANE_CONFIG).forEach(([row, cfg]) => {
          vehiclesRef.current[row]?.forEach((v) => {
            v.x += cfg.dir * cfg.speed * dt;
            if (cfg.dir === 1  && v.x > COLS + 2) v.x -= COLS + 4;
            if (cfg.dir === -1 && v.x < -3)       v.x += COLS + 4;
          });
        });
        Object.entries(RIVER_CONFIG).forEach(([row, cfg]) => {
          logsRef.current[row]?.forEach((v) => {
            v.x += cfg.dir * cfg.speed * dt;
            if (cfg.dir === 1  && v.x > COLS + 2) v.x -= COLS + 4;
            if (cfg.dir === -1 && v.x < -3)       v.x += COLS + 4;
          });
        });

        flySpawnRef.current -= dt;
        if (flyLifeRef.current > 0) {
          flyLifeRef.current -= dt;
          if (flyLifeRef.current <= 0) {
            setFly(null);
            flyLifeRef.current = 0;
            flySpawnRef.current = FLY_SPAWN_INTERVAL;
          }
        } else if (flySpawnRef.current <= 0) {
          const spawnRow = FLY_ROWS[Math.floor(Math.random() * FLY_ROWS.length)];
          const spawnCol = Math.floor(Math.random() * COLS);
          flyConsumedRef.current = false;
          flyLifeRef.current = FLY_LIFETIME;
          flySpawnRef.current = FLY_SPAWN_INTERVAL;
          setFly({ row: spawnRow, col: spawnCol });
        }

        const { col, row } = frogRef.current;
        const rowType = ROW_TYPES[row];

        setFly((currentFly) => {
          if (
            currentFly &&
            !flyConsumedRef.current &&
            Math.floor(col + 0.5) === currentFly.col &&
            row === currentFly.row
          ) {
            eatFly();
          }
          return currentFly;
        });

        if (rowType === "road") {
          const cfg = LANE_CONFIG[row];
          const hit = vehiclesRef.current[row]?.some(
            (v) => col + 0.5 > v.x && col + 0.5 < v.x + cfg.len
          );
          if (hit) die("CRASHED INTO HARDWARE", "road");
        } else if (rowType === "river") {
          const cfg = RIVER_CONFIG[row];
          const ride = logsRef.current[row]?.find(
            (v) => col + 0.5 > v.x - 0.15 && col + 0.5 < v.x + cfg.len + 0.15
          );
          if (!ride) {
            die("LOST IN THE DATA STREAM", "river");
          } else {
            const drift = cfg.speed * cfg.dir * dt;
            frogRef.current.col += drift;
            if (frogRef.current.col < -0.4 || frogRef.current.col > COLS - 0.6) {
              die("DRIFTED OFF THE NETWORK", "river");
            }
          }
        }
      }

      forceTick((t) => t + 1);
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [gameState, die, eatFly]);

  useEffect(() => {
    function onKey(e) {
      if (gameState !== "playing" || frozenRef.current) return;
      let dCol = 0, dRow = 0;
      if      (e.key === "ArrowUp"    || e.key === "w") dRow = -1;
      else if (e.key === "ArrowDown"  || e.key === "s") dRow =  1;
      else if (e.key === "ArrowLeft"  || e.key === "a") dCol = -1;
      else if (e.key === "ArrowRight" || e.key === "d") dCol =  1;
      else return;
      e.preventDefault();
      hop(dCol, dRow);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [gameState, delivered]);

  function hop(dCol, dRow) {
    if (frozenRef.current) return;
    const current = frogRef.current;
    if (current.row === START_ROW && dCol !== 0) return;

    if      (dRow === -1) facingRef.current = "up";
    else if (dRow === 1)  facingRef.current = "down";
    else if (dCol === -1) facingRef.current = "left";
    else if (dCol === 1)  facingRef.current = "right";

    const nc = Math.max(0, Math.min(COLS - 1, Math.round(current.col) + dCol));
    const nr=Math.max(0, Math.min(START_ROW, current.row + dRow));

    playSfx("hop");
    frogRef.current.isJumping = true;
    clearTimeout(jumpTORef.current);
    jumpTORef.current = setTimeout(() => {
        frogRef.current.isJumping = false;
    }, JUMP_ANIM_MS);

    if (nr === 0)
    {
      if (nc >= LILYPAD_COL_MIN && nc <= LILYPAD_COL_MAX) {
        landOnLilypad(nc);
        return;
      }
      die("MISSED THE LILY PAD", "river");
      frogRef.current = { col: nc, row: nr, deadType: "river", isJumping: false, isHomed: false };
      return;
    }

    frogRef.current = { col: nc, row: nr, isJumping: true, deadType: null, isHomed: false };
  }

  function restartGame() {
    discardSession();

    frozenRef.current = false;
    clearTimeout(freezeTORef.current);
    clearTimeout(padTORef.current);

    setFly(null);
    flyLifeRef.current = 0;
    flySpawnRef.current = FLY_SPAWN_INTERVAL;
    flyConsumedRef.current = false;

    deliveredCountRef.current = 0;
    setDelivered([]);
    setGameState("playing");
    setMessage("");
    setTimeLeft(TIMER_START);
    warnedRef.current = { w30: false, w10: false };
    setWarningFlash(null);
    resetFrog();
  }

  useEffect(() => {
    if (gameState === "timeout") {
      discardSession();
    }
  }, [gameState]);

  useEffect(() => {
    if (gameState !== "won") return;
    const t = setTimeout(() => onFinish?.(), 1200);
    return () => clearTimeout(t);
  }, [gameState, onFinish]);

  const FACING_DEG = { up: 0, down: 180, left: -90, right: 90 };
  const px = (n) => n * CELL;
  const isRiver = ROW_TYPES[frogRef.current.row] === "river";
  const timerColor = timeLeft <= WARN_2 ? "#ff3333" : timeLeft <= WARN_1 ? "#ffaa00" : "#00ff66";

  const flyBlink = flyLifeRef.current > 0 && flyLifeRef.current < 3;

  let frogSpriteName = "frogger/frog";
  if (gameState === "dead") {
    frogSpriteName = "frogger/deathfrog";
  } else if (frogRef.current.isJumping) {
    frogSpriteName = "frogger/frogjump";
  }

  const frogSize = CELL - 6;
  const frogRowTop = ROW_TOPS[frogRef.current.row] + (ROW_HEIGHTS[frogRef.current.row] - frogSize) / 2;

  return (
    <div className="frogger-inner-wrap">
      <style>{`
        @font-face {
          font-family: 'PokemonClassic';
          src: url('/fonts/PokemonClassic.ttf') format('truetype');
        }
        .frogger-inner-wrap {
          --green: #00ff66;
          --green-dim: #0a5c2a;
          --green-deep: #062b10;
          font-family: 'Courier New', monospace;
          width: 100%; height: 100%;
          display: flex; align-items: center; justify-content: center;
          color: var(--green);
        }
        .game-frame {
          display: flex; gap: 16px; align-items: center;
          background: transparent;
        }
        .board-col {
          display: flex; flex-direction: column; align-items: center; gap: 8px;
        }
        .hud-row {
          display: flex; align-items: center; justify-content: center;
          width: ${BOARD_W}px;
          font-family: 'PokemonClassic', monospace;
        }
        .timer-display {
          font-family: 'PokemonClassic', monospace;
          font-size: 12px; letter-spacing: 2px;
          text-shadow: 0 0 8px currentColor;
          transition: color 0.3s;
        }
        .board-wrap {
          position: relative;
          width: ${BOARD_W}px; height: ${BOARD_H}px;
          border: 2px solid var(--green);
          box-shadow: 0 0 16px rgba(0,255,102,0.3), inset 0 0 20px rgba(0,255,102,0.08);
          background: #00120a; overflow: hidden;
        }
        .row { position: absolute; left: 0; width: 100%; }
        .row.lilypad {
          background: #00120a;
          border-bottom: 2px solid var(--green);
          overflow: hidden;
        }
        .row.river {
          background: #00100a;
          border-top: 1px solid rgba(0,255,102,0.15);
          overflow: hidden;
        }
        .river-row { position: relative; width: 100%; height: 100%; }
        .matrix-glyph {
          position: absolute; left: -16px;
          color: var(--green); font-size: 12px; opacity: 0.5;
          text-shadow: 0 0 4px var(--green);
          animation-name: drift; animation-iteration-count: infinite;
          animation-timing-function: linear;
        }
        .matrix-glyph.rev { left: auto; right: -16px; animation-name: driftRev; }
        @keyframes drift {
          0%   { transform: translateX(-20px); opacity: 0; }
          10%  { opacity: 0.6; } 90% { opacity: 0.6; }
          100% { transform: translateX(${BOARD_W + 20}px); opacity: 0; }
        }
        @keyframes driftRev {
          0%   { transform: translateX(20px); opacity: 0; }
          10%  { opacity: 0.6; } 90% { opacity: 0.6; }
          100% { transform: translateX(-${BOARD_W + 20}px); opacity: 0; }
        }
        .row.safe {
          background: repeating-linear-gradient(90deg, #021a0e, #021a0e 12px, #032712 12px, #032712 16px);
          border-top: 1px solid var(--green); border-bottom: 1px solid var(--green);
        }
        .row.road { background: #060606; border-top: 1px solid rgba(0,255,102,0.08); }
        .lane-stripe {
          position: absolute; top: 50%; left: 0; width: 100%; height: 1px;
          background: repeating-linear-gradient(90deg, var(--green-dim), var(--green-dim) 10px, transparent 10px, transparent 20px);
          opacity: 0.5;
        }
        .row.start {
          background: repeating-linear-gradient(90deg, #cfd2d4, #cfd2d4 14px, #b7babd 14px, #b7babd 16px);
          border-top: 2px solid #8a8d90;
        }
        .usb-port {
          position: absolute; top: 0;
          width: ${CELL}px; height: ${CELL}px;
          display: flex; align-items: center; justify-content: center;
          border-radius: 4px;
          transition: box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .usb-port.occupied {
          border: 2px solid #ff3333;
          box-shadow: 0 0 10px 2px rgba(255,51,51,0.7), inset 0 0 8px rgba(255,51,51,0.5);
        }
        .vehicle, .raft { position: absolute; top: 4px; height: ${CELL - 8}px; }

        .fly-sprite {
          position: absolute; z-index: 15;
          width: ${CELL - 2}px; height: ${CELL - 2}px;
          top: 1px;
          pointer-events: none;
        }
        .fly-sprite.blink { animation: flyBlink 0.3s step-end infinite; }
        @keyframes flyBlink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
        .fly-glow {
          position: absolute; inset: -10px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,255,255,0.85), rgba(255,255,255,0.25) 55%, transparent 75%);
          animation: flyPulse 0.8s ease-in-out infinite alternate;
        }
        .fly-glow.flashing {
          animation: flyFlash 0.25s step-end infinite;
        }
        @keyframes flyFlash {
          0%, 100% { opacity: 1; background: radial-gradient(circle, rgba(255,255,255,1), rgba(255,255,255,0.4) 55%, transparent 75%); }
          50% { opacity: 0.2; }
        }
        @keyframes flyPulse {
          from { opacity: 0.75; transform: scale(0.95); }
          to   { opacity: 1;    transform: scale(1.25); }
        }

        .coin-pop {
          position: absolute; z-index: 40; pointer-events: none;
          font-family: 'PokemonClassic', monospace;
          font-size: 12px; color: #ffd700;
          text-shadow: 0 0 8px #ffd700;
          animation: coinFloat 0.9s ease-out forwards;
        }
        @keyframes coinFloat {
          0%   { transform: translateY(0);    opacity: 1; }
          100% { transform: translateY(-32px); opacity: 0; }
        }

        .frog { position: absolute; width: ${frogSize}px; height: ${frogSize}px; z-index: 20; }
        .frog-enter {
          animation: padPulse ${PAD_ENTER_MS}ms ease-in-out forwards;
        }
        @keyframes padPulse {
          0%   { transform: scale(1);   opacity: 1; }
          70%  { transform: scale(0.6); opacity: 1; }
          100% { transform: scale(0.2); opacity: 0; }
        }

        .warn-flash {
          position: absolute; inset: 0;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          pointer-events: none; z-index: 60;
          background: rgba(0,0,0,0.45);
          animation: flashIn 0.15s ease-out;
        }
        .warn-text {
          font-family: 'PokemonClassic', monospace; letter-spacing: 3px;
          animation: warnPulse 0.4s ease-in-out infinite alternate;
        }
        @keyframes flashIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes warnPulse {
          from { transform: scale(1);    opacity: 0.9; }
          to   { transform: scale(1.06); opacity: 1;   }
        }

        .debug-warp-btn {
          position: absolute; top: 42px; left: 8px; z-index: 10000;
          background: #000; border: 2px solid #9933ff; color: #9933ff;
          font-family: 'PokemonClassic', monospace;
          font-size: 9px; padding: 4px 8px; cursor: pointer; letter-spacing: 1px;
          box-shadow: 0 0 8px rgba(153,51,255,0.4);
        }
        .debug-warp-btn:hover { background: rgba(153,51,255,0.15); }
        .msg {
          position: absolute; bottom: 2px; left: 0; width: 100%;
          text-align: center; font-size: 10px; color: #ff5555;
          text-shadow: 0 0 6px #ff5555;
        }
        .sidebar {
          width: ${CELL + 22}px; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 14px;
        }
        .port-dot {
          width: ${CELL + 14}px; height: ${CELL + 14}px; border-radius: 8px;
          border: 2px solid var(--green-dim); background: var(--green-deep);
          display: flex; align-items: center; justify-content: center;
          opacity: 0.45;
          transition: all 0.25s ease;
        }
        .port-dot.done {
          border-color: var(--green);
          opacity: 1;
          box-shadow: 0 0 0 4px rgba(0,255,102,0.12), 0 0 22px 6px rgba(0,255,102,0.55);
        }
      `}</style>

      <div className="game-frame">
        <div className="board-col">

          <div className="hud-row">
            <div className="timer-display" style={{ color: timerColor }}>
              TIME: {String(timeLeft).padStart(2, "0")}s
            </div>
          </div>

          <div className="board-wrap">

            {ROW_TYPES.map((type, r) => {
              const top = ROW_TOPS[r];
              const h = ROW_HEIGHTS[r];

              if (type === "lilypad") return (
                <div key={r} className="row lilypad" style={{ top, height: h }}>
                  <Sprite
                    name="frogger/frogriver"
                    style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
                  />
                </div>
              );

              if (type === "river") {
                const cfg = RIVER_CONFIG[r];
                return (
                  <div key={r} className="row river" style={{ top, height: h }}>
                    <RiverRow />
                    {logsRef.current[r]?.map((v, i) => (
                      <div key={i} className="raft" style={{ left: px(v.x), width: px(cfg.len) }}>
                        <Sprite name={cfg.type} style={{ width: "100%", height: "100%" }} />
                      </div>
                    ))}
                  </div>
                );
              }

              if (type === "safe") return <div key={r} className="row safe" style={{ top, height: h }} />;

              if (type === "road") {
                const cfg = LANE_CONFIG[r];
                return (
                  <div key={r} className="row road" style={{ top, height: h }}>
                    <div className="lane-stripe" />
                    {vehiclesRef.current[r]?.map((v, i) => (
                      <div key={i} className="vehicle" style={{ left: px(v.x), width: px(cfg.len) }}>
                        <Sprite name={cfg.sprite} flip={cfg.dir === -1} style={{ width: "100%", height: "100%" }} />
                      </div>
                    ))}
                  </div>
                );
              }

              if (type === "start") return (
                <div key={r} className="row start" style={{ top, height: h }}>
                  {START_PORTS.map((c, i) => (
                    <div
                      key={i}
                      className={`usb-port${i >= delivered.length ? " occupied" : ""}`}
                      style={{ left: px(c) }}
                    >
                      <Sprite name="frogger/hdmi" style={{ width: "120%", height: "90%" }} />
                    </div>
                  ))}
                </div>
              );

              return null;
            })}

            {fly && (
              <div
                className={`fly-sprite${flyBlink ? " blink" : ""}`}
                style={{ left: px(fly.col) + 1, top: ROW_TOPS[fly.row] + 1 }}
              >
                <div className={`fly-glow${flyBlink ? " flashing" : ""}`} />
                <Sprite name="fly" style={{ width: "100%", height: "100%" }} />
              </div>
            )}

            <div
              className="frog"
              style={{
                left: px(frogRef.current.col) + (CELL - frogSize) / 2,
                top:  frogRowTop,
                transition: isRiver
                  ? `top ${HOP_MS}ms ease-out`
                  : `left ${HOP_MS}ms ease-out, top ${HOP_MS}ms ease-out`,
              }}
            >
              {frogRef.current.isHomed ? (
                <Sprite
                  name="frogger/frog"
                  className="frog-enter"
                  style={{ width: "100%", height: "100%" }}
                />
              ) : (
                <Sprite
                  name={frogSpriteName}
                  style={{
                    width: "100%",
                    height: "100%",
                    transform: `rotate(${FACING_DEG[facingRef.current]}deg)`,
                    transition: "transform 120ms ease-out",
                  }}
                />
              )}
            </div>

            {coinPop && (
              <div className="coin-pop" style={{ left: coinPop.x - 16, top: coinPop.y }}>
                +{FLY_COIN_VALUE}c
              </div>
            )}

            {message && <div className="msg">{message}</div>}

            {warningFlash && (
              <div className="warn-flash">
                {warningFlash === "30" ? (
                  <>
                    <div className="warn-text" style={{ fontSize: 20, color: "#ffaa00", textShadow: "0 0 16px #ffaa00" }}>WARNING</div>
                    <div className="warn-text" style={{ fontSize: 13, color: "#ffaa00", marginTop: 6, textShadow: "0 0 10px #ffaa00" }}>30 SECONDS</div>
                  </>
                ) : (
                  <>
                    <div className="warn-text" style={{ fontSize: 24, color: "#ff3333", textShadow: "0 0 20px #ff3333" }}>HURRY!</div>
                    <div className="warn-text" style={{ fontSize: 13, color: "#ff3333", marginTop: 6, textShadow: "0 0 12px #ff3333" }}>10 SECONDS</div>
                  </>
                )}
              </div>
            )}

          </div>
        </div>

        <div className="sidebar">
          {START_PORTS.map((_, i) => (
            <div key={i} className={`port-dot${i < delivered.length ? " done" : ""}`}>
              <Sprite name="frogger/frog" style={{ width: "78%", height: "78%" }} />
            </div>
          ))}
        </div>
      </div>

      {gameState === "playing" && (
        <button
          className="debug-warp-btn"
          onClick={() => landOnLilypad((LILYPAD_COL_MIN + LILYPAD_COL_MAX) / 2)}
        >
          🐸 WARP
        </button>
      )}

      {gameState === "timeout" && (
        <div style={{ position: "absolute", inset: 0, zIndex: 200 }}>
          <Loseg onPlayAgain={restartGame} />
        </div>
      )}
    </div>
  );
}