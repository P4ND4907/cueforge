import { calculateRequiredPreamp, clampGainToSafety, safetyRules } from './core/safetyRules.js';

export const hearingFrequencies = [125, 250, 500, 1000, 2000, 3000, 4000, 6000, 8000, 12000];

export const hearingResponseLevels = {
  not_heard: 0.25,
  barely_heard: 0.55,
  clear: 0.85,
  too_sharp: 0.8
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function round(value, places = 1) {
  return Number((Number(value) || 0).toFixed(places));
}

function emptyEarBand() {
  return {
    audibleAtDb: null,
    comfortableAtDb: null,
    harshAtDb: null,
    confidence: 0
  };
}

export function createEmptyHearingResults() {
  return {
    schema: 'cueforge.hearing-threshold.v2',
    left: Object.fromEntries(hearingFrequencies.map((frequency) => [frequency, emptyEarBand()])),
    right: Object.fromEntries(hearingFrequencies.map((frequency) => [frequency, emptyEarBand()]))
  };
}

function isAnswered(entry) {
  if (typeof entry === 'boolean') return true;
  return Boolean(
    entry &&
    (entry.audibleAtDb !== null ||
      entry.comfortableAtDb !== null ||
      entry.harshAtDb !== null ||
      Number(entry.confidence || 0) > 0)
  );
}

function legacyEntry(value) {
  if (value === true) {
    return {
      audibleAtDb: -24,
      comfortableAtDb: -18,
      harshAtDb: null,
      confidence: 0.65,
      legacy: 'heard'
    };
  }

  if (value === false) {
    return {
      audibleAtDb: null,
      comfortableAtDb: null,
      harshAtDb: null,
      confidence: 0.35,
      legacy: 'missed'
    };
  }

  return emptyEarBand();
}

export function normalizeHearingEntry(value) {
  if (typeof value === 'boolean' || value === null || value === undefined) return legacyEntry(value);

  return {
    audibleAtDb: value.audibleAtDb !== null && value.audibleAtDb !== undefined && Number.isFinite(Number(value.audibleAtDb)) ? Number(value.audibleAtDb) : null,
    comfortableAtDb: value.comfortableAtDb !== null && value.comfortableAtDb !== undefined && Number.isFinite(Number(value.comfortableAtDb)) ? Number(value.comfortableAtDb) : null,
    harshAtDb: value.harshAtDb !== null && value.harshAtDb !== undefined && Number.isFinite(Number(value.harshAtDb)) ? Number(value.harshAtDb) : null,
    confidence: clamp(Number(value.confidence) || 0, 0, 1),
    legacy: value.legacy || null
  };
}

export function normalizeHearingResults(results = createEmptyHearingResults()) {
  const normalized = createEmptyHearingResults();

  for (const ear of ['left', 'right']) {
    hearingFrequencies.forEach((frequency) => {
      normalized[ear][frequency] = normalizeHearingEntry(results?.[ear]?.[frequency]);
    });
  }

  return normalized;
}

function referenceComfortDb(frequency) {
  if (frequency <= 125) return -20;
  if (frequency <= 1000) return -26;
  if (frequency <= 4000) return -24;
  if (frequency <= 8000) return -21;
  return -18;
}

function maxBoostForFrequency(frequency) {
  if (frequency >= 12000) return Math.min(0.75, safetyRules.maxTrebleBoostDb);
  if (frequency >= 6000) return Math.min(1.2, safetyRules.maxTrebleBoostDb);
  return safetyRules.maxHearingBoostDb;
}

function sideCompensation(entry, frequency) {
  const point = normalizeHearingEntry(entry);
  const reference = referenceComfortDb(frequency);
  const level = point.comfortableAtDb ?? point.audibleAtDb;
  const maxBoost = maxBoostForFrequency(frequency);

  if (point.legacy === 'heard') return 0;
  if (point.legacy === 'missed') return frequency >= 6000 ? maxBoost : 2.5;
  if (level === null && point.harshAtDb === null) return 0;

  let gain = 0;
  if (level !== null) {
    const need = level - reference;
    gain = need > 0 ? need / 8 : need < -8 ? -0.4 : 0;
  }

  if (point.harshAtDb !== null) {
    const safeReference = point.comfortableAtDb ?? point.audibleAtDb ?? reference;
    const comfortToHarshGap = point.harshAtDb - safeReference;
    const sharpCut = clamp((8 - comfortToHarshGap) / 4, 0, 2.25);
    gain -= sharpCut + (frequency >= 6000 ? 0.35 : 0);
  }

  if (point.confidence && point.confidence < 0.5 && gain > 0) {
    gain *= 0.55;
  }

  return round(clampGainToSafety(gain, { frequency, hearing: true }));
}

export function calculateCompensation(results) {
  const normalized = normalizeHearingResults(results);

  return hearingFrequencies.map((frequency) => {
    const leftDb = sideCompensation(normalized.left[frequency], frequency);
    const rightDb = sideCompensation(normalized.right[frequency], frequency);
    const averageDb = round((leftDb + rightDb) / 2);

    return {
      frequency,
      leftDb,
      rightDb,
      averageDb,
      left: normalized.left[frequency],
      right: normalized.right[frequency],
      maxBoostDb: maxBoostForFrequency(frequency)
    };
  });
}

export function hearingScore(results) {
  const normalized = normalizeHearingResults(results);
  const entries = hearingFrequencies.flatMap((frequency) => [normalized.left[frequency], normalized.right[frequency]]);
  const answered = entries.filter(isAnswered).length;
  const audible = entries.filter((entry) => entry.audibleAtDb !== null || entry.comfortableAtDb !== null).length;
  const comfortable = entries.filter((entry) => entry.comfortableAtDb !== null).length;
  const harsh = entries.filter((entry) => entry.harshAtDb !== null).length;
  const averageConfidence = answered
    ? Math.round((entries.reduce((sum, entry) => sum + (Number(entry.confidence) || 0), 0) / answered) * 100)
    : 0;

  return {
    answered,
    total: hearingFrequencies.length * 2,
    percentHeard: answered ? Math.round((audible / answered) * 100) : 0,
    percentComfortable: answered ? Math.round((comfortable / answered) * 100) : 0,
    harshCount: harsh,
    confidence: averageConfidence,
    complete: answered === hearingFrequencies.length * 2
  };
}

function responseRank(response) {
  return {
    not_heard: 0,
    barely_heard: 1,
    clear: 2,
    too_sharp: 3
  }[response] ?? null;
}

export function evaluateHearingAnswerConsistency(trials = []) {
  const grouped = new Map();
  const issues = [];
  const safeTrials = Array.isArray(trials) ? trials : [];

  safeTrials.forEach((trial) => {
    const ear = String(trial?.ear || '').toLowerCase();
    const frequency = Number(trial?.frequency);
    const levelDb = Number(trial?.levelDb ?? trial?.db);
    const rank = responseRank(trial?.response);
    if (!['left', 'right'].includes(ear) || !Number.isFinite(frequency) || rank === null) return;

    const key = `${ear}:${frequency}`;
    const existing = grouped.get(key) || [];
    existing.push({
      ear,
      frequency,
      levelDb: Number.isFinite(levelDb) ? levelDb : null,
      response: trial.response,
      rank
    });
    grouped.set(key, existing);
  });

  grouped.forEach((answers, key) => {
    if (answers.length < 2) return;
    const ranks = answers.map((item) => item.rank);
    const rankSpread = Math.max(...ranks) - Math.min(...ranks);
    const levels = answers.map((item) => item.levelDb).filter((value) => value !== null);
    const levelSpread = levels.length > 1 ? Math.max(...levels) - Math.min(...levels) : 0;
    const contradictoryAtSimilarLevel = rankSpread >= 2 && levelSpread <= 6;

    if (contradictoryAtSimilarLevel || levelSpread > 14) {
      issues.push({
        id: 'inconsistent-threshold-answer',
        key,
        severity: 'medium',
        detail: contradictoryAtSimilarLevel
          ? 'Different answers were given at nearly the same level.'
          : 'Threshold answers jumped too far apart for the same ear/frequency.',
        answers: answers.map(({ ear, frequency, response, levelDb }) => ({ ear, frequency, response, levelDb }))
      });
    }
  });

  const confidenceMultiplier = issues.length
    ? Math.max(0.35, Number((1 - issues.length * 0.22).toFixed(2)))
    : 1;

  return {
    checkedGroups: grouped.size,
    issueCount: issues.length,
    issues,
    confidenceMultiplier,
    retestRecommended: issues.length > 0,
    recommendation: issues.length
      ? 'Retest the flagged ear/frequency at lower volume before generating strong hearing compensation.'
      : 'Repeated threshold answers are consistent enough for a safe light overlay.'
  };
}

export function buildHearingApoOverlay(compensation) {
  const safeCompensation = Array.isArray(compensation) ? compensation : [];
  const safeGains = safeCompensation.map((point) => clampGainToSafety(point.averageDb || 0, {
    frequency: point.frequency,
    hearing: true
  }));
  const preamp = calculateRequiredPreamp(safeGains);
  const lines = [`Preamp: ${preamp.toFixed(1)} dB`];

  safeCompensation.forEach((point, index) => {
    const gain = round(clampGainToSafety(point.averageDb || 0, {
      frequency: point.frequency,
      hearing: true
    }));
    if (Math.abs(gain) >= 0.2) {
      const q = point.frequency >= 6000 ? 0.85 : 1.0;
      lines.push(`Filter ${index + 1}: ON PK Fc ${point.frequency} Hz Gain ${gain.toFixed(1)} dB Q ${q.toFixed(2)}`);
    }
  });

  return lines.join('\n');
}

export function nextHearingLevel(response, currentDb) {
  const level = Number(currentDb) || -30;
  if (response === 'not_heard') return clamp(level + 6, -42, -6);
  if (response === 'barely_heard') return clamp(level + 3, -42, -6);
  if (response === 'too_sharp') return clamp(level - 6, -42, -6);
  return clamp(level - 2, -42, -6);
}

export function updateThresholdEntry(entry, response, levelDb) {
  const current = normalizeHearingEntry(entry);
  const level = clamp(Number(levelDb) || -30, -42, -6);
  const confidence = Math.max(current.confidence || 0, hearingResponseLevels[response] || 0.4);

  if (response === 'not_heard') {
    return {
      ...current,
      confidence: round(confidence, 2)
    };
  }

  if (response === 'barely_heard') {
    return {
      ...current,
      audibleAtDb: current.audibleAtDb === null ? level : Math.min(current.audibleAtDb, level),
      confidence: round(confidence, 2)
    };
  }

  if (response === 'clear') {
    return {
      ...current,
      audibleAtDb: current.audibleAtDb === null ? level - 3 : current.audibleAtDb,
      comfortableAtDb: level,
      confidence: round(confidence, 2)
    };
  }

  if (response === 'too_sharp') {
    return {
      ...current,
      harshAtDb: current.harshAtDb === null ? level : Math.min(current.harshAtDb, level),
      comfortableAtDb: current.comfortableAtDb ?? null,
      confidence: round(confidence, 2)
    };
  }

  return current;
}
