import React, { useState } from "react";
import AppShell from "../AppShell";

import arrowKeysImg from "../../assets/pacman/arrowkeys.png";

export default function FroggerInstructions({ onNext }) {
  const [fadeBlack, setFadeBlack]=useState(0);

  const handleNext = () => {
    let opacity=0;
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
        .text { font-family: 'PokemonClassic', monospace; color: #fff; font-size: 16px; letter-spacing: 0.5px; line-height: 1.7; }
      `}</style>

      <div style={{
        flex: 1, background: "#000", padding: "10px 40px",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "14px",
        overflow: "hidden", minHeight: 0, height: "100%"
      }}>
        {fadeBlack > 0 && <div style={{ position: "fixed", inset: 0, background: "#000", opacity: fadeBlack, zIndex: 99 }} />}

        <h1 className="text" style={{ fontSize: "18px", color: "#2ea84a", borderBottom: "2px solid #2ea84a", paddingBottom: 3 }}>INSTRUCTIONS</h1>

        <div style={{ textAlign: "center", maxWidth: "460px" }}>
          <p className="text" style={{ fontSize: "14px" }}>Use the arrow keys to hop forward, backward, left, and right through traffic and across the river's logs. Only the big lily pad counts as home — miss it and you'll fall in the water!</p>
          <img src={arrowKeysImg} alt="Arrows" style={{ width: 80, marginTop: 10, imageRendering: "pixelated" }} />
        </div>

        <button
          onClick={handleNext}
          style={{
            marginTop: "2px", background: "#000", border: "3px solid #9933ff",
            color: "#9933ff", padding: "8px 26px", fontFamily: "'PokemonClassic', monospace",
            cursor: "pointer", fontSize: "12px", flexShrink: 0
          }}
        >
          START GAME ▼
        </button>
      </div>
    </AppShell>
  );
}
