const AudioContextClass =
  typeof window !== "undefined" ? window.AudioContext || window.webkitAudioContext : null;

let sharedCtx = null;
function getContext()
{
    if (!sharedCtx && AudioContextClass) sharedCtx = new AudioContextClass();
  return sharedCtx;
}

const bufferCache = new Map();
function loadBuffer(url) {
  const ctx=getContext();
  if (!ctx) return Promise.reject(new Error("Web Audio unavailable"));
  if (!bufferCache.has(url)) {
    bufferCache.set(
      url,
      fetch(url)
        .then((res) => res.arrayBuffer())
        .then((data) => ctx.decodeAudioData(data))
    );
  }
  return bufferCache.get(url);
}

export function unlockWebAudio() {
  const ctx = getContext();
  if (!ctx) return () => {};
  const resume = () => {
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
  };
  resume();
  window.addEventListener("pointerdown", resume);
  window.addEventListener("keydown", resume);
  return () => {
    window.removeEventListener("pointerdown", resume);
    window.removeEventListener("keydown", resume);
  };
}

export function createLoopPlayer(url, { loopStart = 0, loopEnd = null, volume = 1 } = {})
{
  const ctx = getContext();
  const ready=ctx ? loadBuffer(url).catch(() => null) : Promise.resolve(null);
  let source = null;
  let gainNode=null;
  let wantPlaying = false;
   let currentVolume = volume;

  const teardownSource = () => {
    if (source) {
      try { source.stop(); } catch {}
      source.disconnect();
      source = null;
    }
    if (gainNode) {
        gainNode.disconnect();
      gainNode = null;
    }
  };

  const start = () => {
    if (wantPlaying) return;
      wantPlaying = true;
    ready.then((buffer) => {
      if (!wantPlaying || !buffer || !ctx) return;
      source = ctx.createBufferSource();
      source.buffer=buffer;
      source.loop = true;
      source.loopStart = loopStart;
      source.loopEnd  =  loopEnd || buffer.duration;
      gainNode = ctx.createGain();
      gainNode.gain.value = currentVolume;
      source.connect(gainNode).connect(ctx.destination);
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      source.start(0);
    });
  };

  const stop = () => {
    wantPlaying = false;
teardownSource();
  };

  const restart = () => {
    teardownSource();
    wantPlaying = false;
    start();
  };

  const setVolume = (v) => {
    currentVolume = v;
    if (gainNode) gainNode.gain.value = v;
  };

  const isPlaying = () => wantPlaying;

  const fadeOut = (duration = 400) => {
    if (!gainNode) { stop(); return; }
    const steps = 12;
    const stepTime = duration / steps;
    const startVol = currentVolume;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setVolume(Math.max(0, startVol * (1 - i / steps)));
      if (i >= steps) {
        clearInterval(id);
        stop();
      }
    }, stepTime);
  };

  return { start, stop, restart, setVolume, isPlaying, fadeOut };
}
