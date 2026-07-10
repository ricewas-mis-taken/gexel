import { useEffect, useRef, useState } from "react";
import AppShell from "../AppShell";
import ZoomCanvas from "../ZoomCanvas";
import kyranImg from "../../assets/speedrace/kyran.png";
import roadgamewinImg from "../../assets/sf2/roadgamewin.png";
import deathMusicSrc from "../../assets/galaga/deathmusic.mp3";

const KYRAN_TEXT =
  "Wow! I haven't seen such beautiful, maniacal driving since the pre-traffic-era. I'm cheering for you! Kick that IT guy in the a**.";

export default function RoadgameEnd({ onNext }) {
  const [stage, setStage] = useState("dialogue");
  const audioRef = useRef(null);

  useEffect(() => {
    if (stage !== "kyranFading") return;
    const t = setTimeout(() => setStage("artifact"), 700);
    return () => clearTimeout(t);
  }, [stage]);

  const MUSIC_STOP_MS = 3500;

  useEffect(() => {
    if (stage !== "artifact") return;
      const audio = new Audio(deathMusicSrc);
    audio.volume=0.8;
    audioRef.current = audio;
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
          @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
          @keyframes roadgameAuraPulse {
            0%, 100% { opacity: 0.65; transform: scale(0.95); }
            50%      { opacity: 1;    transform: scale(1.08); }
          }
          @keyframes roadgameArtifactIn {
            0%   { opacity: 0; transform: translateY(14px) scale(0.85); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>

        <div style={{ flex: 1, background: "#000", position: "relative", overflow: "hidden" }}>
          {stage !== "artifact" && stage !== "zooming" && (
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, bottom: 170,
              display: "flex", alignItems: "center", justifyContent: "center",
              animation: "float 3s ease-in-out infinite",
            }}>
              <img
                src={kyranImg}
                alt="Kyran"
                style={{
                  width: 180, imageRendering: "pixelated",
                  opacity: stage === "kyranFading" ? 0 : 1,
                  transition: "opacity 700ms ease-out",
                }}
              />
            </div>
          )}

          {(stage === "artifact" || stage === "zooming") && (
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, bottom: 170,
              display: "flex", alignItems: "center", justifyContent: "center",
              animation: "roadgameArtifactIn 600ms ease-out",
            }}>
              <div style={{
                position: "absolute", width: 360, height: 360, borderRadius: "50%",
                background: "radial-gradient(circle, rgba(255,160,90,0.55), rgba(255,90,40,0.2) 55%, transparent 75%)",
                animation: "roadgameAuraPulse 1.8s ease-in-out infinite",
              }} />
              <img
                src={roadgamewinImg}
                alt="Flame of Speed artifact"
                style={{ position: "relative", height: 240, imageRendering: "pixelated", filter: "drop-shadow(0 0 18px rgba(255,140,60,0.85))" }}
              />
            </div>
          )}

          {stage === "dialogue" && (
            <div style={{
              position: "absolute", bottom: 18, left: 18, right: 18,
              background: "#111", border: "4px solid #ff4444", borderRadius: 4,
              boxShadow: "0 0 0 2px #000, 0 0 20px #ff444466",
              padding: "18px 22px 22px", zIndex: 10, minHeight: 130,
            }}>
              <div style={{
                position: "absolute", top: -26, left: 16,
                background: "#111", border: "4px solid #ff4444", borderBottom: "4px solid #111",
                padding: "3px 14px", fontFamily: "'PokemonClassic', monospace",
                fontSize: 11, color: "#fff", letterSpacing: 1, borderRadius: "4px 4px 0 0",
              }}>Kyran</div>

              <p style={{ margin: "0 0 20px", fontFamily: "'PokemonClassic', monospace", fontSize: 14, color: "#fff", lineHeight: 1.9, letterSpacing: 0.5, textAlign: "justify" }}>
                {KYRAN_TEXT}
              </p>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button onClick={() => setStage("kyranFading")} style={{
                  background: "#000", border: "3px solid #ff4444", borderRadius: 3,
                  color: "#ff4444", fontFamily: "'PokemonClassic', monospace",
                  fontSize: 10, padding: "8px 20px", cursor: "pointer", letterSpacing: 1,
                  boxShadow: "0 0 10px rgba(255, 68, 68, 0.2)",
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
