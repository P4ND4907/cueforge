import { describe, expect, it } from 'vitest';
import {
  SOUND_MATCH_STANDARD_ROUNDS,
  buildSoundMatchInsightState,
  buildSoundMatchUiState,
  blindMatchRounds,
  createBlindMatchResult
} from './blindMatch.js';

function consistentStandardChoices() {
  return {
    footstep_vs_comfort: 'a',
    bass_vs_comms: 'b',
    wide_vs_center: 'b',
    detail_vs_fatigue: 'b',
    direction_vs_body: 'a',
    masking_cut_vs_cue_boost: 'a',
    voice_separation_vs_game_body: 'a',
    repeat_footstep_vs_comfort: 'b',
    repeat_bass_vs_comms: 'a'
  };
}

describe('blind match tuner', () => {
  it('learns a personal eq curve from blind choices', () => {
    const choices = consistentStandardChoices();
    const result = createBlindMatchResult(choices, [-1, 1.5, 0.5, -2, -1, 0.5, 2.5, 3.2, 1.2, -0.5]);

    expect(blindMatchRounds).toHaveLength(SOUND_MATCH_STANDARD_ROUNDS);
    expect(result.completedRounds).toBe(SOUND_MATCH_STANDARD_ROUNDS);
    expect(result.eq).toHaveLength(10);
    expect(result.confidence).toBeGreaterThan(80);
    expect(result.applyReadiness.ready).toBe(true);
    expect(result.repeatChecks).toHaveLength(2);
    expect(result.contradictions).toBe(0);
    expect(result.summary).toContain('Learned from');
    expect(result.preferenceModel.roundsCompleted).toBe(SOUND_MATCH_STANDARD_ROUNDS);
    expect(result.preferenceSummary).toMatch(/footstep|balanced|wide|center|comfort|detail/);
  });

  it('keeps a five-round preview from pretending it is ready', () => {
    const result = createBlindMatchResult({
      footstep_vs_comfort: 'a',
      bass_vs_comms: 'b',
      wide_vs_center: 'b',
      detail_vs_fatigue: 'b',
      direction_vs_body: 'a'
    }, Array(10).fill(0));

    expect(result.completedRounds).toBe(5);
    expect(result.requiredRounds).toBe(SOUND_MATCH_STANDARD_ROUNDS);
    expect(result.confidence).toBeLessThan(80);
    expect(result.applyReadiness.ready).toBe(false);
    expect(result.applyReadiness.status).toBe('preview');

    const ui = buildSoundMatchUiState(result);
    expect(ui.progress).toMatchObject({
      completed: 5,
      required: SOUND_MATCH_STANDARD_ROUNDS,
      remaining: 4,
      percent: 56,
      label: '5 of 9 rounds complete'
    });
    expect(ui.lockedActions).toEqual([
      'Save unlocks after 4 more rounds.',
      'Export unlocks after 4 more rounds.',
      'Apply stays locked until 9 rounds are complete and repeat checks are clean.'
    ]);
    expect(ui.primaryHint).toBe('Keep choosing. 4 rounds left before save/export unlock.');
  });

  it('treats too-close choices as neutral evidence instead of forced preference', () => {
    const result = createBlindMatchResult({
      footstep_vs_comfort: 'a',
      bass_vs_comms: 'neutral',
      wide_vs_center: 'b',
      detail_vs_fatigue: 'neutral',
      direction_vs_body: 'a',
      masking_cut_vs_cue_boost: 'a',
      voice_separation_vs_game_body: 'neutral',
      repeat_footstep_vs_comfort: 'b',
      repeat_bass_vs_comms: 'neutral'
    }, Array(10).fill(0));

    expect(result.completedRounds).toBe(SOUND_MATCH_STANDARD_ROUNDS);
    expect(result.noDifferenceCount).toBe(4);
    expect(result.preferenceModel.noDifferenceCount).toBe(4);
    expect(result.applyReadiness.ready).toBe(false);
    expect(result.whyChips).toContain('4 too-close picks');
  });

  it('flags reversed repeat contradictions and lowers confidence', () => {
    const consistent = createBlindMatchResult(consistentStandardChoices(), Array(10).fill(0));
    const contradictory = createBlindMatchResult({
      ...consistentStandardChoices(),
      repeat_footstep_vs_comfort: 'a',
      repeat_bass_vs_comms: 'b'
    }, Array(10).fill(0));

    expect(contradictory.contradictions).toBe(2);
    expect(contradictory.repeatChecks.every((check) => check.consistent === false)).toBe(true);
    expect(contradictory.confidence).toBeLessThan(consistent.confidence);
    expect(contradictory.applyReadiness.ready).toBe(false);

    const insight = buildSoundMatchInsightState(contradictory);
    expect(insight.statusTitle).toBe('Direct apply locked');
    expect(insight.statusBody).toContain('hidden repeat');
    expect(insight.nextStep).toContain('Retake');
    expect(insight.repeatRepairRoundIds).toEqual([
      'repeat_footstep_vs_comfort',
      'repeat_bass_vs_comms'
    ]);
    expect(insight.preferenceSignals.map((signal) => signal.label)).toEqual([
      'Cue clarity',
      'Comms cut',
      'Game body',
      'Center lock',
      'Masking guard',
      'Comfort'
    ]);
  });

  it('marks Sound Match ready only when progress and repeat checks are clean', () => {
    const result = createBlindMatchResult(consistentStandardChoices(), Array(10).fill(0));
    const ui = buildSoundMatchUiState(result);

    expect(ui.progress).toMatchObject({
      completed: 9,
      required: SOUND_MATCH_STANDARD_ROUNDS,
      remaining: 0,
      percent: 100,
      label: '9 of 9 rounds complete'
    });
    expect(ui.repeatSummary).toBe('2 repeat checks clean');
    expect(ui.primaryHint).toBe('Ready: save, export, or apply the learned EQ after review.');
    expect(ui.lockedActions).toEqual([]);
  });
});
