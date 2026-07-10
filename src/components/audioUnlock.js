export function ensureAudioPlays(audio, isStillWanted = () => true)
{
  if (!audio) return () => {};
  const tryPlay = () => {
      if (audio.paused && isStillWanted()) audio.play().catch(() => {});
  };
  tryPlay();
  window.addEventListener("pointerdown", tryPlay);
   window.addEventListener("keydown", tryPlay);
  const intervalId=setInterval(tryPlay, 200);

  return () => {
    window.removeEventListener("pointerdown", tryPlay);
    window.removeEventListener("keydown", tryPlay);
        clearInterval(intervalId);
  };
}
