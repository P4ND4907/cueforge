export const implementationEffort = {
  low: 'low',
  medium: 'medium',
  high: 'high'
};

export const implementationStatus = {
  live: 'foundation-live',
  inProgress: 'in-progress',
  queued: 'queued',
  manifestLive: 'manifest-live'
};

export const implementationBacklog = [
  {
    id: 'extract-feature-modules',
    task: 'Extract Setup Command Center / Auto Detect / Self Test from main.jsx into feature modules',
    why: 'Lowers risk and makes automated testing realistic.',
    effort: implementationEffort.medium,
    status: implementationStatus.inProgress,
    lane: 'app-architecture',
    stage: 'v0.2-hardening',
    nextOrder: 30,
    proof: ['route wrappers exist', 'page extraction tests', 'browser screenshot smoke'],
    nextAction: 'Move one page at a time behind the existing route wrappers and compare screenshots after each extraction.'
  },
  {
    id: 'canonical-chain-graph-schema',
    task: 'Define chain-graph JSON schema and store it as the canonical assessment object',
    why: 'Makes detection results comparable and testable.',
    effort: implementationEffort.medium,
    status: implementationStatus.inProgress,
    lane: 'assessment-core',
    stage: 'v0.2-hardening',
    nextOrder: 20,
    proof: ['schema fixture validation', 'graph import/export round trip', 'redacted identifiers'],
    nextAction: 'Promote the current chain graph shape into a shared JSON schema consumed by Auto Detect, readiness, reports, and native helper code.'
  },
  {
    id: 'windows-default-endpoints-helper',
    task: 'Add Windows native helper for current default endpoints and route roles',
    why: 'Moves from installed to active.',
    effort: implementationEffort.high,
    status: implementationStatus.queued,
    lane: 'native-helper',
    stage: 'v0.3-native-dsp-sandbox',
    nextOrder: 100,
    proof: ['native helper manifest', 'default playback/recording roles', 'communications endpoint split', 'canModifySystemState false'],
    nextAction: 'Extend the desktop helper manifest with current multimedia and communications endpoint roles without changing defaults.'
  },
  {
    id: 'wasapi-loopback-helper',
    task: 'Add WASAPI loopback capture helper',
    why: 'Unlocks true render proof.',
    effort: implementationEffort.high,
    status: implementationStatus.queued,
    lane: 'native-helper',
    stage: 'v0.3-native-dsp-sandbox',
    nextOrder: 110,
    proof: ['explicit player click required', 'bounded capture window', 'protected playback boundary', 'redacted endpoint evidence'],
    nextAction: 'Implement capability detection first, then a no-recording availability proof before any capture path.'
  },
  {
    id: 'fixture-pack',
    task: 'Build fixture pack: impulse, chirp, pink noise, cue clips, comms clips',
    why: 'Enables deterministic regression.',
    effort: implementationEffort.medium,
    status: implementationStatus.inProgress,
    lane: 'machine-play-lab',
    stage: 'v0.3-native-dsp-sandbox',
    nextOrder: 50,
    proof: ['seeded generators', 'fixture metadata', 'golden analyzer outputs', 'no raw private audio'],
    nextAction: 'Add impulse/chirp generators and small synthetic cue/comms fixtures beside the existing footsteps, pink noise, comms bed, and masker generators.'
  },
  {
    id: 'ffmpeg-libebur128-analyzers',
    task: 'Add FFmpeg/libebur128 analyzers',
    why: 'Gives standardized loudness and signal metrics.',
    effort: implementationEffort.low,
    status: implementationStatus.queued,
    lane: 'audio-metrics',
    stage: 'v0.3-native-dsp-sandbox',
    nextOrder: 40,
    proof: ['tool availability check', 'astats/ebur128 reference output', 'JS fallback comparison', 'redacted report summary'],
    nextAction: 'Add optional local analyzer command wrappers that report missing FFmpeg clearly and compare reference metrics to CueForge fallback metrics.'
  },
  {
    id: 'conflict-rules-engine',
    task: 'Add conflict rules engine',
    why: 'Lets app explain why a user setup is wrong.',
    effort: implementationEffort.medium,
    status: implementationStatus.live,
    lane: 'assessment-core',
    stage: 'v0.2-hardening',
    nextOrder: 0,
    proof: ['Sonar + APO warning', 'multiple spatial layers warning', 'Voicemeeter route warning', 'exclusive-mode warning'],
    nextAction: 'Keep expanding rules from real reports and require each new rule to include message, fix, severity, and fixture coverage.'
  },
  {
    id: 'playwright-web-smoke',
    task: 'Add Playwright web smoke',
    why: 'Proves browser flow.',
    effort: implementationEffort.low,
    status: implementationStatus.live,
    lane: 'ui-automation',
    stage: 'v0.2-hardening',
    nextOrder: 0,
    proof: ['first-run landing visible', 'Auto Detect actionable', 'report export works', 'no horizontal overflow'],
    nextAction: 'Keep the web smoke release-blocking and expand it only when human-found UI issues become stable regression cases.'
  },
  {
    id: 'playwright-electron-smoke',
    task: 'Add Playwright Electron smoke',
    why: 'Proves desktop bridge flow.',
    effort: implementationEffort.medium,
    status: implementationStatus.live,
    lane: 'desktop-automation',
    stage: 'v0.2-hardening',
    nextOrder: 0,
    proof: ['desktop app launches nonblank', 'preload API limited', 'desktop info resolves to CueForge app data', 'startup has no console resource failures'],
    nextAction: 'Keep Electron smoke release-blocking whenever preload APIs, desktop packaging, or public asset paths change.'
  },
  {
    id: 'hardware-profile-manifests',
    task: 'Add hardware profile manifests',
    why: 'Makes lab reproducible across known setups.',
    effort: implementationEffort.low,
    status: implementationStatus.live,
    lane: 'machine-play-lab',
    stage: 'v0.2-hardening',
    nextOrder: 0,
    proof: ['HyperX/Sonar profile', 'USB DAC + APO profile', 'Voicemeeter/VB-CABLE profile', 'wireless chat/game split profile'],
    nextAction: 'Add new profiles only when a real tester setup repeats or exposes a new route class.'
  },
  {
    id: 'feedback-automation-ingestion',
    task: 'Add Feedback Automation ingestion for tester packets',
    why: 'Closes the feedback loop.',
    effort: implementationEffort.medium,
    status: implementationStatus.queued,
    lane: 'feedback-loop',
    stage: 'v0.3-native-dsp-sandbox',
    nextOrder: 70,
    proof: ['redacted packet import', 'issue pattern clustering', 'next reply draft', 'no raw audio upload'],
    nextAction: 'Create an ingestion command that reads redacted tester packets, updates pattern memory, and writes reviewed next-action tickets.'
  },
  {
    id: 'scheduled-maintenance-job',
    task: 'Add Autobot-style scheduled maintenance job',
    why: 'Keeps nightly health and route checks running.',
    effort: implementationEffort.medium,
    status: implementationStatus.queued,
    lane: 'automation',
    stage: 'v0.3-native-dsp-sandbox',
    nextOrder: 80,
    proof: ['nightly checks', 'route fixture replay', 'repair queue output', 'no public posting or system changes'],
    nextAction: 'Add a scheduled local/GitHub workflow that runs read-only health checks and writes a maintenance report.'
  },
  {
    id: 'commit-readiness-smoke',
    task: 'Add Kalshi-Scout-style commit/readiness smoke',
    why: 'Catches stale builds and broken deploys.',
    effort: implementationEffort.low,
    status: implementationStatus.inProgress,
    lane: 'ci-release',
    stage: 'v0.2-hardening',
    nextOrder: 35,
    proof: ['run-checks scripts', 'release-gate workflow', 'docs bundle freshness', 'audit/build/test summary'],
    nextAction: 'Make the release gate fail on stale docs bundles, missing inventory evidence, or untested manifest changes.'
  },
  {
    id: 'checked-in-swarm-manifests',
    task: 'Promote swarm into checked-in route manifests and repair jobs',
    why: 'Makes hidden QA reproducible.',
    effort: implementationEffort.medium,
    status: implementationStatus.manifestLive,
    lane: 'qa-swarm',
    stage: 'v0.3-native-dsp-sandbox',
    nextOrder: 75,
    proof: ['persona route manifests', 'seeded random route replay', 'repair job manifest', 'summary report'],
    nextAction: 'Connect the checked-in route/job/repair manifests to the CDP swarm runner and require the coverage summary before release candidates.'
  }
];

const effortWeight = {
  [implementationEffort.low]: 1,
  [implementationEffort.medium]: 2,
  [implementationEffort.high]: 3
};

const statusWeight = {
  [implementationStatus.queued]: 0,
  [implementationStatus.inProgress]: 1,
  [implementationStatus.manifestLive]: 1.5,
  [implementationStatus.live]: 2
};

export function getImplementationTask(id) {
  return implementationBacklog.find((item) => item.id === id) || null;
}

export function getImplementationBacklogByStage(stage) {
  return implementationBacklog.filter((item) => item.stage === stage);
}

export function getImplementationBacklogByLane(lane) {
  return implementationBacklog.filter((item) => item.lane === lane);
}

export function summarizeImplementationBacklog(backlog = implementationBacklog) {
  const byEffort = Object.values(implementationEffort).reduce((acc, effort) => {
    acc[effort] = backlog.filter((item) => item.effort === effort).length;
    return acc;
  }, {});
  const byStatus = Object.values(implementationStatus).reduce((acc, status) => {
    acc[status] = backlog.filter((item) => item.status === status).length;
    return acc;
  }, {});
  const byStage = backlog.reduce((acc, item) => {
    acc[item.stage] = (acc[item.stage] || 0) + 1;
    return acc;
  }, {});

  return {
    schema: 'cueforge.implementation-backlog.v1',
    taskCount: backlog.length,
    byEffort,
    byStatus,
    byStage,
    remainingEffortScore: backlog
      .filter((item) => item.status !== implementationStatus.live)
      .reduce((total, item) => total + effortWeight[item.effort], 0)
  };
}

export function getNextImplementationTasks({ limit = 5, stage = null } = {}) {
  return implementationBacklog
    .filter((item) => item.status !== implementationStatus.live)
    .filter((item) => !stage || item.stage === stage)
    .sort((a, b) => {
      const nextOrder = Number(a.nextOrder || 999) - Number(b.nextOrder || 999);
      if (nextOrder !== 0) return nextOrder;
      const statusOrder = statusWeight[a.status] - statusWeight[b.status];
      if (statusOrder !== 0) return statusOrder;
      return effortWeight[a.effort] - effortWeight[b.effort];
    })
    .slice(0, limit);
}

export function validateImplementationBacklog(backlog = implementationBacklog) {
  const issues = [];
  const ids = new Set();
  const requiredTasks = [
    'extract-feature-modules',
    'canonical-chain-graph-schema',
    'windows-default-endpoints-helper',
    'wasapi-loopback-helper',
    'fixture-pack',
    'ffmpeg-libebur128-analyzers',
    'conflict-rules-engine',
    'playwright-web-smoke',
    'playwright-electron-smoke',
    'hardware-profile-manifests',
    'feedback-automation-ingestion',
    'scheduled-maintenance-job',
    'commit-readiness-smoke',
    'checked-in-swarm-manifests'
  ];

  for (const item of backlog) {
    if (!item.id || !item.task || !item.why || !item.nextAction) {
      issues.push(`${item.id || 'unknown'} is missing required task fields.`);
    }
    if (!Number.isFinite(item.nextOrder)) issues.push(`${item.id} is missing nextOrder.`);
    if (ids.has(item.id)) issues.push(`${item.id} is duplicated.`);
    ids.add(item.id);
    if (!Object.values(implementationEffort).includes(item.effort)) issues.push(`${item.id} has invalid effort.`);
    if (!Object.values(implementationStatus).includes(item.status)) issues.push(`${item.id} has invalid status.`);
    if (!item.proof?.length) issues.push(`${item.id} is missing proof gates.`);
  }

  requiredTasks.forEach((id) => {
    if (!ids.has(id)) issues.push(`${id} is missing from the implementation backlog.`);
  });

  const highEffort = backlog.filter((item) => item.effort === implementationEffort.high).map((item) => item.id).sort();
  if (highEffort.join(',') !== ['wasapi-loopback-helper', 'windows-default-endpoints-helper'].sort().join(',')) {
    issues.push('Only Windows endpoint helper and WASAPI loopback helper should be high effort in this backlog.');
  }

  const liveIds = backlog.filter((item) => item.status === implementationStatus.live).map((item) => item.id);
  ['conflict-rules-engine', 'hardware-profile-manifests', 'playwright-web-smoke'].forEach((id) => {
    if (!liveIds.includes(id)) issues.push(`${id} should be marked foundation-live.`);
  });
  if (getImplementationTask('checked-in-swarm-manifests')?.status !== implementationStatus.manifestLive) {
    issues.push('checked-in-swarm-manifests should be marked manifest-live.');
  }

  return {
    ok: issues.length === 0,
    issues
  };
}
