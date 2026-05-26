import { computeReadinessScoreV2 } from '../readinessScore.js';

export function inferReadiness(input: Record<string, unknown> = {}) {
  return computeReadinessScoreV2(input);
}
