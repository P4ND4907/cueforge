import { buildAudioChainGraph, buildChainGraph } from '../core/chain/buildChainGraph.js';
import { normalizeMachineEvidence } from '../core/chain/evidence.js';
import { inferReadiness } from '../core/chain/inferReadiness.js';
import { inferRouteWarnings } from '../core/chain/inferRouteWarnings.js';
import { mergeBridgeEvidence } from './native/mergeBridgeEvidence.js';
import type { BrowserEvidence, NativeEvidence } from '../core/chain/types.js';

export function assessMachine(
  browser: Partial<BrowserEvidence> | null = null,
  native?: Partial<NativeEvidence> | null,
  options: Record<string, any> = {}
) {
  const evidence = normalizeMachineEvidence({
    browser,
    native,
    browserDevices: options.browserDevices,
    bridgeReport: options.bridgeReport,
    permissionState: options.permissionState
  });
  const game = options.game || options.selectedGame?.title || 'Game audio';
  const rawGraph = buildAudioChainGraph({
    devices: evidence.browserDevices,
    bridgeReport: evidence.bridgeReport,
    game,
    desktopReady: Boolean(evidence.bridgeReport)
  });
  const graph = buildChainGraph({
    browser: evidence.browser,
    native,
    browserDevices: evidence.browserDevices,
    bridgeReport: evidence.bridgeReport,
    userSelections: {
      ...(options.userSelections || {}),
      game,
      desktopReady: Boolean(evidence.bridgeReport)
    }
  });
  const warnings = inferRouteWarnings({
    graph: rawGraph,
    selectedGame: options.selectedGame || {}
  });
  const readiness = inferReadiness({
    graph: rawGraph,
    conflicts: {
      conflicts: warnings.conflicts,
      summary: warnings.summary
    },
    profile: options.profile,
    hearing: options.hearing,
    exportReady: Boolean(options.exportReady),
    selfTests: options.selfTests || [],
    betaCheckins: options.betaCheckins || [],
    permissionState: evidence.permissionState
  });
  const autoDetect = mergeBridgeEvidence({
    browser: evidence.browser,
    native,
    browserDevices: evidence.browserDevices,
    bridgeReport: evidence.bridgeReport,
    permissionState: evidence.permissionState,
    detectedAt: options.detectedAt
  });

  return {
    schema: 'cueforge.machine-assessment.v1',
    source: evidence.source,
    graph,
    rawGraph,
    topology: {
      nodes: graph.nodes || [],
      edges: graph.edges || [],
      warnings: graph.topologyWarnings || [],
      evidenceConfidence: graph.evidenceConfidence
    },
    warnings,
    readiness,
    autoDetect,
    evidence: evidence.evidence,
    confidence: graph.evidenceConfidence
  };
}
