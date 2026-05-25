import { describe, expect, it } from 'vitest';
import {
  buildPersonalizationLabInputs,
  evaluatePersonalizationClaimBoundary
} from '../core/personalizationLabInputs.js';
import { buildPreferenceModelFromChoices } from '../core/preferenceModel.js';
import { buildHearingModelV2 } from '../core/hearingModelV2.js';
import { createEmptyHearingResults } from '../hearingModel.js';
import { createBlindMatchResult } from '../blindMatch.js';
import { createMaskingTune } from '../maskingLab.js';
import { buildTesterPacket } from '../playerTrial.js';

function completeHearingModel({ repeatedAnswers = [] } = {}) {
  const results = createEmptyHearingResults();

  [125, 250, 500, 1000, 2000, 3000, 4000, 6000, 8000, 12000].forEach((frequency) => {
    results.left[frequency] = {
      audibleAtDb: -24,
      comfortableAtDb: -18,
      harshAtDb: frequency >= 6000 ? -7 : null,
      confidence: 0.82
    };
    results.right[frequency] = {
      audibleAtDb: -23,
      comfortableAtDb: -17,
      harshAtDb: frequency >= 6000 ? -8 : null,
      confidence: 0.8
    };
  });

  return buildHearingModelV2({ results, repeatedAnswers });
}

describe('personalization lab inputs', () => {
  it('turns hearing, blind match, masking, and player trial into one conservative lab contract', () => {
    const blindMatch = createBlindMatchResult({
      footstep_vs_comfort: 'a',
      bass_vs_comms: 'b',
      wide_vs_center: 'b',
      detail_vs_fatigue: 'b',
      direction_vs_body: 'a'
    }, Array(10).fill(0));
    const maskingLab = createMaskingTune(Array(10).fill(0), 'footsteps-under-explosion');
    const playerTrial = buildTesterPacket({
      feedback: {
        footsteps: 8,
        direction: 8,
        comms: 7,
        mic: 7,
        fatigue: 8,
        notes: 'felt cleaner after one match'
      },
      readiness: { score: 82 },
      issueReport: null,
      eq: Array(10).fill(0),
      game: 'Rainbow Six Siege',
      sourceProfile: 'competitive_fps'
    });

    const lab = buildPersonalizationLabInputs({
      hearingModel: completeHearingModel(),
      blindMatch,
      maskingLab,
      playerTrial
    });

    expect(lab.schema).toBe('cueforge.personalization-lab-inputs.v1');
    expect(lab.claimBoundary.notMedical).toBe(true);
    expect(lab.safety.playback.safe).toBe(true);
    expect(lab.inputs.hearing.ready).toBe(true);
    expect(lab.inputs.preference.ready).toBe(true);
    expect(lab.inputs.masking.ready).toBe(true);
    expect(lab.inputs.playerTrial.ready).toBe(true);
    expect(lab.influence.total).toBeLessThanOrEqual(1);
    expect(lab.readiness.ready).toBe(true);
  });

  it('drops hearing influence and asks for retest when repeated answers contradict each other', () => {
    const repeatedAnswers = [
      { ear: 'left', frequency: 4000, levelDb: -18, response: 'not_heard' },
      { ear: 'left', frequency: 4000, levelDb: -17, response: 'clear' }
    ];
    const hearingModel = completeHearingModel({ repeatedAnswers });
    const lab = buildPersonalizationLabInputs({
      hearingModel,
      repeatedHearingAnswers: repeatedAnswers
    });

    expect(lab.inputs.hearing.responseConsistency.retestRecommended).toBe(true);
    expect(lab.inputs.hearing.influenceWeight).toBeLessThan(0.2);
    expect(lab.readiness.blockers).toContain('Hearing answers need a repeat check before strong personalization.');
  });

  it('keeps preference-only learning useful but not overconfident', () => {
    const preferenceModel = buildPreferenceModelFromChoices({
      footstep_vs_comfort: 'a',
      wide_vs_center: 'b'
    });
    const lab = buildPersonalizationLabInputs({ preferenceModel });

    expect(lab.inputs.preference.present).toBe(true);
    expect(lab.inputs.preference.ready).toBe(false);
    expect(lab.inputs.preference.influenceWeight).toBeGreaterThan(0);
    expect(lab.inputs.preference.influenceWeight).toBeLessThan(0.2);
    expect(lab.readiness.nextActions).toContain('Run This-or-That / Blind Match.');
  });

  it('refuses medical and audiometry style claims', () => {
    expect(evaluatePersonalizationClaimBoundary('CueForge builds a medical audiogram.').ok).toBe(false);
    expect(evaluatePersonalizationClaimBoundary('CueForge learns comfort and preference signals from safe local tests.').ok).toBe(true);
  });
});
