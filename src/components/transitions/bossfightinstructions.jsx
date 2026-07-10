import React, { useState } from "react";
import AppShell from "../AppShell";

import wasdImg from "../../assets/sf2/wasd.png";
import arrowKeysImg from "../../assets/pacman/arrowkeys.png";

const WASD_CROPS = {
  W: { x: 375, y: 172, w: 285, h: 318 },
  A: { x: 30, y: 535, w: 285, h: 315 },
  S: { x: 375, y: 535, w: 285, h: 315 },
  D: { x: 705, y: 535, w: 285, h: 315 },
};
const WASD_COLORS = { W: "#ff4444", A: "#44dd66", S: "#ffcc33", D: "#4499ff" };

function KeyTile( { label, size = 34 } ) {
  const crop = WASD_CROPS[label];
    const scale = size / crop.w;
  const imgSize=1024*scale;
  return (
    <div style={{
      width: size, height: crop.h * scale, position: "relative",
      overflow: "hidden", imageRendering: "pixelated",
    }}>
      <img src={wasdImg} alt={label} style={{
        position: "absolute", left: -crop.x * scale, top: -crop.y * scale,
        width: imgSize, height: imgSize, maxWidth: "none", imageRendering: "pixelated",
      }} />
      <div style={{
        position: "absolute", inset: 0, background: WASD_COLORS[label],
        mixBlendMode: "color", opacity: 0.9, pointerEvents: "none",
      }} />
    </div>
  );
}

export default function BossfightInstructions({ onNext }) {
  const [fadeBlack,setFadeBlack] = useState(0);

  const handleNext = () => {
    let opacity=0;
    const fade = setInterval(() => {
        opacity += 0.05;
      setFadeBlack(Math.min(opacity, 1));
      if(opacity >= 1) {
        clearInterval(fade);
        onNext();
      }
    }, 30);
  }

  return (
    <AppShell>
      <style>{`
        @font-face { font-family: 'PokemonClassic'; src: url('/fonts/PokemonClassic.ttf') format('truetype'); }
        .text { font-family: 'PokemonClassic', monospace; color: #fff; font-size: 16px; letter-spacing: 0.5px; line-height: 1.7; }
      `}</style>

      <div style={{
        flex: 1, background: "#000", padding: "20px",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "14px"
      }}>
        {fadeBlack > 0 && <div style={{ position: "fixed", inset: 0, background: "#000", opacity: fadeBlack, zIndex: 99 }} />}

        <h1 className="text" style={{ fontSize: "18px", color: "#a855f7", borderBottom: "2px solid #a855f7", margin: 0, paddingBottom: 6 }}>INSTRUCTIONS</h1>

        <div style={{ textAlign: "center" }}>
          <p className="text" style={{ margin: "0 0 8px" }}>Use WASD to move.</p>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <KeyTile label="W" />
            <div style={{ display: "flex", gap: 4 }}>
              <KeyTile label="A" />
              <KeyTile label="S" />
              <KeyTile label="D" />
            </div>
          </div>
        </div>

        <div style={{ textAlign: "center" }}>
          <p className="text" style={{ margin: "0 0 8px" }}>Up arrow to kick, right arrow to punch, down arrow to block.</p>
          <img src={arrowKeysImg} alt="Arrows" style={{ width: 90, imageRendering: "pixelated" }} />
        </div>

        <button
          onClick={handleNext}
          style={{
            marginTop: "6px", background: "#000", border: "3px solid #a855f7",
            color: "#e9d5ff", padding: "8px 26px", fontFamily: "'PokemonClassic', monospace",
            cursor: "pointer", fontSize: "12px"
          }}
        >
          START GAME ▼
        </button>
      </div>
    </AppShell>
  );
}
