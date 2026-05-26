import { buildChainWarnings } from '../chainGraph.js';
import { detectAudioConflicts } from '../conflictDetector.js';

export function inferRouteWarnings({ graph, chain, selectedGame }: Record<string, unknown> = {}) {
  const visualWarnings = buildChainWarnings(graph || {});
  const conflictReport = detectAudioConflicts({ graph, chain, selectedGame });
  return {
    schema: 'cueforge.route-warnings.v1',
    warnings: visualWarnings,
    conflicts: conflictReport.conflicts,
    summary: conflictReport.summary,
    clearToApply: conflictReport.clearToApply,
    chainHealth: conflictReport.chainHealth,
    audioDoctor: conflictReport.audioDoctor
  };
}
