export const AUDIO_REGRESSION_POLICY_SCHEMA = 'cueforge.audio-regression-policy.v1';

const requiredFailFlags = [
  'outputDeviceChangedMidTest',
  'communicationsEndpointHijacksRenderPath',
  'doubleProcessingSignatureDetected'
];

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function num(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function arr(value) {
  return Array.isArray(value) ? value : [];
}

export function validateAudioRegressionPolicy(policy = {}) {
  const errors = [];

  if (policy.schema !== AUDIO_REGRESSION_POLICY_SCHEMA) {
    errors.push('schema must be cueforge.audio-regression-policy.v1');
  }
  if (cleanText(policy.test) !== 'eq-render-a-b') {
    errors.push('test must be eq-render-a-b');
  }
  if (!cleanText(policy.fixture).endsWith('.wav')) {
    errors.push('fixture must reference a .wav file');
  }
  if (policy.capture?.method !== 'wasapi-loopback') {
    errors.push('capture.method must be wasapi-loopback');
  }
  if (policy.capture?.endpoint !== 'active-default-render') {
    errors.push('capture.endpoint must be active-default-render');
  }
  if (policy.capture?.allowSystemMutation !== false) {
    errors.push('capture.allowSystemMutation must be false');
  }

  const expected = policy.expected || {};
  if (num(expected.integratedLoudnessDeltaLufs?.maxAbs) !== 1) {
    errors.push('expected.integratedLoudnessDeltaLufs.maxAbs must be 1');
  }
  if (num(expected.phaseAverage?.minExclusive) !== 0.95) {
    errors.push('expected.phaseAverage.minExclusive must be 0.95');
  }
  if (num(expected.cueBandGainIncreaseDb?.minInclusive) !== 1.5) {
    errors.push('expected.cueBandGainIncreaseDb.minInclusive must be 1.5');
  }
  if (num(expected.cueBandGainIncreaseDb?.maxInclusive) !== 3) {
    errors.push('expected.cueBandGainIncreaseDb.maxInclusive must be 3');
  }
  if (expected.noDcOffsetWarning !== true) {
    errors.push('expected.noDcOffsetWarning must be true');
  }
  if (expected.noClippingEvent !== true) {
    errors.push('expected.noClippingEvent must be true');
  }

  const failIf = arr(policy.failIf);
  requiredFailFlags.forEach((flag) => {
    if (!failIf.includes(flag)) errors.push(`failIf must include ${flag}`);
  });

  return {
    ok: errors.length === 0,
    errors
  };
}

export function evaluateAudioRegressionPolicy(policy = {}, result = {}) {
  const validation = validateAudioRegressionPolicy(policy);
  const failures = [...validation.errors];
  const expected = policy.expected || {};
  const loudnessDelta = num(result.integratedLoudnessDeltaLufs);
  const phaseAverage = num(result.phaseAverage);
  const cueBandGain = num(result.cueBandGainIncreaseDb);

  if (loudnessDelta === null || Math.abs(loudnessDelta) > expected.integratedLoudnessDeltaLufs.maxAbs) {
    failures.push(`integrated loudness delta ${loudnessDelta ?? 'missing'} LUFS is outside +/-${expected.integratedLoudnessDeltaLufs?.maxAbs ?? '?'} LUFS`);
  }
  if (phaseAverage === null || phaseAverage <= expected.phaseAverage.minExclusive) {
    failures.push(`phase average ${phaseAverage ?? 'missing'} is not greater than ${expected.phaseAverage?.minExclusive ?? '?'}`);
  }
  if (
    cueBandGain === null
    || cueBandGain < expected.cueBandGainIncreaseDb.minInclusive
    || cueBandGain > expected.cueBandGainIncreaseDb.maxInclusive
  ) {
    failures.push(`cue-band gain ${cueBandGain ?? 'missing'} dB is outside ${expected.cueBandGainIncreaseDb?.minInclusive ?? '?'}-${expected.cueBandGainIncreaseDb?.maxInclusive ?? '?'} dB`);
  }
  if (expected.noDcOffsetWarning && result.dcOffsetWarning) {
    failures.push('dc offset warning was raised');
  }
  if (expected.noClippingEvent && result.clippingEvent) {
    failures.push('clipping event was detected');
  }

  if (result.outputDeviceChangedMidTest) {
    failures.push('output device changed mid-test');
  }
  if (result.communicationsEndpointHijacksRenderPath || result.communicationsEndpointHijackedRenderPath) {
    failures.push('communications endpoint hijacked render path');
  }
  if (result.doubleProcessingSignatureDetected) {
    failures.push('double-processing signature detected');
  }

  return {
    schema: 'cueforge.audio-regression-policy-result.v1',
    policyId: cleanText(policy.id),
    test: cleanText(policy.test),
    ok: failures.length === 0,
    status: failures.length === 0 ? 'PASS' : 'FAIL',
    failures,
    metrics: {
      integratedLoudnessDeltaLufs: loudnessDelta,
      phaseAverage,
      cueBandGainIncreaseDb: cueBandGain,
      dcOffsetWarning: !!result.dcOffsetWarning,
      clippingEvent: !!result.clippingEvent
    },
    boundaries: {
      captureMethod: policy.capture?.method || null,
      captureEndpoint: policy.capture?.endpoint || null,
      allowSystemMutation: policy.capture?.allowSystemMutation === true
    }
  };
}

export function summarizeAudioRegressionPolicy(policy = {}) {
  const expected = policy.expected || {};
  return {
    schema: 'cueforge.audio-regression-policy-summary.v1',
    id: cleanText(policy.id),
    test: cleanText(policy.test),
    fixture: cleanText(policy.fixture),
    capture: `${policy.capture?.method || 'unknown'} on ${policy.capture?.endpoint || 'unknown'}`,
    expected: [
      `integrated loudness delta within +/-${expected.integratedLoudnessDeltaLufs?.maxAbs ?? '?'} LUFS of baseline`,
      `phase average > ${expected.phaseAverage?.minExclusive ?? '?'}`,
      `cue-band gain increase ${expected.cueBandGainIncreaseDb?.minInclusive ?? '?'}-${expected.cueBandGainIncreaseDb?.maxInclusive ?? '?'} dB`,
      'no DC offset warning',
      'no clipping event'
    ],
    failIf: arr(policy.failIf)
  };
}
