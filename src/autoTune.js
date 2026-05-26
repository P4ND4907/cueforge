import { clampEqToSafety, safetyRules } from './core/safetyRules.js';

export function clampGain(value) {
  return Math.max(-safetyRules.maxTotalBoostDb, Math.min(safetyRules.maxTotalBoostDb, value));
}

export function buildAutoTuneEq({ preset, trebleSensitivity, bassPreference, footstepFocus }) {
  const presetCurves = {
    iem: [-2, -1.5, -0.5, -1, -0.5, 0, 1.5, 2, -1.2, -0.5],
    hyperx: [-1, 0.5, 0, -1, -0.8, 0.4, 1.4, 1.8, 0.2, -0.2],
    balanced: [-0.6, 0, 0, -0.2, 0, 0.2, 0.7, 0.5, 0, 0.2]
  };

  const rawEq = (presetCurves[preset] || presetCurves.iem).map((gain, index) => {
    const low = index <= 2 ? bassPreference * 0.08 : 0;
    const cue = index >= 6 && index <= 7 ? footstepFocus * 0.08 : 0;
    const treble = index >= 8 ? -trebleSensitivity * 0.08 : 0;
    return clampGain(Number((gain + low + cue + treble).toFixed(1)));
  });

  return clampEqToSafety(rawEq, [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]);
}
