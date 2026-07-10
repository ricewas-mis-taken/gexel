import { useEffect, useRef, useState } from "react";
import AppShell from "./AppShell";
import Loseg from "./transitions/Loseg";
import car2Img from "../assets/speedrace/car2.png";
import roadblock1Img from "../assets/speedrace/roadblock1.png";
import roadblock2Img from "../assets/speedrace/roadblock2.png";
import roadblock3Img from "../assets/speedrace/roadblock3.png";
import roadblock4Img from "../assets/speedrace/roadblock4.png";
import sidebgImg from "../assets/speedrace/sidebg.png";
import coinraceImg from "../assets/speedrace/coinrace.png";
import countdownSnd from "../assets/speedrace/countdown.mp3";
import coinscreenSnd from "../assets/speedrace/coinscreen.mp3";
import speedSnd from "../assets/speedrace/speed.mp3"; 
import carcrashSnd from "../assets/speedrace/carcrash.mp3";
import { useCoins } from "./CoinContext";

const CANVAS_W = 900;
const CANVAS_H = 600;
const ROAD_WIDTH = CANVAS_W * 0.7;
const ROAD_LEFT = (CANVAS_W - ROAD_WIDTH) / 2;
const ROAD_RIGHT = ROAD_LEFT + ROAD_WIDTH;

const COINS_TO_WIN = 5;
const WIN_TIME_LIMIT = 30;
const COIN_INTERVAL = 4.3;
const BLOCK_SPAWN_INTERVAL = 0.9;
const BLOCKS_PER_SPAWN = 2;

const BLOCK_KEYS = ["block1", "block2", "block3", "block4"];
const TARGETED_SPAWN_INTERVAL = 2;

const CRASH_TO_LOSEG_DELAY_MS = 400;

function blockSize(imgKey) {
  return imgKey === "block4" ? 70 : 105;
}

function randomBlockScale() {
  const r=Math.random();
  if (r < 0.15) return 1.5 + Math.random() * 0.4;
    if (r < 0.45) return 1.1 + Math.random() * 0.3;
  return 1;
}

function clamp01(v){
  return Math.max(0, Math.min(1, v));
}
function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export default function RoadGame({ onFinish }) {
  const { addSessionCoins, commitSession, discardSession } = useCoins();
  const canvasRef = useRef(null);
  const imagesRef = useRef({});
  const rafRef = useRef(null);
  const keysRef = useRef({});
  const startTimeRef = useRef(null);
  const lastCoinSpawnRef = useRef(0);
  const lastBlockSpawnRef = useRef(0);
  const lastTargetedSpawnRef = useRef(0);
  const coinSideRef = useRef(Math.random() < 0.5 ? -1 : 1);

  const countdownAudioRef = useRef(null);
  const coinAudioRef = useRef(null);
  const speedAudioRef = useRef(null); 
  const crashAudioRef = useRef(null);

  const playerRef = useRef({ x: CANVAS_W / 2, y: CANVAS_H - 110, w: 90, h: 90 });
  const obstaclesRef = useRef([]);
  const coinsRef = useRef([]);
  const sideScrollRef = useRef(0);

  const countdownRef = useRef(3);
  const coinCountRef = useRef(0);
  const gameStateRef = useRef("countdown");
  const countdownChangeTimeRef = useRef(0);

  const [uiTick, setUiTick] = useState(0);
  const [gameState, setGameState] = useState("countdown");
  const [countdown, setCountdown] = useState(3);
  const [coinCount, setCoinCount] = useState(0);

  useEffect(() => { countdownRef.current = countdown; countdownChangeTimeRef.current = performance.now(); }, [countdown]);
  useEffect(() => { coinCountRef.current=coinCount; }, [coinCount]);
  useEffect(() => {
    gameStateRef.current = gameState; }, [gameState]);

  useEffect(() => {
    countdownAudioRef.current = new Audio(countdownSnd);
    countdownAudioRef.current.preload = "auto";
    coinAudioRef.current = new Audio(coinscreenSnd);
    coinAudioRef.current.loop = true;
    speedAudioRef.current = new Audio(speedSnd); 
    speedAudioRef.current.loop = true;
    crashAudioRef.current = new Audio(carcrashSnd);

    const toLoad = {
      player: car2Img,
      block1: roadblock1Img,
      block2: roadblock2Img,
      block3: roadblock3Img,
      block4: roadblock4Img,
      sidebg: sidebgImg,
      coin: coinraceImg,
    };
    Object.entries(toLoad).forEach(([key, src]) => {
      const im = new Image();
      im.src = src;
      imagesRef.current[key] = im;
    });

    const down = e => { keysRef.current[e.key] = true; };
    const up = e => { keysRef.current[e.key] = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);

    const retryStuckAudio = () => {
      const state = gameStateRef.current;
      const cd = countdownAudioRef.current;
      if (cd && cd.paused && state === "countdown") {
        cd.play().catch(() => {});
      }
      const speed = speedAudioRef.current;
      if (speed && speed.paused && state === "playing") {
        speed.play().catch(() => {});
      }
    };
    window.addEventListener("pointerdown", retryStuckAudio);
    window.addEventListener("keydown", retryStuckAudio);

    const retryIntervalId=setInterval(retryStuckAudio, 200);

    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("pointerdown", retryStuckAudio);
      window.removeEventListener("keydown", retryStuckAudio);
      clearInterval(retryIntervalId);
      if (countdownAudioRef.current) countdownAudioRef.current.pause();
      if (coinAudioRef.current) { coinAudioRef.current.pause(); coinAudioRef.current.currentTime = 0; }
      if(speedAudioRef.current) { speedAudioRef.current.pause(); speedAudioRef.current.currentTime=0; }
      if (crashAudioRef.current) crashAudioRef.current.pause();
        discardSession();
    };
  }, []);

  useEffect(() => {
    if (gameState === "crashing") {
      discardSession();
      if (crashAudioRef.current) {
        crashAudioRef.current.currentTime = 0;
        crashAudioRef.current.play().catch(e => console.warn("Crash audio blocked", e));
      }
      const t = setTimeout(() => {
        setGameState("crashed");
      }, CRASH_TO_LOSEG_DELAY_MS);
      return () => clearTimeout(t);
    }
  }, [gameState]);

  useEffect(() => {
    if (gameState === "playing") {
        speedAudioRef.current.play().catch(e => console.warn("Speed audio blocked", e));
    } else {
        speedAudioRef.current.pause();
        speedAudioRef.current.currentTime = 0;
        if (coinAudioRef.current) {
            coinAudioRef.current.pause();
            coinAudioRef.current.currentTime = 0;
        }
    }
  }, [gameState]);

  useEffect(() => {
    if(gameState !== "countdown") return;

    if (countdown === 3 && countdownAudioRef.current) {
      countdownAudioRef.current.currentTime = 0;
      countdownAudioRef.current.play().catch(e => console.warn("Countdown audio blocked", e));
    }

    if (countdown <= 0) {
      const t = setTimeout(() => {
        setGameState("playing");
        startTimeRef.current = performance.now();
        lastCoinSpawnRef.current = 0;
        lastBlockSpawnRef.current = 0;
        lastTargetedSpawnRef.current = 0;
      }, 1000);
      return () => clearTimeout(t);
    }
    
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, gameState]);

  useEffect(() => {
    const canvas=canvasRef.current;
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    const loop = () => {
      update();
      draw(ctx);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [gameState]);

  function resetGame() {
    obstaclesRef.current = [];
    coinsRef.current = [];
    playerRef.current = { x: CANVAS_W / 2, y: CANVAS_H - 110, w: 90, h: 90 };
    sideScrollRef.current = 0;
    coinSideRef.current = Math.random() < 0.5 ? -1 : 1;
    setCoinCount(0);
    setCountdown(3);
    setGameState("countdown");
    if (speedAudioRef.current) {
        speedAudioRef.current.pause();
        speedAudioRef.current.currentTime = 0;
    }
    if (crashAudioRef.current) {
        crashAudioRef.current.pause();
        crashAudioRef.current.currentTime = 0;
    }
  }

  function elapsedSeconds() {
    if (!startTimeRef.current) return 0;
    return (performance.now() - startTimeRef.current) / 1000;
  }

  function randomBlockX(w) {
    return ROAD_LEFT + w / 2 + Math.random() * (ROAD_WIDTH - w);
  }

  const SAFE_Y_WINDOW=260;

  function xOverlaps(ax, aw, bx, bw, margin) {
    return Math.abs(ax - bx) < (aw + bw) / 2 + margin;
  }

  function pickSafeX(w, spawnY, blockers, margin) {
    const nearby = blockers.filter(b => Math.abs(b.y - spawnY) < SAFE_Y_WINDOW);
    for (let attempt = 0; attempt < 25; attempt++) {
      const x = randomBlockX(w);
      if (!nearby.some(b => xOverlaps(x, w, b.x, b.w, margin))) return x;
    }
    let bestX = ROAD_LEFT + w / 2;
    let bestMinDist = -Infinity;
    const steps = 24;
    for (let i = 0; i <= steps; i++) {
      const x = ROAD_LEFT + w / 2 + (ROAD_WIDTH - w) * (i / steps);
      const minDist = nearby.length
        ? Math.min(...nearby.map(b => Math.abs(x - b.x)))
        : Infinity;
      if (minDist > bestMinDist) {
        bestMinDist = minDist;
        bestX = x;
      }
    }
    return bestX;
  }

  function pickSafeXInRange(w, spawnY, blockers, margin, xMin, xMax) {
    const min = Math.max(ROAD_LEFT + w / 2, xMin);
    const max = Math.min(ROAD_RIGHT - w / 2, xMax);
    if (max <= min) return null;
    const nearby = blockers.filter(b => Math.abs(b.y - spawnY) < SAFE_Y_WINDOW);
    for (let attempt = 0; attempt < 25; attempt++) {
      const x = min + Math.random() * (max - min);
      if (!nearby.some(b => xOverlaps(x, w, b.x, b.w, margin))) return x;
    }
    return null;
  }

  function update() {
    if (gameState !== "playing") { setUiTick(t => t + 1); return; }
    const player = playerRef.current;
    const k = keysRef.current;
    const steerSpeed = 3;

    if (k["ArrowLeft"] || k["a"]) player.x -= steerSpeed;
    if (k["ArrowRight"] || k["d"]) player.x += steerSpeed;
    player.x = Math.max(ROAD_LEFT + player.w / 2, Math.min(ROAD_RIGHT - player.w / 2, player.x));

    const elapsed = elapsedSeconds();
    if (elapsed > WIN_TIME_LIMIT && coinCountRef.current < COINS_TO_WIN) {
      setGameState("crashing");
      return;
    }
    const scrollSpeed = 3.5 + elapsed * 0.02;
    sideScrollRef.current += scrollSpeed;

    obstaclesRef.current.forEach(o => { o.y += scrollSpeed; });
    obstaclesRef.current = obstaclesRef.current.filter(o => o.y < CANVAS_H + 80);

    coinsRef.current.forEach(c => { c.y += scrollSpeed; });
    coinsRef.current = coinsRef.current.filter(c => c.y < CANVAS_H + 40 && !c.collected);

    const activeCoins = coinsRef.current.filter(c => !c.collected);

    if (elapsed - lastBlockSpawnRef.current > BLOCK_SPAWN_INTERVAL) {
      lastBlockSpawnRef.current = elapsed;
      for (let i = 0; i < BLOCKS_PER_SPAWN; i++) {
        const imgKey = BLOCK_KEYS[Math.floor(Math.random() * BLOCK_KEYS.length)];
        const size = blockSize(imgKey) * randomBlockScale();
        const spawnY = -80 - i * 100;
        obstaclesRef.current.push({
          type: "block",
          x: pickSafeX(size, spawnY, activeCoins.map(c => ({ x: c.x, w: c.r * 2, y: c.y })), 30),
          y: spawnY,
          w: size, h: size,
          imgKey,
        });
      }
    }
    if (elapsed - lastTargetedSpawnRef.current > TARGETED_SPAWN_INTERVAL) {
      lastTargetedSpawnRef.current = elapsed;
      const imgKey = BLOCK_KEYS[Math.floor(Math.random() * BLOCK_KEYS.length)];
      const size = blockSize(imgKey) * randomBlockScale();
      const spawnY = -80;
      const coinBlockers = activeCoins.map(c => ({ x: c.x, w: c.r * 2, y: c.y }));
      const conflictsWithCoin = coinBlockers.some(
        b => Math.abs(b.y - spawnY) < SAFE_Y_WINDOW && xOverlaps(player.x, size, b.x, b.w, 30)
      );
      obstaclesRef.current.push({
        type: "block",
        x: conflictsWithCoin ? pickSafeX(size, spawnY, coinBlockers, 30) : player.x,
        y: spawnY,
        w: size, h: size,
        imgKey,
      });
    }
    if (elapsed - lastCoinSpawnRef.current > COIN_INTERVAL) {
      lastCoinSpawnRef.current = elapsed;
      const r = 48;
      const spawnY = -40;
      const blockers = obstaclesRef.current.map(o => ({ x: o.x, w: o.w, y: o.y }));
      const roadCenter = (ROAD_LEFT + ROAD_RIGHT) / 2;
      const edgeInset = ROAD_WIDTH * 0.14;
      coinSideRef.current *= -1;
      const [xMin, xMax] = coinSideRef.current < 0
        ? [ROAD_LEFT + edgeInset, roadCenter]
        : [roadCenter, ROAD_RIGHT - edgeInset];
      const x = pickSafeXInRange(r * 2, spawnY, blockers, player.w * 0.9, xMin, xMax)
        ?? pickSafeX(r * 2, spawnY, blockers, player.w * 0.9);
      coinsRef.current.push({
        x,
        y: spawnY,
        r,
        collected: false,
      });
    }

    const hasCoin = coinsRef.current.some(c => !c.collected);
    if (coinAudioRef.current) {
      if (hasCoin !== coinAudioRef.current.__isPlaying) {
        if (hasCoin) {
          coinAudioRef.current.play()
            .then(() => { coinAudioRef.current.__isPlaying = true; })
            .catch(() => {});
        } else {
          coinAudioRef.current.__isPlaying = false;
          coinAudioRef.current.pause();
          coinAudioRef.current.currentTime = 0;
        }
      }
    }

    for (const o of obstaclesRef.current) {
      const hitW = (o.w * 0.55 + player.w * 0.45) / 2;
      const hitH = (o.h * 0.6 + player.h * 0.7) / 2;

      if (
        Math.abs(o.x - player.x) < hitW &&
        Math.abs(o.y - player.y) < hitH
      ) {
        setGameState("crashing");
        return;
      }
    }

    coinsRef.current.forEach(c => {
      if (!c.collected) {
        const dx = c.x - player.x, dy = c.y - player.y;
        if (Math.sqrt(dx * dx + dy * dy) < c.r + player.w / 2) {
          c.collected = true;
          addSessionCoins(1);
          setCoinCount(cc => {
            const next = cc + 1;
            if (next >= COINS_TO_WIN) {
              setGameState(elapsedSeconds() <= WIN_TIME_LIMIT ? "won" : "crashing");
            }
            return next;
          });
        }
      }
    });

    setUiTick(t => t + 1);
  }

  function draw(ctx) {
    ctx.fillStyle = "#2e7d32";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const sideImg = imagesRef.current.sidebg;
    if (sideImg && sideImg.complete) {
      const tileH = sideImg.height;
      const tileW = sideImg.width;
      const offset = sideScrollRef.current % tileH;

      for (let y = -tileH + offset; y < CANVAS_H; y += tileH) {
        for (let x = ROAD_LEFT - tileW; x > -tileW; x -= tileW) {
          ctx.drawImage(sideImg, x, y, tileW, tileH);
        }
      }
      for (let y = -tileH + offset; y < CANVAS_H; y += tileH) {
        for (let x = ROAD_RIGHT; x < CANVAS_W; x += tileW) {
          ctx.drawImage(sideImg, x, y, tileW, tileH);
        }
      }
    }

    ctx.fillStyle = "#555";
    ctx.fillRect(ROAD_LEFT, 0, ROAD_WIDTH, CANVAS_H);

    const dashOffset = (elapsedSeconds() * 80) % 40;
    ctx.strokeStyle = "#ddd";
    ctx.lineWidth = 4;
    ctx.setLineDash([20, 20]);
    ctx.lineDashOffset = -dashOffset;
    ctx.beginPath();
    ctx.moveTo(CANVAS_W / 2, 0);
    ctx.lineTo(CANVAS_W / 2, CANVAS_H);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(ROAD_LEFT, 0); ctx.lineTo(ROAD_LEFT, CANVAS_H);
    ctx.moveTo(ROAD_RIGHT, 0); ctx.lineTo(ROAD_RIGHT, CANVAS_H);
    ctx.stroke();

    const player = playerRef.current;
    obstaclesRef.current.forEach(o => {
      const img = imagesRef.current[o.imgKey];
      if (img && img.complete) {
        ctx.drawImage(img, o.x - o.w / 2, o.y - o.h / 2, o.w, o.h);
      }
    });

    coinsRef.current.forEach(c => {
      if (c.collected) return;
      const img = imagesRef.current.coin;
      if (img && img.complete) {
        ctx.drawImage(img, c.x - c.r, c.y - c.r, c.r * 2, c.r * 2);
      }
    });

    const pImg = imagesRef.current.player;
    if (pImg && pImg.complete) {
      ctx.drawImage(pImg, player.x - player.w / 2, player.y - player.h / 2, player.w, player.h);
    }

    drawHUD(ctx);

    if (gameState === "countdown") {
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.textAlign = "center";
      const val=countdownRef.current;
      if (val > 0) {
          ctx.fillStyle = val === 3 ? "#e04444" : val === 2 ? "#f2c744" : "#2ea84a";
        const elapsed = performance.now() - countdownChangeTimeRef.current;
        const t = Math.min(1, elapsed / 400);
        const eased = 1 - Math.pow(1 - t, 3);
        const size = 72 * (2.2 - 1.2 * eased);
        ctx.globalAlpha = 0.25 + eased * 0.75;
        ctx.font = `bold ${size}px 'PokemonClassic', monospace`;
        ctx.fillText(val, CANVAS_W / 2, CANVAS_H / 2);
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = "#2ea84a";
        ctx.font = "bold 72px 'PokemonClassic', monospace";
        ctx.fillText("GO!", CANVAS_W / 2, CANVAS_H / 2);
      }
    }

  }

  function drawHUD(ctx) {
    const timeElapsed = elapsedSeconds();
    const timeLeft = Math.max(0, WIN_TIME_LIMIT - timeElapsed);
    const timeFrac = clamp01(timeLeft / WIN_TIME_LIMIT);
    const coins=coinCountRef.current;
    const coinFrac = clamp01(coins / COINS_TO_WIN);

    const panelX = 14, panelY = 14, panelW = 210, panelH = 70;
    ctx.save();
    ctx.fillStyle = "rgba(10,20,12,0.72)";
    roundRect(ctx, panelX, panelY, panelW, panelH, 10);
    ctx.fill();
    ctx.strokeStyle = "#2ea84a";
    ctx.lineWidth = 2;
    roundRect(ctx, panelX, panelY, panelW, panelH, 10);
    ctx.stroke();

    const barX = panelX + 12;
    const barW = panelW - 24;

    ctx.font = "12px 'PokemonClassic', monospace";
    ctx.textAlign = "left";
    ctx.fillStyle = "#ffd54a";
    ctx.fillText(`COINS ${coins}/${COINS_TO_WIN}`, barX, panelY + 18);
    const coinBarY = panelY + 24;
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    roundRect(ctx, barX, coinBarY, barW, 8, 4);
    ctx.fill();
    if (coinFrac > 0) {
      ctx.fillStyle = "#ffd54a";
      roundRect(ctx, barX, coinBarY, barW * coinFrac, 8, 4);
      ctx.fill();
    }

    const timeColor=timeFrac > 0.5 ? "#2ea84a" : timeFrac > 0.25 ? "#f2c744" : "#e05555";
    ctx.fillStyle = timeColor;
    ctx.fillText(`TIME ${timeLeft.toFixed(1)}s`, barX, panelY + 50);
    const timeBarY = panelY + 56;
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    roundRect(ctx, barX, timeBarY, barW, 8, 4);
    ctx.fill();
    if (timeFrac > 0) {
      ctx.fillStyle = timeColor;
      roundRect(ctx, barX, timeBarY, barW * timeFrac, 8, 4);
      ctx.fill();
    }
    ctx.restore();
  }

  useEffect(() => {
    if (gameState !== "won") return;
    commitSession();
    onFinish?.();
  }, [gameState, onFinish]);

  function instantWin() {
    if (countdownAudioRef.current) {
      countdownAudioRef.current.pause();
      countdownAudioRef.current.currentTime = 0;
    }
    setCoinCount(COINS_TO_WIN);
    setGameState("won");
  }

  return (
    <AppShell>
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden", background: "#000", display: "flex", alignItems: "flex-start", justifyContent: "center", position: "relative" }}>
        <canvas ref={canvasRef} style={{ imageRendering: "pixelated", width: CANVAS_W, height: CANVAS_H }} />

        {(gameState === "countdown" || gameState === "playing") && (
          <button
            onClick={instantWin}
            style={{
              position: "absolute", bottom: 14, left: 14, zIndex: 150,
              background: "rgba(10,20,12,0.72)", color: "#ffd54a",
              border: "2px solid #2ea84a", borderRadius: 8,
              padding: "6px 10px", fontFamily: "'PokemonClassic', monospace",
              fontSize: 12, cursor: "pointer",
            }}
          >
            Instant Win
          </button>
        )}

        {gameState === "crashed" && (
          <div style={{ position: "absolute", inset: 0, zIndex: 200 }}>
            <Loseg onPlayAgain={resetGame} />
          </div>
        )}
      </div>
    </AppShell>
  );
}