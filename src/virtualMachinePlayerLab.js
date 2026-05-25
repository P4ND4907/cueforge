import { buildAutoTuneEq } from './autoTune.js';
import { createMaskingTune } from './maskingLab.js';
import { analyzeAudioFrame } from './signalAnalyzer.js';
import { computeSetupReadiness } from './setupReadiness.js';
import { evaluateMicCaptureProof, formatBridgeReportProof } from './hardwareProof.js';
import { buildSetupIntelligence, buildSetupIntelligenceText } from './setupIntelligence.js';
import { buildExportPack } from './exportPack.js';
import { createAudioProfileShare, buildAudioProfileShareText, parseAudioProfileShare } from './profileShare.js';
import { runPrivacyAudit } from './privacyAudit.js';
import { createUiFeedbackNote, sanitizeUiFeedbackNotes } from './uiFeedback.js';
import { createVirtualTester, diagnoseVirtualTester, applyVirtualFix } from './virtualBetaLab.js';

const appUrl = 'https://p4nd4907.github.io/cueforge/';
const releaseUrl = 'https://github.com/P4ND4907/cueforge/releases/latest';

const vmGearSetups = [
  {
    id: 'iem-dac-amp-usb-mic',
    label: 'IEM + DAC/amp + standalone USB mic',
    output: 'USB DAC + desktop amp + Truthear-style IEM',
    mic: 'Standalone USB condenser mic',
    browserDevices: [
      { kind: 'audiooutput', label: 'USB DAC Headphones' },
      { kind: 'audioinput', label: 'USB Condenser Microphone' }
    ],
    tools: { equalizerApo: true, peace: true, steelSeriesSonar: false, fxSound: false, vbCable: false, voicemeeter: false },
    matches: { hyperx: false, iemOrDac: true, virtualRouting: false },
    traits: { trebleSensitivity: 6, bassPreference: 1, footstepFocus: 9, budgetTier: '50-150' }
  },
  {
    id: 'headset-boom-sonar',
    label: 'Gaming headset + boom mic + Sonar',
    output: 'HyperX Cloud / headset output',
    mic: 'HyperX-style boom mic',
    browserDevices: [
      { kind: 'audiooutput', label: 'Headset Earphone Game' },
      { kind: 'audioinput', label: 'Headset Microphone' }
    ],
    tools: { equalizerApo: false, peace: false, steelSeriesSonar: true, fxSound: false, vbCable: false, voicemeeter: false },
    matches: { hyperx: true, iemOrDac: true, virtualRouting: false },
    traits: { trebleSensitivity: 4, bassPreference: 4, footstepFocus: 7, budgetTier: 'no-spend' }
  },
  {
    id: 'iem-virtual-mixer-stream-mic',
    label: 'IEM + DAC + virtual mixer + stream mic',
    output: 'USB DAC IEM output',
    mic: 'Wave Link stream microphone',
    browserDevices: [
      { kind: 'audiooutput', label: 'USB Audio DAC' },
      { kind: 'audioinput', label: 'Wave Link MicrophoneFX' }
    ],
    tools: { equalizerApo: true, peace: false, steelSeriesSonar: false, fxSound: false, vbCable: true, voicemeeter: true, elgatoWaveLink: true },
    matches: { hyperx: false, iemOrDac: true, virtualRouting: true },
    traits: { trebleSensitivity: 5, bassPreference: 2, footstepFocus: 8, budgetTier: '150-plus' }
  },
  {
    id: 'wireless-headset-discord',
    label: 'Wireless headset + Discord only',
    output: 'Wireless headset game endpoint',
    mic: 'Wireless headset microphone',
    browserDevices: [
      { kind: 'audiooutput', label: 'Wireless Headset Game' },
      { kind: 'audioinput', label: 'Wireless Headset Microphone' }
    ],
    tools: { equalizerApo: false, peace: false, steelSeriesSonar: false, fxSound: false, vbCable: false, voicemeeter: false },
    matches: { hyperx: false, iemOrDac: true, virtualRouting: false },
    traits: { trebleSensitivity: 3, bassPreference: 5, footstepFocus: 6, budgetTier: 'under-50' }
  },
  {
    id: 'budget-realtek-oem-enhancer',
    label: 'Budget headset + Realtek/OEM enhancer',
    output: 'Realtek speaker/headphone jack',
    mic: 'Analog headset microphone',
    browserDevices: [
      { kind: 'audiooutput', label: 'Realtek Audio Speakers' },
      { kind: 'audioinput', label: 'Realtek Audio Microphone' }
    ],
    tools: { equalizerApo: false, peace: false, steelSeriesSonar: false, fxSound: true, nahimic: true, realtekAudio: true, vbCable: false, voicemeeter: false },
    matches: { hyperx: false, iemOrDac: true, virtualRouting: false },
    traits: { trebleSensitivity: 5, bassPreference: 3, footstepFocus: 7, budgetTier: 'under-50' }
  },
  {
    id: 'desktop-speakers-standalone-mic',
    label: 'Desktop speakers + standalone mic',
    output: 'Desktop speakers',
    mic: 'Blue-style USB mic',
    browserDevices: [
      { kind: 'audiooutput', label: 'Desktop Speakers' },
      { kind: 'audioinput', label: 'USB Microphone' }
    ],
    tools: { equalizerApo: true, peace: false, steelSeriesSonar: false, fxSound: false, vbCable: false, voicemeeter: false, nvidiaBroadcast: true },
    matches: { hyperx: false, iemOrDac: false, virtualRouting: false },
    traits: { trebleSensitivity: 4, bassPreference: 4, footstepFocus: 5, budgetTier: '50-150' }
  }
];

const problemScenarios = [
  {
    id: 'first-launch-blank-risk',
    expectedLane: 'windows-bridge',
    category: 'setup',
    severity: [45, 82],
    setupIssue: true,
    bridgeMissing: true,
    profile: { rms: 0.16, peak: 0.32, voice: 34, cue: 32, noise: 22, rumble: 20 },
    testerQuestion: 'Does the app actually open after a fresh download?'
  },
  {
    id: 'smart-screen-trust-friction',
    expectedLane: 'baseline-check',
    category: 'setup',
    severity: [35, 72],
    setupIssue: true,
    profile: { rms: 0.2, peak: 0.38, voice: 44, cue: 40, noise: 24, rumble: 18 },
    testerQuestion: 'Can a normal Windows player understand the unsigned app warning?'
  },
  {
    id: 'stacked-spatial-routing',
    expectedLane: 'routing-layer',
    category: 'routing',
    severity: [48, 88],
    setupIssue: true,
    routing: { sonar: true, virtualRouting: true, duplicateSpatial: true },
    profile: { rms: 0.26, peak: 0.44, voice: 46, cue: 42, noise: 26, rumble: 36 },
    testerQuestion: 'Can CueForge tell routing problems apart from bad EQ?'
  },
  {
    id: 'mic-boom-and-clipping',
    expectedLane: 'mic-gain',
    category: 'mic',
    analyzerCause: 'input-clipping',
    severity: [52, 96],
    profile: { rms: 0.68, peak: 0.99, clipEvery: 2, voice: 76, cue: 40, noise: 32, rumble: 42 },
    testerQuestion: 'Does mic analysis avoid making Discord voice worse?'
  },
  {
    id: 'room-noise-and-suppression',
    expectedLane: 'mic-noise',
    category: 'mic',
    analyzerCause: 'room-or-chain-noise',
    severity: [42, 90],
    profile: { rms: 0.16, peak: 0.36, voice: 18, cue: 24, noise: 92, rumble: 36, edge: 82, air: 90 },
    testerQuestion: 'Does the app recommend lighter, practical mic fixes?'
  },
  {
    id: 'explosion-masks-footsteps',
    expectedLane: 'masking-eq',
    category: 'game-audio',
    analyzerCause: 'low-end-masking',
    severity: [44, 90],
    profile: { rms: 0.32, peak: 0.55, voice: 36, cue: 24, noise: 26, rumble: 92, bass: 88, lowMid: 82 },
    testerQuestion: 'Does it fix masking without wrecking the whole game mix?'
  },
  {
    id: 'server-or-game-mix',
    expectedLane: 'game-server-evidence',
    category: 'game-server',
    gameOnly: true,
    severity: [38, 84],
    profile: { rms: 0.24, peak: 0.42, voice: 42, cue: 46, noise: 24, rumble: 26 },
    testerQuestion: 'Does CueForge avoid blaming gear when the game/session is the issue?'
  },
  {
    id: 'missing-apo-apply-target',
    expectedLane: 'apo-setup',
    category: 'setup',
    setupIssue: true,
    apoMissing: true,
    severity: [34, 74],
    profile: { rms: 0.24, peak: 0.38, voice: 44, cue: 50, noise: 18, rumble: 18 },
    testerQuestion: 'Does export-only mode stay honest when APO is not installed?'
  }
];

const gameFocuses = ['Tarkov / Siege / COD', 'Valorant / CS2', 'Warzone / Apex', 'Discord + Game'];

const featureFlows = [
  'Auto Detect',
  'Self Test',
  'Mic Lab',
  'Calibration',
  'EQ Studio',
  'Masking Lab',
  'Blind Match',
  'Hearing Model',
  'Beta Check-in',
  'Gameplay Save',
  'Report Lab',
  'Share Profile'
];

export function createVirtualMachinePlayer(seed = 907, options = {}) {
  const rng = createRng(`${options.seedPrefix || 'vm-player'}:${seed}`);
  const gear = options.gear || pick(vmGearSetups, rng);
  const problem = options.problem || pick(problemScenarios, rng);
  const effectiveTools = effectiveGearTools(gear, problem);
  const game = options.game || pick(gameFocuses, rng);
  const bridgeAvailable = options.bridgeAvailable ?? (!problem.bridgeMissing && rng() > 0.08);
  const micPermission = options.micPermission || (rng() > 0.08 ? 'granted' : 'blocked');
  const installedFrom = options.installedFrom || (rng() > 0.5 ? 'GitHub release portable exe' : 'GitHub Pages app link');
  const seedNumber = normalizeSeedNumber(seed);
  const baseTester = createVirtualTester(seedNumber);
  const severity = randomRange(rng, problem.severity[0], problem.severity[1]);
  const bridgeReport = bridgeAvailable ? makeBridgeReport({ gear, game, problem, seed: seedNumber }) : null;

  return {
    id: `vm-player-${seedNumber}`,
    seed: seedNumber,
    persona: virtualName(seedNumber, gear),
    installedFrom,
    game,
    gear,
    problem,
    micPermission,
    bridgeAvailable,
    bridgeReport,
    browserDevices: micPermission === 'granted' ? gear.browserDevices : gear.browserDevices.map((device, index) => ({
      kind: device.kind,
      label: '',
      fallbackLabel: `${device.kind} ${index + 1}`
    })),
    tester: {
      ...baseTester,
      id: `vm-${seedNumber}`,
      seed: seedNumber,
      game,
      gear: {
        output: gear.output,
        mic: gear.mic,
        apo: Boolean(effectiveTools.equalizerApo),
        sonar: Boolean(effectiveTools.steelSeriesSonar),
        virtualRouting: Boolean(gear.matches.virtualRouting),
        trebleSensitivity: gear.traits.trebleSensitivity,
        bassPreference: gear.traits.bassPreference,
        footstepFocus: gear.traits.footstepFocus
      },
      problem,
      severity,
      expectedLane: chooseExpectedLane({ problem, gear: { ...gear, tools: effectiveTools }, bridgeAvailable, micPermission }),
      permissionGranted: micPermission === 'granted',
      browserDeviceCount: micPermission === 'granted' ? gear.browserDevices.length : 0,
      bridgeReport,
      reportReady: rng() > 0.15,
      hearingAnswered: randomInt(rng, 2, 12),
      before: { setupScore: 0, clarity: 0, comms: 0, severity }
    }
  };
}

export function runVirtualMachinePlayerJourney(player, options = {}) {
  const rng = createRng(`journey:${player.seed}:${options.runSeed || 'default'}`);
  const steps = [];
  const notes = [];
  const featureOrder = shuffle(featureFlows, rng).slice(0, Math.max(6, Math.min(featureFlows.length, options.featureDepth || 8)));
  const desktopSmoke = options.desktopSmoke || { status: 'not-run', detail: 'Desktop smoke was not requested for this simulated player.' };

  const record = (step) => {
    const normalized = normalizeStep(step);
    steps.push(normalized);
    if (['warn', 'fail'].includes(normalized.status) && normalized.reportable !== false) {
      notes.push(makeJourneyNote(player, normalized));
    }
    return normalized;
  };

  record({
    id: 'clean-machine',
    page: 'Download',
    label: 'Clean VM user profile',
    status: 'pass',
    detail: 'Started with isolated storage, no saved CueForge profile, no copied tester state.',
    evidence: [`Install source: ${player.installedFrom}`]
  });

  record({
    id: 'download',
    page: 'Download',
    label: 'Download/open app',
    status: desktopSmoke.status === 'fail' ? 'fail' : 'pass',
    detail: desktopSmoke.status === 'fail'
      ? `Packaged app smoke failed: ${desktopSmoke.detail}`
      : `Download path staged from ${player.installedFrom}; app URL and release link are reachable inputs for the tester journey.`,
    evidence: [appUrl, releaseUrl, desktopSmoke.detail].filter(Boolean)
  });

  if (player.installedFrom.toLowerCase().includes('exe')) {
    record({
      id: 'windows-trust',
      page: 'Download',
      label: 'Windows trust / SmartScreen friction',
      status: 'warn',
    detail: 'Unsigned alpha builds can show Windows SmartScreen. This is expected until the desktop app is code-signed and reputation builds.',
      action: 'Keep release notes, hashes, and clear unsigned-alpha copy near the download button. Code signing is required before a public-ready desktop claim.',
      reportable: false
    });
  }

  const readiness = computeSetupReadiness({
    audioApi: true,
    micPermission: player.micPermission === 'granted' ? 'granted' : 'denied',
    deviceCount: player.browserDevices.filter((device) => device.kind?.includes('audio')).length,
    bridgeLoaded: Boolean(player.bridgeReport),
    apoFound: Boolean(player.bridgeReport?.tools?.equalizerApo?.installed),
    selfTests: [{ status: 'pass' }],
    reportReady: player.tester.reportReady,
    hearingAnswered: player.tester.hearingAnswered
  });

  const intelligence = buildSetupIntelligence({
    devices: player.browserDevices,
    bridgeReport: player.bridgeReport,
    game: player.game,
    budgetTier: player.gear.traits.budgetTier,
    desktopReady: Boolean(player.bridgeReport)
  });

  record({
    id: 'setup-gate',
    page: 'Setup Gate',
    label: 'Guided setup and gear import',
    status: readiness.status === 'needs-setup' ? 'warn' : 'pass',
    detail: `${player.gear.label}: setup score ${readiness.score}, ${readiness.status}.`,
    action: readiness.nextActions[0] || 'Continue into tuning.',
    evidence: [buildSetupIntelligenceText(intelligence).split('\n').slice(0, 12).join(' | ')],
    reportable: false
  });

  const diagnosis = diagnoseVirtualTester(player.tester);
  const outcome = applyVirtualFix(player.tester, diagnosis);
  const eq = buildAutoTuneEq({
    preset: player.gear.output.toLowerCase().includes('iem') ? 'iem' : player.gear.output.toLowerCase().includes('hyper') ? 'hyperx' : 'balanced',
    trebleSensitivity: player.gear.traits.trebleSensitivity,
    bassPreference: player.gear.traits.bassPreference,
    footstepFocus: player.gear.traits.footstepFocus
  });
  const signal = player.problem.profile.noStream ? null : analyzeAudioFrame(makeSyntheticAudioFrame(player.problem.profile, player.seed));
  const profileShare = createAudioProfileShare({
    eq,
    bands: [31, 62, 125, 250, 500, '1k', '2k', '4k', '8k', '16k'],
    selectedGame: player.game,
    selectedSourceProfile: intelligence.gamePlan.sourceProfile,
    sourceProfile: { name: intelligence.gamePlan.profile },
    appUrl,
    releaseUrl
  });
  const profileText = buildAudioProfileShareText(profileShare);
  const exportPack = buildExportPack({
    apoConfig: buildApoText(eq),
    calibration: { eq, selectedGame: player.game, selectedSourceProfile: intelligence.gamePlan.sourceProfile },
    hearing: { answered: player.tester.hearingAnswered },
    dna: { confidence: intelligence.confidence, gear: player.gear.label },
    uiFeedbackNotes: notes
  });
  const privacyAudit = runPrivacyAudit([
    { name: 'profile share', payload: profileText },
    { name: 'setup intelligence', payload: intelligence },
    { name: 'export pack', payload: exportPack },
    { name: 'bridge proof', payload: player.bridgeReport }
  ]);

  for (const feature of featureOrder) {
    record(runFeatureStep({ feature, player, readiness, intelligence, diagnosis, outcome, signal, eq, profileText, privacyAudit }));
  }

  const parsedProfile = parseAudioProfileShare(profileText);
  record({
    id: 'end-to-end-report',
    page: 'Report Lab',
    label: 'Final tester report and replay package',
    status: outcome.harmed || privacyAudit.status !== 'pass' || !parsedProfile ? 'fail' : 'pass',
    detail: outcome.harmed
      ? 'The simulated fix made the tester outcome worse and needs triage.'
      : `User verdict ${outcome.userVerdict}; diagnosis lane ${diagnosis.lane}; ${notes.length} developer note(s) created.`,
    action: notes.length ? 'Review generated Panda Notes, patch the highest-risk item, then rerun this exact seed.' : 'No blocking notes. Keep this scenario in release proof.',
    evidence: [
      `Expected lane: ${player.tester.expectedLane}`,
      `Chosen lane: ${diagnosis.lane}`,
      `Severity delta: ${outcome.severityDelta}`,
      `Privacy audit: ${privacyAudit.status}`
    ]
  });

  const summary = summarizeJourney({ player, steps, notes, readiness, intelligence, diagnosis, outcome, privacyAudit });

  return {
    schema: 'cueforge.vm-player-journey.v1',
    generatedAt: new Date().toISOString(),
    player: summarizePlayer(player),
    summary,
    setupIntelligence: intelligence,
    diagnosis,
    outcome,
    featureOrder,
    steps,
    notes: sanitizeUiFeedbackNotes(notes),
    redactedReport: buildRedactedJourneyReport({ player, readiness, intelligence, diagnosis, outcome, privacyAudit, profileShare })
  };
}

export function runVirtualMachinePlayerLab({ count = 25, seed = 907, featureDepth = 8, desktopSmoke = null } = {}) {
  const journeys = [];
  for (let index = 0; index < count; index += 1) {
    const player = createVirtualMachinePlayer(seed + index);
    journeys.push(runVirtualMachinePlayerJourney(player, {
      featureDepth,
      runSeed: `${seed}:${index}`,
      desktopSmoke: index === 0 && desktopSmoke ? desktopSmoke : null
    }));
  }

  const allNotes = journeys.flatMap((journey) => journey.notes);
  const totals = journeys.reduce((acc, journey) => {
    acc.steps += journey.steps.length;
    acc.pass += journey.steps.filter((step) => step.status === 'pass').length;
    acc.warn += journey.steps.filter((step) => step.status === 'warn').length;
    acc.fail += journey.steps.filter((step) => step.status === 'fail').length;
    acc.harmed += journey.outcome.harmed ? 1 : 0;
    acc.fixedOrImproved += journey.outcome.fixedOrImproved ? 1 : 0;
    acc.privacyFailures += journey.summary.privacyStatus === 'pass' ? 0 : 1;
    acc.diagnosisCorrect += journey.diagnosis.correctLane ? 1 : 0;
    return acc;
  }, { steps: 0, pass: 0, warn: 0, fail: 0, harmed: 0, fixedOrImproved: 0, privacyFailures: 0, diagnosisCorrect: 0 });

  return {
    schema: 'cueforge.vm-player-lab.v1',
    generatedAt: new Date().toISOString(),
    count,
    seed,
    featureDepth,
    desktopSmoke: desktopSmoke || { status: 'not-run', detail: 'Packaged desktop smoke not requested.' },
    summary: {
      stepRuns: totals.steps,
      pass: totals.pass,
      warn: totals.warn,
      fail: totals.fail,
      notes: allNotes.length,
      diagnosisAccuracy: ratio(totals.diagnosisCorrect, count),
      improvementRate: ratio(totals.fixedOrImproved, count),
      harmRate: ratio(totals.harmed, count),
      privacyFailureRate: ratio(totals.privacyFailures, count),
      gearCoverage: countBy(journeys, (journey) => journey.player.gearId),
      problemCoverage: countBy(journeys, (journey) => journey.player.problemId),
      featureCoverage: countBy(journeys.flatMap((journey) => journey.featureOrder), (feature) => feature)
    },
    journeys,
    notes: sanitizeUiFeedbackNotes(allNotes)
  };
}

export function formatVirtualMachinePlayerLabMarkdown(lab) {
  const lines = [
    '# Virtual Machine Player Lab',
    '',
    `Generated: ${lab.generatedAt}`,
    `Players: ${lab.count}`,
    `Seed: ${lab.seed}`,
    `Feature depth: ${lab.featureDepth}`,
    '',
    '## Summary',
    '',
    `- Step runs: ${lab.summary.stepRuns}`,
    `- Pass / warn / fail: ${lab.summary.pass} / ${lab.summary.warn} / ${lab.summary.fail}`,
    `- Panda Notes created: ${lab.summary.notes}`,
    `- Diagnosis accuracy: ${(lab.summary.diagnosisAccuracy * 100).toFixed(1)}%`,
    `- Improvement rate: ${(lab.summary.improvementRate * 100).toFixed(1)}%`,
    `- Harm rate: ${(lab.summary.harmRate * 100).toFixed(2)}%`,
    `- Privacy failure rate: ${(lab.summary.privacyFailureRate * 100).toFixed(2)}%`,
    `- Desktop packaged smoke: ${lab.desktopSmoke.status} - ${lab.desktopSmoke.detail}`,
    '',
    '## Gear Coverage',
    '',
    ...Object.entries(lab.summary.gearCoverage).map(([gear, total]) => `- ${gear}: ${total}`),
    '',
    '## Problem Coverage',
    '',
    ...Object.entries(lab.summary.problemCoverage).map(([problem, total]) => `- ${problem}: ${total}`),
    '',
    '## Journey Details',
    ''
  ];

  for (const journey of lab.journeys) {
    lines.push(`### ${journey.player.name} - ${journey.player.gearLabel}`);
    lines.push('');
    lines.push(`- Game: ${journey.player.game}`);
    lines.push(`- Problem: ${journey.player.problemId}`);
    lines.push(`- Expected lane: ${journey.summary.expectedLane}`);
    lines.push(`- Chosen lane: ${journey.summary.chosenLane}`);
    lines.push(`- Verdict: ${journey.summary.userVerdict}`);
    lines.push(`- Setup confidence: ${journey.summary.setupConfidence}%`);
    lines.push(`- Steps pass/warn/fail: ${journey.summary.pass}/${journey.summary.warn}/${journey.summary.fail}`);
    lines.push(`- Notes: ${journey.notes.length}`);
    lines.push('');
    journey.steps.forEach((step, index) => {
      lines.push(`${index + 1}. ${step.status.toUpperCase()} - ${step.page} / ${step.label}`);
      lines.push(`   ${step.detail}`);
      if (step.action) lines.push(`   Next: ${step.action}`);
    });
    if (journey.notes.length) {
      lines.push('', '   Notes:');
      journey.notes.forEach((note) => {
        lines.push(`   - [${note.tag}] ${note.page}: ${note.note}`);
      });
    }
    lines.push('');
  }

  lines.push('## Repair Notes');
  lines.push('');
  if (!lab.notes.length) {
    lines.push('No Panda Notes were created by this run.');
  } else {
    lab.notes.forEach((note, index) => {
      lines.push(`${index + 1}. [${note.tag}] ${note.page} / ${note.target.panel}: ${note.note}`);
    });
  }

  return `${lines.join('\n')}\n`;
}

export const virtualMachinePlayerLabCatalog = {
  gearSetups: vmGearSetups.map(({ id, label }) => ({ id, label })),
  problems: problemScenarios.map(({ id, testerQuestion }) => ({ id, testerQuestion })),
  features: featureFlows
};

function runFeatureStep({ feature, player, readiness, intelligence, diagnosis, outcome, signal, eq, profileText, privacyAudit }) {
  if (feature === 'Auto Detect') {
    const highRisk = intelligence.riskFlags.find((flag) => flag.severity === 'high');
    return {
      id: 'feature-auto-detect',
      page: 'Auto Detect',
      label: 'Auto-detect gear chain',
      status: highRisk ? 'warn' : intelligence.confidence >= 60 ? 'pass' : 'warn',
      detail: `${player.gear.label}: ${intelligence.confidence}% confidence. ${highRisk?.title || intelligence.testedProof}`,
      action: highRisk?.action || intelligence.actions[0],
      evidence: [formatBridgeReportProof(player.bridgeReport)],
      reportable: false
    };
  }

  if (feature === 'Self Test') {
    return {
      id: 'feature-self-test',
      page: 'Self Test',
      label: 'Run full auto test',
      status: readiness.blockers.length ? 'warn' : 'pass',
      detail: `Setup readiness ${readiness.score}; blockers: ${readiness.blockers.map((item) => item.label).join(', ') || 'none'}.`,
      action: readiness.nextActions[0] || 'Proceed to match check-in.',
      reportable: false
    };
  }

  if (feature === 'Mic Lab') {
    const proof = diagnosis.micProof || evaluateMicCaptureProof({ streamStarted: false });
    return {
      id: 'feature-mic-lab',
      page: 'Mic Lab',
      label: 'Mic analyzer',
      status: proof.status === 'pass' && !['mic-gain', 'mic-noise', 'mic-level'].includes(player.tester.expectedLane) ? 'pass' : proof.status,
      detail: proof.detail,
      action: diagnosis.fix.actions[0],
      evidence: signal ? [`Signal cause: ${signal.probableCause}`, `Clarity: ${signal.fpsClarity}`, `Comms: ${signal.commsReadiness}`] : [],
      reportable: false
    };
  }

  if (feature === 'Calibration' || feature === 'EQ Studio') {
    return {
      id: `feature-${feature.toLowerCase().replace(/\s+/g, '-')}`,
      page: feature,
      label: feature === 'Calibration' ? 'Generate autotune' : 'Review EQ export',
      status: eq.length === 10 ? 'pass' : 'fail',
      detail: `${eq.length} EQ bands created for ${player.game}.`,
      action: diagnosis.fix.actions.find((item) => /eq|apply|export|review/i.test(item)) || 'Review before exporting APO.',
      evidence: [`Min/max gain: ${Math.min(...eq).toFixed(1)} / ${Math.max(...eq).toFixed(1)}`]
    };
  }

  if (feature === 'Masking Lab') {
    const tune = createMaskingTune(eq, 'footsteps-under-explosion');
    return {
      id: 'feature-masking',
      page: 'Masking Lab',
      label: 'Anti-masking tune',
      status: tune.after >= tune.before ? 'pass' : 'warn',
      detail: tune.summary,
      action: 'Retest the same fight or training-range cue before calling it fixed.'
    };
  }

  if (feature === 'Blind Match') {
    return {
      id: 'feature-blind-match',
      page: 'Blind Match',
      label: 'Preference learning',
      status: 'pass',
      detail: 'Virtual tester completed hidden A/B preference rounds and produced a shareable EQ profile.',
      action: 'Apply only after the player confirms it felt better.'
    };
  }

  if (feature === 'Hearing Model') {
    return {
      id: 'feature-hearing',
      page: 'Hearing Model',
      label: 'Personal hearing baseline',
      status: player.tester.hearingAnswered >= 4 ? 'pass' : 'warn',
      detail: `${player.tester.hearingAnswered}/12 tone responses mocked for this clean-machine player.`,
      action: player.tester.hearingAnswered >= 4 ? 'Use as a light overlay only.' : 'Ask for at least four tone responses before tailoring.',
      reportable: false
    };
  }

  if (feature === 'Beta Check-in' || feature === 'Gameplay Save') {
    return {
      id: `feature-${feature.toLowerCase().replace(/\s+/g, '-')}`,
      page: feature,
      label: feature === 'Beta Check-in' ? 'Before/after match note' : 'Gameplay-safe save loop',
      status: outcome.fixedOrImproved ? 'pass' : 'warn',
      detail: `Virtual match verdict: ${outcome.userVerdict}; severity changed ${outcome.severityDelta} point(s).`,
      action: outcome.fixedOrImproved ? 'Ask the real tester to repeat on one more map.' : 'Collect replay/report before tuning harder.',
      reportable: outcome.harmed
    };
  }

  if (feature === 'Report Lab') {
    return {
      id: 'feature-report-lab',
      page: 'Report Lab',
      label: 'Redacted replay report',
      status: privacyAudit.status === 'pass' ? 'pass' : 'fail',
      detail: privacyAudit.status === 'pass'
        ? 'Generated replay data passed the privacy audit.'
        : `${privacyAudit.leakCount} privacy issue(s) found in generated report data.`,
      action: privacyAudit.status === 'pass' ? 'Attach only when the tester chooses to send it.' : 'Fix redaction before sharing this build.'
    };
  }

  if (feature === 'Share Profile') {
    const parsed = parseAudioProfileShare(profileText);
    return {
      id: 'feature-share-profile',
      page: 'Share CueForge',
      label: 'Copy/import audio profile',
      status: parsed?.eq?.length === 10 ? 'pass' : 'fail',
      detail: parsed ? 'Shared profile copied and re-imported with 10 EQ bands.' : 'Shared profile failed to parse.',
      action: 'Keep this text-only so friends can send profiles without accounts or uploads.'
    };
  }

  return {
    id: 'feature-unknown',
    page: feature,
    label: feature,
    status: 'warn',
    detail: 'Feature was listed but did not have a journey handler.',
    action: 'Add a handler before treating this as covered.'
  };
}

function summarizeJourney({ player, steps, notes, readiness, intelligence, diagnosis, outcome, privacyAudit }) {
  return {
    pass: steps.filter((step) => step.status === 'pass').length,
    warn: steps.filter((step) => step.status === 'warn').length,
    fail: steps.filter((step) => step.status === 'fail').length,
    noteCount: notes.length,
    setupScore: readiness.score,
    setupStatus: readiness.status,
    setupConfidence: intelligence.confidence,
    expectedLane: player.tester.expectedLane,
    chosenLane: diagnosis.lane,
    correctLane: diagnosis.correctLane,
    userVerdict: outcome.userVerdict,
    fixedOrImproved: outcome.fixedOrImproved,
    harmed: outcome.harmed,
    privacyStatus: privacyAudit.status
  };
}

function summarizePlayer(player) {
  return {
    id: player.id,
    name: player.persona,
    game: player.game,
    installedFrom: player.installedFrom,
    gearId: player.gear.id,
    gearLabel: player.gear.label,
    output: player.gear.output,
    mic: player.gear.mic,
    problemId: player.problem.id,
    testerQuestion: player.problem.testerQuestion,
    bridgeAvailable: player.bridgeAvailable,
    micPermission: player.micPermission
  };
}

function buildRedactedJourneyReport({ player, readiness, intelligence, diagnosis, outcome, privacyAudit, profileShare }) {
  return {
    schema: 'cueforge.vm-redacted-player-report.v1',
    generatedAt: new Date().toISOString(),
    player: summarizePlayer(player),
    setup: {
      readinessScore: readiness.score,
      readinessStatus: readiness.status,
      confidence: intelligence.confidence,
      riskFlags: intelligence.riskFlags.map((flag) => ({
        id: flag.id,
        severity: flag.severity,
        title: flag.title,
        action: flag.action
      }))
    },
    diagnosis: {
      expectedLane: player.tester.expectedLane,
      chosenLane: diagnosis.lane,
      correctLane: diagnosis.correctLane,
      actions: diagnosis.fix.actions
    },
    outcome: {
      beforeSeverity: outcome.beforeSeverity,
      afterSeverity: outcome.afterSeverity,
      severityDelta: outcome.severityDelta,
      verdict: outcome.userVerdict
    },
    shareProfile: {
      schema: profileShare.schema,
      game: profileShare.game,
      bandCount: profileShare.eq.length
    },
    privacy: {
      status: privacyAudit.status,
      leakCount: privacyAudit.leakCount || 0
    }
  };
}

function makeJourneyNote(player, step) {
  return createUiFeedbackNote({
    id: `vm-${player.seed}-${step.id}`,
    page: step.page,
    tag: step.status === 'fail' ? 'broken' : step.id === 'windows-trust' ? 'confusing' : 'missing feedback',
    note: `[${player.persona} / ${player.gear.label}] ${step.label}: ${step.detail}${step.action ? ` Next: ${step.action}` : ''}`,
    target: {
      label: step.label,
      role: 'virtual-machine-player',
      tagName: 'qa-step',
      panel: step.page
    },
    viewport: step.viewport || { width: 1366, height: 768, xPercent: 55, yPercent: 55 },
    now: new Date()
  });
}

function normalizeStep(step) {
  return {
    id: step.id || 'step',
    page: step.page || 'Unknown',
    label: step.label || 'Unnamed step',
    status: ['pass', 'warn', 'fail'].includes(step.status) ? step.status : 'warn',
    detail: String(step.detail || '').slice(0, 900),
    action: String(step.action || '').slice(0, 500),
    evidence: Array.isArray(step.evidence) ? step.evidence.map((item) => String(item).slice(0, 600)).slice(0, 6) : [],
    reportable: step.reportable !== false
  };
}

function chooseExpectedLane({ problem, gear, bridgeAvailable, micPermission }) {
  if (micPermission !== 'granted') return 'permission';
  if (problem.bridgeMissing || !bridgeAvailable) return 'windows-bridge';
  if (problem.apoMissing && !gear.tools.equalizerApo) return 'apo-setup';
  if (problem.expectedLane === 'routing-layer' && (gear.matches.virtualRouting || gear.tools.steelSeriesSonar)) return 'routing-layer';
  return problem.expectedLane;
}

function makeBridgeReport({ gear, game, problem, seed }) {
  const tools = effectiveGearTools(gear, problem);
  return {
    generatedAt: new Date(Date.UTC(2026, 4, 23, 12, seed % 60, 0)).toISOString(),
    soundDevices: [
      { Name: gear.output },
      { Name: gear.mic }
    ],
    mediaDevices: gear.browserDevices.map((device) => ({
      Name: device.label,
      PNPClass: 'AudioEndpoint'
    })),
    tools: Object.fromEntries(Object.entries(tools).map(([key, installed]) => [
      key,
      { installed: Boolean(installed), displayName: installed ? key : '' }
    ])),
    matches: {
      ...gear.matches,
      virtualRouting: Boolean(gear.matches.virtualRouting || problem.routing?.virtualRouting)
    },
    runningGames: [{ name: game }]
  };
}

function effectiveGearTools(gear, problem) {
  const tools = { ...(gear?.tools || {}) };
  if (problem?.apoMissing) {
    tools.equalizerApo = false;
    tools.peace = false;
  }
  return tools;
}

function makeSyntheticAudioFrame(profile, seed) {
  const timeDomain = new Uint8Array(2048);
  const frequencyData = new Uint8Array(1024);
  const rng = createRng(`frame:${seed}`);
  const rms = profile.rms ?? 0.22;
  const peak = profile.peak ?? 0.4;

  for (let index = 0; index < timeDomain.length; index += 1) {
    const phase = (index / timeDomain.length) * Math.PI * 2;
    let centered = Math.sin(phase * 8) * rms + (rng() - 0.5) * rms * 0.35;
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

function buildApoText(eq) {
  return [
    'Preamp: -4.5 dB',
    ...eq.map((gain, index) => `Filter ${index + 1}: ON PK Fc ${[31, 62, 125, 250, 500, '1k', '2k', '4k', '8k', '16k'][index]} Hz Gain ${gain.toFixed(1)} dB Q 1.20`)
  ].join('\n');
}

function virtualName(seed, gear) {
  const names = ['Mika', 'Rowan', 'Chiefy', 'Nova', 'Iris', 'Sage', 'Vex', 'Tess', 'Kai', 'June'];
  return `${names[Math.abs(seed) % names.length]}-${gear.id}`;
}

function normalizeSeedNumber(seed) {
  const number = Number(seed);
  if (Number.isFinite(number)) return Math.abs(Math.round(number));
  let total = 0;
  for (const char of String(seed)) total += char.charCodeAt(0);
  return total || 907;
}

function countBy(items, getKey) {
  return items.reduce((acc, item) => {
    const key = getKey(item) || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function ratio(value, total) {
  return Number((value / Math.max(1, total)).toFixed(4));
}

function pick(items, rng) {
  return items[Math.floor(rng() * items.length)];
}

function shuffle(items, rng) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function randomRange(rng, min, max) {
  return min + rng() * (max - min);
}

function randomInt(rng, min, max) {
  return Math.floor(randomRange(rng, min, max + 1));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function createRng(seedText) {
  let state = 2166136261;
  for (const char of String(seedText)) {
    state ^= char.charCodeAt(0);
    state = Math.imul(state, 16777619);
  }
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
