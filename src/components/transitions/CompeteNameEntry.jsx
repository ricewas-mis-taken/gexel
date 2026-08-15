import { useState } from "react";
import AppShell from "../AppShell";
import { useCoins } from "../CoinContext";
import { computeScore } from "../../lib/scoring";
import { submitScore } from "../../lib/leaderboard";

const NAME_MAX = 5;

function formatElapsed(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function CompeteNameEntry({ onDone }) {
  const { competeResult, clearCompeteResult } = useCoins();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const stats = competeResult || { elapsedMs: 0, coinsEarned: 0, deathsTotal: 0 };
  const score = computeScore(stats);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    await submitScore(name.trim() || "-----", score);
    clearCompeteResult();
    onDone && onDone();
  };

  return (
    <AppShell showCoins={false}>
      <div style={{
        flex: 1, background: "#000", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 18,
        fontFamily: "'PokemonClassic', monospace", color: "#fff", padding: 24,
      }}>
        <div style={{ fontSize: 18, color: "#2ea84a", letterSpacing: 2, textShadow: "0 0 10px #2ea84a88" }}>
          RUN COMPLETE
        </div>

        <div style={{ fontSize: 11, lineHeight: 2, textAlign: "center", color: "#ccc" }}>
          <div>TIME: {formatElapsed(stats.elapsedMs)}</div>
          <div>RAM COINS: {stats.coinsEarned}</div>
          <div>DEATHS: {stats.deathsTotal}</div>
          <div style={{ color: "#fff", marginTop: 6 }}>SCORE: {score}</div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 11, letterSpacing: 1 }}>ENTER NAME ({NAME_MAX} CHARS)</div>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value.toUpperCase().slice(0, NAME_MAX))}
            maxLength={NAME_MAX}
            disabled={submitting}
            style={{
              fontFamily: "'PokemonClassic', monospace", fontSize: 20, letterSpacing: 6,
              textAlign: "center", width: 140, background: "#111", color: "#fff",
              border: "2px solid #2ea84a", borderRadius: 3, padding: "6px 8px",
            }}
          />
          <button type="submit" disabled={submitting} style={{
            fontFamily: "'PokemonClassic', monospace", fontSize: 12, letterSpacing: 1,
            background: "#2ea84a", color: "#fff", border: "1px solid #1a5c37", borderRadius: 3,
            padding: "8px 20px", cursor: submitting ? "default" : "pointer", opacity: submitting ? 0.6 : 1,
          }}>
            {submitting ? "SAVING..." : "SUBMIT"}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
