import { useState } from "react";
import AppShell from "../AppShell";
import arrowKeysImg from "../../assets/pacman/arrowkeys.png";
import apple1Img from "../../assets/tetris/apple1.png";
import apple8Img from "../../assets/tetris/apple8.png";

export default function TetrisInstructions({ onNext }) {
  const [fadeBlack, setFadeBlack] = useState(0);

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
        .text { font-family: 'PokemonClassic', monospace; color: #fff; font-size: 16px; letter-spacing: 0.5px; line-height: 1.5; margin: 0; }
      `}</style>

      <div style={{
        flex: 1, background: "#000", padding: "10px 40px",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px",
        overflow: "hidden", minHeight: 0
      }}>
        {fadeBlack > 0 && <div style={{ position: "fixed", inset: 0, background: "#000", opacity: fadeBlack, zIndex: 99 }} />}

        <h1 className="text" style={{ fontSize: "18px", color: "#2ea84a", borderBottom: "2px solid #2ea84a", paddingBottom: 3 }}>INSTRUCTIONS</h1>

        <div style={{ textAlign: "center" }}>
          <p className="text" style={{ fontSize: "14px" }}>Left/Right to move, Up to rotate, Down to soft drop, Space to hard drop.</p>
          <img src={arrowKeysImg} alt="Arrows" style={{ width: 70, marginTop: 6, imageRendering: "pixelated" }} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, textAlign: "center" }}>
          <img src={apple1Img} alt="Apple, untouched" style={{ width: 36, imageRendering: "pixelated" }} />
          <p className="text" style={{ color: "#ffaa00" }}>▶</p>
          <img src={apple8Img} alt="Apple, devoured" style={{ width: 36, imageRendering: "pixelated" }} />
        </div>

        <div style={{ textAlign: "center", maxWidth: 460 }}>
          <p className="text" style={{ color: "#ffaa00", fontSize: "14px" }}>Complete rows to feed snakes that bite into the Thousand-Year apple.</p>
          <p className="text" style={{ color: "#ff4444", marginTop: 4, fontSize: "14px" }}>Play too slowly, or let the stack reach the top, and it's game over.</p>
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
