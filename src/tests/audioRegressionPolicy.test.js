import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  evaluateAudioRegressionPolicy,
  summarizeAudioRegressionPolicy,
  validateAudioRegressionPolicy
} from '../shared/schemas/audioRegressionPolicy.js';

const root = fileURLToPath(new URL('../..', import.meta.url));

function readPolicy() {
  return JSON.parse(readFileSync(join(root, 'qa/audio/policies/eq-render-a-b.json'), 'utf8'));
}

describe('audio regression policy', () => {
  it('locks eq-render-a-b to the WASAPI loopback policy the product promises', () => {
    const policy = readPolicy();
    const summary = summarizeAudioRegressionPolicy(policy);

    expect(validateAudioRegressionPolicy(policy)).toEqual({ ok: true, errors: [] });
    expect(summary).toMatchObject({
      schema: 'cueforge.audio-regression-policy-summary.v1',
      id: 'eq-render-a-b',
      test: 'eq-render-a-b',
      fixture: 'cue_steps_reference.wav',
      capture: 'wasapi-loopback on active-default-render'
    });
    expect(summary.expected).toEqual([
      'integrated loudness delta within +/-1 LUFS of baseline',
      'phase average > 0.95',
      'cue-band gain increase 1.5-3 dB',
      'no DC offset warning',
      'no clipping event'
    ]);
    expect(summary.failIf).toEqual([
      'outputDeviceChangedMidTest',
      'communicationsEndpointHijacksRenderPath',
      'doubleProcessingSignatureDetected'
    ]);
  });

  it('passes a clean A/B result inside the expected loudness, phase, and cue-gain window', () => {
    const policy = readPolicy();
    const result = evaluateAudioRegressionPolicy(policy, {
      integratedLoudnessDeltaLufs: 0.4,
      phaseAverage: 0.982,
      cueBandGainIncreaseDb: 2.1,
      dcOffsetWarning: false,
      clippingEvent: false,
      outputDeviceChangedMidTest: false,
      communicationsEndpointHijacksRenderPath: false,
      doubleProcessingSignatureDetected: false
    });

    expect(result).toMatchObject({
      schema: 'cueforge.audio-regression-policy-result.v1',
      policyId: 'eq-render-a-b',
      status: 'PASS',
      ok: true,
      failures: []
    });
  });

  it('fails unsafe or misleading render results instead of letting bad audio ship', () => {
    const policy = readPolicy();
    const result = evaluateAudioRegressionPolicy(policy, {
      integratedLoudnessDeltaLufs: 1.8,
      phaseAverage: 0.91,
      cueBandGainIncreaseDb: 4.2,
      dcOffsetWarning: true,
      clippingEvent: true,
      outputDeviceChangedMidTest: true,
      communicationsEndpointHijacksRenderPath: true,
      doubleProcessingSignatureDetected: true
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe('FAIL');
    expect(result.failures.join(' ')).toMatch(/loudness|phase|cue-band|dc offset|clipping|output device|communications endpoint|double-processing/i);
  });

  it('rejects vague policies that are not tied to the active render endpoint and privacy-safe capture', () => {
    const result = validateAudioRegressionPolicy({
      schema: 'cueforge.audio-regression-policy.v1',
      test: 'eq-render-a-b',
      fixture: 'cue_steps_reference.wav',
      capture: {
        method: 'screen-recorder',
        endpoint: 'some-speaker',
        allowSystemMutation: true
      },
      expected: {
        integratedLoudnessDeltaLufs: { maxAbs: 3 },
        phaseAverage: { minExclusive: 0.5 },
        cueBandGainIncreaseDb: { minInclusive: 0, maxInclusive: 8 },
        noDcOffsetWarning: false,
        noClippingEvent: false
      },
      failIf: []
    });

    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toMatch(/wasapi-loopback|active-default-render|allowSystemMutation|LUFS|phase|cueBand|noDcOffset|noClipping|failIf/i);
  });
});
