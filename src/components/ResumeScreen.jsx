import AppShell from "./AppShell";
import { useCoins, GAME_ORDER } from "./CoinContext";
import { RamBar } from "./MainGameScreen";
import ramCoinImg from "../assets/ram-coin.png";

const RAM_STAGE_AFTER = { pacman: "pacman", galaga: "1", frogger: "2", roadgame: "3", tetris: "full" };

function getRamState(progress)
{
  let stage = "empty";
  for (const g of GAME_ORDER) {
      if (progress[g]) stage = RAM_STAGE_AFTER[g];
  }
  return stage;
}

export default function ResumeScreen({ onContinue, onStartOver }) {
  const { coins, progress } = useCoins();
  const ramState=getRamState(progress);
  const doneCount = GAME_ORDER.filter(g => progress[g]).length;

  const btnBase = {
    fontFamily: "'PokemonClassic', monospace", letterSpacing: 2, cursor: "pointer",
        fontSize: 13, padding: "12px 34px", textTransform: "uppercase",
  };

  return (
    <AppShell showCoins={false}>
      <style>{`@font-face { font-family: 'PokemonClassic'; src: url('/fonts/PokemonClassic.ttf') format('truetype'); }`}</style>
      <div style={{
        flex: 1, position: "relative", background: "#050510",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 26,
      }}>
        <RamBar ramState={ramState} style={{ position: "static", width: 420 }} />

        <div style={{
          fontFamily: "'PokemonClassic', monospace", color: "#2ea84a", fontSize: 18,
          letterSpacing: 2, textShadow: "0 0 14px #2ea84a99",
        }}>
          WELCOME BACK
        </div>

        <div style={{
          display: "flex", alignItems: "center", gap: 20,
          fontFamily: "'PokemonClassic', monospace", color: "#fff", fontSize: 11,
        }}>
          <span>{doneCount} / {GAME_ORDER.length} games complete</span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <img src={ramCoinImg} alt="coin" style={{ width: 18, height: 18, imageRendering: "pixelated" }} />
            {coins}
          </span>
        </div>

        <div style={{
          fontFamily: "'PokemonClassic', monospace", color: "#aaa", fontSize: 10,
          maxWidth: 380, textAlign: "center", lineHeight: 1.8,
        }}>
          You have saved progress from the previous run.
        </div>

        <div style={{ display: "flex", gap: 16, marginTop: 6 }}>
          <button
            onClick={onContinue}
            style={{ ...btnBase, background: "#051405", border: "4px solid #2ea84a", color: "#2ea84a", boxShadow: "0 0 15px rgba(46, 168, 74, 0.35)" }}
          >
            Continue
          </button>
          <button
            onClick={onStartOver}
            style={{ ...btnBase, background: "#150505", border: "4px solid #cc3333", color: "#ff5555", boxShadow: "0 0 15px rgba(204, 51, 51, 0.35)" }}
          >
            Start Over
          </button>
        </div>
      </div>
    </AppShell>
  );
}
