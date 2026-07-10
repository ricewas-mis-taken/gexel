import ramCoinImg from "../assets/ram-coin.png";
import { useCoins } from "./CoinContext";

export default function CoinCounter()
{
  const { coins, sessionCoins } = useCoins();
  return (
    <div style={{
        position: "absolute", top: 38, right: 8, zIndex: 50,
        display: "flex", alignItems: "center", gap: 6,
      background: "rgba(0,0,0,0.55)", border: "1px solid #2ea84a",
      borderRadius: 4, padding: "3px 10px",
      fontFamily: "monospace", color: "#fff", fontSize: 13,
      pointerEvents: "none",
    }}>
      <img src={ramCoinImg} alt="coin" style={{ width:18, height:18, imageRendering: "pixelated" }} />
      <span>x{coins+sessionCoins}</span>
    </div>
  );
}
