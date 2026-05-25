import { describe, expect, it } from 'vitest';
import { buildAutoTuneEq } from './autoTune.js';

describe('autotune calibration', () => {
  it('creates a 10 band EQ curve with footstep focus', () => {
    const eq = buildAutoTuneEq({
      preset: 'iem',
      trebleSensitivity: 4,
      bassPreference: 2,
      footstepFocus: 8
    });

    expect(eq).toHaveLength(10);
    expect(eq[6]).toBeGreaterThan(1.5);
    expect(eq[7]).toBe(2);
    expect(Math.max(...eq)).toBeLessThanOrEqual(6);
    expect(Math.min(...eq)).toBeGreaterThanOrEqual(-6);
  });
});
