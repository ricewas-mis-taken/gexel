import { useState } from "react";
import AppShell from "../AppShell";
import coinraceImg from "../../assets/speedrace/coinrace.png";
import arrowKeysImg from "../../assets/pacman/arrowkeys.png";

export default function SpeedraceInstructions({ onNext }) {
  const [fadeBlack, setFadeBlack] = useState(0);

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
        @font-face { font-family: 'PokemonClassic'; src: url('/fonts/PokemonClassic.ttf') format('truetype'); }
        .text { font-family: 'PokemonClassic', monospace; color: #fff; font-size: 16px; letter-spacing: 0.5px; line-height: 1.7; }
      `}</style>

      <div style={{
        flex: 1, background: "#000", padding: "30px 40px",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "22px", height: "100%"
      }}>
        {fadeBlack > 0 && <div style={{ position: "fixed", inset: 0, background: "#000", opacity: fadeBlack, zIndex: 99 }} />}

        <h1 className="text" style={{ fontSize: "20px", color: "#2ea84a", borderBottom: "2px solid #2ea84a", paddingBottom: "10px" }}>INSTRUCTIONS</h1>

        <div style={{ display: "flex", flexDirection: "row", alignItems: "flex-start", justifyContent: "center", gap: "36px" }}>
          <div style={{ textAlign: "center", maxWidth: "230px" }}>
            <p className="text">Use the Left/Right arrow keys or A/D to steer and dodge traffic.</p>
            <img src={arrowKeysImg} alt="Arrows" style={{ width: 110, marginTop: 16, imageRendering: "pixelated" }} />
          </div>

          <div style={{ textAlign: "center", maxWidth: "230px" }}>
            <img src={coinraceImg} alt="Medallion" style={{ width: 96, imageRendering: "pixelated" }} />
            <p className="text" style={{ color: "#ffd700", marginTop: 8 }}>Collect 5 medallions before Kyran's clock runs out at 30 seconds.</p>
          </div>
        </div>

        <button
          onClick={handleNext}
          style={{
              marginTop: "6px", background: "#000", border: "3px solid #9933ff",
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
