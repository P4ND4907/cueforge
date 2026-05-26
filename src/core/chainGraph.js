import { classifyHardware } from '../data/hardwareProfiles.js';
import { installedCompanions } from '../data/knownCompanions.js';

function clean(value, fallback = '') {
  return String(value || fallback).replace(/\s+/g, ' ').trim();
}

function deviceName(device, fallback) {
  return clean(device?.label || device?.name || device?.Name || device?.FriendlyName || fallback);
}

function browserAudioDevices(devices = []) {
  return Array.isArray(devices) ? devices.filter((device) => clean(device?.kind).includes('audio')) : [];
}

function bridgeDevices(report) {
  return [...(report?.soundDevices || []), ...(report?.mediaDevices || [])];
}

function isVirtualLabel(label = '') {
  return /sonar|voicemeeter|vb-cable|virtual cable|cable input|cable output|wave link/i.test(label);
}

function nodeKindForType(type, label = '', meta = {}) {
  if (meta.kind) return meta.kind;
  if (type === 'game') return 'game-app';
  if (type === 'input') return isVirtualLabel(label) ? 'virtual-mixer' : 'physical-input';
  if (type === 'output') return isVirtualLabel(label) ? 'virtual-mixer' : 'physical-output';
  if (type === 'apply-target') return 'apo-layer';
  if (type === 'mixer' || type === 'routing') return 'virtual-mixer';
  if (type === 'communication-app') return 'communication-app';
  if (type === 'app-session') return /discord|teamspeak|mumble|obs|streamlabs|chat|voice/i.test(label) ? 'communication-app' : 'app-session';
  if (['spatial', 'enhancer', 'device-suite', 'mic-processing', 'driver-console', 'system-effect'].includes(type)) return 'system-effect';
  if (type === 'windows-default') return String(meta.role || '').toLowerCase().includes('communication') ? 'communication-app' : 'app-session';
  return 'app-session';
}

function node(id, type, label, status = 'detected', meta = {}) {
  const kind = nodeKindForType(type, label, meta);
  const facts = {
    source: meta.source || 'cueforge',
    role: meta.role || type,
    ...meta.facts
  };
  return { id, type, kind, label, status, meta, facts };
}

function edge(from, to, label, relation = 'routes-to', meta = {}) {
  return { from, to, label, relation, meta };
}

function firstGraphNode(graph, type) {
  return graph?.nodes?.find((item) => item.type === type) || null;
}

function graphNodesByType(graph, types) {
  return (graph?.nodes || []).filter((item) => types.includes(item.type));
}

function physicalOutputKind(label = '') {
  const text = String(label).toLowerCase();
  if (/iem|in-ear|earbud/.test(text)) return 'IEM';
  if (/dac|amp|interface/.test(text)) return 'DAC / amp';
  if (/headset/.test(text)) return 'Headset';
  if (/headphone/.test(text)) return 'Headphones';
  if (/speaker/.test(text)) return 'Speakers';
  return 'Physical output';
}

function layerNamesByType(graph, types) {
  return graphNodesByType(graph, types).map((layer) => layer.label).filter(Boolean);
}

function riskyLayers(graph, groups = []) {
  return (graph?.nodes || []).filter((item) => (
    item.id?.startsWith('companion-') &&
    (!groups.length || groups.includes(item.meta?.group)) &&
    ['medium', 'high'].includes(item.meta?.risk)
  ));
}

function routeStatus(node, fallback = 'unknown') {
  if (!node) return fallback;
  if (node.status === 'ready' || node.status === 'selected') return node.status;
  if (node.status === 'detected') return 'detected';
  return node.status || fallback;
}

function companionRouteStatus(node) {
  if (!node) return 'unknown';
  if (['mixer', 'routing', 'spatial', 'enhancer', 'mic-processing', 'device-suite', 'communication-app'].includes(node.type)) return 'active';
  return 'detected';
}

function routeItem(type, label, status = 'unknown', extra = {}) {
  return {
    type,
    label: clean(label, 'Unknown'),
    status,
    ...extra
  };
}

function problem(id, severity, title, detail, fix) {
  return { id, severity, title, detail, fix };
}

function uniqueByLabel(items = []) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.type}:${item.label}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function defaultLabels(report = {}) {
  const defaults = report?.defaults || report?.defaultEndpoints || {};
  return {
    playback: clean(defaults.playback || defaults.render || defaults.defaultPlayback || defaults.Playback),
    communicationsPlayback: clean(defaults.communicationsPlayback || defaults.communicationPlayback || defaults.defaultCommunicationsPlayback || defaults.CommunicationsPlayback),
    recording: clean(defaults.recording || defaults.capture || defaults.defaultRecording || defaults.Record || defaults.Recording),
    communicationsRecording: clean(defaults.communicationsRecording || defaults.communicationRecording || defaults.defaultCommunicationsRecording || defaults.CommunicationsRecording)
  };
}

function labelsMatch(a = '', b = '') {
  const left = clean(a).toLowerCase();
  const right = clean(b).toLowerCase();
  if (!left || !right) return false;
  return left === right || left.includes(right) || right.includes(left);
}

function findDeviceIndexByLabel(devices = [], label = '', fallbackIndex = -1) {
  if (!clean(label)) return fallbackIndex;
  const matchIndex = devices.findIndex((device) => labelsMatch(device.label, label));
  return matchIndex >= 0 ? matchIndex : fallbackIndex;
}

function sessionKind(label = '') {
  if (/discord|teamspeak|mumble|obs|streamlabs|slack|zoom|chat|voice/i.test(label)) return 'communication-app';
  if (/game|valorant|tarkov|siege|rainbow|cod|warzone|apex|fortnite|counter|cs2|overwatch|pubg|battlefield/i.test(label)) return 'game-app';
  return 'app-session';
}

function bridgeSessions(report = {}, game = 'Game audio') {
  const sessions = Array.isArray(report?.sessions) ? report.sessions : [];
  const runningGames = Array.isArray(report?.runningGames) ? report.runningGames : [];
  const normalizedSessions = sessions.map((session, index) => ({
    id: `session-${index}`,
    label: clean(session.app || session.processName || session.ProcessName || session.name || `App session ${index + 1}`),
    endpoint: clean(session.endpoint || session.endpointLabel || session.device || session.output || ''),
    endpointId: clean(session.endpointId || session.deviceId || ''),
    active: session.active !== false
  }));
  const gameSessions = runningGames.map((item, index) => ({
    id: `game-session-${index}`,
    label: clean(item.name || item.id || game, game),
    endpoint: clean(item.endpoint || item.device || ''),
    endpointId: '',
    active: true
  }));

  return [...normalizedSessions, ...gameSessions];
}

function companionEffectRole(item = {}) {
  if (item.type === 'apply-target') return 'apo-attachment';
  if (item.type === 'mixer') return 'virtual-mixer';
  if (item.type === 'routing') return 'virtual-route';
  if (item.group === 'spatial') return 'spatial-effect';
  if (item.group === 'mic-processing') return 'mic-effect';
  if (item.group === 'device-suite') return 'device-suite-effect';
  if (item.group === 'driver-console') return 'driver-console';
  return 'system-effect';
}

function routeConfidence({ graph, problems, userSelections }) {
  const summary = graph?.summary || {};
  let score = 20;
  if (summary.outputs) score += 15;
  if (summary.inputs) score += 15;
  if (summary.desktopBridge) score += 15;
  if (summary.companions) score += 10;
  if (summary.applyTargets) score += 10;
  if (userSelections?.game || userSelections?.gameLabel || userSelections?.selectedGame) score += 5;

  problems.forEach((item) => {
    score -= item.severity === 'error' ? 16 : item.severity === 'danger' ? 12 : 7;
  });

  return Math.max(0, Math.min(100, score));
}

function chainProblems({ graph, output, companions, userSelections }) {
  const summary = graph?.summary || {};
  const problems = [];
  const companionKeys = new Set(companions.map((item) => item.meta?.key || item.id?.replace('companion-', '')));
  const outputLabel = clean(output?.label).toLowerCase();
  const apoTarget = clean(userSelections?.apoTarget || userSelections?.windowsDefaultOutput || userSelections?.outputDevice).toLowerCase();
  const sonarActive = companionKeys.has('steelSeriesSonar');
  const apoDetected = companionKeys.has('equalizerApo');
  const routing = graphNodesByType(graph, ['routing']);
  const mixers = graphNodesByType(graph, ['mixer']);
  const micProcessing = graphNodesByType(graph, ['mic-processing']);
  const outputProcessing = graphNodesByType(graph, ['enhancer', 'spatial', 'device-suite']);

  if (!summary.outputs) {
    problems.push(problem(
      'output_missing',
      'error',
      'Output device is not detected',
      'CueForge cannot prove the headset, IEM, DAC, or speaker path yet.',
      'Run Auto Setup or import the Windows bridge report before testing EQ.'
    ));
  }

  if (!summary.inputs) {
    problems.push(problem(
      'input_missing',
      'error',
      'Mic input is not detected',
      'CueForge cannot prove the Discord, game chat, or stream voice path yet.',
      'Grant mic permission or import the Windows bridge report before testing mic fixes.'
    ));
  }

  if (sonarActive && apoDetected && !outputLabel.includes('sonar') && !apoTarget.includes('sonar')) {
    problems.push(problem(
      'sonar_apo_target_mismatch',
      'warning',
      'APO may be installed on the wrong endpoint',
      'SteelSeries Sonar is active while Equalizer APO is detected, but the active output does not look like a Sonar endpoint.',
      'Apply APO to the active Sonar output or disable Sonar routing before testing.'
    ));
  }

  if (routing.length > 1) {
    problems.push(problem(
      'virtual_route_stack',
      'danger',
      'Multiple virtual routes can hide the real signal path',
      `${routing.map((item) => item.label).join(' / ')} are detected together.`,
      'Pick one virtual routing tool, then verify Windows, Discord, game chat, and stream devices.'
    ));
  }

  if (mixers.length && routing.length) {
    problems.push(problem(
      'mixer_route_overlap',
      'warning',
      'Mixer and virtual routing both affect the chain',
      `${[...mixers, ...routing].map((item) => item.label).join(' / ')} can split game and mic paths.`,
      'Write down the exact Windows output/input plus Discord and game devices before tuning.'
    ));
  }

  if (micProcessing.length > 1) {
    problems.push(problem(
      'mic_processing_stack',
      'warning',
      'Stacked mic processors can damage comms',
      `${micProcessing.map((item) => item.label).join(' / ')} can gate, clip, delay, or robotize voice.`,
      'Test one mic processor at a time, then run Mic Lab and ask a teammate how it sounds.'
    ));
  }

  if (outputProcessing.length > 1) {
    problems.push(problem(
      'output_processing_stack',
      'warning',
      'Stacked output processors can smear direction',
      `${outputProcessing.map((item) => item.label).join(' / ')} can change footsteps and imaging before CueForge tuning is judged.`,
      'Use one spatial/enhancer layer at a time and compare one real match.'
    ));
  }

  return problems;
}

function chainSuggestions({ graph, problems }) {
  const suggestions = problems.map((item) => item.fix);
  const summary = graph?.summary || {};

  if (summary.outputs && summary.inputs && !suggestions.length) {
    suggestions.push('Run one before/after match check and save the result before calling this setup proven.');
  }
  if (!summary.desktopBridge) {
    suggestions.push('Use the desktop bridge for stronger Windows endpoint, APO, Sonar, Voicemeeter, and VB-CABLE proof.');
  }
  if (summary.applyTargets) {
    suggestions.push('Export APO text first, review the target endpoint, then apply manually or through an explicit desktop flow.');
  }

  return [...new Set(suggestions)].slice(0, 6);
}

export function buildChainGraph({
  browserDevices = [],
  bridgeReport = null,
  userSelections = {}
} = {}) {
  const graph = buildAudioChainGraph({
    devices: browserDevices,
    bridgeReport,
    game: userSelections.game || userSelections.gameLabel || userSelections.selectedGame || 'Game audio',
    desktopReady: Boolean(userSelections.desktopReady)
  });
  const game = firstGraphNode(graph, 'game');
  const output = firstGraphNode(graph, 'output');
  const input = firstGraphNode(graph, 'input');
  const companions = graphNodesByType(graph, [
    'apply-target',
    'mixer',
    'routing',
    'spatial',
    'enhancer',
    'device-suite',
    'mic-processing',
    'driver-console',
    'communication-app'
  ]).map((item) => ({ ...item, meta: { ...item.meta, key: item.id?.replace('companion-', '') } }));
  const outputLayers = companions.filter((item) => ['mixer', 'routing', 'spatial', 'enhancer', 'device-suite'].includes(item.type));
  const apoLayers = companions.filter((item) => item.type === 'apply-target');
  const inputLayers = companions.filter((item) => ['mic-processing', 'mixer', 'routing', 'device-suite'].includes(item.type));
  const virtualRoutes = companions
    .filter((item) => ['mixer', 'routing'].includes(item.type))
    .map((item) => routeItem(item.type === 'routing' ? 'virtual-route' : 'virtual-mixer', item.label, companionRouteStatus(item), {
      risk: item.meta?.risk || 'unknown'
    }));
  const problems = chainProblems({ graph, output, companions, userSelections });
  const outputLabel = output?.label || userSelections.outputDevice || userSelections.windowsDefaultOutput || 'Windows default output';
  const inputLabel = input?.label || userSelections.inputDevice || userSelections.windowsDefaultInput || 'Windows default input';

  const outputPath = uniqueByLabel([
    routeItem(
      'app',
      userSelections.appLabel || userSelections.game || 'Game audio',
      userSelections.game || userSelections.selectedGame ? routeStatus(game) : userSelections.appStatus || 'unknown'
    ),
    routeItem('windows', outputLabel, output ? routeStatus(output) : 'unknown'),
    ...outputLayers.map((item) => routeItem('companion', item.label, companionRouteStatus(item), {
      risk: item.meta?.risk || 'unknown'
    })),
    ...apoLayers.map((item) => routeItem('apo', item.label, 'detected')),
    routeItem('hardware', userSelections.hardwareLabel || outputLabel || 'HyperX / IEM / DAC', output ? 'suspected' : 'unknown')
  ]);
  const inputPath = uniqueByLabel([
    routeItem('mic', userSelections.micLabel || inputLabel || 'Mic', input ? routeStatus(input) : 'unknown'),
    routeItem('windows', inputLabel, input ? routeStatus(input) : 'unknown'),
    ...inputLayers.map((item) => routeItem('companion', item.label, companionRouteStatus(item), {
      risk: item.meta?.risk || 'unknown'
    })),
    routeItem('destination', userSelections.voiceDestination || 'Game Chat / Discord / Stream', input ? 'suspected' : 'unknown')
  ]);

  return {
    schema: graph.schema,
    nodes: graph.nodes,
    edges: graph.edges,
    summary: graph.summary,
    outputPath,
    inputPath,
    companions: companions.map((item) => ({
      key: item.meta?.key,
      type: item.type,
      label: item.label,
      status: companionRouteStatus(item),
      group: item.meta?.group || 'unknown',
      risk: item.meta?.risk || 'unknown'
    })),
    virtualRoutes,
    confidence: routeConfidence({ graph, problems, userSelections }),
    problems,
    suggestions: chainSuggestions({ graph, problems })
  };
}

export function buildReadableAudioChainPath(graph = {}) {
  const game = firstGraphNode(graph, 'game');
  const output = firstGraphNode(graph, 'output');
  const player = firstGraphNode(graph, 'player');
  const layers = graphNodesByType(graph, [
    'apply-target',
    'mixer',
    'routing',
    'spatial',
    'enhancer',
    'device-suite',
    'mic-processing',
    'communication-app'
  ]);
  const outputLabel = output?.label || 'Output not detected yet';
  const layerNames = layers.map((layer) => layer.label).filter(Boolean);

  return [
    {
      id: 'game',
      label: 'Game',
      value: game?.label || 'Game not selected',
      detail: 'Rendered mix starts here.',
      status: game?.status || 'missing'
    },
    {
      id: 'windows-output',
      label: 'Windows Output Device',
      value: outputLabel,
      detail: output
        ? 'This is the endpoint Windows is exposing to CueForge.'
        : 'Run Auto Setup or load the Windows bridge report.',
      status: output?.status || 'missing'
    },
    {
      id: 'layers',
      label: 'Possible Layer',
      value: layerNames.length ? layerNames.join(' / ') : 'No extra layer detected yet',
      detail: layerNames.length
        ? 'Sonar, Dolby, Nahimic, Windows Sonic, APO, Peace, Voicemeeter, VB-Cable, or similar layers can change what you hear.'
        : 'This does not prove the chain is clean. Browser mode may miss native Windows layers.',
      status: layerNames.length ? 'detected' : 'limited',
      items: layerNames
    },
    {
      id: 'physical-output',
      label: 'Physical DAC / Headset / IEM',
      value: output ? outputLabel : 'Physical endpoint unknown',
      detail: output
        ? `${physicalOutputKind(outputLabel)} inferred from the detected output name.`
        : 'Connect or identify the headset, DAC, IEM, or speakers.',
      status: output?.status || 'missing'
    },
    {
      id: 'player',
      label: 'Player',
      value: player?.label || 'Player',
      detail: 'This is the final proof point: what the player actually hears in a match.',
      status: player?.status || 'ready'
    }
  ];
}

export function buildReadableMicChainPath(graph = {}) {
  const input = firstGraphNode(graph, 'input');
  const micLayerNames = layerNamesByType(graph, ['mic-processing', 'mixer', 'routing', 'device-suite', 'communication-app']);
  const inputLabel = input?.label || 'Mic/input not detected yet';

  return [
    {
      id: 'mic',
      label: 'Mic',
      value: inputLabel,
      detail: input ? 'Voice capture starts at the physical mic.' : 'Grant mic permission or load the Windows bridge report.',
      status: input?.status || 'missing'
    },
    {
      id: 'windows-input',
      label: 'Windows Input Device',
      value: inputLabel,
      detail: input
        ? 'This is the input endpoint Windows is exposing to CueForge.'
        : 'CueForge cannot prove the chat path until an input is visible.',
      status: input?.status || 'missing'
    },
    {
      id: 'mic-layers',
      label: 'Noise Suppression / Chat Layer',
      value: micLayerNames.length ? micLayerNames.join(' / ') : 'No mic/chat layer detected yet',
      detail: micLayerNames.length
        ? 'Noise suppression, Discord, Sonar, Voicemeeter, VB-Cable, or device software can change what teammates hear.'
        : 'This does not prove the mic path is clean. Browser mode may miss native processors.',
      status: micLayerNames.length ? 'detected' : 'limited',
      items: micLayerNames
    },
    {
      id: 'chat-target',
      label: 'Game Chat / Discord / Stream',
      value: 'Voice destination',
      detail: 'Final proof is teammate feedback or a short opt-in evidence check after one real session.',
      status: input ? 'ready' : 'limited'
    }
  ];
}

export function buildChainWarnings(graph = {}) {
  const summary = graph?.summary || {};
  const warnings = [];
  const micProcessors = graphNodesByType(graph, ['mic-processing']);
  const routing = graphNodesByType(graph, ['routing']);
  const mixers = graphNodesByType(graph, ['mixer']);
  const enhancers = graphNodesByType(graph, ['enhancer', 'spatial', 'device-suite']);
  const highRisk = riskyLayers(graph);

  if (!summary.inputs) {
    warnings.push({
      id: 'missing-mic',
      severity: 'high',
      title: 'Mic path is not proven',
      detail: 'CueForge cannot see the Windows input device yet.',
      fix: 'Grant mic permission or run the desktop bridge scan, then check Discord/game input.'
    });
  }

  if (!summary.outputs) {
    warnings.push({
      id: 'missing-output',
      severity: 'high',
      title: 'Output path is not proven',
      detail: 'CueForge cannot see the headset, IEM, DAC, or speaker endpoint yet.',
      fix: 'Run Auto Setup or import the Windows bridge report before trusting a profile.'
    });
  }

  if (routing.length > 1) {
    warnings.push({
      id: 'routing-stack',
      severity: 'high',
      title: 'Too many routing layers',
      detail: `${routing.map((item) => item.label).join(' / ')} can hide where game, chat, or stream audio is actually going.`,
      fix: 'Pick one routing tool, then verify Windows output, Discord output/input, and game voice input.'
    });
  }

  if (mixers.length && routing.length) {
    warnings.push({
      id: 'mixer-routing-overlap',
      severity: 'medium',
      title: 'Mixer plus virtual routing detected',
      detail: `${[...mixers, ...routing].map((item) => item.label).join(' / ')} can split game and voice paths in confusing ways.`,
      fix: 'Name the default Windows output/input, Discord devices, and game devices before tuning.'
    });
  }

  if (micProcessors.length > 1) {
    warnings.push({
      id: 'stacked-mic-processing',
      severity: 'medium',
      title: 'Stacked mic processing risk',
      detail: `${micProcessors.map((item) => item.label).join(' / ')} can cause robotic voice, gating, clipping, or delay.`,
      fix: 'Test one mic processor at a time, then run Mic Lab and a teammate check.'
    });
  }

  if (enhancers.length > 1) {
    warnings.push({
      id: 'stacked-output-processing',
      severity: 'medium',
      title: 'Stacked output processing risk',
      detail: `${enhancers.map((item) => item.label).join(' / ')} can smear direction or over-boost cues.`,
      fix: 'Use one spatial/enhancer layer at a time before judging footsteps or direction.'
    });
  }

  if (!warnings.length && highRisk.length) {
    warnings.push({
      id: 'review-risk-layers',
      severity: 'medium',
      title: 'Review detected companion layers',
      detail: `${highRisk.map((item) => item.label).join(' / ')} can affect routing or processing.`,
      fix: 'Keep the layer if it is intentional, but verify before/after with one real match.'
    });
  }

  return warnings.slice(0, 5);
}

export function buildAudioChainGraph({
  devices = [],
  bridgeReport = null,
  game = 'Tarkov / Siege / COD',
  desktopReady = false
} = {}) {
  const nodes = [];
  const edges = [];
  const outputNodeIds = [];
  const inputNodeIds = [];
  const browserDevices = browserAudioDevices(devices);
  const allDevices = [
    ...browserDevices.map((device, index) => ({
      source: 'browser',
      kind: device.kind,
      label: deviceName(device, `${device.kind || 'audio device'} ${index + 1}`)
    })),
    ...bridgeDevices(bridgeReport).map((device, index) => ({
      source: 'bridge',
      kind: /mic|microphone|capture|input/i.test(deviceName(device)) ? 'audioinput' : 'audiooutput',
      label: deviceName(device, `Windows audio device ${index + 1}`)
    }))
  ];

  const inputDevices = allDevices.filter((device) => device.kind === 'audioinput' || /mic|microphone|input|capture/i.test(device.label));
  const outputDevices = allDevices.filter((device) => device.kind === 'audiooutput' || /headphone|headset|speaker|dac|iem|output/i.test(device.label));
  const companions = installedCompanions(bridgeReport);
  const applyTargets = companions.filter((item) => item.type === 'apply-target');
  const routingLayers = companions.filter((item) => item.type === 'routing' || item.type === 'mixer');
  const processingLayers = companions.filter((item) => ['enhancer', 'spatial', 'mic-processing', 'device-suite'].includes(item.type));
  const defaults = defaultLabels(bridgeReport);
  const sessions = bridgeSessions(bridgeReport, game);

  nodes.push(node('player', 'player', 'Player', 'ready', { role: 'listener' }));
  nodes.push(node('game', 'game', game, 'selected', { role: 'rendered-game-mix' }));
  nodes.push(node('browser', 'scan', 'Browser scan', browserDevices.length ? 'ready' : 'limited', { source: 'browser', role: 'browser-audio-api' }));
  nodes.push(node('desktop', 'scan', 'Desktop bridge', bridgeReport ? 'ready' : desktopReady ? 'available' : 'missing', { source: 'desktop_bridge', role: 'windows-scan' }));

  inputDevices.slice(0, 4).forEach((device, index) => {
    const id = `input-${index}`;
    const label = device.label || `Input ${index + 1}`;
    inputNodeIds.push(id);
    nodes.push(node(`input-${index}`, 'input', device.label || `Input ${index + 1}`, device.label ? 'detected' : 'unnamed', {
      source: device.source,
      role: device.source === 'browser' ? 'browser mic / app mic' : 'physical input endpoint',
      profiles: classifyHardware(device.label).map((profile) => profile.id)
    }));
    edges.push(edge(id, 'player', 'voice capture', 'routes-to'));
    if (device.source === 'browser') {
      const appMicId = `browser-app-mic-${index}`;
      nodes.push(node(appMicId, 'app-session', 'Browser mic / CueForge capture', 'limited', {
        source: 'browser',
        role: 'browser mic / app mic'
      }));
      edges.push(edge(id, appMicId, 'browser capture hint', 'mirrors'));
    }
  });

  outputDevices.slice(0, 4).forEach((device, index) => {
    const id = `output-${index}`;
    const label = device.label || `Output ${index + 1}`;
    outputNodeIds.push(id);
    nodes.push(node(id, 'output', label, device.label ? 'detected' : 'unnamed', {
      source: device.source,
      role: isVirtualLabel(label) ? 'virtual output endpoint' : 'physical output endpoint',
      profiles: classifyHardware(device.label).map((profile) => profile.id)
    }));
    edges.push(edge('game', id, 'rendered mix', 'routes-to'));
    edges.push(edge(id, 'player', 'listening path', 'routes-to'));
  });

  [
    { key: 'playback', label: 'Windows default multimedia endpoint', type: 'output', fallbackIndex: 0 },
    { key: 'communicationsPlayback', label: 'Windows default communications endpoint', type: 'output', fallbackIndex: -1 },
    { key: 'recording', label: 'Windows default recording endpoint', type: 'input', fallbackIndex: 0 },
    { key: 'communicationsRecording', label: 'Windows default communications input', type: 'input', fallbackIndex: -1 }
  ].forEach((item) => {
    const pool = item.type === 'output' ? outputDevices.slice(0, 4) : inputDevices.slice(0, 4);
    const ids = item.type === 'output' ? outputNodeIds : inputNodeIds;
    const defaultLabel = defaults[item.key];
    const targetIndex = findDeviceIndexByLabel(pool, defaultLabel, defaultLabel ? -1 : item.fallbackIndex);
    const targetId = ids[targetIndex];
    const shouldShowUnknownDefault = bridgeReport && (defaultLabel || targetId || item.key === 'playback' || item.key === 'recording');
    if (!shouldShowUnknownDefault) return;

    const defaultId = `windows-default-${item.key}`;
    nodes.push(node(defaultId, 'windows-default', item.label, targetId ? 'detected' : 'unknown', {
      source: 'desktop_bridge',
      role: item.key,
      target: defaultLabel || null
    }));
    if (targetId) {
      edges.push(edge(defaultId, targetId, item.key.includes('communications') ? 'communications default' : 'multimedia default', 'defaults-to'));
    }
  });

  companions.forEach((item) => {
    nodes.push(node(`companion-${item.key}`, item.type, item.name, 'detected', {
      source: 'desktop_bridge',
      group: item.group,
      risk: item.risk,
      evidence: item.evidence,
      role: companionEffectRole(item)
    }));
  });

  sessions.slice(0, 8).forEach((session, index) => {
    const id = `${session.id || 'session'}-${index}`;
    const kind = sessionKind(session.label);
    const targetPool = kind === 'communication-app' ? inputDevices : outputDevices;
    const targetIds = kind === 'communication-app' ? inputNodeIds : outputNodeIds;
    const targetIndex = findDeviceIndexByLabel(targetPool, session.endpoint, -1);
    const targetId = targetIds[targetIndex];

    nodes.push(node(id, 'app-session', session.label, session.active ? 'active' : 'seen', {
      source: 'desktop_bridge',
      kind,
      role: kind,
      target: session.endpoint || null,
      endpointId: session.endpointId ? '[endpoint-hidden]' : null
    }));
    if (targetId) {
      edges.push(edge(id, targetId, kind === 'communication-app' ? 'communication route' : 'app route', 'routes-to'));
    }
  });

  for (const layer of routingLayers) {
    edges.push(edge('game', `companion-${layer.key}`, 'routes through', 'routes-to'));
    if (outputDevices.length) edges.push(edge(`companion-${layer.key}`, 'output-0', 'output bus', 'routes-to'));
  }

  for (const layer of processingLayers) {
    edges.push(edge(outputDevices.length ? 'output-0' : 'game', `companion-${layer.key}`, 'processing layer', 'processed-by'));
  }

  for (const target of applyTargets) {
    const upstream = routingLayers.find((layer) => /sonar/i.test(layer.name)) || routingLayers[0];
    if (upstream) {
      edges.push(edge(`companion-${upstream.key}`, `companion-${target.key}`, 'APO attachment after virtual route', 'processed-by'));
    } else {
      edges.push(edge('game', `companion-${target.key}`, 'EQ target', 'processed-by'));
    }
    if (outputDevices.length) edges.push(edge(`companion-${target.key}`, 'output-0', 'APO filters', 'routes-to'));
  }

  const summary = {
    inputs: inputDevices.length,
    outputs: outputDevices.length,
    companions: companions.length,
    applyTargets: applyTargets.length,
    routingLayers: routingLayers.length,
    processingLayers: processingLayers.length,
    defaults: Object.values(defaults).filter(Boolean).length,
    sessions: sessions.length,
    physicalInputs: nodes.filter((item) => item.kind === 'physical-input').length,
    physicalOutputs: nodes.filter((item) => item.kind === 'physical-output').length,
    virtualEndpoints: nodes.filter((item) => item.kind === 'virtual-mixer').length,
    effectLayers: nodes.filter((item) => item.kind === 'system-effect' || item.kind === 'apo-layer').length,
    communicationApps: nodes.filter((item) => item.kind === 'communication-app').length,
    desktopBridge: Boolean(bridgeReport),
    browserDevices: browserDevices.length
  };

  return {
    schema: 'cueforge.audio-chain-graph.v2',
    nodes,
    edges,
    summary
  };
}
