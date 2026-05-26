import {
  applyPreferenceModelToEq,
  buildPreferenceModelFromChoices,
  describePreferenceModel,
  preferenceRounds
} from './core/preferenceModel.js';

export const SOUND_MATCH_FAST_ROUNDS = 5;
export const SOUND_MATCH_STANDARD_ROUNDS = 9;
export const SOUND_MATCH_MAX_ROUNDS = 12;
export const SOUND_MATCH_NEUTRAL_CHOICE = 'neutral';

const baseRoundById = Object.fromEntries(preferenceRounds.map((round) => [round.id, round]));

function roundSpec(id, label, sampleA, sampleB, extra = {}) {
  const base = baseRoundById[id];
  return {
    ...base,
    ...extra,
    id: extra.id || id,
    sourceRoundId: id,
    label,
    neutralLabel: 'Too close / no clear difference',
    a: {
      name: extra.labelA || base.labelA,
      eqDelta: sampleA.eqDelta,
      frequencies: sampleA.frequencies,
      loudnessGain: sampleA.loudnessGain ?? 0.86
    },
    b: {
      name: extra.labelB || base.labelB,
      eqDelta: sampleB.eqDelta,
      frequencies: sampleB.frequencies,
      loudnessGain: sampleB.loudnessGain ?? 0.86
    }
  };
}

function reversedRepeat(source, id, label) {
  return {
    ...source,
    id,
    label,
    prompt: 'Hidden repeat, swapped order. Pick what still works, or mark it too close.',
    labelA: source.labelB,
    labelB: source.labelA,
    deltaA: source.deltaB,
    deltaB: source.deltaA,
    a: { ...source.b, name: source.labelB },
    b: { ...source.a, name: source.labelA },
    repeatOf: source.sourceRoundId || source.id,
    reversed: true
  };
}

const footstepRound = roundSpec(
  'footstep_vs_comfort',
  'Footsteps vs comfort',
  { eqDelta: [0, 0, -0.2, -0.4, -0.2, 0.2, 1.4, 1.6, -0.4, -0.6], frequencies: [900, 2200, 4200] },
  { eqDelta: [0.2, 0.1, 0, 0, -0.1, 0, 0.3, 0.1, -1.2, -0.8], frequencies: [700, 1800, 3600] }
);

const bassRound = roundSpec(
  'bass_vs_comms',
  'Bass vs comms',
  { eqDelta: [1.2, 1, 0.7, 0, -0.2, 0, 0.2, 0.2, 0, 0], frequencies: [55, 120, 1200] },
  { eqDelta: [-0.4, -0.5, -0.4, -0.2, 0.6, 1, 0.9, 0.4, -0.2, -0.4], frequencies: [500, 1000, 2400] }
);

const spaceRound = roundSpec(
  'wide_vs_center',
  'Space vs center',
  { eqDelta: [0.2, 0.3, 0.1, -0.2, -0.2, 0, 0.5, 0.7, 0.5, 0.4], frequencies: [330, 1320, 5280] },
  { eqDelta: [-0.2, -0.2, 0, 0.3, 0.6, 0.4, 0.2, 0, -0.2, -0.2], frequencies: [440, 880, 1760] }
);

const detailRound = roundSpec(
  'detail_vs_fatigue',
  'Detail vs fatigue',
  { eqDelta: [0, 0, 0, -0.2, 0, 0.2, 1, 1.4, 0.6, 0.4], frequencies: [2400, 5200, 9000] },
  { eqDelta: [0, 0, 0, 0, 0.2, 0.4, 0.6, 0.2, -1.4, -1], frequencies: [1500, 3800, 6500] }
);

const directionRound = roundSpec(
  'direction_vs_body',
  'Direction vs body',
  { eqDelta: [-1, -0.7, -0.2, -0.1, 0.2, 0.5, 1, 1.1, -0.2, -0.3], frequencies: [650, 1900, 3900] },
  { eqDelta: [0.6, 0.5, 0.4, 0, 0.1, 0.1, 0.2, 0.1, -0.2, -0.2], frequencies: [110, 250, 1100] }
);

const maskingRound = roundSpec(
  'masking_cut_vs_cue_boost',
  'Masking cut vs cue boost',
  { eqDelta: [-0.5, -0.7, -0.6, -0.3, 0.1, 0.4, 0.7, 0.5, -0.2, -0.2], frequencies: [140, 320, 2100] },
  { eqDelta: [-0.2, -0.2, -0.1, 0, 0.1, 0.5, 1.1, 1.2, 0.2, 0], frequencies: [900, 2600, 5200] }
);

const voiceRound = roundSpec(
  'voice_separation_vs_game_body',
  'Voice separation vs game body',
  { eqDelta: [-0.3, -0.4, -0.3, -0.1, 0.4, 0.9, 0.8, 0.3, -0.2, -0.3], frequencies: [500, 1100, 2500] },
  { eqDelta: [0.8, 0.7, 0.5, 0.1, 0, 0.1, 0.1, -0.1, -0.3, -0.3], frequencies: [80, 180, 760] }
);

export const blindMatchRounds = [
  footstepRound,
  bassRound,
  spaceRound,
  detailRound,
  directionRound,
  maskingRound,
  voiceRound,
  reversedRepeat(footstepRound, 'repeat_footstep_vs_comfort', 'Reliability: footsteps repeat'),
  reversedRepeat(bassRound, 'repeat_bass_vs_comms', 'Reliability: bass/comms repeat')
];

export function createBlindMatchResult(choices = {}, baseEq = Array(10).fill(0)) {
  const deltas = new Array(baseEq.length).fill(0);
  const picked = [];
  const applied = [];
  const noDifferenceCount = blindMatchRounds.filter((round) => isNeutralChoice(choices[round.id])).length;
  const preferenceModel = buildPreferenceModelFromChoices(choices, blindMatchRounds);

  blindMatchRounds.forEach((round) => {
    const choice = choices[round.id];
    if (!choice) return;

    if (isNeutralChoice(choice)) {
      picked.push(`${round.label}: too close`);
      return;
    }

    const sample = round[choice];
    if (!sample) return;

    applied.push(round.id);
    picked.push(`${round.label}: ${sample.name}`);
    sample.eqDelta.forEach((delta, index) => {
      deltas[index] += delta;
    });
  });

  const completedRounds = picked.length;
  const divisor = Math.max(1, applied.length);
  const sampleEq = baseEq.map((gain, index) => clamp(Number((gain + deltas[index] / divisor).toFixed(1)), -6, 6));
  const eq = applyPreferenceModelToEq(sampleEq, preferenceModel, 0.75);
  const repeatChecks = buildRepeatChecks(choices);
  const contradictions = repeatChecks.filter((check) => check.consistent === false).length;
  const confidence = calculateSoundMatchConfidence({
    completedRounds,
    contradictions,
    noDifferenceCount,
    preferenceModel,
    repeatChecks
  });
  const preferenceSummary = describePreferenceModel(preferenceModel);
  const applyReadiness = buildApplyReadiness({ completedRounds, contradictions, confidence, noDifferenceCount, repeatChecks });
  const whyChips = buildWhyChips({ applyReadiness, contradictions, noDifferenceCount, repeatChecks });

  return {
    schema: 'cueforge.sound-match-result.v2',
    mode: 'standard',
    requiredRounds: SOUND_MATCH_STANDARD_ROUNDS,
    maxAdaptiveRounds: SOUND_MATCH_MAX_ROUNDS,
    confidence,
    completedRounds,
    noDifferenceCount,
    repeatChecks,
    contradictions,
    applyReadiness,
    whyChips,
    picked,
    eq,
    preferenceModel,
    preferenceSummary,
    signature: buildSignature(eq),
    summary: picked.length
      ? `Learned from ${picked.length} Sound Match choices with ${repeatChecks.length} repeat check${repeatChecks.length === 1 ? '' : 's'}. ${buildSignature(eq)}. Preference identity: ${preferenceSummary}.`
      : 'No choices yet.'
  };
}

function buildRepeatChecks(choices = {}) {
  return blindMatchRounds
    .filter((round) => round.repeatOf)
    .map((round) => {
      const sourceChoice = choices[round.repeatOf];
      const repeatChoice = choices[round.id];
      const expectedRepeat = expectedRepeatChoice(sourceChoice, round);
      const complete = Boolean(expectedRepeat && repeatChoice && !isNeutralChoice(repeatChoice));

      return {
        id: round.id,
        sourceRoundId: round.repeatOf,
        reversed: Boolean(round.reversed),
        sourceChoice: sourceChoice || null,
        repeatChoice: repeatChoice || null,
        expectedRepeat,
        consistent: complete ? repeatChoice === expectedRepeat : null
      };
    })
    .filter((check) => check.sourceChoice && check.repeatChoice);
}

function expectedRepeatChoice(sourceChoice, round) {
  if (!sourceChoice || isNeutralChoice(sourceChoice)) return null;
  if (!round.reversed) return sourceChoice;
  if (sourceChoice === 'a') return 'b';
  if (sourceChoice === 'b') return 'a';
  return null;
}

function calculateSoundMatchConfidence({ completedRounds, contradictions, noDifferenceCount, preferenceModel, repeatChecks }) {
  const progress = Math.min(completedRounds, SOUND_MATCH_STANDARD_ROUNDS) / SOUND_MATCH_STANDARD_ROUNDS;
  const consistentRepeats = repeatChecks.filter((check) => check.consistent === true).length;
  const allRepeatsClean = repeatChecks.length >= 2 && contradictions === 0;
  let score = 36
    + progress * 34
    + consistentRepeats * 6
    + (allRepeatsClean ? 6 : 0)
    + (preferenceModel.confidence || 0) * 8
    - noDifferenceCount * 5
    - contradictions * 18;

  if (completedRounds < SOUND_MATCH_STANDARD_ROUNDS) score = Math.min(score, 76);
  if (repeatChecks.length < 2) score = Math.min(score, 82);
  if (contradictions > 0) score = Math.min(score, 74 - contradictions * 6);
  if (noDifferenceCount >= 3) score = Math.min(score, 78);

  return Math.round(clamp(score, 0, 96));
}

function buildApplyReadiness({ completedRounds, contradictions, confidence, noDifferenceCount, repeatChecks }) {
  const ready = completedRounds >= SOUND_MATCH_STANDARD_ROUNDS
    && repeatChecks.length >= 2
    && contradictions === 0
    && noDifferenceCount <= 2
    && confidence >= 82;

  return {
    ready,
    status: ready ? 'ready' : 'preview',
    reason: ready
      ? 'Standard Sound Match is complete and repeat choices stayed consistent.'
      : 'Preview only until the standard 9-round consistency check is complete.'
  };
}

function buildWhyChips({ applyReadiness, contradictions, noDifferenceCount, repeatChecks }) {
  const chips = ['standard 9-round check'];
  if (repeatChecks.length) chips.push(`${repeatChecks.length} repeat checks`);
  if (repeatChecks.length >= 2 && contradictions === 0) chips.push('repeat choices clean');
  if (noDifferenceCount) chips.push(`${noDifferenceCount} too-close picks`);
  if (contradictions) chips.push(`${contradictions} contradiction${contradictions === 1 ? '' : 's'}`);
  if (!applyReadiness.ready) chips.push('preview only');
  return chips;
}

function buildSignature(eq) {
  const low = (eq[0] + eq[1] + eq[2]) / 3;
  const cue = (eq[6] + eq[7]) / 2;
  const air = (eq[8] + eq[9]) / 2;
  const parts = [];
  parts.push(cue > 2.5 ? 'cue-forward' : 'balanced cues');
  parts.push(low < -0.8 ? 'controlled bass' : 'fuller lows');
  parts.push(air < 0 ? 'smooth treble' : 'open treble');
  return parts.join(', ');
}

function isNeutralChoice(choice) {
  return [SOUND_MATCH_NEUTRAL_CHOICE, 'too_close', 'none'].includes(choice);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
