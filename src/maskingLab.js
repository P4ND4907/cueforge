export const maskingScenarios = [
  {
    id: 'footsteps-under-explosion',
    name: 'Footsteps under explosions',
    masker: 'low-bass blast + upper-mid cue',
    targetBands: [6, 7],
    problemBands: [0, 1, 2],
    fix: [-0.8, -0.7, -0.4, 0, 0, 0.2, 0.7, 0.8, -0.2, -0.2]
  },
  {
    id: 'voice-over-game',
    name: 'Comms over game audio',
    masker: 'low-mid game bed + voice band',
    targetBands: [4, 5, 6],
    problemBands: [2, 3],
    fix: [-0.2, -0.2, -0.6, -0.5, 0.7, 0.8, 0.3, 0, -0.2, -0.2]
  },
  {
    id: 'iem-sharpness',
    name: 'IEM sharpness control',
    masker: 'cue detail + treble fatigue',
    targetBands: [6, 7],
    problemBands: [8, 9],
    fix: [0, 0, 0, 0, 0, 0.2, 0.5, 0.3, -0.8, -0.7]
  }
];

export function scoreMasking(eq, scenario) {
  const target = average(scenario.targetBands.map((index) => eq[index]));
  const problem = average(scenario.problemBands.map((index) => eq[index]));
  const raw = 62 + target * 9 - problem * 7;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

export function createMaskingTune(eq, scenarioId) {
  const scenario = maskingScenarios.find((item) => item.id === scenarioId) || maskingScenarios[0];
  const before = scoreMasking(eq, scenario);
  const tunedEq = eq.map((gain, index) => clamp(Number((gain + scenario.fix[index]).toFixed(1)), -6, 6));
  const after = scoreMasking(tunedEq, scenario);
  return {
    scenario,
    before,
    after,
    improvement: after - before,
    eq: tunedEq,
    summary: `${scenario.name}: ${before} -> ${after} masking score`
  };
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
