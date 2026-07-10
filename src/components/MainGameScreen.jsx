import React, { useEffect, useRef } from "react";
import AppShell from "./AppShell";
import ITPopup from "./ITPopup";
import { useCoins, GAME_ORDER } from "./CoinContext";

const IT_NAG_MESSAGES = [
  "Still no progress logged on your end. Get back to work.",
  "This is the second time I'm flagging this. Zero output. Explain.",
  "Frankly, I don't believe you're doing anything up there. Fix this.",
  "I'm done asking nicely. Your numbers are an embarrassment.",
  "Stop lying, I'm coming...",
];

import castleImg from "../assets/castle.png";
import darkcloudsImg from "../assets/darkclouds.png";
import heroImg from "../assets/hero.png";
import riverImg from "../assets/river.png";
import rockImg from "../assets/rock.png";
import tree1Img from "../assets/tree1.png";
import tree2Img from "../assets/tree2.png";
import tree3Img from "../assets/tree3.png";

import galagaImg from "../assets/galagalogo.png";
import froggerImg from "../assets/froggerlogo.png";
import raceCarImg from "../assets/race-caricon.png";
import pacmanImg from "../assets/pac-manlogo.png";
import tetrisImg from "../assets/tetrislogo.png";

import ramEmptyImg from "../assets/sf2/ramempty.png";
import ramPacmanImg from "../assets/ram-pacman.png";
import ram1Img from "../assets/sf2/ram1.png";
import ram2Img from "../assets/sf2/ram2.png";
import ram3Img from "../assets/sf2/ram3.png";
import ramFullImg from "../assets/sf2/ramfull.png";

import mainScreenSound from "../assets/mainscreensound.mp3";
import { fadeOutAudio } from "./audioFade";
import { ensureAudioPlays } from "./audioUnlock";

export const CASTLE_X = 650;
export const CASTLE_Y = 0;
export const CASTLE_W = 310 * 1.25;
export const CASTLE_H = 250 * 1.25;

export const CLOUDS_X = 660;
export const CLOUDS_Y = 0;
export const CLOUDS_W = 300;
export const CLOUDS_H = 110;
export const CLOUDS_ALPHA = 0.5;

const RAM_STAGE_IMAGES = {
  empty: ramEmptyImg,
  pacman: ramPacmanImg,
  1: ram1Img,
  2: ram2Img,
  3: ram3Img,
  full: ramFullImg,
};

const RAM_STAGE_AFTER = {
  pacman: "pacman",
  galaga: "1",
  frogger: "2",
  roadgame: "3",
  tetris: "full",
};

function getRamState(progress)
{
  let stage="empty";
  for (const g of GAME_ORDER) {
      if (progress[g]) stage = RAM_STAGE_AFTER[g];
  }
  return stage;
}

export function GameCanvas({ dimmed = false, progress = {} }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const W = 900, H = 530;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");

    ctx.imageSmoothingEnabled = false;

    const load = (src) => new Promise((res) => {
      const img = new Image();
      img.src = src;
      img.onload = () => res(img);
      img.onerror = () => res(null);
    });

    (async () => {
      const [
        castle, darkclouds, hero, river, rock, tree1, tree2, tree3,
        galaga, frogger, raceCar, pacman, tetris
      ] = await Promise.all([
        load(castleImg), load(darkcloudsImg), load(heroImg),
        load(riverImg), load(rockImg), load(tree1Img), load(tree2Img), load(tree3Img),
        load(galagaImg), load(froggerImg), load(raceCarImg), load(pacmanImg), load(tetrisImg)
      ]);

      const skyColors = ["#4eaef5", "#6cbdf7", "#8bcbf9", "#a9daf2", "#c8e8ff"];
      const bandH = Math.ceil(H * 0.42 / skyColors.length);
      skyColors.forEach((c, i) => {
        ctx.fillStyle = c;
        ctx.fillRect(0, i * bandH, W, bandH + 1);
      });

      ctx.fillStyle = "#ffffff";
      [[60,35], [190,55], [310,25], [460,45], [580,20], [710,60], [850,30], [240,15]].forEach(([x, y]) => {
        ctx.fillRect(x, y, 2, 2);
      });

      if (darkclouds) {
        const cloudLayers = [
          { x: CLOUDS_X - 90, y: CLOUDS_Y - 5,  w: CLOUDS_W * 0.65, h: CLOUDS_H * 0.65, a: CLOUDS_ALPHA * 0.6 },
          { x: CLOUDS_X - 20, y: CLOUDS_Y - 20, w: CLOUDS_W * 0.8,  h: CLOUDS_H * 0.8,  a: CLOUDS_ALPHA * 0.75 },
          { x: CLOUDS_X,      y: CLOUDS_Y,      w: CLOUDS_W,        h: CLOUDS_H,        a: CLOUDS_ALPHA },
          { x: CLOUDS_X + 150, y: CLOUDS_Y + 10, w: CLOUDS_W * 0.7, h: CLOUDS_H * 0.7,  a: CLOUDS_ALPHA * 0.65 },
          { x: CLOUDS_X + 60, y: CLOUDS_Y - 30, w: CLOUDS_W * 0.55, h: CLOUDS_H * 0.55, a: CLOUDS_ALPHA * 0.5 },
        ];
        ctx.save();
        cloudLayers.forEach(({ x, y, w, h, a }) => {
          ctx.globalAlpha = a;
          ctx.drawImage(darkclouds, x, y, w, h);
        });
        ctx.restore();
      }

      if (castle) {
        ctx.save();
        ctx.filter = "brightness(0.85) contrast(1.15) saturate(0.85)";
        ctx.drawImage(castle, CASTLE_X, CASTLE_Y, CASTLE_W, CASTLE_H);
        ctx.restore();
      }

      const grassColors = ["#32b846", "#3ec953", "#4cd962", "#3ec953"];
      const groundY = Math.floor(H * 0.40);
      const grassH = H - groundY;
      const grassBand = Math.ceil(grassH / grassColors.length);
      grassColors.forEach((c, i) => {
        ctx.fillStyle = c;
        ctx.fillRect(0, groundY + i * grassBand, W, grassBand + 1);
      });

      const speckles = ["#269637", "#5ce673", "#7bf090"];
      for (let i = 0; i < 350; i++) {
        const x = Math.abs(Math.sin(i * 3851)) * W;
        const y = groundY + Math.abs(Math.cos(i * 6821)) * grassH;
        ctx.fillStyle = speckles[i % speckles.length];
        ctx.fillRect(Math.floor(x / 4) * 4, Math.floor(y / 4) * 4, 4, 4);
      }

      if (river) {
        ctx.drawImage(river, 220, 320, 340, 160);
      }

      const pathPoints = [
        [30, 430], [140, 445], [260, 420], [360, 365], [470, 375],
        [570, 395], [670, 345], [750, 275], [810, 240]
      ];

      ctx.strokeStyle = "#8d6e63"; ctx.lineWidth = 26; ctx.lineJoin = "round"; ctx.lineCap = "square";
      ctx.beginPath(); pathPoints.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)); ctx.stroke();

      ctx.strokeStyle = "#e5c185"; ctx.lineWidth = 20; ctx.lineJoin = "round"; ctx.lineCap = "square";
      ctx.beginPath(); pathPoints.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)); ctx.stroke();

      ctx.setLineDash([8, 12]); ctx.strokeStyle = "#cfa153"; ctx.lineWidth = 4;
      ctx.beginPath(); pathPoints.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)); ctx.stroke();
      ctx.setLineDash([]);

      if (tree1 && tree2 && tree3) {
        const treeTypes = [tree1, tree2, tree3];
        const randomTrees = [
          { x: 25,  y: 225, t: 1, w: 48, h: 64 }, { x: 85,  y: 260, t: 2, w: 52, h: 68 },
          { x: 150, y: 215, t: 0, w: 44, h: 60 }, { x: 190, y: 470, t: 1, w: 50, h: 66 },
          { x: 280, y: 230, t: 2, w: 46, h: 62 }, { x: 410, y: 250, t: 0, w: 48, h: 64 },
          { x: 490, y: 220, t: 1, w: 52, h: 68 }, { x: 535, y: 450, t: 2, w: 46, h: 62 },
          { x: 580, y: 235, t: 0, w: 44, h: 60 }, { x: 620, y: 465, t: 1, w: 54, h: 70 },
          { x: 685, y: 240, t: 2, w: 48, h: 64 }, { x: 730, y: 440, t: 0, w: 50, h: 66 },
          { x: 850, y: 270, t: 1, w: 52, h: 68 }
        ];
        randomTrees.forEach(tr => ctx.drawImage(treeTypes[tr.t], tr.x, tr.y, tr.w, tr.h));
      }

      if (rock) {
        const randomRocks = [
          [10, 350, 36, 24], [65, 485, 42, 28], [135, 385, 30, 20], [210, 325, 34, 24],
          [310, 480, 36, 24], [495, 320, 38, 26], [565, 445, 32, 22], [785, 480, 40, 28],
          [870, 370, 32, 22]
        ];
        randomRocks.forEach(([rx, ry, rw, rh]) => ctx.drawImage(rock, rx, ry, rw, rh));
      }

      const nodes = [
        { x: 135, y: 445, key: "pacman",   color: "#ffdd00", border: "#ffa500", icon: pacman },
        { x: 285, y: 405, key: "galaga",   color: "#00ccff", border: "#0088cc", icon: galaga },
        { x: 440, y: 370, key: "frogger",  color: "#2ecc71", border: "#1a8a4a", icon: frogger },
        { x: 595, y: 390, key: "roadgame", color: "#ff4444", border: "#cc0000", icon: raceCar },
        { x: 705, y: 310, key: "tetris",   color: "#9933ff", border: "#6600cc", icon: tetris },
      ];

      nodes.forEach(({ x, y, key, color, border, icon }) => {
        const done = !!progress[key];
        const boxColor = done ? "#666" : color;
        const boxBorder = done ? "#333" : border;
        const R = 26;
        ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(x - R + 3, y - R + 3, R * 2, R * 2);
        ctx.fillStyle = "#070712"; ctx.fillRect(x - R, y - R, R * 2, R * 2);
        ctx.strokeStyle = boxBorder; ctx.lineWidth = 3; ctx.strokeRect(x - R, y - R, R * 2, R * 2);
        ctx.strokeStyle = boxColor; ctx.lineWidth = 1; ctx.strokeRect(x - R + 3, y - R + 3, (R - 3) * 2, (R - 3) * 2);

        if (icon) {
          const iconSize = 40;
          ctx.save();
          if (done) { ctx.filter = "grayscale(1) brightness(0.5)"; ctx.globalAlpha = 0.6; }
          ctx.drawImage(icon, x - (iconSize / 2), y - (iconSize / 2), iconSize, iconSize);
          ctx.restore();
        }
      });

      if (hero) {
        ctx.drawImage(hero, 45, 395, 32, 32);
      }
    })();
  }, [progress]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute", inset: 0, width: "100%", height: "100%",
        imageRendering: "pixelated",
        filter: dimmed ? "grayscale(1) brightness(0.45)" : "none",
      }}
    />
  );
}

export function RamBar({ ramState = "empty", style = {} }) {
  const src = RAM_STAGE_IMAGES[ramState] || ramEmptyImg;
  return (
    <img
      src={src}
      alt="RAM progress"
      style={{
        position: "absolute",
        top: 12,
        left: 12,
        width: `${CASTLE_X - 24}px`,
        maxWidth: "60%",
        height: "auto",
        imageRendering: "pixelated",
        zIndex: 6,
        ...style,
      }}
    />
  );
}

export default function MainGameScreen({ onNext })
{
  const { progress } = useCoins();
  const ramState  =  getRamState(progress);
  const nextGame = GAME_ORDER.find(g=>!progress[g]) || null;
  const btnBase = { fontFamily: "'PokemonClassic', monospace", letterSpacing: 2, cursor: "pointer" };

  const completedCount = GAME_ORDER.filter( g => progress[g] ).length;
  const nagMessage = completedCount > 0 ? IT_NAG_MESSAGES[Math.min(completedCount, IT_NAG_MESSAGES.length) - 1] : null;

  useEffect(() => {
    const audio = new Audio(mainScreenSound);
    audio.loop = true;
    const stopUnlock = ensureAudioPlays(audio);
    return () => {
      stopUnlock();
      fadeOutAudio(audio);
    };
  }, []);

  return (
    <AppShell>
      <style>{`@font-face { font-family: 'PokemonClassic'; src: url('/fonts/PokemonClassic.ttf') format('truetype'); }`}</style>
      {nagMessage && <ITPopup message={nagMessage} />}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <GameCanvas dimmed={false} progress={progress} />

        <RamBar ramState={ramState} />

        <div style={{ position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)", zIndex: 10 }}>
          <button
            onClick={() => onNext(nextGame)}
            style={{
              ...btnBase, background: "#051405", border: "4px solid #2ea84a", color: "#2ea84a",
              fontSize: 15, padding: "14px 50px", borderRadius: 0,
              boxShadow: "0 0 15px rgba(46, 168, 74, 0.35)", textTransform: "uppercase",
              opacity: 1,
            }}
          >
            {nextGame ? "START!" : "Final Fight!"}
          </button>
        </div>
      </div>
    </AppShell>
  );
}