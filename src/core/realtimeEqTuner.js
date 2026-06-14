export const realtimeEqTunerPolicy = {
  schema: 'cueforge.realtime-eq-tuner-policy.v1',
  productName: 'CueForge',
  defaultSampleRate: 48000,
  defaultFftSize: 512,
  defaultHopSize: 256,
  targetSuggestionMs: 10,
  minSuggestionIntervalMs: 1000,
  runtimeApplyEnabled: false
};

export const realtimeEqBands = [
  { id: 'sub', label: 'Sub rumble', from: 20, to: 80 },
  { id: 'bass', label: 'Bass body', from: 80, to: 200 },
  { id: 'mud', label: 'Low-mid mask', from: 200, to: 350 },
  { id: 'body', label: 'Body', from: 350, to: 900 },
  { id: 'voice', label: 'Voice', from: 700, to: 1800 },
  { id: 'presence', label: 'Dialogue clarity', from: 2000, to: 4000 },
  { id: 'cue', label: 'Cue window', from: 3500, to: 6500 },
  { id: 'sibilance', label: 'Sharp edge', from: 6500, to: 9000 },
  { id: 'air', label: 'Air/noise', from: 9000, to: 16000 }
];

export function buildRealtimeEqTunerReport({
  frequencyData,
  timeDomain,
  sampleRate = realtimeEqTunerPolicy.defaultSampleRate,
  fftSize = realtimeEqTunerPolicy.defaultFftSize,
  hopSize = realtimeEqTunerPolicy.defaultHopSize
} = {}) {
  const spectrum = summarizeFrequencyBands(frequencyData, sampleRate);
  const waveform = summarizeTimeDomain(timeDomain);
  const flags = detectRealtimeEqFlags({ spectrum, waveform });
  const suggestions = buildRealtimeEqSuggestions({ spectrum, flags });
  const blockers = buildRealtimeEqBlockers(flags);
  const hopMs = (hopSize / sampleRate) * 1000;
  const analysisWindowMs = (fftSize / sampleRate) * 1000;

  return {
    schema: 'cueforge.realtime-eq-tuner.v1',
    productName: 'CueForge',
    mode: 'preview',
    runtimeApply: false,
    localOnly: true,
    latency: {
      sampleRate,
      fftSize,
      hopSize,
      analysisWindowMs: round(analysisWindowMs, 3),
      hopMs: round(hopMs, 3),
      targetSuggestionMs: realtimeEqTunerPolicy.targetSuggestionMs,
      meetsLiveBudget: hopMs <= realtimeEqTunerPolicy.targetSuggestionMs
    },
    stability: {
      minSuggestionIntervalMs: realtimeEqTunerPolicy.minSuggestionIntervalMs,
      reason: 'Avoid filter chatter during changing game scenes.'
    },
    spectrum,
    waveform,
    flags,
    suggestions,
    blockers,
    nextStep: buildRealtimeEqNextStep({ suggestions, blockers })
  };
}

export function exportCueForgeRealtimeEqFilters(report) {
  const suggestions = Array.isArray(report?.suggestions) ? report.suggestions : [];

  return {
    schema: 'cueforge.filters.v1',
    source: 'cueforge.realtime-eq-tuner',
    productName: 'CueForge',
    mode: 'preview',
    runtimeApply: false,
    noHiddenNativeRouting: true,
    noSilentDriverChanges: true,
    noUnsafePresetBehavior: true,
    replaySafe: true,
    filters: suggestions.map((suggestion, index) => ({
      id: `cueforge-realtime-eq-${index + 1}`,
      type: suggestion.type,
      freq: suggestion.freq,
      q: suggestion.q,
      gainDb: suggestion.gainDb,
      confidence: suggestion.confidence,
      reason: suggestion.reason,
      label: suggestion.label
    }))
  };
}

export function buildCueForgeDiagnosticsEvent(report) {
  return {
    schema: 'cueforge.diagnostics.event.v1',
    type: 'analysis',
    productName: 'CueForge',
    source: 'cueforge.realtime-eq-tuner',
    mode: report?.mode ?? 'preview',
    spectrum: report?.spectrum ?? summarizeFrequencyBands(),
    waveform: report?.waveform ?? summarizeTimeDomain(),
    flags: report?.flags ?? [],
    suggestions: report?.suggestions ?? [],
    blockers: report?.blockers ?? [],
    latency: report?.latency ?? {}
  };
}

export function createCueForgeDiagnosticsClient(url = 'ws://localhost:6789') {
  const handlers = new Map();

  return {
    productName: 'CueForge',
    url,
    connect() {
      return {
        connected: false,
        url,
        reason: 'websocket_runtime_not_enabled',
        message: 'CueForge diagnostics can connect when the desktop analyzer service is running.'
      };
    },
    on(eventName, callback) {
      const list = handlers.get(eventName) ?? [];
      list.push(callback);
      handlers.set(eventName, list);
      return callback;
    },
    emitLocal(eventName, payload) {
      for (const callback of handlers.get(eventName) ?? []) callback(payload);
    },
    apply(filters = []) {
      return {
        applied: false,
        filterCount: filters.length,
        reason: 'runtime_eq_not_enabled',
        message: 'Preview only. CueForge will not change EQ, routing, drivers, APO, or mixer state from this SDK path.'
      };
    }
  };
}

function summarizeFrequencyBands(frequencyData = [], sampleRate = realtimeEqTunerPolicy.defaultSampleRate) {
  const values = Array.from(frequencyData, (value) => clamp(Number(value) || 0, 0, 255));
  const binHz = values.length ? (sampleRate / 2) / values.length : 1;
  const bands = Object.fromEntries(
    realtimeEqBands.map((band) => [band.id, bandEnergy(values, binHz, band.from, band.to)])
  );
  const total = values.reduce((sum, value) => sum + value, 0);
  const weighted = values.reduce((sum, value, index) => sum + value * index * binHz, 0);

  return {
    schema: 'cueforge.realtime-spectrum.v1',
    sampleRate,
    bands,
    spectralCentroidHz: total ? Math.round(weighted / total) : 0,
    peakBand: findPeakBand(bands)
  };
}

function summarizeTimeDomain(timeDomain = []) {
  const values = Array.from(timeDomain, (value) => clamp(Number(value) || 0, 0, 255));
  if (!values.length) {
    return {
      schema: 'cueforge.realtime-waveform.v1',
      level: 0,
      peak: 0,
      clipRisk: 0,
      dcOffset: 0
    };
  }

  let sumSquares = 0;
  let peak = 0;
  let clipped = 0;
  let dcTotal = 0;

  for (const value of values) {
    const centered = (value - 128) / 128;
    const absolute = Math.abs(centered);
    sumSquares += centered * centered;
    dcTotal += centered;
    peak = Math.max(peak, absolute);
    if (value <= 7 || value >= 248) clipped += 1;
  }

  const rms = Math.sqrt(sumSquares / values.length);

  return {
    schema: 'cueforge.realtime-waveform.v1',
    level: clamp(Math.round(rms * 100), 0, 100),
    peak: clamp(Math.round(peak * 100), 0, 100),
    clipRisk: clamp(Math.round((clipped / values.length) * 100), 0, 100),
    dcOffset: round(dcTotal / values.length, 3)
  };
}

function detectRealtimeEqFlags({ spectrum, waveform }) {
  const bands = spectrum.bands;
  const flags = [];

  if (waveform.clipRisk >= 5) {
    flags.push({
      type: 'clipping',
      severity: 'high',
      detail: 'Signal is near full scale. Lower source or capture gain before trusting EQ.'
    });
  }

  if (Math.abs(waveform.dcOffset) >= 0.12) {
    flags.push({
      type: 'dc_offset',
      severity: 'medium',
      detail: 'Waveform center is offset. Check interface, virtual cable, or capture path.'
    });
  }

  if (bands.mud >= 65 && bands.mud - Math.max(bands.presence, bands.cue) >= 20) {
    flags.push({
      type: 'low_mid_masking',
      severity: 'medium',
      detail: 'Low-mid energy can blur footsteps, reloads, and teammate voice.'
    });
  }

  if (bands.sibilance >= 68 && bands.sibilance - Math.max(bands.presence, bands.cue, bands.body) >= 20) {
    flags.push({
      type: 'harsh_edge',
      severity: 'medium',
      detail: 'Sharp upper energy may cause fatigue or false cue brightness.'
    });
  }

  return flags;
}

function buildRealtimeEqSuggestions({ spectrum, flags }) {
  const bands = spectrum.bands;
  const suggestions = [];
  const hasBlockingCaptureIssue = flags.some((flag) => flag.type === 'clipping' || flag.type === 'dc_offset');

  const sibilanceDelta = bands.sibilance - Math.max(bands.presence, bands.cue, bands.body);
  if (sibilanceDelta >= 20) {
    suggestions.push({
      type: 'peaking',
      freq: 7200,
      q: 4.2,
      gainDb: -3,
      confidence: confidenceFromDelta(sibilanceDelta),
      reason: 'sibilance_spike',
      label: 'Tame harsh edge',
      previewOnly: true,
      blockedByCapture: hasBlockingCaptureIssue
    });
  }

  const mudDelta = bands.mud - Math.max(bands.presence, bands.cue);
  if (bands.mud >= 65 && mudDelta >= 20) {
    suggestions.push({
      type: 'peaking',
      freq: 260,
      q: 1.1,
      gainDb: -2.5,
      confidence: confidenceFromDelta(mudDelta),
      reason: 'mud_buildup',
      label: 'Clear low-mid mask',
      previewOnly: true,
      blockedByCapture: hasBlockingCaptureIssue
    });
  }

  const clarityGap = Math.max(bands.bass, bands.mud, bands.body, bands.voice) - bands.presence;
  if (bands.presence <= 42 && clarityGap >= 24) {
    suggestions.push({
      type: 'peaking',
      freq: 3000,
      q: 0.9,
      gainDb: 2,
      confidence: confidenceFromDelta(clarityGap),
      reason: 'dialogue_clarity_low',
      label: 'Lift dialogue and cue clarity',
      previewOnly: true,
      blockedByCapture: hasBlockingCaptureIssue
    });
  }

  return suggestions;
}

function buildRealtimeEqBlockers(flags) {
  const blockers = [];
  if (flags.some((flag) => flag.type === 'clipping')) blockers.push('Fix clipping before trusting EQ suggestions.');
  if (flags.some((flag) => flag.type === 'dc_offset')) blockers.push('Fix DC offset before trusting EQ suggestions.');
  return blockers;
}

function buildRealtimeEqNextStep({ suggestions, blockers }) {
  if (blockers.length) return 'Fix the capture issue, record another short sample, then compare again.';
  if (suggestions.length) return 'Preview the suggested filters, run Sound Match, then test one controlled match.';
  return 'No strong EQ move yet. Capture a louder or more representative 10 second game moment.';
}

function bandEnergy(values, binHz, from, to) {
  if (!values.length) return 0;
  const start = Math.max(0, Math.floor(from / binHz));
  const end = Math.min(values.length, Math.ceil(to / binHz));
  if (end <= start) return 0;
  let total = 0;
  for (let index = start; index < end; index += 1) total += values[index];
  return clamp(Math.round(total / (end - start) / 2.55), 0, 100);
}

function findPeakBand(bands) {
  return Object.entries(bands).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'none';
}

function confidenceFromDelta(delta) {
  return round(clamp(0.5 + delta / 70, 0.5, 0.96), 2);
}

function round(value, digits) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
