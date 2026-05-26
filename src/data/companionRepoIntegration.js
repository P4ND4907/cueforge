import {
  SETUP_ASSESSMENT_EVENT,
  SETUP_ASSESSMENT_STORAGE_KEY,
  SETUP_ASSESSMENT_WINDOW_KEY
} from '../core/setupAssessmentSnapshot.js';

export const companionIntegrationIds = {
  autobot: 'autobot',
  kalshiScout: 'kalshi-scout',
  feedbackAutomation: 'feedback-automation-system',
  cryptoIntelligence: 'crypto-intelligence'
};

export const companionIntegrations = [
  {
    id: companionIntegrationIds.autobot,
    label: 'Autobot scheduled maintenance pattern',
    role: 'orchestrate read-only lab maintenance',
    cueforgeUse: [
      'nightly route graph checks',
      'audio fixture regression',
      'Panda Notes repair queue scan',
      'feedback contract health'
    ],
    commands: [
      'npm.cmd run notes:repair',
      'npm.cmd run qa:route-graph-lab',
      'npm.cmd run qa:audio-fixture-regression',
      'npm.cmd run qa:feedback-contract'
    ],
    trigger: 'nightly or manual maintenance run',
    artifacts: [
      'docs/repair/PANDA_NOTES_REPAIR_QUEUE.md',
      'docs/repair/ROUTE_GRAPH_LAB.md',
      'docs/repair/AUDIO_FIXTURE_REGRESSION.md',
      'docs/repair/FEEDBACK_CONTRACT.md'
    ],
    guardrails: [
      'read-only scan by default',
      'no social posting',
      'no Windows routing changes',
      'no APO writes',
      'no raw audio upload'
    ]
  },
  {
    id: companionIntegrationIds.kalshiScout,
    label: 'Kalshi Scout readiness smoke pattern',
    role: 'prove deploy and release freshness',
    cueforgeUse: [
      'Audio Command Center reachability',
      'Setup Journey handoff',
      'Auto Detect mock proof',
      'desktop bridge API smoke',
      'export packet schema checks'
    ],
    commands: [
      'npm.cmd run build',
      'npm.cmd run test:playwright:web',
      'npm.cmd run desktop:dir',
      'npm.cmd run test:desktop-smoke',
      'npm.cmd run qa:release-readiness'
    ],
    trigger: 'PR, push, release candidate, tag',
    artifacts: [
      'docs/repair/RELEASE_READINESS.md',
      'docs/repair/VIRTUAL_MACHINE_PLAYER_LAB.md',
      'qa/playwright/report'
    ],
    guardrails: [
      'fail stale build metadata',
      'fail broken first window',
      'fail missing bridge API',
      'fail unredacted exports'
    ]
  },
  {
    id: companionIntegrationIds.feedbackAutomation,
    label: 'Feedback Automation triage backend pattern',
    role: 'turn tester packets into reviewed work',
    cueforgeUse: [
      'ingest redacted player trial packets',
      'cluster Panda Notes and issue reports',
      'prioritize repeatable failures',
      'draft GitHub issue/task output',
      'hold fixes behind approval'
    ],
    commands: [
      'npm.cmd run qa:feedback-contract',
      'npm.cmd run notes:repair'
    ],
    trigger: 'after each tester wave closes',
    artifacts: [
      'docs/repair/FEEDBACK_CONTRACT.md',
      'docs/repair/PANDA_NOTES_REPAIR_PACKET.txt'
    ],
    guardrails: [
      'redacted packets only',
      'approval queue before source edits',
      'no auto-deploy',
      'no raw audio upload',
      'no private account data'
    ]
  },
  {
    id: companionIntegrationIds.cryptoIntelligence,
    label: 'Crypto Intelligence snapshot contract pattern',
    role: 'publish a stable local setup-assessment snapshot',
    cueforgeUse: [
      'one setup assessment object for UI, lab runner, and future integrations',
      'localStorage snapshot for replay',
      'window object for local probes',
      'namespaced browser event for decoupled listeners'
    ],
    commands: [],
    trigger: 'after Auto Detect, readiness, profile, or report generation changes',
    artifacts: [
      SETUP_ASSESSMENT_STORAGE_KEY,
      `window.${SETUP_ASSESSMENT_WINDOW_KEY}`,
      SETUP_ASSESSMENT_EVENT
    ],
    guardrails: [
      'summary-only public data',
      'no raw device IDs',
      'no raw Windows paths',
      'no account identifiers',
      'raw audio stays local and excluded'
    ]
  }
];

const forbiddenActionPatterns = [
  /post(ing)?\s+to\s+(x|twitter|reddit|discord)/i,
  /change\s+windows\s+(routing|defaults?|settings)/i,
  /install\s+(driver|apo)/i,
  /write\s+apo/i,
  /upload\s+raw\s+audio/i,
  /password|recovery\s+code|phone\s+number|date\s+of\s+birth|dob/i
];

export function getCompanionIntegration(id) {
  return companionIntegrations.find((integration) => integration.id === id) || null;
}

export function buildCompanionIntegrationPlan({
  include = Object.values(companionIntegrationIds),
  stage = 'v0.2.0-alpha.3'
} = {}) {
  const selected = companionIntegrations.filter((integration) => include.includes(integration.id));
  const commands = [...new Set(selected.flatMap((integration) => integration.commands))];
  const artifacts = [...new Set(selected.flatMap((integration) => integration.artifacts))];
  const guardrails = [...new Set(selected.flatMap((integration) => integration.guardrails))];

  return {
    schema: 'cueforge.companion-integration-plan.v1',
    stage,
    integrations: selected,
    runOrder: [
      companionIntegrationIds.cryptoIntelligence,
      companionIntegrationIds.feedbackAutomation,
      companionIntegrationIds.autobot,
      companionIntegrationIds.kalshiScout
    ].filter((id) => include.includes(id)),
    commands,
    artifacts,
    guardrails,
    boundary: 'Companion repo patterns may orchestrate proof and triage. They must not post publicly, change Windows audio state, write APO configs, upload raw audio, or handle private account data.'
  };
}

export function buildMaintenanceRunPlan({
  nightly = true,
  routeGraphEnabled = false,
  releaseCandidate = false
} = {}) {
  const jobs = [
    {
      id: 'notes-repair',
      command: 'npm.cmd run notes:repair',
      required: true,
      reason: 'Pull exported Panda Notes and redacted reports into a repair queue.'
    },
    {
      id: 'feedback-contract',
      command: 'npm.cmd run qa:feedback-contract',
      required: true,
      reason: 'Prove tester packets stay schema-safe and redacted.'
    },
    {
      id: 'audio-fixture-regression',
      command: 'npm.cmd run qa:audio-fixture-regression',
      required: nightly || releaseCandidate,
      reason: 'Prove loudness, spectral, clipping, and phase thresholds still hold.'
    },
    {
      id: 'route-graph-lab',
      command: 'npm.cmd run qa:route-graph-lab',
      required: Boolean(routeGraphEnabled),
      reason: 'Use the local Windows lab machine to prove active endpoints and chain graph evidence.'
    },
    {
      id: 'release-readiness',
      command: 'npm.cmd run qa:release-readiness',
      required: Boolean(releaseCandidate),
      reason: 'Check version metadata, docs bundle, and upstream job status before release.'
    }
  ];

  return {
    schema: 'cueforge.maintenance-run-plan.v1',
    nightly,
    releaseCandidate,
    routeGraphEnabled,
    jobs,
    commands: jobs.filter((job) => job.required).map((job) => job.command),
    safety: {
      readOnly: true,
      canPostPublicly: false,
      canModifyWindowsAudio: false,
      canWriteApoConfig: false,
      rawAudioUpload: false
    }
  };
}

export function validateCompanionIntegrationPlan(plan = {}) {
  const issues = [];
  const boundary = String(plan.boundary || '').toLowerCase();

  if (plan.schema !== 'cueforge.companion-integration-plan.v1') {
    issues.push('Companion integration plan schema mismatch.');
  }
  if (!Array.isArray(plan.integrations) || plan.integrations.length < 4) {
    issues.push('Plan should include Autobot, Kalshi Scout, Feedback Automation, and Crypto Intelligence patterns.');
  }
  if (!plan.guardrails?.includes('no raw audio upload')) {
    issues.push('Plan must preserve the no raw audio upload guardrail.');
  }
  ['must not post', 'change windows audio', 'write apo', 'upload raw audio', 'private account data'].forEach((phrase) => {
    if (!boundary.includes(phrase)) {
      issues.push(`Boundary must mention: ${phrase}.`);
    }
  });
  if (!boundary) {
    issues.push('Boundary must clearly block public posting, Windows audio changes, APO writes, raw audio upload, and private account data.');
  }
  for (const command of plan.commands || []) {
    if (forbiddenActionPatterns.some((pattern) => pattern.test(command))) {
      issues.push(`Unsafe companion command: ${command}`);
    }
  }

  return {
    ok: issues.length === 0,
    issues
  };
}
