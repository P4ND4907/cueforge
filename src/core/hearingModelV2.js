import {
  buildHearingApoOverlay,
  calculateCompensation,
  createEmptyHearingResults,
  evaluateHearingAnswerConsistency,
  hearingFrequencies,
  hearingScore,
  normalizeHearingResults
} from '../hearingModel.js';
import { safetyRules } from './safetyRules.js';

export function buildHearingModelV2({
  results = createEmptyHearingResults(),
  profile = null,
  fatigue = 'unknown',
  repeatedAnswers = []
} = {}) {
  const thresholds = normalizeHearingResults(results);
  const rawScore = hearingScore(results);
  const consistency = evaluateHearingAnswerConsistency(repeatedAnswers);
  const score = {
    ...rawScore,
    confidence: Math.round(rawScore.confidence * consistency.confidenceMultiplier),
    retestRecommended: consistency.retestRecommended
  };
  const compensation = calculateCompensation(results);
  const overlay = buildHearingApoOverlay(compensation);
  const treblePressure = profile?.metrics?.comfortRisk || 0;
  const highBandBoost = Math.max(
    0,
    ...compensation
      .filter((point) => point.frequency >= 6000)
      .map((point) => point.averageDb || 0)
  );
  const safeTreble = score.answered >= 6 && treblePressure <= 2.5 && highBandBoost <= safetyRules.maxTrebleBoostDb;

  return {
    schema: 'cueforge.hearing-model.v2',
    bands: hearingFrequencies,
    score,
    thresholds,
    compensation,
    equalizerApoOverlay: overlay,
    consistency,
    safety: {
      maxHearingBoostDb: safetyRules.maxHearingBoostDb,
      maxHighBandBoostDb: safetyRules.maxTrebleBoostDb,
      highBandBoostDb: highBandBoost,
      negativePreampRequired: compensation.some((point) => point.averageDb > 0)
    },
    fatigue,
    guidance: safeTreble
      ? 'Threshold baseline is usable for light personalization without pushing harsh treble.'
      : 'Keep treble changes conservative until comfort, harshness, and fatigue proof exists.',
    gates: [
      { id: 'minimum-answers', label: 'At least six threshold answers', ready: score.answered >= 6 },
      { id: 'full-baseline', label: 'Full left/right baseline', ready: score.complete },
      { id: 'comfort-proof', label: 'Comfort levels captured', ready: score.percentComfortable >= 50 },
      { id: 'treble-safe', label: 'Treble comfort proof', ready: safeTreble }
    ]
  };
}
