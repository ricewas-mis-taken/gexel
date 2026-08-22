import { useState, useEffect, useMemo } from "react";
import AppShell from "../AppShell";
import { useCoins } from "../CoinContext";
import { computeScoreBreakdown } from "../../lib/scoring";
import { submitScore } from "../../lib/leaderboard";

const NAME_MAX = 5;
const STEP_DURATION_MS = 550;
const STEP_GAP_MS = 300;
const START_DELAY_MS = 300;

function formatElapsed(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatSigned(n) {
  return `${n < 0 ? "-" : "+"}${Math.abs(n).toLocaleString()}`;
}

// Reveals `steps` (each { key, delta }) one at a time, tweening a running
// total from its previous value to the new cumulative sum on each reveal —
// a classic arcade bonus tally instead of dumping every number at once.
function useTallyReveal(steps) {
  const [revealed, setRevealed] = useState(0);
  const [displayedTotal, setDisplayedTotal] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let raf = null;
    const timers = [];

    let running = 0;
    const cumulative = steps.map((s, i) => {
      running += s.delta;
      return i === steps.length - 1 && s.finalOverride !== undefined ? s.finalOverride : running;
    });

    const tweenTo = (from, to, onDone) => {
      const start = performance.now();
      const step = (ts) => {
        if (cancelled) return;
        const t = Math.min(1, (ts - start) / STEP_DURATION_MS);
        const eased = 1 - Math.pow(1 - t, 3);
        setDisplayedTotal(Math.round(from + (to - from) * eased));
        if (t < 1) raf = requestAnimationFrame(step);
        else onDone();
      };
      raf = requestAnimationFrame(step);
    };

    const runStep = (i, prevTotal) => {
      if (cancelled) return;
      if (i >= steps.length) { setDone(true); return; }
      setRevealed(i + 1);
      tweenTo(prevTotal, cumulative[i], () => {
        timers.push(setTimeout(() => runStep(i + 1, cumulative[i]), STEP_GAP_MS));
      });
    };

    setRevealed(0);
    setDisplayedTotal(0);
    setDone(false);
    timers.push(setTimeout(() => runStep(0, 0), START_DELAY_MS));

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
    };
  }, [steps]);

  return { revealed, displayedTotal, done };
}

export default function CompeteNameEntry({ onDone }) {
  const { competeResult, clearCompeteResult } = useCoins();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const stats = competeResult || { elapsedMs: 0, coinsEarned: 0, deathsTotal: 0 };
  const breakdown = computeScoreBreakdown(stats);

  const steps = useMemo(() => {
    const list = [
      { key: "base", label: "BASE", sub: "", delta: breakdown.base },
      { key: "time", label: "TIME", sub: formatElapsed(stats.elapsedMs), delta: -breakdown.timePenalty },
    ];
    if (breakdown.deathPenalty > 0) {
      list.push({ key: "deaths", label: "DEATHS", sub: `${stats.deathsTotal}`, delta: -breakdown.deathPenalty });
    }
    list.push({ key: "coins", label: "RAM COINS", sub: `${stats.coinsEarned}`, delta: breakdown.coinBonus, finalOverride: breakdown.score });
    return list;
  }, [breakdown.base, breakdown.timePenalty, breakdown.deathPenalty, breakdown.coinBonus, breakdown.score, stats.elapsedMs, stats.deathsTotal, stats.coinsEarned]);

  const { revealed, displayedTotal, done } = useTallyReveal(steps);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await submitScore(name.trim() || "-----", breakdown.score);
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
          @keyframes gexel-line-in {
            0% { opacity: 0; transform: translateY(4px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          @keyframes gexel-score-settle {
            0%   { transform: scale(1); text-shadow: 0 0 0px #2ea84a00; }
            35%  { transform: scale(1.18); text-shadow: 0 0 12px #2ea84acc; }
            100% { transform: scale(1); text-shadow: 0 0 0px #2ea84a00; }
          }
          @keyframes gexel-form-in {
            0% { opacity: 0; transform: translateY(6px); }
            100% { opacity: 1; transform: translateY(0); }
          }
        `}</style>
        <div style={{ fontSize: 18, color: "#2ea84a", letterSpacing: 2, textShadow: "0 0 10px #2ea84a88" }}>
          RUN COMPLETE
        </div>

        <div style={{ fontSize: 11, color: "#ccc", width: 260 }}>
          {steps.map((s, i) => (
            <div key={s.key} style={{
              display: i < revealed ? "flex" : "none",
              justifyContent: "space-between", padding: "3px 0",
              animation: "gexel-line-in 0.3s ease",
            }}>
              <span>{s.label}{s.sub ? ` (${s.sub})` : ""}</span>
              <span style={{ color: s.delta < 0 ? "#ff6666" : "#7CFC9A" }}>{formatSigned(s.delta)}</span>
            </div>
          ))}
          <div style={{
            display: "flex", justifyContent: "space-between", color: "#fff",
            marginTop: 6, paddingTop: 6, borderTop: "1px solid #2ea84a55",
          }}>
            <span>SCORE</span>
            <span style={{
              display: "inline-block",
              animation: done ? "gexel-score-settle 0.5s ease-out" : "none",
            }}>{displayedTotal.toLocaleString()}</span>
          </div>
        </div>

        {done && (
          <form onSubmit={handleSubmit} style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
            animation: "gexel-form-in 0.4s ease",
          }}>
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
        )}
      </div>
    </AppShell>
  );
}
