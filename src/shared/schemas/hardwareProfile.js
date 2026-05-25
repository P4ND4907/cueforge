export const HARDWARE_PROFILE_SCHEMA = 'cueforge.hardware-profile.v1';

export const companionStates = ['expected', 'optional', 'forbidden'];

const knownCompanions = [
  'equalizerApo',
  'peace',
  'sonar',
  'voicemeeter',
  'vbCable',
  'dolby',
  'windowsSonic',
  'nahimic',
  'razer'
];

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeToolState(value) {
  if (value === true) return true;
  if (value === false || value === null || value === undefined) return false;
  if (typeof value === 'object') {
    return Boolean(value.installed ?? value.detected ?? value.active ?? value.present);
  }
  return Boolean(value);
}

function bridgeToolAlias(key) {
  return {
    sonar: 'steelSeriesSonar',
    vbCable: 'vbCable',
    windowsSonic: 'windowsSonic'
  }[key] || key;
}

function labelsFromEvidence(evidence = {}) {
  const nativeEndpoints = asArray(evidence.endpoints).map((item) => item.name || item.label);
  const bridgeDevices = asArray(evidence.soundDevices).map((item) => item.Name || item.name || item.label);
  const bridgeMedia = asArray(evidence.mediaDevices).map((item) => item.Name || item.name || item.label);
  const browserDevices = asArray(evidence.devices).map((item) => item.label || item.name);

  return [...nativeEndpoints, ...bridgeDevices, ...bridgeMedia, ...browserDevices]
    .map(cleanText)
    .filter(Boolean);
}

function endpointLabelsByRole(evidence = {}, role = 'playback') {
  const endpoints = asArray(evidence.endpoints)
    .filter((item) => item.role === role || item.defaultFor?.includes(role))
    .map((item) => item.name || item.label);
  const bridgeFallback = role === 'recording'
    ? asArray(evidence.soundDevices).filter((item) => /mic|input|record|capture/i.test(item.Name || item.name || item.label || '')).map((item) => item.Name || item.name || item.label)
    : asArray(evidence.soundDevices).filter((item) => /dac|headphone|speaker|output|game|headset/i.test(item.Name || item.name || item.label || '')).map((item) => item.Name || item.name || item.label);

  return [...endpoints, ...bridgeFallback].map(cleanText).filter(Boolean);
}

function matchHints(profilePart = {}, labels = []) {
  const hints = asArray(profilePart.matchHints).map((item) => item.toLowerCase());
  const joined = labels.join(' ').toLowerCase();
  const matched = hints.filter((hint) => joined.includes(hint));

  return {
    matched,
    missing: hints.filter((hint) => !matched.includes(hint)),
    confidence: hints.length ? Math.round((matched.length / hints.length) * 100) : 0
  };
}

function companionDetected(evidence = {}, key) {
  const tools = evidence.tools || {};
  const companionMap = evidence.companions || {};
  const alias = bridgeToolAlias(key);

  return normalizeToolState(tools[key]) ||
    normalizeToolState(tools[alias]) ||
    normalizeToolState(companionMap[key]) ||
    normalizeToolState(companionMap[alias]);
}

function endpointSeparate(evidence = {}) {
  const defaults = evidence.defaults || {};
  const playback = defaults.playback || defaults.playbackEndpoint || defaults.defaultPlayback;
  const comms = defaults.communicationsPlayback || defaults.communications || defaults.communicationsEndpoint;
  if (playback && comms) return playback !== comms;
  return asArray(evidence.endpoints).some((item) => item.defaultFor?.includes('communicationsPlayback') || item.role === 'communications');
}

export function validateHardwareProfile(profile = {}) {
  const errors = [];

  if (profile.schema !== HARDWARE_PROFILE_SCHEMA) errors.push('schema must be cueforge.hardware-profile.v1');
  if (!cleanText(profile.profileId)) errors.push('profileId is required');
  if (profile.os !== 'windows') errors.push('os must be windows for the current CueForge hardware profile contract');
  if (!cleanText(profile.input?.kind)) errors.push('input.kind is required');
  if (!asArray(profile.input?.matchHints).length) errors.push('input.matchHints must include at least one hint');
  if (!cleanText(profile.output?.kind)) errors.push('output.kind is required');
  if (!asArray(profile.output?.matchHints).length) errors.push('output.matchHints must include at least one hint');

  Object.entries(profile.companions || {}).forEach(([key, value]) => {
    if (!knownCompanions.includes(key)) errors.push(`companions.${key} is not a known companion key`);
    if (!companionStates.includes(value)) errors.push(`companions.${key} must be expected, optional, or forbidden`);
  });

  const expectations = profile.expectations || {};
  if ('communicationsEndpointSeparate' in expectations && typeof expectations.communicationsEndpointSeparate !== 'boolean') {
    errors.push('expectations.communicationsEndpointSeparate must be boolean');
  }
  if ('loopbackCaptureRequired' in expectations && typeof expectations.loopbackCaptureRequired !== 'boolean') {
    errors.push('expectations.loopbackCaptureRequired must be boolean');
  }
  if ('maxRoundTripLatencyMs' in expectations && !(Number(expectations.maxRoundTripLatencyMs) > 0)) {
    errors.push('expectations.maxRoundTripLatencyMs must be a positive number');
  }

  return {
    ok: errors.length === 0,
    errors
  };
}

export function assessHardwareProfileEvidence(profile = {}, evidence = {}) {
  const validation = validateHardwareProfile(profile);
  const allLabels = labelsFromEvidence(evidence);
  const inputLabels = endpointLabelsByRole(evidence, 'recording');
  const outputLabels = endpointLabelsByRole(evidence, 'playback');
  const inputMatch = matchHints(profile.input, inputLabels.length ? inputLabels : allLabels);
  const outputMatch = matchHints(profile.output, outputLabels.length ? outputLabels : allLabels);
  const companionResults = Object.entries(profile.companions || {}).map(([key, expectation]) => {
    const detected = companionDetected(evidence, key);
    const ok = expectation === 'optional' || (expectation === 'expected' && detected) || (expectation === 'forbidden' && !detected);
    return {
      key,
      expectation,
      detected,
      ok
    };
  });
  const expectationResults = [];
  const expectations = profile.expectations || {};

  if (expectations.communicationsEndpointSeparate === true) {
    expectationResults.push({
      key: 'communicationsEndpointSeparate',
      expected: true,
      actual: endpointSeparate(evidence),
      ok: endpointSeparate(evidence)
    });
  }
  if (expectations.loopbackCaptureRequired === true) {
    const canReadLoopback = evidence.capabilities?.canReadLoopback === true || evidence.helperEvidence?.canReadLoopback === true;
    expectationResults.push({
      key: 'loopbackCaptureRequired',
      expected: true,
      actual: canReadLoopback,
      ok: canReadLoopback,
      note: canReadLoopback ? 'Loopback capability declared.' : 'Loopback proof still requires desktop helper capability and may be constrained by protected playback.'
    });
  }
  if (Number(expectations.maxRoundTripLatencyMs) > 0 && evidence.metrics?.roundTripLatencyMs !== undefined) {
    const latency = Number(evidence.metrics.roundTripLatencyMs);
    expectationResults.push({
      key: 'maxRoundTripLatencyMs',
      expected: expectations.maxRoundTripLatencyMs,
      actual: latency,
      ok: Number.isFinite(latency) && latency <= expectations.maxRoundTripLatencyMs
    });
  }

  const failedCompanions = companionResults.filter((item) => !item.ok);
  const failedExpectations = expectationResults.filter((item) => !item.ok);
  const scoreParts = [
    inputMatch.confidence,
    outputMatch.confidence,
    companionResults.length ? Math.round((companionResults.filter((item) => item.ok).length / companionResults.length) * 100) : 100,
    expectationResults.length ? Math.round((expectationResults.filter((item) => item.ok).length / expectationResults.length) * 100) : 100
  ];
  const score = Math.round(scoreParts.reduce((sum, value) => sum + value, 0) / scoreParts.length);

  return {
    schema: 'cueforge.hardware-profile-assessment.v1',
    profileId: profile.profileId || null,
    validProfile: validation.ok,
    validationErrors: validation.errors,
    score,
    tier: score >= 85 ? 'strong_match' : score >= 65 ? 'partial_match' : 'mismatch',
    input: inputMatch,
    output: outputMatch,
    companions: companionResults,
    expectations: expectationResults,
    problems: [
      ...validation.errors,
      ...failedCompanions.map((item) => `${item.key} is ${item.detected ? 'detected' : 'missing'} but profile marks it ${item.expectation}.`),
      ...failedExpectations.map((item) => `${item.key} expectation failed.`)
    ],
    labels: allLabels
  };
}
