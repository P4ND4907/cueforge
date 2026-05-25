export const safetyRules = {
  maxTotalBoostDb: 6,
  maxHearingBoostDb: 3,
  maxTrebleBoostDb: 2,
  requiredPreampHeadroomDb: 1,
  limiterCeilingDb: -1,
  defaultVolumeWarning: true,
  neverAutoplayLoudTone: true,
  requireClickToPlayTone: true,
  showHearingWarning: true
};

export const safetyRuleCards = [
  {
    id: 'no-silent-driver-changes',
    label: 'No silent driver changes',
    detail: 'CueForge can recommend, export, and stage apply steps, but native driver/routing changes must stay explicit.'
  },
  {
    id: 'one-processing-layer',
    label: 'One processing layer at a time',
    detail: 'Stacking Sonar, THX, Dolby, FxSound, headset app EQ, and APO can smear direction and invalidate tests.'
  },
  {
    id: 'hearing-before-aggressive-treble',
    label: 'Hearing before aggressive treble',
    detail: 'If 4k-16k is boosted hard, run the personal hearing model and fatigue check first.'
  },
  {
    id: 'real-match-proof',
    label: 'Real match proof required',
    detail: 'A profile is a recommendation until before/after player feedback proves it in a match.'
  },
  {
    id: 'safe-headroom-first',
    label: 'Safe headroom first',
    detail: 'CueForge should prefer cuts, negative preamp, and limiter headroom over aggressive boosts.'
  }
];

export const playerSafetyWarnings = [
  'Keep your volume low during hearing tests.',
  'CueForge will prefer cuts and safe headroom over aggressive boosts.'
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function isTrebleFrequency(frequency) {
  return Number(frequency) >= 4000;
}

export function safetyRuleId(id) {
  return safetyRuleCards.find((item) => item.id === id)?.id || id;
}

export function maxAllowedBoostForFrequency(frequency, { hearing = false } = {}) {
  const totalCap = safetyRules.maxTotalBoostDb;
  const hearingCap = hearing ? safetyRules.maxHearingBoostDb : totalCap;
  const trebleCap = isTrebleFrequency(frequency) ? safetyRules.maxTrebleBoostDb : totalCap;
  return Math.min(totalCap, hearingCap, trebleCap);
}

export function clampGainToSafety(gain, { frequency = null, hearing = false } = {}) {
  const maxBoost = maxAllowedBoostForFrequency(frequency, { hearing });
  return Number(clamp(gain, -safetyRules.maxTotalBoostDb, maxBoost).toFixed(2));
}

export function clampEqToSafety(eq = [], bands = [], options = {}) {
  return eq.map((gain, index) => clampGainToSafety(gain, {
    ...options,
    frequency: bands[index] ?? options.frequency ?? null
  }));
}

export function calculateRequiredPreamp(eq = []) {
  const maxBoost = Math.max(0, ...eq.map((gain) => Number(gain) || 0));
  const headroom = safetyRules.requiredPreampHeadroomDb;
  const target = maxBoost > 0 ? -1 * (maxBoost + headroom) : safetyRules.limiterCeilingDb;
  return Number(clamp(target, -18, safetyRules.limiterCeilingDb).toFixed(1));
}

export function buildSafetySummary() {
  return {
    rules: safetyRules,
    warnings: playerSafetyWarnings,
    applyRule: 'Review before applying. No hidden driver, routing, or APO writes.',
    toneRule: safetyRules.requireClickToPlayTone
      ? 'Test tones require an explicit click and should start at low volume.'
      : 'Test tones should still be reviewed before use.'
  };
}
