import { detectBottleneck } from './bottleneckDiagnosis.js';
import { getPerformanceProfileConfig } from '../settings/performanceSettings.js';

export async function runSmartAssessment(mode = 'quick', {
  detectData = {},
  performanceProfile = 'balanced',
  runningGame = null
} = {}) {
  const bottleneck = detectBottleneck(detectData);
  const performance = getPerformanceProfileConfig(performanceProfile);
  const ready = bottleneck.status === 'clear' && mode === 'full';

  return {
    schema: 'cueforge.smart-assessment.v1',
    mode,
    game: runningGame || detectData.runningGame || null,
    performance: {
      profile: performanceProfile,
      ...performance
    },
    bottleneck,
    apply: {
      safeToApply: ready,
      reason: ready
        ? 'Full assessment is clear enough to stage a reversible profile.'
        : 'Preview only until the full scan, game settings, and Sound Match evidence agree.'
    },
    nextAction: bottleneck.primary.fix
  };
}
