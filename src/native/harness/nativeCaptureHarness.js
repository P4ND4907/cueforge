const DEFAULT_SAMPLE_RATE = 48000;
const DEFAULT_BLOCK_SIZE = 128;
const MAX_CAPTURE_MS = 15000;
const PROTECTED_PLAYBACK_BOUNDARY = 'Windows loopback capture can be limited by DRM or protected playback paths. CueForge must not promise universal capture of protected streams.';

export const nativeHarnessBackends = [
  {
    id: 'miniaudio',
    priority: 1,
    role: 'primary embedded native lab helper',
    why: 'Compact C backend for playback, capture, full-duplex, device enumeration, WASAPI loopback, and a simple internal node graph.',
    capabilities: [
      'playback',
      'capture',
      'full-duplex',
      'device-enumeration',
      'wasapi-loopback',
      'offline-render',
      'node-graph'
    ],
    guardrails: [
      'explicit user action before live capture',
      'bounded capture windows',
      'local raw buffers only',
      'no driver install',
      'no routing or default-device writes'
    ]
  },
  {
    id: 'portaudio',
    priority: 2,
    role: 'portable fallback candidate',
    why: 'Mature cross-platform audio I/O fallback if miniaudio cannot cover a platform-specific test.',
    capabilities: ['playback', 'capture', 'full-duplex', 'device-enumeration'],
    guardrails: ['same manifest and request validation as miniaudio']
  },
  {
    id: 'rtaudio',
    priority: 3,
    role: 'small C++ fallback candidate',
    why: 'Useful alternate I/O wrapper for device and latency experiments if the embedded helper needs a C++ path.',
    capabilities: ['playback', 'capture', 'full-duplex', 'device-enumeration'],
    guardrails: ['same manifest and request validation as miniaudio']
  }
];

export const nativeHarnessModes = [
  {
    id: 'offline-render',
    label: 'Offline fixture render',
    liveInput: false,
    touchesHardware: false,
    purpose: 'Render test tones, PEQ, limiter, and fixture WAVs from the engine manifest.',
    requiredCapability: 'offline-render'
  },
  {
    id: 'wasapi-loopback-capture',
    label: 'WASAPI loopback capture',
    liveInput: true,
    touchesHardware: true,
    purpose: 'Measure the rendered Windows output path for A/B proof and routing verification.',
    requiredCapability: 'wasapi-loopback',
    platform: 'win32',
    protectedPlaybackBoundary: PROTECTED_PLAYBACK_BOUNDARY
  },
  {
    id: 'mic-capture',
    label: 'Mic capture',
    liveInput: true,
    touchesHardware: true,
    purpose: 'Measure local mic noise floor, clipping, and voice presence.',
    requiredCapability: 'capture'
  },
  {
    id: 'full-duplex-preview',
    label: 'Full-duplex preview',
    liveInput: true,
    touchesHardware: true,
    purpose: 'Preview manifest-controlled processing through the app without changing system routing.',
    requiredCapability: 'full-duplex'
  },
  {
    id: 'latency-probe',
    label: 'Latency probe',
    liveInput: true,
    touchesHardware: true,
    purpose: 'Estimate capture/render timing for future desktop preview work.',
    requiredCapability: 'full-duplex'
  }
];

function normalizePlatform(platform = process.platform) {
  return platform || 'unknown';
}

function modeById(modeId) {
  return nativeHarnessModes.find((mode) => mode.id === modeId) || null;
}

function miniaudioCapability(modeId, platform) {
  const mode = modeById(modeId);
  const miniaudio = nativeHarnessBackends[0];
  if (!mode) return false;
  if (mode.platform && mode.platform !== platform) return false;
  return miniaudio.capabilities.includes(mode.requiredCapability);
}

function helperCanLoopback(helperManifest = {}) {
  return helperManifest?.capabilities?.canReadLoopback === true;
}

export function buildNativeCaptureHarnessPlan({
  platform = process.platform,
  helperManifest = null,
  engineManifest = null
} = {}) {
  const normalizedPlatform = normalizePlatform(platform);
  const modes = nativeHarnessModes.map((mode) => ({
    ...mode,
    backend: 'miniaudio',
    available:
      miniaudioCapability(mode.id, normalizedPlatform) &&
      (mode.id !== 'wasapi-loopback-capture' || normalizedPlatform === 'win32'),
    requiresPlayerClick: mode.liveInput,
    requiresHelperCapability:
      mode.id === 'wasapi-loopback-capture' ? 'canReadLoopback' : null
  }));

  return {
    schema: 'cueforge.native-capture-harness.v1',
    version: '0.1',
    platform: normalizedPlatform,
    primaryBackend: 'miniaudio',
    alternatives: ['portaudio', 'rtaudio'],
    sampleRate: engineManifest?.sampleRate || DEFAULT_SAMPLE_RATE,
    blockSizeTarget: engineManifest?.blockSizeTarget || DEFAULT_BLOCK_SIZE,
    maxCaptureMs: MAX_CAPTURE_MS,
    modeCount: modes.length,
    modes,
    helperEvidence: {
      manifestPresent: Boolean(helperManifest),
      canReadLoopback: helperCanLoopback(helperManifest),
      canModifySystemState: helperManifest?.capabilities?.canModifySystemState === true
    },
    pipeline: [
      'import engine manifest',
      'enumerate devices',
      'require explicit player action for live capture',
      'render fixture or bounded capture window',
      'analyze metrics',
      'save redacted evidence packet'
    ],
    safety: {
      localFirst: true,
      explicitLiveCaptureOnly: true,
      persistRawAudioByDefault: false,
      uploadsOptInOnly: true,
      publicPacketsUseSummariesOnly: true,
      protectedPlaybackUniversalCapture: false,
      protectedPlaybackBoundary: PROTECTED_PLAYBACK_BOUNDARY,
      maxCaptureMs: MAX_CAPTURE_MS,
      canModifySystemState: false,
      canInstallDriver: false,
      canChangeDefaultDevice: false
    }
  };
}

export function buildNativeHarnessRequest({
  mode = 'offline-render',
  endpointId = null,
  endpointRole = 'playback',
  sampleRate = DEFAULT_SAMPLE_RATE,
  channels = 2,
  durationMs = 1000,
  userGesture = false,
  persistRawAudio = false,
  writeSystemState = false,
  reason = ''
} = {}) {
  return {
    schema: 'cueforge.native-harness-request.v1',
    mode,
    endpointId,
    endpointRole,
    sampleRate,
    channels,
    durationMs,
    userGesture,
    persistRawAudio,
    writeSystemState,
    reason
  };
}

export function validateNativeHarnessRequest(request = {}, {
  platform = process.platform,
  helperManifest = null
} = {}) {
  const errors = [];
  const warnings = [];
  const mode = modeById(request.mode);
  const normalizedPlatform = normalizePlatform(platform);

  if (request.schema !== 'cueforge.native-harness-request.v1') {
    errors.push('Wrong native harness request schema.');
  }
  if (!mode) {
    errors.push(`Unknown native harness mode: ${request.mode || 'missing'}.`);
  }
  if (mode?.platform && mode.platform !== normalizedPlatform) {
    errors.push(`${mode.label} requires ${mode.platform}; current platform is ${normalizedPlatform}.`);
  }
  if (mode?.liveInput && request.userGesture !== true) {
    errors.push(`${mode.label} requires an explicit player action before capture starts.`);
  }
  if (request.writeSystemState === true) {
    errors.push('Native harness requests cannot modify Windows routing, drivers, defaults, or APO configs.');
  }
  if (request.persistRawAudio === true) {
    warnings.push('Raw audio persistence must stay off by default and requires a separate export approval flow.');
  }
  if (!Number.isFinite(request.durationMs) || request.durationMs <= 0 || request.durationMs > MAX_CAPTURE_MS) {
    errors.push(`Capture/render duration must be between 1 and ${MAX_CAPTURE_MS} ms.`);
  }
  if (mode?.id === 'wasapi-loopback-capture' && helperManifest && !helperCanLoopback(helperManifest)) {
    errors.push('Helper manifest does not declare canReadLoopback.');
  }
  if (helperManifest?.capabilities?.canModifySystemState === true) {
    errors.push('Unsafe helper manifest claims canModifySystemState.');
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    mode: mode?.id || request.mode || null
  };
}
