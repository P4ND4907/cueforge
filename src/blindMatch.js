import {
  applyPreferenceModelToEq,
  buildPreferenceModelFromChoices,
  describePreferenceModel,
  preferenceRounds
} from './core/preferenceModel.js';

export const SOUND_MATCH_FAST_ROUNDS = 5;
export const SOUND_MATCH_PREVIEW_ROUNDS = 9;
export const SOUND_MATCH_STANDARD_ROUNDS = 15;
export const SOUND_MATCH_REQUIRED_REPEATS = 4;
export const SOUND_MATCH_MAX_ROUNDS = 18;
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

const distantCueRound = roundSpec(
  'footstep_vs_comfort',
  'Distant cues vs comfort',
  { eqDelta: [-0.2, -0.2, -0.3, -0.3, 0, 0.3, 1.2, 1.5, -0.5, -0.7], frequencies: [1100, 2600, 4700], loudnessGain: 0.84 },
  { eqDelta: [0.2, 0.1, 0, 0, 0, 0.1, 0.4, 0.1, -1, -0.9], frequencies: [760, 1800, 3600], loudnessGain: 0.86 },
  {
    id: 'distant_cues_vs_comfort',
    prompt: 'Do distant cue edges help, or does the calmer version stay easier to trust?',
    labelA: 'More distant cue edge',
    labelB: 'Smoother long-session cues'
  }
);

const commsUnderChaosRound = roundSpec(
  'bass_vs_comms',
  'Comms under action vs bass',
  { eqDelta: [1, 0.9, 0.6, 0.1, -0.2, -0.1, 0.1, 0.1, 0, 0], frequencies: [50, 95, 180], loudnessGain: 0.82 },
  { eqDelta: [-0.6, -0.6, -0.4, -0.1, 0.7, 1, 0.8, 0.3, -0.2, -0.4], frequencies: [650, 1200, 2600], loudnessGain: 0.86 },
  {
    id: 'comms_under_chaos_vs_bass',
    prompt: 'When action gets busy, should bass stay big or should teammate voice cut through?',
    labelA: 'Keep action impact',
    labelB: 'Clearer comms in chaos'
  }
);

const spaceScanRound = roundSpec(
  'wide_vs_center',
  'Wide scan vs center lock',
  { eqDelta: [0.1, 0.2, 0.1, -0.2, -0.1, 0, 0.4, 0.6, 0.5, 0.3], frequencies: [300, 1200, 5200], loudnessGain: 0.85 },
  { eqDelta: [-0.2, -0.2, 0, 0.2, 0.5, 0.5, 0.2, 0, -0.1, -0.2], frequencies: [480, 960, 1900], loudnessGain: 0.86 },
  {
    id: 'space_scan_vs_center_lock',
    prompt: 'Does the wider scan help, or is the tighter center image easier to aim with?',
    labelA: 'Wider scan',
    labelB: 'Tighter center lock'
  }
);

const airDetailRound = roundSpec(
  'detail_vs_fatigue',
  'Air detail vs long session',
  { eqDelta: [0, 0, 0, -0.1, 0.1, 0.2, 0.9, 1.2, 0.8, 0.5], frequencies: [3000, 5600, 9600], loudnessGain: 0.84 },
  { eqDelta: [0, 0, 0, 0, 0.2, 0.4, 0.5, 0.2, -1.2, -1], frequencies: [1600, 3600, 7200], loudnessGain: 0.86 },
  {
    id: 'air_detail_vs_long_session',
    prompt: 'Do you want more air/detail, or the version that feels safer for longer sessions?',
    labelA: 'More air detail',
    labelB: 'Less long-session fatigue'
  }
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
  reversedRepeat(bassRound, 'repeat_bass_vs_comms', 'Reliability: bass/comms repeat'),
  distantCueRound,
  commsUnderChaosRound,
  spaceScanRound,
  airDetailRound,
  reversedRepeat(spaceRound, 'repeat_space_vs_center', 'Reliability: space/center repeat'),
  reversedRepeat(detailRound, 'repeat_detail_vs_fatigue', 'Reliability: detail/fatigue repeat')
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
  const previewReady = completedRounds >= SOUND_MATCH_PREVIEW_ROUNDS;

  return {
    schema: 'cueforge.sound-match-result.v2',
    mode: 'standard',
    previewRounds: SOUND_MATCH_PREVIEW_ROUNDS,
    requiredRounds: SOUND_MATCH_STANDARD_ROUNDS,
    requiredRepeatChecks: SOUND_MATCH_REQUIRED_REPEATS,
    maxAdaptiveRounds: SOUND_MATCH_MAX_ROUNDS,
    confidence,
    completedRounds,
    previewReady,
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

export function buildSoundMatchUiState(result = {}) {
  const required = Number(result.requiredRounds || SOUND_MATCH_STANDARD_ROUNDS);
  const previewRequired = Number(result.previewRounds || SOUND_MATCH_PREVIEW_ROUNDS);
  const completedRaw = Math.max(0, Number(result.completedRounds || 0));
  const completed = Math.max(0, Math.min(required, completedRaw));
  const remaining = Math.max(0, required - completed);
  const previewRemaining = Math.max(0, previewRequired - completedRaw);
  const previewReady = Boolean(result.previewReady ?? completedRaw >= previewRequired);
  const percent = Math.round((completed / Math.max(1, required)) * 100);
  const repeatClean = (result.repeatChecks || []).filter((check) => check.consistent === true).length;
  const repeatTotal = Math.max(SOUND_MATCH_REQUIRED_REPEATS, (result.repeatChecks || []).length);
  const ready = Boolean(result.applyReadiness?.ready);
  const previewPlural = previewRemaining === 1 ? 'round' : 'rounds';
  const remainingPlural = remaining === 1 ? 'round' : 'rounds';
  const lockedActions = [];

  if (!previewReady) {
    lockedActions.push(`Save unlocks after ${previewRemaining} more ${previewPlural}.`);
    lockedActions.push(`Export unlocks after ${previewRemaining} more ${previewPlural}.`);
  }
  if (!ready) {
    lockedActions.push('Apply stays locked until 15 rounds are complete and 4 repeat checks are clean.');
  }

  return {
    progress: {
      completed,
      required,
      remaining,
      percent,
      label: `${completed} of ${required} rounds complete`
    },
    preview: {
      ready: previewReady,
      required: previewRequired,
      remaining: previewRemaining
    },
    repeatSummary: repeatClean >= SOUND_MATCH_REQUIRED_REPEATS && (result.contradictions || 0) === 0
      ? `${repeatClean} repeat checks clean`
      : `${repeatClean}/${repeatTotal} repeat checks clean`,
    primaryHint: ready
      ? 'Ready: save, export, or apply the learned EQ after review.'
      : !previewReady
        ? `Keep choosing. ${previewRemaining} ${previewPlural} left before the quick preview unlocks.`
        : remaining > 0
          ? `Quick preview built. Continue ${remaining} ${remainingPlural} for adjustment-grade confidence.`
        : result.contradictions
          ? 'Repeat choices contradicted. Review before applying the learned EQ.'
          : 'Complete repeat checks cleanly before direct apply unlocks.',
    lockedActions
  };
}

export function buildSoundMatchInsightState(result = {}) {
  const model = result.preferenceModel || {};
  const complete = Number(result.completedRounds || 0) >= Number(result.requiredRounds || SOUND_MATCH_STANDARD_ROUNDS);
  const previewComplete = Boolean(result.previewReady ?? Number(result.completedRounds || 0) >= Number(result.previewRounds || SOUND_MATCH_PREVIEW_ROUNDS));
  const contradictions = Number(result.contradictions || 0);
  const ready = Boolean(result.applyReadiness?.ready);
  const repeatChecks = result.repeatChecks || [];
  const repeatRepairRoundIds = repeatChecks
    .filter((check) => check.consistent === false)
    .map((check) => check.id);
  const score = (...keys) => {
    const total = keys.reduce((sum, key) => sum + Math.max(0, Number(model[key] || 0)), 0);
    return Math.round(clamp(42 + total * 18, 8, 96));
  };
  const invertScore = (...keys) => {
    const total = keys.reduce((sum, key) => sum + Math.max(0, Number(model[key] || 0)), 0);
    return Math.round(clamp(56 + total * 14, 8, 96));
  };
  const preferenceSignals = [
    {
      id: 'cue',
      label: 'Cue clarity',
      value: score('footstepPriority', 'cueBoost', 'detailPriority'),
      meaning: 'Footsteps and small positional details get more attention.'
    },
    {
      id: 'comms',
      label: 'Comms cut',
      value: score('voiceClarity', 'voiceSeparation'),
      meaning: 'Teammate voice is protected from game body and bass.'
    },
    {
      id: 'body',
      label: 'Game body',
      value: score('bassImpact', 'gameBody', 'bass'),
      meaning: 'Explosions, engines, and world weight stay present.'
    },
    {
      id: 'center',
      label: 'Center lock',
      value: score('centerFocus'),
      meaning: 'The image leans tighter instead of extra wide.'
    },
    {
      id: 'masking',
      label: 'Masking guard',
      value: score('maskingControl'),
      meaning: 'Muddy bands are kept from covering important cues.'
    },
    {
      id: 'comfort',
      label: 'Comfort',
      value: invertScore('comfortPriority', 'harshnessTolerance'),
      meaning: 'The tune avoids sharpness and long-session fatigue.'
    }
  ];

  const strongest = [...preferenceSignals].sort((a, b) => b.value - a.value)[0];
  const weakest = [...preferenceSignals].sort((a, b) => a.value - b.value)[0];
  const statusTitle = ready
    ? 'Ready to apply'
    : complete && contradictions > 0
      ? 'Direct apply locked'
      : complete
        ? 'Needs one clean review'
        : previewComplete
          ? 'Preview curve ready'
          : 'Learning in progress';
  const statusBody = ready
    ? 'Your choices finished the 15-round adjustment check and all hidden repeats agreed, so CueForge can apply this curve after review.'
    : complete && contradictions > 0
      ? `You finished 15 rounds, but ${contradictions} hidden repeat check${contradictions === 1 ? '' : 's'} disagreed. Save/export is fine; direct apply stays locked until those repeats are clean.`
      : complete
        ? 'The full round set is complete, but CueForge still needs clean repeat evidence before direct apply.'
        : previewComplete
          ? 'The 9-round preview is useful evidence for save/export, but it is not enough for live adjustment. Keep going to 15 rounds and 4 clean repeat checks before applying.'
          : 'Keep picking between A and B. The quick preview unlocks at 9 rounds; direct apply waits for 15 rounds and 4 clean repeat checks.';
  const nextStep = ready
    ? 'Apply it, then play one real match before changing anything else.'
    : complete && contradictions > 0
      ? 'Retake the highlighted repeat rounds. Do not change your whole setup yet.'
      : complete
        ? 'Review the result and rerun any uncertain choices before applying.'
        : previewComplete
          ? 'Save or export the preview if needed, then continue the deeper adjustment check.'
          : 'Reach the 9-round preview first, then continue if you want CueForge to apply the learned EQ.';
  const exportStatus = previewComplete
    ? 'The 9-round preview can be exported for replay and QA. Direct apply still waits for the full 15-round adjustment check.'
    : 'Export unlocks after the 9-round preview checkpoint is complete.';

  return {
    statusTitle,
    statusBody,
    nextStep,
    exportStatus,
    preferenceSignals,
    strongest,
    weakest,
    repeatRepairRoundIds,
    plainMeaning: strongest
      ? `Your curve mostly leans toward ${strongest.label.toLowerCase()}. Weakest signal: ${weakest.label.toLowerCase()}.`
      : 'No preference signal yet.'
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
  const allRepeatsClean = repeatChecks.length >= SOUND_MATCH_REQUIRED_REPEATS && contradictions === 0;
  let score = 36
    + progress * 34
    + consistentRepeats * 6
    + (allRepeatsClean ? 6 : 0)
    + (preferenceModel.confidence || 0) * 8
    - noDifferenceCount * 5
    - contradictions * 18;

  if (completedRounds < SOUND_MATCH_PREVIEW_ROUNDS) score = Math.min(score, 68);
  if (completedRounds < SOUND_MATCH_STANDARD_ROUNDS) score = Math.min(score, 78);
  if (repeatChecks.length < SOUND_MATCH_REQUIRED_REPEATS) score = Math.min(score, 80);
  if (contradictions > 0) score = Math.min(score, 74 - contradictions * 6);
  if (noDifferenceCount >= 5) score = Math.min(score, 78);

  return Math.round(clamp(score, 0, 96));
}

function buildApplyReadiness({ completedRounds, contradictions, confidence, noDifferenceCount, repeatChecks }) {
  const ready = completedRounds >= SOUND_MATCH_STANDARD_ROUNDS
    && repeatChecks.length >= SOUND_MATCH_REQUIRED_REPEATS
    && contradictions === 0
    && noDifferenceCount <= 4
    && confidence >= 84;

  return {
    ready,
    status: ready ? 'ready' : 'preview',
    reason: ready
      ? 'Adjustment-grade Sound Match is complete and all repeat choices stayed consistent.'
      : 'Preview only until the 15-round adjustment check and 4 repeat checks are complete.'
  };
}

function buildWhyChips({ applyReadiness, contradictions, noDifferenceCount, repeatChecks }) {
  const chips = ['9-round preview', '15-round adjustment check'];
  if (repeatChecks.length) chips.push(`${repeatChecks.length} repeat checks`);
  if (repeatChecks.length >= SOUND_MATCH_REQUIRED_REPEATS && contradictions === 0) chips.push('repeat choices clean');
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
