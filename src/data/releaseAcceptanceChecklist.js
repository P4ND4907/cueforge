export const defaultReleaseCandidateEvidence = {
  setupCommandCenterDefault: true,
  autoDetectExplainsPresenceActiveConflicts: true,
  desktopNativeScanReadsBridge: true,
  webAndElectronSmokeAutomationPassed: true,
  realWindowsLoopbackRegressionPassed: false,
  redactedReportsNoRawPrivateData: true,
  apoDraftExplicitReversible: true,
  commonConflictRulesCovered: true,
  playerEvidenceLocalByDefault: true,
  buildMetadataVisible: true,
  releaseNotesHonestWindowsBoundary: true
};

export const commonConflictRuleRequirements = [
  'apo_plus_sonar',
  'sonar_plus_discord_effects',
  'voicemeeter_loop_echo_risk',
  'wrong_default_comms_endpoint'
];

export const openReleaseLimitations = [
  {
    id: 'windows-first-scope',
    title: 'Windows-first is intentional for the next release.',
    detail: 'CueForge is currently centered on WASAPI, APOs, Equalizer APO, PowerShell, and Electron. Core Audio plus PipeWire/ALSA parity can come later through the harness abstraction, but it is not the shortest path to a trustworthy Windows release.',
    releaseCopyRule: 'Say Windows-first, not cross-platform parity.'
  },
  {
    id: 'public-repo-visibility',
    title: 'Public files are the authoritative external baseline.',
    detail: 'Local QA assets, swarm checks, notes repair, and preflight reports may be ahead of GitHub main. Public reports should treat visible public files as authoritative and treat comments about private/local QA as directional until the files are pushed.',
    releaseCopyRule: 'Do not imply public users can inspect local-only QA assets.'
  },
  {
    id: 'post-mix-spatial-truth',
    title: 'Post-mix processing is not engine-native scene geometry.',
    detail: 'CueForge can verify and improve the final player chain, but true object-level occlusion, reflections, and geometry-aware propagation require game-engine or middleware integration. Steam Audio belongs in synthetic labs and future integrations, not arbitrary-game post-mix claims.',
    releaseCopyRule: 'Do not market arbitrary-game post-mix processing as engine-level occlusion.'
  }
];

export const releaseAcceptanceChecklist = [
  {
    id: 'setup-command-center-default',
    label: 'Setup Command Center is the default guided entry point.',
    evidenceKey: 'setupCommandCenterDefault',
    proof: 'Playwright web/Electron smoke lands first-run users in the guided command center.'
  },
  {
    id: 'autodetect-presence-active-conflicts',
    label: 'Auto Detect tells the user what is present, what is active, and what is conflicting.',
    evidenceKey: 'autoDetectExplainsPresenceActiveConflicts',
    proof: 'Normalized report, chain graph, confidence, risks, and next actions render from browser plus bridge evidence.'
  },
  {
    id: 'desktop-native-scan-bridge-report',
    label: 'Windows desktop shell can run a native scan and safely read the bridge report.',
    evidenceKey: 'desktopNativeScanReadsBridge',
    proof: 'Electron preload exposes only approved helper APIs and reads reports without changing system state.'
  },
  {
    id: 'web-electron-smoke',
    label: 'Web build and Electron build both pass smoke automation.',
    evidenceKey: 'webAndElectronSmokeAutomationPassed',
    proof: 'Playwright web smoke, Playwright Electron smoke, and packaged desktop smoke pass.'
  },
  {
    id: 'real-windows-loopback-regression',
    label: 'At least one real Windows loopback regression run passes.',
    evidenceKey: 'realWindowsLoopbackRegressionPassed',
    proof: 'A Windows endpoint loopback run, not only the deterministic fixture policy, proves cue lift, loudness, phase, and no clipping on real hardware.',
    hardBlocker: true
  },
  {
    id: 'redacted-reports-no-private-data',
    label: 'Redacted reports contain no raw device IDs, usernames, local paths, emails, or phone numbers.',
    evidenceKey: 'redactedReportsNoRawPrivateData',
    proof: 'Privacy audit, export redaction checks, report packs, setup packs, and evidence packets stay sanitized.'
  },
  {
    id: 'apo-draft-explicit-reversible',
    label: 'APO draft export is explicit and reversible.',
    evidenceKey: 'apoDraftExplicitReversible',
    proof: 'CueForge saves reviewed APO drafts only after user action and keeps real APO/system writes out of automatic flows.'
  },
  {
    id: 'common-conflict-rules-covered',
    label: 'Conflict rules catch the common messy Windows stacks.',
    evidenceKey: 'commonConflictRulesCovered',
    requiredRules: commonConflictRuleRequirements,
    proof: 'Rules cover APO + Sonar, Sonar + Discord effects, Voicemeeter loop/echo risk, and wrong default communications endpoint.'
  },
  {
    id: 'player-evidence-local-default',
    label: 'Player-trial and audio-evidence packets stay local by default.',
    evidenceKey: 'playerEvidenceLocalByDefault',
    proof: 'Packets export locally with opt-in sharing and summary metrics by default.'
  },
  {
    id: 'build-metadata-visible',
    label: 'Build metadata is visible enough to detect stale deploys.',
    evidenceKey: 'buildMetadataVisible',
    proof: 'Version metadata is checked in release readiness, release packs, and acceptance docs.'
  },
  {
    id: 'release-notes-honest-boundary',
    label: 'Release notes explain the Windows-first boundary and avoid arbitrary-game occlusion promises.',
    evidenceKey: 'releaseNotesHonestWindowsBoundary',
    proof: 'Release copy states the Windows-first chain-verification boundary and does not promise engine-level occlusion for arbitrary games.'
  }
];

export function evaluateReleaseCandidateAcceptance(evidence = {}) {
  const mergedEvidence = { ...defaultReleaseCandidateEvidence, ...evidence };
  const checks = releaseAcceptanceChecklist.map((item) => {
    const passed = mergedEvidence[item.evidenceKey] === true;
    return {
      ...item,
      status: passed ? 'PASS' : 'BLOCKED',
      detail: passed ? item.proof : `${item.label} Missing proof key: ${item.evidenceKey}.`
    };
  });
  const blockers = checks.filter((item) => item.status !== 'PASS');

  return {
    schema: 'cueforge.release-candidate-acceptance.v1',
    ready: blockers.length === 0,
    status: blockers.length ? 'BLOCKED' : 'PASS',
    generatedAt: new Date().toISOString(),
    checks,
    blockers,
    hardBlockers: blockers.filter((item) => item.hardBlocker === true)
  };
}

export function validateReleaseAcceptanceChecklist(items = releaseAcceptanceChecklist) {
  const issues = [];
  const ids = items.map((item) => item.id);
  const expectedIds = [
    'setup-command-center-default',
    'autodetect-presence-active-conflicts',
    'desktop-native-scan-bridge-report',
    'web-electron-smoke',
    'real-windows-loopback-regression',
    'redacted-reports-no-private-data',
    'apo-draft-explicit-reversible',
    'common-conflict-rules-covered',
    'player-evidence-local-default',
    'build-metadata-visible',
    'release-notes-honest-boundary'
  ];

  if (ids.join(',') !== expectedIds.join(',')) {
    issues.push('Release candidate acceptance checks must stay ordered and complete.');
  }

  items.forEach((item) => {
    if (!item.label?.trim()) issues.push(`${item.id} is missing player-facing wording.`);
    if (!item.evidenceKey?.trim()) issues.push(`${item.id} is missing an evidence key.`);
    if (!item.proof?.trim()) issues.push(`${item.id} is missing proof guidance.`);
  });

  const loopback = items.find((item) => item.id === 'real-windows-loopback-regression');
  if (!loopback?.hardBlocker) {
    issues.push('Real Windows loopback regression must remain a hard release-candidate blocker.');
  }

  const conflict = items.find((item) => item.id === 'common-conflict-rules-covered');
  const missingRules = commonConflictRuleRequirements.filter((rule) => !conflict?.requiredRules?.includes(rule));
  if (missingRules.length) {
    issues.push(`Common conflict coverage is missing: ${missingRules.join(', ')}.`);
  }

  return {
    ok: issues.length === 0,
    issues
  };
}

export function validateOpenReleaseLimitations(items = openReleaseLimitations) {
  const issues = [];
  const expectedIds = [
    'windows-first-scope',
    'public-repo-visibility',
    'post-mix-spatial-truth'
  ];

  if (items.map((item) => item.id).join(',') !== expectedIds.join(',')) {
    issues.push('Open release limitations must stay ordered and complete.');
  }

  items.forEach((item) => {
    if (!item.title?.trim()) issues.push(`${item.id} is missing a title.`);
    if (!item.detail?.trim()) issues.push(`${item.id} is missing detail.`);
    if (!item.releaseCopyRule?.trim()) issues.push(`${item.id} is missing release-copy guidance.`);
  });

  const windows = items.find((item) => item.id === 'windows-first-scope');
  if (!/WASAPI/.test(windows?.detail || '') || !/Core Audio/.test(windows?.detail || '') || !/PipeWire\/ALSA/.test(windows?.detail || '')) {
    issues.push('Windows-first limitation must name WASAPI now and Core Audio/PipeWire/ALSA as future backends.');
  }

  const visibility = items.find((item) => item.id === 'public-repo-visibility');
  if (!/visible public files/.test(visibility?.detail || '') || !/directional/.test(visibility?.detail || '')) {
    issues.push('Public-repo visibility limitation must separate authoritative public files from directional local QA comments.');
  }

  const spatial = items.find((item) => item.id === 'post-mix-spatial-truth');
  if (!/true object-level occlusion/.test(spatial?.detail || '') || !/game-engine or middleware integration/.test(spatial?.detail || '')) {
    issues.push('Spatial limitation must block post-mix object-occlusion claims without engine/middleware support.');
  }

  return {
    ok: issues.length === 0,
    issues
  };
}

export function validateReleaseNotesBoundary(copy = '') {
  const text = String(copy || '');
  const issues = [];

  if (!/Windows[- ]first|Windows/i.test(text)) {
    issues.push('Release notes must explain the Windows-first boundary.');
  }
  if (!/does not|cannot|requires game-engine support|without game-engine support|no engine-level/i.test(text)) {
    issues.push('Release notes must explain what CueForge does not claim.');
  }
  if (/guarantees?.{0,40}(occlusion|enemy position|wall|geometry)/i.test(text)) {
    issues.push('Release notes must not guarantee occlusion, enemy position, wall, or geometry inference.');
  }
  if (/exact enemy positions?|true object-level occlusion for arbitrary games/i.test(text)) {
    issues.push('Release notes must not promise exact enemy positions or arbitrary-game engine-level occlusion.');
  }

  return {
    ok: issues.length === 0,
    issues
  };
}
