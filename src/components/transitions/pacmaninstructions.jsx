import React, { useState } from "react";
import AppShell from "../AppShell";
import arrowKeysImg from "../../assets/pacman/arrowkeys.png";
import dotEatingImg from "../../assets/pacman/doteating.png";
import blueGhostImg from "../../assets/pacman/blueghost.png";

export default function PacmanInstructions({ onNext }) {
  const [fadeBlack,setFadeBlack] = useState(0);

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

  return (
    <AppShell>
      <style>{`
        @font-face { font-family: 'PokemonClassic'; src: url('/fonts/PokemonClassic.ttf') format('truetype'); }
        .text { font-family: 'PokemonClassic', monospace; color: #fff; font-size: 16px; letter-spacing: 0.5px; line-height: 1.7; }
      `}</style>

      <div style={{
        flex: 1, background: "#000", padding: "40px",
        display: "flex", flexDirection: "column", alignItems: "center", gap: "30px"
      }}>
        {fadeBlack > 0 && <div style={{ position: "fixed", inset: 0, background: "#000", opacity: fadeBlack, zIndex: 99 }} />}

        <h1 className="text" style={{ fontSize: "20px", color: "#2ea84a", borderBottom: "2px solid #2ea84a" }}>INSTRUCTIONS</h1>

        <div style={{ textAlign: "center" }}>
          <p className="text">Use the arrow keys to move and eat dots for RAM-coins.</p>

          <img src={arrowKeysImg} alt="Arrows" style={{ width: 120, marginTop: 10, imageRendering: "pixelated" }} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <img src={dotEatingImg} alt="Dot" style={{ width: 60, imageRendering: "pixelated" }} />
          <img src={blueGhostImg} alt="Ghost" style={{ width: 60, imageRendering: "pixelated" }} />
        </div>

        <div style={{ textAlign: "center", marginTop: 10 }}>
          <p className="text" style={{ color: "#ff4444" }}>Avoid the ghosts, or eat a power-up pellet to turn the tables!</p>
        </div>

        <button
          onClick={handleNext}
          style={{
            marginTop: "20px", background: "#000", border: "3px solid #9933ff",
            color: "#9933ff", padding: "10px 30px", fontFamily: "'PokemonClassic', monospace",
            cursor: "pointer", fontSize: "12px"
          }}
        >
          START GAME ▼
        </button>
      </div>
    </AppShell>
  );
}
