import React, { useEffect, useRef, useState } from "react";
import AppShell from "../AppShell";
import { useCoins } from "../CoinContext";

function itText(playerName) {
  const name = playerName || "Cubicle-dweller";
  return `If it isn’t “${name}” from Collections! I’m surprised you made it so far! Well, no matter—I shall come down from myself and stop you. Too bad my form is a little bit glitched, but you still don’t stand a chance. I’m surprised you’ve made it so far, but it was all for nothing; there is only one weapon that can defeat me, and it is nearly impossible to construct…`;
}

export default function BossfightIntro({ onNext }) {
  const {playerName} = useCoins();
  const spotRef = useRef(null);
    const [fadeBlack, setFadeBlack] = useState(0);

  useEffect(() => {
    const canvas = spotRef.current;
    canvas.width = 900;    canvas.height = 600;
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
    background: "#000", border: "3px solid #a855f7", borderRadius: 3,
    color: "#e9d5ff", fontFamily: "'PokemonClassic', monospace",
    fontSize: 10, padding: "8px 20px", cursor: "pointer", letterSpacing: 1,
    boxShadow: "0 0 10px rgba(168,85,247,0.5)",
  };

  const boxColor = "#a855f7";
  const boxGlow = "#a855f766";

  return (
    <AppShell>
      <style>{`
        @font-face { font-family: 'PokemonClassic'; src: url('/fonts/PokemonClassic.ttf') format('truetype'); }
        @keyframes purpleFlicker {
          0%, 19%, 21%, 23%, 54%, 56%, 100% { opacity: 1; }
          20%, 55% { opacity: 0.45; }
          22% { opacity: 0.75; }
          35% { opacity: 0.85; }
        }
      `}</style>

      <div style={{ flex: 1, background: "#000", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <canvas ref={spotRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", animation: "purpleFlicker 3.2s infinite" }} />

   
        {fadeBlack > 0 && (
          <div style={{ position: "absolute", inset: 0, background: "#000", opacity: fadeBlack, zIndex: 99, pointerEvents: "none" }} />
        )}

       
        <div style={{
          position: "absolute", bottom: 8, left: 18, right: 18,
          background: "#111", border: `4px solid ${boxColor}`, borderRadius: 4,
          boxShadow: `0 0 0 2px #000, 0 0 20px ${boxGlow}`,
          padding: "12px 20px 14px", zIndex: 10, minHeight: 90,
        }}>

          <div style={{
            position: "absolute", top: -26, left: 16,
            background: "#111", border: `4px solid ${boxColor}`, borderBottom: "4px solid #111",
            padding: "3px 14px", fontFamily: "'PokemonClassic', monospace",
            fontSize: 11, color: "#fff", letterSpacing: 1, borderRadius: "4px 4px 0 0",
          }}>IT</div>

          <p style={{ margin: "0 0 12px", fontFamily: "'PokemonClassic', monospace", fontSize: 12, color: "#fff", lineHeight: 1.6, letterSpacing: 0.4, textAlign: "justify" }}>
            {itText(playerName)}
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={handleNext} style={btnStyle}>
              NEXT ▼
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
