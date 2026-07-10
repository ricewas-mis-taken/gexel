import { useEffect, useRef, useState } from "react";
import AppShell from "./AppShell";
import { useCoins } from "./CoinContext";
import Loseg from "./transitions/Loseg";

import jailImg from "../assets/jail.png";
import jail1Img from "../assets/jail1.png";
import jail2Img from "../assets/jail2.png";
import playershipImg from "../assets/playership.png";

import ship1Img from "../assets/ship1.png";
import ship2Img from "../assets/ship2.png";
import ship3Img from "../assets/ship3.png";
import ship4Img from "../assets/ship4.png";

import altShip1Img from "../assets/ship1.1.png";
import altShip2Img from "../assets/ship2.1.png";
import altShip3Img from "../assets/ship3.1.png";
import altShip4Img from "../assets/ship4.1.png";

import explosion1Img from "../assets/explosion1.png";
import explosion2Img from "../assets/explosion2.png";
import explosion3Img from "../assets/explosion3.png";
import explosion4Img from "../assets/explosion4.png";

import badexplode1Img from "../assets/badexplode1.png";
import badexplode2Img from "../assets/badexplode2.png";
import badexplode3Img from "../assets/badexplode3.png";
import badexplode4Img from "../assets/badexplode4.png";
import badexplode5Img from "../assets/badexplode5.png";

import galagawinImg from "../assets/sf2/galagawin.png";

import gshootSnd from "../assets/galaga/gshoot.mp3";
import shipdeadSnd from "../assets/galaga/shipdead.mp3";
import aliendeadSnd from "../assets/galaga/aliendead.mp3";
import safehitSnd from "../assets/galaga/safehit.mp3";
import gmusicSnd from "../assets/galaga/gmusic.mp3";
import deathMusicSnd from "../assets/galaga/deathmusic.mp3";
import { ensureAudioPlays } from "./audioUnlock";

const W=900, H = 566;
const PLAYER_SPEED = 3;
const BULLET_SPEED=4;
const SHOOT_COOLDOWN = 30;
const SHIP_TYPES = [ship1Img, ship2Img, ship3Img, ship4Img];
const SHIP_ALT_TYPES = [altShip1Img, altShip2Img, altShip3Img, altShip4Img];
const SHIP_SIZE = 26
const RESPAWN_TIME_DIVE = 1300;
const RESPAWN_TIME_STEADY   = 1000;
const RESPAWN_DELAY = 45;

const PLAYER_EXPLOSION_FRAMES = [explosion1Img, explosion2Img, explosion3Img, explosion4Img];
const ENEMY_EXPLOSION_FRAMES = [badexplode1Img,badexplode2Img,badexplode3Img,badexplode4Img,badexplode5Img];
const PLAYER_EXPLOSION_HOLD = 18;
const ENEMY_EXPLOSION_HOLD=8;
const PLAYER_EXPLOSION_TOTAL = PLAYER_EXPLOSION_FRAMES.length * PLAYER_EXPLOSION_HOLD;
const ENEMY_EXPLOSION_TOTAL = ENEMY_EXPLOSION_FRAMES.length * ENEMY_EXPLOSION_HOLD;
const ENEMY_EXPLOSION_SIZE = SHIP_SIZE * 2;

const BREAK_CHAIN_DELAY = 6;
const WIN_HOLD_FRAMES = 90;

function playSnd(src, vol = 0.5, trackerRef = null)
{
  const a = new Audio(src);
    a.volume = vol;
  a.play().catch(() => {});
  if(trackerRef) {
    trackerRef.current.push(a);
    a.addEventListener("ended", () => {
        trackerRef.current = trackerRef.current.filter(x => x !== a);
    });
  }
  return a;
}

function stopAllSfx(trackerRef) {
	trackerRef.current.forEach(a => { a.pause(); a.currentTime=0; });
  trackerRef.current = [];
}

export default function Galaga({ onNext }) {
  const canvasRef = useRef(null);
  const { addSessionCoins, commitSession, discardSession } = useCoins();
  const [jailBroken, setJailBroken] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [lives, setLives] = useState(3);
  const [restartKey, setRestartKey] = useState(0);
  const keysRef = useRef({});
  const stateRef = useRef(null);
  const imagesRef = useRef({});
  const musicRef = useRef(null);
  const deathMusicRef = useRef(null);
  const startBreakRef = useRef(null);
  const sfxRef = useRef([]);

  useEffect(() => {
    const sources = {
      jail: jailImg,
      jail1: jail1Img,
      jail2: jail2Img,
      player: playershipImg,
      galagawin: galagawinImg,
    };

    SHIP_TYPES.forEach((src, i) => { sources[`ship${i}`] = src; });
    SHIP_ALT_TYPES.forEach((src, i) => { sources[`ship${i}_alt`] = src; });
    PLAYER_EXPLOSION_FRAMES.forEach((src, i) => { sources[`pexplode${i}`] = src; });
    ENEMY_EXPLOSION_FRAMES.forEach((src, i) => { sources[`eexplode${i}`] = src; });

    const entries = Object.entries(sources);
    let loadedCount = 0;

    entries.forEach(([n, src]) => {
      const img = new Image();
      img.onload = () => {
        loadedCount++;
        if (loadedCount === entries.length) setImagesLoaded(true);
      };
      img.onerror = () => {
        console.error(`FAILED to load ${n} from ${src}`);
        loadedCount++;
        if (loadedCount === entries.length) setImagesLoaded(true);
      };
      img.src = src;
      imagesRef.current[n] = img;
    });
  }, []);

  useEffect(() => {
    const down = e => keysRef.current[e.key] = true;
    const up   = e => keysRef.current[e.key] = false;
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down); window.removeEventListener("keyup", up);
    };
  }, []);

  useEffect(() => {
    if (!imagesLoaded) return;
    const music = new Audio(gmusicSnd);
    music.loop = true;
    music.volume = 0.25;
    musicRef.current = music;
    const stopUnlock = ensureAudioPlays(music, () => musicRef.current === music);
    return () => {
      stopUnlock();
      music.pause();
      music.currentTime = 0;
      musicRef.current = null;
      if (deathMusicRef.current) {
        deathMusicRef.current.pause();
        deathMusicRef.current.currentTime = 0;
        deathMusicRef.current = null;
      }
      discardSession();
    };
  }, [imagesLoaded]);

  useEffect(() => {
    if (!imagesLoaded) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    const jailW = 120, jailH=90;
    const jailX = W / 2 - jailW / 2, jailY = 40;

    const formationTop = jailY + jailH + 30;
        const formationSpacingX = 40;
    const formationSpacingY=32;

    const st = {
      player: { x: W / 2 - 24, y: H - 66, w: 48, h: 48 },
      lives: 3,
      gameOver: false,
      bullets: [],
      enemies: [],
      jailShudder: 0,
      frame: 0,
      shootCooldown: 0,
      jailHits: 0,
      jailBroken: false,
      groupXOffset: 0,
      groupYOffset: 0,
      groupDir: 1,
      stars: Array.from({ length: 60 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: Math.random() * 2 + 0.5 })),
      paused: false,
      playerExploding: false,
      playerExplodeFrame: 0,
      playerExplodeX: 0,
      playerExplodeY: 0,
      deathPauseTimer: 0,

      jailBreaking: false,
      breakQueue: [],
      breakIndex: 0,
      breakTimer: 0,
      winHoldTimer: 0,
      advanceCalled: false,
    };
    stateRef.current = st;

    function buildFormationSlots()
    {
      const slots = [];
      const ROW_COUNTS = [8,8,12,12];

      for (let row = 0; row < ROW_COUNTS.length; row++) {
          const cols = ROW_COUNTS[row];
        const formationStartX = W / 2 - (cols - 1) * formationSpacingX / 2;

        for (let col = 0; col < cols; col++) {
          slots.push({
            row, col,
            homeX: formationStartX + col * formationSpacingX,
            homeY: formationTop + row * formationSpacingY,
          });
        }
      }
      return slots;
    }

    function spawnFormation() {
      const slots = buildFormationSlots();
      let slotIndex=0;
      slots.forEach(slot => {
          const fromLeft = Math.random() > 0.5;
          const delay = slotIndex * 8;
        st.enemies.push({
          id: Math.random(),
          shipType: slot.row,
          x: fromLeft ? -40 : W + 40,
          y: H + 40,
          entryFromLeft: fromLeft,
          phase: "waiting",
          delay,
          t: 0,
          homeX: slot.homeX,
          homeY: slot.homeY,
          canDive: slot.row < 2,
          deadTimer: 0,
          explodeFrame: 0,
        });
        slotIndex++;
      });
    }

    spawnFormation();

    function zipperEntry(e)
    {
      e.t += 1;
      if (e.phase === "waiting") {
        e.delay--;
        if (e.delay <= 0) e.phase = "flying";
        return;
      }

      const targetX = e.shipType>=2 ? e.homeX + st.groupXOffset : e.homeX;
      const targetY = e.shipType >= 2 ? e.homeY+st.groupYOffset : e.homeY;

      const dist = Math.hypot(targetX - e.x, targetY - e.y);
      if (dist < 6) {
        e.phase = "hold";
        e.x = targetX; e.y = targetY;
        return;
      }
      const midX = e.entryFromLeft ? W * 0.2 : W * 0.8;
      const prog = Math.min(e.t / 90, 1);
      const curveX = e.entryFromLeft
        ? -40 + (midX - -40) * Math.sin(prog * Math.PI / 2)
        : W + 40 - (W + 40 - midX) * Math.sin(prog * Math.PI / 2);
      const arcY = (H + 40) + (targetY - (H + 40)) * prog;
      const loop = Math.sin(prog * Math.PI * 2) * 40 * (1 - prog);
      e.x = prog < 1 ? curveX + loop : targetX;
      e.y = prog < 1 ? arcY : targetY;
      if (prog >= 1) { e.phase = "hold"; e.t = 0; }
    }

    function holdPath(e) {
      if (e.shipType >= 2)
      {
        e.x = e.homeX + st.groupXOffset;
        e.y = e.homeY + st.groupYOffset;
      } else {
        e.x=e.homeX;
          e.y = e.homeY;
      }
    }

    function drawShip(ctx, e) {
      if (e.phase === "dead") return;

      if (e.phase === "exploding") {
        const frameIdx = Math.min(Math.floor(e.explodeFrame / ENEMY_EXPLOSION_HOLD), ENEMY_EXPLOSION_FRAMES.length - 1);
        const img = imagesRef.current[`eexplode${frameIdx}`];
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, e.x - ENEMY_EXPLOSION_SIZE / 2, e.y - ENEMY_EXPLOSION_SIZE / 2, ENEMY_EXPLOSION_SIZE, ENEMY_EXPLOSION_SIZE);
        } else {
          ctx.fillStyle = "#ffaa33";
          ctx.beginPath();
          ctx.arc(e.x, e.y, ENEMY_EXPLOSION_SIZE / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        return;
      }

      const isAltFrame = Math.floor(st.frame / 20) % 2 === 1;
      const imgKey = isAltFrame ? `ship${e.shipType}_alt` : `ship${e.shipType}`;
      const img = imagesRef.current[imgKey];

      if (img && img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, e.x - SHIP_SIZE / 2, e.y - SHIP_SIZE / 2, SHIP_SIZE, SHIP_SIZE);
      } else {
        const s = 14;
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.fillStyle = isAltFrame ? "#ff33cc" : "#33ccff";
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.lineTo(-s * 0.8, s * 0.6);
        ctx.lineTo(0, s * 0.2);
        ctx.lineTo(s * 0.8, s * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }

    function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
      return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
    }

    function startJailBreakSequence() {
      st.jailBreaking=true;
      st.paused = true;
      commitSession();
      if (musicRef.current) {
        musicRef.current.pause(); musicRef.current = null;
      }
      const dm = playSnd(deathMusicSnd, 0.5);
      deathMusicRef.current = dm;

      st.breakQueue = st.enemies.filter(e => e.phase !== "dead" && e.phase !== "exploding");
      st.breakIndex=0;
      st.breakTimer = 0;
    }
    startBreakRef.current = startJailBreakSequence;

    let raf;
    function loop()
    {
      st.frame++;
      const k = keysRef.current;
      const p=st.player;

      if (st.playerExploding) {
        st.playerExplodeFrame++;
        if (st.playerExplodeFrame >= PLAYER_EXPLOSION_TOTAL) {
          st.playerExploding = false;
          st.lives--;
          setLives(st.lives);
          if (st.lives <= 0)
          {
            st.gameOver = true;
            st.paused = true;
            discardSession();
            if (musicRef.current) { musicRef.current.pause(); musicRef.current = null; }
            if (deathMusicRef.current) { deathMusicRef.current.pause(); deathMusicRef.current = null; }
            stopAllSfx(sfxRef);
          } else {
            st.deathPauseTimer = RESPAWN_DELAY;
          }
        }
      }

      if (st.deathPauseTimer > 0) {
        st.deathPauseTimer--;
        if (st.deathPauseTimer === 0) {
          p.x = W / 2 - 24; p.y = H - 66;
          if (!st.jailBreaking) st.paused = false;
        }
      }

      if (st.jailBreaking && !st.jailBroken) {
        st.enemies.forEach(e => {
          if (e.phase === "exploding") {
            e.explodeFrame++;
            if (e.explodeFrame >= ENEMY_EXPLOSION_TOTAL) {
              e.phase = "dead";
              e.x = -1000;
            }
          }
        });

        st.breakTimer--;
        if (st.breakTimer <= 0 && st.breakIndex < st.breakQueue.length) {
          const e = st.breakQueue[st.breakIndex];
          if (e.phase !== "dead") {
            e.phase = "exploding";
            e.explodeFrame = 0;
            playSnd(aliendeadSnd, 0.4, sfxRef);
          }
          st.breakIndex++;
          st.breakTimer = BREAK_CHAIN_DELAY;
        }

        const allDone = st.breakIndex >= st.breakQueue.length &&
          st.breakQueue.every(e => e.phase === "dead");

        if (allDone) {
          st.jailBroken = true;
          setJailBroken(true);
          const dm = deathMusicRef.current;
          let holdFrames = WIN_HOLD_FRAMES;
          if (dm && !isNaN(dm.duration)) {
            const remainingSeconds = Math.max(0, dm.duration - dm.currentTime);
            holdFrames = Math.max(WIN_HOLD_FRAMES, Math.ceil(remainingSeconds * 60) + 30);
          }
          st.winHoldTimer = holdFrames;
        }
      }

      if (st.jailBroken && st.winHoldTimer > 0) {
        st.winHoldTimer--;
        if (st.winHoldTimer === 0 && !st.advanceCalled) {
          st.advanceCalled = true;
          if (deathMusicRef.current) deathMusicRef.current.pause();
          if (onNext) onNext();
        }
      }

      if (!st.paused) {
        st.groupXOffset += st.groupDir * 0.5;
        if (st.groupXOffset > 160) {
          st.groupXOffset = 160;
          st.groupDir=-1;
          st.groupYOffset += 10;
        } else if (st.groupXOffset < -160) {
            st.groupXOffset = -160;
            st.groupDir = 1;
          st.groupYOffset += 10;
        }

        if (!st.gameOver)
        {
          if (k["ArrowLeft"] || k["a"]) p.x -= PLAYER_SPEED;
          if (k["ArrowRight"] || k["d"]) p.x += PLAYER_SPEED;
          p.x = Math.max(10, Math.min(W - p.w - 10, p.x));

          if (st.shootCooldown > 0) st.shootCooldown--;
          if ((k[" "] || k["z"]) && st.shootCooldown <= 0) {
            st.bullets.push({x: p.x + p.w / 2 - 2, y: p.y});
            st.shootCooldown = SHOOT_COOLDOWN;
            playSnd(gshootSnd, 0.35, sfxRef);
          }
        }

        st.bullets.forEach(b => b.y -= BULLET_SPEED);
        st.bullets = st.bullets.filter(b => b.y > -20);

        st.enemies.forEach(e => {
          if (e.phase === "waiting" || e.phase === "flying") {
            zipperEntry(e);
          }
          else if (e.phase === "hold") {
            holdPath(e);
            if (e.canDive && Math.random() < 0.002) {
              e.phase = "dive";
            }
          }
          else if (e.phase === "dive") {
            e.y += 2;
            if (e.y < p.y) e.x += (p.x - e.x) * 0.01;

            if (e.y > H + 40) {
              e.phase = "returning";
              e.x = e.homeX;
              e.y = -40;
            }
          }
          else if (e.phase === "returning") {
            const targetX = e.shipType >= 2 ? e.homeX + st.groupXOffset : e.homeX;
            const targetY = e.shipType >= 2 ? e.homeY + st.groupYOffset : e.homeY;

            const angle = Math.atan2(targetY - e.y, targetX - e.x);
            e.x += Math.cos(angle) * 3;
            e.y += Math.sin(angle) * 3;

            if (Math.hypot(targetX - e.x, targetY - e.y) < 5) {
              e.x = targetX;
              e.y = targetY;
              e.phase = "hold";
            }
          }
          else if (e.phase === "exploding") {
            e.explodeFrame++;
            if (e.explodeFrame >= ENEMY_EXPLOSION_TOTAL) {
              e.phase = "dead";
              e.deadTimer = e.shipType >= 2 ? RESPAWN_TIME_STEADY : RESPAWN_TIME_DIVE;
              e.x = -1000;
            }
          }
          else if (e.phase === "dead") {
            e.deadTimer--;
            if (e.deadTimer <= 0) {
              e.phase = "returning";
              e.x = Math.random() > 0.5 ? -40 : W + 40;
              e.y = -40;
            }
          }
        });

        if (!st.jailBroken && !st.jailBreaking) {
          for (let i = st.bullets.length - 1; i >= 0; i--) {
            const b = st.bullets[i];
            if (rectsOverlap(b.x, b.y, 4, 10, jailX, jailY, jailW, jailH)) {
              st.jailHits++;
              st.jailShudder = 12;
              st.bullets.splice(i, 1);
              playSnd(safehitSnd, 0.4, sfxRef);
              if (st.jailHits >= 50) {
                startJailBreakSequence();
              }
              continue;
            }
          }
        }

        for (let i = st.bullets.length - 1; i >= 0; i--) {
          const b = st.bullets[i];
          for (let j = st.enemies.length - 1; j >= 0; j--) {
            const e = st.enemies[j];
            if (e.phase !== "dead" && e.phase !== "exploding" && rectsOverlap(b.x, b.y, 4, 10, e.x - 14, e.y - 14, 28, 28)) {
              st.bullets.splice(i, 1);
              e.phase = "exploding";
              e.explodeFrame = 0;
              addSessionCoins(e.canDive ? 5 : 3);
              playSnd(aliendeadSnd, 0.4, sfxRef);
              break;
            }
          }
        }

        if (!st.gameOver && !st.playerExploding) {
          for (let j = st.enemies.length - 1; j >= 0; j--) {
            const e = st.enemies[j];
            if ((e.phase === "dive" || e.phase === "flying" || e.phase === "returning" || e.phase === "hold") && rectsOverlap(e.x - 14, e.y - 14, 28, 28, p.x, p.y, p.w, p.h)) {
              e.phase = "exploding";
              e.explodeFrame = 0;
              st.playerExploding = true;
              st.playerExplodeFrame = 0;
              st.playerExplodeX = p.x + p.w / 2;
              st.playerExplodeY = p.y + p.h / 2;
              st.paused = true;
              playSnd(shipdeadSnd, 0.5, sfxRef);
              break;
            }
          }
        }
      }

      ctx.fillStyle = "#000";
      ctx.fillRect(0,0,W,H);
      st.stars.forEach(s => {
        if (!st.paused)
        {
          s.y += s.s;
          if (s.y > H) s.y = 0;
        }
          ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.fillRect(s.x, s.y, 2, 2);
      });

      if (st.jailBroken) {
        const img = imagesRef.current["galagawin"];
        if (img && img.complete && img.naturalWidth > 0) {
          const scale = Math.min(jailW / img.naturalWidth, jailH / img.naturalHeight) * 2;
          const drawW = img.naturalWidth * scale;
          const drawH = img.naturalHeight * scale;
          const centerX = jailX + jailW / 2;
          const centerY = jailY + jailH / 2;
          const drawX = centerX - drawW / 2;
          const drawY = Math.max(10, centerY - drawH / 2);

          const haloPulse = 0.85 + Math.sin(st.frame * 0.06) * 0.15;
          const haloR = Math.max(drawW, drawH) * 0.55 * haloPulse;
          const grad = ctx.createRadialGradient(centerX, drawY + drawH / 2, 0, centerX, drawY + drawH / 2, haloR * 1.6);
          grad.addColorStop(0, "rgba(255,255,255,0.85)");
          grad.addColorStop(0.35, "rgba(255,225,120,0.55)");
          grad.addColorStop(0.7, "rgba(255,200,60,0.25)");
          grad.addColorStop(1, "rgba(255,200,60,0)");
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(centerX, drawY + drawH / 2, haloR * 1.6, 0, Math.PI * 2);
          ctx.fill();

          ctx.drawImage(img, drawX, drawY, drawW, drawH);
        }
      } else {
        let key = "jail";
        if (st.jailHits >= 30) key = "jail2";
        else if (st.jailHits >= 10) key = "jail1";
        const img = imagesRef.current[key];
        const shudderX = st.jailShudder > 0 ? (Math.random() - 0.5) * 6 : 0;
        const shudderY = st.jailShudder > 0 ? (Math.random() - 0.5) * 6 : 0;
        if (st.jailShudder > 0) st.jailShudder--;
        ctx.save();
        ctx.translate(shudderX, shudderY);
        if (img && img.complete && img.naturalWidth > 0) ctx.drawImage(img, jailX, jailY, jailW, jailH);
        ctx.restore();
      }

      st.enemies.forEach(e => drawShip(ctx, e));

      ctx.fillStyle="#ffcc00";
      st.bullets.forEach(b => ctx.fillRect(b.x, b.y, 4, 10));

      if (st.playerExploding) {
        const frameIdx = Math.min(Math.floor(st.playerExplodeFrame / PLAYER_EXPLOSION_HOLD), PLAYER_EXPLOSION_FRAMES.length - 1);
        const img = imagesRef.current[`pexplode${frameIdx}`];
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, st.playerExplodeX - p.w / 2, st.playerExplodeY - p.h / 2, p.w, p.h);
        } else {
          ctx.fillStyle = "#ffaa33";
          ctx.beginPath();
          ctx.arc(st.playerExplodeX, st.playerExplodeY, p.w / 2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (!st.gameOver && st.deathPauseTimer === 0) {
        const haloX = p.x + p.w / 2, haloY = p.y + p.h / 2;
        const haloR = p.w * 0.9;
        const haloPulse = 0.8 + Math.sin(st.frame * 0.08) * 0.2;
        const grad = ctx.createRadialGradient(haloX, haloY, 0, haloX, haloY, haloR * haloPulse);
        grad.addColorStop(0, "rgba(255,255,255,0.55)");
        grad.addColorStop(0.4, "rgba(120,255,150,0.35)");
        grad.addColorStop(1, "rgba(46,168,74,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(haloX, haloY, haloR * haloPulse, 0, Math.PI * 2);
        ctx.fill();

        const pImg = imagesRef.current["player"];
        if (pImg && pImg.complete && pImg.naturalWidth > 0) {
          ctx.drawImage(pImg, p.x, p.y, p.w, p.h);
        } else {
          ctx.save();
          ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
          ctx.fillStyle = "#44ff88";
          ctx.beginPath();
          ctx.moveTo(0, -p.h / 2);
          ctx.lineTo(-p.w / 2, p.h / 2);
          ctx.lineTo(0, p.h / 4);
          ctx.lineTo(p.w / 2, p.h / 2);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }

      raf = requestAnimationFrame(loop);
    }

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      stopAllSfx(sfxRef);
    };
  }, [imagesLoaded, restartKey]);

  const resetGame = () => {
    setLives(3);
    setJailBroken(false);
    if (deathMusicRef.current) { deathMusicRef.current.pause(); deathMusicRef.current = null; }
    if (musicRef.current)
    {
      musicRef.current.currentTime = 0;
      musicRef.current.play().catch(() => {});
    } else {
        const music = new Audio(gmusicSnd);
      music.loop=true;
      music.volume = 0.25;
      musicRef.current = music;
      ensureAudioPlays(music, () => musicRef.current === music);
    }
    setRestartKey(k => k + 1);
  };

  const handleDevHit = () => {
    if (!stateRef.current || stateRef.current.jailBroken || stateRef.current.jailBreaking || stateRef.current.gameOver) return;

    const st = stateRef.current;
    st.jailHits += 10;
    st.jailShudder=12;
    playSnd(safehitSnd, 0.4, sfxRef);
    if (st.jailHits >= 50 && !st.jailBreaking && !st.jailBroken)
    {
      startBreakRef.current?.();
    }
  };

  return (
    <AppShell>
      <div style={{ flex: 1, position: "relative", background: "#000" }}>

        <button
          onClick={handleDevHit}
          style={{
            position: "absolute", top: 16, left: 16, zIndex: 30,
            background: "rgba(0, 0, 0, 0.6)", color: "#ff00ff",
            border: "2px solid #ff00ff", borderRadius: 4,
            padding: "6px 12px", fontFamily: "monospace",
            fontSize: "12px", cursor: "pointer", fontWeight: "bold"
          }}
        >
          DEV: +10 HITS
        </button>

        {!imagesLoaded ? (
          <div style={{ color: "#fff", fontFamily: "monospace", padding: 20 }}>Loading Assets...</div>
        ) : (
          <canvas ref={canvasRef} style={{ width: "100%", height: "100%", imageRendering: "pixelated" }} />
        )}

        {imagesLoaded && lives <= 0 && (
          <div style={{ position: "absolute", inset: 0, zIndex: 200 }}>
            <Loseg onPlayAgain={resetGame} />
          </div>
        )}

        {imagesLoaded && (
          <div style={{position: "absolute", bottom: 12, right: 16, display: "flex", gap: 6, zIndex: 15}}>
            {Array.from({ length: Math.max(lives - 1, 0) }).map((_, i) => (
              <img key={i} src={playershipImg} alt="life" style={{ width: 24, height: 24, imageRendering: "pixelated" }} />
            ))}
          </div>
        )}

      </div>
    </AppShell>
  );
}
