export function smoothEqCurve(eq = [], maxStep = 2.4) {
  if (!Array.isArray(eq) || !eq.length) return [];
  return eq.map((gain, index) => {
    const previous = index > 0 ? eq[index - 1] : gain;
    const next = index < eq.length - 1 ? eq[index + 1] : gain;
    const averaged = (Number(previous) + Number(gain) * 2 + Number(next)) / 4;
    const delta = averaged - Number(gain);
    return Number((Number(gain) + Math.max(-maxStep, Math.min(maxStep, delta))).toFixed(2));
  });
}

export function estimateHeadroom(eq = []) {
  const maxBoost = Math.max(0, ...eq.map((gain) => Number(gain) || 0));
  return {
    maxBoost: Number(maxBoost.toFixed(2)),
    recommendedPreamp: Number((-1 * (maxBoost + 1)).toFixed(1))
  };
}
