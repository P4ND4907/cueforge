export const commandCenterFlow = [
  { id: 'start', label: 'Start', route: 'dashboard', group: 'start' },
  { id: 'setup-command-center', label: 'Setup Command Center', route: 'dashboard', group: 'setup' },
  { id: 'auto-detect', label: 'Auto Detect', route: 'detect', group: 'setup' },
  { id: 'chain-graph', label: 'Chain Graph', route: 'dashboard', group: 'setup' },
  { id: 'conflict-fix', label: 'Conflict Fix', route: 'detect', group: 'setup' },
  { id: 'output-check', label: 'Output Check', route: 'selftest', group: 'checks' },
  { id: 'mic-check', label: 'Mic Check', route: 'mic', group: 'checks' },
  { id: 'hearing-model', label: 'Hearing Model', route: 'hearing', group: 'personalize' },
  { id: 'choose-game', label: 'Choose Game / Genre', route: 'games', group: 'personalize' },
  { id: 'blind-match', label: 'Blind Match', route: 'blindmatch', group: 'personalize' },
  { id: 'masking-lab', label: 'Masking Lab', route: 'masking', group: 'personalize' },
  { id: 'profile-recommendation', label: 'Profile Recommendation', route: 'dashboard', group: 'recommend' },
  { id: 'engine-preview', label: 'Engine Preview', route: 'dashboard', group: 'recommend' },
  { id: 'export-apply', label: 'Export / Apply', route: 'export', group: 'ship' },
  { id: 'player-trial', label: 'Player Trial', route: 'trial', group: 'ship' },
  { id: 'report-audio-dna', label: 'Report / Audio DNA', route: 'reports', group: 'ship' }
];

function humanStatus(status = '') {
  return String(status || 'needs-foundation')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function gateReady(readiness, id) {
  return Boolean((readiness?.gates || []).find((gate) => gate.id === id)?.ready);
}

function firstUsefulWarning(state = {}) {
  return (
    state.conflicts?.chainHealth?.warnings?.[0] ||
    state.conflicts?.chainHealth?.blockers?.[0] ||
    state.readiness?.warnings?.[0] ||
    state.conflicts?.conflicts?.[0]?.title ||
    'No major warning yet.'
  );
}

function nextBestAction(state = {}) {
  return (
    state.conflicts?.chainHealth?.nextAction ||
    state.readiness?.nextActions?.[0] ||
    'Run Auto Detect.'
  );
}

function profileLabel(state = {}) {
  return (
    state.profile?.recommendation?.label ||
    state.stateV2?.recommendedProfile?.id?.replace(/[-_]+/g, ' ') ||
    'Build profile'
  );
}

function activeProfileValue(state = {}) {
  const label = profileLabel(state);
  const hasProfile = Boolean(state.profile?.recommendation?.id || state.stateV2?.recommendedProfile?.id);
  return hasProfile ? `${label} - personalized` : label;
}

function chainLabel(state = {}) {
  const summary = state.chainGraph?.summary || {};
  const inputs = Number(summary.inputs || 0);
  const outputs = Number(summary.outputs || 0);
  const companions = Number(summary.companions || 0);
  return `${outputs} output${outputs === 1 ? '' : 's'} / ${inputs} input${inputs === 1 ? '' : 's'} / ${companions} layer${companions === 1 ? '' : 's'}`;
}

function graphNodesByType(graph, types = []) {
  return (graph?.nodes || []).filter((node) => types.includes(node.type));
}

function firstGraphLabel(graph, type, fallback = 'Unknown') {
  return graph?.nodes?.find((node) => node.type === type)?.label || fallback;
}

function companionLabels(state = {}) {
  const companionTypes = ['apply-target', 'mixer', 'routing', 'spatial', 'enhancer', 'device-suite', 'mic-processing', 'driver-console'];
  const graphLabels = graphNodesByType(state.chainGraph, companionTypes).map((node) => node.label);
  const stateLabels = state.stateV2?.chain?.activeCompanions || [];
  const reportLabels = Object.values(state.autoDetectReport?.companions || {})
    .filter((item) => item?.detected === true)
    .map((item) => item.label);

  return [...new Set([...graphLabels, ...stateLabels, ...reportLabels].filter(Boolean))];
}

function compactList(items = [], fallback = 'None detected yet') {
  if (!items.length) return fallback;
  const shown = items.slice(0, 3).join(' / ');
  return items.length > 3 ? `${shown} +${items.length - 3} more` : shown;
}

function evidenceMode(state = {}) {
  const source = state.autoDetectReport?.source || '';
  if (source.includes('desktop') || state.chainGraph?.summary?.desktopBridge) {
    return 'Desktop + browser evidence';
  }
  if (source.includes('browser') || state.chainGraph?.summary?.browserDevices) {
    return 'Browser-only partial evidence';
  }
  return 'No scan loaded yet';
}

function activeRouteSummary(state = {}) {
  const graph = state.chainGraph || {};
  const output = firstGraphLabel(graph, 'output', state.stateV2?.devices?.output || 'Output not confirmed');
  const input = firstGraphLabel(graph, 'input', state.stateV2?.devices?.input || 'Input not confirmed');
  const outputLayers = graphNodesByType(graph, ['apply-target', 'mixer', 'routing', 'spatial', 'enhancer', 'device-suite'])
    .map((node) => node.label)
    .filter(Boolean);
  const micLayers = graphNodesByType(graph, ['mic-processing', 'mixer', 'routing', 'device-suite'])
    .map((node) => node.label)
    .filter(Boolean);
  const outputPath = state.chainGraph?.outputPath?.map((item) => item.label).filter(Boolean);
  const inputPath = state.chainGraph?.inputPath?.map((item) => item.label).filter(Boolean);

  return {
    value: outputLayers.length ? `${compactList(outputLayers)} -> ${output}` : output,
    detail: outputPath?.length
      ? outputPath.slice(0, 5).join(' -> ')
      : `Game -> ${outputLayers.length ? `${compactList(outputLayers)} -> ` : ''}${output}. Mic -> ${micLayers.length ? `${compactList(micLayers)} -> ` : ''}${input}.`
  };
}

function conflictSummary(state = {}) {
  const chainHealth = state.conflicts?.chainHealth || {};
  const conflicts = state.conflicts?.conflicts || [];
  const blockers = chainHealth.blockers?.length || conflicts.filter((item) => item.severity === 'high').length || 0;
  const warnings = chainHealth.warnings?.length || conflicts.filter((item) => item.severity === 'medium').length || 0;
  const top = chainHealth.warnings?.[0] || chainHealth.blockers?.[0] || conflicts[0]?.title || 'No conflict found yet. Prove it with Auto Detect.';

  return {
    blockers,
    warnings,
    value: `${blockers} blocker${blockers === 1 ? '' : 's'} / ${warnings} warning${warnings === 1 ? '' : 's'}`,
    detail: top
  };
}

function testReplaySummary(state = {}, context = {}) {
  const gates = state.readiness?.gates || [];
  const passed = gates.filter((gate) => gate.ready || gate.status === 'pass').length;
  const failed = gates.filter((gate) => gate.status === 'fail').length;
  const needed = Math.max(0, gates.length - passed - failed);
  const firstNeeded = gates.find((gate) => !(gate.ready || gate.status === 'pass'))?.fix;
  const reportReady = Boolean(context.lastReport || context.latestDna || state.stateV2?.exports?.reportPack);

  if (!gates.length) {
    return {
      value: reportReady ? 'Report replay ready' : 'No test gates yet',
      detail: reportReady ? 'A report or Audio DNA packet can replay this setup.' : 'Run Self Test to create the first proof gates.'
    };
  }

  return {
    value: `${passed}/${gates.length} passed / ${failed} failed / ${needed} replay`,
    detail: failed
      ? 'Fix failed checks before player testing.'
      : firstNeeded || (reportReady ? 'Replay-safe report is ready.' : 'Export a report after the next player trial.')
  };
}

function buildOperatingQuestions(state = {}, context = {}) {
  const route = activeRouteSummary(state);
  const conflict = conflictSummary(state);
  const tests = testReplaySummary(state, context);
  const nextAction = nextBestAction(state);
  const companions = companionLabels(state);

  return [
    {
      id: 'hardware-software',
      question: 'What hardware and software are present?',
      value: chainLabel(state),
      detail: `${evidenceMode(state)}. Layers: ${compactList(companions)}.`,
      route: 'detect'
    },
    {
      id: 'active-route',
      question: 'What route is active right now?',
      value: route.value,
      detail: route.detail,
      route: 'detect'
    },
    {
      id: 'chain-conflicts',
      question: 'What is conflicting or redundant?',
      value: conflict.value,
      detail: conflict.detail,
      route: 'detect'
    },
    {
      id: 'tests-replay',
      question: 'What tests passed, failed, or need replay?',
      value: tests.value,
      detail: tests.detail,
      route: 'selftest'
    },
    {
      id: 'safest-next-step',
      question: 'What is the safest next step?',
      value: nextAction,
      detail: 'Do this before adding more tuning or changing the audio stack.',
      route: routeForAction(nextAction)
    }
  ];
}

function lastMatchSummary({ lastTrial, betaCheckins = [] } = {}) {
  if (lastTrial?.feedback?.score) {
    return {
      value: `${lastTrial.feedback.score}/100`,
      detail: humanStatus(lastTrial.feedback.status || 'player feedback saved')
    };
  }

  if (Array.isArray(betaCheckins) && betaCheckins.length) {
    return {
      value: `${betaCheckins.length} check-in${betaCheckins.length === 1 ? '' : 's'}`,
      detail: 'Use Player Trial next to score before/after feel.'
    };
  }

  return {
    value: 'No match yet',
    detail: 'Run Player Trial after setup and tuning.'
  };
}

function exportApplySummary(state = {}) {
  const applyPath = state.applyPath || {};
  const mode = applyPath.mode || 'export-only';
  return {
    value: humanStatus(mode),
    detail: applyPath.reason || 'No native apply step runs silently.'
  };
}

function stepStatus(step, state = {}, context = {}) {
  const summary = state.chainGraph?.summary || {};
  const highConflicts = Number(state.conflicts?.summary?.high || 0);
  const hasProfile = Boolean(state.profile?.recommendation?.id || state.stateV2?.recommendedProfile?.id);
  const hasEngine = Boolean(state.engine);
  const hasExport = Boolean(state.applyPath || state.stateV2?.exports?.apoConfig || state.stateV2?.exports?.engineManifest);
  const hasTrial = Boolean(context.lastTrial?.feedback?.score || context.betaCheckins?.length);
  const hasReportOrDna = Boolean(context.lastReport || context.latestDna);

  const readyMap = {
    start: true,
    'setup-command-center': true,
    'auto-detect': Number(summary.inputs || 0) > 0 || Number(summary.outputs || 0) > 0,
    'chain-graph': Number(summary.inputs || 0) > 0 || Number(summary.outputs || 0) > 0 || Number(summary.companions || 0) > 0,
    'conflict-fix': highConflicts === 0,
    'output-check': gateReady(state.readiness, 'channel-check'),
    'mic-check': gateReady(state.readiness, 'mic-readiness'),
    'hearing-model': gateReady(state.readiness, 'hearing-model'),
    'choose-game': Boolean(state.stateV2?.selectedGame?.title || state.profile?.recommendation?.game),
    'blind-match': gateReady(state.readiness, 'blind-match'),
    'masking-lab': gateReady(state.readiness, 'masking-lab'),
    'profile-recommendation': hasProfile,
    'engine-preview': hasEngine,
    'export-apply': hasExport,
    'player-trial': hasTrial,
    'report-audio-dna': hasReportOrDna
  };

  if (readyMap[step.id]) return 'done';
  if (step.id === 'conflict-fix' && highConflicts > 0) return 'blocked';
  if (['output-check', 'mic-check', 'hearing-model', 'blind-match', 'masking-lab', 'player-trial'].includes(step.id)) return 'next';
  return 'todo';
}

export function buildCommandCenterSummary(state = {}, context = {}) {
  const readiness = state.readiness || {};
  const score = Number(readiness.score || 0);
  const status = humanStatus(readiness.status || readiness.tier || 'needs-foundation');
  const warning = firstUsefulWarning(state);
  const nextAction = nextBestAction(state);
  const match = lastMatchSummary(context);
  const exportApply = exportApplySummary(state);

  return {
    setupHealth: {
      score,
      status,
      copy: `CueForge Setup Health: ${score}/100`
    },
    currentMode: activeProfileValue(state),
    mainWarning: warning,
    nextBestAction: nextAction,
    operatingQuestions: buildOperatingQuestions(state, context),
    cards: [
      {
        id: 'setup-health',
        label: 'Setup Health',
        value: `${score}/100`,
        detail: `Status: ${status}`,
        route: 'detect'
      },
      {
        id: 'active-profile',
        label: 'Active Profile',
        value: activeProfileValue(state),
        detail: state.profile?.recommendation?.explanation || 'Personalized profile appears here after setup.',
        route: 'dashboard'
      },
      {
        id: 'audio-chain',
        label: 'Audio Chain',
        value: chainLabel(state),
        detail: warning,
        route: 'detect'
      },
      {
        id: 'next-best-action',
        label: 'Next Best Action',
        value: nextAction,
        detail: 'Follow this before changing more settings.',
        route: routeForAction(nextAction)
      },
      {
        id: 'last-match-feedback',
        label: 'Last Match Feedback',
        value: match.value,
        detail: match.detail,
        route: 'trial'
      },
      {
        id: 'export-apply-status',
        label: 'Export / Apply Status',
        value: exportApply.value,
        detail: exportApply.detail,
        route: 'export'
      }
    ],
    flow: commandCenterFlow.map((step) => ({
      ...step,
      status: stepStatus(step, state, context)
    }))
  };
}

export function routeForAction(action = '') {
  const text = String(action).toLowerCase();
  if (text.includes('apo') || text.includes('endpoint') || text.includes('chain') || text.includes('detect')) return 'detect';
  if (text.includes('mic')) return 'mic';
  if (text.includes('hearing')) return 'hearing';
  if (text.includes('blind')) return 'blindmatch';
  if (text.includes('masking')) return 'masking';
  if (text.includes('export')) return 'export';
  if (text.includes('match') || text.includes('trial')) return 'trial';
  if (text.includes('channel') || text.includes('output')) return 'selftest';
  return 'detect';
}
