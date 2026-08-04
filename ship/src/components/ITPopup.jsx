export default function ITPopup({ message, style = {} }) {
  if (!message) return null;
  return (
    <div style={{
      position: "absolute", top: 38, right: 8, zIndex: 50,
       maxWidth: 230,
      background: "#fff", color:"#1a1a1a",
      border: "1px solid #c9c9c9", borderRadius: 4,
      padding: "7px 11px",
      fontFamily: "monospace", fontSize: 12, lineHeight: 1.4,
      boxShadow: "0 2px 10px rgba(0,0,0,0.45)",
      pointerEvents: "none",
      ...style,
    }}>
      <span style={{ fontWeight: "bold" }}>IT: </span>{message}
    </div>
  );
}
