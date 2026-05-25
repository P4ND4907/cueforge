import { describe, expect, it } from 'vitest';
import {
  buildMicPlan,
  classifyClipRisk,
  classifyNoiseFloor,
  micProcessingPlan
} from '../engines/micPlan.js';

describe('mic engine plan', () => {
  it('publishes the v0.2.0 mic processing contract without hidden processing', () => {
    expect(micProcessingPlan.modules).toEqual([
      'input_gain_check',
      'noise_floor_estimate',
      'clip_risk',
      'voice_presence',
      'rnnoise_future_adapter',
      'discord_safe_suggestion'
    ]);
    expect(micProcessingPlan.rules).toMatchObject({
      neverApplyHiddenGain: true,
      warnBeforeNoiseSuppression: true,
      keepRawAudioLocal: true,
      exportOnlyMetricsByDefault: true
    });
  });

  it('recommends a Discord-safe tweak for usable medium-noise mic input', () => {
    const plan = buildMicPlan({
      graph: { summary: { inputs: 1 } },
      metrics: {
        level: 44,
        noiseFloor: 48,
        clipRisk: 8,
        voicePresence: 52
      }
    });

    expect(plan.status).toBe('usable');
    expect(plan.recommendation).toMatchObject({
      micStatus: 'usable',
      noiseFloor: 'medium',
      clipRisk: 'low'
    });
    expect(plan.recommendation.recommendedAction).toContain('Lower Discord input sensitivity slightly');
    expect(plan.recommendation.futureModule).toContain('RNNoise cleanup available');
    expect(plan.futureBackend).toMatchObject({
      id: 'rnnoise',
      license: 'BSD-3-Clause',
      mode: 'optional-native-adapter',
      enabled: false,
      appliesHiddenProcessing: false
    });
  });

  it('keeps the user in setup when no input is detected', () => {
    const plan = buildMicPlan({
      metrics: {
        noiseFloor: 0,
        clipRisk: 0,
        voicePresence: 0
      }
    });

    expect(plan.status).toBe('needs-input');
    expect(plan.recommendation.micStatus).toBe('needs input');
    expect(plan.actions.join(' ')).toContain('Grant mic permission');
  });

  it('classifies noisy and clipping signals conservatively', () => {
    expect(classifyNoiseFloor(12)).toBe('low');
    expect(classifyNoiseFloor(45)).toBe('medium');
    expect(classifyNoiseFloor(80)).toBe('high');
    expect(classifyClipRisk(7)).toBe('low');
    expect(classifyClipRisk(14)).toBe('medium');
    expect(classifyClipRisk(31)).toBe('high');

    const plan = buildMicPlan({
      graph: { summary: { inputs: 1 } },
      metrics: { noiseFloor: 78, clipRisk: 4, voicePresence: 42 }
    });

    expect(plan.status).toBe('noisy');
    expect(plan.recommendation.recommendedAction).toContain('Move the mic closer');
  });
});
