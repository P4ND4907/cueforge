import { genreForGame, genreProfiles, profileById } from '../data/genreProfiles.js';
import {
  applyPreferenceModelToDynamics,
  applyPreferenceModelToEq,
  applyPreferenceModelToSpatial,
  describePreferenceModel
} from './preferenceModel.js';
import { clampEqToSafety } from './safetyRules.js';

const EQ_BANDS = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function sourceMode(graph, conflicts) {
  const highRisk = conflicts?.summary?.high || 0;
  if (highRisk > 0) return 'safe-baseline';
  if (graph?.summary?.applyTargets > 0 && graph?.summary?.desktopBridge) return 'guided-apply';
  if (graph?.summary?.outputs > 0) return 'export-first';
  return 'setup-first';
}

function bandValue(eqBias = {}, band) {
  if (band <= 62) return eqBias.subBass || 0;
  if (band <= 125) return eqBias.bass || 0;
  if (band <= 500) return band === 500 ? (eqBias.lowMids || 0) * 0.65 : eqBias.lowMids || 0;
  if (band <= 2000) return band === 1000 ? (eqBias.presence || 0) * 0.45 : eqBias.presence || 0;
  if (band === 4000) return average([eqBias.presence || 0, eqBias.treble || 0]);
  if (band === 8000) return eqBias.treble || 0;
  return eqBias.air || 0;
}

export function buildEqFromBias(eqBias = {}) {
  return EQ_BANDS.map((band) => Number(clamp(bandValue(eqBias, band), -6, 6).toFixed(2)));
}

export function applyBandDelta(eq = [], targetFrequencies = [], delta = 0) {
  const targets = new Set(targetFrequencies.map((frequency) => Number(frequency)));
  return eq.map((gain, index) => (
    targets.has(EQ_BANDS[index])
      ? Number(clamp((Number(gain) || 0) + delta, -6, 6).toFixed(2))
      : Number(gain) || 0
  ));
}

function nearestBandIndex(frequency) {
  const target = Number(frequency);
  if (!Number.isFinite(target)) return -1;

  return EQ_BANDS.reduce((bestIndex, band, index) => (
    Math.abs(band - target) < Math.abs(EQ_BANDS[bestIndex] - target) ? index : bestIndex
  ), 0);
}

export function mergeHearingCompensation(eq = [], compensation = null) {
  if (!compensation) return eq;
  const next = [...eq];

  if (Array.isArray(compensation)) {
    compensation.forEach((point, index) => {
      const frequency = Number(point?.frequency ?? EQ_BANDS[index]);
      const bandIndex = nearestBandIndex(frequency);
      const gain = Number(point?.averageDb ?? point?.gainDb ?? point);
      if (bandIndex >= 0 && Number.isFinite(gain)) {
        next[bandIndex] = Number(clamp((next[bandIndex] || 0) + gain * 0.45, -6, 6).toFixed(2));
      }
    });
    return next;
  }

  Object.entries(compensation).forEach(([frequency, value]) => {
    const bandIndex = nearestBandIndex(frequency);
    const gain = Number(value?.averageDb ?? value?.gainDb ?? value);
    if (bandIndex >= 0 && Number.isFinite(gain)) {
      next[bandIndex] = Number(clamp((next[bandIndex] || 0) + gain * 0.45, -6, 6).toFixed(2));
    }
  });

  return next;
}

export function blendCurve(eq = [], preferredCurve = null, amount = 0.35) {
  if (!Array.isArray(preferredCurve) || !preferredCurve.length) return eq;
  const blend = clamp(Number(amount) || 0, 0, 1);

  return eq.map((gain, index) => {
    const preferred = preferredCurve[index];
    const target = Number(preferred?.gainDb ?? preferred?.gain ?? preferred);
    if (!Number.isFinite(target)) return gain;
    return Number(clamp(gain * (1 - blend) + target * blend, -6, 6).toFixed(2));
  });
}

export function reduceExtremeBoosts(eq = []) {
  return eq.map((gain) => {
    const value = Number(gain) || 0;
    if (value > 2.5) return Number((2.5 + (value - 2.5) * 0.35).toFixed(2));
    if (value < -4) return Number((-4 + (value + 4) * 0.5).toFixed(2));
    return Number(value.toFixed(2));
  });
}

function completeFlag(value) {
  const answered = Number(value?.score?.answered ?? value?.answered ?? 0);
  return Boolean(value?.complete || value?.score?.complete || value?.ready || value?.passed || answered >= 4);
}

function calculateProfileConfidence(state = {}) {
  const highConflicts = (state.chain?.risks || []).filter((risk) => risk.severity === 'high').length;
  const warningConflicts = (state.chain?.risks || []).filter((risk) => risk.severity !== 'high').length;
  let score = 42;

  if (state.devices?.output) score += 10;
  if (state.devices?.input) score += 6;
  if (state.calibration?.micCheck?.ready) score += 8;
  if (state.calibration?.channelCheck?.passed) score += 8;
  if (completeFlag(state.calibration?.hearingModel)) score += 10;
  if (completeFlag(state.calibration?.blindMatch)) score += 10;
  if (completeFlag(state.calibration?.maskingLab)) score += 8;
  if (state.exports?.apoConfig || state.exports?.engineManifest) score += 8;

  score -= highConflicts * 15;
  score -= warningConflicts * 4;

  return clamp(score, 18, 96);
}

function selectedProfile(state = {}, profiles = genreProfiles) {
  const selectedId = state.selectedGame?.profileId;
  return profileById(selectedId)
    || profiles.find((profile) => profile.id === selectedId)
    || profileById('balanced')
    || profiles[0];
}

function hardwareType(state = {}) {
  return String(state.devices?.outputType || state.devices?.inputType || '').toLowerCase();
}

function applyHardwareShaping(eq, state, reasons) {
  const type = hardwareType(state);
  let next = [...eq];

  if (type.includes('iem')) {
    next = applyBandDelta(next, [8000], -0.35);
    reasons.push('Kept IEM treble a little safer for long-session comfort.');
  }

  if (type.includes('headset')) {
    next = applyBandDelta(next, [125], -0.25);
    next = applyBandDelta(next, [2000, 4000], 0.25);
    reasons.push('Balanced headset bass bloom with a small cue lift.');
  }

  if (type.includes('speaker')) {
    next = applyBandDelta(next, [62, 125], -0.5);
    reasons.push('Reduced low-end spill because speakers can mask detail in rooms.');
  }

  return next;
}

export function recommendProfile(state = {}, profiles = genreProfiles) {
  const base = selectedProfile(state, profiles);
  const reasons = [`Base mode: ${base.label}`];
  let eq = buildEqFromBias(base.eqBias);
  let dynamics = { ...(base.dynamics || {}) };
  let spatial = { ...(base.spatial || {}) };

  if (state.player?.trebleSensitivity > 1) {
    eq = applyBandDelta(eq, [4000, 8000], -1.0);
    reasons.push('Reduced treble because player marked treble sensitivity.');
  }

  if (state.player?.bassPreference > 1) {
    eq = applyBandDelta(eq, [62, 125], 0.75);
    reasons.push('Added controlled bass from player preference.');
  }

  eq = applyHardwareShaping(eq, state, reasons);

  const hearingModel = state.calibration?.hearingModel;
  if (hearingModel?.compensation && completeFlag(hearingModel)) {
    eq = mergeHearingCompensation(eq, hearingModel.compensation);
    reasons.push('Merged hearing compensation overlay.');
  } else if (hearingModel?.compensation) {
    reasons.push('Skipped hearing compensation because the hearing model is not complete yet.');
  }

  if (state.calibration?.blindMatch?.preferredCurve) {
    eq = blendCurve(eq, state.calibration.blindMatch.preferredCurve, 0.35);
    reasons.push('Blended Blind Match preference curve.');
  }

  const preferenceModel = state.calibration?.preferenceModel || state.calibration?.blindMatch?.preferenceModel;
  if (preferenceModel?.roundsCompleted) {
    eq = applyPreferenceModelToEq(eq, preferenceModel, 0.85);
    dynamics = applyPreferenceModelToDynamics(dynamics, preferenceModel);
    spatial = applyPreferenceModelToSpatial(spatial, preferenceModel);
    reasons.push(`Applied This or That preference model: ${describePreferenceModel(preferenceModel)}.`);
  }

  if (state.calibration?.maskingLab?.complete) {
    reasons.push('Masking Lab is complete, so cue shaping can be judged against real masking checks.');
  }

  if (state.calibration?.micCheck?.ready === false) {
    reasons.push('Mic is not proven yet, so voice and creator recommendations stay conservative.');
  }

  if (state.chain?.risks?.length) {
    reasons.push('Chain warnings found; profile kept conservative.');
    eq = reduceExtremeBoosts(eq);
  }

  eq = clampEqToSafety(eq, EQ_BANDS);

  return {
    id: `${base.id}_personalized`,
    label: base.label,
    intent: base.intent,
    description: base.description,
    confidence: calculateProfileConfidence(state),
    reason: reasons,
    eq,
    dynamics,
    mic: state.calibration?.micCheck?.ready ? { mode: 'verified_chain' } : { mode: 'verify_before_publish' },
    spatial
  };
}

function chainRisksFromConflicts(conflicts) {
  return (conflicts?.conflicts || []).map((item) => ({
    id: item.id,
    severity: item.severity,
    title: item.title,
    fix: item.fix
  }));
}

function buildStateForLegacyProfile({ game, graph, conflicts, hearing, selectedSourceProfile, apoConfig, preferenceModel }) {
  const genre = genreForGame(game);
  const hearingAnswered = Number(hearing?.score?.answered || hearing?.answered || 0);
  const output = graph?.nodes?.find((node) => node.type === 'output');
  const input = graph?.nodes?.find((node) => node.type === 'input');
  const outputLabel = output?.label || '';
  const inputLabel = input?.label || '';
  const outputType = /iem|in-ear|earbud/i.test(outputLabel)
    ? 'iem'
    : /headset/i.test(outputLabel)
      ? 'headset'
      : /speaker/i.test(outputLabel)
        ? 'speaker'
        : selectedSourceProfile?.includes('headset')
          ? 'headset'
          : 'iem';

  return {
    player: {
      trebleSensitivity: hearingAnswered >= 4 ? 1 : 0,
      bassPreference: genre.id === 'comfort_long_session' ? 2 : 0,
      preferredStyle: 'balanced'
    },
    devices: {
      output: outputLabel || null,
      input: inputLabel || null,
      outputType,
      inputType: inputLabel ? 'mic' : 'unknown'
    },
    chain: {
      risks: chainRisksFromConflicts(conflicts)
    },
    calibration: {
      channelCheck: { passed: Boolean(graph?.summary?.outputs) },
      micCheck: { ready: Boolean(graph?.summary?.inputs) },
      hearingModel: hearingAnswered >= 4 ? { ...hearing, complete: Boolean(hearing?.score?.complete || hearing?.complete || hearingAnswered >= 4) } : hearing,
      blindMatch: preferenceModel?.roundsCompleted ? { complete: preferenceModel.roundsCompleted >= 5, preferenceModel } : null,
      preferenceModel: preferenceModel || null,
      maskingLab: null
    },
    selectedGame: {
      title: game,
      genre: genre.id,
      intent: genre.intent,
      profileId: genre.id
    },
    exports: {
      apoConfig: apoConfig || null,
      engineManifest: null
    }
  };
}

export function buildProfileEngineV2({
  eq = [],
  game = 'Tarkov / Siege / COD',
  graph = null,
  conflicts = null,
  hearing = null,
  selectedSourceProfile = 'iemFps',
  apoConfig = '',
  preferenceModel = null
} = {}) {
  const genre = genreForGame(game);
  const mode = sourceMode(graph, conflicts);
  const state = buildStateForLegacyProfile({ game, graph, conflicts, hearing, selectedSourceProfile, apoConfig, preferenceModel });
  const personalized = recommendProfile(state);
  const currentEq = eq.length === 10 ? eq : personalized.eq;
  const cueLift = average([currentEq[6] || 0, currentEq[7] || 0]);
  const lowBloom = average([currentEq[0] || 0, currentEq[1] || 0, currentEq[2] || 0]);
  const comfortRisk = Math.max(currentEq[8] || 0, currentEq[9] || 0);
  const recommendation = {
    id: `${genre.id}-${mode}`,
    personalizedId: personalized.id,
    label: `${genre.label} / ${mode.replace('-', ' ')}`,
    intent: genre.intent,
    mode,
    game,
    sourceProfile: selectedSourceProfile,
    genreProfileId: genre.id,
    eq: personalized.eq,
    dynamics: personalized.dynamics,
    mic: personalized.mic,
    spatial: personalized.spatial,
    explanation: personalized.reason.join(' ')
  };
  const identity = [
    cueLift >= 2.5 ? 'cue-forward' : 'balanced-cue',
    lowBloom > 0 ? 'warm-low-end' : 'controlled-bass',
    comfortRisk > 1.5 ? 'bright-check-needed' : 'smooth-top',
    genre.intent,
    mode
  ];

  return {
    schema: 'cueforge.profile-engine.v2',
    confidence: personalized.confidence,
    identity,
    metrics: {
      cueLift: Number(cueLift.toFixed(2)),
      lowBloom: Number(lowBloom.toFixed(2)),
      comfortRisk: Number(comfortRisk.toFixed(2)),
      hearingAnswered: Number(hearing?.score?.answered || hearing?.answered || 0),
      genreIntent: genre.intent
    },
    recommendation,
    nextActions: [
      recommendation.explanation,
      genre.caution,
      completeFlag(state.calibration.hearingModel) ? 'Use Hearing Model as a light overlay.' : 'Run Hearing Model before aggressive treble.',
      conflicts?.summary?.high ? 'Fix high-risk conflicts before applying.' : 'Run Player Trial and Beta Check-in to prove the profile.'
    ]
  };
}
