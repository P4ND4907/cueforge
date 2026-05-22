export const hearingFrequencies = [250, 500, 1000, 2000, 4000, 8000];

export function createEmptyHearingResults() {
  return {
    left: Object.fromEntries(hearingFrequencies.map((frequency) => [frequency, null])),
    right: Object.fromEntries(hearingFrequencies.map((frequency) => [frequency, null]))
  };
}

export function calculateCompensation(results) {
  return hearingFrequencies.map((frequency) => {
    const left = results.left[frequency];
    const right = results.right[frequency];
    const leftBoost = left === false ? 2.5 : left === true ? 0 : 1.2;
    const rightBoost = right === false ? 2.5 : right === true ? 0 : 1.2;
    return {
      frequency,
      leftDb: Number(leftBoost.toFixed(1)),
      rightDb: Number(rightBoost.toFixed(1)),
      averageDb: Number(((leftBoost + rightBoost) / 2).toFixed(1))
    };
  });
}

export function hearingScore(results) {
  const values = hearingFrequencies.flatMap((frequency) => [results.left[frequency], results.right[frequency]]);
  const answered = values.filter((value) => value !== null).length;
  const heard = values.filter(Boolean).length;
  return {
    answered,
    total: values.length,
    percentHeard: answered ? Math.round((heard / answered) * 100) : 0,
    complete: answered === values.length
  };
}

export function buildHearingApoOverlay(compensation) {
  const maxBoost = Math.max(...compensation.map((point) => point.averageDb));
  const preamp = Math.min(-2, -1 * (maxBoost + 1));
  const lines = [`Preamp: ${preamp.toFixed(1)} dB`];
  compensation.forEach((point, index) => {
    if (point.averageDb > 0) {
      lines.push(`Filter ${index + 1}: ON PK Fc ${point.frequency} Hz Gain ${point.averageDb.toFixed(1)} dB Q 1.00`);
    }
  });
  return lines.join('\n');
}
