export const releaseTargets = [
  {
    id: 'alpha-2-hardening',
    label: 'Alpha 2 hardening',
    testerTarget: 5,
    theme: 'Make the first tester loop boringly reliable.',
    ship: [
      'Setup summary that testers can copy without cleanup',
      'Permission recovery for blocked mic/device states',
      'Panda Notes inbox and fix packets',
      'Privacy export audit across reports, packets, and packs'
    ],
    qol: [
      'Plain next-step copy on every blocked state',
      'One-click copy for setup, report, and Discord check-in text',
      'Clear fixed/needs-retest labels for UI notes'
    ],
    automation: [
      'Responsive smoke harness for the main pages',
      'Release proof check before public update drafts',
      'Daily social drafts pull from app progress and watchlist signals'
    ],
    proof: ['selfTest', 'privacyAudit', 'uiNotesReviewed', 'publicBuild'],
    releaseWhen: '5 real testers can complete setup, one match check-in, and one report without direct help.'
  },
  {
    id: 'alpha-3-evidence',
    label: 'Alpha 3 evidence loop',
    testerTarget: 10,
    theme: 'Turn real sessions into useful evidence.',
    ship: [
      'WAV import UI for local clip analysis',
      'Analyzer-to-EQ preview before applying changes',
      'Issue Pattern Memory for recurring setup, mic, routing, and game-session problems',
      'Game/session diagnosis tags in check-ins and reports',
      'Redacted tester packet improvements'
    ],
    qol: [
      'Drop a clip, read the result, choose apply or ignore',
      'Separate tuning, game mix, server timing, Discord, routing, and mic gain',
      'Show what changed since the last build'
    ],
    automation: [
      'Golden WAV benchmark runner',
      'Pattern memory proof from repeated local reports and Panda Notes',
      'False-positive and latency summary',
      'Auto-generated update notes from completed proof gates'
    ],
    proof: ['wavBenchmarks', 'reportReplay', 'eqPreview', 'patternMemory', 'latencyCheck'],
    releaseWhen: '10 tester packets include at least 3 gear chains and 3 imported/replayed reports.'
  },
  {
    id: 'beta-1-desktop',
    label: 'Beta 1 desktop proof',
    testerTarget: 25,
    theme: 'Make native setup safer than manual tinkering.',
    ship: [
      'Packaged desktop shell smoke-tested on Windows',
      'Native bridge scan from inside CueForge',
      'Explicit APO draft folder and backup/undo design',
      'Performance mode validation during gameplay'
    ],
    qol: [
      'Desktop helper explains exactly what it reads and what it will not change',
      'One place to open APO drafts, reports, and setup summaries',
      'Low-overhead save mode with capped local history'
    ],
    automation: [
      'Desktop packaging proof gate',
      'Windows bridge scan fixture checks',
      'Performance budget smoke before release'
    ],
    proof: ['desktopSmoke', 'bridgeScan', 'performanceBudget', 'apoDraft'],
    releaseWhen: '25 testers, no critical first-run bugs, no known private-data leak, desktop bridge proof recorded.'
  },
  {
    id: 'beta-2-community',
    label: 'Beta 2 community loop',
    testerTarget: 50,
    theme: 'Make the community feedback loop self-sorting.',
    ship: [
      'Discord bot commands for start, check-in, bug, roles, and roll call',
      'Game-specific testing pages for Tarkov, Siege, COD, Apex, Valorant, and CS2',
      'Community signal tracker for Reddit, X, Discord, and GitHub',
      'Weekly digest built from real tester notes'
    ],
    qol: [
      'New players know exactly where to post each kind of feedback',
      'Mods can route bugs without reading every raw note',
      'Roadmap updates stay app-focused and human'
    ],
    automation: [
      'Comment/reply queue instead of mass posting',
      'Community memory sync',
      'Weekly signal summary draft'
    ],
    proof: ['discordBot', 'communityLedger', 'gamePages', 'weeklyDigest'],
    releaseWhen: '50 testers, 10 replayed reports, feedback from at least 5 FPS games.'
  },
  {
    id: 'public-candidate',
    label: 'Public 1.0 candidate',
    testerTarget: 100,
    theme: 'Make CueForge trustworthy for strangers.',
    ship: [
      'Stable privacy policy and known-limits page',
      'Polished docs site with screenshots matching the app',
      'Release notes generated from completed gates only',
      'Desktop/apply decision locked for the first public build'
    ],
    qol: [
      'A new player can open, test, export, and report without you nearby',
      'Every risky action has an undo, backup, or manual approval step',
      'No medical claims, no true-position overclaims, no hidden telemetry'
    ],
    automation: [
      'Full release checklist runner',
      'Docs screenshot freshness check',
      'Privacy redaction regression test'
    ],
    proof: ['releaseChecklist', 'docsFresh', 'privacyRegression', 'testerSuccessRate'],
    releaseWhen: '100 testers or 25 clean end-to-end packets with no critical app, privacy, or first-run failure.'
  }
];

export function buildReleaseProofState({
  selfTests = [],
  evidence = [],
  checkIns = [],
  snapshots = [],
  lastReport = null,
  uiNotes = [],
  desktopReady = false,
  privacyAuditPassed = false,
  publicBuildVerified = false,
  patternMemoryReady = false
} = {}) {
  const passedSelfTests = selfTests.filter((item) => item?.status === 'pass').length;
  const totalSelfTests = selfTests.length;
  const openUiNotes = uiNotes.filter((item) => !['reviewed', 'fixed', 'archived'].includes(item?.status)).length;

  return {
    selfTest: totalSelfTests > 0 && passedSelfTests === totalSelfTests,
    privacyAudit: Boolean(privacyAuditPassed),
    uiNotesReviewed: openUiNotes === 0,
    publicBuild: Boolean(publicBuildVerified),
    wavBenchmarks: evidence.length >= 3,
    reportReplay: Boolean(lastReport),
    eqPreview: false,
    patternMemory: Boolean(patternMemoryReady),
    latencyCheck: snapshots.length >= 3,
    desktopSmoke: Boolean(desktopReady),
    bridgeScan: Boolean(desktopReady),
    performanceBudget: snapshots.length >= 5,
    apoDraft: Boolean(desktopReady),
    discordBot: false,
    communityLedger: false,
    gamePages: false,
    weeklyDigest: false,
    releaseChecklist: false,
    docsFresh: false,
    privacyRegression: Boolean(privacyAuditPassed),
    testerSuccessRate: checkIns.length >= 25
  };
}

export function summarizeReleaseQueue({ testerCount = 0, proof = {} } = {}) {
  const normalizedTesterCount = Math.max(0, Number(testerCount) || 0);
  const enriched = releaseTargets.map((target) => {
    const missingProof = target.proof.filter((gate) => !proof[gate]);
    const targetMet = normalizedTesterCount >= target.testerTarget;
    return {
      ...target,
      targetMet,
      missingProof,
      proofReady: missingProof.length === 0,
      status: targetMet && missingProof.length === 0
        ? 'ready-to-release'
        : targetMet
          ? 'proof-needed'
          : 'queued'
    };
  });

  const current = enriched.find((target) => target.status !== 'ready-to-release') || enriched[enriched.length - 1];
  const nextReady = enriched.find((target) => target.status === 'ready-to-release');
  const nextQueued = enriched.find((target) => target.status === 'queued');
  const active = current || nextQueued || nextReady;

  return {
    testerCount: normalizedTesterCount,
    active,
    nextReady,
    completed: enriched.filter((target) => target.status === 'ready-to-release'),
    queued: enriched.filter((target) => target.status === 'queued'),
    proofNeeded: enriched.filter((target) => target.status === 'proof-needed'),
    targets: enriched,
    nextAction: buildNextReleaseAction(active)
  };
}

export function buildNextReleaseAction(target) {
  if (!target) return 'Keep collecting tester packets until a release target is selected.';
  if (!target.targetMet) {
    return `Collect ${target.testerTarget} total tester signal${target.testerTarget === 1 ? '' : 's'} before ${target.label}.`;
  }
  if (!target.proofReady) {
    return `Hold ${target.label} until proof gates pass: ${target.missingProof.join(', ')}.`;
  }
  return `${target.label} is ready to package, smoke-test, and publish.`;
}

export function buildReleaseUpdateDraft(summary) {
  const target = summary?.active;
  if (!target) return 'CueForge update queue is waiting for the next tester target.';

  return [
    `CueForge next build: ${target.label}`,
    '',
    target.theme,
    '',
    'Queued:',
    ...target.ship.map((item) => `- ${item}`),
    '',
    'Quality-of-life pass:',
    ...target.qol.map((item) => `- ${item}`),
    '',
    `Release rule: ${target.releaseWhen}`,
    '',
    `Current status: ${target.status}. ${buildNextReleaseAction(target)}`
  ].join('\n');
}
