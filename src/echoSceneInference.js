const SAFE_EQ = Object.freeze([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

export const echoSceneBoundary = Object.freeze({
  accessLevel: 'post-mix-inference',
  canInfer: [
    'relative masking pressure',
    'lateral balance stability',
    'high-frequency damping proxy',
    'temporal consistency',
    'routing or layer instability clues'
  ],
  cannotInfer: [
    'true game object positions',
    'room geometry',
    'line-of-sight or portal state',
    'source labels such as enemy, teammate, door, or weapon',
    'the game engine occlusion value unless the game exposes it'
  ]
});

export function createEchoSceneFrame({
  timestampMs = Date.now(),
  analysis = null,
  leftLevel = null,
  rightLevel = null,
  source = 'post-mix'
} = {}) {
  const bands = normalizeBands(analysis?.bands);
  const lateralBalance = calculateLateralBalance(leftLevel, rightLevel);

  return {
    schema: 'cueforge.echo-scene-frame.v1',
    timestampMs: Math.max(0, Math.round(Number(timestampMs) || 0)),
    source: String(source || 'post-mix').slice(0, 48),
    level: clampNumber(analysis?.level),
    peak: clampNumber(analysis?.peak),
    clipRisk: clampNumber(analysis?.clipRisk),
    noiseRisk: clampNumber(analysis?.noiseRisk),
    cueStrength: clampNumber(analysis?.cueStrength),
    voicePresence: clampNumber(analysis?.voicePresence),
    fpsClarity: clampNumber(analysis?.fpsClarity),
    dynamicRange: clampNumber(analysis?.dynamicRange),
    spectralCentroidHz: Math.max(0, Math.round(Number(analysis?.spectralCentroidHz) || 0)),
    spectralRolloffHz: Math.max(0, Math.round(Number(analysis?.spectralRolloffHz) || 0)),
    spectralFlatness: clampFloat(analysis?.spectralFlatness, 0, 1),
    lateralBalance,
    hasStereoEvidence: Number.isFinite(lateralBalance),
    bands
  };
}

export function inferEchoScene({ frames = [], gameEngine = 'unknown', matchContext = '' } = {}) {
  const normalizedFrames = frames
    .map((frame) => (frame?.schema === 'cueforge.echo-scene-frame.v1' ? frame : createEchoSceneFrame(frame)))
    .filter((frame) => frame.timestampMs >= 0)
    .sort((a, b) => a.timestampMs - b.timestampMs);

  if (!normalizedFrames.length) return createEmptyEchoScene({ gameEngine, matchContext });

  const bands = averageBands(normalizedFrames);
  const stereoFrames = normalizedFrames.filter((frame) => frame.hasStereoEvidence);
  const lateralValues = stereoFrames.map((frame) => frame.lateralBalance);
  const levelValues = normalizedFrames.map((frame) => frame.level);
  const rolloffValues = normalizedFrames.map((frame) => frame.spectralRolloffHz);
  const cueValues = normalizedFrames.map((frame) => frame.cueStrength);
  const clipRisk = average(normalizedFrames.map((frame) => frame.clipRisk));
  const cueStrength = average(cueValues);
  const fpsClarity = average(normalizedFrames.map((frame) => frame.fpsClarity));
  const lowPressure = average([bands.rumble, bands.bass, bands.lowMid]);
  const cueWindow = average([bands.presence, bands.cue]);
  const highAir = average([bands.edge, bands.air]);
  const maskingPressure = clampNumber(lowPressure * 0.62 + bands.lowMid * 0.34 + Math.max(0, 46 - cueStrength) * 0.38);
  const highFrequencyDamping = clampNumber(58 + lowPressure * 0.42 - cueWindow * 0.36 - highAir * 0.18 - trend(rolloffValues) / 140);
  const lateralStability = stereoFrames.length
    ? clampNumber(100 - standardDeviation(lateralValues) * 3.2)
    : 0;
  const temporalStability = clampNumber(100 - standardDeviation(levelValues) * 2.3 - Math.abs(trend(levelValues)) * 0.7);
  const reflectionProxy = clampNumber(
    average(normalizedFrames.map((frame) => frame.spectralFlatness * 100)) * 0.46
      + highAir * 0.2
      + Math.max(0, 100 - temporalStability) * 0.24
  );
  const evidenceScore = clampNumber(
    20
      + Math.min(normalizedFrames.length, 12) * 4
      + (stereoFrames.length ? 14 : 0)
      + (temporalStability > 55 ? 12 : 0)
      - (clipRisk > 20 ? 16 : 0)
  );
  const likelyProblem = classifyEchoScene({
    frameCount: normalizedFrames.length,
    stereoCount: stereoFrames.length,
    clipRisk,
    maskingPressure,
    highFrequencyDamping,
    lateralStability,
    temporalStability,
    cueStrength,
    fpsClarity
  });

  return {
    schema: 'cueforge.echo-scene-inference.v1',
    generatedAt: new Date().toISOString(),
    gameEngine: String(gameEngine || 'unknown').slice(0, 80),
    matchContext: String(matchContext || '').slice(0, 160),
    boundary: echoSceneBoundary,
    evidence: {
      frameCount: normalizedFrames.length,
      stereoFrameCount: stereoFrames.length,
      evidenceScore,
      temporalStability,
      lateralStability,
      maskingPressure,
      highFrequencyDamping,
      reflectionProxy,
      cueStrength: clampNumber(cueStrength),
      fpsClarity: clampNumber(fpsClarity),
      averageBands: bands
    },
    likelyProblem,
    confidence: buildConfidence({ likelyProblem, evidenceScore, stereoFrames: stereoFrames.length, clipRisk }),
    explanation: buildExplanation(likelyProblem),
    recommendedAction: buildRecommendedAction(likelyProblem),
    nextTest: buildNextTest(likelyProblem),
    eqNudge: buildEchoEqNudge(likelyProblem)
  };
}

export function buildEngineTelemetryAsk(engine = 'unknown') {
  const normalized = String(engine || 'unknown').toLowerCase();
  const shared = [
    'expose listener orientation if available',
    'separate game, chat, and mic capture when possible',
    'tag reports with map, mode, patch, and audio setting names'
  ];

  if (normalized.includes('wwise')) {
    return [...shared, 'ask for room/portal, diffraction, and transmission-loss debug values'];
  }
  if (normalized.includes('unreal')) {
    return [...shared, 'ask for attenuation, spatialization, occlusion, obstruction, and reverb setting snapshots'];
  }
  if (normalized.includes('unity')) {
    return [...shared, 'ask whether a spatializer plugin is active and whether per-source spatializer metadata is exposed'];
  }
  if (normalized.includes('steam')) {
    return [...shared, 'ask for HRTF, occlusion, reflections, pathing, and air-absorption settings'];
  }
  if (normalized.includes('fmod')) {
    return [...shared, 'ask for spatializer, distance attenuation, occlusion, and event routing state'];
  }
  return [...shared, 'ask whether the game exposes any spatial-audio debug telemetry'];
}

function createEmptyEchoScene({ gameEngine, matchContext }) {
  return {
    schema: 'cueforge.echo-scene-inference.v1',
    generatedAt: new Date().toISOString(),
    gameEngine: String(gameEngine || 'unknown').slice(0, 80),
    matchContext: String(matchContext || '').slice(0, 160),
    boundary: echoSceneBoundary,
    evidence: {
      frameCount: 0,
      stereoFrameCount: 0,
      evidenceScore: 0,
      temporalStability: 0,
      lateralStability: 0,
      maskingPressure: 0,
      highFrequencyDamping: 0,
      reflectionProxy: 0,
      cueStrength: 0,
      fpsClarity: 0,
      averageBands: normalizeBands()
    },
    likelyProblem: 'needs-evidence',
    confidence: 'low',
    explanation: 'No usable scene evidence has been collected yet.',
    recommendedAction: 'Capture a short controlled sample or one match segment before changing EQ.',
    nextTest: 'Run one repeatable left/right/center or real-match check and save the evidence packet.',
    eqNudge: [...SAFE_EQ]
  };
}

function classifyEchoScene({
  frameCount,
  stereoCount,
  clipRisk,
  maskingPressure,
  highFrequencyDamping,
  lateralStability,
  temporalStability,
  cueStrength,
  fpsClarity
}) {
  if (frameCount < 4) return 'needs-more-evidence';
  if (clipRisk > 24) return 'measurement-invalid-clipping';
  if (stereoCount && lateralStability < 38 && temporalStability < 62) return 'unstable-pan-or-layering';
  if (highFrequencyDamping > 68 && cueStrength < 48) return 'occlusion-or-wall-filtering-proxy';
  if (maskingPressure > 66 && cueStrength < 58) return 'masking-before-eq';
  if (fpsClarity < 45 && temporalStability > 58) return 'game-mix-or-server-suspect';
  return 'scene-stable';
}

function buildConfidence({ likelyProblem, evidenceScore, stereoFrames, clipRisk }) {
  if (likelyProblem === 'measurement-invalid-clipping') return 'blocked';
  if (evidenceScore >= 78 && stereoFrames >= 4 && clipRisk < 12) return 'high';
  if (evidenceScore >= 55) return 'medium';
  return 'low';
}

function buildExplanation(problem) {
  const messages = {
    'needs-more-evidence': 'The analyzer needs repeated samples before it can separate a one-off sound from a pattern.',
    'measurement-invalid-clipping': 'The capture is clipping, so spatial or masking conclusions would be untrustworthy.',
    'unstable-pan-or-layering': 'Left/right balance is moving too much across frames. This can happen with duplicate spatial layers, virtual mixers, or game panning instability.',
    'occlusion-or-wall-filtering-proxy': 'The post-mix stream looks like high-frequency detail is being damped while low energy remains. That can resemble wall filtering or occlusion, but CueForge cannot prove geometry from the final mix alone.',
    'masking-before-eq': 'Low and low-mid energy is likely covering the cue window. Fix masking before boosting footsteps.',
    'game-mix-or-server-suspect': 'The signal is stable but clarity is weak, so the issue may be game mix, map behavior, server timing, or source routing rather than global EQ.',
    'scene-stable': 'The evidence looks stable enough to use as a baseline for a before/after match test.'
  };
  return messages[problem] || messages['scene-stable'];
}

function buildRecommendedAction(problem) {
  const actions = {
    'needs-more-evidence': 'Collect 8-12 short frames from the same map, mode, and route.',
    'measurement-invalid-clipping': 'Lower gain first, then rerun the same capture. Do not tune from clipped evidence.',
    'unstable-pan-or-layering': 'Disable duplicate spatial layers, confirm stereo output, and compare game-only audio against game plus Discord/Sonar.',
    'occlusion-or-wall-filtering-proxy': 'Do a map-specific check before changing global EQ. Ask testers whether the issue appears around walls, stairs, doors, or room transitions.',
    'masking-before-eq': 'Trim rumble/low-mid pressure and test whether cue clarity improves without adding harsh treble.',
    'game-mix-or-server-suspect': 'Tag the report with game, map, patch, server, and audio settings. Avoid overfitting a global profile.',
    'scene-stable': 'Save this as the baseline and run one controlled profile change.'
  };
  return actions[problem] || actions['scene-stable'];
}

function buildNextTest(problem) {
  const tests = {
    'needs-more-evidence': 'Repeat the same walk route three times and compare frame stability.',
    'measurement-invalid-clipping': 'Record 12 seconds after lowering input or output gain.',
    'unstable-pan-or-layering': 'Run left/right/center, then one game-only clip with all external spatial processing off.',
    'occlusion-or-wall-filtering-proxy': 'Test one door, one stairwell, and one open space, then compare high-frequency damping.',
    'masking-before-eq': 'Play one chaotic fight and one quiet route with the same EQ, then compare masking pressure.',
    'game-mix-or-server-suspect': 'Compare offline/training range against a live server before changing EQ.',
    'scene-stable': 'Apply one small EQ nudge and run a before/after player trial.'
  };
  return tests[problem] || tests['scene-stable'];
}

function buildEchoEqNudge(problem) {
  const nudges = {
    'needs-more-evidence': SAFE_EQ,
    'measurement-invalid-clipping': SAFE_EQ,
    'unstable-pan-or-layering': SAFE_EQ,
    'occlusion-or-wall-filtering-proxy': [-0.2, -0.2, -0.1, 0, 0.1, 0.2, 0.4, 0.3, -0.1, -0.2],
    'masking-before-eq': [-0.9, -0.8, -0.5, -0.2, 0, 0.2, 0.5, 0.4, -0.2, -0.3],
    'game-mix-or-server-suspect': [-0.2, -0.2, 0, 0, 0.1, 0.2, 0.2, 0.2, 0, 0],
    'scene-stable': SAFE_EQ
  };
  return [...(nudges[problem] || SAFE_EQ)];
}

function normalizeBands(bands = {}) {
  return {
    rumble: clampNumber(bands.rumble),
    bass: clampNumber(bands.bass),
    lowMid: clampNumber(bands.lowMid),
    voice: clampNumber(bands.voice),
    presence: clampNumber(bands.presence),
    cue: clampNumber(bands.cue),
    edge: clampNumber(bands.edge),
    air: clampNumber(bands.air)
  };
}

function averageBands(frames) {
  const keys = Object.keys(normalizeBands());
  return Object.fromEntries(keys.map((key) => [key, clampNumber(average(frames.map((frame) => frame.bands[key])))]));
}

function calculateLateralBalance(leftLevel, rightLevel) {
  const left = Number(leftLevel);
  const right = Number(rightLevel);
  if (!Number.isFinite(left) || !Number.isFinite(right)) return null;
  const total = Math.max(0.000001, Math.abs(left) + Math.abs(right));
  return Math.round(((right - left) / total) * 100);
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

function trend(values) {
  const clean = values.map(Number).filter(Number.isFinite);
  if (clean.length < 2) return 0;
  return clean[clean.length - 1] - clean[0];
}

function clampNumber(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

function clampFloat(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}
