import { describe, expect, it } from 'vitest';
import {
  applyPerformanceProfileToAnalyser,
  getPerformanceProfile,
  getPerformanceProfileConfig,
  resetPerformanceProfile,
  setPerformanceProfile
} from '../settings/performanceSettings.js';

describe('performance settings', () => {
  it('switches between safe monitoring profiles and rejects unknown modes', () => {
    resetPerformanceProfile();

    expect(getPerformanceProfile()).toBe('balanced');
    expect(getPerformanceProfileConfig()).toMatchObject({
      updateRate: 100,
      analyserSize: 256,
      monitoring: true
    });

    expect(setPerformanceProfile('game')).toBe(true);
    expect(getPerformanceProfile()).toBe('game');
    expect(getPerformanceProfileConfig()).toMatchObject({
      updateRate: 0,
      analyserSize: 64,
      monitoring: false
    });

    expect(setPerformanceProfile('turbo')).toBe(false);
    expect(getPerformanceProfile()).toBe('game');
  });

  it('applies analyzer sizes without allowing unsafe FFT values', () => {
    const analyser = { fftSize: 2048 };

    const applied = applyPerformanceProfileToAnalyser(analyser, 'quiet');

    expect(applied).toMatchObject({
      profile: 'quiet',
      analyserSize: 128,
      monitoring: true
    });
    expect(analyser.fftSize).toBe(128);
  });
});
