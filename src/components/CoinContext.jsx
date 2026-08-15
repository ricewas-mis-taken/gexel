import { createContext, useContext, useState, useEffect, useRef } from "react";

const CoinContext = createContext(null);
const STORAGE_KEY = "gexel_coins_total";
const PROGRESS_KEY="gexel_progress";
const NAME_KEY = "gexel_player_name";
const BEATEN_KEY = "gexel_beaten";

export const GAME_ORDER = ["pacman", "galaga", "frogger", "roadgame", "tetris"];

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
      return saved ? JSON.parse(saved) : {};
  });

  const [playerName, setPlayerName] = useState(() => localStorage.getItem(NAME_KEY) || "");

  // "Beaten" tracks whether the credits have ever fully played out once,
  // independent of PROGRESS_KEY/STORAGE_KEY so resetProgress() (a normal,
  // non-compete run finishing) never hides the Compete button again.
  const [beaten, setBeaten] = useState(() => localStorage.getItem(BEATEN_KEY) === "1");

  const [competing, setCompeting] = useState(false);
  const [competeStartedAt, setCompeteStartedAt] = useState(null);
  const [deaths, setDeaths] = useState({});
  const [competeResult, setCompeteResult] = useState(null);
  const runCoinsStartRef = useRef(0);

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
  };

  const hasProgress = Object.keys(progress).length > 0;

  const markBeaten = () => {
    if (beaten) return;
    setBeaten(true);
    localStorage.setItem(BEATEN_KEY, "1");
  };

  const startCompete = () => {
    setDeaths({});
    runCoinsStartRef.current = coins + sessionCoins;
    setCompeteResult(null);
    setCompeteStartedAt(Date.now());
    setCompeting(true);
  };

  const recordDeath = (gameKey) => {
    if (!competing) return;
    setDeaths(d => ({ ...d, [gameKey]: (d[gameKey] || 0) + 1 }));
  };

  // Reads the run's stats before anything else (resetProgress, a new
  // startCompete) can change coins/deaths out from under it.
  const finishCompete = () => {
    if (!competing) return competeResult;
    const elapsedMs = Date.now() - (competeStartedAt || Date.now());
    const coinsEarned = Math.max(0, (coins + sessionCoins) - runCoinsStartRef.current);
    const deathsTotal = Object.values(deaths).reduce((a, b) => a + b, 0);
    const result = { elapsedMs, coinsEarned, deaths: { ...deaths }, deathsTotal };
    setCompeting(false);
    setCompeteResult(result);
    return result;
  };

  const clearCompeteResult = () => setCompeteResult(null);

  return (
    <CoinContext.Provider value={{
      coins, sessionCoins, addSessionCoins, commitSession, discardSession, addCoins,
      progress, markGameComplete, getNextGame, resetProgress, hasProgress,
      playerName, setPlayerName,
      beaten, markBeaten,
      competing, competeStartedAt, startCompete, finishCompete,
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
