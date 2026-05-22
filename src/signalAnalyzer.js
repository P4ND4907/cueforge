export const signalBands = [
  { id: 'rumble', label: 'Rumble', from: 20, to: 80 },
  { id: 'bass', label: 'Bass load', from: 80, to: 250 },
  { id: 'lowMid', label: 'Low-mid mask', from: 250, to: 700 },
  { id: 'voice', label: 'Voice body', from: 700, to: 1800 },
  { id: 'presence', label: 'Presence', from: 1800, to: 3500 },
  { id: 'cue', label: 'Cue window', from: 3500, to: 6500 },
  { id: 'edge', label: 'Sharp edge', from: 6500, to: 10000 },
  { id: 'air', label: 'Air/noise', from: 10000, to: 16000 }
];

export function createEmptySignalAnalysis() {
  return {
    schema: 'cueforge.signal-analysis.v1',
    level: 0,
    peak: 0,
    clipRisk: 0,
    noiseRisk: 0,
    voicePresence: 0,
    cueStrength: 0,
    fpsClarity: 0,
    commsReadiness: 0,
    tuningConfidence: 0,
    dynamicRange: 0,
    spectralCentroidHz: 0,
    spectralRolloffHz: 0,
    spectralFlatness: 0,
    zeroCrossingRate: 0,
    dcOffset: 0,
    probableCause: 'waiting-for-signal',
    recommendation: 'Start live analysis and speak normally or play a controlled test sound.',
    suggestedTweak: 'No tweak yet.',
    bands: Object.fromEntries(signalBands.map((band) => [band.id, 0])),
    eqNudge: Array(10).fill(0)
  };
}

export function analyzeAudioFrame({ timeDomain, frequencyData, sampleRate = 48000 } = {}) {
  if (!timeDomain?.length || !frequencyData?.length) return createEmptySignalAnalysis();

  const waveform = summarizeWaveform(timeDomain);
  const spectrum = summarizeSpectrum(frequencyData, sampleRate);
  const clipRisk = clamp(Math.round(Math.max(waveform.clipPercent * 4.4, Math.max(0, waveform.peak - 0.72) * 360)), 0, 100);
  const voicePresence = clamp(Math.round(spectrum.bands.voice * 0.62 + spectrum.bands.presence * 0.42), 0, 100);
  const cueStrength = clamp(Math.round(spectrum.bands.cue * 0.76 + spectrum.bands.presence * 0.28), 0, 100);
  const rumbleMask = spectrum.bands.rumble * 0.75 + spectrum.bands.bass * 0.38 + spectrum.bands.lowMid * 0.24;
  const edgeNoise = spectrum.bands.edge * 0.42 + spectrum.bands.air * 0.52 + spectrum.flatness * 34;
  const noiseRisk = clamp(Math.round(edgeNoise + rumbleMask * 0.22 + waveform.zeroCrossingRate * 28), 0, 100);
  const fpsClarity = clamp(Math.round(48 + cueStrength * 0.72 + voicePresence * 0.12 - rumbleMask * 0.42 - spectrum.bands.edge * 0.16 - clipRisk * 0.28), 0, 100);
  const commsReadiness = clamp(Math.round(42 + voicePresence * 0.78 - noiseRisk * 0.34 - clipRisk * 0.5 - Math.abs(waveform.dcOffset) * 120), 0, 100);
  const dynamicRange = clamp(Math.round(100 - Math.abs(waveform.crestFactorDb - 12) * 5.2 - clipRisk * 0.42), 0, 100);
  const tuningConfidence = clamp(Math.round((fpsClarity + commsReadiness + dynamicRange + (100 - noiseRisk)) / 4), 0, 100);
  const probableCause = classifyCause({ clipRisk, noiseRisk, voicePresence, cueStrength, rumbleMask, waveform });

  return {
    schema: 'cueforge.signal-analysis.v1',
    level: clamp(Math.round(waveform.rms * 220), 0, 100),
    peak: clamp(Math.round(waveform.peak * 100), 0, 100),
    clipRisk,
    noiseRisk,
    voicePresence,
    cueStrength,
    fpsClarity,
    commsReadiness,
    tuningConfidence,
    dynamicRange,
    spectralCentroidHz: Math.round(spectrum.centroidHz),
    spectralRolloffHz: Math.round(spectrum.rolloffHz),
    spectralFlatness: Number(spectrum.flatness.toFixed(3)),
    zeroCrossingRate: Number(waveform.zeroCrossingRate.toFixed(3)),
    dcOffset: Number(waveform.dcOffset.toFixed(3)),
    probableCause,
    recommendation: buildRecommendation(probableCause),
    suggestedTweak: buildSuggestedTweak(probableCause),
    bands: spectrum.bands,
    eqNudge: buildEqNudge(probableCause)
  };
}

function summarizeWaveform(timeDomain) {
  let sumSquares = 0;
  let peak = 0;
  let dcTotal = 0;
  let clipped = 0;
  let previousSign = 0;
  let crossings = 0;

  for (const value of timeDomain) {
    const centered = (Number(value) - 128) / 128;
    const sign = centered >= 0 ? 1 : -1;
    sumSquares += centered * centered;
    dcTotal += centered;
    peak = Math.max(peak, Math.abs(centered));
    if (Math.abs(centered) > 0.94) clipped += 1;
    if (previousSign && sign !== previousSign) crossings += 1;
    previousSign = sign;
  }

  const rms = Math.sqrt(sumSquares / timeDomain.length);
  return {
    rms,
    peak,
    dcOffset: dcTotal / timeDomain.length,
    clipPercent: (clipped / timeDomain.length) * 100,
    zeroCrossingRate: crossings / Math.max(1, timeDomain.length - 1),
    crestFactorDb: 20 * Math.log10((peak + 0.000001) / (rms + 0.000001))
  };
}

function summarizeSpectrum(frequencyData, sampleRate) {
  const magnitudes = Array.from(frequencyData, (value) => Math.max(0.000001, Number(value) / 255));
  const binHz = (sampleRate / 2) / frequencyData.length;
  const total = magnitudes.reduce((sum, value) => sum + value, 0);
  const weighted = magnitudes.reduce((sum, value, index) => sum + value * index * binHz, 0);
  const centroidHz = total ? weighted / total : 0;
  const rolloffHz = findRolloff(magnitudes, total * 0.85, binHz);
  const flatness = spectralFlatness(magnitudes);
  const bands = Object.fromEntries(signalBands.map((band) => [band.id, bandEnergy(frequencyData, binHz, band.from, band.to)]));

  return { centroidHz, rolloffHz, flatness, bands };
}

function bandEnergy(frequencyData, binHz, from, to) {
  const start = Math.max(0, Math.floor(from / binHz));
  const end = Math.min(frequencyData.length, Math.ceil(to / binHz));
  if (end <= start) return 0;
  let total = 0;
  for (let index = start; index < end; index += 1) total += Number(frequencyData[index]) || 0;
  return clamp(Math.round((total / (end - start) / 255) * 100), 0, 100);
}

function findRolloff(magnitudes, threshold, binHz) {
  let total = 0;
  for (let index = 0; index < magnitudes.length; index += 1) {
    total += magnitudes[index];
    if (total >= threshold) return index * binHz;
  }
  return (magnitudes.length - 1) * binHz;
}

function spectralFlatness(magnitudes) {
  const logMean = magnitudes.reduce((sum, value) => sum + Math.log(value), 0) / magnitudes.length;
  const arithmetic = magnitudes.reduce((sum, value) => sum + value, 0) / magnitudes.length;
  return clamp(Math.exp(logMean) / Math.max(arithmetic, 0.000001), 0, 1);
}

function classifyCause({ clipRisk, noiseRisk, voicePresence, cueStrength, rumbleMask, waveform }) {
  if (clipRisk > 28) return 'input-clipping';
  if (Math.abs(waveform.dcOffset) > 0.12) return 'dc-or-interface-bias';
  if (noiseRisk > 62 && voicePresence < 38) return 'room-or-chain-noise';
  if (rumbleMask > 54 && cueStrength < 46) return 'low-end-masking';
  if (cueStrength > 76 && noiseRisk > 48) return 'sharpness-fatigue';
  if (voicePresence < 22 && waveform.rms < 0.12) return 'voice-too-quiet';
  if (cueStrength < 34 && voicePresence > 30) return 'game-cue-buried';
  return 'usable-signal';
}

function buildRecommendation(cause) {
  const messages = {
    'input-clipping': 'Input is clipping. Lower gain before trusting EQ or match feedback.',
    'dc-or-interface-bias': 'Signal has offset. Check interface/cable path before analyzing tone balance.',
    'room-or-chain-noise': 'Noise is dominating the voice window. Fix gain, placement, or light suppression first.',
    'low-end-masking': 'Low-end energy is masking cue detail. Trim rumble/bass before boosting footsteps.',
    'sharpness-fatigue': 'Cue range is hot and noisy. Avoid more treble; smooth the edge first.',
    'voice-too-quiet': 'Voice is too quiet for a fair comms test. Move closer or raise input slightly.',
    'game-cue-buried': 'Voice is present but cue range is weak. Test a small 3.5k-6.5k lift in-game.',
    'usable-signal': 'Signal is usable. Run a before/after match check and compare real notes.'
  };
  return messages[cause] || messages['usable-signal'];
}

function buildSuggestedTweak(cause) {
  const tweaks = {
    'input-clipping': 'Reduce mic/input gain 5-10%, record another 12s sample, then retest.',
    'dc-or-interface-bias': 'Reconnect the USB/interface path and retest with enhancements off.',
    'room-or-chain-noise': 'Lower gain, move the mic closer, and keep suppression light to avoid robotic comms.',
    'low-end-masking': 'Cut 31-250Hz slightly and retest footsteps against explosions or sprint noise.',
    'sharpness-fatigue': 'Reduce 8k-16k slightly and avoid stacking Sonar/Discord brightening.',
    'voice-too-quiet': 'Raise input in small steps until normal speech lands above 20% level without clipping.',
    'game-cue-buried': 'Try a small presence/cue lift around 2k-6k, then verify in the same map/mode.',
    'usable-signal': 'Keep this as the baseline and compare one controlled match with the next profile.'
  };
  return tweaks[cause] || tweaks['usable-signal'];
}

function buildEqNudge(cause) {
  const nudges = {
    'input-clipping': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    'dc-or-interface-bias': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    'room-or-chain-noise': [-0.5, -0.5, -0.3, 0, 0.2, 0.2, 0, -0.2, -0.3, -0.3],
    'low-end-masking': [-1, -0.8, -0.5, -0.2, 0, 0.2, 0.5, 0.5, 0, -0.2],
    'sharpness-fatigue': [0, 0, 0, 0, 0, 0.1, 0.1, -0.3, -0.7, -0.7],
    'voice-too-quiet': [0, 0, 0, 0, 0.2, 0.4, 0.3, 0, 0, 0],
    'game-cue-buried': [-0.2, -0.2, 0, 0, 0.1, 0.3, 0.6, 0.5, 0, -0.2],
    'usable-signal': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  };
  return nudges[cause] || nudges['usable-signal'];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
