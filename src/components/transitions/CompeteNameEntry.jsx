import { useState, useEffect } from "react";
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

// Counts up from 0 to `target` over `duration`ms, starting after `delay`ms,
// easing out so it lands with a satisfying settle instead of a hard stop.
function useCountUp(target, { duration = 700, delay = 0 } = {}) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    setValue(0);
    let raf;
    let start = null;
    const step = (ts) => {
      if (start === null) start = ts;
      const t = Math.min(1, (ts - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    const delayId = setTimeout(() => { raf = requestAnimationFrame(step); }, delay);
    return () => { clearTimeout(delayId); if (raf) cancelAnimationFrame(raf); };
  }, [target, duration, delay]);
  return value;
}

export default function CompeteNameEntry({ onDone }) {
  const { competeResult, clearCompeteResult } = useCoins();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const stats = competeResult || { elapsedMs: 0, coinsEarned: 0, deathsTotal: 0 };
  const score = computeScore(stats);

  const elapsedSeconds = Math.floor(stats.elapsedMs / 1000);
  const timeAnim = useCountUp(elapsedSeconds, { duration: 600, delay: 150 });
  const coinsAnim = useCountUp(stats.coinsEarned, { duration: 600, delay: 400 });
  const deathsAnim = useCountUp(stats.deathsTotal, { duration: 600, delay: 650 });
  const scoreAnim = useCountUp(score, { duration: 1100, delay: 950 });
  const [scoreSettled, setScoreSettled] = useState(false);
  useEffect(() => {
    setScoreSettled(false);
    const id = setTimeout(() => setScoreSettled(true), 950 + 1100);
    return () => clearTimeout(id);
  }, [score]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await submitScore(name.trim() || "-----", score);
    } finally {
      clearCompeteResult();
      onDone && onDone();
    }
  };

  return (
    <AppShell showCoins={false}>
      <div style={{
        flex: 1, background: "#000", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 18,
        fontFamily: "'PokemonClassic', monospace", color: "#fff", padding: 24,
      }}>
        <style>{`
          @keyframes gexel-score-settle {
            0%   { transform: scale(1); text-shadow: 0 0 0px #2ea84a00; }
            35%  { transform: scale(1.18); text-shadow: 0 0 12px #2ea84acc; }
            100% { transform: scale(1); text-shadow: 0 0 0px #2ea84a00; }
          }
        `}</style>
        <div style={{ fontSize: 18, color: "#2ea84a", letterSpacing: 2, textShadow: "0 0 10px #2ea84a88" }}>
          RUN COMPLETE
        </div>

        <div style={{ fontSize: 11, lineHeight: 2, textAlign: "center", color: "#ccc" }}>
          <div>TIME: {formatElapsed(timeAnim * 1000)}</div>
          <div>RAM COINS: {coinsAnim}</div>
          <div>DEATHS: {deathsAnim}</div>
          <div style={{
            color: "#fff", marginTop: 6, display: "inline-block",
            animation: scoreSettled ? "gexel-score-settle 0.5s ease-out" : "none",
          }}>SCORE: {scoreAnim}</div>
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
