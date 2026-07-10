import { useState, useEffect, useRef } from "react";
import IntroScreen from "./components/IntroScreen";
import SpreadsheetScreen from "./components/SpreadsheetScreen";
import GameScreen from "./components/GameScreen";
import OrientationScreen from "./components/OrientationScreen";
import ZoomCanvas from "./components/ZoomCanvas";
import MainGameScreen from "./components/MainGameScreen";
import ResumeScreen from "./components/ResumeScreen";
import Pacman from "./components/Pacman";
import Frogger from "./components/frogger";
import Galaga from "./components/Galaga";
import Roadgame from "./components/roadgame";
import Tetris from "./components/tetris";
import BossFight from "./components/bossfight";

import { useCoins, GAME_ORDER } from "./components/CoinContext";

import PacmanIntro from "./components/transitions/PacmanIntro";
import PacmanInstructions from "./components/transitions/PacmanInstructions";
import PacmanEnding from "./components/transitions/pacmanending";
import GalagaIntro from "./components/transitions/GalagaIntro";
import GalagaInstructions from "./components/transitions/GalagaInstruction";
import FroggerIntro from "./components/transitions/froggerintro";
import FroggerInstructions from "./components/transitions/froggerinstructions";
import FroggerEnd from "./components/transitions/froggerend";
import SpeedraceIntro from "./components/transitions/speedraceintro";
import SpeedraceInstructions from "./components/transitions/speedraceinstructions";
import RoadgameEnd from "./components/transitions/roadgameend";
import TetrisIntro from "./components/transitions/tetrisintro";
import TetrisInstructions from "./components/transitions/tetrisinstructions";
import BossfightIntro from "./components/transitions/bossfightintro";
import BossfightInstructions from "./components/transitions/bossfightinstructions";

const GAME_FLOW = {
  pacman:   { Intro: PacmanIntro,   Instructions: PacmanInstructions,   Game: Pacman,   finishProp: "onFinish" },
  galaga: { Intro: GalagaIntro,   Instructions: GalagaInstructions,   Game: Galaga,   finishProp: "onNext" },
  frogger:  { Intro: FroggerIntro,  Instructions: FroggerInstructions,  Game: Frogger,  finishProp: "onFinish" },
    roadgame: { Intro: SpeedraceIntro, Instructions: SpeedraceInstructions, Game: Roadgame, finishProp: "onFinish" },
  tetris:   { Intro: TetrisIntro,   Instructions: TetrisInstructions,   Game: Tetris,   finishProp: "onFinish" },
};

const PHASES = ["spreadsheet", "mainGame", ...GAME_ORDER, "bossfight"];

export default function App() {
  const [fadeIn, setFadeIn] = useState(false);
  const [debugOpen,setDebugOpen] = useState(false);
  const { coins, markGameComplete, hasProgress, resetProgress, addCoins } = useCoins();
  const [phase, setPhase] = useState(() => hasProgress ? "resume" : "spreadsheet");
  const [zoomTarget, setZoomTarget] = useState("mainGame");
  const typedRef = useRef("");

  const finishGame = (gameKey) => {
    markGameComplete(gameKey);
    setZoomTarget(
      gameKey === "pacman" ? "ending" :
      gameKey === "frogger" ? "froggerend" :
      gameKey === "roadgame" ? "roadgameend" :
      "mainGame"
    );
      setPhase("zoomOut");
  };

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "/") { setDebugOpen(d => !d); return; }
      if (phase !== "spreadsheet") return;
      typedRef.current += e.key.toLowerCase();
      if (typedRef.current.length > 5) typedRef.current = typedRef.current.slice(-5);
      if (typedRef.current === "gexel") { typedRef.current = ""; setPhase("intro"); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase]);

  useEffect(() => {
    if (phase === "orientation") {
      setFadeIn(false);
        setTimeout(() => setFadeIn(true), 100);
    }
  }, [phase]);

  const renderPhase = () => {
    if (phase === "intro") return <IntroScreen onStart={() => setPhase("game")} />;
    if (phase === "zooming") return <ZoomCanvas onDone={() => setPhase("game")} />;
    if (phase === "game") return <GameScreen onNext={() => setPhase("orientation")} />;

    if (phase === "zoomOut") return <ZoomCanvas onDone={() => setPhase(zoomTarget)} />;

    if (phase === "zoomIn") return <ZoomCanvas onDone={() => setPhase(zoomTarget)} />;

    if (phase === "orientation") return <OrientationScreen onNext={() => setPhase("mainGame")} />;

    if (phase === "resume") {
      return (
        <ResumeScreen
          onContinue={() => setPhase("mainGame")}
          onStartOver={() => { resetProgress(); setPhase("spreadsheet"); }}
        />
      );
    }

    if (phase === "mainGame") {
      return (
        <MainGameScreen
          onNext={(gameKey) => {
            setZoomTarget(gameKey ? `${gameKey}:intro` : "bossfight:intro");
            setPhase("zoomIn");
          }}
        />
      );
    }

    if (phase === "ending") return <PacmanEnding onNext={() => setPhase("mainGame")} />;

    if (phase === "froggerend") return <FroggerEnd onNext={() => setPhase("mainGame")} />;

    if (phase === "roadgameend") return <RoadgameEnd onNext={() => setPhase("mainGame")} />;

    for (const [key, flow] of Object.entries(GAME_FLOW)) {
      if (phase === `${key}:intro`) {
        return <flow.Intro onNext={() => setPhase(`${key}:instructions`)} />;
      }
      if (phase === `${key}:instructions`) {
        return <flow.Instructions onNext={() => setPhase(key)} />;
      }
      if (phase === key) {
          const GameComp = flow.Game;
        return <GameComp {...{ [flow.finishProp]: () => finishGame(key) }} />;
      }
    }

    if (phase === "bossfight:intro") {
      return <BossfightIntro onNext={() => setPhase("bossfight:instructions")} />;
    }

    if (phase === "bossfight:instructions") {
      return <BossfightInstructions onNext={() => setPhase("bossfight")} />;
    }

    if (phase === "bossfight") {
      return (
        <BossFight
          onWin={() => setPhase("mainGame")}
          onLose={() => setPhase("mainGame")}
        />
      );
    }

    return <SpreadsheetScreen />;
  };

  return (
    <div style={{ position: "relative" }}>
      {renderPhase()}

      {phase === "orientation" && (
        <div style={{
          position: "fixed", inset: 0, background: "#000", pointerEvents: "none", zIndex: 999,
          opacity: fadeIn ? 0 : 1, transition: "opacity 1.5s ease",
        }} />
      )}

      {debugOpen && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 9999,
          background: "#111", border: "3px solid #9933ff", borderRadius: 4,
          padding: "16px 20px", display: "flex", flexDirection: "column", gap: 8,
          boxShadow: "0 0 20px #7733cc88",
          fontFamily: "'PokemonClassic', monospace",
          maxHeight: "90vh", overflowY: "auto",
        }}>
          <div style={{ color: "#9933ff", fontSize: 11, marginBottom: 4, letterSpacing: 1 }}>DEBUG — COINS (total: {coins})</div>
          <button onClick={() => addCoins(100)} style={{
            background: "#000", color: "#9933ff", border: "2px solid #9933ff", borderRadius: 3,
            fontFamily: "'PokemonClassic', monospace", fontSize: 10, padding: "6px 14px",
            cursor: "pointer", letterSpacing: 1, textAlign: "left",
          }}>+100 coins</button>
          <button onClick={() => addCoins(1000)} style={{
            background: "#000", color: "#9933ff", border: "2px solid #9933ff", borderRadius: 3,
            fontFamily: "'PokemonClassic', monospace", fontSize: 10, padding: "6px 14px",
            cursor: "pointer", letterSpacing: 1, textAlign: "left",
          }}>+1000 coins</button>
          <div style={{ color: "#9933ff", fontSize: 11, margin: "8px 0 4px", letterSpacing: 1 }}>DEBUG — JUMP TO</div>
          {PHASES.map(p => (
            <button key={p} onClick={() => {
              setPhase(GAME_ORDER.includes(p) ? `${p}:intro` : p === "bossfight" ? "bossfight:intro" : p);
              setDebugOpen(false);
            }} style={{
              background: phase === p ? "#9933ff" : "#000",
              color: phase === p ? "#fff" : "#9933ff",
              border: "2px solid #9933ff", borderRadius: 3,
              fontFamily: "'PokemonClassic', monospace",
              fontSize: 10, padding: "6px 14px", cursor: "pointer", letterSpacing: 1,
              textAlign: "left",
            }}>{p}</button>
          ))}
          <div style={{ color: "#554477", fontSize: 9, marginTop: 4 }}>press / to close</div>
        </div>
      )}
    </div>
  );
}
