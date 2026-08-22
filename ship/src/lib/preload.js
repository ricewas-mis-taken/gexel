// Every image/audio file under src/assets, resolved to its built URL at
// build time via import.meta.glob (no dynamic import cost — Vite inlines
// the URL map directly into the bundle).
const imageAssets = import.meta.glob("../assets/**/*.{png,jpg,jpeg,gif,webp,svg}", { eager: true, import: "default" });
const audioAssets = import.meta.glob("../assets/**/*.{mp3,wav}", { eager: true, import: "default" });

let started = false;

// Kicks off background fetches for every game asset so they're already in
// the browser's HTTP cache by the time the player reaches a minigame,
// instead of each game paying its own load cost the first time it mounts.
// Fire-and-forget: images/audio load opportunistically alongside whatever
// else the page is doing, and a slow connection just means some assets
// aren't warm yet rather than blocking anything.
export function preloadGameAssets() {
  if (started) return;
  started = true;
  for (const src of Object.values(imageAssets)) {
    const img = new Image();
    img.src = src;
  }
  for (const src of Object.values(audioAssets)) {
    const audio = new Audio();
    audio.preload = "auto";
    audio.src = src;
  }
}
