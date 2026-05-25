export const openSourceStackTiers = {
  useNow: 'use-now',
  browserCore: 'browser-core',
  nextNativeStage: 'next-native-stage',
  differentiatedTier: 'differentiated-tier'
};

export const openSourceStack = [
  {
    id: 'equalizer-apo',
    name: 'Equalizer APO',
    tier: openSourceStackTiers.useNow,
    role: 'primary Windows output EQ target',
    useCase: 'Export readable APO configs and verify the endpoint before a player applies them.',
    integrationPath: [
      'Keep APO export as the primary system-EQ handoff.',
      'Use Chain Graph and Conflict Detector to verify the active endpoint.',
      'Warn when virtual routing may mean APO is installed on the wrong device.'
    ],
    proofGates: [
      'APO export text still validates.',
      'Sonar + APO endpoint mismatch produces a warning.',
      'No code path silently writes to real Equalizer APO config locations.'
    ],
    guardrails: [
      'Player applies or pastes the config explicitly.',
      'CueForge may save local drafts, not silently change system EQ.',
      'Endpoint uncertainty must be visible before match testing.'
    ],
    source: {
      label: 'Equalizer APO SourceForge',
      url: 'https://sourceforge.net/projects/equalizerapo/'
    }
  },
  {
    id: 'autoeq',
    name: 'AutoEq',
    tier: openSourceStackTiers.useNow,
    role: 'headphone and IEM baseline data companion',
    useCase: 'Seed hardware baselines before personal hearing, preference, and game-intent overlays take over.',
    integrationPath: [
      'Import or reference model baselines only when the player confirms the hardware.',
      'Blend baseline curves below hearing-model and Blind Match personalization.',
      'Track the source and target used in exported profile notes.'
    ],
    proofGates: [
      'Hardware baseline never overrides explicit player preference.',
      'Profile export labels baseline data separately from personal tuning.',
      'Unknown hardware falls back to safe generic profiles.'
    ],
    guardrails: [
      'Treat AutoEq as a starting point, not a final answer.',
      'Do not claim a measurement match unless the exact model/source is known.',
      'Clamp boosts through CueForge safety rules.'
    ],
    source: {
      label: 'AutoEq GitHub',
      url: 'https://github.com/jaakkopasanen/AutoEq'
    }
  },
  {
    id: 'playwright',
    name: 'Playwright',
    tier: openSourceStackTiers.useNow,
    role: 'default UI and visual regression layer',
    useCase: 'Catch the alignment, overflow, and flow bugs that functional checks miss.',
    integrationPath: [
      'Add guided-flow smoke tests for Command Center, Auto Detect, Chain Graph, and Player Trial.',
      'Use screenshot comparison for stable layout surfaces.',
      'Keep dynamic meters masked or tested with deterministic fixture states.'
    ],
    proofGates: [
      'No horizontal overflow on mobile, tablet, and desktop.',
      'Key command-center surfaces have screenshot baselines.',
      'Human-swarm notes trigger a matching Playwright regression when possible.'
    ],
    guardrails: [
      'Visual tests must use stable data states.',
      'Do not approve broad screenshot diffs without a reason.',
      'Functional assertions still cover buttons, exports, and state changes.'
    ],
    source: {
      label: 'Playwright visual comparisons',
      url: 'https://playwright.dev/docs/test-snapshots'
    }
  },
  {
    id: 'offline-audio-context',
    name: 'OfflineAudioContext',
    tier: openSourceStackTiers.browserCore,
    role: 'deterministic browser DSP render harness',
    useCase: 'Render repeatable browser-side audio fixtures faster than real time before touching live hardware.',
    integrationPath: [
      'Keep Masking Lab and signal-analysis fixtures deterministic.',
      'Use offline renders for before/after EQ and masking proof.',
      'Use JS fallback only when the test environment lacks Web Audio.'
    ],
    proofGates: [
      'Fixture renders are deterministic for a given seed.',
      'Masking fixture improves or explains why it did not.',
      'No fixture depends on a physical mic, headset, or Windows route.'
    ],
    guardrails: [
      'Offline proof is not a live latency claim.',
      'Offline fixture output must not imply true game-object positions.',
      'Live preview waits for native/browser processing proof.'
    ],
    source: {
      label: 'MDN OfflineAudioContext',
      url: 'https://developer.mozilla.org/en-US/docs/Web/API/OfflineAudioContext'
    }
  },
  {
    id: 'audio-worklet',
    name: 'AudioWorklet',
    tier: openSourceStackTiers.browserCore,
    role: 'future low-latency browser analyzer processor',
    useCase: 'Move live analyzer math off the UI path once the deterministic analyzer behavior is proven.',
    integrationPath: [
      'Prototype analyzer frame extraction in an AudioWorklet.',
      'Compare output against existing AnalyserNode and WAV fixture results.',
      'Expose failure states clearly when browser support or secure context is missing.'
    ],
    proofGates: [
      'AudioWorklet analyzer matches fixture expectations.',
      'UI thread load does not destabilize meter updates.',
      'Fallback path remains available for unsupported browsers.'
    ],
    guardrails: [
      'No autoplay or hidden capture.',
      'Tone and mic work still require direct player action.',
      'Browser worklet processing is not a system-wide audio engine.'
    ],
    source: {
      label: 'MDN AudioWorkletGlobalScope',
      url: 'https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletGlobalScope'
    }
  },
  {
    id: 'naudio',
    name: 'NAudio',
    tier: openSourceStackTiers.nextNativeStage,
    role: 'Windows-first helper candidate',
    useCase: 'Prototype endpoint, session, WASAPI loopback, FFT, and filter evidence in a small .NET sidecar.',
    integrationPath: [
      'Use only behind a versioned native helper manifest.',
      'Collect endpoint/session evidence before any DSP apply path.',
      'Compare loopback evidence against exported engine manifests.'
    ],
    proofGates: [
      'Helper manifest validates before UI consumes data.',
      'Loopback capture is explicit and local.',
      'Capabilities say canModifySystemState: false.'
    ],
    guardrails: [
      'No unattended capture.',
      'No route changes from the sidecar.',
      'No shipping dependency until installer, signing, and rollback are planned.'
    ],
    source: {
      label: 'NAudio GitHub',
      url: 'https://github.com/naudio/NAudio'
    }
  },
  {
    id: 'miniaudio',
    name: 'miniaudio',
    tier: openSourceStackTiers.nextNativeStage,
    role: 'portable native DSP sandbox candidate',
    useCase: 'Prototype playback, capture, full-duplex, device enumeration, WASAPI loopback measurement, offline rendering, PEQ, limiter, and latency experiments in a compact C backend.',
    integrationPath: [
      'Start in v0.3 Native DSP Sandbox.',
      'Import CueForge engine manifests and render test WAV outputs.',
      'Use WASAPI loopback only for explicit, bounded, local measurement on Windows.',
      'Use the high-level engine/node graph for internal DSP experiments before any public real-time path.',
      'Use it for proof before any real-time or system-wide path.'
    ],
    proofGates: [
      'Golden WAV renderer passes.',
      'PEQ and limiter safety checks pass.',
      'Harness request validation blocks hidden capture and system writes.',
      'Loopback captures remain explicit, bounded, and local.',
      'No Windows routing or driver writes.'
    ],
    guardrails: [
      'Not a public system-wide engine yet.',
      'No driver install.',
      'No unattended capture.',
      'Offline proof before real-time preview.'
    ],
    source: {
      label: 'miniaudio GitHub',
      url: 'https://github.com/mackron/miniaudio'
    }
  },
  {
    id: 'rnnoise',
    name: 'RNNoise',
    tier: openSourceStackTiers.nextNativeStage,
    role: 'opt-in mic noise diagnostic and cleanup candidate',
    useCase: 'Compare room/chain noise cleanup when the analyzer thinks noise is the likely mic problem.',
    integrationPath: [
      'Add as v0.6 Mic Enhancement Pack candidate.',
      'Use before/after metrics for noise floor, voice presence, and clip risk.',
      'Export Discord-safe suggestions instead of hidden processing.'
    ],
    proofGates: [
      'Noise suppression requires explicit opt-in.',
      'Raw audio remains local by default.',
      'Clip risk and voice clarity do not get worse.'
    ],
    guardrails: [
      'Not hidden always-on processing.',
      'Not cloud mic cleanup by default.',
      'Not allowed to change Discord or Windows gain silently.'
    ],
    source: {
      label: 'RNNoise GitHub',
      url: 'https://github.com/xiph/rnnoise'
    }
  },
  {
    id: 'steam-audio',
    name: 'Steam Audio',
    tier: openSourceStackTiers.differentiatedTier,
    role: 'game and middleware spatial research tier',
    useCase: 'Explore HRTF, occlusion, reflection, and propagation only when a game or SDK path can expose better spatial context.',
    integrationPath: [
      'Keep post-mix CueForge modes honest: Safe Stereo, Competitive Width, Immersive Preview.',
      'Reserve object occlusion and scene propagation for partner/game metadata paths.',
      'Document Unity, Unreal, FMOD, Wwise, and C API research separately from player EQ.'
    ],
    proofGates: [
      'Mixed-stereo UI warning is visible.',
      'No exact enemy-position claim.',
      'Game/middleware integration path is labeled experimental until proven.'
    ],
    guardrails: [
      'No post-mix true occlusion claim.',
      'No game memory reads or anti-cheat-adjacent hooks.',
      'No magic surround marketing.'
    ],
    source: {
      label: 'Steam Audio documentation',
      url: 'https://valvesoftware.github.io/steam-audio/'
    }
  }
];

export function getOpenSourceTool(id) {
  return openSourceStack.find((tool) => tool.id === id) || null;
}

export function getOpenSourceStackByTier(tier) {
  return openSourceStack.filter((tool) => tool.tier === tier);
}

export function getIntegrationPlan(id) {
  const tool = getOpenSourceTool(id);
  if (!tool) return null;

  return {
    id: tool.id,
    name: tool.name,
    tier: tool.tier,
    role: tool.role,
    useCase: tool.useCase,
    integrationPath: tool.integrationPath,
    proofGates: tool.proofGates,
    guardrails: tool.guardrails,
    source: tool.source
  };
}

export function validateOpenSourceBoundaries(stack = openSourceStack) {
  const issues = [];

  for (const tool of stack) {
    if (!tool.id || !tool.name || !tool.tier) {
      issues.push(`${tool.id || 'unknown'} is missing identity fields.`);
    }
    if (!tool.integrationPath?.length) {
      issues.push(`${tool.id} is missing integration steps.`);
    }
    if (!tool.proofGates?.length) {
      issues.push(`${tool.id} is missing proof gates.`);
    }
    if (!tool.guardrails?.length) {
      issues.push(`${tool.id} is missing guardrails.`);
    }
    if (!tool.source?.url) {
      issues.push(`${tool.id} is missing a source URL.`);
    }
  }

  const rnnoise = stack.find((tool) => tool.id === 'rnnoise');
  if (rnnoise && !rnnoise.guardrails.join(' ').toLowerCase().includes('not hidden always-on')) {
    issues.push('rnnoise must stay opt-in, not hidden always-on processing.');
  }

  const steamAudio = stack.find((tool) => tool.id === 'steam-audio');
  const steamBoundary = `${steamAudio?.guardrails.join(' ')} ${steamAudio?.proofGates.join(' ')}`.toLowerCase();
  if (steamAudio && (!steamBoundary.includes('post-mix') || !steamBoundary.includes('enemy-position'))) {
    issues.push('steam-audio must block post-mix occlusion and exact enemy-position claims.');
  }

  const equalizerApo = stack.find((tool) => tool.id === 'equalizer-apo');
  if (equalizerApo && !equalizerApo.guardrails.join(' ').toLowerCase().includes('silently change')) {
    issues.push('equalizer-apo must preserve the no-silent-system-change boundary.');
  }

  return {
    ok: issues.length === 0,
    issues
  };
}

export function summarizeOpenSourceStack(stack = openSourceStack) {
  const byTier = Object.values(openSourceStackTiers).reduce((acc, tier) => {
    acc[tier] = stack
      .filter((tool) => tool.tier === tier)
      .map((tool) => ({
        id: tool.id,
        name: tool.name,
        role: tool.role,
        proofGateCount: tool.proofGates.length
      }));
    return acc;
  }, {});

  return {
    schema: 'cueforge.open-source-stack.v1',
    toolCount: stack.length,
    tiers: byTier,
    boundaryCheck: validateOpenSourceBoundaries(stack)
  };
}
