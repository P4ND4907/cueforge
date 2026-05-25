export const releaseShipBars = [
  {
    version: 'v0.2.0',
    theme: 'Foundations',
    minimumShipBar: [
      'Setup Command Center is the default landing surface.',
      'Feature modules are extracted enough that new work does not keep inflating the app shell.',
      'Playwright web smoke is release-blocking.',
      'Electron smoke is release-blocking.',
      'Hardware profile manifests exist and validate.',
      'Route graph schema exists and is consumed by detection, readiness, and reports.'
    ],
    proofGates: [
      'default-guided-flow',
      'feature-module-extraction',
      'playwright-web-smoke',
      'electron-smoke',
      'hardware-profile-manifests',
      'route-graph-schema'
    ]
  },
  {
    version: 'v0.3.0',
    theme: 'Proof',
    minimumShipBar: [
      'WASAPI loopback helper is live behind explicit local permission.',
      'FFmpeg/libebur128 regression job is live or reports a documented missing-tool fallback.',
      'Conflict detector is live and wired into the guided assessment.',
      'Latency tests are live.',
      'Phase and stereo-health tests are live.',
      'Feedback ingestion is wired for redacted tester packets.'
    ],
    proofGates: [
      'wasapi-loopback-helper',
      'ffmpeg-libebur128-regression',
      'conflict-detector-live',
      'latency-tests',
      'phase-tests',
      'feedback-ingestion'
    ]
  },
  {
    version: 'v0.4.0',
    theme: 'Production readiness',
    minimumShipBar: [
      'Nightly Machine Play Lab runs on real Windows hardware.',
      'Release gating is enforced before public builds.',
      'Swarm manifests are checked in and validated.',
      'Redaction is audited as a release blocker.',
      'User-facing assessment summaries are trustworthy and explain confidence, warnings, and next action.'
    ],
    proofGates: [
      'nightly-machine-play-lab',
      'release-gating-enforced',
      'swarm-manifests-checked-in',
      'redaction-audited',
      'trustworthy-assessment-summaries'
    ]
  }
];

export function getReleaseShipBar(version) {
  const normalized = String(version || '').startsWith('v') ? version : `v${version}`;
  return releaseShipBars.find((bar) => bar.version === normalized) || null;
}

export function summarizeReleaseShipBars(proof = {}) {
  const releases = releaseShipBars.map((bar) => {
    const missingProof = bar.proofGates.filter((gate) => !proof[gate]);
    return {
      ...bar,
      proofReady: missingProof.length === 0,
      missingProof
    };
  });

  return {
    schema: 'cueforge.release-ship-bars.v1',
    releaseCount: releases.length,
    releases,
    nextBlockedRelease: releases.find((bar) => !bar.proofReady) || null,
    allReady: releases.every((bar) => bar.proofReady)
  };
}

export function validateReleaseShipBars(bars = releaseShipBars) {
  const issues = [];
  const expectedVersions = ['v0.2.0', 'v0.3.0', 'v0.4.0'];
  const expectedThemes = ['Foundations', 'Proof', 'Production readiness'];

  if (bars.map((bar) => bar.version).join(',') !== expectedVersions.join(',')) {
    issues.push('Release ship bars must stay ordered v0.2.0 -> v0.3.0 -> v0.4.0.');
  }
  if (bars.map((bar) => bar.theme).join(',') !== expectedThemes.join(',')) {
    issues.push('Release themes must stay Foundations, Proof, Production readiness.');
  }

  bars.forEach((bar) => {
    if (!bar.minimumShipBar?.length) issues.push(`${bar.version} is missing a minimum ship bar.`);
    if (!bar.proofGates?.length) issues.push(`${bar.version} is missing proof gates.`);
    if (bar.minimumShipBar.length !== bar.proofGates.length) {
      issues.push(`${bar.version} ship bar and proof gate counts should match.`);
    }
  });

  const v020 = getReleaseShipBar('v0.2.0');
  const v030 = getReleaseShipBar('v0.3.0');
  const v040 = getReleaseShipBar('v0.4.0');

  if (!v020?.minimumShipBar.some((item) => /Setup Command Center/.test(item))) {
    issues.push('v0.2.0 must require Setup Command Center as the default surface.');
  }
  if (!v030?.minimumShipBar.some((item) => /WASAPI loopback/.test(item))) {
    issues.push('v0.3.0 must require WASAPI loopback proof.');
  }
  if (!v040?.minimumShipBar.some((item) => /Swarm manifests/.test(item))) {
    issues.push('v0.4.0 must require checked-in swarm manifests.');
  }
  if (!v040?.minimumShipBar.some((item) => /Redaction/.test(item))) {
    issues.push('v0.4.0 must require redaction audit.');
  }

  return {
    ok: issues.length === 0,
    issues
  };
}
