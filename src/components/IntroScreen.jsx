import { useEffect, useRef, useState } from "react";
import AppShell from "./AppShell";
import gexelIntroSnd from "../assets/gexelintro.mp3";
import { playSafely } from "../lib/audio";

const WORD = "GEXEL";
const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&";
const PIXEL_FONT = {
  G: ["111","100","101","101","111"],
  E: ["111","100","110","100","111"],
  X: ["101","101","010","101","101"],
  L: ["100","100","100","100","111"],
};

export function BlockLetter({ letter, settled, glitchChar }) {
  const grid = PIXEL_FONT[letter] || PIXEL_FONT["E"];
  const displayGrid = settled ? grid : (PIXEL_FONT[glitchChar] || PIXEL_FONT["E"]);
  const S = 14;
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", gap: 3, margin: "0 8px" }}>
      {displayGrid.map((row, r) => (
        <div key={r} style={{ display: "flex", gap: 3 }}>
          {row.split("").map((px, c) => (
            <div key={c} style={{
              width: S, height: S,
              background: px === "1" ? (settled ? "#2ea84a" : `hsl(${120 + Math.random() * 40}, 80%, 50%)`) : "transparent",
              boxShadow: px === "1" && settled ? "0 0 6px #2ea84a" : px === "1" ? "0 0 4px #44ff44" : "none",
            }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function IntroScreen({ onStart })
{
  const canvasRef  = useRef(null);
  const [letterStates, setLetterStates] = useState(
    WORD.split("").map(() => ({ settled: false, glitchChar: "E" }))
  );
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const W = canvas.width = 900;
    const H = canvas.height = 600;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle="#1e1e1e";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#2a2a2a";
    ctx.fillRect(0,0,W,24);
    ctx.fillRect(0, 0, 40, H);
      ctx.strokeStyle = "#333";
    ctx.lineWidth = 1;
    for (let x = 40; x < W; x += 80) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 24; y < H; y += 22) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.fillStyle = "#aaa";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    "ABCDEFGHIJKLMNOPQR".split("").forEach((l, i) => ctx.fillText(l, 40 + i * 80 + 40, 16));
    for (let i = 1; i <= 30; i++) ctx.fillText(i, 20, 24 + (i - 1) * 22 + 15);
    ctx.fillStyle = "rgba(0,0,0,0.82)";
    ctx.fillRect(0, 0, W, H);
  }, []);

  useEffect(() => {
    const audio = new Audio(gexelIntroSnd);
    playSafely(audio);
  }, []);

  useEffect(() => {
    const intervals = [];
      const settleTimeouts = [];

    WORD.split("").forEach((letter,i) => {
      const start=i * 150;

      const glitchInterval = setInterval(() => {
        const rc = Object.keys(PIXEL_FONT)[Math.floor(Math.random() * Object.keys(PIXEL_FONT).length)];
        setLetterStates(prev => prev.map((s, idx) => idx === i ? { ...s, glitchChar: rc } : s));
      }, 80);
      intervals.push(glitchInterval);

      const settleT = setTimeout(() => {
        clearInterval(glitchInterval);
        setLetterStates(prev => prev.map((s, idx) => idx === i ? { settled: true, glitchChar: letter } : s));
      }, start + 1200);
      settleTimeouts.push(settleT);
    });

    const btnT = setTimeout(() => setShowButton(true), WORD.length * 150 + 1600);

    return () => {
      intervals.forEach(clearInterval);
      settleTimeouts.forEach(clearTimeout);
      clearTimeout(btnT);
    };
  }, []);

  return (
    <AppShell>
      <div style={{ flex: 1, position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", imageRendering: "pixelated" }} />
        <div style={{ zIndex: 3, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ color: "#aaa", fontFamily: "monospace", fontSize: 13, letterSpacing: 4 }}>Welcome to</div>
          <div style={{ display: "flex", alignItems: "center" }}>
            {WORD.split("").map((letter, i) => (
              <BlockLetter key={i} letter={letter} settled={letterStates[i].settled} glitchChar={letterStates[i].glitchChar} />
            ))}
          </div>
          <div style={{ opacity: showButton ? 1 : 0, transform: showButton ? "translateY(0)" : "translateY(10px)", transition: "opacity 0.4s, transform 0.4s", marginTop: 24 }}>
            <button onClick={onStart} style={{ background: "#2ea84a", color: "white", border: "2px solid #1a5c37", borderRadius: 4, padding: "10px 40px", fontSize: 15, fontFamily: "monospace", fontWeight: "bold", letterSpacing: 3, cursor: "pointer", boxShadow: "0 0 20px #2ea84a55" }}>
              START
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}