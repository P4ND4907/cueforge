export const releaseToolRecommendations = {
  required: 'required',
  primary: 'primary',
  fallback: 'fallback',
  optional: 'optional',
  sceneLabOnly: 'scene-lab-only'
};

export const releaseToolCandidates = [
  {
    id: 'wasapi-loopback',
    name: 'WASAPI loopback',
    bestUse: 'Measure the actual Windows render mix from the active endpoint.',
    recommendation: releaseToolRecommendations.required,
    implementationLane: 'windows-lab-proof',
    releaseStage: 'v0.3-native-dsp-sandbox',
    proofGates: [
      'Loopback capture requires explicit player action.',
      'Capture windows are short, bounded, and local.',
      'Protected playback or DRM-constrained streams are reported as unsupported instead of promised.',
      'Route proof links back to Chain Graph endpoint confidence.'
    ],
    blockedUses: [
      'No hidden desktop recording.',
      'No claim of universal capture for protected streams.',
      'No route or default-device changes.'
    ],
    source: {
      label: 'Microsoft WASAPI loopback recording',
      url: 'https://learn.microsoft.com/en-us/windows/win32/coreaudio/loopback-recording'
    }
  },
  {
    id: 'miniaudio',
    name: 'miniaudio',
    bestUse: 'Native helper for device I/O, loopback, full-duplex harness, and an internal node graph.',
    recommendation: releaseToolRecommendations.primary,
    implementationLane: 'native-engine',
    releaseStage: 'v0.3-native-dsp-sandbox',
    proofGates: [
      'Imports CueForge engine manifests.',
      'Renders offline test WAVs before live preview.',
      'Exercises PEQ, limiter, and latency fixtures.',
      'Live modes stay opt-in, bounded, and read-only.'
    ],
    blockedUses: [
      'Not a system-wide engine in v0.3.',
      'No driver install.',
      'No unattended capture.'
    ],
    source: {
      label: 'miniaudio manual',
      url: 'https://miniaud.io/docs/manual/index.html'
    }
  },
  {
    id: 'portaudio',
    name: 'PortAudio',
    bestUse: 'Portable stream/device abstraction with timing and latency information.',
    recommendation: releaseToolRecommendations.fallback,
    implementationLane: 'native-benchmark-reference',
    releaseStage: 'v0.3-native-dsp-sandbox',
    proofGates: [
      'Benchmark device enumeration against miniaudio.',
      'Record latency and stream timing differences.',
      'Use the same manifest and safety validation as the primary backend.'
    ],
    blockedUses: [
      'Not the primary engine unless miniaudio fails a required proof gate.',
      'No separate safety bypass.',
      'No hidden capture.'
    ],
    source: {
      label: 'PortAudio API overview',
      url: 'https://www.portaudio.com/docs/v19-doxydocs/api_overview.html'
    }
  },
  {
    id: 'rtaudio',
    name: 'RtAudio',
    bestUse: 'Lightweight common realtime I/O layer with device probing and multi-API support.',
    recommendation: releaseToolRecommendations.fallback,
    implementationLane: 'native-cpp-secondary',
    releaseStage: 'v0.3-native-dsp-sandbox',
    proofGates: [
      'Compare C++ integration complexity against miniaudio.',
      'Benchmark device probing and latency reporting.',
      'Keep under the same bounded capture and no-system-write rules.'
    ],
    blockedUses: [
      'Not the primary engine unless it proves simpler and safer.',
      'No route changes.',
      'No anti-cheat-adjacent hooks.'
    ],
    source: {
      label: 'RtAudio GitHub',
      url: 'https://github.com/thestk/rtaudio'
    }
  },
  {
    id: 'rnnoise',
    name: 'RNNoise',
    bestUse: 'Optional mic-path denoise baseline for comms testing.',
    recommendation: releaseToolRecommendations.optional,
    implementationLane: 'mic-enhancement',
    releaseStage: 'v0.6-mic-enhancement-pack',
    proofGates: [
      'Denoise comparison requires explicit opt-in.',
      'Voice presence improves or the recommendation backs off.',
      'Clip risk does not increase.',
      'Raw mic audio stays local by default.'
    ],
    blockedUses: [
      'No hidden always-on mic processing.',
      'No silent Discord or Windows gain changes.',
      'No cloud mic upload by default.'
    ],
    source: {
      label: 'RNNoise GitHub',
      url: 'https://github.com/xiph/rnnoise'
    }
  },
  {
    id: 'ffmpeg-libebur128',
    name: 'FFmpeg + libebur128',
    bestUse: 'Regression metrics, loudness, peak, phase, correlation, and lab analysis.',
    recommendation: releaseToolRecommendations.required,
    implementationLane: 'ci-audio-metrics',
    releaseStage: 'v0.3-native-dsp-sandbox',
    proofGates: [
      'CI can run or skip with a clear missing-tool report.',
      'Loudness and peak checks match CueForge JS fallback thresholds.',
      'Phase, correlation, and channel health checks feed redacted reports.',
      'Metrics export summaries, not raw audio, by default.'
    ],
    blockedUses: [
      'No raw audio upload in CI artifacts.',
      'No release claim when reference metrics are missing.',
      'No replacing player safety clamps with loudness normalization.'
    ],
    source: {
      label: 'FFmpeg filters documentation',
      url: 'https://ffmpeg.org/ffmpeg-filters.html'
    },
    companionSource: {
      label: 'libebur128 GitHub',
      url: 'https://github.com/jiixyj/libebur128'
    }
  },
  {
    id: 'playwright',
    name: 'Playwright',
    bestUse: 'Browser and Electron E2E/smoke testing, traces, reports, and CI.',
    recommendation: releaseToolRecommendations.required,
    implementationLane: 'automation',
    releaseStage: 'v0.2-hardening',
    proofGates: [
      'Guided flow is visible and actionable on first run.',
      'Visual baselines cover Command Center, Auto Detect, Player Trial, and compact layouts.',
      'Electron smoke covers preload/API exposure.',
      'Reports include trace or screenshot artifacts when a UI bug is reproduced.'
    ],
    blockedUses: [
      'No broad screenshot updates without review.',
      'No flaky dynamic meter baselines.',
      'No public social automation through test code.'
    ],
    source: {
      label: 'Playwright screenshots',
      url: 'https://playwright.dev/docs/test-snapshots'
    }
  },
  {
    id: 'puppeteer',
    name: 'Puppeteer',
    bestUse: 'Small Chromium-only probes or developer scripts.',
    recommendation: releaseToolRecommendations.optional,
    implementationLane: 'developer-probes',
    releaseStage: 'v0.2-hardening',
    proofGates: [
      'Used only when a lightweight Chromium probe is simpler than a full Playwright test.',
      'Does not duplicate primary E2E coverage.',
      'No hidden account or social automation.'
    ],
    blockedUses: [
      'Not the primary automation framework.',
      'No bypassing Playwright CI gates.',
      'No scraping or posting automation without explicit user review.'
    ],
    source: {
      label: 'Puppeteer documentation',
      url: 'https://pptr.dev/'
    }
  },
  {
    id: 'steam-audio',
    name: 'Steam Audio',
    bestUse: 'Synthetic lab scenes and partner/game-engine experiments.',
    recommendation: releaseToolRecommendations.sceneLabOnly,
    implementationLane: 'spatial-research',
    releaseStage: 'v0.7-spatial-research-pack',
    proofGates: [
      'Scene lab is labeled experimental.',
      'Player UI says mixed stereo cannot reveal true object-level occlusion.',
      'Any true spatial claim requires game or middleware integration evidence.',
      'No exact enemy-position promise.'
    ],
    blockedUses: [
      'No arbitrary-game post-mix occlusion claims.',
      'No game memory reads.',
      'No anti-cheat-adjacent hooks.'
    ],
    source: {
      label: 'Steam Audio documentation',
      url: 'https://valvesoftware.github.io/steam-audio/'
    }
  }
];

export const releaseImplementationBacklog = [
  {
    stage: 'v0.2-hardening',
    goal: 'Keep the app testable and release-safe while the native lab is still being designed.',
    toolIds: ['playwright', 'puppeteer'],
    deliverables: [
      'Playwright guided-flow and compact-layout checks.',
      'Optional Chromium-only probes for small developer diagnostics.',
      'No account, social, or hidden browser automation in release gates.'
    ]
  },
  {
    stage: 'v0.3-native-dsp-sandbox',
    goal: 'Prove offline rendering, measured loopback, and audio metrics before real-time preview.',
    toolIds: ['wasapi-loopback', 'miniaudio', 'portaudio', 'rtaudio', 'ffmpeg-libebur128'],
    deliverables: [
      'miniaudio offline WAV renderer and PEQ/limiter proof.',
      'Explicit WASAPI loopback measurement spike.',
      'FFmpeg/libebur128 reference metric path with JS fallback comparison.',
      'PortAudio and RtAudio benchmark notes only if miniaudio hits a blocker.'
    ]
  },
  {
    stage: 'v0.4-desktop-real-time-preview',
    goal: 'Let players hear reversible A/B processing through CueForge without installing drivers.',
    toolIds: ['wasapi-loopback', 'miniaudio', 'playwright'],
    deliverables: [
      'Manifest-controlled A/B preview.',
      'Latency readout and bypass-safe failure mode.',
      'Electron smoke coverage for the native bridge.'
    ]
  },
  {
    stage: 'v0.6-mic-enhancement-pack',
    goal: 'Add explicit, local mic cleanup comparison without changing Discord or Windows settings.',
    toolIds: ['rnnoise', 'ffmpeg-libebur128'],
    deliverables: [
      'Opt-in RNNoise comparison lane.',
      'Before/after noise-floor and voice-presence metrics.',
      'Discord-safe recommendation text.'
    ]
  },
  {
    stage: 'v0.7-spatial-research-pack',
    goal: 'Explore spatial scene labs honestly without claiming post-mix game-object intelligence.',
    toolIds: ['steam-audio'],
    deliverables: [
      'Synthetic scene lab only.',
      'Game/middleware integration notes.',
      'UI warning for mixed-stereo spatial limits.'
    ]
  }
];

export function getReleaseToolCandidate(id) {
  return releaseToolCandidates.find((tool) => tool.id === id) || null;
}

export function getReleaseToolsByRecommendation(recommendation) {
  return releaseToolCandidates.filter((tool) => tool.recommendation === recommendation);
}

export function buildReleaseImplementationBacklog() {
  return releaseImplementationBacklog.map((stage) => ({
    ...stage,
    tools: stage.toolIds.map(getReleaseToolCandidate).filter(Boolean)
  }));
}

export function validateReleaseToolBacklog(tools = releaseToolCandidates, backlog = releaseImplementationBacklog) {
  const issues = [];
  const ids = new Set(tools.map((tool) => tool.id));

  for (const tool of tools) {
    if (!tool.id || !tool.name || !tool.bestUse || !tool.recommendation) {
      issues.push(`${tool.id || 'unknown'} is missing required candidate fields.`);
    }
    if (!tool.proofGates?.length) issues.push(`${tool.id} is missing proof gates.`);
    if (!tool.blockedUses?.length) issues.push(`${tool.id} is missing blocked uses.`);
    if (!tool.source?.url) issues.push(`${tool.id} is missing an official source URL.`);
  }

  for (const stage of backlog) {
    if (!stage.stage || !stage.goal) issues.push('A release stage is missing a stage or goal.');
    for (const toolId of stage.toolIds || []) {
      if (!ids.has(toolId)) issues.push(`${stage.stage} references unknown tool ${toolId}.`);
    }
  }

  const requiredIds = getReleaseToolsByRecommendation(releaseToolRecommendations.required).map((tool) => tool.id);
  ['wasapi-loopback', 'ffmpeg-libebur128', 'playwright'].forEach((requiredId) => {
    if (!requiredIds.includes(requiredId)) issues.push(`${requiredId} must be marked required.`);
  });

  const miniaudio = getReleaseToolCandidate('miniaudio');
  if (miniaudio?.recommendation !== releaseToolRecommendations.primary) {
    issues.push('miniaudio must remain the primary native engine choice.');
  }

  const puppeteer = getReleaseToolCandidate('puppeteer');
  if (puppeteer?.recommendation !== releaseToolRecommendations.optional || !puppeteer.blockedUses.join(' ').includes('Not the primary')) {
    issues.push('puppeteer must stay optional and not primary.');
  }

  const steamAudioBoundary = getReleaseToolCandidate('steam-audio')?.blockedUses.join(' ').toLowerCase() || '';
  if (!steamAudioBoundary.includes('post-mix') || !steamAudioBoundary.includes('game memory')) {
    issues.push('steam-audio must stay scene-lab only with post-mix and game-memory boundaries.');
  }

  return {
    ok: issues.length === 0,
    issues
  };
}

export function summarizeReleaseToolBacklog() {
  const required = getReleaseToolsByRecommendation(releaseToolRecommendations.required).map((tool) => tool.id);
  const primary = getReleaseToolsByRecommendation(releaseToolRecommendations.primary).map((tool) => tool.id);
  const optional = getReleaseToolsByRecommendation(releaseToolRecommendations.optional).map((tool) => tool.id);

  return {
    schema: 'cueforge.release-tool-backlog.v1',
    candidateCount: releaseToolCandidates.length,
    required,
    primary,
    optional,
    stageCount: releaseImplementationBacklog.length,
    validation: validateReleaseToolBacklog()
  };
}
