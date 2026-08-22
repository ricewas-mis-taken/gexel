import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";

const CoinContext = createContext(null);
const STORAGE_KEY = "gexel_coins_total";
const PROGRESS_KEY="gexel_progress";
const NAME_KEY = "gexel_player_name";
const COMPETE_KEY = "gexel_compete_run";

export const GAME_ORDER = ["pacman", "galaga", "frogger", "roadgame", "tetris"];

// The in-progress compete run (start time, accumulated pause, deaths, coin
// baseline) is persisted here so leaving the tab — closing it, refreshing,
// coming back via the Resume screen — doesn't silently restart the clock.
function readCompeteState() {
  try {
    const raw = localStorage.getItem(COMPETE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCompeteState(state) {
  try {
    localStorage.setItem(COMPETE_KEY, JSON.stringify(state));
  } catch {
    // storage full/blocked — the run just won't survive a reload
  }
}

function clearCompeteState() {
  localStorage.removeItem(COMPETE_KEY);
}

export function CoinProvider({ children })
{
  const [coins, setCoins] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? parseInt(saved, 10) || 0 : 0;
  });
  const [sessionCoins, setSessionCoins] = useState(0);
  const sessionCoinsRef = useRef(0);

  const [progress, setProgress] = useState(() => {
      const saved = localStorage.getItem(PROGRESS_KEY);
      if (!saved) return {};
      try {
        return JSON.parse(saved);
      } catch {
        return {};
      }
  });

  const [playerName, setPlayerName] = useState(() => localStorage.getItem(NAME_KEY) || "");

  // Read once on mount; every other piece of restored compete state below
  // derives from this same snapshot instead of re-parsing localStorage.
  const [initialCompete] = useState(() => readCompeteState());

  const [competing, setCompeting] = useState(() => !!initialCompete);
  const [competeStartedAt, setCompeteStartedAt] = useState(() => initialCompete?.startedAt ?? null);
  const [deaths, setDeaths] = useState(() => initialCompete?.deaths ?? {});
  const [competeResult, setCompeteResult] = useState(null);
  const runCoinsStartRef = useRef(initialCompete?.runCoinsStart ?? 0);
  const competingRef = useRef(!!initialCompete);
  useEffect(() => { competingRef.current = competing; }, [competing]);

  // A rehydrated run stays paused (and hidden from the UI) until the player
  // actually clicks "Continue" on the Resume screen — otherwise time spent
  // deciding whether to continue would silently count toward the run.
  const [awaitingResume, setAwaitingResume] = useState(() => !!initialCompete);

  // Tracks time spent with the tab hidden (or the app fully closed) so the
  // compete timer — and the final score — don't balloon just because the
  // player tabbed away or reloaded mid-run. Any gap since the last saved
  // heartbeat is treated as paused, since we have no way to verify the
  // player was actually playing during it. A rehydrated run starts paused
  // right away too (see awaitingResume above), unpaused by resumeCompete().
  const pausedAccumRef = useRef(
    initialCompete
      ? (initialCompete.pausedAccum ?? 0) + Math.max(0, Date.now() - (initialCompete.lastHeartbeat ?? Date.now()))
      : 0
  );
  const hiddenAtRef = useRef(initialCompete ? Date.now() : null);

  // Refs mirroring competeStartedAt/deaths so the listeners below (set up
  // once, in an empty-deps effect) always persist the current values
  // instead of a stale closure from whenever they were registered.
  const competeStartedAtRef = useRef(competeStartedAt);
  useEffect(() => { competeStartedAtRef.current = competeStartedAt; }, [competeStartedAt]);
  const deathsRef = useRef(deaths);
  useEffect(() => { deathsRef.current = deaths; }, [deaths]);

  const persistCompete = useCallback(() => {
    if (!competingRef.current || !competeStartedAtRef.current) return;
    writeCompeteState({
      startedAt: competeStartedAtRef.current,
      pausedAccum: pausedAccumRef.current,
      deaths: deathsRef.current,
      runCoinsStart: runCoinsStartRef.current,
      lastHeartbeat: Date.now(),
    });
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        if (competingRef.current && hiddenAtRef.current === null) {
          hiddenAtRef.current = Date.now();
        }
      } else if (hiddenAtRef.current !== null) {
        pausedAccumRef.current += Date.now() - hiddenAtRef.current;
        hiddenAtRef.current = null;
      }
      persistCompete();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("beforeunload", persistCompete);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", persistCompete);
    };
  }, [persistCompete]);

  // Current run time excluding any stretches spent with the tab hidden.
  const getCompeteElapsedMs = useCallback(() => {
    if (!competeStartedAt) return 0;
    const now = Date.now();
    const openHiddenMs = hiddenAtRef.current !== null ? now - hiddenAtRef.current : 0;
    return Math.max(0, now - competeStartedAt - pausedAccumRef.current - openHiddenMs);
  }, [competeStartedAt]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(coins));
  }, [coins]);

  useEffect(() => {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  }, [progress]);

  useEffect(() => {
    if (playerName) localStorage.setItem(NAME_KEY, playerName);
  }, [playerName]);

  const addSessionCoins = (n) => {
    sessionCoinsRef.current += n;
    setSessionCoins(s => s + n);
  };

  const commitSession = () => {
    const earned = sessionCoinsRef.current;
    sessionCoinsRef.current = 0;
    setSessionCoins(0);
    setCoins(c => c + earned);
  };

  const discardSession = () => {
    sessionCoinsRef.current=0;
    setSessionCoins(0);
  };

  const addCoins = (n) => setCoins(c => c + n);

  const markGameComplete = (gameKey) => {
    setProgress(p => ({ ...p, [gameKey]: true }));
  };

  const getNextGame = () => GAME_ORDER.find(g => !progress[g]) || null;

  const resetProgress = () => {
    setProgress({});
    setCoins(0);
    sessionCoinsRef.current = 0;
    setSessionCoins(0);
    localStorage.removeItem(PROGRESS_KEY);
    localStorage.removeItem(STORAGE_KEY);
    setCompeting(false);
    setCompeteStartedAt(null);
    setDeaths({});
    setCompeteResult(null);
    setAwaitingResume(false);
    pausedAccumRef.current = 0;
    hiddenAtRef.current = null;
    clearCompeteState();
  };

  const hasProgress = Object.keys(progress).length > 0;

  const startCompete = () => {
    setDeaths({});
    runCoinsStartRef.current = coins + sessionCoins;
    setCompeteResult(null);
    setAwaitingResume(false);
    pausedAccumRef.current = 0;
    hiddenAtRef.current = null;
    const startedAt = Date.now();
    setCompeteStartedAt(startedAt);
    setCompeting(true);
    writeCompeteState({ startedAt, pausedAccum: 0, deaths: {}, runCoinsStart: coins + sessionCoins, lastHeartbeat: startedAt });
  };

  // Unpauses a rehydrated run once the player actually clicks "Continue" —
  // a no-op if the run wasn't awaiting resume (e.g. a fresh startCompete()).
  const resumeCompete = () => {
    if (!awaitingResume) return;
    if (hiddenAtRef.current !== null) {
      pausedAccumRef.current += Date.now() - hiddenAtRef.current;
      hiddenAtRef.current = null;
    }
    setAwaitingResume(false);
    persistCompete();
  };

  // Stable identity (useCallback + a ref for the guard) so games that embed
  // recordDeath in their own empty-deps useCallback (e.g. frogger's die())
  // never capture a stale closure that always reads competing as false.
  const recordDeath = useCallback((gameKey) => {
    if (!competingRef.current) return;
    setDeaths(d => {
      const next = { ...d, [gameKey]: (d[gameKey] || 0) + 1 };
      deathsRef.current = next;
      return next;
    });
    persistCompete();
  }, [persistCompete]);

  // Reads the run's stats before anything else (resetProgress, a new
  // startCompete) can change coins/deaths out from under it.
  const finishCompete = () => {
    if (!competing) return competeResult;
    const elapsedMs = getCompeteElapsedMs();
    const coinsEarned = Math.max(0, (coins + sessionCoins) - runCoinsStartRef.current);
    const deathsTotal = Object.values(deaths).reduce((a, b) => a + b, 0);
    const result = { elapsedMs, coinsEarned, deaths: { ...deaths }, deathsTotal };
    setCompeting(false);
    setCompeteResult(result);
    clearCompeteState();
    return result;
  };

  const clearCompeteResult = () => setCompeteResult(null);

  return (
    <CoinContext.Provider value={{
      coins, sessionCoins, addSessionCoins, commitSession, discardSession, addCoins,
      progress, markGameComplete, getNextGame, resetProgress, hasProgress,
      playerName, setPlayerName,
      competing, competeStartedAt, startCompete, resumeCompete, awaitingResume, finishCompete, getCompeteElapsedMs,
      deaths, recordDeath, competeResult, clearCompeteResult,
    }}>
      {children}
    </CoinContext.Provider>
  );
}

export function useCoins() {
  const ctx = useContext(CoinContext);
  if (!ctx) throw new Error("useCoins must be used within a CoinProvider");
  return ctx;
}
