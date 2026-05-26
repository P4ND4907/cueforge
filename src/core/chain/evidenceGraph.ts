import { normalizeMachineEvidence } from './evidence.js';
import type { ChainEdge, ChainNode, ChainTopologyWarning, NativeEvidence, NodeKind } from './types.js';

const processorLabels: Record<string, { label: string; kind: NodeKind; group: string }> = {
  equalizerApo: { label: 'Equalizer APO', kind: 'apo-layer', group: 'eq' },
  peace: { label: 'Peace', kind: 'apo-layer', group: 'eq' },
  sonar: { label: 'SteelSeries Sonar', kind: 'virtual-mixer', group: 'virtual' },
  steelSeriesSonar: { label: 'SteelSeries Sonar', kind: 'virtual-mixer', group: 'virtual' },
  voicemeeter: { label: 'Voicemeeter', kind: 'virtual-mixer', group: 'virtual' },
  vbCable: { label: 'VB-CABLE', kind: 'virtual-mixer', group: 'virtual' },
  dolby: { label: 'Dolby Atmos', kind: 'system-effect', group: 'spatial' },
  dolbyAccess: { label: 'Dolby Atmos', kind: 'system-effect', group: 'spatial' },
  dts: { label: 'DTS Sound Unbound', kind: 'system-effect', group: 'spatial' },
  dtsSoundUnbound: { label: 'DTS Sound Unbound', kind: 'system-effect', group: 'spatial' },
  windowsSonic: { label: 'Windows Sonic', kind: 'system-effect', group: 'spatial' },
  nahimic: { label: 'Nahimic', kind: 'system-effect', group: 'spatial' },
  razer: { label: 'Razer THX', kind: 'system-effect', group: 'spatial' },
  razerThx: { label: 'Razer THX', kind: 'system-effect', group: 'spatial' },
  fxSound: { label: 'FxSound', kind: 'system-effect', group: 'enhancer' },
  nvidiaBroadcast: { label: 'NVIDIA Broadcast', kind: 'system-effect', group: 'mic' },
  voicemod: { label: 'Voicemod', kind: 'system-effect', group: 'mic' }
};

function list(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function clean(value: unknown, fallback = '') {
  return String(value || fallback).replace(/\s+/g, ' ').trim() || fallback;
}

function slug(value: unknown, fallback = 'node') {
  const text = clean(value, fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return text || fallback;
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function toolInstalled(tool: any) {
  if (typeof tool === 'boolean') return tool;
  return Boolean(tool?.installed ?? tool?.detected);
}

function toolLabel(key: string, tool: any) {
  return clean(tool?.displayName || tool?.name || processorLabels[key]?.label || key);
}

function endpointLabel(endpoint: any, fallback: string) {
  return clean(endpoint?.label || endpoint?.name || endpoint?.friendlyName || endpoint?.FriendlyName || endpoint?.Name, fallback);
}

function endpointKind(endpoint: any): 'audioinput' | 'audiooutput' {
  const role = clean(endpoint?.kind || endpoint?.dataFlow || endpoint?.role || endpoint?.Status).toLowerCase();
  const label = endpointLabel(endpoint, '').toLowerCase();
  if (role.includes('input') || role.includes('capture') || /mic|microphone|input|capture/.test(label)) return 'audioinput';
  return 'audiooutput';
}

function isVirtualLabel(label = '') {
  return /sonar|voicemeeter|vb-cable|virtual cable|cable output|cable input|wave link/i.test(label);
}

function endpointNodeKind(endpoint: any): NodeKind {
  const label = endpointLabel(endpoint, '');
  if (endpointKind(endpoint) === 'audioinput') return isVirtualLabel(label) ? 'virtual-mixer' : 'physical-input';
  return isVirtualLabel(label) ? 'virtual-mixer' : 'physical-output';
}

function sessionKind(label = ''): NodeKind {
  if (/discord|teamspeak|mumble|obs|streamlabs|slack|zoom/i.test(label)) return 'communication-app';
  if (/game|valorant|tarkov|siege|rainbow|cod|warzone|apex|fortnite|counter|cs2|overwatch|pubg|battlefield/i.test(label)) return 'game-app';
  return 'app-session';
}

function addNode(nodes: Map<string, ChainNode>, node: ChainNode) {
  const existing = nodes.get(node.id);
  if (!existing) {
    nodes.set(node.id, {
      ...node,
      confidence: clamp01(node.confidence),
      facts: { ...node.facts }
    });
    return;
  }

  nodes.set(node.id, {
    ...existing,
    confidence: Math.max(existing.confidence, clamp01(node.confidence)),
    facts: {
      ...existing.facts,
      ...node.facts
    }
  });
}

function addEdge(edges: Map<string, ChainEdge>, edge: ChainEdge) {
  if (!edge.from || !edge.to || edge.from === edge.to) return;
  edges.set(`${edge.from}->${edge.to}:${edge.relation}`, edge);
}

function nodeByLabel(nodes: Map<string, ChainNode>, pattern: RegExp, kinds: NodeKind[] = []) {
  return [...nodes.values()].find((node) => (
    pattern.test(node.label) &&
    (!kinds.length || kinds.includes(node.kind))
  ));
}

function findNodeForDefault(value: unknown, rawEndpointMap: Map<string, string>, labelEndpointMap: Map<string, string>) {
  const raw = clean(value);
  if (!raw) return null;
  return rawEndpointMap.get(raw) || labelEndpointMap.get(raw.toLowerCase()) || null;
}

function buildEndpointNodes({
  nodes,
  native,
  bridgeReport
}: {
  nodes: Map<string, ChainNode>;
  native?: Partial<NativeEvidence> | null;
  bridgeReport: any;
}) {
  const rawEndpointMap = new Map<string, string>();
  const labelEndpointMap = new Map<string, string>();
  const nativeEndpoints = list(native?.endpoints);
  const bridgeEndpoints = nativeEndpoints.length
    ? nativeEndpoints
    : [...list(bridgeReport?.soundDevices), ...list(bridgeReport?.mediaDevices)];

  bridgeEndpoints.forEach((endpoint, index) => {
    const label = endpointLabel(endpoint, `Windows endpoint ${index + 1}`);
    const kind = endpointNodeKind(endpoint);
    const role = endpointKind(endpoint);
    const id = `endpoint-${role === 'audioinput' ? 'input' : 'output'}-${index}`;
    const rawId = clean(endpoint?.id || endpoint?.endpointId || endpoint?.deviceId || '');

    if (rawId) rawEndpointMap.set(rawId, id);
    labelEndpointMap.set(label.toLowerCase(), id);

    addNode(nodes, {
      id,
      kind,
      label,
      confidence: nativeEndpoints.length ? 0.94 : 0.82,
      facts: {
        source: nativeEndpoints.length ? 'native' : 'desktop_bridge',
        role,
        isDefault: Boolean(endpoint?.isDefault),
        state: clean(endpoint?.state || endpoint?.Status || 'detected'),
        virtual: kind === 'virtual-mixer'
      }
    });
  });

  return { rawEndpointMap, labelEndpointMap };
}

function buildBrowserCorroboration({
  nodes,
  edges,
  browser
}: {
  nodes: Map<string, ChainNode>;
  edges: Map<string, ChainEdge>;
  browser: any;
}) {
  list(browser.devices).forEach((device, index) => {
    const label = clean(device.label, device.kind === 'audioinput' ? 'Browser input' : 'Browser output');
    const kind: NodeKind = device.kind === 'audioinput' ? 'physical-input' : 'physical-output';
    const id = `browser-${device.kind === 'audioinput' ? 'input' : 'output'}-${index}`;
    const nativeMatch = nodeByLabel(
      nodes,
      new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
      [kind, 'virtual-mixer']
    );

    addNode(nodes, {
      id,
      kind,
      label,
      confidence: device.label ? 0.48 : 0.28,
      facts: {
        source: 'browser',
        permission: browser.permission,
        defaultHint: Boolean(device.isDefault),
        browserOnly: !nativeMatch
      }
    });

    if (nativeMatch) {
      addEdge(edges, { from: id, to: nativeMatch.id, relation: 'mirrors' });
    }
  });
}

function buildProcessorNodes(nodes: Map<string, ChainNode>, tools: Record<string, any> = {}) {
  const processorIds = new Map<string, string>();

  Object.entries(tools).forEach(([key, tool]) => {
    if (!toolInstalled(tool)) return;
    const meta = processorLabels[key] || {
      label: key,
      kind: 'system-effect' as NodeKind,
      group: 'unknown'
    };
    const label = toolLabel(key, tool);
    const id = `processor-${slug(meta.label || key, key)}`;

    processorIds.set(key, id);
    addNode(nodes, {
      id,
      kind: meta.kind,
      label,
      confidence: 0.9,
      facts: {
        source: 'native-tool',
        toolKey: key,
        group: meta.group,
        version: clean(tool?.version || ''),
        installed: true
      }
    });
  });

  return processorIds;
}

function addDefaultEdges({
  nodes,
  edges,
  defaults,
  rawEndpointMap,
  labelEndpointMap
}: {
  nodes: Map<string, ChainNode>;
  edges: Map<string, ChainEdge>;
  defaults: Record<string, any>;
  rawEndpointMap: Map<string, string>;
  labelEndpointMap: Map<string, string>;
}) {
  Object.entries(defaults || {}).forEach(([role, target]) => {
    const targetId = findNodeForDefault(target, rawEndpointMap, labelEndpointMap);
    if (!targetId) return;
    const isComms = role.toLowerCase().includes('communication');
    const id = `default-${slug(role)}`;

    addNode(nodes, {
      id,
      kind: isComms ? 'communication-app' : 'app-session',
      label: `Windows ${role}`,
      confidence: 0.86,
      facts: {
        source: 'native-default',
        role
      }
    });
    addEdge(edges, { from: id, to: targetId, relation: 'defaults-to' });
  });
}

function addSessionEdges({
  nodes,
  edges,
  native,
  bridgeReport,
  rawEndpointMap,
  labelEndpointMap
}: {
  nodes: Map<string, ChainNode>;
  edges: Map<string, ChainEdge>;
  native?: Partial<NativeEvidence> | null;
  bridgeReport: any;
  rawEndpointMap: Map<string, string>;
  labelEndpointMap: Map<string, string>;
}) {
  const sessions = list(native?.sessions).length ? list(native?.sessions) : list(bridgeReport?.sessions);

  sessions.forEach((session, index) => {
    const label = clean(session.app || session.processName || session.ProcessName || `App session ${index + 1}`);
    const id = `session-${index}-${slug(label, 'app')}`;
    const targetId = findNodeForDefault(session.endpointId || session.endpoint || session.device || '', rawEndpointMap, labelEndpointMap);

    addNode(nodes, {
      id,
      kind: sessionKind(label),
      label,
      confidence: targetId ? 0.88 : 0.62,
      facts: {
        source: 'native-session',
        active: Boolean(session.active ?? true),
        routedEndpointKnown: Boolean(targetId)
      }
    });

    if (targetId) {
      addEdge(edges, { from: id, to: targetId, relation: 'routes-to' });
    }
  });
}

function addProcessorEdges({
  nodes,
  edges,
  processorIds
}: {
  nodes: Map<string, ChainNode>;
  edges: Map<string, ChainEdge>;
  processorIds: Map<string, string>;
}) {
  const physicalOutput = [...nodes.values()].find((node) => node.kind === 'physical-output');
  const virtualOutputs = [...nodes.values()].filter((node) => node.kind === 'virtual-mixer');
  const apoNodes = [...nodes.values()].filter((node) => node.kind === 'apo-layer');
  const systemEffects = [...nodes.values()].filter((node) => node.kind === 'system-effect');
  const sonarNode = processorIds.get('sonar') || processorIds.get('steelSeriesSonar');

  virtualOutputs.forEach((virtualNode) => {
    if (physicalOutput) addEdge(edges, { from: virtualNode.id, to: physicalOutput.id, relation: 'routes-to' });
  });

  apoNodes.forEach((apoNode) => {
    const upstreamVirtual = sonarNode ? nodes.get(sonarNode) || virtualOutputs.find((node) => /sonar/i.test(node.label)) : virtualOutputs[0];
    if (upstreamVirtual) addEdge(edges, { from: upstreamVirtual.id, to: apoNode.id, relation: 'processed-by' });
    if (physicalOutput) addEdge(edges, { from: apoNode.id, to: physicalOutput.id, relation: 'routes-to' });
  });

  systemEffects.forEach((effectNode) => {
    const target = virtualOutputs[0] || physicalOutput;
    if (target) addEdge(edges, { from: target.id, to: effectNode.id, relation: 'processed-by' });
  });
}

function topologyWarnings(nodes: ChainNode[], edges: ChainEdge[]): ChainTopologyWarning[] {
  const warnings: ChainTopologyWarning[] = [];
  const virtualMixers = nodes.filter((node) => node.kind === 'virtual-mixer');
  const apoLayers = nodes.filter((node) => node.kind === 'apo-layer');
  const systemEffects = nodes.filter((node) => node.kind === 'system-effect' && ['spatial', 'enhancer'].includes(String(node.facts.group || '')));
  const outputs = nodes.filter((node) => node.kind === 'physical-output');
  const inputs = nodes.filter((node) => node.kind === 'physical-input');
  const sonarNodes = virtualMixers.filter((node) => /sonar/i.test(node.label));
  const apo = apoLayers[0];
  const physical = outputs[0];
  const sonar = sonarNodes.find((node) => apo && edges.some((edge) => edge.from === node.id && edge.to === apo.id)) || sonarNodes[0];
  const sonarToApo = Boolean(apo && sonarNodes.some((node) => edges.some((edge) => edge.from === node.id && edge.to === apo.id)));
  const apoToPhysical = Boolean(apo && physical && edges.some((edge) => edge.from === apo.id && edge.to === physical.id));

  if (!outputs.length) {
    warnings.push({
      id: 'missing-default-output-endpoint',
      severity: 'high',
      title: 'No physical output endpoint in the graph',
      detail: 'CueForge cannot prove where game audio reaches the headset, IEM, DAC, or speakers.',
      fix: 'Run the desktop bridge scan and confirm Windows default playback.',
      nodeIds: []
    });
  }

  if (!inputs.length) {
    warnings.push({
      id: 'missing-default-input-endpoint',
      severity: 'medium',
      title: 'No physical input endpoint in the graph',
      detail: 'CueForge cannot prove the mic path for Discord, game chat, or stream voice.',
      fix: 'Run the desktop bridge scan or grant browser mic permission.',
      nodeIds: []
    });
  }

  if (sonarToApo && apoToPhysical) {
    warnings.push({
      id: 'potential-double-eq-spatial-stack',
      severity: 'medium',
      title: 'Potential double-processing stack',
      detail: `${sonar?.label} routes into ${apo?.label}, then to ${physical?.label}. That can double EQ, spatialize twice, or hide the endpoint actually being tuned.`,
      fix: 'Confirm the APO target endpoint and test one processing layer at a time.',
      nodeIds: [sonar?.id, apo?.id, physical?.id].filter(Boolean) as string[]
    });
  }

  if (virtualMixers.length > 1) {
    warnings.push({
      id: 'multiple-virtual-mixers',
      severity: 'high',
      title: 'Multiple virtual mixers are in the route graph',
      detail: `${virtualMixers.map((node) => node.label).join(' / ')} can split game, Discord, stream, and mic paths.`,
      fix: 'Pick one routing layer and verify defaults plus per-app sessions.',
      nodeIds: virtualMixers.map((node) => node.id)
    });
  }

  if (systemEffects.length > 1) {
    warnings.push({
      id: 'multiple-system-effects',
      severity: 'medium',
      title: 'Multiple system effects can smear direction',
      detail: `${systemEffects.map((node) => node.label).join(' / ')} are both represented in the graph.`,
      fix: 'Use one spatial/enhancer layer while testing CueForge profiles.',
      nodeIds: systemEffects.map((node) => node.id)
    });
  }

  return warnings;
}

function graphConfidence(nodes: ChainNode[], edges: ChainEdge[], normalizedConfidence: number) {
  const nativeNodes = nodes.filter((node) => ['native', 'desktop_bridge', 'native-tool', 'native-default', 'native-session'].includes(String(node.facts.source)));
  const mirrorEdges = edges.filter((edge) => edge.relation === 'mirrors');
  const routeEdges = edges.filter((edge) => ['routes-to', 'defaults-to'].includes(edge.relation));
  const processorEdges = edges.filter((edge) => edge.relation === 'processed-by');
  const score =
    normalizedConfidence / 100 * 0.48 +
    Math.min(0.24, nativeNodes.length * 0.035) +
    Math.min(0.12, routeEdges.length * 0.03) +
    Math.min(0.1, processorEdges.length * 0.025) +
    Math.min(0.06, mirrorEdges.length * 0.03);

  return Number(clamp01(score).toFixed(2));
}

export function buildEvidenceChainGraph(input: Record<string, any> = {}) {
  const normalized = normalizeMachineEvidence(input);
  const nodes = new Map<string, ChainNode>();
  const edges = new Map<string, ChainEdge>();
  const { rawEndpointMap, labelEndpointMap } = buildEndpointNodes({
    nodes,
    native: input.native,
    bridgeReport: normalized.bridgeReport
  });
  const processorIds = buildProcessorNodes(nodes, normalized.bridgeReport?.tools || {});

  buildBrowserCorroboration({ nodes, edges, browser: normalized.browser });
  addDefaultEdges({
    nodes,
    edges,
    defaults: input.native?.defaults || normalized.bridgeReport?.defaults || {},
    rawEndpointMap,
    labelEndpointMap
  });
  addSessionEdges({
    nodes,
    edges,
    native: input.native,
    bridgeReport: normalized.bridgeReport,
    rawEndpointMap,
    labelEndpointMap
  });
  addProcessorEdges({ nodes, edges, processorIds });

  const nodeList = [...nodes.values()];
  const edgeList = [...edges.values()];

  return {
    schema: 'cueforge.chain-graph.v3',
    nodes: nodeList,
    edges: edgeList,
    warnings: topologyWarnings(nodeList, edgeList),
    evidenceConfidence: graphConfidence(nodeList, edgeList, normalized.evidenceConfidence),
    evidenceSource: normalized.source
  };
}
