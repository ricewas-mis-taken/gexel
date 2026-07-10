export function playSafely(audio) {
  const attempt = ()=> audio.play();
    attempt().catch(() => {
    const retry = () => {
        attempt().catch(() => {});
    };
    window.addEventListener("pointerdown", retry, { once: true });
        window.addEventListener("keydown", retry, {once: true});
  });
}
