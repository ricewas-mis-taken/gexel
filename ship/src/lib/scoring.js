const BASE_SCORE = 1000000;

// Additive decomposition of the score formula (base - time*deathMultiplier +
// coinBonus) so the reveal screen can tally it line by line: base, then a
// pure time penalty, then the extra penalty the death multiplier adds on
// top of it, then the coin bonus. Summing every field except elapsedSeconds
// and score reproduces the original formula exactly.
export function computeScoreBreakdown({ elapsedMs, coinsEarned, deathsTotal }) {
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  const timePenalty = elapsedSeconds * 1000;
  const deathPenalty = Math.round(elapsedSeconds * 1000 * (deathsTotal / 10));
  const coinBonus = coinsEarned * elapsedSeconds;
  const raw = BASE_SCORE - timePenalty - deathPenalty + coinBonus;
  const score = Math.max(0, Math.round(raw));
  return { elapsedSeconds, base: BASE_SCORE, timePenalty, deathPenalty, coinBonus, score };
}

export function computeScore(stats) {
  return computeScoreBreakdown(stats).score;
}
