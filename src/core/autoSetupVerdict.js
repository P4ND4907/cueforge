import { buildWasapiLoopbackProof, summarizeWasapiLoopbackProof } from './wasapiLoopbackProof.js';

export const AUTO_SETUP_VERDICT_SCHEMA = 'cueforge.auto-setup-verdict.v1';

const UNSAFE_CONFLICT_IDS = new Set([
  'stream-clipping-risk',
  'missing-stream-limiter',
  'stream_clipping_risk',
  'missing_stream_limiter',
  'double-processing',
  'double_processing',
  'multiple_spatial_layers',
  'routing-stack',
  'game-chat-route-unclear',
  'live-game-high-risk',
  'too-many-sound-shapers',
  'bass-masking-footsteps',
  'latency-budget-fail'
]);

function list(value) {
  return Array.isArray(value) ? value : [];
}

function clean(value, fallback = '') {
  const text = String(value || fallback)
    .replace(/[A-Z]:\\(?:[^\\\s]+\\)*[^\\\s]*/gi, '[path-hidden]')
    .replace(/\b(?:device|group|instance|container|serial|pnp|machine|endpoint)[-_ ]?id[:=]?\s*[a-z0-9\\&{}.-]+/gi, '[id-hidden]')
    .replace(/\s+/g, ' ')
    .trim();
  return text || fallback;
}

function confidenceFrom(report = {}, fallback = 0) {
  const score = Number(report.confidence?.score ?? fallback);
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function devicesFrom(report = {}) {
  const devices = report.devices || {};
  const outputs = [
    ...list(devices.windowsRenderDevices),
    ...list(devices.browserOutputs),
    ...list(devices.browserRenderDevices)
  ];
  const inputs = [
    ...list(devices.windowsCaptureDevices),
    ...list(devices.browserInputs),
    ...list(devices.browserCaptureDevices)
  ];
  return { outputs, inputs };
}

function firstLabel(items = [], fallback) {
  return clean(items.find((item) => item?.label || item?.name || item?.Name)?.label ||
    items.find((item) => item?.label || item?.name || item?.Name)?.name ||
    items.find((item) => item?.label || item?.name || item?.Name)?.Name,
  fallback);
}

function detectedCompanionLabels(report = {}) {
  return Object.values(report.companions || {})
    .filter((item) => item?.detected === true)
    .map((item) => clean(item.label, 'Audio layer'))
    .filter(Boolean);
}

function desktopEvidence(report = {}, desktopReady = false) {
  const source = String(report.source || '');
  return Boolean(desktopReady || source.includes('desktop') || source.includes('bridge') || report.mode === 'desktop-assisted');
}

function browserOnly(report = {}, desktopReady = false) {
  return !desktopEvidence(report, desktopReady);
}

function conflictItems(conflicts = {}) {
  return list(conflicts.conflicts).map((item) => ({
    id: clean(item.id, 'conflict'),
    severity: clean(item.severity, 'medium'),
    title: clean(item.title || item.detail || item.id, 'Audio conflict')
  }));
}

function unsafeConflictIds(conflicts = {}) {
  const highCount = Number(conflicts.summary?.high || 0);
  const ids = conflictItems(conflicts)
    .filter((item) => item.severity === 'high' || UNSAFE_CONFLICT_IDS.has(item.id))
    .map((item) => item.id);
  const blockers = list(conflicts.chainHealth?.blockers);

  if (highCount > ids.length) {
    blockers.forEach((blocker) => {
      const normalized = clean(blocker)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      if (normalized) ids.push(normalized);
    });
  }

  return [...new Set(ids.filter(Boolean))];
}

function soundMatchApplyReady(result = {}) {
  const completed = Number(result.completedRounds || result.roundsCompleted || 0);
  const required = Number(result.requiredRounds || 15);
  const contradictions = Number(result.contradictions || 0);
  const repeatChecksClean = Number(result.repeatChecksClean ?? result.cleanRepeatChecks ?? 0);
  const explicitReady = result.applyReadiness?.ready === true || result.readyToApply === true;

  return {
    ready: explicitReady || (completed >= required && contradictions === 0 && repeatChecksClean >= 4),
    completed,
    required,
    contradictions,
    repeatChecksClean
  };
}

function proofStatus(loopbackProof) {
  return buildWasapiLoopbackProof(loopbackProof || {});
}

function baseFound({ report, loopbackProof }) {
  const { outputs, inputs } = devicesFrom(report);
  const companions = detectedCompanionLabels(report);
  const found = [];
  if (outputs.length) found.push(`Output: ${firstLabel(outputs, 'output detected')}`);
  if (inputs.length) found.push(`Mic: ${firstLabel(inputs, 'input detected')}`);
  if (companions.length) found.push(`Audio layers: ${companions.slice(0, 4).join(' / ')}`);
  if (loopbackProof.status === 'available') found.push(`WASAPI loopback: ${loopbackProof.endpointLabel}`);
  if (!found.length) found.push('No setup evidence yet.');
  return found;
}

function proofLines({ report, desktopReady, loopbackProof }) {
  const lines = [];
  if (browserOnly(report, desktopReady)) {
    lines.push('Browser-only scan: ready for web match test; desktop endpoint proof is not claimed.');
  } else {
    lines.push('Desktop scan evidence is loaded.');
  }
  lines.push(`WASAPI loopback proof: ${loopbackProof.status}${loopbackProof.status === 'available' ? ` (${loopbackProof.endpointLabel})` : ''}.`);
  lines.push('No hidden recording starts, no raw audio is stored, and no Windows routing, driver, APO, or system setting is modified.');
  return lines;
}

function gameReady(check = {}) {
  return check?.status === 'ready';
}

function spatialReady(check = {}) {
  return check?.status === 'ready';
}

function hasDevices(report = {}) {
  const { outputs, inputs } = devicesFrom(report);
  return outputs.length > 0 && inputs.length > 0;
}

function verdictPayload({
  status,
  headline,
  confidence,
  found,
  problems,
  nextAction,
  why,
  undo,
  proof,
  blockers,
  safeToApply,
  safeToTestInMatch
}) {
  return {
    schema: AUTO_SETUP_VERDICT_SCHEMA,
    status,
    confidence,
    headline,
    found: found.map((item) => clean(item)).filter(Boolean),
    problems: problems.map((item) => clean(item)).filter(Boolean),
    nextAction,
    why: why.map((item) => clean(item)).filter(Boolean),
    undo: clean(undo),
    proof: proof.map((item) => clean(item)).filter(Boolean),
    blockers: [...new Set(blockers.filter(Boolean))],
    safeToApply,
    safeToTestInMatch
  };
}

export function buildAutoSetupVerdict({
  autoDetectReport = {},
  conflicts = {},
  gameAudioCheck = null,
  nativeSpatialCompatibility = null,
  soundMatchResult = null,
  loopbackProof = null,
  desktopReady = false,
  backupAvailable = false,
  profileReady = false,
  starterTuneApplied = false,
  matchFeedback = null
} = {}) {
  const report = autoDetectReport || {};
  const confidence = confidenceFrom(report);
  const proof = proofStatus(loopbackProof);
  const desktop = desktopEvidence(report, desktopReady);
  const browser = browserOnly(report, desktopReady);
  const unsafeIds = unsafeConflictIds(conflicts);
  const sound = soundMatchApplyReady(soundMatchResult || {});
  const evidenceFound = baseFound({ report, loopbackProof: proof });
  const proofEvidence = proofLines({ report, desktopReady, loopbackProof: proof });
  const why = [
    'CueForge combines scan evidence, conflict detection, game settings, spatial stack state, Sound Match consistency, loopback proof, and backup state.',
    summarizeWasapiLoopbackProof(proof)
  ];
  const undo = backupAvailable
    ? 'Backup is available. Direct apply can keep a visible undo path.'
    : 'Direct apply stays locked until a backup and undo path exist.';

  if (!hasDevices(report)) {
    return verdictPayload({
      status: 'needs-fixes',
      headline: 'Scan headset and mic first',
      confidence,
      found: evidenceFound,
      problems: ['Output and mic evidence are incomplete.'],
      nextAction: {
        id: 'scan-devices',
        label: 'Start Auto Setup',
        route: 'detect',
        detail: 'Scan devices so CueForge can stop guessing.'
      },
      why,
      undo,
      proof: proofEvidence,
      blockers: ['scan-required'],
      safeToApply: false,
      safeToTestInMatch: false
    });
  }

  if (unsafeIds.length) {
    return verdictPayload({
      status: 'do-not-apply-yet',
      headline: 'Do not apply yet',
      confidence,
      found: evidenceFound,
      problems: [
        'Unsafe setup conflicts are still present.',
        ...conflictItems(conflicts).filter((item) => unsafeIds.includes(item.id)).map((item) => item.title),
        ...list(conflicts.chainHealth?.blockers)
      ],
      nextAction: {
        id: 'fix-conflicts',
        label: 'Fix Audio Conflicts',
        route: 'detect',
        detail: 'Clear clipping, limiter, double-processing, routing, or spatial blockers before applying.'
      },
      why,
      undo,
      proof: proofEvidence,
      blockers: unsafeIds,
      safeToApply: false,
      safeToTestInMatch: false
    });
  }

  if (desktop && ['blocked', 'unavailable', 'unsupported'].includes(proof.status)) {
    return verdictPayload({
      status: 'needs-fixes',
      headline: 'Desktop proof needs one fix',
      confidence,
      found: evidenceFound,
      problems: [`WASAPI loopback proof is ${proof.status}: ${proof.reason}`],
      nextAction: {
        id: 'loopback-proof',
        label: 'Retry Loopback Proof',
        route: 'desktop-scan',
        detail: proof.nextAction
      },
      why,
      undo,
      proof: proofEvidence,
      blockers: ['loopback-proof'],
      safeToApply: false,
      safeToTestInMatch: true
    });
  }

  if (gameAudioCheck && !gameReady(gameAudioCheck)) {
    return verdictPayload({
      status: 'needs-fixes',
      headline: 'Check game audio settings',
      confidence,
      found: evidenceFound,
      problems: [gameAudioCheck.summary || 'Game HRTF, output, dynamic range, spatial, or voice/chat split is not confirmed.'],
      nextAction: {
        id: 'game-settings',
        label: 'Check Game Settings',
        route: 'detect',
        detail: gameAudioCheck.summary || 'Answer the game audio settings before applying.'
      },
      why,
      undo,
      proof: proofEvidence,
      blockers: ['game-settings'],
      safeToApply: false,
      safeToTestInMatch: true
    });
  }

  if (nativeSpatialCompatibility && !spatialReady(nativeSpatialCompatibility)) {
    return verdictPayload({
      status: 'do-not-apply-yet',
      headline: 'Do not apply yet',
      confidence,
      found: evidenceFound,
      problems: [nativeSpatialCompatibility.summary || 'Spatial renderer state is not confirmed.'],
      nextAction: {
        id: 'spatial-stack',
        label: 'Check Spatial Stack',
        route: 'detect',
        detail: nativeSpatialCompatibility.summary || 'Use one spatial renderer during testing.'
      },
      why,
      undo,
      proof: proofEvidence,
      blockers: ['spatial-stack'],
      safeToApply: false,
      safeToTestInMatch: false
    });
  }

  if (soundMatchResult && !sound.ready) {
    return verdictPayload({
      status: 'do-not-apply-yet',
      headline: 'Sound Match is still preview-only',
      confidence,
      found: evidenceFound,
      problems: [
        `Sound Match direct apply needs ${sound.required} rounds and clean repeat checks.`,
        `${sound.completed}/${sound.required} rounds, ${sound.contradictions} contradiction${sound.contradictions === 1 ? '' : 's'}, ${sound.repeatChecksClean} clean repeat checks.`
      ],
      nextAction: {
        id: 'sound-match',
        label: 'Finish Sound Match',
        route: 'blindmatch',
        detail: 'Finish the full apply gate before applying the learned EQ.'
      },
      why,
      undo,
      proof: proofEvidence,
      blockers: ['sound-match-apply-gate'],
      safeToApply: false,
      safeToTestInMatch: true
    });
  }

  if (!profileReady || !starterTuneApplied) {
    return verdictPayload({
      status: 'needs-fixes',
      headline: 'Use the starter tune first',
      confidence,
      found: evidenceFound,
      problems: ['CueForge has not confirmed that the starter profile is active.'],
      nextAction: {
        id: 'starter-tune',
        label: 'Use Starter Tune',
        route: 'starter-tune',
        detail: 'Stage the safe starter profile, then prove it with Sound Match or a match test.'
      },
      why,
      undo,
      proof: proofEvidence,
      blockers: ['starter-tune'],
      safeToApply: false,
      safeToTestInMatch: true
    });
  }

  const directApplyReady = !browser && proof.status === 'available' && sound.ready && backupAvailable;
  const headline = browser
    ? 'Ready for web match test'
    : directApplyReady
      ? 'Your setup is ready'
      : 'Ready to test, apply still locked';
  const nextAction = matchFeedback
    ? {
        id: 'export-pack',
        label: 'Export Setup Pack',
        route: 'export',
        detail: 'Export the proven setup with redacted proof.'
      }
    : {
        id: 'play-test',
        label: 'Play One Match',
        route: 'trial',
        detail: 'Run one real match and report footsteps, comms, bass masking, and clipping.'
      };

  return verdictPayload({
    status: 'ready',
    headline,
    confidence,
    found: evidenceFound,
    problems: directApplyReady || browser ? [] : ['Direct apply needs desktop loopback proof and backup before it unlocks.'],
    nextAction,
    why,
    undo,
    proof: proofEvidence,
    blockers: directApplyReady || browser ? [] : ['apply-backup-or-proof'],
    safeToApply: directApplyReady,
    safeToTestInMatch: true
  });
}
