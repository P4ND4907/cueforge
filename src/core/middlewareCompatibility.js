export const audioBackendMethods = [
  'Init',
  'Shutdown',
  'LoadBank',
  'Play',
  'SetRTPC',
  'SetState',
  'GetProfilerStats'
];

export const defaultMiddlewareEvents = [
  { id: 'gameplay.footstep', busId: 'sfx', params: ['surface', 'distance_m'] },
  { id: 'gameplay.weapon_fire', busId: 'sfx', params: ['distance_m', 'occlusion_amount'] },
  { id: 'voice.teammate', busId: 'vo', params: ['ducking_amount'] },
  { id: 'ui.menu_open', busId: 'ui', params: [] }
];

export const defaultRtpcs = [
  { id: 'distance_m', min: 0, max: 100, unit: 'meters' },
  { id: 'occlusion_amount', min: 0, max: 1, unit: 'ratio' },
  { id: 'player_focus', min: 0, max: 1, unit: 'ratio' }
];

export const defaultStates = [
  { group: 'Surface', values: ['Dirt', 'Asphalt', 'Metal'] },
  { group: 'PlayerMode', values: ['Menu', 'Calm', 'Combat', 'Cinematic'] }
];

export const defaultVoiceCaps = {
  pc: {
    audioThreadMs: 5,
    voices: { sfx: 48, ambience: 16, vo: 8, ui: 12 },
    heavyVoices: 2,
    profilerVoiceTolerance: 1
  },
  mobile: {
    audioThreadMs: 2.5,
    voices: { sfx: 24, ambience: 8, vo: 4, ui: 8 },
    heavyVoices: 1,
    profilerVoiceTolerance: 1
  }
};

export const spatialPluginCandidates = [
  {
    id: 'thx-spatial-audio-plus',
    label: 'THX Spatial Audio+',
    status: 'research-candidate',
    ecosystem: 'WYVRN',
    vendor: 'THX Ltd.',
    middleware: ['wwise'],
    enginePipelines: ['Unity', 'Unreal Engine', 'custom-engine-via-middleware'],
    renderTarget: 'game-engine-or-middleware-rendered-headphones',
    no3dAudioLicensingFeesClaimedByVendor: true,
    controls: [
      'room-direct',
      'early-reflections',
      'late-reverb',
      'cinematic-depth',
      'emitter-placement'
    ],
    roadmapOutputs: ['7.1.4', 'Eclipsa IAMF'],
    experimentUse: 'Run one high-impact scene through baseline middleware rendering and THX Spatial Audio+ processing, then compare localization, clarity, room masking, CPU, and latency.',
    guardrails: [
      'Do not stack device THX Spatial Audio with the game plugin during A/B tests.',
      'Do not claim true engine geometry from normal stereo post-mix evidence.',
      'Keep raw capture local and export derived metrics only.',
      'Treat future 7.1.4 and Eclipsa IAMF output as roadmap until verified in a CueForge run.'
    ],
    sources: [
      'https://www.thx.com/blog/thx-ltd-announces-thx-spatial-audio-plugin-for-game-developers-available-now-from-wyvrn/',
      'https://www.thx.com/thx-spatial-audio-plus-game-plugin/',
      'https://developer.razer.com/audio/thx/'
    ]
  }
];

export function buildCueForgeMiddlewareCompatibilityManifest({
  version = '0.1',
  events = defaultMiddlewareEvents,
  rtpcs = defaultRtpcs,
  states = defaultStates,
  snapshots = defaultSnapshotNames()
} = {}) {
  const normalizedEvents = events.map(normalizeEvent);

  return {
    schema: 'cueforge.middleware-compatibility.v1',
    productName: 'CueForge',
    version,
    backendInterface: {
      name: 'IAudioBackend',
      methods: audioBackendMethods,
      eventAddressing: 'canonical-string-or-hash-only',
      gameplayCodeMayReferenceAdHocEvents: false
    },
    backends: [
      {
        id: 'wwise',
        label: 'Wwise',
        compileFlag: 'CUEFORGE_AUDIO_BACKEND_WWISE',
        runtimeId: 'wwise'
      },
      {
        id: 'fmod',
        label: 'FMOD',
        compileFlag: 'CUEFORGE_AUDIO_BACKEND_FMOD',
        runtimeId: 'fmod'
      }
    ],
    listenerModel: {
      primaryListeners: 1,
      optionalSecondaryListeners: ['photo-mode', 'replay-camera'],
      unitScale: '1.0 = 1 meter',
      coordinateSpaceMustBeNormalized: true
    },
    events: normalizedEvents,
    rtpcs: rtpcs.map(normalizeRtpc),
    states: states.map(normalizeState),
    buses: buildBusLayout(normalizedEvents),
    backendEventMap: buildBackendEventMap(normalizedEvents),
    binaural: {
      userToggle: 'headphone-binaural',
      perBusMode: ['off', 'auto', 'force'],
      fallbackWhenOutputNotStereo: 'speaker-panning-fallback',
      preventDoubleHrtf: true,
      target: { sampleRate: 48000, blockSize: 512, maxLatencyMs: 20 }
    },
    spatialPlugins: spatialPluginCandidates,
    voiceBudgets: defaultVoiceCaps,
    snapshots,
    buildPaths: {
      template: '/audio/build/{platform}/{middleware}/{version}',
      deterministic: true
    },
    telemetryEvents: ['missing-asset', 'poly-cap-hit', 'binaural-fallback'],
    safety: {
      noHiddenNativeRouting: true,
      noSilentDriverChanges: true,
      noRuntimeMixerMutationWithoutUserAction: true
    }
  };
}

export function buildThxSpatialAudioExperiment({
  sceneId = 'high-impact-scene',
  middleware = 'wwise',
  baselineRenderer = 'middleware-native-spatial',
  processedRenderer = 'thx-spatial-audio-plus',
  eventIds = ['gameplay.footstep', 'gameplay.weapon_fire']
} = {}) {
  const plugin = spatialPluginCandidates.find((candidate) => candidate.id === 'thx-spatial-audio-plus');

  return {
    schema: 'cueforge.spatial-ab-experiment.v1',
    productName: 'CueForge',
    pluginId: plugin.id,
    sceneId,
    middleware,
    baselineRenderer,
    processedRenderer,
    eventIds,
    prerequisites: [
      'Scene has repeatable listener and emitter path.',
      'Wwise event IDs come from the canonical CueForge middleware manifest.',
      'Headphones are used for binaural evaluation.',
      'Any device-level THX, Windows Sonic, Dolby, DTS, or other spatial layer is disabled during the plugin A/B.'
    ],
    requiredCaptures: [
      {
        id: 'baseline',
        renderer: baselineRenderer,
        output: 'derived-metrics-and-local-reference-capture',
        rawAudioLeavesMachine: false
      },
      {
        id: 'thx-processed',
        renderer: processedRenderer,
        output: 'derived-metrics-and-local-reference-capture',
        rawAudioLeavesMachine: false
      }
    ],
    metrics: [
      'localization-error-deg',
      'front-back-confusion-rate',
      'cue-clarity-score',
      'room-mask-risk',
      'audio-thread-ms',
      'end-to-end-latency-ms'
    ],
    passCriteria: [
      'Processed scene improves localization or cue clarity without raising room-mask risk.',
      'Audio thread and latency remain inside the middleware budget.',
      'Profiler overlay agrees with backend profiler within tolerance.',
      'No double-HRTF, comb filtering, or platform spatial stacking warning.'
    ],
    knobsUnderTest: plugin.controls,
    roadmapOutputs: plugin.roadmapOutputs,
    safety: {
      rawAudioLeavesMachine: false,
      disablesDeviceSpatialDuringTest: true,
      noArbitraryGamePostMixClaim: true,
      noHiddenRoutingChange: true
    }
  };
}

export function validateAudioBackendAdapter(adapter = {}, manifest = buildCueForgeMiddlewareCompatibilityManifest()) {
  const issues = [];
  const methods = new Set(adapter.methods ?? []);
  const canonicalEvents = new Set((manifest.events ?? []).map((event) => event.id));

  if (!['wwise', 'fmod'].includes(adapter.backendId)) {
    issues.push(`Unknown middleware backend: ${adapter.backendId ?? 'missing'}.`);
  }

  for (const method of manifest.backendInterface.methods) {
    if (!methods.has(method)) issues.push(`Missing required backend method: ${method}.`);
  }

  for (const eventId of adapter.referencedEvents ?? []) {
    if (!canonicalEvents.has(eventId)) {
      issues.push(`Gameplay code references non-canonical event: ${eventId}.`);
    }
  }

  return { ok: issues.length === 0, issues };
}

export function resolveBinauralRoute({
  middleware = 'wwise',
  outputChannels = 2,
  userHrtfEnabled = false,
  busMode = 'auto',
  activePlatformSpatialLayers = []
} = {}) {
  const backendSetting = middleware === 'fmod'
    ? 'FMOD 3D Object Panner Binaural'
    : 'Wwise Spatial Audio Binaural';

  if (busMode === 'off' || !userHrtfEnabled) {
    return {
      mode: 'binaural-off',
      middleware,
      backendSetting,
      middlewareHrtfEnabled: false,
      preventsDoubleHrtf: true,
      reason: busMode === 'off' ? 'Bus mode is off.' : 'User HRTF toggle is off.'
    };
  }

  if (outputChannels !== 2) {
    return {
      mode: 'speaker-panning-fallback',
      middleware,
      backendSetting,
      middlewareHrtfEnabled: false,
      preventsDoubleHrtf: true,
      telemetry: 'binaural-fallback',
      reason: 'Output is not stereo.'
    };
  }

  if (activePlatformSpatialLayers.length && busMode !== 'force') {
    return {
      mode: 'platform-spatial-fallback',
      middleware,
      backendSetting,
      middlewareHrtfEnabled: false,
      preventsDoubleHrtf: true,
      activePlatformSpatialLayers,
      telemetry: 'binaural-fallback',
      reason: 'Platform spatial layer already active.'
    };
  }

  return {
    mode: 'middleware-binaural',
    middleware,
    backendSetting,
    middlewareHrtfEnabled: true,
    preventsDoubleHrtf: true,
    reason: busMode === 'force' ? 'Bus mode forces middleware binaural.' : 'Stereo output and no active platform HRTF detected.'
  };
}

export function evaluateProfilerBudget(stats = {}, manifest = buildCueForgeMiddlewareCompatibilityManifest()) {
  const platform = stats.platform ?? 'pc';
  const budget = manifest.voiceBudgets?.[platform] ?? manifest.voiceBudgets.pc;
  const issues = [];
  const telemetry = [];

  if (Number(stats.audioThreadMs ?? 0) > budget.audioThreadMs) {
    issues.push(`${platformLabel(platform)} audio thread budget exceeded: ${stats.audioThreadMs} ms > ${budget.audioThreadMs} ms.`);
  }

  for (const [category, count] of Object.entries(stats.voices ?? {})) {
    const cap = budget.voices[category];
    if (typeof cap === 'number' && count > cap) {
      issues.push(`${voiceLabel(category)} voice cap exceeded: ${count} > ${cap}.`);
      telemetry.push('poly-cap-hit');
    }
  }

  if (Number(stats.heavyVoices ?? 0) > budget.heavyVoices) {
    issues.push(`Heavy voice cap exceeded: ${stats.heavyVoices} > ${budget.heavyVoices}.`);
    telemetry.push('poly-cap-hit');
  }

  if (
    Number.isFinite(stats.overlayVoiceCount) &&
    Number.isFinite(stats.profilerVoiceCount) &&
    Math.abs(stats.overlayVoiceCount - stats.profilerVoiceCount) > budget.profilerVoiceTolerance
  ) {
    issues.push(`Profiler parity mismatch: overlay ${stats.overlayVoiceCount} vs profiler ${stats.profilerVoiceCount}.`);
  }

  return {
    schema: 'cueforge.middleware-profiler-budget.v1',
    platform,
    ok: issues.length === 0,
    issues,
    telemetry: Array.from(new Set(telemetry)),
    virtualizedVoices: Number(stats.virtualizedVoices ?? 0)
  };
}

export function validateMixerSnapshot(snapshot = {}) {
  const issues = [];
  if (snapshot.schema !== 'cueforge.mix-snapshot.v1') issues.push('Snapshot schema must be cueforge.mix-snapshot.v1.');
  if (!snapshot.id) issues.push('Snapshot id is required.');
  if (!snapshot.version) issues.push('Snapshot version is required.');
  if (!Number.isFinite(snapshot.priority)) issues.push('Snapshot priority is required.');
  if (!Number.isFinite(snapshot.rampMs) || snapshot.rampMs < 0) issues.push('Snapshot rampMs must be non-negative.');
  if (!isPlainObject(snapshot.busGains)) issues.push('Snapshot busGains must be an object.');
  return { ok: issues.length === 0, issues };
}

export function applyMixerSnapshot(current = {}, snapshot = {}) {
  const rampMs = Number.isFinite(snapshot.rampMs) ? snapshot.rampMs : 250;
  const activeSnapshots = Array.isArray(current.activeSnapshots) ? current.activeSnapshots : [];
  const competing = activeSnapshots.filter((entry) => Number(entry.priority ?? 0) > Number(snapshot.priority ?? 0));
  const baseGains = { ...(current.busGains ?? {}) };
  const resolvedBusGains = { ...baseGains, ...(snapshot.busGains ?? {}) };

  for (const higherPriority of competing) {
    Object.assign(resolvedBusGains, higherPriority.busGains ?? {});
  }

  return {
    schema: 'cueforge.mix-snapshot-application.v1',
    snapshotId: snapshot.id,
    mode: 'additive-ramped',
    rampMs,
    conflictResolution: 'priority-wins',
    resolvedBusGains,
    operations: Object.entries(snapshot.busGains ?? {}).map(([busId, gainDb]) => ({
      type: 'set-bus-gain',
      busId,
      gainDb,
      rampMs
    })),
    sendLevels: snapshot.sendLevels ?? {},
    sidechainDucks: snapshot.sidechainDucks ?? {},
    limiterThresholds: snapshot.limiterThresholds ?? {}
  };
}

export function buildMiddlewareSmokeChecklist() {
  return {
    schema: 'cueforge.middleware-smoke-checklist.v1',
    productName: 'CueForge',
    estimateMinutes: 15,
    steps: [
      {
        id: 'listener-binaural-toggle',
        action: 'Start, play a 3D event, move listener, then toggle headphone binaural.',
        assertions: [
          '3D event follows listener movement.',
          'No comb-filtering or double-HRTF warning.',
          'Non-stereo output falls back to speaker panning.'
        ]
      },
      {
        id: 'voice-cap-virtualization',
        action: 'Spam events until the voice cap is hit.',
        assertions: [
          'Lower-priority voices virtualize first.',
          'No CPU spikes or dropouts.',
          'Poly-cap telemetry is emitted.'
        ]
      },
      {
        id: 'snapshot-ramp-sidechain',
        action: 'Apply Calm, Combat, and Cinematic snapshots while moving camera.',
        assertions: [
          'Mixer changes ramp instead of snapping.',
          'Sidechains and limiters remain stable.',
          'Priority conflict resolution is deterministic.'
        ]
      },
      {
        id: 'profiler-overlay-parity',
        action: 'Compare backend profiler stats against the CueForge overlay.',
        assertions: [
          'Voice counts match within +/-1 voice.',
          'CPU and virtualized voice counters are visible.',
          'Both Wwise and FMOD use the same labels.'
        ]
      }
    ]
  };
}

export function buildSdkPrototypeDefinitionOfDone() {
  return {
    schema: 'cueforge.middleware-sdk-dod.v1',
    productName: 'CueForge',
    items: [
      'One codepath behind IAudioBackend, switchable Wwise/FMOD by runtime selection or build flag.',
      'Shared event and parameter manifest generates both middleware layouts.',
      'Headphone toggle maps safely with stereo-only middleware binaural and clean fallback.',
      'Voice caps and profiler overlay work on both middleware backends.',
      'Mixer snapshots save and load as versioned JSON and apply through additive ramps.',
      'No gameplay code references ad-hoc event names.',
      'No hidden routing, driver, APO, or mixer writes.'
    ]
  };
}

function normalizeEvent(event) {
  return {
    id: event.id,
    busId: event.busId ?? 'sfx',
    params: event.params ?? [],
    stableId: hashStableId(event.id)
  };
}

function normalizeRtpc(rtpc) {
  return {
    id: rtpc.id,
    min: Number(rtpc.min ?? 0),
    max: Number(rtpc.max ?? 1),
    unit: rtpc.unit ?? 'normalized'
  };
}

function normalizeState(state) {
  return {
    group: state.group,
    values: [...(state.values ?? [])]
  };
}

function buildBusLayout(events) {
  const ids = new Set(['master', 'sfx', 'ambience', 'music', 'vo', 'ui']);
  for (const event of events) ids.add(event.busId);
  return Array.from(ids).map((id) => ({
    id,
    binauralMode: ['sfx', 'ambience', 'vo'].includes(id) ? 'auto' : 'off',
    voiceCapCategory: id === 'vo' ? 'vo' : id
  }));
}

function buildBackendEventMap(events) {
  return {
    wwise: Object.fromEntries(events.map((event) => [event.id, `Event/CueForge/${event.id.replaceAll('.', '/')}`])),
    fmod: Object.fromEntries(events.map((event) => [event.id, `event:/CueForge/${event.id.replaceAll('.', '/')}`]))
  };
}

function defaultSnapshotNames() {
  return ['Calm', 'Combat', 'Menu', 'Cinematic', 'Underwater'].map((name, index) => ({
    id: name.toLowerCase(),
    name,
    priority: index * 10,
    rampMs: 250
  }));
}

function hashStableId(value = '') {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `cf_${(hash >>> 0).toString(16)}`;
}

function platformLabel(platform) {
  return platform === 'pc' ? 'PC' : platform.charAt(0).toUpperCase() + platform.slice(1);
}

function voiceLabel(category) {
  return category.toUpperCase();
}

function isPlainObject(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
