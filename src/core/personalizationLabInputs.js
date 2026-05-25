import { safetyRules } from './safetyRules.js';

const MEDICAL_LANGUAGE = /\b(audiogram|audiologist|audiology|audiometry|diagnos(?:e|is|tic)|hearing loss|medical|clinical|tinnitus treatment|cure)\b/i;

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function count(value) {
  return Array.isArray(value) ? value.length : 0;
}

function scoreToUnit(value) {
  return clamp((Number(value) || 0) / 100);
}

function confidence(value, fallback = 0) {
  if (value === true) return 1;
  if (value === false) return 0;
  return clamp(value ?? fallback);
}

function dedupe(items = []) {
  return [...new Set(items.filter(Boolean))];
}

function hasHearingProof(hearing = {}) {
  const score = hearing.score || hearing;
  return Boolean(
    hearing.complete ||
    score.complete ||
    Number(score.answered || hearing.answered || 0) >= 6 ||
    count(hearing.compensation) >= 4
  );
}

function safePlaybackSummary(playback = {}) {
  const maxToneGainDb = Number(playback.maxToneGainDb ?? -18);
  const clickToPlay = playback.clickToPlay ?? safetyRules.requireClickToPlayTone;
  const autoplayLoudTone = playback.autoplayLoudTone === true;

  return {
    maxToneGainDb,
    amplitudeCapped: maxToneGainDb <= -12,
    clickToPlay: Boolean(clickToPlay),
    autoplayLoudTone,
    safe: maxToneGainDb <= -12 && clickToPlay && !autoplayLoudTone,
    warning: 'Keep volume low. Test tones must start quietly and require an explicit click.'
  };
}

function buildHearingInput(hearing = null, repeatedAnswers = []) {
  if (!hearing) {
    return {
      present: false,
      ready: false,
      influenceWeight: 0,
      repeatedThresholdChecks: 0,
      responseConsistency: {
        score: 0,
        confidenceMultiplier: 0,
        retestRecommended: true
      },
      recommendations: ['Run safe Hearing Model before using hearing compensation.']
    };
  }

  const score = hearing.score || hearing;
  const consistency = hearing.consistency || {};
  const answered = Number(score.answered || hearing.answered || 0);
  const confidenceMultiplier = confidence(consistency.confidenceMultiplier, 1);
  const confidenceScore = confidence(score.confidence, answered >= 6 ? 0.65 : 0.35);
  const retestRecommended = Boolean(score.retestRecommended || consistency.retestRecommended || confidenceMultiplier < 0.8);
  const baseWeight = hasHearingProof(hearing) ? 0.36 : 0.16;
  const influenceWeight = retestRecommended ? baseWeight * 0.45 : baseWeight * confidenceScore * confidenceMultiplier;

  return {
    present: true,
    ready: hasHearingProof(hearing) && !retestRecommended,
    influenceWeight: Number(clamp(influenceWeight, 0, 0.36).toFixed(2)),
    repeatedThresholdChecks: count(repeatedAnswers) || Number(consistency.repeatedChecks || 0),
    responseConsistency: {
      score: Number((confidenceScore * confidenceMultiplier).toFixed(2)),
      confidenceMultiplier: Number(confidenceMultiplier.toFixed(2)),
      retestRecommended
    },
    compensation: hearing.compensation || [],
    gates: hearing.gates || [],
    recommendations: dedupe([
      retestRecommended ? 'Repeat the threshold check before trusting hearing compensation.' : null,
      'Use hearing results only for safe self-calibration and preference weighting.',
      'Never boost more than the hearing safety cap from this layer alone.'
    ])
  };
}

function buildPreferenceInput({ blindMatch = null, preferenceModel = null } = {}) {
  const model = preferenceModel || blindMatch?.preferenceModel || null;
  const rounds = Number(blindMatch?.completedRounds || model?.roundsCompleted || 0);
  const modelConfidence = confidence(blindMatch?.confidence ? scoreToUnit(blindMatch.confidence) : model?.confidence, 0);
  const influenceWeight = clamp(rounds / 12, 0, 1) * Math.max(0.35, modelConfidence) * 0.34;

  return {
    present: Boolean(blindMatch || model),
    ready: rounds >= 5 && modelConfidence >= 0.35,
    influenceWeight: Number(clamp(influenceWeight, 0, 0.34).toFixed(2)),
    roundsCompleted: rounds,
    confidence: Number(modelConfidence.toFixed(2)),
    preferenceModel: model,
    summary: blindMatch?.summary || blindMatch?.preferenceSummary || null,
    recommendations: rounds
      ? ['Blend preference choices conservatively into EQ, dynamics, and spatial planning.']
      : ['Run This-or-That / Blind Match before treating preferences as learned.']
  };
}

function buildMaskingInput(maskingLab = null) {
  if (!maskingLab) {
    return {
      present: false,
      ready: false,
      influenceWeight: 0,
      recommendations: ['Run Masking Lab before claiming cue separation improved.']
    };
  }

  const measuredDelta = Number(maskingLab.after ?? 0) - Number(maskingLab.before ?? 0);
  const improvement = Number(maskingLab.improvement ?? measuredDelta) || 0;
  const score = scoreToUnit(maskingLab.after || 0);
  const influenceWeight = clamp((improvement > 0 ? 0.12 : 0.04) + Math.max(0, improvement) / 100 + score * 0.08, 0, 0.24);

  return {
    present: true,
    ready: improvement > 0,
    influenceWeight: Number(influenceWeight.toFixed(2)),
    scenario: maskingLab.scenario?.id || maskingLab.scenario?.name || null,
    before: maskingLab.before ?? null,
    after: maskingLab.after ?? null,
    improvement,
    recommendations: improvement > 0
      ? ['Use masking result as cue-separation evidence, not as proof of enemy position awareness.']
      : ['Keep masking influence low until the tuned result beats baseline.']
  };
}

function buildPlayerTrialInput(playerTrial = null) {
  const feedback = playerTrial?.feedback || playerTrial || null;
  const score = Number(feedback?.score || playerTrial?.score || 0);
  const issues = feedback?.issues || playerTrial?.issues || [];
  const status = feedback?.status || playerTrial?.status || 'not-run';

  return {
    present: Boolean(playerTrial),
    ready: score >= 65 || status === 'testable' || status === 'release-candidate',
    influenceWeight: Number(clamp(score / 100 * 0.28, 0, 0.28).toFixed(2)),
    score,
    status,
    issues,
    recommendations: playerTrial
      ? ['Use real match feedback as the strongest preference proof after safety checks.']
      : ['Run Player Trial after profile recommendation so the lab has real match proof.']
  };
}

export function evaluatePersonalizationClaimBoundary(text = '') {
  const claim = String(text || '');
  const blocked = MEDICAL_LANGUAGE.test(claim);

  return {
    ok: !blocked,
    blocked,
    reason: blocked
      ? 'CueForge hearing inputs are self-calibration and preference weighting only, not medical audiometry or diagnosis.'
      : 'Claim stays inside the self-calibration and preference boundary.'
  };
}

export function buildPersonalizationLabInputs({
  hearingModel = null,
  repeatedHearingAnswers = [],
  blindMatch = null,
  preferenceModel = null,
  maskingLab = null,
  playerTrial = null,
  playback = {}
} = {}) {
  const hearing = buildHearingInput(hearingModel, repeatedHearingAnswers);
  const preference = buildPreferenceInput({ blindMatch, preferenceModel });
  const masking = buildMaskingInput(maskingLab);
  const trial = buildPlayerTrialInput(playerTrial);
  const playbackSafety = safePlaybackSummary(playback);
  const influenceTotal = clamp(
    hearing.influenceWeight + preference.influenceWeight + masking.influenceWeight + trial.influenceWeight,
    0,
    1
  );
  const blockers = dedupe([
    playbackSafety.safe ? null : 'Playback safety is not proven for hearing-style tests.',
    hearing.responseConsistency?.retestRecommended ? 'Hearing answers need a repeat check before strong personalization.' : null
  ]);
  const nextActions = dedupe([
    !playbackSafety.safe ? 'Fix test tone playback safety.' : null,
    !hearing.ready ? 'Run or repeat Hearing Model.' : null,
    !preference.ready ? 'Run This-or-That / Blind Match.' : null,
    !masking.ready ? 'Run Masking Lab fixture.' : null,
    !trial.ready ? 'Run Player Trial with one real match.' : null
  ]).slice(0, 5);

  return {
    schema: 'cueforge.personalization-lab-inputs.v1',
    purpose: 'Formal safe inputs for profile recommendation, readiness, Audio DNA, and report replay.',
    claimBoundary: {
      mode: 'self-calibration-and-preference-weighting',
      notMedical: true,
      refusedLanguage: [
        'medical hearing test',
        'diagnosis',
        'audiogram',
        'audiometry',
        'treatment'
      ],
      allowedClaim: 'CueForge can learn comfort and preference signals from safe local tests.'
    },
    safety: {
      playback: playbackSafety,
      maxHearingBoostDb: safetyRules.maxHearingBoostDb,
      maxTrebleBoostDb: safetyRules.maxTrebleBoostDb,
      preferCutsOverBoosts: true,
      negativePreampRequiredWhenBoosting: true,
      rawAudioLocalByDefault: true
    },
    inputs: {
      hearing,
      preference,
      masking,
      playerTrial: trial
    },
    influence: {
      total: Number(influenceTotal.toFixed(2)),
      conservative: true,
      weights: {
        hearing: hearing.influenceWeight,
        preference: preference.influenceWeight,
        masking: masking.influenceWeight,
        playerTrial: trial.influenceWeight
      }
    },
    readiness: {
      ready: blockers.length === 0 && (hearing.ready || preference.ready || trial.ready),
      blockers,
      nextActions
    }
  };
}
