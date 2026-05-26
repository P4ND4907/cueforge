const DESKTOP_PLAN_SCHEMA = 'cueforge.desktop-bridge-plan.v1';

export function buildDesktopBridgeFixPlan({
  desktopAvailable = false,
  desktopInfo = null,
  bridgeReport = null,
  packageReady = false
} = {}) {
  const bridgeLoaded = Boolean(bridgeReport);
  const status = desktopAvailable
    ? bridgeLoaded ? 'desktop-ready' : 'desktop-needs-scan'
    : packageReady ? 'install-desktop-build' : 'browser-needs-desktop';

  return {
    schema: DESKTOP_PLAN_SCHEMA,
    status,
    title: titleForStatus(status),
    summary: summaryForStatus(status, desktopInfo),
    warningIsExpected: !desktopAvailable,
    primaryOption: primaryOptionForStatus(status),
    fallbackOption: fallbackOptionForStatus(status),
    developerCommands: [
      'npm run desktop',
      'npm run desktop:dir',
      'npm run desktop:package'
    ],
    playerSteps: playerStepsForStatus(status),
    proofChecks: [
      'Self Test shows Desktop bridge availability: PASS',
      'Auto Detect can run Windows scan from inside CueForge',
      'Windows bridge report loads from app data',
      'Driver Layer can save an APO draft without touching real APO files',
      'Privacy Export Audit passes after bridge data is included'
    ],
    githubFoundation: [
      '.github/copilot-instructions.md',
      'docs/prompts/GITHUB_COPILOT_DESKTOP_FOUNDATION.md',
      'electron/main.mjs',
      'electron/preload.cjs',
      'tools/Scan-AudioSetup.ps1',
      'src/desktopBridgePlan.js'
    ],
    boundary: 'The browser warning is fixed by running CueForge as the desktop app. The web app should never silently bypass browser permission or run native Windows scans.'
  };
}

export function buildDesktopBridgeFixText(plan) {
  if (!plan || plan.schema !== DESKTOP_PLAN_SCHEMA) return 'CueForge desktop bridge plan\nStatus: unavailable';
  return [
    'CueForge desktop bridge fix plan',
    `Status: ${plan.status}`,
    '',
    plan.summary,
    '',
    'Developer commands:',
    ...plan.developerCommands.map((command) => `- ${command}`),
    '',
    'Player proof path:',
    ...plan.playerSteps.map((step, index) => `${index + 1}. ${step}`),
    '',
    'Proof checks:',
    ...plan.proofChecks.map((check) => `- ${check}`),
    '',
    `Boundary: ${plan.boundary}`
  ].join('\n');
}

function titleForStatus(status) {
  return {
    'desktop-ready': 'Desktop bridge is active',
    'desktop-needs-scan': 'Desktop bridge is open; run the Windows scan',
    'install-desktop-build': 'Install the desktop build to remove the browser scan limit',
    'browser-needs-desktop': 'Browser mode cannot run native Windows scans'
  }[status] || 'Desktop bridge status';
}

function summaryForStatus(status, desktopInfo) {
  if (status === 'desktop-ready') {
    return `Desktop shell is active and bridge data is loaded from ${desktopInfo?.reportPath || 'the CueForge app-data folder'}.`;
  }
  if (status === 'desktop-needs-scan') {
    return `Desktop shell is active. Run the Windows scan so CueForge can read local device/tool data from ${desktopInfo?.reportPath || 'the app-data bridge report'}.`;
  }
  if (status === 'install-desktop-build') {
    return 'Use the Windows desktop build for one-click setup scanning and safe APO draft exports.';
  }
  return 'Browser mode can test Web Audio and mic permission, but Windows device/tool scanning needs the CueForge desktop shell.';
}

function primaryOptionForStatus(status) {
  if (status === 'desktop-ready') {
    return {
      mode: 'refresh-desktop-scan',
      label: 'Refresh Windows scan',
      detail: 'Update local endpoint, APO, mixer, booster, Discord, and game-process evidence.'
    };
  }
  if (status === 'desktop-needs-scan') {
    return {
      mode: 'run-desktop-scan',
      label: 'Run Windows scan',
      detail: 'Read local endpoint and audio app evidence from the desktop shell.'
    };
  }
  return {
    mode: 'open-desktop',
    label: 'Use desktop app for full scan',
    detail: 'Open CueForge desktop when you want endpoint, APO, mixer, booster, Discord, and running-game evidence.'
  };
}

function fallbackOptionForStatus(status) {
  if (status === 'desktop-ready') {
    return {
      mode: 'use-loaded-report',
      label: 'Use loaded report',
      detail: 'Keep tuning with the Windows evidence already linked.'
    };
  }
  if (status === 'desktop-needs-scan') {
    return {
      mode: 'open-report-folder',
      label: 'Open report folder',
      detail: 'Check where the desktop app stores the local bridge report.'
    };
  }
  return {
    mode: 'browser-only',
    label: 'Continue browser-only',
    detail: 'Use mic permission, browser device names, and a lighter starter tune until the desktop app is available.'
  };
}

function playerStepsForStatus(status) {
  if (status === 'desktop-ready') {
    return [
      'Open Self Test and confirm Desktop bridge availability is green.',
      'Open Auto Detect and refresh the loaded Windows scan.',
      'Open Driver Layer and save an APO draft only if you want a reviewed local handoff.'
    ];
  }
  if (status === 'desktop-needs-scan') {
    return [
      'Open Auto Detect.',
      'Click Run Windows scan.',
      'Confirm the bridge report appears, then rerun Self Test.'
    ];
  }
  return [
    'Run `npm run desktop` while developing, or install the packaged Windows build.',
    'Open Auto Detect in the desktop app and click Run Windows scan.',
    'Rerun Self Test and confirm the desktop bridge warning is gone.'
  ];
}
