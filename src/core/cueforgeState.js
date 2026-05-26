import { buildAudioChainGraph } from './chainGraph.js';
import { detectAudioConflicts } from './conflictDetector.js';
import { computeReadinessScoreV2 } from './readinessScore.js';
import { buildProfileEngineV2 } from './profileEngine.js';
import { buildNativeEngineManifest } from '../engines/nativeEngineManifest.js';
import { buildCueForgeReleasePack } from './exportSchema.js';
import { buildStateAnchor, STATE_CONSUMERS } from './stateAdapters.js';
import { buildAutoDetectReport } from './autoDetectReport.js';
import { buildCueForgeBrain } from './cueforgeBrain.js';
import { buildPersonalizationLabInputs } from './personalizationLabInputs.js';
import { buildSetupAssessmentSnapshot } from './setupAssessmentSnapshot.js';

export const cueforgeStateV2 = {
  version: '0.2.0-alpha.3',
  player: {
    testerId: null,
    experienceLevel: 'unknown',
    preferredStyle: 'balanced',
    trebleSensitivity: 0,
    bassPreference: 0,
    comfortPriority: 0,
    competitivePriority: 0
  },
  devices: {
    output: null,
    input: null,
    outputType: 'unknown',
    inputType: 'unknown',
    suspectedHardware: []
  },
  chain: {
    windowsDefaultOutput: null,
    windowsDefaultInput: null,
    activeCompanions: [],
    virtualDevices: [],
    apoDetected: false,
    sonarDetected: false,
    voicemeeterDetected: false,
    vbCableDetected: false,
    peaceDetected: false,
    spatialSoundPossible: null,
    risks: []
  },
  calibration: {
    channelCheck: null,
    sweepCheck: null,
    micCheck: null,
    hearingModel: null,
    blindMatch: null,
    preferenceModel: null,
    maskingLab: null,
    playerTrial: null,
    labInputs: null
  },
  selectedGame: {
    title: null,
    genre: 'unknown',
    intent: 'balanced',
    profileId: null
  },
  recommendedProfile: {
    id: null,
    confidence: 0,
    reason: [],
    eq: [],
    dynamics: null,
    mic: null,
    spatial: null
  },
  readiness: {
    score: 0,
    tier: 'not_ready',
    blockers: [],
    warnings: [],
    nextActions: []
  },
  exports: {
    apoConfig: null,
    setupPack: null,
    reportPack: null,
    engineManifest: null
  }
};

function cloneStateContract() {
  return JSON.parse(JSON.stringify(cueforgeStateV2));
}

function clean(value, fallback = null) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text || fallback;
}

function deviceLabel(node) {
  return clean(node?.label);
}

function firstNode(graph, type) {
  return graph?.nodes?.find((node) => node.type === type) || null;
}

function nodesByTypes(graph, types) {
  return (graph?.nodes || []).filter((node) => types.includes(node.type));
}

function inferDeviceType(label, fallback = 'unknown') {
  const text = String(label || '').toLowerCase();
  if (/iem|earbud|in-ear/.test(text)) return 'iem';
  if (/dac|usb audio/.test(text)) return 'dac';
  if (/headset/.test(text)) return 'headset';
  if (/headphone|speaker|output/.test(text)) return 'headphones';
  if (/hyperx|quadcast|solocast|yeti|microphone|usb mic|input/.test(text)) return 'usb-mic';
  return fallback;
}

function readinessTier(status) {
  return {
    'native-engine-ready': 'native_ready',
    'player-test-ready': 'player_ready',
    'ready-with-minor-warnings': 'ready_with_warnings',
    'usable-chain-uncertain': 'usable',
    'not-reliable-yet': 'needs_work',
    'broken-or-untested': 'not_ready',
    'guided-setup-needed': 'needs_guided_setup',
    'needs-foundation': 'not_ready'
  }[status] || 'not_ready';
}

function normalizeReadinessItem(item) {
  if (typeof item === 'string') {
    return {
      id: item.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'readiness-item',
      label: item,
      fix: item
    };
  }

  return {
    id: item?.id,
    label: item?.label || item?.title || item?.fix,
    fix: item?.fix || item?.label || item?.title
  };
}

function gameIntent(profile) {
  if (profile?.recommendation?.intent) return profile.recommendation.intent;
  const label = String(profile?.recommendation?.label || '').toLowerCase();
  if (/competitive|fps/.test(label)) return 'competitive';
  if (/comms|discord/.test(label)) return 'comms';
  if (/casual|media|cinematic/.test(label)) return 'comfort';
  return 'balanced';
}

function detectedTool(graph, key) {
  return Boolean(graph?.nodes?.some((node) => node.id === `companion-${key}`));
}

export function buildCanonicalCueForgeState({
  graph,
  conflicts,
  readiness,
  profile,
  engine,
  apoConfig = '',
  setupPack = null,
  reportPack = null,
  player = {},
  calibration = {}
} = {}) {
  const state = cloneStateContract();
  const input = firstNode(graph, 'input');
  const output = firstNode(graph, 'output');
  const companions = nodesByTypes(graph, ['apply-target', 'mixer', 'routing', 'spatial', 'enhancer', 'mic-processing', 'device-suite', 'driver-console']);
  const virtualDevices = companions.filter((node) => ['mixer', 'routing'].includes(node.type));
  const riskConflicts = conflicts?.conflicts || [];
  const recommendation = profile?.recommendation || {};

  state.player = {
    ...state.player,
    ...player
  };
  state.devices = {
    output: deviceLabel(output),
    input: deviceLabel(input),
    outputType: inferDeviceType(deviceLabel(output)),
    inputType: inferDeviceType(deviceLabel(input)),
    suspectedHardware: [
      ...(input?.meta?.profiles || []),
      ...(output?.meta?.profiles || [])
    ].filter(Boolean)
  };
  state.chain = {
    windowsDefaultOutput: deviceLabel(output),
    windowsDefaultInput: deviceLabel(input),
    activeCompanions: companions.map((node) => node.label),
    virtualDevices: virtualDevices.map((node) => node.label),
    apoDetected: detectedTool(graph, 'equalizerApo'),
    sonarDetected: detectedTool(graph, 'steelSeriesSonar'),
    voicemeeterDetected: detectedTool(graph, 'voicemeeter'),
    vbCableDetected: detectedTool(graph, 'vbCable'),
    peaceDetected: detectedTool(graph, 'peace'),
    spatialSoundPossible: companions.some((node) => node.type === 'spatial') || null,
    risks: riskConflicts.map((item) => ({
      id: item.id,
      severity: item.severity,
      title: item.title,
      fix: item.fix
    }))
  };
  state.calibration = {
    channelCheck: calibration.channelCheck || null,
    sweepCheck: calibration.sweepCheck || null,
    micCheck: calibration.micCheck || null,
    hearingModel: calibration.hearingModel || null,
    blindMatch: calibration.blindMatch || null,
    preferenceModel: calibration.preferenceModel || calibration.blindMatch?.preferenceModel || null,
    maskingLab: calibration.maskingLab || null,
    playerTrial: calibration.playerTrial || null,
    labInputs: calibration.labInputs || buildPersonalizationLabInputs({
      hearingModel: calibration.hearingModel || null,
      repeatedHearingAnswers: calibration.repeatedHearingAnswers || [],
      blindMatch: calibration.blindMatch || null,
      preferenceModel: calibration.preferenceModel || calibration.blindMatch?.preferenceModel || null,
      maskingLab: calibration.maskingLab || null,
      playerTrial: calibration.playerTrial || null,
      playback: calibration.playback || {}
    })
  };
  state.selectedGame = {
    title: recommendation.game || null,
    genre: recommendation.genreProfileId || recommendation.id?.split('-')[0] || 'unknown',
    intent: gameIntent(profile),
    profileId: recommendation.genreProfileId || recommendation.sourceProfile || null
  };
  state.recommendedProfile = {
    id: recommendation.id || null,
    confidence: profile?.confidence || 0,
    reason: profile?.nextActions || [],
    eq: recommendation.eq || [],
    dynamics: engine?.plans?.dynamics || null,
    mic: engine?.plans?.mic || null,
    spatial: engine?.plans?.spatial || null
  };
  state.readiness = {
    score: readiness?.score || 0,
    tier: readiness?.tier || readinessTier(readiness?.status),
    blockers: (readiness?.blockers || []).map(normalizeReadinessItem),
    warnings: readiness?.warnings || riskConflicts.filter((item) => item.severity !== 'high').map((item) => item.title),
    nextActions: readiness?.nextActions || []
  };
  state.exports = {
    apoConfig: apoConfig || null,
    setupPack,
    reportPack,
    engineManifest: engine || null
  };

  return state;
}

export function buildCueForgeState({
  devices = [],
  bridgeReport = null,
  autoDetectReport = null,
  eq = [],
  game = 'Tarkov / Siege / COD',
  selectedSourceProfile = 'iemFps',
  desktopReady = false,
  hearing = null,
  repeatedHearingAnswers = [],
  blindMatch = null,
  preferenceModel = null,
  maskingLab = null,
  playerTrial = null,
  selfTests = [],
  betaCheckins = [],
  apoConfig = ''
} = {}) {
  const detectionReport = autoDetectReport || buildAutoDetectReport({
    browserDevices: devices,
    bridgeReport,
    desktopReady
  });
  const chainGraph = buildAudioChainGraph({ devices, bridgeReport, game, desktopReady });
  const conflicts = detectAudioConflicts({ graph: chainGraph, eq, hearing, betaCheckins, bridgeReport });
  const profile = buildProfileEngineV2({ eq, game, graph: chainGraph, conflicts, hearing, selectedSourceProfile, preferenceModel });
  const readiness = computeReadinessScoreV2({
    graph: chainGraph,
    conflicts,
    profile,
    hearing,
    exportReady: Boolean(apoConfig || chainGraph.summary.applyTargets),
    selfTests,
    betaCheckins
  });
  const engine = buildNativeEngineManifest({ state: { chainGraph, conflicts, readiness, profile } });
  const applyPath = {
    mode: chainGraph.summary.applyTargets && conflicts.summary.high === 0 ? 'review-and-apply' : 'export-only',
    explicit: true,
    reason: chainGraph.summary.applyTargets
      ? 'Apply target detected; user still reviews before native/apply steps.'
      : 'No apply target detected, so export stays manual.'
  };
  const stateV2 = buildCanonicalCueForgeState({
    graph: chainGraph,
    conflicts,
    readiness,
    profile,
    engine,
    apoConfig,
    calibration: {
      hearingModel: hearing,
      repeatedHearingAnswers,
      blindMatch: blindMatch || (preferenceModel?.roundsCompleted ? { complete: preferenceModel.roundsCompleted >= 9, preferenceModel } : null),
      preferenceModel: preferenceModel || blindMatch?.preferenceModel || null,
      maskingLab,
      playerTrial
    }
  });
  engine.stateAnchor = buildStateAnchor(stateV2, STATE_CONSUMERS.nativeEngine);
  const stateBundle = {
    autoDetectReport: detectionReport,
    stateV2,
    chainGraph,
    conflicts,
    readiness,
    profile,
    engine,
    applyPath
  };
  const brain = buildCueForgeBrain(stateBundle);
  const releasePack = buildCueForgeReleasePack({
    state: { ...stateBundle, brain },
    apoConfig
  });
  const finalBrain = buildCueForgeBrain({ ...stateBundle, releasePack });
  releasePack.brain = finalBrain;
  releasePack.files['cueforge-brain.json'] = JSON.stringify(finalBrain, null, 2);
  const setupAssessmentSnapshot = buildSetupAssessmentSnapshot({
    ...stateBundle,
    brain: finalBrain,
    releasePack
  });
  releasePack.setupAssessmentSnapshot = setupAssessmentSnapshot;
  releasePack.files['cueforge-setup-assessment.json'] = JSON.stringify(setupAssessmentSnapshot, null, 2);

  return {
    schema: 'cueforge.state.v2',
    version: '0.2.0-alpha.3',
    codename: 'Seamless Engine Foundation',
    autoDetectReport: detectionReport,
    stateV2,
    chainGraph,
    conflicts,
    readiness,
    profile,
    engine,
    applyPath,
    brain: finalBrain,
    setupAssessmentSnapshot,
    releasePack
  };
}
