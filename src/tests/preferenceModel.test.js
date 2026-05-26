import { describe, expect, it } from 'vitest';
import {
  applyPreferenceModelToDynamics,
  applyPreferenceModelToEq,
  applyPreferenceModelToSpatial,
  buildPreferenceModelFromChoices,
  defaultPreferenceModel,
  preferenceRounds,
  updatePreferenceModel
} from '../core/preferenceModel.js';

describe('this or that preference model', () => {
  it('updates hidden weights, clamps extremes, and raises confidence by round count', () => {
    let model = { ...defaultPreferenceModel };

    for (let index = 0; index < 14; index += 1) {
      model = updatePreferenceModel(model, {
        weightDelta: {
          footstepPriority: 1,
          fatigueRisk: -1
        },
        updatedAt: '2026-05-23T00:00:00Z'
      });
    }

    expect(model.footstepPriority).toBe(5);
    expect(model.fatigueRisk).toBe(-5);
    expect(model.roundsCompleted).toBe(14);
    expect(model.confidence).toBe(1);
  });

  it('records too-close rounds without pushing hidden weights', () => {
    const model = updatePreferenceModel(defaultPreferenceModel, {
      selected: 'neutral',
      weightDelta: { footstepPriority: 2, treble: 2 },
      updatedAt: '2026-05-23T00:00:00Z'
    });

    expect(model.roundsCompleted).toBe(1);
    expect(model.noDifferenceCount).toBe(1);
    expect(model.footstepPriority).toBe(0);
    expect(model.treble).toBe(0);
    expect(model.confidence).toBeLessThan(0.1);
  });

  it('builds a replayable model from A/B choices', () => {
    const model = buildPreferenceModelFromChoices({
      footstep_vs_comfort: 'a',
      bass_vs_comms: 'b',
      wide_vs_center: 'b',
      detail_vs_fatigue: 'b',
      masking_cut_vs_cue_boost: 'a',
      voice_separation_vs_game_body: 'a'
    }, preferenceRounds);

    expect(preferenceRounds.length).toBeGreaterThanOrEqual(7);
    expect(model.roundsCompleted).toBe(6);
    expect(model.footstepPriority).toBeGreaterThan(0);
    expect(model.voiceClarity).toBeGreaterThan(0);
    expect(model.centerFocus).toBeGreaterThan(0);
    expect(model.comfortPriority).toBeGreaterThan(0);
    expect(model.maskingControl).toBeGreaterThan(0);
    expect(model.voiceSeparation).toBeGreaterThan(0);
    expect(model.confidence).toBeGreaterThan(0.4);
  });

  it('turns choices into EQ, dynamics, and spatial changes without unsafe extremes', () => {
    const model = buildPreferenceModelFromChoices({
      footstep_vs_comfort: 'a',
      bass_vs_comms: 'b',
      wide_vs_center: 'a',
      detail_vs_fatigue: 'a',
      direction_vs_body: 'a'
    }, preferenceRounds);

    const eq = applyPreferenceModelToEq(Array(10).fill(0), model);
    const dynamics = applyPreferenceModelToDynamics({ explosionTame: 0.3, transientClarity: 0.4 }, model);
    const spatial = applyPreferenceModelToSpatial({ mode: 'safe_stereo', crossfeed: 0.2 }, model);

    expect(eq).toHaveLength(10);
    expect(Math.max(...eq)).toBeLessThanOrEqual(6);
    expect(eq[6]).toBeGreaterThan(0);
    expect(dynamics.transientClarity).toBeGreaterThan(0.4);
    expect(spatial.mode).toBe('personal_wide_safe');
  });
});
