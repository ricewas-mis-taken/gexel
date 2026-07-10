import { useEffect, useRef, useState } from "react";
import AppShell from "../AppShell";
import { PixelWizard } from "../OrientationScreen";
import { fadeOutAudio } from "../audioFade";
import { BlockLetter } from "../IntroScreen";

const endCreditMusic = import.meta.glob("../../assets/endcredit.*", { eager: true, import: "default" });
const END_CREDIT_SRC = Object.values(endCreditMusic)[0] || null;

const WIZARD_TEXT = "This is thanks from all of GEXEL, thank you for saving our world! Feel free to come back and play anytime. Hope you had fun!";

const CREDIT_LINES = [
  "Version 1.0 made for 2026 Radish Jam",
  "",
  "Created by Lucas Tang",
  "",
  "Ideas and gameplay from Pac-Man | Galaga | Frogger",
  "Speed-Race | Sega Turbo | Tetris | Street Fighter 2",
  "",
  "Various SFX from pixabay.com",
  "",
  "Check out:",
  "Piskel → Sprite editor",
  "remove-bg.io → best one out there",
  "picsart.com/ai-image-enhancer → free, great speed & quality",
  "folge.me/tools/image-pixelator → just amazing",
  "",
  "All sprites are hand-drawn or ripped from (probably) legal distribution sites",
  "",
  "Thank you for playing:",
  "",
  "GEXEL",
];

const SCROLL_DURATION_S = 32;
const FADE_MS = 2500;

export default function BossEnding({ onDone }) {
  const [stage,setStage] = useState("wizard");
    const [creditsDone, setCreditsDone] = useState(false);
  const audioRef = useRef(null);
  const spotRef=useRef(null);

  useEffect(() => {
    if (stage !== "wizard") return;
    const canvas = spotRef.current;
    if(!canvas) return;
        canvas.width = 900; canvas.height = 600;
    const ctx = canvas.getContext("2d");
    const cx = 450,   cy = 200;
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
  }, [stage]);

  useEffect(() => {
    if (stage !== "credits") return;
    if (END_CREDIT_SRC) {
      audioRef.current = new Audio(END_CREDIT_SRC);
      audioRef.current.play().catch(() => {});
    }
    return () => { audioRef.current?.pause(); };
  }, [stage]);

  const handleScrollEnd = () => {
    if (audioRef.current) fadeOutAudio(audioRef.current, FADE_MS);
    setCreditsDone(true);
    setTimeout(() => { setStage("black"); onDone && onDone(); }, FADE_MS);
  };

  return (
    <AppShell showCoins={false}>
      <style>{`
        @font-face { font-family: 'PokemonClassic'; src: url('/fonts/PokemonClassic.ttf') format('truetype'); }
        @keyframes creditsScroll {
          from { transform: translateY(0); }
          to { transform: translateY(-2400px); }
        }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
      `}</style>
      <div style={{
        flex: 1, position: "relative", background: "#000", overflow: "hidden",
            display: "flex", alignItems: "center", justifyContent: "center", paddingBottom: 120,
      }}>
        {stage==="wizard" && (
          <>
            <canvas ref={spotRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />

            <div style={{
              display: "flex", alignItems: "center",
              animation: "float 3s ease-in-out infinite",
              position: "relative", zIndex: 2,
            }}>
              <PixelWizard scale={6} />
            </div>

            <div style={{
              position: "absolute", bottom: 18, left: 18, right: 18,
              background: "#111", border: "4px solid #2ea84a", borderRadius: 4,
              boxShadow: "0 0 0 2px #000, 0 0 20px #2ea84a66",
              padding: "16px 20px 20px", zIndex: 60, minHeight: 100,
            }}>
              <div style={{
                position: "absolute", top: -26, left: 16,
                background: "#111", border: "4px solid #2ea84a", borderBottom: "4px solid #111",
                padding: "3px 14px", fontFamily: "'PokemonClassic', monospace",
                fontSize: 11, color: "#fff", letterSpacing: 1, borderRadius: "4px 4px 0 0",
              }}>Greg</div>

              <p style={{ margin: 0, fontFamily: "'PokemonClassic', monospace", fontSize: 11, color: "#fff", lineHeight: 2, letterSpacing: 0.5 }}>
                {WIZARD_TEXT}
              </p>

              <button onClick={() => setStage("credits")} style={{
                position: "absolute", bottom: 10, right: 14,
                background: "transparent", border: "none", color: "#9933ff", fontSize: 14, cursor: "pointer",
                fontFamily: "'PokemonClassic', monospace", letterSpacing: 1,
              }}>NEXT ▼</button>
            </div>
          </>
        )}

        {stage === "credits" && (
          <div style={{
            position: "absolute", inset: 0,
            opacity: creditsDone ? 0 : 1,
            transition: `opacity ${FADE_MS}ms ease`,
          }}>
            <div
              style={{ position: "absolute", inset: 0, animation: `creditsScroll ${SCROLL_DURATION_S}s linear forwards` }}
              onAnimationEnd={handleScrollEnd}
            >
              <div style={{
                position: "absolute", top: "100%", left: 0, right: 0,
                display: "flex", flexDirection: "column", alignItems: "center",
                paddingTop: 40,
              }}>
                {CREDIT_LINES.map((line, i) => (
                  line === "GEXEL" ? (
                    <div key={i} style={{ display: "flex", alignItems: "center", margin: "10px 0" }}>
                      {line.split("").map((letter, li) => (
                        <BlockLetter key={li} letter={letter} settled glitchChar={letter} />
                      ))}
                    </div>
                  ) : (
                    <div key={i} style={{
                      fontFamily: "'PokemonClassic', monospace",
                      fontSize: 13,
                      color: "#fff",
                      letterSpacing: 1,
                      textShadow: "0 0 10px #ffffff88",
                      margin: "10px 0",
                      minHeight: line === "" ? 14 : undefined,
                      textAlign: "center",
                    }}>
                      {line}
                    </div>
                  )
                ))}
              </div>
            </div>
          </div>
        )}

        {stage === "black" && (
          <div style={{ position: "absolute", inset: 0, background: "#000" }} />
        )}
      </div>
    </AppShell>
  );
}
