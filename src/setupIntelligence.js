const companionLayerDefinitions = [
  { key: 'equalizerApo', name: 'Equalizer APO', group: 'system-eq', role: 'APO config target' },
  { key: 'peace', name: 'Peace UI', group: 'system-eq', role: 'visual APO manager' },
  { key: 'steelSeriesSonar', name: 'SteelSeries Sonar', group: 'virtual-mixer', role: 'game/chat mixer' },
  { key: 'fxSound', name: 'FxSound', group: 'enhancer', role: 'system enhancer' },
  { key: 'razerThx', name: 'Razer THX / Synapse', group: 'spatial', role: 'spatial layer' },
  { key: 'dolbyAccess', name: 'Dolby Access / Atmos', group: 'spatial', role: 'spatial layer' },
  { key: 'dtsSoundUnbound', name: 'DTS Sound Unbound', group: 'spatial', role: 'spatial layer' },
  { key: 'nahimic', name: 'Nahimic', group: 'enhancer', role: 'OEM enhancer' },
  { key: 'realtekAudio', name: 'Realtek Audio Console', group: 'driver-console', role: 'OEM driver console' },
  { key: 'nvidiaBroadcast', name: 'NVIDIA Broadcast', group: 'mic-processing', role: 'AI mic cleanup' },
  { key: 'elgatoWaveLink', name: 'Elgato Wave Link', group: 'virtual-mixer', role: 'stream/game mixer' },
  { key: 'logitechGHub', name: 'Logitech G HUB', group: 'device-suite', role: 'headset/mic suite' },
  { key: 'corsairIcue', name: 'Corsair iCUE', group: 'device-suite', role: 'headset suite' },
  { key: 'voicemod', name: 'Voicemod', group: 'mic-processing', role: 'mic effects' },
  { key: 'voicemeeter', name: 'Voicemeeter', group: 'virtual-routing', role: 'manual routing' },
  { key: 'vbCable', name: 'VB-CABLE', group: 'virtual-routing', role: 'virtual cable' }
];

const gamePlans = {
  'Tarkov / Siege / COD': {
    goal: 'direction, verticality, reloads, room tone, and clean comms',
    profile: 'Competitive FPS',
    sourceProfile: 'competitiveFps',
    caution: 'Do not over-boost footsteps if the game or server is the real problem. Compare offline/training and one live match.'
  },
  'Valorant / CS2': {
    goal: 'short transient cues, footsteps, reloads, and voice-call clarity',
    profile: 'Valorant FPS Overlay',
    sourceProfile: 'valorant',
    caution: 'Keep bass controlled and avoid stacking multiple spatial enhancers.'
  },
  'Warzone / Apex': {
    goal: 'battle-royale chaos control, explosion masking, and squad comms',
    profile: 'Competitive FPS',
    sourceProfile: 'competitiveFps',
    caution: 'Test fatigue and sharpness after one match because BR mixes can get loud fast.'
  },
  'Discord + Game': {
    goal: 'game/chat balance, mic clarity, and routing sanity',
    profile: 'Balanced',
    sourceProfile: 'balanced',
    caution: 'Verify Windows default output and communication output before changing EQ.'
  }
};

const budgetPlans = {
  'no-spend': {
    label: 'Use what you have',
    plan: 'Start with your current headset/IEM, mic, Discord, Windows settings, and CueForge APO export. Fix routing and clipping before buying anything.',
    proof: 'Best first pass because it proves whether tuning helps the gear already on the desk.'
  },
  'under-50': {
    label: 'Small fix budget',
    plan: 'Only upgrade the weak link: tips/windscreen, basic DAC dongle, or a cleaner cable path if noise, hiss, or mic plosives show up in testing.',
    proof: 'Treat as problem-solving, not shopping. A clean setup beats a random upgrade.'
  },
  '50-150': {
    label: 'Value setup',
    plan: 'Aim for one clean output chain plus one reliable mic path. Avoid stacking headset app EQ, Sonar EQ, APO EQ, and game HRTF all at once.',
    proof: 'Needs a before/after match note before calling the combo proven.'
  },
  '150-plus': {
    label: 'Separated chain',
    plan: 'Separate output, mic, and routing choices. Better gear still needs calibration, latency checks, and a match test before trusting it.',
    proof: 'High-end only counts if it produces repeatable clarity without fatigue or routing weirdness.'
  }
};

function safeList(value) {
  return Array.isArray(value) ? value : [];
}

function compactText(value, fallback = '') {
  return String(value || fallback).replace(/\s+/g, ' ').trim();
}

function normalize(value) {
  return compactText(value).toLowerCase();
}

function deviceName(device) {
  return compactText(device?.label || device?.name || device?.Name || device?.FriendlyName || device?.device || '');
}

function reportToolInstalled(report, key) {
  const tool = report?.tools?.[key];
  if (typeof tool === 'boolean') return tool;
  return Boolean(tool?.installed);
}

function reportToolLabel(report, key) {
  const tool = report?.tools?.[key];
  return compactText(tool?.displayName || tool?.name || tool?.source || tool?.path || '');
}

function stageStatus(ready, partial = false) {
  if (ready) return 'ready';
  if (partial) return 'partial';
  return 'missing';
}

function confidenceReason(label, points, ready) {
  return {
    label,
    points,
    ready,
    detail: ready ? `+${points}` : 'missing'
  };
}

function buildProofGate(id, label, ready, action) {
  return {
    id,
    label,
    ready,
    status: ready ? 'passed' : 'needed',
    action
  };
}

export function buildSetupIntelligence({
  devices = [],
  bridgeReport = null,
  game = 'Tarkov / Siege / COD',
  budgetTier = 'no-spend',
  desktopReady = false
} = {}) {
  const browserDevices = safeList(devices).filter((device) => normalize(device?.kind).includes('audio'));
  const bridgeDevices = [...safeList(bridgeReport?.soundDevices), ...safeList(bridgeReport?.mediaDevices)];
  const labels = [...browserDevices, ...bridgeDevices].map(deviceName).join(' ').toLowerCase();
  const inputCount = browserDevices.filter((device) => device.kind === 'audioinput').length +
    bridgeDevices.filter((device) => /mic|microphone|input|capture/i.test(deviceName(device))).length;
  const outputCount = browserDevices.filter((device) => device.kind === 'audiooutput').length +
    bridgeDevices.filter((device) => /headphone|headset|speaker|output|dac|usb audio|iem/i.test(deviceName(device))).length;
  const hasNamedMic = /hyperx|hyper x|quadcast|solocast|yeti|wave link|elgato|blue microphone|usb mic|microphone/.test(labels) ||
    Boolean(bridgeReport?.matches?.hyperx);
  const hasNamedOutput = /iem|dac|headphone|headset|speaker|usb audio|cloud alpha|arctis|dt 990|hd560|hd 560|moondrop|truthear/.test(labels) ||
    Boolean(bridgeReport?.matches?.iemOrDac);

  const companionLayers = companionLayerDefinitions.map((layer) => {
    const installed = reportToolInstalled(bridgeReport, layer.key);
    return {
      ...layer,
      installed,
      status: installed ? 'detected' : bridgeReport ? 'not detected' : 'needs desktop scan',
      evidence: installed ? reportToolLabel(bridgeReport, layer.key) || 'Windows bridge report' : ''
    };
  });

  const installedLayers = companionLayers.filter((layer) => layer.installed);
  const routingLayers = installedLayers.filter((layer) => ['virtual-mixer', 'virtual-routing'].includes(layer.group));
  const processingLayers = installedLayers.filter((layer) => ['enhancer', 'spatial', 'mic-processing', 'device-suite'].includes(layer.group));
  const eqReady = reportToolInstalled(bridgeReport, 'equalizerApo') || reportToolInstalled(bridgeReport, 'peace');
  const gamePlan = gamePlans[game] || gamePlans['Tarkov / Siege / COD'];
  const budgetPlan = budgetPlans[budgetTier] || budgetPlans['no-spend'];
  const runningGames = safeList(bridgeReport?.runningGames).map((item) => compactText(item.name || item.id)).filter(Boolean);
  const hasBrowserDevices = browserDevices.length > 0;
  const hasBridgeReport = Boolean(bridgeReport);
  const hasCompanionLayers = installedLayers.length > 0;

  const confidenceReasons = [
    confidenceReason('Browser audio devices visible', 12, hasBrowserDevices),
    confidenceReason('Desktop Windows bridge report loaded', 26, hasBridgeReport),
    confidenceReason('Named mic/input identified', 10, hasNamedMic),
    confidenceReason('Named output/IEM/DAC identified', 10, hasNamedOutput),
    confidenceReason('APO or Peace apply target detected', 10, eqReady),
    confidenceReason('Companion layers mapped', Math.min(installedLayers.length * 4, 16), hasCompanionLayers)
  ];

  const confidence = Math.max(
    18,
    Math.min(
      96,
      22 + confidenceReasons.reduce((sum, reason) => sum + (reason.ready ? reason.points : 0), 0)
    )
  );

  const riskFlags = [];
  if (!bridgeReport) {
    riskFlags.push({
      id: 'browser-only',
      severity: 'medium',
      title: 'Browser-only scan',
      detail: 'Browser mode can see audio devices after permission, but desktop mode is needed for installed enhancers, virtual mixers, and reliable Windows endpoint names.',
      action: 'Run the desktop Windows scan before calling the setup auto-detected.'
    });
  }
  if (!eqReady) {
    riskFlags.push({
      id: 'no-apply-target',
      severity: 'medium',
      title: 'No system EQ target',
      detail: 'No Equalizer APO or Peace target is detected yet, so tuning can be exported but not proven system-wide.',
      action: 'Install/attach APO or use manual profile export until the apply target is visible.'
    });
  }
  if (processingLayers.filter((layer) => ['enhancer', 'spatial'].includes(layer.group)).length > 1) {
    riskFlags.push({
      id: 'double-processing',
      severity: 'high',
      title: 'Possible double processing',
      detail: 'Multiple spatial/enhancer layers are detected. Test one primary processing layer at a time to avoid double EQ or smeared direction.',
      action: 'Pick one spatial/enhancer layer, run one match, then compare before stacking anything.'
    });
  }
  if (routingLayers.length > 1) {
    riskFlags.push({
      id: 'routing-stack',
      severity: 'high',
      title: 'Routing stack needs proof',
      detail: 'Multiple routing layers are detected. Verify the real game output, chat output, and recording path before tuning.',
      action: 'Check Windows default output, communications output, Discord input/output, and in-game device selection.'
    });
  }
  if (runningGames.length) {
    riskFlags.push({
      id: 'live-game-detected',
      severity: 'info',
      title: 'Running game seen',
      detail: `${runningGames[0]} appears to be running. Tune lightly while live, then verify with a before/after check-in.`,
      action: 'Save the current setup before changing EQ during a live session.'
    });
  }

  const actions = [
    desktopReady || bridgeReport ? 'Run or refresh the Windows scan before a real match.' : 'Download/open the desktop build, then run Auto Detect > Windows scan.',
    `Use ${gamePlan.profile} as the starting game profile for ${game}.`,
    budgetPlan.plan,
    'Run Beta Check-in before and after one match. Mark whether direction, comms, fatigue, mic clarity, or server/game timing changed.'
  ];

  const testedProof = bridgeReport && eqReady
    ? 'local hardware proof ready; still needs real-match feedback to call this setup proven'
    : bridgeReport
      ? 'detected locally; add APO/Peace or manual apply proof before calling tuning proven'
      : 'starter guidance only until desktop scan and match feedback are collected';

  const chainStages = [
    {
      id: 'input',
      label: 'Mic/input',
      status: stageStatus(hasNamedMic, inputCount > 0),
      detail: hasNamedMic ? 'Named mic/input detected.' : inputCount ? 'Generic mic/input visible.' : 'No mic/input visible yet.',
      action: hasNamedMic ? 'Run Mic Lab and check clipping.' : 'Grant mic permission or run the desktop scan.'
    },
    {
      id: 'output',
      label: 'Output',
      status: stageStatus(hasNamedOutput, outputCount > 0),
      detail: hasNamedOutput ? 'Named output/IEM/DAC detected.' : outputCount ? 'Generic output visible.' : 'No output visible yet.',
      action: hasNamedOutput ? 'Run left/right/center/sweep checks.' : 'Load bridge report for stable Windows endpoint names.'
    },
    {
      id: 'apply',
      label: 'Apply target',
      status: stageStatus(eqReady),
      detail: eqReady ? 'APO/Peace target detected.' : 'System-wide apply target not detected.',
      action: eqReady ? 'Export or save an APO draft after review.' : 'Use export-only mode until APO/Peace is installed and attached.'
    },
    {
      id: 'routing',
      label: 'Routing/mixer',
      status: stageStatus(routingLayers.length > 0, hasBridgeReport),
      detail: routingLayers.length ? routingLayers.map((layer) => layer.name).join(', ') : hasBridgeReport ? 'No virtual routing detected.' : 'Needs desktop scan.',
      action: routingLayers.length ? 'Verify game, chat, and recording path before tuning.' : 'Keep routing simple unless a specific problem appears.'
    },
    {
      id: 'processing',
      label: 'Enhancers/spatial',
      status: stageStatus(processingLayers.length > 0, hasBridgeReport),
      detail: processingLayers.length ? processingLayers.map((layer) => layer.name).join(', ') : hasBridgeReport ? 'No companion processing detected.' : 'Needs desktop scan.',
      action: processingLayers.length ? 'Test one processing layer at a time.' : 'Avoid adding an enhancer until the baseline is proven.'
    },
    {
      id: 'match-proof',
      label: 'Match proof',
      status: 'missing',
      detail: 'No live match feedback is part of this scan.',
      action: 'Run Beta Check-in before and after a match to prove whether the setup helped.'
    }
  ];

  const proofGates = [
    buildProofGate('desktop-scan', 'Windows scan loaded', hasBridgeReport, 'Run Auto Detect > Windows scan in the desktop build.'),
    buildProofGate('named-input', 'Named mic/input', hasNamedMic, 'Grant mic permission or load the bridge report.'),
    buildProofGate('named-output', 'Named output/IEM/DAC', hasNamedOutput, 'Load the bridge report or confirm the output in Windows.'),
    buildProofGate('apply-target', 'APO/Peace apply target', eqReady, 'Install/attach Equalizer APO or keep this export-only.'),
    buildProofGate('risk-reviewed', 'Stacked processing reviewed', !riskFlags.some((flag) => flag.severity === 'high'), 'Resolve high-risk routing/spatial flags before public tester claims.'),
    buildProofGate('match-checkin', 'Real match check-in', false, 'Run Beta Check-in before and after a real match.')
  ];

  const recommendationCards = [
    {
      id: 'baseline',
      title: 'Baseline first',
      detail: 'Keep Windows routing simple, turn off extra stacked enhancers, and test the current gear before buying anything.',
      proof: 'This separates gear problems from routing and game/session problems.'
    },
    {
      id: 'game-profile',
      title: `Start with ${gamePlan.profile}`,
      detail: `${gamePlan.goal}. ${gamePlan.caution}`,
      proof: 'Apply inside CueForge first, then export/review APO text.'
    },
    {
      id: 'budget',
      title: budgetPlan.label,
      detail: budgetPlan.plan,
      proof: budgetPlan.proof
    },
    {
      id: 'match-loop',
      title: 'Prove it in one match',
      detail: 'Run Beta Check-in before and after one real match and mark what got better, worse, or unchanged.',
      proof: 'CueForge should learn from repeated player evidence, not one perfect preset.'
    }
  ];

  return {
    mode: desktopReady ? 'desktop' : 'browser',
    confidence,
    confidenceReasons,
    game,
    budgetTier,
    detected: {
      inputs: inputCount,
      outputs: outputCount,
      namedMic: hasNamedMic ? 'named mic seen' : inputCount ? 'generic mic seen' : 'no mic seen yet',
      namedOutput: hasNamedOutput ? 'named output seen' : outputCount ? 'generic output seen' : 'no output seen yet',
      companionLayers: installedLayers.map((layer) => layer.name),
      runningGames
    },
    gamePlan,
    budgetPlan,
    companionLayers,
    chainStages,
    riskFlags,
    warnings: riskFlags.map((flag) => flag.detail),
    proofGates,
    recommendationCards,
    actions,
    testedProof,
    promise: bridgeReport
      ? 'CueForge can use the desktop scan to detect connected endpoints and common companion audio layers, then build a safer tuning path around what is actually present.'
      : 'CueForge can start in the browser, but full auto-detect needs the desktop scan so Windows devices and companion audio apps are not guessed.'
  };
}

export function buildSetupIntelligenceText(intelligence) {
  const layerLines = intelligence.detected.companionLayers.length
    ? intelligence.detected.companionLayers.map((layer) => `- ${layer}`)
    : ['- No companion audio layers detected yet.'];

  return [
    'CueForge setup intelligence',
    '',
    `Mode: ${intelligence.mode}`,
    `Confidence: ${intelligence.confidence}%`,
    `Game focus: ${intelligence.game} - ${intelligence.gamePlan.goal}`,
    `Budget lane: ${intelligence.budgetPlan.label}`,
    '',
    'Detected chain:',
    `- Mic/input: ${intelligence.detected.namedMic}`,
    `- Output: ${intelligence.detected.namedOutput}`,
    ...(intelligence.detected.runningGames?.length ? [`- Running game hint: ${intelligence.detected.runningGames.join(', ')}`] : []),
    ...layerLines,
    '',
    'Chain stages:',
    ...intelligence.chainStages.map((stage) => `- ${stage.label}: ${stage.status} - ${stage.action}`),
    '',
    'Recommended next moves:',
    ...intelligence.actions.map((action) => `- ${action}`),
    '',
    'Proof gates:',
    ...intelligence.proofGates.map((gate) => `- ${gate.label}: ${gate.status}`),
    '',
    'Warnings:',
    ...(intelligence.riskFlags.length ? intelligence.riskFlags.map((flag) => `- ${flag.severity.toUpperCase()}: ${flag.title} - ${flag.action}`) : ['- No major setup warning from the current data.']),
    '',
    `Proof label: ${intelligence.testedProof}`
  ].join('\n');
}

export const setupIntelligenceOptions = {
  games: Object.keys(gamePlans),
  budgets: Object.entries(budgetPlans).map(([id, plan]) => ({ id, label: plan.label }))
};
