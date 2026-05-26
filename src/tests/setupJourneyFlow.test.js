import { describe, expect, it } from 'vitest';
import {
  clampSetupJourneyStep,
  nextSetupJourneyStep,
  setupJourneyActionLabel
} from '../core/setupJourneyFlow.js';

describe('setup journey flow', () => {
  it('keeps one-click setup actions moving to the next panel', () => {
    expect(nextSetupJourneyStep(0, 'continue')).toBe(1);
    expect(nextSetupJourneyStep(1, 'device-check-complete')).toBe(2);
    expect(nextSetupJourneyStep(2, 'starter-tune-complete')).toBe(3);
    expect(nextSetupJourneyStep(3, 'continue')).toBe(3);
  });

  it('uses player-facing labels that describe the next step', () => {
    expect(setupJourneyActionLabel(0)).toBe('Continue to Device Scan');
    expect(setupJourneyActionLabel(1)).toBe('Check devices and continue');
    expect(setupJourneyActionLabel(2)).toBe('Play pulse and continue');
    expect(setupJourneyActionLabel(3)).toBe('Enter app');
  });

  it('clamps direct step navigation inside the journey', () => {
    expect(clampSetupJourneyStep(-1)).toBe(0);
    expect(clampSetupJourneyStep(1)).toBe(1);
    expect(clampSetupJourneyStep(99)).toBe(3);
  });
});
