// PLACEHOLDER — the user hasn't decided the real scoring formula yet.
// Swap this out once that's settled; nothing else needs to change, every
// caller just imports computeScore from here.
export function computeScore({ elapsedMs, coinsEarned, deathsTotal }) {
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  const score = 1000000 - elapsedSeconds * 100 + coinsEarned * 10 - deathsTotal * 500;
  return Math.max(0, Math.round(score));
}
