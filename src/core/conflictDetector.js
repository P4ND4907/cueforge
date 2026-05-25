import { safetyRuleId } from './safetyRules.js';

const spatialLayerNames = ['Windows Sonic', 'Dolby Atmos', 'Razer THX', 'Nahimic', 'HeSuVi'];

function conflict(id, severity, title, detail, fix, ruleId) {
  return { id, severity, title, detail, fix, ruleId };
}

function companionName(item) {
  return String(item?.name || item?.label || item || '').trim();
}

function isSpatialLayer(item) {
  const name = companionName(item).toLowerCase();
  return spatialLayerNames.some((layer) => {
    const text = layer.toLowerCase();
    if (name.includes(text)) return true;
    if (text === 'dolby atmos') return name.includes('dolby') || name.includes('atmos');
    if (text === 'razer thx') return name.includes('razer') || name.includes('thx');
    if (text === 'windows sonic') return name.includes('windows sonic') || name.includes('sonic');
    return false;
  });
}

export const conflictRules = [
  {
    id: 'multiple_spatial_layers',
    severity: 'high',
    when: ({ chain }) =>
      (chain?.activeCompanions || []).filter((x) => isSpatialLayer(x)).length > 1,
    message: 'Multiple spatial layers are active. Direction cues may smear or double-process.',
    fix: 'Use only one spatial layer during testing.'
  },
  {
    id: 'sonar_plus_apo_uncertain_target',
    severity: 'medium',
    when: ({ chain }) => Boolean(chain?.sonarDetected && chain?.apoDetected),
    message: 'Sonar and Equalizer APO are both detected. APO may be installed on the wrong endpoint.',
    fix: 'Run endpoint check and confirm APO is applied to the device actually carrying game audio.'
  },
  {
    id: 'voicemeeter_route_complexity',
    severity: 'medium',
    when: ({ chain }) => Boolean(chain?.voicemeeterDetected),
    message: 'Voicemeeter can make routing powerful but harder to verify.',
    fix: 'Use Chain Graph to confirm Game -> Mixer -> Output path.'
  },
  {
    id: 'exclusive_mode_warning',
    severity: 'medium',
    when: ({ selectedGame }) => selectedGame?.usesExclusiveAudio === true,
    message: 'Some exclusive-mode paths may bypass system effects.',
    fix: 'Test with CueForge A/B tone and confirm changes are audible.'
  }
];

function graphNodesByType(graph, types) {
  return (graph?.nodes || []).filter((item) => types.includes(item.type));
}

function companionKey(node) {
  return String(node?.id || '').replace(/^companion-/, '');
}

function companionLabels(nodes = []) {
  return nodes.map((node) => node.label).filter(Boolean);
}

function hasCompanion(graph, key) {
  return Boolean((graph?.nodes || []).some((node) => node.id === `companion-${key}`));
}

function companionNodes(graph) {
  return graphNodesByType(graph, [
    'apply-target',
    'mixer',
    'routing',
    'spatial',
    'enhancer',
    'device-suite',
    'mic-processing',
    'driver-console'
  ]);
}

function buildRuleChain({ graph, chain = null } = {}) {
  const nodes = companionNodes(graph);
  return {
    activeCompanions: chain?.activeCompanions || nodes.map((node) => ({
      key: companionKey(node),
      name: node.label,
      type: node.type,
      group: node.meta?.group || 'unknown',
      risk: node.meta?.risk || 'unknown'
    })),
    sonarDetected: chain?.sonarDetected ?? hasCompanion(graph, 'steelSeriesSonar'),
    apoDetected: chain?.apoDetected ?? (hasCompanion(graph, 'equalizerApo') || hasCompanion(graph, 'peace')),
    voicemeeterDetected: chain?.voicemeeterDetected ?? hasCompanion(graph, 'voicemeeter'),
    vbCableDetected: chain?.vbCableDetected ?? hasCompanion(graph, 'vbCable'),
    peaceDetected: chain?.peaceDetected ?? hasCompanion(graph, 'peace')
  };
}

function titleFromMessage(message = '') {
  return String(message).split('.')[0] || 'Audio conflict detected';
}

export function evaluateConflictRules({ chain = {}, selectedGame = {} } = {}) {
  return conflictRules
    .filter((rule) => {
      try {
        return rule.when({ chain, selectedGame });
      } catch {
        return false;
      }
    })
    .map((rule) => conflict(
      rule.id,
      rule.severity,
      titleFromMessage(rule.message),
      rule.message,
      rule.fix,
      'one-processing-layer'
    ));
}

function firstLabel(graph, type) {
  return String(graph?.nodes?.find((node) => node.type === type)?.label || '').trim();
}

function uniqueProcessingLayers(nodes = []) {
  const families = new Map();

  nodes.forEach((node) => {
    const family = node.meta?.group === 'system-eq'
      ? 'system-eq'
      : node.meta?.group || companionKey(node) || node.label;
    const label = family === 'system-eq'
      ? 'Equalizer APO / Peace'
      : node.label;

    if (!families.has(family)) {
      families.set(family, {
        family,
        label,
        type: node.type,
        risk: node.meta?.risk || 'unknown'
      });
    }
  });

  return [...families.values()];
}

function outputShapingLayers(graph) {
  return uniqueProcessingLayers(graphNodesByType(graph, [
    'apply-target',
    'mixer',
    'spatial',
    'enhancer',
    'device-suite',
    'driver-console'
  ]));
}

function routeLayers(graph) {
  return graphNodesByType(graph, ['mixer', 'routing']);
}

function micProcessingLayers(graph) {
  return graphNodesByType(graph, ['mic-processing', 'mixer', 'routing', 'device-suite']);
}

function likelyApoBypassRisk(graph) {
  const apoDetected = hasCompanion(graph, 'equalizerApo') || hasCompanion(graph, 'peace');
  if (!apoDetected) return false;

  const outputLabel = firstLabel(graph, 'output').toLowerCase();
  const routes = routeLayers(graph);
  const sonarActive = hasCompanion(graph, 'steelSeriesSonar');
  const virtualRouteActive = routes.some((node) => ['routing', 'mixer'].includes(node.type));

  if (sonarActive && !outputLabel.includes('sonar')) return true;
  if (virtualRouteActive && !routes.some((node) => outputLabel.includes(String(node.label || '').toLowerCase()))) return true;

  return false;
}

function buildAudioDoctor({ graph, conflicts }) {
  const layers = outputShapingLayers(graph);
  const routes = routeLayers(graph);
  const micLayers = micProcessingLayers(graph);
  const layerCount = layers.length;
  const likelyApoBypass = likelyApoBypassRisk(graph);
  const high = conflicts.filter((item) => item.severity === 'high').length;
  const medium = conflicts.filter((item) => item.severity === 'medium').length;
  const status = high > 0 ? 'needs-fix' : medium > 0 ? 'review' : 'ready';
  const topFixes = [...new Set(conflicts.map((item) => item.fix).filter(Boolean))].slice(0, 3);

  let headline = 'Audio chain looks simple enough to test.';
  let summary = 'Run one before/after match check before trusting the profile.';

  if (layerCount >= 3) {
    headline = `You have ${layerCount} layers trying to shape sound.`;
    summary = 'This can make footsteps worse, not better. Test one processing layer at a time before judging CueForge tuning.';
  } else if (likelyApoBypass) {
    headline = 'APO is detected, but the active path may bypass it.';
    summary = 'The profile may export correctly while the game audio is actually routed through Sonar, a virtual device, or another endpoint.';
  } else if (routes.length) {
    headline = 'Routing is present, so prove the exact path.';
    summary = 'Virtual mixers are useful, but the game, Discord, stream, and recording paths need one clean map.';
  } else if (micLayers.length > 1) {
    headline = 'Mic processing needs a quick cleanup pass.';
    summary = 'Stacked filters can make comms gate, clip, delay, or sound robotic.';
  }

  return {
    status,
    headline,
    summary,
    layerCount,
    layers: layers.map((item) => item.label),
    routeLayers: companionLabels(routes),
    micLayers: companionLabels(micLayers),
    likelyApoBypass,
    topFixes
  };
}

function hasConflict(conflicts, ids) {
  return conflicts.some((item) => ids.includes(item.id));
}

function spatialDetected(graph, chain) {
  return Boolean(
    companionNodes(graph).some((node) => node.type === 'spatial') ||
    (chain?.activeCompanions || []).some((item) => isSpatialLayer(item))
  );
}

function buildAudioChainHealth({ graph, chain, conflicts }) {
  const blockers = conflicts
    .filter((item) => item.severity === 'high')
    .filter((item) => [
      'multiple_spatial_layers',
      'game-chat-route-unclear',
      'routing-stack',
      'double-processing',
      'no-output'
    ].includes(item.id))
    .map((item) => item.title);
  const warnings = [];
  const hasSonarApo = hasConflict(conflicts, ['sonar_plus_apo_uncertain_target', 'apo-may-not-touch-active-path']);

  if (hasSonarApo) {
    warnings.push('Sonar + APO detected. Confirm target endpoint.');
  }

  if (hasConflict(conflicts, ['multiple_spatial_layers'])) {
    warnings.push('Multiple spatial layers detected. Use one during testing.');
  } else if (!spatialDetected(graph, chain) && (graph?.summary?.outputs || 0) > 0) {
    warnings.push('Spatial layer unknown. Run output check.');
  }

  if (hasConflict(conflicts, ['voicemeeter_route_complexity', 'game-chat-route-unclear', 'routing-stack'])) {
    warnings.push('Routing layer detected. Confirm game, chat, and output path.');
  }

  if (!graph?.summary?.desktopBridge) {
    warnings.push('Desktop scan missing. Native layers may be hidden.');
  }

  if (!graph?.summary?.applyTargets) {
    warnings.push('No APO/Peace apply target detected. Export mode only.');
  }

  const cleanWarnings = [...new Set(warnings)].slice(0, 4);
  const score = Math.max(0, Math.min(100, 100 - blockers.length * 24 - cleanWarnings.length * 14));
  const nextAction = hasSonarApo
    ? 'Run "Confirm APO Path" test.'
    : cleanWarnings.some((item) => item.includes('Spatial layer'))
      ? 'Run output check.'
      : blockers.length
        ? `Fix blocker: ${blockers[0]}.`
        : 'Run one real match A/B check.';

  return {
    label: 'Audio Chain Health',
    score,
    blockers,
    warnings: cleanWarnings,
    nextAction
  };
}

export function detectAudioConflicts({
  graph,
  chain = null,
  selectedGame = null,
  eq = [],
  hearing = null,
  betaCheckins = [],
  bridgeReport = null
} = {}) {
  const summary = graph?.summary || {};
  const conflicts = [];
  const rule = safetyRuleId;
  const trebleLift = Math.max(Number(eq[7]) || 0, Number(eq[8]) || 0, Number(eq[9]) || 0);
  const hearingAnswered = Number(hearing?.score?.answered || hearing?.answered || 0);
  const shapers = outputShapingLayers(graph);
  const routes = routeLayers(graph);
  const micLayers = micProcessingLayers(graph);
  const apoBypassRisk = likelyApoBypassRisk(graph);
  const ruleChain = buildRuleChain({ graph, chain });

  conflicts.push(...evaluateConflictRules({ chain: ruleChain, selectedGame: selectedGame || {} }));

  if (!summary.desktopBridge) {
    conflicts.push(conflict(
      'desktop-bridge-missing',
      'medium',
      'Desktop scan missing',
      'Browser scan is useful, but it cannot reliably map installed enhancers, routing layers, or Windows apply targets.',
      'Use the desktop build or import a Windows bridge report before calling the setup fully detected.',
      rule('no-silent-driver-changes')
    ));
  }

  if (!summary.inputs) {
    conflicts.push(conflict('no-input', 'high', 'No mic/input found', 'CueForge cannot verify Discord or mic behavior yet.', 'Grant mic permission or run the desktop scan.', rule('real-match-proof')));
  }

  if (!summary.outputs) {
    conflicts.push(conflict('no-output', 'high', 'No output found', 'CueForge cannot confirm the IEM/headset/DAC listening path yet.', 'Run Auto Detect or load a Windows bridge report.', rule('real-match-proof')));
  }

  if (!summary.applyTargets) {
    conflicts.push(conflict('no-apply-target', 'medium', 'No APO/Peace apply target', 'Profiles can be exported, but system-wide apply is not proven.', 'Install/attach Equalizer APO or use export-only mode.', rule('no-silent-driver-changes')));
  }

  if (shapers.length >= 3) {
    conflicts.push(conflict(
      'too-many-sound-shapers',
      shapers.length >= 4 ? 'high' : 'medium',
      `${shapers.length} layers are trying to shape sound`,
      `${shapers.map((item) => item.label).join(' / ')} can stack EQ, spatial, device-suite, or mixer changes before CueForge can judge the real signal.`,
      'Turn off extra enhancers and test one main processing layer at a time.',
      rule('one-processing-layer')
    ));
  }

  if (apoBypassRisk) {
    conflicts.push(conflict(
      'apo-may-not-touch-active-path',
      'medium',
      'APO may not affect the active game path',
      'Equalizer APO/Peace is detected, but a virtual mixer or non-APO endpoint may be receiving the rendered game audio.',
      'Apply APO to the active Sonar/virtual output, disable that routing, or test with direct Windows output before trusting the curve.',
      rule('no-silent-driver-changes')
    ));
  }

  if (routes.length > 1) {
    conflicts.push(conflict(
      'game-chat-route-unclear',
      'high',
      'Game, chat, and stream routing are unclear',
      `${routes.map((item) => item.label).join(' / ')} can split the sound path so CueForge analyzes one device while you hear another.`,
      'Write down the exact Windows output/input plus Discord, game chat, and OBS devices, then retest.',
      rule('one-processing-layer')
    ));
  }

  if (micLayers.length >= 3) {
    conflicts.push(conflict(
      'mic-filter-stack',
      'medium',
      'Too many layers are touching the mic',
      `${micLayers.map((item) => item.label).join(' / ')} can gate, clip, delay, or robotize voice before teammates hear it.`,
      'Pick one mic cleanup path, run Mic Lab, then ask for one teammate check.',
      rule('one-processing-layer')
    ));
  }

  if (summary.routingLayers > 1) {
    conflicts.push(conflict('routing-stack', 'high', 'Routing stack is too layered', 'Multiple virtual mixers/routing tools can hide the real game, chat, and recording paths.', 'Pick one routing path and verify Windows output, Discord output, and game output.', rule('one-processing-layer')));
  }

  if (summary.processingLayers > 1) {
    conflicts.push(conflict('double-processing', 'high', 'Double processing risk', 'Multiple enhancers/spatial/device suites can smear direction and invalidate match tests.', 'Disable extra processing and test one primary layer at a time.', rule('one-processing-layer')));
  }

  if (trebleLift >= 3 && hearingAnswered < 4) {
    conflicts.push(conflict('treble-without-hearing', 'medium', 'Treble boost needs hearing proof', 'The current profile lifts cue/treble bands before enough hearing-model answers exist.', 'Run at least four Hearing Model tone checks before trusting aggressive 4k-16k lift.', rule('hearing-before-aggressive-treble')));
  }

  if (!Array.isArray(betaCheckins) || betaCheckins.length < 2) {
    conflicts.push(conflict('match-proof-missing', 'medium', 'Real match proof missing', 'The setup has not been checked before and after a real match yet.', 'Run Beta Check-in before and after one match and save the packet.', rule('real-match-proof')));
  }

  if (bridgeReport?.runningGames?.length && conflicts.some((item) => item.severity === 'high')) {
    conflicts.push(conflict('live-game-high-risk', 'high', 'High-risk changes while game is running', 'A game appears to be running while high-risk chain conflicts exist.', 'Save the current setup first and avoid aggressive tuning mid-match.', rule('no-silent-driver-changes')));
  }

  const high = conflicts.filter((item) => item.severity === 'high').length;
  const medium = conflicts.filter((item) => item.severity === 'medium').length;
  const audioDoctor = buildAudioDoctor({ graph, conflicts });
  const chainHealth = buildAudioChainHealth({ graph, chain: ruleChain, conflicts });

  return {
    schema: 'cueforge.conflict-report.v2',
    conflicts,
    audioDoctor,
    chainHealth,
    summary: {
      high,
      medium,
      total: conflicts.length,
      doctorStatus: audioDoctor.status,
      chainHealthScore: chainHealth.score,
      shapingLayers: audioDoctor.layerCount,
      likelyApoBypass: audioDoctor.likelyApoBypass
    },
    clearToApply: conflicts.length === 0
  };
}
