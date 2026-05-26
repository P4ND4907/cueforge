export const setupJourneyStepCount = 4;

export function clampSetupJourneyStep(step, count = setupJourneyStepCount) {
  const max = Math.max(0, count - 1);
  const parsed = Number(step);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(max, Math.max(0, Math.round(parsed)));
}

export function nextSetupJourneyStep(currentStep, action = 'continue', count = setupJourneyStepCount) {
  const step = clampSetupJourneyStep(currentStep, count);
  const terminal = count - 1;

  if (step >= terminal) return terminal;
  if (['continue', 'device-check-complete', 'starter-tune-complete'].includes(action)) {
    return clampSetupJourneyStep(step + 1, count);
  }

  return step;
}

export function setupJourneyActionLabel(step) {
  switch (clampSetupJourneyStep(step)) {
    case 0:
      return 'Continue to Device Scan';
    case 1:
      return 'Check devices and continue';
    case 2:
      return 'Play pulse and continue';
    default:
      return 'Enter app';
  }
}
