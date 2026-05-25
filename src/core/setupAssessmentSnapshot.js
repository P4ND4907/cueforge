import { summarizeCueForgeBrain } from './cueforgeBrain.js';
import { buildStateAnchor, CUEFORGE_STATE_VERSION, STATE_CONSUMERS } from './stateAdapters.js';

export const SETUP_ASSESSMENT_SNAPSHOT_SCHEMA = 'cueforge.setup-assessment-snapshot.v1';
export const SETUP_ASSESSMENT_STORAGE_KEY = 'cueforge:setup-assessment:snapshot';
export const SETUP_ASSESSMENT_EVENT = 'cueforge:setup-assessment';
export const SETUP_ASSESSMENT_WINDOW_KEY = 'cueforgeSetupAssessment';

function safeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function list(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function summaryFromGraph(graph = {}) {
  const summary = graph.summary || {};
  return {
    nodes: Array.isArray(graph.nodes) ? graph.nodes.length : 0,
    edges: Array.isArray(graph.edges) ? graph.edges.length : 0,
    inputs: safeNumber(summary.inputs),
    outputs: safeNumber(summary.outputs),
    companions: safeNumber(summary.companions),
    virtualRoutes: safeNumber(summary.virtualRoutes),
    desktopBridge: Boolean(summary.desktopBridge),
    applyTargets: safeNumber(summary.applyTargets),
    confidence: safeNumber(graph.confidence ?? summary.confidence)
  };
}

function summaryFromConflicts(conflicts = {}) {
  const conflictList = list(conflicts.conflicts);
  const summary = conflicts.summary || {};
  return {
    total: safeNumber(summary.total, conflictList.length),
    high: safeNumber(summary.high, conflictList.filter((item) => item.severity === 'high').length),
    medium: safeNumber(summary.medium, conflictList.filter((item) => item.severity === 'medium').length),
    warnings: conflictList
      .filter((item) => item.severity !== 'high')
      .map((item) => ({
        id: item.id,
        title: item.title || item.message,
        fix: item.fix
      }))
      .slice(0, 5),
    blockers: conflictList
      .filter((item) => item.severity === 'high')
      .map((item) => ({
        id: item.id,
        title: item.title || item.message,
        fix: item.fix
      }))
      .slice(0, 5),
    healthScore: safeNumber(conflicts.chainHealth?.score)
  };
}

function privacyContract() {
  return {
    localStorageOnly: true,
    namespacedWindowObject: true,
    namespacedEvent: true,
    rawAudioIncluded: false,
    rawDeviceIdsIncluded: false,
    rawUserPathsIncluded: false,
    rawAccountDataIncluded: false,
    publicSafeByDefault: true
  };
}

export function buildSetupAssessmentSnapshot(bundle = {}, {
  createdAt = new Date().toISOString(),
  source = 'cueforge-app'
} = {}) {
  const state = bundle.stateV2 || bundle.cueforgeState || bundle;
  const brain = bundle.brain || {};
  const brainSummary = summarizeCueForgeBrain(brain);
  const readiness = bundle.readiness || state.readiness || {};
  const stateAnchor = buildStateAnchor(state, STATE_CONSUMERS.setupCommandCenter);
  const graph = summaryFromGraph(bundle.chainGraph || bundle.graph || {});
  const conflicts = summaryFromConflicts(bundle.conflicts || {});
  const nextActions = [
    ...list(readiness.nextActions),
    ...list(brainSummary.nextActions),
    ...list(bundle.autoDetectReport?.recommendations)
      .map((item) => (typeof item === 'string' ? item : item?.message || item?.label))
  ].filter(Boolean);

  return {
    schema: SETUP_ASSESSMENT_SNAPSHOT_SCHEMA,
    version: CUEFORGE_STATE_VERSION,
    createdAt,
    source,
    stateAnchor,
    readiness: {
      score: safeNumber(readiness.score),
      tier: readiness.tier || readiness.status || 'not_ready',
      blockers: list(readiness.blockers).slice(0, 5),
      warnings: list(readiness.warnings).slice(0, 5),
      nextActions: [...new Set(nextActions)].slice(0, 5)
    },
    chain: graph,
    conflicts,
    brain: {
      score: brainSummary.score,
      tier: brainSummary.tier,
      proof: list(brainSummary.proof).slice(0, 5),
      contrast: list(brainSummary.contrast).slice(0, 5)
    },
    exports: {
      hasApoConfig: Boolean(state.exports?.apoConfig || bundle.releasePack?.files?.['equalizer-apo-config.txt']),
      hasSetupPack: Boolean(state.exports?.setupPack || bundle.releasePack?.files?.['cueforge-state-v2.json']),
      hasReportPack: Boolean(state.exports?.reportPack || bundle.releasePack?.files?.['cueforge-readiness.json']),
      hasEngineManifest: Boolean(state.exports?.engineManifest || bundle.releasePack?.files?.['cueforge-apo-export-v2.json'])
    },
    privacy: privacyContract()
  };
}

export function validateSetupAssessmentSnapshot(snapshot = {}) {
  const issues = [];

  if (snapshot.schema !== SETUP_ASSESSMENT_SNAPSHOT_SCHEMA) {
    issues.push('Snapshot schema mismatch.');
  }
  if (snapshot.version !== CUEFORGE_STATE_VERSION) {
    issues.push('Snapshot version does not match CueForge state version.');
  }
  if (!snapshot.stateAnchor?.statePresent) {
    issues.push('Snapshot is missing a valid state anchor.');
  }
  if (snapshot.privacy?.rawAudioIncluded !== false) {
    issues.push('Snapshot must not include raw audio.');
  }
  if (snapshot.privacy?.rawDeviceIdsIncluded !== false) {
    issues.push('Snapshot must not include raw device IDs.');
  }
  if (snapshot.privacy?.rawUserPathsIncluded !== false) {
    issues.push('Snapshot must not include raw user paths.');
  }
  if (!Array.isArray(snapshot.readiness?.nextActions)) {
    issues.push('Snapshot readiness nextActions must be an array.');
  }

  return {
    ok: issues.length === 0,
    issues
  };
}

export function publishSetupAssessmentSnapshot(snapshot, {
  storage = globalThis.localStorage,
  target = globalThis,
  storageKey = SETUP_ASSESSMENT_STORAGE_KEY
} = {}) {
  const validation = validateSetupAssessmentSnapshot(snapshot);
  if (!validation.ok) {
    return {
      ok: false,
      validation,
      storageKey,
      eventName: SETUP_ASSESSMENT_EVENT
    };
  }

  const payload = JSON.stringify(snapshot);
  storage?.setItem?.(storageKey, payload);
  if (target) target[SETUP_ASSESSMENT_WINDOW_KEY] = snapshot;
  if (target?.dispatchEvent && typeof target.CustomEvent === 'function') {
    target.dispatchEvent(new target.CustomEvent(SETUP_ASSESSMENT_EVENT, { detail: snapshot }));
  } else if (target?.dispatchEvent && typeof CustomEvent === 'function') {
    target.dispatchEvent(new CustomEvent(SETUP_ASSESSMENT_EVENT, { detail: snapshot }));
  }

  return {
    ok: true,
    validation,
    storageKey,
    windowKey: SETUP_ASSESSMENT_WINDOW_KEY,
    eventName: SETUP_ASSESSMENT_EVENT,
    bytes: payload.length
  };
}

export function readSetupAssessmentSnapshot({
  storage = globalThis.localStorage,
  storageKey = SETUP_ASSESSMENT_STORAGE_KEY
} = {}) {
  try {
    const raw = storage?.getItem?.(storageKey);
    if (!raw) return null;
    const snapshot = JSON.parse(raw);
    const validation = validateSetupAssessmentSnapshot(snapshot);
    return validation.ok ? snapshot : null;
  } catch {
    return null;
  }
}
