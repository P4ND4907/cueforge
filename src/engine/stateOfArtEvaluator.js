export const sotaReadinessChecks = [
  { id: 'wavFeatures', label: 'Real WAV feature extraction', weight: 14 },
  { id: 'stft', label: 'STFT / FFT analysis', weight: 12 },
  { id: 'temporalEvidence', label: 'Temporal evidence accumulation', weight: 10 },
  { id: 'sceneInference', label: 'Sound-scene inference with confidence boundaries', weight: 10 },
  { id: 'gameEngineMap', label: 'Game engine / routing map', weight: 8 },
  { id: 'problemMap', label: 'Common problem database', weight: 8 },
  { id: 'goldenWavTests', label: 'Golden WAV clip tests', weight: 10 },
  { id: 'benchmarkMetrics', label: 'Precision/recall/latency metrics', weight: 8 },
  { id: 'wasapiCapture', label: 'Live WASAPI loopback capture', weight: 10 },
  { id: 'mlSeldModel', label: 'Optional SELD / acoustic imaging model', weight: 6 },
  { id: 'userValidation', label: 'Real player validation data', weight: 4 }
];

export function evaluateStateOfArtReadiness(capabilities = {}) {
  const checks = sotaReadinessChecks.map((check) => ({
    ...check,
    ready: Boolean(capabilities[check.id])
  }));
  const score = checks.reduce((total, check) => total + (check.ready ? check.weight : 0), 0);

  return {
    schema: 'cueforge.sota-readiness.v1',
    score,
    tier: classifyTier(score),
    checks,
    blockers: checks.filter((check) => !check.ready).map((check) => check.label),
    honestyRule: 'Do not claim true game-world position without metadata, surround/object input, or validated inference.'
  };
}

function classifyTier(score) {
  if (score >= 86) return 'state-of-art-candidate';
  if (score >= 66) return 'advanced-prototype';
  if (score >= 42) return 'research-prototype';
  return 'scaffold';
}
