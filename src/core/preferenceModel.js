import { clampEqToSafety } from './safetyRules.js';

const EQ_BANDS = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

const preferenceKeys = [
  'footstepPriority',
  'harshnessTolerance',
  'bassImpact',
  'voiceClarity',
  'spatialWidth',
  'centerFocus',
  'detailPriority',
  'comfortPriority',
  'fatigueRisk',
  'presence',
  'treble',
  'bass'
];

export const defaultPreferenceModel = Object.fromEntries(preferenceKeys.map((key) => [key, 0]));

export const preferenceRounds = [
  {
    id: 'footstep_vs_comfort',
    prompt: 'More footsteps or less harshness?',
    labelA: 'More footstep bite',
    labelB: 'Less sharp / more comfortable',
    deltaA: { footstepPriority: 1, presence: 0.5, fatigueRisk: 0.25, harshnessTolerance: 0.25 },
    deltaB: { comfortPriority: 1, treble: -0.5, fatigueRisk: -0.5, harshnessTolerance: -1 }
  },
  {
    id: 'bass_vs_comms',
    prompt: 'More bass impact or cleaner comms?',
    labelA: 'More bass impact',
    labelB: 'Cleaner teammate voice',
    deltaA: { bassImpact: 1, bass: 0.75, voiceClarity: -0.25 },
    deltaB: { voiceClarity: 1, bassImpact: -0.25, bass: -0.35, presence: 0.35 }
  },
  {
    id: 'wide_vs_center',
    prompt: 'Wider space or tighter center?',
    labelA: 'Wider space',
    labelB: 'Tighter center image',
    deltaA: { spatialWidth: 1, centerFocus: -0.25 },
    deltaB: { centerFocus: 1, spatialWidth: -0.5 }
  },
  {
    id: 'detail_vs_fatigue',
    prompt: 'More detail or less fatigue?',
    labelA: 'More small detail',
    labelB: 'Less fatigue',
    deltaA: { detailPriority: 1, footstepPriority: 0.5, treble: 0.35, fatigueRisk: 0.35 },
    deltaB: { comfortPriority: 0.75, fatigueRisk: -1, treble: -0.45, harshnessTolerance: -0.5 }
  },
  {
    id: 'direction_vs_body',
    prompt: 'Sharper direction or fuller body?',
    labelA: 'Sharper direction',
    labelB: 'Fuller game body',
    deltaA: { footstepPriority: 0.75, centerFocus: 0.5, presence: 0.5, bass: -0.25 },
    deltaB: { bassImpact: 0.5, bass: 0.45, comfortPriority: 0.25, presence: -0.15 }
  }
];

function clamp(value, min = -5, max = 5) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function roundDelta(round, sampleKey) {
  if (!round) return {};
  if (sampleKey === 'a' || sampleKey === 'this') return round.deltaA || round.weightDeltaA || {};
  if (sampleKey === 'b' || sampleKey === 'that') return round.deltaB || round.weightDeltaB || {};
  return {};
}

export function updatePreferenceModel(current = {}, choice = {}) {
  const next = { ...defaultPreferenceModel, ...current };
  const deltas = choice.weightDelta || choice.delta || {};

  for (const [key, delta] of Object.entries(deltas)) {
    next[key] = clamp((next[key] ?? 0) + delta);
  }

  next.roundsCompleted = (next.roundsCompleted ?? 0) + 1;
  next.confidence = Math.min(1, next.roundsCompleted / 12);
  next.updatedAt = choice.updatedAt || new Date().toISOString();

  return next;
}

export function buildPreferenceModelFromChoices(choices = {}, rounds = preferenceRounds) {
  return rounds.reduce((model, round) => {
    const sampleKey = choices[round.id];
    if (!sampleKey) return model;
    return updatePreferenceModel(model, {
      roundId: round.id,
      selected: sampleKey,
      weightDelta: roundDelta(round, sampleKey)
    });
  }, { ...defaultPreferenceModel, roundsCompleted: 0, confidence: 0 });
}

export function preferenceEqDeltas(model = {}) {
  const m = { ...defaultPreferenceModel, ...model };
  return [
    clamp(m.bassImpact * 0.12 + m.bass * 0.16, -1.2, 1.2),
    clamp(m.bassImpact * 0.18 + m.bass * 0.22, -1.4, 1.4),
    clamp(m.bassImpact * 0.12 + m.bass * 0.16 - m.voiceClarity * 0.08, -1.2, 1.2),
    clamp(-m.voiceClarity * 0.1 - m.footstepPriority * 0.08, -1, 0.6),
    clamp(m.voiceClarity * 0.12 - m.bassImpact * 0.06, -0.8, 1),
    clamp(m.voiceClarity * 0.18 + m.presence * 0.14, -0.8, 1.2),
    clamp(m.footstepPriority * 0.25 + m.detailPriority * 0.18 + m.presence * 0.18, -1.2, 1.8),
    clamp(m.footstepPriority * 0.28 + m.detailPriority * 0.2 + m.presence * 0.2 - Math.max(0, -m.harshnessTolerance) * 0.12, -1.2, 1.8),
    clamp(m.treble * 0.24 + m.detailPriority * 0.08 - m.comfortPriority * 0.2 - Math.max(0, -m.fatigueRisk) * 0.2, -1.5, 1.3),
    clamp(m.treble * 0.18 - m.comfortPriority * 0.2 - Math.max(0, -m.fatigueRisk) * 0.25, -1.5, 1.1)
  ].map((value) => Number(value.toFixed(2)));
}

export function applyPreferenceModelToEq(eq = [], model = {}, amount = 1) {
  const deltas = preferenceEqDeltas(model);
  const blend = clamp(amount, 0, 1);
  const next = eq.map((gain, index) => Number(clamp((Number(gain) || 0) + (deltas[index] || 0) * blend, -6, 6).toFixed(2)));
  return clampEqToSafety(next, EQ_BANDS);
}

export function applyPreferenceModelToDynamics(dynamics = {}, model = {}) {
  const m = { ...defaultPreferenceModel, ...model };
  return {
    ...dynamics,
    explosionTame: clamp((dynamics.explosionTame ?? 0.35) + Math.max(0, m.footstepPriority) * 0.03 + Math.max(0, -m.fatigueRisk) * 0.04, 0, 1),
    transientClarity: clamp((dynamics.transientClarity ?? 0.45) + m.detailPriority * 0.04 + m.footstepPriority * 0.03, 0, 1),
    dialogueLift: clamp((dynamics.dialogueLift ?? 0.25) + Math.max(0, m.voiceClarity) * 0.06, 0, 1),
    fatigueGuard: clamp((dynamics.fatigueGuard ?? 0.25) + Math.max(0, m.comfortPriority) * 0.08 + Math.max(0, -m.fatigueRisk) * 0.08, 0, 1)
  };
}

export function applyPreferenceModelToSpatial(spatial = {}, model = {}) {
  const m = { ...defaultPreferenceModel, ...model };
  const crossfeedBase = Number(spatial.crossfeed ?? 0.2);

  return {
    ...spatial,
    mode: m.centerFocus > m.spatialWidth ? 'center_locked_personal' : m.spatialWidth >= 1 ? 'personal_wide_safe' : spatial.mode,
    crossfeed: Number(clamp(crossfeedBase + m.centerFocus * 0.03 - m.spatialWidth * 0.025, 0.05, 0.45).toFixed(2)),
    preferenceWidth: Number(clamp(m.spatialWidth - m.centerFocus * 0.5, -5, 5).toFixed(2))
  };
}

export function describePreferenceModel(model = {}) {
  const m = { ...defaultPreferenceModel, ...model };
  const parts = [];

  parts.push(m.footstepPriority >= 2 ? 'footstep-forward' : m.footstepPriority <= -1 ? 'relaxed footsteps' : 'balanced footsteps');
  parts.push(m.voiceClarity >= 1.5 ? 'comms-forward' : m.bassImpact >= 1.5 ? 'impact-forward' : 'balanced body');
  parts.push(m.spatialWidth > m.centerFocus ? 'wider space' : m.centerFocus > m.spatialWidth ? 'tight center' : 'stable image');
  parts.push(m.fatigueRisk <= -1 || m.comfortPriority >= 2 ? 'low-fatigue' : m.detailPriority >= 2 ? 'detail-seeking' : 'comfort-aware');

  return parts.join(', ');
}
