import { describe, expect, it } from 'vitest';
import {
  buildSafetySummary,
  calculateRequiredPreamp,
  clampEqToSafety,
  clampGainToSafety,
  maxAllowedBoostForFrequency,
  playerSafetyWarnings,
  safetyRuleCards,
  safetyRules
} from '../core/safetyRules.js';

describe('safety rules', () => {
  it('exports the player audio safety contract', () => {
    expect(safetyRules).toMatchObject({
      maxTotalBoostDb: 6,
      maxHearingBoostDb: 3,
      maxTrebleBoostDb: 2,
      requiredPreampHeadroomDb: 1,
      limiterCeilingDb: -1,
      defaultVolumeWarning: true,
      neverAutoplayLoudTone: true,
      requireClickToPlayTone: true,
      showHearingWarning: true
    });
    expect(playerSafetyWarnings).toContain('Keep your volume low during hearing tests.');
    expect(safetyRuleCards.map((rule) => rule.id)).toContain('safe-headroom-first');
  });

  it('caps treble and hearing boosts more conservatively than total EQ boosts', () => {
    expect(maxAllowedBoostForFrequency(1000)).toBe(6);
    expect(maxAllowedBoostForFrequency(8000)).toBe(2);
    expect(maxAllowedBoostForFrequency(1000, { hearing: true })).toBe(3);
    expect(maxAllowedBoostForFrequency(8000, { hearing: true })).toBe(2);
    expect(clampGainToSafety(9, { frequency: 8000 })).toBe(2);
    expect(clampGainToSafety(9, { frequency: 1000, hearing: true })).toBe(3);
  });

  it('adds required negative preamp headroom for positive boosts', () => {
    expect(calculateRequiredPreamp([-2, 0, 3.5])).toBe(-4.5);
    expect(calculateRequiredPreamp([-2, -1, 0])).toBe(-1);
    expect(clampEqToSafety([0, 8, 4], [31, 1000, 8000])).toEqual([0, 6, 2]);
  });

  it('summarizes tone and apply boundaries for UI/export consumers', () => {
    const summary = buildSafetySummary();

    expect(summary.toneRule).toContain('explicit click');
    expect(summary.applyRule).toContain('No hidden driver');
  });
});
