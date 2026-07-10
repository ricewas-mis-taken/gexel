import { useEffect, useRef, useState } from "react";
import AppShell from "../AppShell";
import ZoomCanvas from "../ZoomCanvas";
import kingfrogImg from "../../assets/frogger/kingfrog.png";
import frogriverImg from "../../assets/frogger/frogriver.png";
import froggerwinImg from "../../assets/sf2/froggerwin.png";
import deathMusicSrc from "../../assets/galaga/deathmusic.mp3";

const KING_TEXT =
  "With your help, all of my frogs from the TFS (Tactical Frog Squad), hopped back home safely. This Lily Flower is the least I can give you for your help.";

export default function FroggerEnd({ onNext }) {
  const [stage,setStage] = useState("dialogue");
  const audioRef = useRef(null);

  useEffect(() => {
    if(stage !== "kingFading") return;
    const t = setTimeout(() => setStage("artifact"), 700);
        return () => clearTimeout(t);
  }, [stage]);

  const MUSIC_STOP_MS = 3500;

  useEffect(() => {
    if (stage !== "artifact") return;
    const audio = new Audio(deathMusicSrc);
        audio.volume = 0.8;
    audioRef.current=audio;
    audio.play().catch(() => {});

    const stopTO = setTimeout(() => {
      audio.pause();
      setStage("zooming");
    }, MUSIC_STOP_MS);

    return () => {
      clearTimeout(stopTO);
      audio.pause();
    };
  }, [stage]);

  return (
    <>
      <AppShell showCoins={false}>
        <style>{`
          @font-face { font-family: 'PokemonClassic'; src: url('/fonts/PokemonClassic.ttf') format('truetype'); }
          @keyframes froggerAuraPulse {
            0%, 100% { opacity: 0.65; transform: scale(0.95); }
            50%      { opacity: 1;    transform: scale(1.08); }
          }
          @keyframes froggerArtifactIn {
            0%   { opacity: 0; transform: translate(-50%, -50%) translateY(14px) scale(0.85); }
            100% { opacity: 1; transform: translate(-50%, -50%) translateY(0) scale(1); }
          }
        `}</style>

        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          <img
            src={frogriverImg}
            alt=""
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", imageRendering: "pixelated" }}
          />

          {stage !== "artifact" && stage !== "zooming" && (
            <img
              src={kingfrogImg}
              alt="King Frog"
              style={{
                position: "absolute", top: "49%", left: "45%", transform: "translate(-50%, -50%)",
                height: 230, imageRendering: "pixelated",
                opacity: stage === "kingFading" ? 0 : 1,
                transition: "opacity 700ms ease-out",
                filter: "drop-shadow(0 8px 12px rgba(0,0,0,0.5))",
              }}
            />
          )}

          {(stage === "artifact" || stage === "zooming") && (
            <div style={{
              position: "absolute", top: "49%", left: "45%", transform: "translate(-50%, -50%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              animation: "froggerArtifactIn 600ms ease-out",
            }}>
              <div style={{
                position: "absolute", width: 360, height: 360, borderRadius: "50%",
                background: "radial-gradient(circle, rgba(140,220,255,0.55), rgba(80,180,255,0.2) 55%, transparent 75%)",
                animation: "froggerAuraPulse 1.8s ease-in-out infinite",
              }} />
              <img
                src={froggerwinImg}
                alt="Lily Flower artifact"
                style={{ position: "relative", height: 240, imageRendering: "pixelated", filter: "drop-shadow(0 0 18px rgba(120,200,255,0.85))" }}
              />
            </div>
          )}

          {stage === "dialogue" && (
            <div style={{
              position: "absolute", bottom: 18, left: 18, right: 18,
              background: "#111", border: "4px solid #2ea84a", borderRadius: 4,
              boxShadow: "0 0 0 2px #000, 0 0 20px #2ea84a66",
              padding: "18px 22px 22px", zIndex: 10, minHeight: 130,
            }}>
              <div style={{
                position: "absolute", top: -26, left: 16,
                background: "#111", border: "4px solid #2ea84a", borderBottom: "4px solid #111",
                padding: "3px 14px", fontFamily: "'PokemonClassic', monospace",
                fontSize: 11, color: "#fff", letterSpacing: 1, borderRadius: "4px 4px 0 0",
              }}>King Frog</div>

              <p style={{ margin: "0 0 20px", fontFamily: "'PokemonClassic', monospace", fontSize: 14, color: "#fff", lineHeight: 1.9, letterSpacing: 0.5, textAlign: "justify" }}>
                {KING_TEXT}
              </p>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button onClick={() => setStage("kingFading")} style={{
                  background: "#000", border: "3px solid #2ea84a", borderRadius: 3,
                  color: "#2ea84a", fontFamily: "'PokemonClassic', monospace",
                  fontSize: 10, padding: "8px 20px", cursor: "pointer", letterSpacing: 1,
                  boxShadow: "0 0 10px rgba(46, 168, 74, 0.2)",
                }}>
                  NEXT ▼
                </button>
              </div>
            </div>
          )}
        </div>
      </AppShell>

      {stage === "zooming" && <ZoomCanvas onDone={onNext} />}
    </>
  );
}
