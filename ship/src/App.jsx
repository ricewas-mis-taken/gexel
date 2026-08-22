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
import CompeteNameEntry from "./components/transitions/CompeteNameEntry";

import { useCoins } from "./components/CoinContext";
import { preloadGameAssets } from "./lib/preload";

import PacmanIntro from "./components/transitions/pacmanintro";
import PacmanInstructions from "./components/transitions/pacmaninstructions";
import PacmanEnding from "./components/transitions/pacmanending";
import GalagaIntro from "./components/transitions/galagaintro";
import GalagaInstructions from "./components/transitions/galagainstruction";
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

export default function App() {
  const [fadeIn, setFadeIn] = useState(false);
  const { markGameComplete, hasProgress, resetProgress, competing, startCompete, resumeCompete, awaitingResume, finishCompete } = useCoins();
  const [phase, setPhase] = useState(() => hasProgress ? "resume" : "spreadsheet");
  const [zoomTarget, setZoomTarget] = useState("mainGame");
  const typedRef = useRef("");

  // Every playthrough is timed — start the clock as soon as the player
  // reaches the hub, whether this is a fresh run or a resumed one. A
  // reloaded/resumed run stays paused (see awaitingResume) until this point,
  // so time spent on the Resume screen deciding doesn't count toward it.
  useEffect(() => {
    if (phase !== "mainGame") return;
    if (!competing) startCompete();
    else if (awaitingResume) resumeCompete();
  }, [phase, competing, awaitingResume, startCompete, resumeCompete]);

  // Start warming the browser's cache with every game asset as soon as the
  // player enters the tutorial flow (or resumes straight into the hub), so
  // by the time an actual minigame mounts its images/audio are already
  // loaded instead of each game paying its own first-load cost.
  useEffect(() => {
    if (phase === "intro" || phase === "resume") preloadGameAssets();
  }, [phase]);

  // Fires once the boss-fight credits (BossEnding) finish scrolling.
  const handleCreditsFinished = () => {
    finishCompete();
    setPhase("competeName");
  };

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
          onWin={handleCreditsFinished}
          onLose={() => setPhase("mainGame")}
        />
      );
    }

    if (phase === "competeName") {
      return (
        <CompeteNameEntry onDone={() => { resetProgress(); setPhase("spreadsheet"); }} />
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
    </div>
  );
}
