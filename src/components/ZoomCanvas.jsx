import { useEffect, useRef } from "react";

export default function ZoomCanvas({ onDone })
{
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const W=canvas.width = window.innerWidth;
    const H = canvas.height=window.innerHeight;
    const ctx = canvas.getContext("2d");
    let frame = 0;
      const FRAMES = 140;
    const RINGS = 6;
    let raf;

    const draw = () => {
      const t = frame / FRAMES;
      const fadeOut = Math.max(0, (t - 0.75) / 0.25);
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);
      for (let i = RINGS; i >= 0; i--) {
        const ringT = i / RINGS;
        const closeness = Math.max(0, t - ringT * 0.55);
        const inset = closeness * Math.min(W, H) * 0.9;
        const x = inset, y = inset * (H / W), w = W - x * 2, h = H - y * 2;
        if (w > 2 && h > 2)
        {
          const isWhite = i % 2 === 0;
          const baseColor = isWhite ? 255 : 30;
          for (let g = 18; g >= 0; g--) {
            const alpha = (1 - g / 18) * 0.08 * (1 - fadeOut);
            const expand = g * 6;
            ctx.fillStyle = `rgba(${baseColor},${baseColor},${baseColor},${alpha})`;
            ctx.fillRect(x - expand, y - expand, w + expand * 2, h + expand * 2);
          }
          const brightness = Math.round(baseColor * (1 - fadeOut));
          ctx.fillStyle = `rgb(${brightness},${brightness},${brightness})`;
          ctx.fillRect(x, y, w, h);
          for (let g = 0; g < 10; g++) {
            const alpha = (1 - g / 10) * 0.15 * (1 - fadeOut);
            ctx.fillStyle = `rgba(0,0,0,${alpha})`;
            ctx.fillRect(x + g, y + g, w - g * 2, h - g * 2);
          }
        }
      }
      if (fadeOut > 0) {
        ctx.fillStyle = `rgba(0,0,0,${fadeOut})`;
        ctx.fillRect(0, 0, W, H);
      }
      frame++;
      if (frame <= FRAMES) raf = requestAnimationFrame(draw);
      else onDone();
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", display: "block" }} />;
}