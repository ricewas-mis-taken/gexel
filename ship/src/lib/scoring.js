export function computeScore({ elapsedMs, coinsEarned, deathsTotal }) {
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  const deathMultiplier = 1 + deathsTotal / 10;
  const score = 1000000 - elapsedSeconds * 1000 * deathMultiplier + coinsEarned * elapsedSeconds;
  return Math.max(0, Math.round(score));
}
