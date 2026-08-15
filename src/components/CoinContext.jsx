import { createContext, useContext, useState, useEffect, useRef } from "react";

const CoinContext = createContext(null);
const STORAGE_KEY = "gexel_coins_total";
const PROGRESS_KEY="gexel_progress";
const NAME_KEY = "gexel_player_name";

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

  return (
    <CoinContext.Provider value={{
      coins, sessionCoins, addSessionCoins, commitSession, discardSession, addCoins,
      progress, markGameComplete, getNextGame, resetProgress, hasProgress,
      playerName, setPlayerName,
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
