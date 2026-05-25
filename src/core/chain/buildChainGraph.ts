import { buildChainGraph as buildCurrentChainGraph } from '../chainGraph.js';
import { buildEvidenceChainGraph } from './evidenceGraph.js';
import { normalizeMachineEvidence } from './evidence.js';
import type { ChainGraphResult } from './types.js';

export function buildChainGraph(input: Record<string, unknown> = {}): ChainGraphResult {
  const normalized = normalizeMachineEvidence(input);
  const userSelections = {
    ...((input.userSelections as Record<string, unknown>) || {}),
    desktopReady: Boolean(normalized.bridgeReport)
  };
  const graph = buildCurrentChainGraph({
    ...input,
    browserDevices: normalized.browserDevices,
    bridgeReport: normalized.bridgeReport,
    userSelections
  }) as ChainGraphResult;
  const evidenceGraph = buildEvidenceChainGraph({
    ...input,
    browser: normalized.browser,
    browserDevices: normalized.browserDevices,
    bridgeReport: normalized.bridgeReport
  });

  return {
    ...graph,
    nodes: evidenceGraph.nodes,
    edges: evidenceGraph.edges,
    topologyWarnings: evidenceGraph.warnings,
    evidenceConfidence: evidenceGraph.evidenceConfidence,
    evidenceSource: evidenceGraph.evidenceSource
  };
}

export { buildEvidenceChainGraph } from './evidenceGraph.js';
export { buildAudioChainGraph, buildReadableAudioChainPath, buildReadableMicChainPath } from '../chainGraph.js';
