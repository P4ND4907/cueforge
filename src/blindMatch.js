import {
  applyPreferenceModelToEq,
  buildPreferenceModelFromChoices,
  describePreferenceModel,
  preferenceRounds
} from './core/preferenceModel.js';

export const blindMatchRounds = [
  {
    ...preferenceRounds[0],
    label: 'Footsteps vs comfort',
    a: { name: preferenceRounds[0].labelA, eqDelta: [0, 0, -0.2, -0.4, -0.2, 0.2, 1.4, 1.6, -0.4, -0.6], frequencies: [900, 2200, 4200] },
    b: { name: preferenceRounds[0].labelB, eqDelta: [0.2, 0.1, 0, 0, -0.1, 0, 0.3, 0.1, -1.2, -0.8], frequencies: [700, 1800, 3600] }
  },
  {
    ...preferenceRounds[1],
    label: 'Bass vs comms',
    a: { name: preferenceRounds[1].labelA, eqDelta: [1.2, 1, 0.7, 0, -0.2, 0, 0.2, 0.2, 0, 0], frequencies: [55, 120, 1200] },
    b: { name: preferenceRounds[1].labelB, eqDelta: [-0.4, -0.5, -0.4, -0.2, 0.6, 1, 0.9, 0.4, -0.2, -0.4], frequencies: [500, 1000, 2400] }
  },
  {
    ...preferenceRounds[2],
    label: 'Space vs center',
    a: { name: preferenceRounds[2].labelA, eqDelta: [0.2, 0.3, 0.1, -0.2, -0.2, 0, 0.5, 0.7, 0.5, 0.4], frequencies: [330, 1320, 5280] },
    b: { name: preferenceRounds[2].labelB, eqDelta: [-0.2, -0.2, 0, 0.3, 0.6, 0.4, 0.2, 0, -0.2, -0.2], frequencies: [440, 880, 1760] }
  },
  {
    ...preferenceRounds[3],
    label: 'Detail vs fatigue',
    a: { name: preferenceRounds[3].labelA, eqDelta: [0, 0, 0, -0.2, 0, 0.2, 1, 1.4, 0.6, 0.4], frequencies: [2400, 5200, 9000] },
    b: { name: preferenceRounds[3].labelB, eqDelta: [0, 0, 0, 0, 0.2, 0.4, 0.6, 0.2, -1.4, -1], frequencies: [1500, 3800, 6500] }
  },
  {
    ...preferenceRounds[4],
    label: 'Direction vs body',
    a: { name: preferenceRounds[4].labelA, eqDelta: [-1, -0.7, -0.2, -0.1, 0.2, 0.5, 1, 1.1, -0.2, -0.3], frequencies: [650, 1900, 3900] },
    b: { name: preferenceRounds[4].labelB, eqDelta: [0.6, 0.5, 0.4, 0, 0.1, 0.1, 0.2, 0.1, -0.2, -0.2], frequencies: [110, 250, 1100] }
  }
];

export function createBlindMatchResult(choices, baseEq) {
  const deltas = new Array(baseEq.length).fill(0);
  const picked = [];
  const preferenceModel = buildPreferenceModelFromChoices(choices, blindMatchRounds);

  blindMatchRounds.forEach((round) => {
    const choice = choices[round.id];
    if (!choice) return;
    const sample = round[choice];
    picked.push(`${round.label}: ${sample.name}`);
    sample.eqDelta.forEach((delta, index) => {
      deltas[index] += delta;
    });
  });

  const rounds = Math.max(1, picked.length);
  const sampleEq = baseEq.map((gain, index) => clamp(Number((gain + deltas[index] / rounds).toFixed(1)), -6, 6));
  const eq = applyPreferenceModelToEq(sampleEq, preferenceModel, 0.75);
  const confidence = Math.min(96, 44 + picked.length * 8 + Math.round((preferenceModel.confidence || 0) * 12));
  const preferenceSummary = describePreferenceModel(preferenceModel);

  return {
    confidence,
    completedRounds: picked.length,
    picked,
    eq,
    preferenceModel,
    preferenceSummary,
    signature: buildSignature(eq),
    summary: picked.length
      ? `Learned from ${picked.length} this-or-that choices. ${buildSignature(eq)}. Preference identity: ${preferenceSummary}.`
      : 'No choices yet.'
  };
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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
