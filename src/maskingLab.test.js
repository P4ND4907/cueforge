import { describe, expect, it } from 'vitest';
import { createMaskingTune, maskingScenarios, scoreMasking } from './maskingLab.js';

describe('tactical masking lab', () => {
  it('scores and improves a masking scenario', () => {
    const eq = [-1, 1.5, 0.5, -2, -1, 0.5, 2.5, 3.2, 1.2, -0.5];
    const tune = createMaskingTune(eq, 'footsteps-under-explosion');

    expect(maskingScenarios).toHaveLength(3);
    expect(scoreMasking(eq, tune.scenario)).toBe(tune.before);
    expect(tune.eq).toHaveLength(10);
    expect(tune.after).toBeGreaterThanOrEqual(tune.before);
  });
});
