// Shared with lucastang.dev/gexel/index.html, which renders the actual
// leaderboard panel — this module only needs to submit a finished compete
// run's score. Placeholder subdomain, same pattern as GITHUB_API_URL in
// lucastang.dev/boot.js: replace after `wrangler deploy`.
const LEADERBOARD_API_URL = "https://lucastang-dev-api.lucastang.workers.dev/api/leaderboard";

const LOCAL_KEY = "gexel_leaderboard_local";
const MAX_LOCAL_ENTRIES = 25;

function readLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeLocal(entries) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(entries.slice(-MAX_LOCAL_ENTRIES)));
}

// Saves locally first so the run is never lost if the network call fails,
// then best-effort mirrors it to the shared worker leaderboard.
export async function submitScore(name, score) {
  const entry = { name, score };
  writeLocal([...readLocal(), entry]);
  try {
    await fetch(LEADERBOARD_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
  } catch {
    // offline or worker not deployed yet — the local copy above still counts
  }
  return entry;
}
