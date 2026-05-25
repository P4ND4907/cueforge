import { describe, expect, it } from 'vitest';
import {
  buildHearingApoOverlay,
  calculateCompensation,
  createEmptyHearingResults,
  hearingFrequencies,
  hearingScore,
  updateThresholdEntry
} from './hearingModel.js';

describe('personal hearing model', () => {
  it('tracks completion and percent heard', () => {
    const results = createEmptyHearingResults();
    results.left[125] = true;
    results.right[125] = false;

    expect(hearingScore(results)).toEqual({
      answered: 2,
      total: hearingFrequencies.length * 2,
      percentHeard: 50,
      percentComfortable: 50,
      harshCount: 0,
      confidence: 50,
      complete: false
    });
  });

  it('creates a conservative APO overlay from threshold data', () => {
    const results = createEmptyHearingResults();
    hearingFrequencies.forEach((frequency) => {
      results.left[frequency] = updateThresholdEntry(results.left[frequency], 'clear', -24);
      results.right[frequency] = updateThresholdEntry(results.right[frequency], 'clear', -24);
    });
    results.left[8000] = updateThresholdEntry(createEmptyHearingResults().left[8000], 'barely_heard', -12);
    results.right[8000] = updateThresholdEntry(createEmptyHearingResults().right[8000], 'barely_heard', -12);

    const compensation = calculateCompensation(results);
    const overlay = buildHearingApoOverlay(compensation);
    const highBand = compensation.find((point) => point.frequency === 8000);

    expect(highBand.averageDb).toBeLessThanOrEqual(1.2);
    expect(overlay).toContain('Preamp:');
    expect(overlay).toContain('Fc 8000 Hz');
  });

  it('records audible, comfortable, and harsh threshold levels', () => {
    const results = createEmptyHearingResults();
    let entry = updateThresholdEntry(results.left[4000], 'barely_heard', -24);
    entry = updateThresholdEntry(entry, 'clear', -18);
    entry = updateThresholdEntry(entry, 'too_sharp', -8);

    expect(entry).toMatchObject({
      audibleAtDb: -24,
      comfortableAtDb: -18,
      harshAtDb: -8
    });

    const compensation = calculateCompensation({
      left: { 4000: entry },
      right: { 4000: entry }
    });
    expect(Math.max(...compensation.map((point) => point.averageDb))).toBeLessThanOrEqual(3);
  });
});
