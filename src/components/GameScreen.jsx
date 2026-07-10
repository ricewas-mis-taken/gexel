import { useEffect, useRef, useState } from "react";
import AppShell from "./AppShell";
import { useCoins } from "./CoinContext";

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

function RamWithHands({ width = 30, height = 190, style = {} })
{
  const canvasRef = useRef(null);
    const totalWidth=width + 24;

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = totalWidth;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    const offX = 12;
    ctx.imageSmoothingEnabled = true;

    const pcbGrad = ctx.createLinearGradient(offX, 0, offX + width, 0);
    pcbGrad.addColorStop(0, "#0a2e0a"); pcbGrad.addColorStop(0.3, "#1a5c1a");
    pcbGrad.addColorStop(0.5, "#22731a"); pcbGrad.addColorStop(0.7, "#1a5c1a");
    pcbGrad.addColorStop(1, "#0a2e0a");
    ctx.fillStyle = pcbGrad;
    ctx.fillRect(offX + 3, 18, width - 6, height - 44);
    ctx.strokeStyle = "#2ea82e"; ctx.lineWidth = 0.5;
    ctx.strokeRect(offX + 3, 18, width - 6, height - 44);

    const goldGrad = ctx.createLinearGradient(0, height - 26, 0, height);
    goldGrad.addColorStop(0, "#b8860b"); goldGrad.addColorStop(0.3, "#ffd700");
    goldGrad.addColorStop(0.6, "#daa520"); goldGrad.addColorStop(1, "#8b6914");
    ctx.fillStyle = goldGrad;
    ctx.fillRect(offX + 3, height - 26, width - 6, 22);
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = "#8b6914";
      ctx.fillRect(offX + 5 + i * ((width - 10) / 7), height - 26, 2, 22);
    }
    ctx.fillStyle = "rgba(255,255,200,0.3)";
    ctx.fillRect(offX + 3, height - 26, 3, 22);
    ctx.fillStyle = "#000";
    ctx.fillRect(offX + width / 2 - 2, height - 26, 4, 7);

    [24, 52, 80, 108].forEach(y => {
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(offX + 5, y + 2, width - 10, 22);
      const chipGrad = ctx.createLinearGradient(offX + 4, y, offX + width - 4, y + 20);
      chipGrad.addColorStop(0, "#1a1a1a"); chipGrad.addColorStop(0.4, "#2d2d2d"); chipGrad.addColorStop(1, "#111");
      ctx.fillStyle = chipGrad;
      ctx.fillRect(offX + 4, y, width - 8, 20);
      ctx.strokeStyle = "#555"; ctx.lineWidth = 0.5;
      ctx.strokeRect(offX + 4, y, width - 8, 20);
      ctx.fillStyle = "#666";
      for (let r = 0; r < 2; r++)
        for (let c = 0; c < 3; c++)
          ctx.fillRect(offX + 8 + c * 5, y + 5 + r * 8, 2, 2);
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.fillRect(offX + 4, y, width - 8, 4);
      ctx.fillStyle = "#999";
      ctx.beginPath(); ctx.arc(offX + 8, y + 4, 1.5, 0, Math.PI * 2); ctx.fill();
    });

    ctx.strokeStyle = "rgba(180,140,0,0.4)"; ctx.lineWidth = 0.5;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.moveTo(offX + 4 + i * 3, 136); ctx.lineTo(offX + 4 + i * 3, height - 26); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(offX + width - 5 - i * 3, 136); ctx.lineTo(offX + width - 5 - i * 3, height - 26); ctx.stroke();
    }
    ctx.strokeStyle = "rgba(180,140,0,0.2)";
    [22, 50, 78, 106, 134].forEach(y => {
      ctx.beginPath(); ctx.moveTo(offX + 3, y); ctx.lineTo(offX + width - 3, y); ctx.stroke();
    });

    ctx.fillStyle = "#000";
    ctx.fillRect(offX + width / 2 - 2, 16, 4, 5);
    ctx.beginPath(); ctx.arc(offX + width / 2, 19, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(offX + 7, 24, 2.5, 0, Math.PI * 2); ctx.fill();

    const handY = Math.floor(height * 0.42);
    const PX = 4, FC = "#7733cc", FD = "#55228a";
    const lx = offX;
    ctx.fillStyle = FC;
    [[lx-PX,handY],[lx-PX,handY+PX],[lx-PX,handY+PX*2],[lx-PX*2,handY],[lx-PX*2,handY+PX*2]].forEach(([x,y])=>ctx.fillRect(x,y,PX-1,PX-1));
    ctx.fillStyle = FD;
    ctx.fillRect(lx-PX*2,handY+PX,PX-1,PX-1); ctx.fillRect(lx,handY+PX*3,PX-1,PX-1);
    const rx = offX + width;
    ctx.fillStyle = FC;
    [[rx,handY],[rx,handY+PX],[rx,handY+PX*2],[rx+PX,handY],[rx+PX,handY+PX*2]].forEach(([x,y])=>ctx.fillRect(x,y,PX-1,PX-1));
    ctx.fillStyle = FD;
    ctx.fillRect(rx+PX,handY+PX,PX-1,PX-1); ctx.fillRect(rx-PX,handY+PX*3,PX-1,PX-1);
  }, []);

  return <canvas ref={canvasRef} style={{ width: totalWidth, height, display: "block", imageRendering: "auto", ...style }} />;
}

export default function GameScreen({ onNext })
{
  const { setPlayerName } = useCoins();
  const spotRef  =  useRef(null);
  const [phase, setPhase] = useState("dialogue1");
  const [name, setName] = useState("");
  const [inputVal, setInputVal] = useState("");
  const [wizardX, setWizardX] = useState(0);
  const [fadeBlack, setFadeBlack] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    const canvas = spotRef.current;
    canvas.width = 900; canvas.height = 600;
    const ctx = canvas.getContext("2d");
    const cx = 450, cy = 200;
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

  useEffect(() => {
    if (phase === "askName" && inputRef.current) inputRef.current.focus();
  }, [phase]);

  const handleConfirmName = () => {
      const confirmed = inputVal.trim() || "Stranger";
    setName(confirmed);
	setPlayerName(confirmed);
    setPhase("confirmName");
  };

  const handleGoodbye = () => {
    setPhase("goodbye");
    let x = 0;
    const walk = setInterval(() => {
      x += 8;
      setWizardX(x);
      if (x >= 1000) {
        clearInterval(walk);
        let opacity = 0;
        const fade = setInterval(() => {
          opacity += 0.02;
          setFadeBlack(Math.min(opacity, 1));
          if (opacity >= 1) {
            clearInterval(fade);
            onNext(); 
          }
        }, 30);
      }
    }, 16);
  };

  const dialogueBox = (content) => (
    <div style={{
      position: "absolute", bottom: 18, left: 18, right: 18,
      background: "#111", border: "4px solid #2ea84a", borderRadius: 4,
      boxShadow: "0 0 0 2px #000, 0 0 20px #2ea84a66",
      padding: "16px 20px 20px", zIndex: 10, minHeight: 100,
    }}>
      <div style={{
        position: "absolute", top: -26, left: 16,
        background: "#111", border: "4px solid #2ea84a", borderBottom: "4px solid #111",
        padding: "3px 14px", fontFamily: "'PokemonClassic', monospace",
        fontSize: 11, color: "#fff", letterSpacing: 1, borderRadius: "4px 4px 0 0",
      }}>Greg</div>
      {content}
    </div>
  );

  const nextBtn = (onClick) => (
    <button onClick={onClick} style={{
      position: "absolute", bottom: 10, right: 14,
      background: "transparent", border: "none",
      color: "#9933ff", fontSize: 14, cursor: "pointer",
      fontFamily: "'PokemonClassic', monospace", letterSpacing: 1,
      filter: "drop-shadow(0 0 6px #7733cc)", display: "flex", alignItems: "center", gap: 6,
    }}>NEXT ▼</button>
  );

  return (
    <AppShell>
      <style>{`
        @font-face { font-family: 'PokemonClassic'; src: url('/fonts/PokemonClassic.ttf') format('truetype'); }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        .poke-input {
          background: #000; border: 3px solid #2ea84a; border-radius: 3px;
          color: #fff; font-family: 'PokemonClassic', monospace; font-size: 11px;
          padding: 10px 14px; outline: none; width: 100%; box-sizing: border-box;
          letter-spacing: 1px; caret-color: #9933ff;
        }
        .poke-input:focus { box-shadow: 0 0 0 2px #7733cc; }
      `}</style>

      <div style={{ flex: 1, background: "#000", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", paddingBottom: 120 }}>
        <canvas ref={spotRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />

        {fadeBlack > 0 && (
          <div style={{ position: "absolute", inset: 0, background: "#000", opacity: fadeBlack, zIndex: 99, pointerEvents: "none" }} />
        )}

        <div style={{
          display: "flex", alignItems: "center",
          animation: phase === "goodbye" ? "none" : "float 3s ease-in-out infinite",
          position: "relative", zIndex: 2,
          transform: `translateX(${wizardX}px)`,
          transition: phase === "goodbye" ? "none" : undefined,
        }}>
          <PixelWizard scale={6} />
          <div style={{ marginLeft: -14, marginTop: 20 }}>
            <RamWithHands width={30} height={190} />
          </div>
        </div>

        {phase === "dialogue1" && dialogueBox(<>
          <p style={{ margin: 0, fontFamily: "'PokemonClassic', monospace", fontSize: 11, color: "#fff", lineHeight: 2.2, letterSpacing: 0.5 }}>
            Welcome to Gexel: your <span style={{ fontFamily: "'Times New Roman', serif", fontStyle: "italic" }}>OLD</span> escape from large corporate cubicle control. I'm Greg from Life Support...
          </p>
          {nextBtn(() => setPhase("dialogue2"))}
        </>)}

        {phase === "dialogue2" && dialogueBox(<>
          <p style={{ margin: 0, fontFamily: "'PokemonClassic', monospace", fontSize: 11, color: "#fff", lineHeight: 2.2, letterSpacing: 0.5 }}>
            Looking for an escape from the boredom of the workspace? Well hit next!
          </p>
          {nextBtn(() => setPhase("askName"))}
        </>)}

        {phase === "askName" && dialogueBox(
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <p style={{ margin: 0, fontFamily: "'PokemonClassic', monospace", fontSize: 11, color: "#fff", lineHeight: 2.2, letterSpacing: 0.5, flex: 1 }}>
              So what is your name?
            </p>
            <div style={{ flex: 1 }}>
              <input
                ref={inputRef}
                className="poke-input"
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && inputVal.trim()) handleConfirmName(); }}
                maxLength={16}
                placeholder="..."
              />
              <button onClick={() => inputVal.trim() && handleConfirmName()} style={{
                marginTop: 10, width: "100%", background: "#000", border: "3px solid #2ea84a",
                borderRadius: 3, color: "#2ea84a", fontFamily: "'PokemonClassic', monospace",
                fontSize: 10, padding: "8px 0", cursor: "pointer", letterSpacing: 1,
              }}>CONFIRM</button>
            </div>
          </div>
        )}

        {phase === "confirmName" && dialogueBox(<>
          <p style={{ margin: 0, fontFamily: "'PokemonClassic', monospace", fontSize: 11, color: "#fff", lineHeight: 2.2, letterSpacing: 0.5 }}>
            <span style={{ color: "#9933ff" }}>{name}</span>... Is that right?
          </p>
          <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
            <button onClick={() => setPhase("prophecy1")} style={{
              background: "#000", border: "3px solid #2ea84a", borderRadius: 3,
              color: "#2ea84a", fontFamily: "'PokemonClassic', monospace",
              fontSize: 10, padding: "8px 20px", cursor: "pointer", letterSpacing: 1,
            }}>YES</button>
            <button onClick={() => { setInputVal(""); setPhase("askName"); }} style={{
              background: "#000", border: "3px solid #555", borderRadius: 3,
              color: "#aaa", fontFamily: "'PokemonClassic', monospace",
              fontSize: 10, padding: "8px 20px", cursor: "pointer", letterSpacing: 1,
            }}>NO</button>
          </div>
        </>)}

        {phase === "prophecy1" && dialogueBox(<>
          <p style={{ margin: 0, fontFamily: "'PokemonClassic', monospace", fontSize: 11, color: "#fff", lineHeight: 2.2, letterSpacing: 0.5 }}>
            It... can't be! If you really are <span style={{ color: "#9933ff" }}>{name}</span>, then you are the prophesied one who will defeat the evil IT management!
          </p>
          {nextBtn(() => setPhase("prophecy2"))}
        </>)}

        {phase === "prophecy2" && dialogueBox(<>
          <p style={{ margin: 0, fontFamily: "'PokemonClassic', monospace", fontSize: 11, color: "#fff", lineHeight: 2.2, letterSpacing: 0.5 }}>
            Back in the old days, typing "gexel" would take you to a mystical land where you could play all the greatest arcade hits. But now, evil IT has begun trying to take over our game! It is up to you to construct the mystical RAM stick and defeat him. Now, follow me to orientation!
          </p>
          {nextBtn(handleGoodbye)}
        </>)}

      </div>
    </AppShell>
  );
}