export function cancelFade(audio) {
  if (audio && audio.__fadeIntervalId) {
    clearInterval(audio.__fadeIntervalId);
    audio.__fadeIntervalId = null;
  }
}

export function fadeOutAudio(audio, duration = 400)
{
  if (!audio) return;
  cancelFade(audio);
    const steps=12;
  const stepTime = duration/steps;
  const startVol   = audio.volume;
  let i = 0;
  const id = setInterval(() => {
    i++;
        audio.volume = Math.max(0, startVol * (1 - i / steps));
    if (i >= steps) {
      clearInterval(id);
      audio.__fadeIntervalId = null;
      audio.pause();
	  audio.currentTime = 0;
    }
  }, stepTime);
  audio.__fadeIntervalId = id;
}
