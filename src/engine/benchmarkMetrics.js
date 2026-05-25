export function calculateBinaryMetrics({ expected = [], actual = [], positiveLabel = true } = {}) {
  const length = Math.max(expected.length, actual.length);
  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;

  for (let index = 0; index < length; index += 1) {
    const wanted = expected[index] === positiveLabel;
    const got = actual[index] === positiveLabel;
    if (wanted && got) tp += 1;
    else if (!wanted && got) fp += 1;
    else if (!wanted && !got) tn += 1;
    else fn += 1;
  }

  const precision = safeDivide(tp, tp + fp);
  const recall = safeDivide(tp, tp + fn);
  const falsePositiveRate = safeDivide(fp, fp + tn);

  return {
    schema: 'cueforge.benchmark-metrics.v1',
    count: length,
    tp,
    fp,
    tn,
    fn,
    precision: round3(precision),
    recall: round3(recall),
    falsePositiveRate: round3(falsePositiveRate),
    f1: round3(safeDivide(2 * precision * recall, precision + recall))
  };
}

export function summarizeLatency(latenciesMs = []) {
  const sorted = latenciesMs.map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  return {
    schema: 'cueforge.latency-summary.v1',
    count: sorted.length,
    p50: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    max: sorted.length ? Math.round(sorted[sorted.length - 1]) : 0
  };
}

function percentile(sorted, ratio) {
  if (!sorted.length) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1));
  return Math.round(sorted[index]);
}

function safeDivide(numerator, denominator) {
  return denominator ? numerator / denominator : 0;
}

function round3(value) {
  return Number(value.toFixed(3));
}
