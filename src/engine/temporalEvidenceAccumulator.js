export function accumulateTemporalEvidence(frames = [], {
  maxFrames = 24,
  weakCueThreshold = 45,
  strongCueThreshold = 62
} = {}) {
  const samples = frames
    .filter(Boolean)
    .slice(-Math.max(1, maxFrames))
    .map((frame, index) => normalizeFrame(frame, index));

  if (!samples.length) {
    return {
      schema: 'cueforge.temporal-evidence.v1',
      frameCount: 0,
      weakCuePulses: 0,
      strongCuePulses: 0,
      persistentMasking: 0,
      temporalConfidence: 0,
      state: 'needs-evidence',
      explanation: 'No frames have been accumulated yet.'
    };
  }

  const weakCuePulses = samples.filter((frame) => frame.cueStrength >= weakCueThreshold).length;
  const strongCuePulses = samples.filter((frame) => frame.cueStrength >= strongCueThreshold).length;
  const persistentMasking = samples.filter((frame) => frame.maskingPressure >= 58).length;
  const usableFrames = samples.filter((frame) => frame.clipRisk < 20).length;
  const stability = 100 - standardDeviation(samples.map((frame) => frame.cueStrength)) * 1.8;
  const confidence = clamp(
    Math.round(
      weakCuePulses * 5.2
      + strongCuePulses * 7.4
      + usableFrames * 2.1
      + Math.max(0, stability) * 0.18
      - persistentMasking * 2.2
    ),
    0,
    100
  );

  return {
    schema: 'cueforge.temporal-evidence.v1',
    frameCount: samples.length,
    weakCuePulses,
    strongCuePulses,
    persistentMasking,
    temporalConfidence: confidence,
    state: classifyTemporalState({ confidence, weakCuePulses, strongCuePulses, persistentMasking, usableFrames }),
    explanation: buildExplanation({ weakCuePulses, strongCuePulses, persistentMasking, usableFrames })
  };
}

function normalizeFrame(frame, index) {
  const bands = frame.bands || {};
  const lowMask = average([bands.rumble, bands.bass, bands.lowMid]);
  return {
    index,
    cueStrength: clamp(Math.round(Number(frame.cueStrength ?? average([bands.presence, bands.cue])) || 0), 0, 100),
    maskingPressure: clamp(Math.round(Number(frame.maskingPressure ?? lowMask) || 0), 0, 100),
    clipRisk: clamp(Math.round(Number(frame.clipRisk) || 0), 0, 100)
  };
}

function classifyTemporalState({ confidence, weakCuePulses, strongCuePulses, persistentMasking, usableFrames }) {
  if (usableFrames < 3) return 'blocked-by-bad-capture';
  if (persistentMasking > weakCuePulses && persistentMasking >= 4) return 'persistent-masking';
  if (confidence >= 72 && strongCuePulses >= 3) return 'reliable-track';
  if (confidence >= 40 && weakCuePulses >= 3) return 'forming-track';
  return 'needs-more-evidence';
}

function buildExplanation({ weakCuePulses, strongCuePulses, persistentMasking, usableFrames }) {
  if (usableFrames < 3) return 'Most frames are clipped or unusable, so CueForge should not make tuning decisions yet.';
  if (persistentMasking > weakCuePulses && persistentMasking >= 4) return 'Masking repeats across time, so fix the masking layer before boosting cue bands.';
  if (strongCuePulses >= 3) return 'Repeated cue pulses formed a reliable movement-style track.';
  if (weakCuePulses >= 3) return 'Weak cues repeat enough to keep watching, but the app should avoid aggressive EQ.';
  return 'The cue has not repeated enough to separate a pattern from a one-off sound.';
}

function average(values) {
  const clean = values.map(Number).filter(Number.isFinite);
  if (!clean.length) return 0;
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

function standardDeviation(values) {
  const clean = values.map(Number).filter(Number.isFinite);
  if (clean.length < 2) return 0;
  const mean = average(clean);
  const variance = average(clean.map((value) => (value - mean) ** 2));
  return Math.sqrt(variance);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
