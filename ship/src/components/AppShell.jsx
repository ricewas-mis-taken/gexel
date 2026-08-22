import { useEffect, useRef, useState } from "react";
import CoinCounter from "./CoinCounter";
import { useCoins } from "./CoinContext";
export const selectStyle = { fontSize: 13, padding: "2px 4px", border: "1px solid #555", borderRadius: 2, width: 130, background: "#3a3a3a", color: "#e0e0e0" };
export const ribbonBtn = { fontSize: 13, padding: "3px 10px", cursor: "pointer", border: "1px solid #555", borderRadius: 2, color: "#e0e0e0" };
export const cornerCell = { background: "#2a2a2a", border: "1px solid #444", width: 40, minWidth: 40 };
export const headerCell = {
  background: "#2a2a2a", border: "1px solid #444", width: 80, minWidth: 80, textAlign: "center", fontWeight: "normal", padding: "2px 0", color: "#aaa"
};
export const rowHeader = { background: "#2a2a2a", border: "1px solid #444", textAlign: "center", width: 40, minWidth: 40, fontSize: 12, color: "#aaa" };

function formatElapsed(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function AppShell({ children, rightSlot, showCoins = true })
{
  const shellRef = useRef(null);
  const { competing, awaitingResume, competeStartedAt, getCompeteElapsedMs } = useCoins();
  const showTimer = competing && !awaitingResume;
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(() => !!document.fullscreenElement);
  const [scale, setScale] = useState(() => {
    if (!document.fullscreenElement) return 1;
    const s = Math.min(window.innerWidth / 900, window.innerHeight / 600);
    return s > 0 ? s : 1;
  });

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    const outer = shellRef.current;
    if (!outer) return;

    const updateScale = () => {
      if (!isFullscreen) { setScale(1); return; }
      const availW = outer.clientWidth;
      const availH = outer.clientHeight;
      if (!availW || !availH) return;
      const s = Math.min(availW / 900, availH / 600);
      setScale(s > 0 ? s : 1);
    };

    updateScale();
    // run again next frame in case layout wasn't settled yet right after fullscreen toggles
    requestAnimationFrame(updateScale);

    const ro = new ResizeObserver(updateScale);
    ro.observe(outer);
    window.addEventListener("resize", updateScale);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateScale);
    };
  }, [isFullscreen]);

  useEffect(() => {
    if (!showTimer || !competeStartedAt) return;
    const tick = () => setElapsedMs(getCompeteElapsedMs());
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [showTimer, competeStartedAt, getCompeteElapsedMs]);

  const toggleFullscreen = () => {
    if (document.fullscreenElement)
    {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen?.();
    }
  };

  return (
    <div ref={shellRef} style={{ background: "#000", position: isFullscreen ? "fixed" : "static", inset: isFullscreen ? 0 : "auto", width: isFullscreen ? "100vw" : "auto", height: isFullscreen ? "100vh" : "100vh", minHeight: isFullscreen ? "auto" : "100vh", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      <div style={{ width: 900, height: 600, position: "relative", border: "2px solid #2ea84a", borderRadius: 6, overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 0 40px #2ea84a33", transform: `scale(${scale})`, transformOrigin: "center center", transition: "transform 0.15s ease", flexShrink: 0 }}>
        <div style={{ background: "#2ea84a", color: "white", padding: "6px 12px", fontSize: 14, display: "flex", alignItems: "center", gap: 16, flexShrink: 0, borderBottom: "2px solid #1a5c37" }}>
          <span style={{fontWeight:"bold"}}>Gexel</span>
          {["File","Home","Insert","Page Layout","Formulas","Data","Review","View"].map(m => (
            <span key={m} style={{ opacity: 0.85 }}>{m}</span>
          ))}
          {rightSlot && <span style={{ marginLeft: "auto" }}>{rightSlot}</span>}
          {showTimer && (
            <span style={{
              marginLeft: rightSlot ? 8 : "auto",
              display: "flex", alignItems: "center", gap: 4,
              fontFamily: "'PokemonClassic', monospace", fontSize: 11, letterSpacing: 1,
              pointerEvents: "none",
            }}>
              <span>⏱</span>{formatElapsed(elapsedMs)}
            </span>
          )}
          <span
            title={isFullscreen ? "Exit full screen" : "Full screen"}
            onClick={toggleFullscreen}
            style={{ cursor: "pointer", fontSize: 16, marginLeft: (rightSlot || showTimer) ? 8 : "auto" }}
          >
            {isFullscreen ? "⊡" : "⛶"}
          </span>
        </div>
        {showCoins && <CoinCounter />}
        {children}
      </div>
    </div>
  );
}
