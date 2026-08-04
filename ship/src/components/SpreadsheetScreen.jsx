import { useState, useEffect } from "react";
import AppShell, { selectStyle, ribbonBtn, cornerCell, headerCell, rowHeader } from "./AppShell";
import ITPopup from "./ITPopup";
import glitchSnd from "../assets/glitch.mp3";
import { playSafely } from "../lib/audio";

const COL_LETTERS = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
const FONTS = ["Calibri", "Arial", "Times New Roman", "Courier New", "Georgia"];
const SIZES  =  [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36];
const NORMAL_ROWS = 50;
const NORMAL_COLS=26;

const IT_TASKS = [
  { text: "Type the number 42 into cell B2.", check: (cells) => (cells["1-1"] || "").trim() === "42" },
  { text: "Bold cell B2.", check: (cells, styles) => !!styles["1-1"]?.bold },
  { text: "Type the word \"Report\" into cell C4.", check: (cells) => (cells["3-2"] || "").trim().toLowerCase() === "report" },
  { text: "Set the font of C4 to Times New Roman.", check: (cells, styles) => styles["3-2"]?.font === "Times New Roman" },
  { text: "Type the number 7 into cell D6.", check: (cells) => (cells["5-3"] || "").trim() === "7" },
  { text: "Underline cell D6.", check: (cells, styles) => !!styles["5-3"]?.underline },
  { text: "Type the word \"Sales\" into cell A1.", check: (cells) => (cells["0-0"] || "").trim().toLowerCase() === "sales" },
  { text: "Set the font size of A1 to 18.", check: (cells, styles) => styles["0-0"]?.size === 18 },
];

const FINAL_TASK_MESSAGE = "Just type GEXEL man, you find this fun?";

const GLITCH_DELAY_MS = 10000;
const GLITCH_DURATION_MS = 1400;
const HINT_DURATION_MS = 10000;

export default function SpreadsheetScreen({ onEscape, onCheat })
{
  const [cells, setCells] = useState({});
  const [cellStyles, setCellStyles]=useState({});
  const [selected, setSelected] = useState({ r: 0, c: 0 });
  const [font, setFont] = useState("Calibri");
    const [size, setSize] = useState(11);
  const [color, setColor] = useState("#e0e0e0");
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [underline, setUnderline] = useState(false);

  const [stage, setStage] = useState("tasks");
  const [taskIndex, setTaskIndex] = useState(0);
  const currentTask = taskIndex < IT_TASKS.length ? IT_TASKS[taskIndex].text : FINAL_TASK_MESSAGE;

  useEffect(() => {
    if (stage !== "tasks") return;
    const glitchTimer = setTimeout(() => setStage("glitching"), GLITCH_DELAY_MS);
    return () => clearTimeout(glitchTimer);
  }, [stage]);

  useEffect(() => {
    if (stage !== "glitching") return;
    const audio = new Audio(glitchSnd);
    playSafely(audio);
  }, [stage]);

  useEffect(() => {
    if (taskIndex >= IT_TASKS.length) return;
    if (IT_TASKS[taskIndex].check(cells, cellStyles)) setTaskIndex(i => i + 1);
  }, [taskIndex, cells, cellStyles]);

  useEffect(() => {
    if (stage !== "glitching") return;
    const hintTimer = setTimeout(() => setStage("hint"), GLITCH_DURATION_MS);
    return () => clearTimeout(hintTimer);
  }, [stage]);

  useEffect(() => {
    if (stage !== "hint") return;
    const doneTimer = setTimeout(() => setStage("done"), HINT_DURATION_MS);
    return () => clearTimeout(doneTimer);
  }, [stage]);

  const selKey=`${selected.r}-${selected.c}`;
  const updateCell = (key, val) => setCells(c => ({ ...c, [key]: val }));
  const applyStyle = () =>
    setCellStyles(s => ({ ...s, [selKey]: { font, size, color, bold, italic, underline } }));
  const getStyle = (key) => {
    const s = cellStyles[key];
      if (!s) return {};
    return { fontFamily: s.font, fontSize: s.size, color: s.color, fontWeight: s.bold ? "bold" : "normal", fontStyle: s.italic ? "italic" : "normal", textDecoration: s.underline ? "underline" : "none" };
  };
  const onSelectCell = (r, c) => {
    setSelected({ r, c });
    const s = cellStyles[`${r}-${c}`];
    if (s) { setFont(s.font); setSize(s.size); setColor(s.color); setBold(s.bold); setItalic(s.italic); setUnderline(s.underline); }
  };

  return (
    <AppShell showCoins={false}>
      <style>{`
        @keyframes gexel-glitch-shift {
          0%   { transform: translate(0, 0); filter: hue-rotate(0deg) contrast(1); }
          10%  { transform: translate(-6px, 2px); filter: hue-rotate(30deg) contrast(1.4); }
          20%  { transform: translate(5px, -3px); filter: hue-rotate(-40deg) contrast(1.6); }
          30%  { transform: translate(-4px, 4px) skewX(2deg); filter: hue-rotate(90deg) contrast(1.2); }
          40%  { transform: translate(6px, -2px); filter: invert(0.15) contrast(1.5); }
          50%  { transform: translate(-3px, -4px) skewX(-2deg); filter: hue-rotate(-90deg) contrast(1.3); }
          60%  { transform: translate(4px, 3px); filter: invert(0.25); }
          70%  { transform: translate(-6px, 0); filter: hue-rotate(60deg) contrast(1.6); }
          80%  { transform: translate(3px, -3px); filter: contrast(1.8) saturate(2); }
          90%  { transform: translate(-2px, 2px); filter: hue-rotate(20deg); }
          100% { transform: translate(0, 0); filter: none; }
        }
        @keyframes gexel-glitch-bar-a {
          0%, 100% { opacity: 0; }
          15%, 35% { opacity: 0.5; transform: translateX(-10px); }
          25% { opacity: 0.3; transform: translateX(8px); }
        }
        @keyframes gexel-glitch-bar-b {
          0%, 100% { opacity: 0; }
          45%, 65% { opacity: 0.45; transform: translateX(12px); }
          55% { opacity: 0.25; transform: translateX(-9px); }
        }
        .gexel-glitching {
          animation: gexel-glitch-shift 1.4s steps(2, jump-start) 1;
        }
        .gexel-glitch-bar {
          position: absolute; left: 0; width: 100%; height: 6px; pointer-events: none; z-index: 40;
        }
        .gexel-glitch-bar.a { top: 30%; background: #ff2fd0; mix-blend-mode: screen; animation: gexel-glitch-bar-a 1.4s steps(2, jump-start) 1; }
        .gexel-glitch-bar.b { top: 62%; background: #2fe5ff; mix-blend-mode: screen; animation: gexel-glitch-bar-b 1.4s steps(2, jump-start) 1; }
        .gexel-grid-scroll { scrollbar-width: thin; }
        .gexel-grid-scroll::-webkit-scrollbar:vertical { display: none; }
      `}</style>

      <ITPopup message={currentTask} />
      {stage === "glitching" && (
        <>
          <div className="gexel-glitch-bar a" />
          <div className="gexel-glitch-bar b" />
        </>
      )}
      {stage === "hint" && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 45,
          display: "flex", alignItems: "center", justifyContent: "center",
          pointerEvents: "none",
        }}>
          <div style={{
            background: "#fff", color: "#111",
            padding: "8px 16px", borderRadius: 3,
            fontFamily: "monospace", fontSize: 14, fontWeight: "bold",
            letterSpacing: 0.5,
            boxShadow: "0 2px 14px rgba(0,0,0,0.5)",
          }}>
            Trust me. Type: &quot;GEXEL&quot;
          </div>
        </div>
      )}

      <div className={stage === "glitching" ? "gexel-glitching" : undefined} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div style={{ background: "#2d2d2d", borderBottom: "1px solid #444", padding: "5px 12px", display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
        <select value={font} onChange={e => setFont(e.target.value)} style={selectStyle}>{FONTS.map(f => <option key={f}>{f}</option>)}</select>
        <select value={size} onChange={e => setSize(Number(e.target.value))} style={{ ...selectStyle, width: 55 }}>{SIZES.map(s => <option key={s}>{s}</option>)}</select>
        <button style={{ ...ribbonBtn, fontWeight: "bold", background: bold ? "#2ea84a" : "#3a3a3a", border: bold ? "1px solid #1a5c37" : ribbonBtn.border }} onClick={() => setBold(b => !b)}>B</button>
        <button style={{ ...ribbonBtn, fontStyle: "italic", background: italic ? "#2ea84a" : "#3a3a3a", border: italic ? "1px solid #1a5c37" : ribbonBtn.border }} onClick={() => setItalic(i => !i)}>I</button>
        <button style={{ ...ribbonBtn, textDecoration: "underline", background: underline ? "#2ea84a" : "#3a3a3a", border: underline ? "1px solid #1a5c37" : ribbonBtn.border }} onClick={() => setUnderline(u => !u)}>U</button>
        <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ width: 30, height: 26, cursor: "pointer", border: "1px solid #555", borderRadius: 2, padding: 1 }} />
        <button style={{ ...ribbonBtn, background: "#2ea84a", color: "white", border: "1px solid #1a5c37" }} onClick={applyStyle}>Apply</button>
      </div>
      <div style={{ background: "#2a2a2a", borderBottom: "1px solid #444", padding: "3px 8px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <span style={{ width: 40, textAlign: "center", border: "1px solid #555", padding: "1px 4px", color: "#e0e0e0" }}>{COL_LETTERS[selected.c]}{selected.r + 1}</span>
        <span style={{ color: "#aaa" }}>fx</span>
        <input style={{ flex: 1, border: "none", outline: "none", fontSize: 13, background: "transparent", color: "#e0e0e0" }} value={cells[selKey] || ""} onChange={e => updateCell(selKey, e.target.value)} disabled={stage === "hint"} />
      </div>
      <div className="gexel-grid-scroll" style={{ overflowX: "auto", overflowY: "auto", flex: 1, background: "#1e1e1e" }}>
        <table style={{ borderCollapse: "collapse", tableLayout: "fixed" }}>
          <thead>
            <tr>
              <th style={cornerCell} />
              {COL_LETTERS.slice(0, NORMAL_COLS).map(l => <th key={l} style={headerCell}>{l}</th>)}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: NORMAL_ROWS }, (_, r) => (
              <tr key={r}>
                <td style={rowHeader}>{r + 1}</td>
                {COL_LETTERS.slice(0, NORMAL_COLS).map((_, c) => {
                  const key = `${r}-${c}`;
                  const isSel = selected.r === r && selected.c === c;
                  return (
                    <td key={c} style={{ width: 80, minWidth: 80, height: 22, padding: "0 4px", background: isSel ? "#1a3a5c" : "#1e1e1e", border: isSel ? "2px solid #4a9eff" : "1px solid #333" }} onClick={() => onSelectCell(r, c)}>
                      <input style={{ width: "100%", border: "none", outline: "none", background: "transparent", padding: 0, color: "#e0e0e0", fontSize: 13, ...getStyle(key) }}
                        value={cells[key] || ""}
                        onChange={e => updateCell(key, e.target.value)}
                        onFocus={() => onSelectCell(r, c)}
                        onBlur={applyStyle}
                        disabled={stage === "hint"} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>
    </AppShell>
  );
}