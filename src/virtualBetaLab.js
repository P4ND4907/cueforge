import { buildAutoTuneEq } from './autoTune.js';
import { createMaskingTune } from './maskingLab.js';
import { analyzeAudioFrame } from './signalAnalyzer.js';
import { computeSetupReadiness } from './setupReadiness.js';
import { evaluateMicCaptureProof, summarizeBridgeReport } from './hardwareProof.js';

const problemProfiles = [
  {
    id: 'input-clipping',
    category: 'mic',
    expectedLane: 'mic-gain',
    analyzerCause: 'input-clipping',
    severity: [56, 98],
    profile: { rms: 0.62, peak: 0.99, clipEvery: 3, voice: 78, cue: 42, noise: 30, rumble: 30 }
  },
  {
    id: 'room-or-chain-noise',
    category: 'mic',
    expectedLane: 'mic-noise',
    analyzerCause: 'room-or-chain-noise',
    severity: [42, 90],
    profile: { rms: 0.18, peak: 0.42, voice: 16, cue: 22, noise: 92, rumble: 36, edge: 82, air: 92 }
  },
  {
    id: 'low-end-masking',
    category: 'game-audio',
    expectedLane: 'masking-eq',
    analyzerCause: 'low-end-masking',
    severity: [48, 92],
    profile: { rms: 0.32, peak: 0.55, voice: 36, cue: 24, noise: 26, rumble: 92, bass: 88, lowMid: 82 }
  },
  {
    id: 'sharpness-fatigue',
    category: 'comfort',
    expectedLane: 'treble-control',
    analyzerCause: 'sharpness-fatigue',
    severity: [35, 82],
    profile: { rms: 0.26, peak: 0.47, voice: 52, cue: 94, noise: 64, rumble: 18, edge: 86, air: 74 }
  },
  {
    id: 'voice-too-quiet',
    category: 'mic',
    expectedLane: 'mic-level',
    analyzerCause: 'voice-too-quiet',
    severity: [35, 78],
    profile: { rms: 0.045, peak: 0.09, voice: 12, cue: 18, noise: 15, rumble: 12 }
  },
  {
    id: 'game-cue-buried',
    category: 'game-audio',
    expectedLane: 'cue-presence',
    analyzerCause: 'game-cue-buried',
    severity: [34, 76],
    profile: { rms: 0.24, peak: 0.44, voice: 56, cue: 18, noise: 24, rumble: 22, bass: 30, lowMid: 34 }
  },
  {
    id: 'spatial-layer-stacking',
    category: 'routing',
    expectedLane: 'routing-layer',
    setupIssue: true,
    severity: [42, 86],
    profile: { rms: 0.22, peak: 0.38, voice: 48, cue: 52, noise: 22, rumble: 28 },
    routing: { sonar: true, virtualRouting: true, duplicateSpatial: true }
  },
  {
    id: 'server-or-game-mix',
    category: 'game-server',
    expectedLane: 'game-server-evidence',
    severity: [38, 84],
    profile: { rms: 0.24, peak: 0.42, voice: 42, cue: 46, noise: 24, rumble: 26 },
    gameOnly: true
  },
  {
    id: 'missing-mic-permission',
    category: 'setup',
    expectedLane: 'permission',
    setupIssue: true,
    severity: [55, 100],
    profile: { noStream: true }
  },
  {
    id: 'missing-bridge',
    category: 'setup',
    expectedLane: 'windows-bridge',
    setupIssue: true,
    severity: [35, 75],
    profile: { rms: 0.22, peak: 0.35, voice: 45, cue: 42, noise: 20, rumble: 20 },
    bridgeMissing: true
  },
  {
    id: 'apo-missing',
    category: 'setup',
    expectedLane: 'apo-setup',
    setupIssue: true,
    severity: [30, 70],
    profile: { rms: 0.24, peak: 0.38, voice: 44, cue: 50, noise: 18, rumble: 18 },
    apoMissing: true
  }
];

const gearProfiles = [
  { output: 'Generic IEM', mic: 'USB boom mic', apo: true, sonar: false, virtualRouting: false, trebleSensitivity: 5, bassPreference: 2, footstepFocus: 8 },
  { output: 'HyperX headset', mic: 'HyperX boom mic', apo: false, sonar: true, virtualRouting: false, trebleSensitivity: 4, bassPreference: 4, footstepFocus: 7 },
  { output: 'USB DAC + IEM', mic: 'Desktop USB mic', apo: true, sonar: false, virtualRouting: true, trebleSensitivity: 6, bassPreference: 1, footstepFocus: 9 },
  { output: 'Wireless headset', mic: 'Wireless headset mic', apo: false, sonar: false, virtualRouting: false, trebleSensitivity: 3, bassPreference: 5, footstepFocus: 6 }
];

const games = ['Tarkov', 'Siege', 'COD / Warzone', 'Apex', 'CS2 / Valorant'];

export function createVirtualTester(seed = 1) {
  const random = mulberry32(seed);
  const gear = pick(gearProfiles, random);
  const problem = pick(problemProfiles, random);
  const severity = randomRange(random, problem.severity[0], problem.severity[1]);
  const permissionGranted = problem.id !== 'missing-mic-permission' && random() > 0.02;
  const bridgeLoaded = !problem.bridgeMissing && (problem.category !== 'setup' || random() > 0.08);
  const apoFound = problem.apoMissing ? false : gear.apo || random() > 0.5;
  const sonar = Boolean(problem.routing?.sonar ?? gear.sonar);
  const virtualRouting = Boolean(problem.routing?.virtualRouting ?? gear.virtualRouting);
  const duplicateSpatial = Boolean(problem.routing?.duplicateSpatial ?? (sonar && random() > 0.66));
  const expectedLane = chooseExpectedLane({ problem, permissionGranted, bridgeLoaded, apoFound, duplicateSpatial });

  return {
    id: `virtual-${seed}`,
    seed,
    game: pick(games, random),
    gear,
    problem,
    severity,
    expectedLane,
    permissionGranted,
    browserDeviceCount: permissionGranted ? randomInt(random, 1, 5) : randomInt(random, 0, 2),
    bridgeReport: bridgeLoaded ? makeBridgeReport({ gear, apoFound, sonar, virtualRouting, duplicateSpatial }) : null,
    reportReady: random() > 0.28,
    hearingAnswered: randomInt(random, 0, 12),
    before: {
      setupScore: 0,
      clarity: 0,
      comms: 0,
      severity
    }
  };
}

export function diagnoseVirtualTester(tester) {
  const readiness = computeSetupReadiness({
    audioApi: true,
    micPermission: tester.permissionGranted ? 'granted' : 'denied',
    deviceCount: tester.browserDeviceCount,
    bridgeLoaded: Boolean(tester.bridgeReport),
    apoFound: Boolean(tester.bridgeReport?.tools?.equalizerApo?.installed),
    selfTests: [{ status: 'pass' }],
    reportReady: tester.reportReady,
    hearingAnswered: tester.hearingAnswered
  });
  const bridge = summarizeBridgeReport(tester.bridgeReport);
  const micProof = tester.permissionGranted
    ? evaluateMicCaptureProof({
        streamStarted: true,
        rms: tester.problem.profile.rms || 0.2,
        peak: tester.problem.profile.peak || 0.34,
        sampleRate: 48000,
        frameCount: 15,
        captureMs: 900,
        deviceLabel: tester.gear.mic
      })
    : evaluateMicCaptureProof({ streamStarted: false });
  const analysis = tester.problem.profile.noStream
    ? null
    : analyzeAudioFrame(makeSyntheticAudioFrame(tester.problem.profile, tester.seed));
  const setupScore = readiness.score;
  const clarity = analysis?.fpsClarity ?? 0;
  const comms = analysis?.commsReadiness ?? 0;

  tester.before.setupScore = setupScore;
  tester.before.clarity = clarity;
  tester.before.comms = comms;

  const lane = chooseFixLane({ tester, readiness, bridge, micProof, analysis });
  const fix = buildVirtualFix({ tester, lane, analysis, readiness, bridge });

  return {
    schema: 'cueforge.virtual-diagnosis.v1',
    testerId: tester.id,
    expectedLane: tester.expectedLane,
    lane,
    correctLane: lane === tester.expectedLane,
    readiness,
    bridge,
    micProof,
    analysis,
    fix
  };
}

export function applyVirtualFix(tester, diagnosis) {
  const correct = diagnosis.correctLane;
  const problem = tester.problem;
  let severityDelta = correct ? randomish(tester.seed + 300, 18, 42) : randomish(tester.seed + 301, -12, 8);
  let confidenceDelta = correct ? randomish(tester.seed + 302, 8, 22) : randomish(tester.seed + 303, -10, 4);

  if (['permission', 'windows-bridge', 'apo-setup'].includes(tester.expectedLane) && correct) {
    severityDelta += 18;
    confidenceDelta += 14;
  }

  if (tester.expectedLane === 'game-server-evidence' && correct) {
    severityDelta = randomish(tester.seed + 304, 8, 20);
    confidenceDelta = randomish(tester.seed + 305, 12, 30);
  }

  if (!correct && diagnosis.lane.includes('eq') && ['routing-layer', 'game-server-evidence', 'permission'].includes(tester.expectedLane)) {
    severityDelta -= 12;
  }

  const afterSeverity = clamp(tester.severity - severityDelta, 0, 100);
  const afterSetupScore = clamp(tester.before.setupScore + confidenceDelta, 0, 100);
  const userVerdict = afterSeverity <= tester.severity - 16
    ? 'fixed'
    : afterSeverity < tester.severity
      ? 'partial'
      : afterSeverity === tester.severity
        ? 'unchanged'
        : 'worse';

  return {
    testerId: tester.id,
    problemId: problem.id,
    expectedLane: tester.expectedLane,
    chosenLane: diagnosis.lane,
    correctLane: diagnosis.correctLane,
    beforeSeverity: Math.round(tester.severity),
    afterSeverity: Math.round(afterSeverity),
    severityDelta: Math.round(tester.severity - afterSeverity),
    beforeSetupScore: tester.before.setupScore,
    afterSetupScore,
    userVerdict,
    harmed: afterSeverity > tester.severity + 3,
    fixedOrImproved: afterSeverity < tester.severity
  };
}

export function runVirtualBetaLab({ count = 1000, seed = 907 }) {
  const outcomes = [];
  const byProblem = {};

  for (let index = 0; index < count; index += 1) {
    const tester = createVirtualTester(seed + index);
    const diagnosis = diagnoseVirtualTester(tester);
    const outcome = applyVirtualFix(tester, diagnosis);
    outcomes.push(outcome);

    const bucket = byProblem[outcome.problemId] || {
      total: 0,
      correct: 0,
      fixedOrImproved: 0,
      harmed: 0,
      severityDelta: 0,
      lanes: {}
    };
    bucket.total += 1;
    bucket.correct += outcome.correctLane ? 1 : 0;
    bucket.fixedOrImproved += outcome.fixedOrImproved ? 1 : 0;
    bucket.harmed += outcome.harmed ? 1 : 0;
    bucket.severityDelta += outcome.severityDelta;
    bucket.lanes[outcome.chosenLane] = (bucket.lanes[outcome.chosenLane] || 0) + 1;
    byProblem[outcome.problemId] = bucket;
  }

  const totals = outcomes.reduce((stats, outcome) => {
    stats.correct += outcome.correctLane ? 1 : 0;
    stats.fixedOrImproved += outcome.fixedOrImproved ? 1 : 0;
    stats.harmed += outcome.harmed ? 1 : 0;
    stats.severityDelta += outcome.severityDelta;
    stats.fixed += outcome.userVerdict === 'fixed' ? 1 : 0;
    stats.partial += outcome.userVerdict === 'partial' ? 1 : 0;
    stats.unchanged += outcome.userVerdict === 'unchanged' ? 1 : 0;
    stats.worse += outcome.userVerdict === 'worse' ? 1 : 0;
    return stats;
  }, { correct: 0, fixedOrImproved: 0, harmed: 0, severityDelta: 0, fixed: 0, partial: 0, unchanged: 0, worse: 0 });

  return {
    schema: 'cueforge.virtual-beta-lab.v1',
    count,
    seed,
    diagnosisAccuracy: ratio(totals.correct, count),
    improvementRate: ratio(totals.fixedOrImproved, count),
    harmRate: ratio(totals.harmed, count),
    averageSeverityDelta: Number((totals.severityDelta / count).toFixed(2)),
    userVerdicts: {
      fixed: totals.fixed,
      partial: totals.partial,
      unchanged: totals.unchanged,
      worse: totals.worse
    },
    byProblem: Object.fromEntries(Object.entries(byProblem).map(([id, bucket]) => [
      id,
      {
        total: bucket.total,
        diagnosisAccuracy: ratio(bucket.correct, bucket.total),
        improvementRate: ratio(bucket.fixedOrImproved, bucket.total),
        harmRate: ratio(bucket.harmed, bucket.total),
        averageSeverityDelta: Number((bucket.severityDelta / bucket.total).toFixed(2)),
        lanes: bucket.lanes
      }
    ])),
    samples: outcomes.filter((outcome) => !outcome.correctLane || outcome.harmed).slice(0, 12)
  };
}

function chooseFixLane({ tester, readiness, bridge, micProof, analysis }) {
  if (!tester.permissionGranted || micProof.status !== 'pass') return 'permission';
  if (tester.problem.bridgeMissing || (tester.problem.category === 'setup' && !bridge.hasReport && tester.browserDeviceCount === 0)) return 'windows-bridge';
  if (!bridge.toolState.equalizerApo && tester.problem.expectedLane === 'apo-setup') return 'apo-setup';
  if (tester.problem.routing?.duplicateSpatial || (bridge.toolState.steelSeriesSonar && bridge.namedMatches.virtualRouting && tester.problem.expectedLane === 'routing-layer')) {
    return 'routing-layer';
  }
  if (tester.problem.gameOnly) return 'game-server-evidence';
  if (readiness.blockers.length && tester.problem.category === 'setup') return readiness.blockers[0].id === 'mic' ? 'permission' : 'windows-bridge';

  const causeLane = {
    'input-clipping': 'mic-gain',
    'room-or-chain-noise': 'mic-noise',
    'low-end-masking': 'masking-eq',
    'sharpness-fatigue': 'treble-control',
    'voice-too-quiet': 'mic-level',
    'game-cue-buried': 'cue-presence'
  }[analysis?.probableCause];

  return causeLane || 'baseline-check';
}

function chooseExpectedLane({ problem, permissionGranted, bridgeLoaded, apoFound, duplicateSpatial }) {
  if (!permissionGranted) return 'permission';
  if (problem.bridgeMissing || (!bridgeLoaded && problem.expectedLane === 'windows-bridge')) return 'windows-bridge';
  if (problem.apoMissing && !apoFound) return 'apo-setup';
  if (problem.expectedLane === 'routing-layer' && duplicateSpatial) return 'routing-layer';
  return problem.expectedLane;
}

function buildVirtualFix({ tester, lane, analysis, readiness, bridge }) {
  const eq = buildAutoTuneEq({
    preset: tester.gear.output.includes('IEM') ? 'iem' : tester.gear.output.includes('HyperX') ? 'hyperx' : 'balanced',
    trebleSensitivity: tester.gear.trebleSensitivity,
    bassPreference: tester.gear.bassPreference,
    footstepFocus: tester.gear.footstepFocus
  });
  const maskingTune = lane === 'masking-eq'
    ? createMaskingTune(eq, 'footsteps-under-explosion')
    : null;

  const actions = {
    'permission': ['Grant mic permission', 'Rerun Self Test', 'Verify real signal in Mic Lab'],
    'windows-bridge': ['Run desktop Windows scan', 'Load bridge report', 'Copy redacted setup summary'],
    'apo-setup': ['Install or enable Equalizer APO', 'Attach APO to active output', 'Save CueForge APO draft'],
    'routing-layer': ['Pick one spatial layer', 'Disable duplicate virtual surround', 'Run left/right/center test'],
    'game-server-evidence': ['Compare training range vs live match', 'Collect clip or report', 'Avoid global EQ overfit'],
    'mic-gain': ['Lower mic gain 5-10%', 'Retest 12s mic proof', 'Keep suppression light'],
    'mic-noise': ['Move mic closer', 'Lower room/interface noise', 'Retest voice presence'],
    'masking-eq': ['Trim rumble/bass first', 'Apply anti-masking EQ', 'Retest same fight'],
    'treble-control': ['Reduce edge/air bands', 'Avoid stacked bright presets', 'Retest fatigue after one match'],
    'mic-level': ['Raise input slightly', 'Speak at normal distance', 'Stop before clipping'],
    'cue-presence': ['Apply small 2k-6k lift', 'Keep bass stable', 'Verify on same map']
  }[lane] || ['Keep baseline', 'Run one controlled match', 'Record before/after notes'];

  return {
    lane,
    actions,
    eqPreview: eq,
    maskingTune,
    confidence: clamp(Math.round((readiness.score + (analysis?.tuningConfidence || 50) + (bridge.hasReport ? 18 : 0)) / 1.8), 0, 100)
  };
}

function makeBridgeReport({ gear, apoFound, sonar, virtualRouting }) {
  return {
    generatedAt: '2026-05-22T00:00:00.000Z',
    soundDevices: [
      { Name: gear.output },
      { Name: gear.mic }
    ],
    mediaDevices: [
      { Name: `${gear.output} endpoint`, PNPClass: 'AudioEndpoint' },
      { Name: `${gear.mic} endpoint`, PNPClass: 'AudioEndpoint' }
    ],
    tools: {
      equalizerApo: { installed: apoFound },
      peace: { installed: apoFound && gear.output.includes('IEM') },
      steelSeriesSonar: { installed: sonar },
      voicemeeter: { installed: virtualRouting },
      vbCable: { installed: virtualRouting }
    },
    matches: {
      hyperx: /hyperx/i.test(gear.mic) || /hyperx/i.test(gear.output),
      iemOrDac: /iem|dac|headset/i.test(gear.output),
      virtualRouting
    }
  };
}

function makeSyntheticAudioFrame(profile, seed) {
  const timeDomain = new Uint8Array(2048);
  const frequencyData = new Uint8Array(1024);
  const random = mulberry32(seed + 99);
  const rms = profile.rms ?? 0.22;
  const peak = profile.peak ?? 0.4;

  for (let index = 0; index < timeDomain.length; index += 1) {
    const phase = (index / timeDomain.length) * Math.PI * 2;
    let centered = Math.sin(phase * 8) * rms + (random() - 0.5) * rms * 0.35;
    centered = clamp(centered, -peak, peak);
    if (profile.clipEvery && index % profile.clipEvery === 0) centered = index % 2 ? 0.98 : -0.98;
    timeDomain[index] = clamp(Math.round(128 + centered * 128), 0, 255);
  }

  setBand(frequencyData, 20, 80, profile.rumble ?? profile.noise ?? 24);
  setBand(frequencyData, 80, 250, profile.bass ?? profile.rumble ?? 24);
  setBand(frequencyData, 250, 700, profile.lowMid ?? profile.bass ?? 28);
  setBand(frequencyData, 700, 1800, profile.voice ?? 40);
  setBand(frequencyData, 1800, 3500, profile.presence ?? profile.voice ?? 42);
  setBand(frequencyData, 3500, 6500, profile.cue ?? 42);
  setBand(frequencyData, 6500, 10000, profile.edge ?? profile.noise ?? 28);
  setBand(frequencyData, 10000, 16000, profile.air ?? profile.noise ?? 25);

  return { timeDomain, frequencyData, sampleRate: 48000 };
}

function setBand(frequencyData, from, to, level) {
  const binHz = 24000 / frequencyData.length;
  const start = Math.max(0, Math.floor(from / binHz));
  const end = Math.min(frequencyData.length, Math.ceil(to / binHz));
  for (let index = start; index < end; index += 1) {
    frequencyData[index] = clamp(Math.round((level / 100) * 255), 0, 255);
  }
}

function randomish(seed, min, max) {
  return randomRange(mulberry32(seed), min, max);
}

function randomRange(random, min, max) {
  return min + random() * (max - min);
}

function randomInt(random, min, max) {
  return Math.floor(randomRange(random, min, max + 1));
}

function pick(items, random) {
  return items[Math.floor(random() * items.length)];
}

function ratio(value, total) {
  return Number((value / Math.max(1, total)).toFixed(4));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function mulberry32(seed) {
  return function nextRandom() {
    let value = seed += 0x6D2B79F5;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}
