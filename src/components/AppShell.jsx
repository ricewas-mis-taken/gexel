import { useEffect, useRef, useState } from "react";
import CoinCounter from "./CoinCounter";
export const selectStyle = { fontSize: 13, padding: "2px 4px", border: "1px solid #555", borderRadius: 2, width: 130, background: "#3a3a3a", color: "#e0e0e0" };
export const ribbonBtn = { fontSize: 13, padding: "3px 10px", cursor: "pointer", border: "1px solid #555", borderRadius: 2, color: "#e0e0e0" };
export const cornerCell = { background: "#2a2a2a", border: "1px solid #444", width: 40, minWidth: 40 };
export const headerCell = {
  background: "#2a2a2a", border: "1px solid #444", width: 80, minWidth: 80, textAlign: "center", fontWeight: "normal", padding: "2px 0", color: "#aaa"
};
export const rowHeader = { background: "#2a2a2a", border: "1px solid #444", textAlign: "center", width: 40, minWidth: 40, fontSize: 12, color: "#aaa" };

export default function AppShell({ children, rightSlot, showCoins = true })
{
  const shellRef = useRef(null);
    const [isFullscreen, setIsFullscreen] = useState(() => !!document.fullscreenElement);
  const [scale,setScale] = useState(() =>
    document.fullscreenElement ? Math.min(window.innerWidth / 900, window.innerHeight / 600) : 1
  );

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
        if (!isFullscreen) {
      setScale(1);
      return;
    }
    const updateScale = () =>setScale(Math.min(window.innerWidth / 900, window.innerHeight / 600));
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [isFullscreen]);

  const toggleFullscreen = () => {
    if (document.fullscreenElement)
    {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen?.();
    }
  };

  return (
    <div ref={shellRef} style={{ background: "#000", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 900, height: 600, position: "relative", border: "2px solid #2ea84a", borderRadius: 6, overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 0 40px #2ea84a33", transform: `scale(${scale})`, transition: "transform 0.15s ease" }}>
        <div style={{ background: "#2ea84a", color: "white", padding: "6px 12px", fontSize: 14, display: "flex", alignItems: "center", gap: 16, flexShrink: 0, borderBottom: "2px solid #1a5c37" }}>
          <span style={{fontWeight:"bold"}}>Gexel</span>
          {["File","Home","Insert","Page Layout","Formulas","Data","Review","View"].map(m => (
            <span key={m} style={{ opacity: 0.85 }}>{m}</span>
          ))}
          {rightSlot && <span style={{ marginLeft: "auto" }}>{rightSlot}</span>}
          <span
            title={isFullscreen ? "Exit full screen" : "Full screen"}
            onClick={toggleFullscreen}
            style={{ cursor: "pointer", fontSize: 16, marginLeft: rightSlot ? 8 : "auto" }}
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
