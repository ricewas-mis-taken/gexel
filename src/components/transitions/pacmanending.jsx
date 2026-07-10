import React, { useState, useEffect, useRef } from "react";
import AppShell from "../AppShell";
import { GameCanvas } from "../MainGameScreen";

import ramPacmanImg from "../../assets/ram-pacman.png";
import ram1Img from "../../assets/sf2/ram1.png";
import ram2Img from "../../assets/sf2/ram2.png";
import ram3Img from "../../assets/sf2/ram3.png";
import ramFullImg from "../../assets/sf2/ramfull.png";

function ZoomCanvas({ onDone }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const W = canvas.width = window.innerWidth;
    const H = canvas.height = window.innerHeight;
    const ctx = canvas.getContext("2d");
    let frame = 0;
      const FRAMES = 140;
    const RINGS = 6;
    let raf;

    const draw = () => {
      const t = frame / FRAMES;
      const fadeOut = Math.max(0, (t - 0.75) / 0.25);
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);
      for (let i = RINGS; i >= 0; i--) {
        const ringT = i / RINGS;
        const closeness = Math.max(0, t - ringT * 0.55);
        const inset = closeness * Math.min(W, H) * 0.9;
        const x = inset, y = inset * (H / W), w = W - x * 2, h = H - y * 2;
        if (w > 2 && h > 2) {
          const isWhite = i % 2 === 0;
          const baseColor = isWhite ? 255 : 30;
          for (let g = 18; g >= 0; g--) {
            const alpha = (1 - g / 18) * 0.08 * (1 - fadeOut);
            const expand = g * 6;
            ctx.fillStyle = `rgba(${baseColor},${baseColor},${baseColor},${alpha})`;
            ctx.fillRect(x - expand, y - expand, w + expand * 2, h + expand * 2);
          }
          const brightness=Math.round(baseColor * (1 - fadeOut));
          ctx.fillStyle = `rgb(${brightness},${brightness},${brightness})`;
          ctx.fillRect(x, y, w, h);
          for (let g = 0; g < 10; g++) {
            const alpha = (1 - g / 10) * 0.15 * (1 - fadeOut);
            ctx.fillStyle = `rgba(0,0,0,${alpha})`;
            ctx.fillRect(x + g, y + g, w - g * 2, h - g * 2);
          }
        }
      }
      if (fadeOut > 0) {
        ctx.fillStyle = `rgba(0,0,0,${fadeOut})`;
        ctx.fillRect(0, 0, W, H);
      }
      frame++;
      if (frame <= FRAMES) raf = requestAnimationFrame(draw);
      else onDone();
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [onDone]);

  return <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", display: "block", zIndex: 9999 }} />;
}

const WIZARD_PIXELS = [
  "..........DDDDD.............",
  ".........DHHHHDD............",
  "........DHHSHHHHD...........",
  ".......DHHSSHHHHHD..........",
  "......DHHHHHHHHHHD..........",
  ".....DMMMMMMMMMMMMMD........",
    "....DMMMMMMMMMMMMMMMD.......",
  "....DMMMMMMMMMMMMMMMD.......",
  ".....DMMMFFFFMMMMMMD........",
  "......DFFFBBBFFFFD..........",
  ".......DFBBWWBBFD...........",
  "......DFFBWWWWBFFD..........",
  ".....DFFFBWBBWBFFFD.........",
  ".....DFFFBWWWWBFFFD.........",
  "......DFFBBBBBBFFD..........",
  "......DFWWWWWWWFD...........",
  ".....DFFWWWWWWWFFD..........",
  "....PPPPPPPPPPPPPPP.........",
  "...PPPPPPPPPPPPPPPPP........",
  "..PPPPPPPPPPPPPPPPPP........",
  "..PPPPBBBPPPPPPPPPP.........",
  "..PPPBBBBBPPPPPPPPP.........",
  "..PPPPBBBPPPPPPPPP..........",
  "..PPPPPPPPPPPPPPPP..........",
  "..PPPPPPPPPPPPPPPP..........",
  "...PPPPPPPPPPPPPPP..........",
  "....PPPPPPPPPPPPPP..........",
  ".....BBBBB..BBBBB...........",
  ".....BBBBB..BBBBB...........",
  ".....BBBBB..BBBBB...........",
];

const WIZARD_COLORS = {
  D: "#1a1a6e", H: "#2244aa", S: "#c8d8ff", M: "#5533aa",
  F: "#f0d8b0", B: "#3a2010", W: "#ffffff", P: "#7733cc", ".": null,
};

function PixelWizard({ scale = 6 }) {
  return (
    <div style={{ imageRendering: "pixelated", display: "inline-block" }}>
      {WIZARD_PIXELS.map((row, r) => (
        <div key={r} style={{ display: "flex", height: scale }}>
          {row.split("").map((ch, c) => (
            <div key={c} style={{ width: scale, height: scale, background: WIZARD_COLORS[ch] || "transparent", flexShrink: 0 }} />
          ))}
        </div>
      ))}
    </div>
  );
}

const STEPS = [
  {
    text: "Congrats! You have constructed your very own RAM stick! As you can see, there are four empty “holders”. As you complete the challenges, they will appear, one by one, only when all four are collected, only then may you use the full power of your RAM.",
    ramSrc: ramPacmanImg,
  },
  {
    text: "The Reactor Core, protected by the galactic butterflies of Galaga, once obtained, the core will provide the power needed to fire up the RAM.",
    ramSrc: ram1Img,
  },
  {
    text: "The Lily Flower, bestowed by the King Frog of Frogger; without it, your RAM stick will overheat. Its eternal blossom, lilypad, and water source cool your stick.",
    ramSrc: ram2Img,
  },
  {
    text: "If you speed your way past Kyran, you will obtain the Flame of Speed; this mystical ember has an internal temperature hotter than the sun. Your RAM stick will eject a blast so hot it will melt IT management.",
    ramSrc: ram3Img,
  },
  {
    text: "Last but not least, we have the Tetra. Gleaned from the Thousand-Year apple, the particles of the Tetra will hold your RAM stick (and you) together while the attack reaches its maximum.",
    ramSrc: ramFullImg,
  },
];

export default function PacmanEnding({ onNext }) {
  const [step, setStep] = useState(0);
  const [zooming, setZooming] = useState(false);
  const [showZoom,setShowZoom] = useState(false);

  const isLast = step === STEPS.length - 1;
  const currentRamSrc = STEPS[step].ramSrc;

  const handleNext = () => {
    if (!isLast) {
      setStep((s) => s + 1);
      return;
    }
    setZooming(true);
    setShowZoom(true);
  };

  const dimStyle = { filter: "grayscale(1) brightness(0.45)", transition: "filter 0.5s ease" };
  const liveStyle = { filter: "none", transition: "filter 0.5s ease" };

  return (
    <>
      <AppShell showCoins={false}>
        <style>{`
          @font-face { font-family: 'PokemonClassic'; src: url('/fonts/PokemonClassic.ttf') format('truetype'); }
          @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
          @keyframes zoomIntoScreen {
            0% { transform: scale(1); opacity: 1; }
            100% { transform: scale(1.6); opacity: 0; }
          }
        `}</style>
        <div
          style={{
            flex: 1,
            position: "relative",
            display: "flex",
            alignItems: "flex-end",
            overflow: "hidden",
            animation: zooming ? "zoomIntoScreen 0.65s ease forwards" : "none",
          }}
        >
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", ...dimStyle }}>
            <GameCanvas dimmed={true} />
          </div>


          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", ...liveStyle }}>
             <img
               src={currentRamSrc}
               alt="RAM progress"
               style={{
                 position: "absolute", top: 12, left: 12,
                 width: "616px", maxWidth: "60%", height: "auto",
                 imageRendering: "pixelated", zIndex: 6,
               }}
             />
          </div>


          <div style={{ position: "absolute", bottom: 30, left: 40, zIndex: 5, display: "flex", alignItems: "flex-end", animation: "float 3s ease-in-out infinite", pointerEvents: "none" }}>
            <PixelWizard scale={6} />
          </div>


          <div style={{
            position: "absolute", right: 24, top: "50%", transform: "translateY(-50%)",
            width: 380, zIndex: 10, background: "#0a1a0a", border: "4px solid #2ea84a",
            borderRadius: 4, boxShadow: "0 0 0 2px #000, 0 0 24px #2ea84a88",
            padding: "22px 24px 18px",
          }}>
            <div style={{
              position: "absolute", top: -26, left: 16,
              background: "#0a1a0a", border: "4px solid #2ea84a", borderBottom: "4px solid #0a1a0a",
              padding: "3px 14px", fontFamily: "'PokemonClassic', monospace",
              fontSize: 11, color: "#fff", letterSpacing: 1, borderRadius: "4px 4px 0 0",
            }}>Greg</div>

            <p style={{
              margin: "0 0 20px", fontFamily: "'PokemonClassic', monospace",
              fontSize: 11, color: "#fff", lineHeight: 2.2, letterSpacing: 0.5,
            }}>
              {STEPS[step].text}
            </p>

            <button onClick={handleNext} style={{
              float: "right", background: "transparent", border: "none",
              color: "#9933ff", fontSize: 13, fontFamily: "'PokemonClassic', monospace",
              cursor: "pointer", letterSpacing: 1, filter: "drop-shadow(0 0 6px #7733cc)",
            }}>{isLast ? "FINISH ▼" : "NEXT ▼"}</button>
          </div>
        </div>
      </AppShell>

      {showZoom && <ZoomCanvas onDone={onNext} />}
    </>
  );
}
