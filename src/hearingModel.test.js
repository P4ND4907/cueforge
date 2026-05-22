import { describe, expect, it } from 'vitest';
import {
  buildHearingApoOverlay,
  calculateCompensation,
  createEmptyHearingResults,
  hearingFrequencies,
  hearingScore
} from './hearingModel.js';

describe('personal hearing model', () => {
  it('tracks completion and percent heard', () => {
    const results = createEmptyHearingResults();
    results.left[250] = true;
    results.right[250] = false;

    expect(hearingScore(results)).toEqual({
      answered: 2,
      total: hearingFrequencies.length * 2,
      percentHeard: 50,
      complete: false
    });
  });

  it('creates a conservative APO overlay from missed tones', () => {
    const results = createEmptyHearingResults();
    hearingFrequencies.forEach((frequency) => {
      results.left[frequency] = true;
      results.right[frequency] = true;
    });
    results.left[8000] = false;
    results.right[8000] = false;

    const compensation = calculateCompensation(results);
    const overlay = buildHearingApoOverlay(compensation);

    expect(compensation.find((point) => point.frequency === 8000).averageDb).toBe(2.5);
    expect(overlay).toContain('Preamp: -3.5 dB');
    expect(overlay).toContain('Fc 8000 Hz Gain 2.5 dB');
  });
});
