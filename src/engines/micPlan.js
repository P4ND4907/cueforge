export const micProcessingPlan = {
  modules: [
    'input_gain_check',
    'noise_floor_estimate',
    'clip_risk',
    'voice_presence',
    'rnnoise_future_adapter',
    'discord_safe_suggestion'
  ],
  rules: {
    neverApplyHiddenGain: true,
    warnBeforeNoiseSuppression: true,
    keepRawAudioLocal: true,
    exportOnlyMetricsByDefault: true
  }
};

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

function inputCount(graph = {}) {
  return graph?.summary?.inputs || graph?.inputPath?.length || 0;
}

export function classifyNoiseFloor(value) {
  const score = clampScore(value);
  if (score >= 68) return 'high';
  if (score >= 32) return 'medium';
  if (score > 0) return 'low';
  return 'unknown';
}

export function classifyClipRisk(value) {
  const score = clampScore(value);
  if (score >= 24) return 'high';
  if (score >= 12) return 'medium';
  if (score > 0) return 'low';
  return 'unknown';
}

function classifyMicStatus({ hasInput, noiseFloor, clipRisk, voicePresence, blockedBy }) {
  if (!hasInput || blockedBy.length) return 'needs input';
  if (clipRisk === 'high') return 'gain too hot';
  if (noiseFloor === 'high') return 'noisy';
  if (clampScore(voicePresence) > 14 || noiseFloor !== 'unknown' || clipRisk !== 'unknown') return 'usable';
  return 'waiting for voice';
}

function recommendationFor({ hasInput, noiseFloor, clipRisk, voicePresence, blockedBy }) {
  if (!hasInput || blockedBy.length) return 'Grant mic permission or run the desktop scan, then confirm Discord input.';
  if (clipRisk === 'high') return 'Lower Windows or Discord mic gain before adding cleanup.';
  if (clipRisk === 'medium') return 'Drop input gain slightly and retest before a match.';
  if (noiseFloor === 'high') return 'Move the mic closer, lower room noise, then try light suppression only after warning.';
  if (noiseFloor === 'medium' && clipRisk === 'low') return 'Lower Discord input sensitivity slightly and run one comms check.';
  if (clampScore(voicePresence) < 18) return 'Move the mic closer or raise input carefully before tuning.';
  return 'Run one Discord or game comms check and save the metric packet.';
}

function futureBackend() {
  return {
    id: 'rnnoise',
    label: 'RNNoise cleanup',
    license: 'BSD-3-Clause',
    mode: 'optional-native-adapter',
    enabled: false,
    appliesHiddenProcessing: false,
    summary: 'RNNoise cleanup available when native engine lands.',
    allowedUses: [
      'optional native mic cleanup',
      'offline mic evidence experiments',
      'player-approved suppression profile'
    ],
    blockedUses: [
      'hidden gain changes',
      'automatic Discord routing changes',
      'uploading raw voice audio by default'
    ]
  };
}

export function buildMicPlan({ graph, conflicts, metrics = {} } = {}) {
  const blockedBy = conflicts?.conflicts?.filter((item) => item.id === 'no-input').map((item) => item.title) || [];
  const hasInput = inputCount(graph) > 0 || Boolean(metrics.inputDetected);
  const normalizedMetrics = {
    inputGainCheck: clampScore(metrics.inputGainCheck ?? metrics.level),
    noiseFloorScore: clampScore(metrics.noiseFloor ?? metrics.noise ?? metrics.noiseRisk),
    clipRiskScore: clampScore(metrics.clipRisk),
    voicePresenceScore: clampScore(metrics.voicePresence)
  };
  const noiseFloor = classifyNoiseFloor(normalizedMetrics.noiseFloorScore);
  const clipRisk = classifyClipRisk(normalizedMetrics.clipRiskScore);
  const micStatus = classifyMicStatus({
    hasInput,
    noiseFloor,
    clipRisk,
    voicePresence: normalizedMetrics.voicePresenceScore,
    blockedBy
  });
  const recommendedAction = recommendationFor({
    hasInput,
    noiseFloor,
    clipRisk,
    voicePresence: normalizedMetrics.voicePresenceScore,
    blockedBy
  });
  const future = futureBackend();

  return {
    schema: 'cueforge.mic-plan.v1',
    status: hasInput ? micStatus : 'needs-input',
    modules: micProcessingPlan.modules,
    rules: micProcessingPlan.rules,
    metrics: normalizedMetrics,
    recommendation: {
      micStatus,
      noiseFloor,
      clipRisk,
      recommendedAction,
      futureModule: future.summary
    },
    futureBackend: future,
    actions: hasInput
      ? [
          'Run Mic Lab live feedback.',
          'Check clipping, noise floor, and voice presence.',
          recommendedAction,
          'Save a short opt-in evidence packet if teammates report issues.'
        ]
      : [
          'Grant mic permission or run the desktop scan.',
          'Confirm Discord input before tuning output EQ.',
          recommendedAction
        ],
    blockedBy
  };
}
