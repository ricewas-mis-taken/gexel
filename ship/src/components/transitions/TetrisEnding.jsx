export default function TetrisEnding({onFinish}) {
  return (
    <div style={{
      width: "100vw", height: "100vh", background: "#000",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      color: "#2ea84a", fontFamily: "'PokemonClassic', monospace", gap: 20,
    }}>
      <div style={{ fontSize: 28,   letterSpacing: 3, textShadow: "0 0 16px #2ea84a" }}>
        TETRIS COMPLETE
      </div>
      <div style={{ fontSize: 12, color: "#aaa" }}>
        You retrieved the artifact.
      </div>
      {onFinish && (
        <button onClick={onFinish} style={{
          marginTop: 10, background: "#000", border: "3px solid #2ea84a", borderRadius: 3,
          color: "#2ea84a", fontFamily: "'PokemonClassic', monospace",
          fontSize: 12, padding: "10px 30px", cursor: "pointer", letterSpacing: 1,
        }}>
          CONTINUE ▼
        </button>
      )}
    </div>
  );
}
