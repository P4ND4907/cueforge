import { describe, expect, it } from 'vitest';
import { blindMatchRounds, createBlindMatchResult } from './blindMatch.js';

describe('blind match tuner', () => {
  it('learns a personal eq curve from blind choices', () => {
    const choices = Object.fromEntries(blindMatchRounds.map((round) => [round.id, 'a']));
    const result = createBlindMatchResult(choices, [-1, 1.5, 0.5, -2, -1, 0.5, 2.5, 3.2, 1.2, -0.5]);

    expect(result.completedRounds).toBe(blindMatchRounds.length);
    expect(result.eq).toHaveLength(10);
    expect(result.confidence).toBeGreaterThan(80);
    expect(result.summary).toContain('Learned from');
    expect(result.preferenceModel.roundsCompleted).toBe(blindMatchRounds.length);
    expect(result.preferenceSummary).toMatch(/footstep|balanced|wide|center|comfort|detail/);
  });
});
