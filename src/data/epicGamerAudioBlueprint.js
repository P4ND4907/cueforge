const channelControlStatus = {
  active: 'active',
  planned: 'planned',
  disabled: 'disabled'
};

export const epicBlueprintSchema = 'cueforge.epic-gamer-audio-blueprint.v1';

export const epicBlueprintSafetyBoundary = {
  localFirst: true,
  noFakeEnabledControls: true,
  noHiddenNativeRouting: true,
  noSilentDriverChanges: true,
  noSilentSystemApply: true,
  noUnsafePresetBehavior: true,
  noRawAudioExportByDefault: true
};

export const gamerAudioChannels = [
  {
    id: 'game',
    label: 'Game',
    role: 'source',
    defaultRoute: ['headphonesOutput', 'streamMix'],
    job: 'Prioritize game cues without damaging headroom, comfort, or stream safety.',
    controls: ['gain', 'mute', 'solo', 'eq', 'compressor', 'limiter', 'clippingIndicator', 'enhancer', 'latencyMeter']
  },
  {
    id: 'voice',
    label: 'Voice / Discord',
    role: 'source',
    defaultRoute: ['headphonesOutput', 'streamMix'],
    job: 'Keep teammate comms clear, centered, and separated from game impact.',
    controls: ['gain', 'mute', 'solo', 'eq', 'compressor', 'limiter', 'clippingIndicator']
  },
  {
    id: 'mic',
    label: 'Mic',
    role: 'capture',
    defaultRoute: ['voiceApps', 'streamMix'],
    job: 'Build a Discord/OBS-safe mic chain without stacking suppressors.',
    controls: ['gain', 'mute', 'noiseGate', 'compressor', 'limiter', 'clippingIndicator', 'noiseSuppressionAdvisor']
  },
  {
    id: 'music',
    label: 'Music',
    role: 'source',
    defaultRoute: ['headphonesOutput', 'streamMix'],
    job: 'Keep music under game and voice while preserving vibe.',
    controls: ['gain', 'mute', 'solo', 'eq', 'compressor', 'limiter', 'clippingIndicator']
  },
  {
    id: 'browser',
    label: 'Browser',
    role: 'source',
    defaultRoute: ['headphonesOutput', 'streamMix'],
    job: 'Make guides, videos, clips, and web audio controllable.',
    controls: ['gain', 'mute', 'solo', 'eq', 'compressor', 'limiter', 'clippingIndicator']
  },
  {
    id: 'streamMix',
    label: 'Stream Mix',
    role: 'bus',
    defaultRoute: ['obs'],
    job: 'Produce a limiter-backed viewer-safe mix for OBS.',
    controls: ['gain', 'mute', 'eq', 'compressor', 'limiter', 'clippingIndicator', 'loudnessTarget']
  },
  {
    id: 'headphonesOutput',
    label: 'Headphones Output',
    role: 'output',
    defaultRoute: ['player'],
    job: 'Deliver the player mix with one clear spatial policy.',
    controls: ['gain', 'mute', 'eq', 'limiter', 'clippingIndicator', 'spatialPolicy', 'latencyMeter']
  }
];

export const channelControlContracts = {
  gain: {
    label: 'Gain',
    status: channelControlStatus.active,
    defaultValue: 0,
    min: -24,
    max: 12,
    unit: 'dB'
  },
  mute: {
    label: 'Mute',
    status: channelControlStatus.active,
    defaultValue: false
  },
  solo: {
    label: 'Solo',
    status: channelControlStatus.active,
    defaultValue: false
  },
  eq: {
    label: 'EQ',
    status: channelControlStatus.active,
    defaultValue: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    bands: [31, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]
  },
  compressor: {
    label: 'Compressor',
    status: channelControlStatus.active,
    defaultValue: { enabled: false, thresholdDb: -18, ratio: 2, attackMs: 10, releaseMs: 120 }
  },
  limiter: {
    label: 'Limiter',
    status: channelControlStatus.active,
    defaultValue: { enabled: true, ceilingDb: -1 }
  },
  noiseGate: {
    label: 'Noise Gate',
    status: channelControlStatus.active,
    defaultValue: { enabled: false, thresholdDb: -45, releaseMs: 100 }
  },
  clippingIndicator: {
    label: 'Clipping Indicator',
    status: channelControlStatus.active,
    defaultValue: { peakDb: -12, clipped: false }
  },
  enhancer: {
    label: 'Enhancer',
    status: channelControlStatus.active,
    defaultValue: { enabled: false, mode: 'off' }
  },
  spatialPolicy: {
    label: 'Spatial Policy',
    status: channelControlStatus.active,
    defaultValue: { mode: 'safe-stereo', externalHrtfAllowed: false }
  },
  latencyMeter: {
    label: 'Latency Meter',
    status: channelControlStatus.active,
    defaultValue: { budgetMs: 30, measuredMs: null, status: 'unknown' }
  },
  loudnessTarget: {
    label: 'Loudness Target',
    status: channelControlStatus.active,
    defaultValue: { enabled: true, targetLufs: -16, truePeakDb: -1 }
  },
  noiseSuppressionAdvisor: {
    label: 'Noise Suppression Advisor',
    status: channelControlStatus.active,
    defaultValue: { mode: 'detect-only', preferredOwner: 'one-layer-only' }
  }
};

export const enhancerDetectionTargets = [
  { id: 'windowsSonic', label: 'Windows Sonic', category: 'spatial' },
  { id: 'dolbyAtmos', label: 'Dolby Atmos', category: 'spatial' },
  { id: 'dtsHeadphoneX', label: 'DTS Headphone:X', category: 'spatial' },
  { id: 'steelSeriesSonar', label: 'SteelSeries Sonar', category: 'routing-eq-spatial' },
  { id: 'equalizerApo', label: 'Equalizer APO', category: 'eq' },
  { id: 'peaceEq', label: 'Peace EQ', category: 'eq' },
  { id: 'voicemeeter', label: 'Voicemeeter', category: 'routing-mixer' },
  { id: 'obs', label: 'OBS', category: 'stream' },
  { id: 'nvidiaBroadcast', label: 'NVIDIA Broadcast', category: 'mic-noise-suppression' },
  { id: 'amdNoiseSuppression', label: 'AMD Noise Suppression', category: 'mic-noise-suppression' },
  { id: 'discordNoiseSuppression', label: 'Discord Noise Suppression', category: 'mic-noise-suppression' }
];

export const enhancerLinkStates = [
  'not-detected',
  'detected',
  'linked',
  'recommended-routing',
  'manual-setup-needed',
  'conflict-warning'
];

export const gamerPresets = [
  {
    id: 'fpsCompetitive',
    label: 'FPS Competitive',
    intent: 'cue-priority',
    requiresLimiter: true,
    hiddenNativeChanges: false,
    notes: 'Keeps spatial off by default until the chain is proven clean.',
    defaultChannelDeltas: {
      game: { gainDb: -1, eq: [-1, -1, -0.5, -0.5, 0, 0.5, 1.5, 1, 0.25, 0] },
      voice: { gainDb: 0, eq: [0, 0, -0.5, 0, 0.5, 1, 1, 0.25, 0, 0] },
      streamMix: { limiter: { enabled: true, ceilingDb: -1 } },
      headphonesOutput: { spatialPolicy: { mode: 'safe-stereo', externalHrtfAllowed: false } }
    }
  },
  {
    id: 'battleRoyale',
    label: 'Battle Royale',
    intent: 'distance-and-cue-balance',
    requiresLimiter: true,
    hiddenNativeChanges: false,
    defaultChannelDeltas: {
      game: { gainDb: -0.5, eq: [-0.5, -0.5, 0, 0, 0.25, 0.5, 1, 0.75, 0.25, 0] },
      voice: { gainDb: 0, eq: [0, 0, -0.25, 0, 0.5, 0.75, 0.75, 0.25, 0, 0] },
      streamMix: { limiter: { enabled: true, ceilingDb: -1 } }
    }
  },
  {
    id: 'cinematic',
    label: 'Cinematic',
    intent: 'immersion',
    requiresLimiter: true,
    hiddenNativeChanges: false,
    notes: 'Preserves space and impact without competitive footstep bias.',
    defaultChannelDeltas: {
      game: { gainDb: -1, eq: [0, 0.75, 0.75, 0.25, 0, 0, 0.25, 0.25, 0.5, 0.5] },
      music: { gainDb: -3 },
      streamMix: { limiter: { enabled: true, ceilingDb: -1 } },
      headphonesOutput: { spatialPolicy: { mode: 'immersive-optional', externalHrtfAllowed: true } }
    }
  },
  {
    id: 'streamer',
    label: 'Streamer',
    intent: 'broadcast-safe-balance',
    requiresLimiter: true,
    hiddenNativeChanges: false,
    defaultChannelDeltas: {
      game: { gainDb: -3 },
      voice: { gainDb: 1 },
      mic: { gainDb: 0, limiter: { enabled: true, ceilingDb: -2 } },
      music: { gainDb: -8 },
      browser: { gainDb: -6 },
      streamMix: { limiter: { enabled: true, ceilingDb: -1 }, loudnessTarget: { enabled: true, targetLufs: -16, truePeakDb: -1 } }
    }
  },
  {
    id: 'nightMode',
    label: 'Night Mode',
    intent: 'low-volume-detail',
    requiresLimiter: true,
    hiddenNativeChanges: false,
    defaultChannelDeltas: {
      game: { gainDb: -5, eq: [-2, -1.5, -1, 0, 0.25, 0.75, 1, 0.25, -0.25, -0.5] },
      voice: { gainDb: -1 },
      streamMix: { limiter: { enabled: true, ceilingDb: -3 } },
      headphonesOutput: { limiter: { enabled: true, ceilingDb: -3 }, spatialPolicy: { mode: 'safe-stereo', externalHrtfAllowed: false } }
    }
  },
  {
    id: 'safeHearing',
    label: 'Safe Hearing Mode',
    intent: 'comfort-and-headroom',
    requiresLimiter: true,
    hiddenNativeChanges: false,
    maxGainDb: 0,
    notes: 'Conservative mode for long sessions and hearing-sensitive players.',
    defaultChannelDeltas: {
      game: { gainDb: -6, eq: [-1, -1, -0.5, 0, 0, 0, 0.25, -0.25, -0.75, -1] },
      voice: { gainDb: -2 },
      music: { gainDb: -10 },
      browser: { gainDb: -8 },
      streamMix: { limiter: { enabled: true, ceilingDb: -4 } },
      headphonesOutput: { gainDb: -4, limiter: { enabled: true, ceilingDb: -4 }, spatialPolicy: { mode: 'safe-stereo', externalHrtfAllowed: false } }
    }
  }
];

export const epicBuildPhases = [
  {
    id: 'phase-1-working-hub',
    label: 'Working Gamer Audio Hub',
    priority: 1,
    ships: ['dashboard', 'device-selection', 'channel-strips', 'preset-engine', 'settings-persistence'],
    proofGate: 'User can pick devices, move channel controls, apply a safe preset, reload, and see persisted state.'
  },
  {
    id: 'phase-2-chain-assessment',
    label: 'Chain Assessment',
    priority: 2,
    ships: ['enhancer-detector', 'conflict-detector', 'headset-profiles', 'obs-discord-routing-guide', 'latency-meter'],
    proofGate: 'Auto Detect explains what is detected, uncertain, risky, and the safest next action.'
  },
  {
    id: 'phase-3-coach-spatial-showcase',
    label: 'Coach + Spatial Showcase',
    priority: 3,
    ships: ['game-audio-coach', 'spatial-toggle', 'binaural-mode', 'stereo-fallback', 'panda-soundwalk-showcase'],
    proofGate: 'Coach recommendations are tied to evidence and every spatial mode has a fallback warning.'
  },
  {
    id: 'phase-4-distribution-hardening',
    label: 'Distribution Hardening',
    priority: 4,
    ships: ['installer', 'auto-updater-plan', 'profile-sharing', 'native-routing-research'],
    proofGate: 'Release checklist, signing plan, privacy gate, and rollback path are documented.'
  }
];

export const releaseGates = [
  'npm test',
  'npm run validate:fixtures',
  'npm run validate:manifest',
  'npm run test:harness',
  'npm run test:ui',
  'npm run export:redaction-check',
  'npm run build'
];

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getPreset(id) {
  return gamerPresets.find((preset) => preset.id === id) || null;
}

function defaultControlValue(controlId) {
  const contract = channelControlContracts[controlId];
  return deepClone(contract?.defaultValue ?? null);
}

function buildChannelState(channel) {
  const controls = channel.controls.reduce((acc, controlId) => {
    acc[controlId] = defaultControlValue(controlId);
    return acc;
  }, {});

  return {
    id: channel.id,
    label: channel.label,
    role: channel.role,
    route: [...channel.defaultRoute],
    enabled: true,
    controls
  };
}

export function buildDefaultGamerHubState() {
  return {
    schema: 'cueforge.gamer-audio-hub-state.v1',
    selectedPresetId: 'safeHearing',
    channels: gamerAudioChannels.reduce((acc, channel) => {
      acc[channel.id] = buildChannelState(channel);
      return acc;
    }, {}),
    enhancerLinks: enhancerDetectionTargets.reduce((acc, target) => {
      acc[target.id] = { state: 'not-detected', label: target.label, category: target.category };
      return acc;
    }, {}),
    metrics: {
      latencyMs: null,
      streamPeakDb: -12,
      bassMaskingRisk: false
    }
  };
}

function applyChannelDelta(channelState, delta = {}) {
  const next = deepClone(channelState);

  if (Number.isFinite(delta.gainDb) && next.controls.gain !== undefined) {
    next.controls.gain = delta.gainDb;
  }

  if (Array.isArray(delta.eq) && next.controls.eq) {
    next.controls.eq = delta.eq.slice(0, next.controls.eq.length || delta.eq.length);
  }

  ['compressor', 'limiter', 'noiseGate', 'spatialPolicy', 'loudnessTarget'].forEach((controlId) => {
    if (delta[controlId] && next.controls[controlId] !== undefined) {
      next.controls[controlId] = { ...next.controls[controlId], ...delta[controlId] };
    }
  });

  return next;
}

function clampSafeHearingGains(state, maxGainDb = 0) {
  const next = deepClone(state);
  Object.values(next.channels).forEach((channel) => {
    if (Number.isFinite(channel.controls?.gain)) {
      channel.controls.gain = Math.min(channel.controls.gain, maxGainDb);
    }
  });
  return next;
}

export function applyGamerPreset(state = buildDefaultGamerHubState(), presetId = 'safeHearing') {
  const preset = getPreset(presetId);
  if (!preset) {
    return {
      state: deepClone(state),
      applied: false,
      issues: [`Unknown preset: ${presetId}`]
    };
  }

  let next = deepClone(state);
  next.selectedPresetId = preset.id;

  Object.entries(preset.defaultChannelDeltas || {}).forEach(([channelId, delta]) => {
    if (next.channels[channelId]) {
      next.channels[channelId] = applyChannelDelta(next.channels[channelId], delta);
    }
  });

  if (preset.id === 'safeHearing') {
    next = clampSafeHearingGains(next, preset.maxGainDb ?? 0);
  }

  return {
    state: next,
    applied: true,
    issues: []
  };
}

function activeEnhancersFromLinks(enhancerLinks = {}) {
  return Object.entries(enhancerLinks)
    .filter(([, value]) => ['detected', 'linked', 'recommended-routing', 'conflict-warning'].includes(value?.state))
    .map(([id, value]) => ({
      id,
      label: value?.label || id,
      category: value?.category || enhancerDetectionTargets.find((target) => target.id === id)?.category || 'unknown'
    }));
}

function hasCueForgeEqEnabled(state) {
  return Object.values(state?.channels || {}).some((channel) => {
    const eq = channel?.controls?.eq;
    return Array.isArray(eq) && eq.some((value) => Math.abs(Number(value) || 0) >= 0.25);
  });
}

function maxLowBandBoost(state) {
  return Object.values(state?.channels || {}).reduce((max, channel) => {
    const eq = channel?.controls?.eq;
    if (!Array.isArray(eq)) return max;
    const low = eq.slice(0, 3).map((value) => Number(value) || 0);
    return Math.max(max, ...low);
  }, 0);
}

function conflict(id, severity, title, detail, fix) {
  return { id, severity, title, detail, fix };
}

export function evaluateEpicGamerAudioConflicts({ state = buildDefaultGamerHubState(), metrics = {}, selectedGame = {} } = {}) {
  const activeEnhancers = activeEnhancersFromLinks(state.enhancerLinks);
  const conflicts = [];
  const spatialLayers = activeEnhancers.filter((item) => item.category.includes('spatial'));
  const eqLayers = activeEnhancers.filter((item) => item.category === 'eq' || item.category === 'routing-eq-spatial');
  const suppressors = activeEnhancers.filter((item) => item.category === 'mic-noise-suppression');
  const streamLimiter = state.channels?.streamMix?.controls?.limiter;
  const streamPeakDb = Number(metrics.streamPeakDb ?? state.metrics?.streamPeakDb ?? -12);
  const latencyMs = Number(metrics.latencyMs ?? state.metrics?.latencyMs ?? 0);
  const lowBandBoost = maxLowBandBoost(state);

  if (spatialLayers.length > 1 || (spatialLayers.length === 1 && selectedGame.externalHrtfEnabled)) {
    conflicts.push(conflict(
      'double-spatial-audio',
      'high',
      'Multiple spatial layers can smear direction cues',
      `${spatialLayers.map((item) => item.label).join(' + ')} can stack with game HRTF or another virtual surround layer.`,
      'Use one spatial layer during testing, then rerun the output direction check.'
    ));
  }

  if (hasCueForgeEqEnabled(state) && eqLayers.length > 0) {
    conflicts.push(conflict(
      'double-eq-risk',
      'medium',
      'CueForge EQ may be stacked with another EQ layer',
      `${eqLayers.map((item) => item.label).join(' + ')} is active while CueForge EQ has non-flat bands.`,
      'Confirm which layer owns EQ or set CueForge to assessment/export-only mode.'
    ));
  }

  if (suppressors.length > 1) {
    conflicts.push(conflict(
      'stacked-noise-suppression',
      'medium',
      'Multiple mic noise suppressors can make voice robotic',
      `${suppressors.map((item) => item.label).join(' + ')} are active at the same time.`,
      'Pick one mic cleanup owner and disable the rest before judging mic quality.'
    ));
  }

  if (!streamLimiter?.enabled) {
    conflicts.push(conflict(
      'missing-stream-limiter',
      'high',
      'Stream Mix limiter is off',
      'Viewer output can clip even if the player mix sounds fine.',
      'Enable the Stream Mix limiter before OBS/export testing.'
    ));
  }

  if (streamPeakDb >= -1) {
    conflicts.push(conflict(
      'stream-clipping-risk',
      'high',
      'Stream Mix is near clipping',
      `Measured stream peak is ${streamPeakDb.toFixed(1)} dBFS.`,
      'Lower source gains or enable limiter ceiling at -1 dB or lower.'
    ));
  }

  if (lowBandBoost > 3 || metrics.bassMaskingRisk === true) {
    conflicts.push(conflict(
      'bass-masking-footsteps',
      'medium',
      'Bass may be masking footsteps and small cues',
      `Low-band boost is ${lowBandBoost.toFixed(1)} dB or masking was detected by the lab.`,
      'Reduce sub/bass boost, then rerun Machine Play Lab cue masking test.'
    ));
  }

  if (latencyMs > 40) {
    conflicts.push(conflict(
      'latency-budget-fail',
      'high',
      'Latency is too high for competitive monitoring',
      `Measured or reported latency is ${latencyMs.toFixed(1)} ms.`,
      'Use direct output, reduce virtual routing, and retest before calling the setup match-ready.'
    ));
  } else if (latencyMs > 30) {
    conflicts.push(conflict(
      'latency-budget-warning',
      'medium',
      'Latency is close to the competitive budget',
      `Measured or reported latency is ${latencyMs.toFixed(1)} ms.`,
      'Keep total monitoring latency under 30 ms where possible.'
    ));
  }

  return conflicts;
}

export function buildEpicGamerAudioAssessment({ state = buildDefaultGamerHubState(), metrics = {}, selectedGame = {} } = {}) {
  const conflicts = evaluateEpicGamerAudioConflicts({ state, metrics, selectedGame });
  const high = conflicts.filter((item) => item.severity === 'high').length;
  const medium = conflicts.filter((item) => item.severity === 'medium').length;
  const score = Math.max(0, Math.min(100, 100 - high * 24 - medium * 12));

  return {
    schema: 'cueforge.epic-gamer-audio-assessment.v1',
    score,
    status: high > 0 ? 'needs-fix' : medium > 0 ? 'review' : 'ready',
    selectedPresetId: state.selectedPresetId,
    conflictCount: conflicts.length,
    conflicts,
    nextBestAction: conflicts[0]?.fix || 'Run Machine Play Lab before trusting the profile in a real match.'
  };
}

export function summarizeEpicGamerBlueprint() {
  return {
    schema: epicBlueprintSchema,
    channelCount: gamerAudioChannels.length,
    channelIds: gamerAudioChannels.map((channel) => channel.id),
    presetCount: gamerPresets.length,
    presetIds: gamerPresets.map((preset) => preset.id),
    enhancerTargetCount: enhancerDetectionTargets.length,
    phaseCount: epicBuildPhases.length,
    safetyBoundary: epicBlueprintSafetyBoundary,
    releaseGates
  };
}

export function getNextEpicBuildSlices(limit = 5) {
  return epicBuildPhases
    .slice()
    .sort((a, b) => a.priority - b.priority)
    .flatMap((phase) => phase.ships.map((ship) => ({ phaseId: phase.id, task: ship, proofGate: phase.proofGate })))
    .slice(0, limit);
}

export function validateEpicGamerBlueprint() {
  const issues = [];
  const requiredChannels = ['game', 'voice', 'mic', 'music', 'browser', 'streamMix', 'headphonesOutput'];
  const channelIds = new Set(gamerAudioChannels.map((channel) => channel.id));

  if (epicBlueprintSafetyBoundary.localFirst !== true) issues.push('Blueprint must remain local-first.');
  if (epicBlueprintSafetyBoundary.noFakeEnabledControls !== true) issues.push('Blueprint must block fake enabled controls.');
  if (epicBlueprintSafetyBoundary.noHiddenNativeRouting !== true) issues.push('Blueprint must block hidden native routing.');
  if (epicBlueprintSafetyBoundary.noSilentDriverChanges !== true) issues.push('Blueprint must block silent driver changes.');
  if (epicBlueprintSafetyBoundary.noSilentSystemApply !== true) issues.push('Blueprint must block silent system apply.');
  if (epicBlueprintSafetyBoundary.noUnsafePresetBehavior !== true) issues.push('Blueprint must block unsafe preset behavior.');
  if (epicBlueprintSafetyBoundary.noRawAudioExportByDefault !== true) issues.push('Blueprint must block raw audio export by default.');

  requiredChannels.forEach((id) => {
    if (!channelIds.has(id)) issues.push(`Missing required channel: ${id}`);
  });

  gamerAudioChannels.forEach((channel) => {
    if (!channel.controls?.length) issues.push(`${channel.id} has no controls.`);
    channel.controls.forEach((controlId) => {
      const contract = channelControlContracts[controlId];
      if (!contract) issues.push(`${channel.id} references unknown control ${controlId}.`);
      if (contract?.status !== channelControlStatus.active && !contract?.disabledReason) {
        issues.push(`${channel.id}.${controlId} is not active and has no disabled reason.`);
      }
    });
    if (!channel.defaultRoute?.length) issues.push(`${channel.id} has no default route.`);
  });

  gamerPresets.forEach((preset) => {
    if (!preset.requiresLimiter) issues.push(`${preset.id} must require a limiter.`);
    if (preset.hiddenNativeChanges) issues.push(`${preset.id} cannot make hidden native changes.`);
    if (!preset.defaultChannelDeltas?.streamMix?.limiter?.enabled) issues.push(`${preset.id} must explicitly keep Stream Mix limiter enabled.`);
    if (preset.defaultChannelDeltas?.nativeRouting || preset.defaultChannelDeltas?.driverWrite || preset.defaultChannelDeltas?.silentApply) {
      issues.push(`${preset.id} cannot include native routing, driver writes, or silent apply deltas.`);
    }
  });

  if (getPreset('fpsCompetitive')?.defaultChannelDeltas?.headphonesOutput?.spatialPolicy?.mode !== 'safe-stereo') {
    issues.push('FPS Competitive must default to safe-stereo until the chain is proven.');
  }

  if ((getPreset('safeHearing')?.maxGainDb ?? 99) > 0) {
    issues.push('Safe Hearing Mode must cap gain at or below 0 dB.');
  }

  enhancerDetectionTargets.forEach((target) => {
    if (!target.id || !target.label || !target.category) issues.push(`Bad enhancer target: ${target.id || 'unknown'}`);
  });

  epicBuildPhases.forEach((phase) => {
    if (!phase.ships?.length || !phase.proofGate) issues.push(`${phase.id} needs ships and proofGate.`);
  });

  return {
    ok: issues.length === 0,
    issues
  };
}
