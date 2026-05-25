export const nativeEngineRoadmap = [
  {
    version: 'v0.3.0',
    codename: 'Native DSP Sandbox',
    lane: 'sandbox',
    goal: 'Prove CueForge can import the engine manifest and render safe audio offline before any real-time or system-wide path exists.',
    deliverables: [
      'miniaudio prototype',
      'native capture/render harness contract',
      'PEQ processor',
      'limiter',
      'test WAV renderer',
      'explicit WASAPI loopback measurement spike',
      'device enumeration and full-duplex experiment plan',
      'latency experiments',
      'engine manifest import'
    ],
    proofGates: [
      'golden WAV render tests',
      'native harness request validation',
      'PEQ and limiter null/safety checks',
      'latency experiment report',
      'loopback capture remains explicit, bounded, and local',
      'no Windows routing or driver writes'
    ],
    blockedScope: [
      'no driver install',
      'no background service',
      'no live game capture requirement'
    ]
  },
  {
    version: 'v0.4.0',
    codename: 'Desktop Real-Time Preview',
    lane: 'preview',
    goal: 'Let a player hear A/B processing through the app without installing a driver or changing the system audio stack.',
    deliverables: [
      'local loopback or preview path',
      'NAudio sidecar evidence spike',
      'no driver install yet',
      'player-heard A/B through app',
      'manifest-controlled PEQ and limiter',
      'preview latency readout'
    ],
    proofGates: [
      'helper manifest validates before any UI consumes native evidence',
      'A/B preview is opt-in and reversible',
      'preview latency stays documented',
      'failure mode returns to silence-safe bypass',
      'no hidden routing changes'
    ],
    blockedScope: [
      'no system-wide apply engine',
      'no unattended capture',
      'no anti-cheat-adjacent hooks'
    ]
  },
  {
    version: 'v0.5.0',
    codename: 'Windows User-Mode Engine Path',
    lane: 'windows-user-mode',
    goal: 'Research the serious desktop path for low-latency Windows audio while keeping installer, signing, backup, and undo plans explicit.',
    deliverables: [
      'APO-like adapter research',
      'service-backed adapter research',
      'signed build planning',
      'installer hardening',
      'backup and rollback design'
    ],
    proofGates: [
      'threat model written',
      'installer rollback tested',
      'signing plan documented',
      'user approval required before every system-level change'
    ],
    blockedScope: [
      'no kernel-mode driver',
      'no unsigned public system modifier',
      'no silent APO or routing writes'
    ]
  },
  {
    version: 'v0.6.0',
    codename: 'Mic Enhancement Pack',
    lane: 'mic',
    goal: 'Add optional mic cleanup that respects Discord workflows and keeps raw mic audio local by default.',
    deliverables: [
      'RNNoise adapter',
      'Discord-safe mic profiles',
      'streamer mode',
      'input gain guard',
      'noise-floor before/after proof'
    ],
    proofGates: [
      'raw audio remains local by default',
      'noise suppression is opt-in',
      'clip risk does not increase',
      'Discord-safe profile notes are exported'
    ],
    blockedScope: [
      'no hidden gain changes',
      'no cloud mic processing by default',
      'no always-on recording'
    ]
  },
  {
    version: 'v0.7.0',
    codename: 'Spatial Research Pack',
    lane: 'spatial-research',
    goal: 'Explore spatial tools honestly without pretending a mixed stereo output contains true game-object positions.',
    deliverables: [
      'libmysofa HRTF loader',
      'Steam Audio research sandbox',
      'immersive mode experiments',
      'competitive width comparison',
      'scene-metadata integration notes'
    ],
    proofGates: [
      'UI warning for mixed-stereo limits',
      'competitive mode avoids fake surround by default',
      'research mode is labeled experimental',
      'no exact enemy-position claim'
    ],
    blockedScope: [
      'no magic surround claims',
      'no game-object occlusion claims without game metadata',
      'no anti-cheat hooks'
    ]
  },
  {
    version: 'v1.0.0',
    codename: 'Signed Public Beta',
    lane: 'public-beta',
    goal: 'Ship a trusted local-first desktop build with enough proof, support, and polish to be worth public beta pressure.',
    deliverables: [
      'paid-ready desktop build',
      'stable setup health',
      'real player testing',
      'trusted local-first release',
      'signed installer and release notes'
    ],
    proofGates: [
      'signed build verified',
      'setup health stable across tester cohorts',
      'privacy audit passes',
      'rollback and uninstall paths tested',
      'real player feedback closes the loop'
    ],
    blockedScope: [
      'no fake AI enemy-location claims',
      'no paid unlocks before support is ready',
      'no hidden telemetry'
    ]
  }
];

export const nativeEngineRoadmapPrinciples = [
  'Manifest first, processing second, system integration last.',
  'Offline DSP proof comes before real-time preview.',
  'Real-time preview comes before any system-wide apply path.',
  'Every native step needs visible approval, rollback, and proof.',
  'CueForge improves the final audio chain; it does not claim exact enemy positions without game-engine metadata.'
];

export function getNativeEngineMilestone(version) {
  return nativeEngineRoadmap.find((milestone) => milestone.version === version) || null;
}

export function nextNativeEngineMilestone(currentVersion = '0.2.0-alpha.3') {
  if (/^v?0\.2\./.test(currentVersion) || currentVersion.includes('0.2.0')) {
    return nativeEngineRoadmap[0];
  }

  const normalized = currentVersion.startsWith('v') ? currentVersion : `v${currentVersion}`;
  const currentIndex = nativeEngineRoadmap.findIndex((milestone) => milestone.version === normalized);
  if (currentIndex < 0) return nativeEngineRoadmap[0];
  return nativeEngineRoadmap[currentIndex + 1] || nativeEngineRoadmap[nativeEngineRoadmap.length - 1];
}

export function summarizeNativeEngineRoadmap({ currentVersion = '0.2.0-alpha.3', proof = {} } = {}) {
  const next = nextNativeEngineMilestone(currentVersion);
  const totalGates = nativeEngineRoadmap.reduce((total, milestone) => total + milestone.proofGates.length, 0);
  const completedGates = Object.values(proof).filter(Boolean).length;

  return {
    schema: 'cueforge.native-engine-roadmap.v1',
    currentVersion,
    next,
    milestoneCount: nativeEngineRoadmap.length,
    totalProofGates: totalGates,
    completedProofGates: Math.min(completedGates, totalGates),
    principles: nativeEngineRoadmapPrinciples,
    releaseLadder: nativeEngineRoadmap.map((milestone, index) => ({
      order: index + 1,
      version: milestone.version,
      codename: milestone.codename,
      lane: milestone.lane,
      goal: milestone.goal,
      deliverables: milestone.deliverables,
      proofGates: milestone.proofGates,
      blockedScope: milestone.blockedScope
    }))
  };
}
