export function clampConfidence(value: number) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

export function combineConfidence(parts: Array<number | null | undefined> = []) {
  const clean = parts.map(Number).filter(Number.isFinite);
  if (!clean.length) return 0;
  return clampConfidence(clean.reduce((sum, value) => sum + value, 0) / clean.length);
}

export function confidenceTier(score: number) {
  const value = clampConfidence(score);
  if (value >= 90) return 'proven';
  if (value >= 75) return 'strong';
  if (value >= 60) return 'usable';
  if (value >= 40) return 'thin';
  return 'unknown';
}
