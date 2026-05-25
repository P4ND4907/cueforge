function gate(id, label, ready, weight, fix, detail = '') {
  return {
    id,
    label,
    ready: Boolean(ready),
    weight,
    status: ready ? 'pass' : 'needed',
    fix,
    detail
  };
}

function uniqueActions(actions = []) {
  return [...new Set(actions)].slice(0, 5);
}

function readinessTier(score) {
  return score >= 90
    ? 'match_ready'
    : score >= 75
      ? 'ready_with_warnings'
      : score >= 60
        ? 'usable'
        : score >= 40
          ? 'needs_work'
          : 'not_ready';
}

function statusFromTier(tier) {
  return {
    match_ready: 'player-test-ready',
    ready_with_warnings: 'ready-with-minor-warnings',
    usable: 'usable-chain-uncertain',
    needs_work: 'not-reliable-yet',
    not_ready: 'broken-or-untested'
  }[tier] || 'broken-or-untested';
}

export function calculateReadinessScore(state = {}) {
  let score = 0;
  const blockers = [];
  const warnings = [];
  const nextActions = [];

  if (state.devices?.output) score += 15;
  else {
    blockers.push('No output device confirmed.');
    nextActions.push('Run Auto Detect.');
  }

  if (state.calibration?.micCheck?.ready) score += 15;
  else {
    warnings.push('Mic readiness not confirmed.');
    nextActions.push('Run Mic Lab.');
  }

  if (state.calibration?.channelCheck?.passed) score += 15;
  else {
    warnings.push('Left/right/center output check incomplete.');
    nextActions.push('Run channel check.');
  }

  if (state.calibration?.hearingModel?.complete) score += 10;
  else nextActions.push('Complete Hearing Model.');

  if (state.calibration?.blindMatch?.complete) score += 10;
  else nextActions.push('Run Blind Match.');

  if (state.calibration?.maskingLab?.complete) score += 10;
  else nextActions.push('Run Masking Lab.');

  const severeConflicts = state.chain?.risks?.filter((risk) => risk.severity === 'high') ?? [];
  if (severeConflicts.length === 0) score += 15;
  else {
    blockers.push('High-risk audio chain conflict detected.');
    nextActions.push('Open Conflict Fix Panel.');
  }

  if (state.exports?.apoConfig || state.exports?.engineManifest) score += 10;
  else nextActions.push('Generate export pack.');

  const clamped = Math.max(0, Math.min(100, score));

  return {
    score: clamped,
    tier: readinessTier(clamped),
    blockers,
    warnings,
    nextActions: uniqueActions(nextActions)
  };
}

function hearingComplete(hearing) {
  const answered = Number(hearing?.score?.answered || hearing?.answered || 0);
  if (answered >= 4) return true;
  if (hearing?.complete) return true;
  return typeof hearing?.score === 'number' && hearing.score > 0;
}

function firstNodeLabel(graph, type) {
  return graph?.nodes?.find((node) => node.type === type)?.label || null;
}

function legacyGate(id, label, ready, weight, fix, detail = '') {
  return gate(id, label, ready, weight, fix, detail);
}

export function computeReadinessScoreV2({
  graph,
  conflicts,
  profile = null,
  hearing = null,
  exportReady = false,
  selfTests = [],
  betaCheckins = [],
  permissionState = 'unknown'
} = {}) {
  const summary = graph?.summary || {};
  const conflictSummary = conflicts?.summary || { high: 0, medium: 0 };
  const selfTestReady = Array.isArray(selfTests) && selfTests.length > 0 && !selfTests.some((item) => item.status === 'fail');
  const matchProofReady = Array.isArray(betaCheckins) && betaCheckins.length >= 2;
  const profileReady = Boolean(profile?.recommendation?.id || profile?.profile?.id || profile?.id);
  const micPermissionBlocked = ['denied', 'blocked'].includes(String(permissionState || '').toLowerCase());
  const readinessState = {
    devices: {
      output: firstNodeLabel(graph, 'output') || (summary.outputs > 0 ? 'detected-output' : null),
      input: firstNodeLabel(graph, 'input') || (summary.inputs > 0 ? 'detected-input' : null)
    },
    calibration: {
      micCheck: { ready: summary.inputs > 0 && selfTestReady && !micPermissionBlocked },
      channelCheck: { passed: summary.outputs > 0 && selfTestReady },
      hearingModel: { complete: hearingComplete(hearing) },
      blindMatch: { complete: matchProofReady },
      maskingLab: { complete: profileReady }
    },
    chain: {
      risks: conflicts?.conflicts || []
    },
    exports: {
      apoConfig: exportReady ? 'ready' : null,
      engineManifest: null
    }
  };
  const result = calculateReadinessScore(readinessState);
  const blockedScore = micPermissionBlocked ? Math.min(result.score, 59) : result.score;
  const blockedTier = readinessTier(blockedScore);
  const blockers = micPermissionBlocked
    ? [...new Set([...result.blockers, 'Mic permission is blocked for player testing.'])]
    : result.blockers;
  const warnings = micPermissionBlocked
    ? [...new Set([...result.warnings, 'Desktop evidence found the mic, but live capture permission is still blocked.'])]
    : result.warnings;
  const nextActions = micPermissionBlocked
    ? uniqueActions(['Grant mic permission before player testing.', ...result.nextActions])
    : result.nextActions;

  const gates = [
    legacyGate('device-detection', 'Output device confirmed', Boolean(readinessState.devices.output), 15, 'Run Auto Detect.'),
    legacyGate(
      'mic-readiness',
      'Mic readiness confirmed',
      readinessState.calibration.micCheck.ready,
      15,
      micPermissionBlocked ? 'Grant mic permission before player testing.' : 'Run Mic Lab.',
      micPermissionBlocked ? 'Desktop evidence can identify the mic, but live player testing still needs explicit mic permission.' : ''
    ),
    legacyGate('channel-check', 'Output/channel check passed', readinessState.calibration.channelCheck.passed, 15, 'Run channel check.'),
    legacyGate('hearing-model', 'Hearing Model complete', readinessState.calibration.hearingModel.complete, 10, 'Complete Hearing Model.'),
    legacyGate('blind-match', 'Blind Match complete', readinessState.calibration.blindMatch.complete, 10, 'Run Blind Match.'),
    legacyGate('masking-lab', 'Masking Lab complete', readinessState.calibration.maskingLab.complete, 10, 'Run Masking Lab.'),
    legacyGate('conflicts', 'No high-risk conflicts', conflictSummary.high === 0, 15, 'Open Conflict Fix Panel.'),
    legacyGate('export-report', 'Export/report ready', Boolean(readinessState.exports.apoConfig || readinessState.exports.engineManifest), 10, 'Generate export pack.')
  ];

  return {
    schema: 'cueforge.readiness.v2',
    score: blockedScore,
    tier: blockedTier,
    status: micPermissionBlocked ? 'blocked-mic-permission' : statusFromTier(blockedTier),
    gates,
    blockers,
    warnings,
    nextActions,
    proof: {
      exportReady: Boolean(exportReady),
      matchProofReady,
      selfTestReady,
      conflictSummary,
      micPermissionBlocked,
      model: 'device/mic/channel/hearing/blind-match/masking/conflict/export'
    }
  };
}
