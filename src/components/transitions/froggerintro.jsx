import React, { useEffect, useRef, useState } from "react";
import AppShell from "../AppShell"; 


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

function PixelWizard({ scale = 6, style = {} }) {
  return (
    <div style={{ imageRendering: "pixelated", display: "inline-block", ...style }}>
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

export default function FroggerIntro({ onNext }) {
  const spotRef = useRef(null);
  const [phase,setPhase] = useState("intro");
    const [fadeBlack, setFadeBlack] = useState(0);

  useEffect(() => {
    const canvas = spotRef.current;
    canvas.width = 900;   canvas.height = 600;
    const ctx = canvas.getContext("2d");
    const cx=450, cy=200;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 220);
    grad.addColorStop(0, "rgba(160,100,255,0.45)");
    grad.addColorStop(0.3, "rgba(100,50,180,0.25)");
    grad.addColorStop(0.7, "rgba(30,10,60,0.15)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 900, 600);
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx - 160, 420); ctx.lineTo(cx + 160, 420); ctx.closePath();
    const coneGrad = ctx.createLinearGradient(cx, 0, cx, 420);
    coneGrad.addColorStop(0, "rgba(180,120,255,0.18)");
    coneGrad.addColorStop(1, "rgba(120,60,200,0.04)");
    ctx.fillStyle = coneGrad; ctx.fill();
  }, []);

  const handleNext = () => {
    let opacity = 0;
    const fade = setInterval(() => {
      opacity += 0.05;
      setFadeBlack(Math.min(opacity, 1));
      if (opacity >= 1) {
        clearInterval(fade);
        onNext(); 
      }
    }, 30);
  };

  const btnStyle = {
    background: "#000", border: "3px solid #2ea84a", borderRadius: 3,
    color: "#2ea84a", fontFamily: "'PokemonClassic', monospace",
    fontSize: 10, padding: "8px 20px", cursor: "pointer", letterSpacing: 1,
    boxShadow: "0 0 10px rgba(46, 168, 74, 0.2)",
  };


  const boxColor = "#2ea84a";
  const boxGlow = "#2ea84a66";

  return (
    <AppShell>
      <style>{`
        @font-face { font-family: 'PokemonClassic'; src: url('/fonts/PokemonClassic.ttf') format('truetype'); }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
      `}</style>

      <div style={{ flex: 1, background: "#000", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", paddingBottom: 120 }}>
        <canvas ref={spotRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />

  
        {fadeBlack > 0 && (
          <div style={{ position: "absolute", inset: 0, background: "#000", opacity: fadeBlack, zIndex: 99, pointerEvents: "none" }} />
        )}


        <div style={{
          display: "flex", alignItems: "center",
          animation: "float 3s ease-in-out infinite",
          position: "relative", zIndex: 2,
        }}>
          <PixelWizard scale={6} />
        </div>

        <div style={{
          position: "absolute", bottom: 18, left: 18, right: 18,
          background: "#111", border: `4px solid ${boxColor}`, borderRadius: 4,
          boxShadow: `0 0 0 2px #000, 0 0 20px ${boxGlow}`,
          padding: "18px 22px 22px", zIndex: 10, minHeight: 130,
          transition: "border-color 0.2s ease, box-shadow 0.2s ease",
        }}>

          <div style={{
            position: "absolute", top: -26, left: 16,
            background: "#111", border: `4px solid ${boxColor}`, borderBottom: "4px solid #111",
            padding: "3px 14px", fontFamily: "'PokemonClassic', monospace",
            fontSize: 11, color: "#fff", letterSpacing: 1, borderRadius: "4px 4px 0 0",
            transition: "border-color 0.2s ease",
          }}>Greg</div>

          {phase === "intro" ? (
            <>
              <p style={{ margin: "0 0 20px", fontFamily: "'PokemonClassic', monospace", fontSize: 14, color: "#fff", lineHeight: 1.9, letterSpacing: 0.5, textAlign: "justify" }}>
                The "Tactical Frog Squad" (I know, amazing name right?) has been captured by IT and locked into HDMI sockets! Help the frogs navigate through the parts production line and then through the river matrix to reach their home.
              </p>
              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                <button onClick={() => setPhase("history")} style={{ ...btnStyle, color: "#e9d5ff", borderColor: "#a855f7", boxShadow: "0 0 12px rgba(168,85,247,0.9), 0 0 24px rgba(168,85,247,0.5)" }}>
                  HEAR HISTORY
                </button>
                <button onClick={handleNext} style={btnStyle}>
                  NEXT ▼
                </button>
              </div>
            </>
          ) : (
            <>
              <p style={{ margin: "0 0 20px", fontFamily: "'PokemonClassic', monospace", fontSize: 14, color: "#fff", lineHeight: 1.9, letterSpacing: 0.4, textAlign: "justify" }}>
                Frogger was released in 1981 by Konami and became one of the most recognizable arcade games of its era. The game challenged players to guide a frog across busy roads and rivers while avoiding obstacles, creating a simple but highly replayable gameplay style. The predecessor of Frogger is Crossy Road, a game famed for its easy-to-learn style and endless fun.
              </p>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button onClick={handleNext} style={btnStyle}>
                  NEXT ▼
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
