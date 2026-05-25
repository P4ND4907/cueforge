import { signalBands } from '../signalAnalyzer.js';

const DEFAULT_SAMPLE_RATE = 48000;
const MAX_FFT_SIZE = 4096;
const MIN_FFT_SIZE = 64;
const FLOOR_DB = -120;

export const audioMetricBucketDefinitions = [
  {
    id: 'chain-integrity',
    key: 'chainIntegrity',
    label: 'Chain integrity',
    proves: 'Signal is present, not muted, not mostly silence, and not obviously flattened by duplicate processing.',
    recommendedImplementation: ['FFmpeg astats', 'FFmpeg silencedetect', 'CueForge custom sanity checks'],
    fallbackImplementation: 'cueforge-js-waveform-sanity'
  },
  {
    id: 'loudness-dynamics',
    key: 'loudnessDynamics',
    label: 'Loudness / dynamics',
    proves: 'Preamp safety, clipping risk, crest factor, and loudness consistency.',
    recommendedImplementation: ['FFmpeg ebur128', 'FFmpeg astats', 'libebur128'],
    fallbackImplementation: 'cueforge-js-rms-peak-crest-proxy'
  },
  {
    id: 'spectral-eq-behavior',
    key: 'spectralEqBehavior',
    label: 'Spectral / EQ behavior',
    proves: 'The intended cue-region, masking, or comfort-band change actually happened.',
    recommendedImplementation: ['FFT', 'spectral delta', 'band energy analysis'],
    fallbackImplementation: 'cueforge-js-fft-band-delta'
  },
  {
    id: 'spatial-stereo-health',
    key: 'spatialStereoHealth',
    label: 'Spatial / stereo health',
    proves: 'Stereo phase, mono collapse, channel inversion, channel balance, and latency skew.',
    recommendedImplementation: ['FFmpeg aphasemeter', 'FFmpeg axcorrelate', 'impulse/chirp correlation'],
    fallbackImplementation: 'cueforge-js-correlation-lag'
  }
];

export function buildFfmpegAudioMetricPlan({
  inputPath = '<input.wav>',
  beforePath = null,
  afterPath = null
} = {}) {
  return {
    schema: 'cueforge.ffmpeg-audio-metric-plan.v1',
    inputPath,
    comparison: beforePath && afterPath ? { beforePath, afterPath } : null,
    buckets: [
      {
        bucket: 'chain-integrity',
        filters: ['astats=metadata=1:reset=1', 'silencedetect=noise=-60dB:d=0.25'],
        command: `ffmpeg -hide_banner -i "${inputPath}" -af "astats=metadata=1:reset=1,silencedetect=noise=-60dB:d=0.25" -f null -`
      },
      {
        bucket: 'loudness-dynamics',
        filters: ['ebur128=peak=true', 'astats=metadata=1:reset=1'],
        library: 'libebur128',
        command: `ffmpeg -hide_banner -i "${inputPath}" -filter_complex "ebur128=peak=true,astats=metadata=1:reset=1" -f null -`
      },
      {
        bucket: 'spectral-eq-behavior',
        filters: ['custom FFT', 'band energy', 'before/after spectral delta'],
        command: beforePath && afterPath
          ? `cueforge metrics compare --before "${beforePath}" --after "${afterPath}" --bucket spectral-eq-behavior`
          : `cueforge metrics analyze "${inputPath}" --bucket spectral-eq-behavior`
      },
      {
        bucket: 'spatial-stereo-health',
        filters: ['aphasemeter', 'axcorrelate=size=1024:algo=fast', 'impulse/chirp correlation'],
        command: `ffmpeg -hide_banner -i "${inputPath}" -filter_complex "aphasemeter,axcorrelate=size=1024:algo=fast" -f null -`
      }
    ],
    boundary: 'This plan analyzes user-selected local clips or explicit bounded captures. It does not record, upload, route, or apply audio changes by itself.'
  };
}

export function analyzeAudioMetrics(input = {}, options = {}) {
  const pcm = normalizePcmInput(input, options);
  const mono = mixDown(pcm.channelData);
  const waveform = summarizeWaveform(mono);
  const spectrum = summarizeSpectrum(mono, pcm.sampleRate);
  const stereo = summarizeStereo(pcm.channelData, pcm.sampleRate);

  const buckets = {
    chainIntegrity: buildChainIntegrityBucket({ waveform, spectrum, pcm }),
    loudnessDynamics: buildLoudnessDynamicsBucket({ waveform }),
    spectralEqBehavior: buildSpectralBucket({ spectrum }),
    spatialStereoHealth: buildSpatialBucket({ stereo, channelCount: pcm.channelData.length })
  };

  return {
    schema: 'cueforge.audio-metrics.v1',
    sampleRate: pcm.sampleRate,
    channels: pcm.channelData.length,
    durationMs: Math.round((pcm.frameCount / pcm.sampleRate) * 1000),
    backend: options.backend || 'cueforge-js-fallback',
    bucketDefinitions: audioMetricBucketDefinitions,
    buckets,
    summary: summarizeBuckets(buckets)
  };
}

export function compareAudioMetrics({
  before,
  after,
  sampleRate = DEFAULT_SAMPLE_RATE,
  targetBands = ['presence', 'cue'],
  backend = 'cueforge-js-fallback'
} = {}) {
  const beforeReport = analyzeAudioMetrics(withSampleRate(before, sampleRate), { backend });
  const afterReport = analyzeAudioMetrics(withSampleRate(after, sampleRate), { backend });
  const beforeBands = beforeReport.buckets.spectralEqBehavior.bandEnergyDb;
  const afterBands = afterReport.buckets.spectralEqBehavior.bandEnergyDb;
  const bandDeltasDb = Object.fromEntries(signalBands.map((band) => [
    band.id,
    round2((afterBands[band.id] ?? FLOOR_DB) - (beforeBands[band.id] ?? FLOOR_DB))
  ]));
  const targetDeltaDb = round2(average(targetBands.map((band) => bandDeltasDb[band] ?? 0)));
  const lowMaskDeltaDb = round2(average(['rumble', 'bass', 'lowMid'].map((band) => bandDeltasDb[band] ?? 0)));
  const loudnessDeltaDb = round2(afterReport.buckets.loudnessDynamics.rmsDbfs - beforeReport.buckets.loudnessDynamics.rmsDbfs);
  const clippingDelta = afterReport.buckets.loudnessDynamics.clippingRisk - beforeReport.buckets.loudnessDynamics.clippingRisk;

  return {
    schema: 'cueforge.audio-metrics-comparison.v1',
    before: beforeReport,
    after: afterReport,
    delta: {
      bandDeltasDb,
      targetBands,
      targetDeltaDb,
      lowMaskDeltaDb,
      loudnessDeltaDb,
      clippingRisk: clippingDelta
    },
    verdict: {
      intendedCueRegionChanged: targetDeltaDb >= 1.5,
      lowMaskGotWorse: lowMaskDeltaDb > 1.5,
      clippingGotWorse: clippingDelta > 8,
      louderButNotClearer: loudnessDeltaDb > 2 && targetDeltaDb < 1,
      saferToShip: targetDeltaDb >= 1.5 && clippingDelta <= 8 && lowMaskDeltaDb <= 1.5
    }
  };
}

function buildChainIntegrityBucket({ waveform, spectrum, pcm }) {
  const signalPresent = waveform.rms > 0.0015 && waveform.peak > 0.004;
  const silencePercent = clamp(Math.round(waveform.silenceRatio * 100), 0, 100);
  const flattenedDynamicsHint = signalPresent && waveform.crestFactorDb < 5 && waveform.rmsDbfs > -24;
  const obviousDoubleProcessingRisk = flattenedDynamicsHint && spectrum.flatness > 0.38;
  const status = !signalPresent || silencePercent > 98
    ? 'fail'
    : obviousDoubleProcessingRisk || silencePercent > 70
      ? 'warn'
      : 'pass';

  return {
    id: 'chain-integrity',
    status,
    implementation: 'FFmpeg astats + silencedetect reference; CueForge JS sanity fallback',
    signalPresent,
    silencePercent,
    muteRisk: signalPresent ? clamp(Math.round(silencePercent * 0.8), 0, 100) : 100,
    obviousDoubleProcessingRisk,
    dcOffset: round4(waveform.dcOffset),
    frameCount: pcm.frameCount,
    proof: status === 'pass'
      ? 'Signal is present and not mostly silence.'
      : status === 'warn'
        ? 'Signal exists, but silence or flattened dynamics need review.'
        : 'Signal is missing or effectively muted.'
  };
}

function buildLoudnessDynamicsBucket({ waveform }) {
  const clippingRisk = clamp(Math.round(waveform.clipPercent * 8 + Math.max(0, waveform.peak - 0.92) * 550), 0, 100);
  const preampHeadroomDb = waveform.peak > 0 ? Math.max(0, -waveform.peakDbfs) : 0;
  const status = clippingRisk > 35 || waveform.peakDbfs > -0.2
    ? 'fail'
    : clippingRisk > 12 || preampHeadroomDb < 1
      ? 'warn'
      : 'pass';

  return {
    id: 'loudness-dynamics',
    status,
    implementation: 'FFmpeg ebur128/astats or libebur128 reference; CueForge JS RMS/peak/crest fallback',
    rmsDbfs: round2(waveform.rmsDbfs),
    peakDbfs: round2(waveform.peakDbfs),
    loudnessProxyLufs: round2(waveform.rmsDbfs - 0.7),
    crestFactorDb: round2(waveform.crestFactorDb),
    clipPercent: round2(waveform.clipPercent),
    clippingRisk,
    preampHeadroomDb: round2(preampHeadroomDb),
    proof: status === 'pass'
      ? 'Headroom and crest factor look usable.'
      : status === 'warn'
        ? 'Headroom is tight or clip risk is rising.'
        : 'Clipping or unsafe headroom blocks trustworthy tuning.'
  };
}

function buildSpectralBucket({ spectrum }) {
  const cueRegionDb = round2(average([spectrum.bandEnergyDb.presence, spectrum.bandEnergyDb.cue]));
  const lowMaskDb = round2(average([spectrum.bandEnergyDb.rumble, spectrum.bandEnergyDb.bass, spectrum.bandEnergyDb.lowMid]));
  const cueVsMaskDb = round2(cueRegionDb - lowMaskDb);
  const status = cueVsMaskDb < -8
    ? 'warn'
    : 'pass';

  return {
    id: 'spectral-eq-behavior',
    status,
    implementation: 'FFT / spectral delta / band energy analysis',
    bandEnergyDb: spectrum.bandEnergyDb,
    bandEnergyScore: spectrum.bandEnergyScore,
    spectralCentroidHz: Math.round(spectrum.centroidHz),
    spectralRolloffHz: Math.round(spectrum.rolloffHz),
    spectralFlatness: round3(spectrum.flatness),
    cueRegionDb,
    lowMaskDb,
    cueVsMaskDb,
    proof: status === 'pass'
      ? 'Cue-region energy is measurable against masking bands.'
      : 'Low-band masking is stronger than the cue window.'
  };
}

function buildSpatialBucket({ stereo, channelCount }) {
  const stereoAvailable = channelCount >= 2;
  const status = !stereoAvailable
    ? 'warn'
    : stereo.polarityInversionRisk || Math.abs(stereo.channelBalanceDb) > 9
      ? 'fail'
      : stereo.monoCollapseRisk || Math.abs(stereo.latencySkewMs) > 1.5
        ? 'warn'
        : 'pass';

  return {
    id: 'spatial-stereo-health',
    status,
    implementation: 'FFmpeg aphasemeter/axcorrelate reference; CueForge JS correlation/lag fallback',
    stereoAvailable,
    correlation: round3(stereo.correlation),
    width: round3(stereo.width),
    monoCollapseRisk: stereo.monoCollapseRisk,
    polarityInversionRisk: stereo.polarityInversionRisk,
    channelBalanceDb: round2(stereo.channelBalanceDb),
    latencySkewSamples: stereo.latencySkewSamples,
    latencySkewMs: round3(stereo.latencySkewMs),
    phaseHealth: stereo.phaseHealth,
    proof: status === 'pass'
      ? 'Stereo phase, balance, and skew look usable.'
      : status === 'warn'
        ? 'Stereo image needs manual verification.'
        : 'Stereo routing has a likely phase, balance, or polarity problem.'
  };
}

function summarizeBuckets(buckets) {
  const statuses = Object.values(buckets).map((bucket) => bucket.status);
  const failCount = statuses.filter((status) => status === 'fail').length;
  const warnCount = statuses.filter((status) => status === 'warn').length;
  const passCount = statuses.filter((status) => status === 'pass').length;
  const nextActions = [];

  if (buckets.chainIntegrity.status !== 'pass') nextActions.push('Confirm signal path and rerun capture.');
  if (buckets.loudnessDynamics.status !== 'pass') nextActions.push('Fix gain/headroom before trusting EQ changes.');
  if (buckets.spectralEqBehavior.status !== 'pass') nextActions.push('Check masking bands before boosting cue range.');
  if (buckets.spatialStereoHealth.status !== 'pass') nextActions.push('Verify left/right routing, polarity, and mono/stereo mode.');
  if (!nextActions.length) nextActions.push('Use this as a baseline and compare one controlled before/after change.');

  return {
    status: failCount ? 'fail' : warnCount ? 'warn' : 'pass',
    passCount,
    warnCount,
    failCount,
    confidence: clamp(Math.round(passCount * 25 + warnCount * 12 - failCount * 18), 0, 100),
    nextActions
  };
}

function normalizeInputObject(input = {}) {
  if (Array.isArray(input) || ArrayBuffer.isView(input)) return { samples: input };
  return input || {};
}

function withSampleRate(input, sampleRate) {
  return { ...normalizeInputObject(input), sampleRate };
}

function normalizePcmInput(input = {}, options = {}) {
  const normalized = normalizeInputObject(input);
  const sampleRate = Number(normalized.sampleRate || options.sampleRate || DEFAULT_SAMPLE_RATE);
  let channelData = normalized.channelData;

  if (!channelData && normalized.samples) channelData = [normalized.samples];
  if (!channelData && Array.isArray(normalized.left) && Array.isArray(normalized.right)) {
    channelData = [normalized.left, normalized.right];
  }
  if (!Array.isArray(channelData) || !channelData.length) channelData = [new Float32Array()];

  const cleanChannels = channelData
    .map((channel) => Float32Array.from(Array.from(channel || [], (value) => clampFloat(value, -1, 1))))
    .filter((channel) => channel.length);

  const safeChannels = cleanChannels.length ? cleanChannels : [new Float32Array()];
  const frameCount = Math.min(...safeChannels.map((channel) => channel.length));

  return {
    sampleRate,
    frameCount,
    channelData: safeChannels.map((channel) => channel.slice(0, frameCount))
  };
}

function mixDown(channelData) {
  const length = Math.min(...channelData.map((channel) => channel.length));
  const mono = new Float32Array(Math.max(0, length));
  for (let index = 0; index < mono.length; index += 1) {
    let sum = 0;
    for (const channel of channelData) sum += channel[index] || 0;
    mono[index] = sum / Math.max(1, channelData.length);
  }
  return mono;
}

function summarizeWaveform(samples) {
  if (!samples.length) {
    return {
      rms: 0,
      peak: 0,
      rmsDbfs: FLOOR_DB,
      peakDbfs: FLOOR_DB,
      dcOffset: 0,
      clipPercent: 0,
      silenceRatio: 1,
      crestFactorDb: 0
    };
  }

  let sumSquares = 0;
  let peak = 0;
  let dcTotal = 0;
  let clipped = 0;
  let silent = 0;

  for (const sample of samples) {
    const value = clampFloat(sample, -1, 1);
    const abs = Math.abs(value);
    sumSquares += value * value;
    dcTotal += value;
    peak = Math.max(peak, abs);
    if (abs >= 0.99) clipped += 1;
    if (abs < 0.0005) silent += 1;
  }

  const rmsValue = Math.sqrt(sumSquares / samples.length);
  return {
    rms: rmsValue,
    peak,
    rmsDbfs: amplitudeToDb(rmsValue),
    peakDbfs: amplitudeToDb(peak),
    dcOffset: dcTotal / samples.length,
    clipPercent: (clipped / samples.length) * 100,
    silenceRatio: silent / samples.length,
    crestFactorDb: amplitudeToDb(peak / Math.max(rmsValue, 0.000001))
  };
}

function summarizeSpectrum(samples, sampleRate) {
  const frameSize = chooseFftSize(samples.length);
  if (!frameSize) {
    return {
      bandEnergyDb: Object.fromEntries(signalBands.map((band) => [band.id, FLOOR_DB])),
      bandEnergyScore: Object.fromEntries(signalBands.map((band) => [band.id, 0])),
      centroidHz: 0,
      rolloffHz: 0,
      flatness: 0
    };
  }

  const frame = new Float64Array(frameSize);
  for (let index = 0; index < frameSize; index += 1) {
    const window = 0.5 * (1 - Math.cos((2 * Math.PI * index) / (frameSize - 1)));
    frame[index] = (samples[index] || 0) * window;
  }

  const magnitudes = fftMagnitudes(frame);
  const binHz = sampleRate / frameSize;
  const powers = Array.from(magnitudes, (value) => value * value);
  const totalPower = powers.reduce((sum, value) => sum + value, 0);
  const centroidHz = totalPower
    ? powers.reduce((sum, value, index) => sum + value * index * binHz, 0) / totalPower
    : 0;
  const rolloffHz = findRolloff(powers, totalPower * 0.85, binHz);
  const flatness = spectralFlatness(magnitudes);
  const bandEnergyDb = Object.fromEntries(signalBands.map((band) => [band.id, bandPowerDb(powers, binHz, band.from, band.to)]));
  const bandEnergyScore = Object.fromEntries(signalBands.map((band) => [
    band.id,
    clamp(Math.round(((bandEnergyDb[band.id] - FLOOR_DB) / Math.abs(FLOOR_DB)) * 100), 0, 100)
  ]));

  return {
    bandEnergyDb,
    bandEnergyScore,
    centroidHz,
    rolloffHz,
    flatness
  };
}

function summarizeStereo(channelData, sampleRate) {
  if (channelData.length < 2) {
    return {
      correlation: 0,
      width: 0,
      monoCollapseRisk: false,
      polarityInversionRisk: false,
      channelBalanceDb: 0,
      latencySkewSamples: 0,
      latencySkewMs: 0,
      phaseHealth: 60
    };
  }

  const left = channelData[0];
  const right = channelData[1];
  const length = Math.min(left.length, right.length);
  const leftView = left.slice(0, length);
  const rightView = right.slice(0, length);
  const leftRms = rms(leftView);
  const rightRms = rms(rightView);
  const correlation = pearsonCorrelation(leftView, rightView);
  const width = stereoWidth(leftView, rightView);
  const latencySkewSamples = estimateLatencySkew(leftView, rightView, Math.min(128, Math.floor(length / 4)));
  const latencySkewMs = (latencySkewSamples / sampleRate) * 1000;
  const monoCollapseRisk = Math.abs(correlation) > 0.985 && width < 0.02;
  const polarityInversionRisk = correlation < -0.82;
  const channelBalanceDb = amplitudeToDb(leftRms / Math.max(rightRms, 0.000001));
  const phasePenalty = polarityInversionRisk ? 55 : monoCollapseRisk ? 22 : 0;
  const balancePenalty = Math.min(28, Math.abs(channelBalanceDb) * 3);
  const skewPenalty = Math.min(25, Math.abs(latencySkewMs) * 11);

  return {
    correlation,
    width,
    monoCollapseRisk,
    polarityInversionRisk,
    channelBalanceDb,
    latencySkewSamples,
    latencySkewMs,
    phaseHealth: clamp(Math.round(100 - phasePenalty - balancePenalty - skewPenalty), 0, 100)
  };
}

function chooseFftSize(length) {
  if (length < MIN_FFT_SIZE) return 0;
  let size = 1;
  while (size * 2 <= length && size * 2 <= MAX_FFT_SIZE) size *= 2;
  return size >= MIN_FFT_SIZE ? size : 0;
}

function fftMagnitudes(frame) {
  const real = Float64Array.from(frame);
  const imag = new Float64Array(frame.length);
  fft(real, imag);
  const magnitudes = new Float64Array(frame.length / 2);
  for (let index = 0; index < magnitudes.length; index += 1) {
    magnitudes[index] = Math.sqrt(real[index] ** 2 + imag[index] ** 2) / (frame.length / 2);
  }
  return magnitudes;
}

function fft(real, imag) {
  const n = real.length;
  for (let i = 1, j = 0; i < n; i += 1) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
  }

  for (let length = 2; length <= n; length <<= 1) {
    const angle = (-2 * Math.PI) / length;
    const wlenReal = Math.cos(angle);
    const wlenImag = Math.sin(angle);
    for (let i = 0; i < n; i += length) {
      let wReal = 1;
      let wImag = 0;
      for (let j = 0; j < length / 2; j += 1) {
        const uReal = real[i + j];
        const uImag = imag[i + j];
        const vReal = real[i + j + length / 2] * wReal - imag[i + j + length / 2] * wImag;
        const vImag = real[i + j + length / 2] * wImag + imag[i + j + length / 2] * wReal;
        real[i + j] = uReal + vReal;
        imag[i + j] = uImag + vImag;
        real[i + j + length / 2] = uReal - vReal;
        imag[i + j + length / 2] = uImag - vImag;
        const nextReal = wReal * wlenReal - wImag * wlenImag;
        wImag = wReal * wlenImag + wImag * wlenReal;
        wReal = nextReal;
      }
    }
  }
}

function bandPowerDb(powers, binHz, from, to) {
  const start = Math.max(0, Math.floor(from / binHz));
  const end = Math.min(powers.length, Math.ceil(to / binHz));
  if (end <= start) return FLOOR_DB;
  const value = average(powers.slice(start, end));
  return round2(powerToDb(value));
}

function findRolloff(powers, threshold, binHz) {
  let total = 0;
  for (let index = 0; index < powers.length; index += 1) {
    total += powers[index];
    if (total >= threshold) return index * binHz;
  }
  return powers.length ? (powers.length - 1) * binHz : 0;
}

function spectralFlatness(magnitudes) {
  const values = Array.from(magnitudes, (value) => Math.max(value, 0.000001));
  const logMean = values.reduce((sum, value) => sum + Math.log(value), 0) / values.length;
  const arithmetic = average(values);
  return clamp(Math.exp(logMean) / Math.max(arithmetic, 0.000001), 0, 1);
}

function pearsonCorrelation(left, right) {
  const length = Math.min(left.length, right.length);
  if (!length) return 0;
  const leftMean = average(left);
  const rightMean = average(right);
  let numerator = 0;
  let leftDen = 0;
  let rightDen = 0;
  for (let index = 0; index < length; index += 1) {
    const l = left[index] - leftMean;
    const r = right[index] - rightMean;
    numerator += l * r;
    leftDen += l * l;
    rightDen += r * r;
  }
  return numerator / Math.max(0.000001, Math.sqrt(leftDen * rightDen));
}

function stereoWidth(left, right) {
  const length = Math.min(left.length, right.length);
  if (!length) return 0;
  let midTotal = 0;
  let sideTotal = 0;
  for (let index = 0; index < length; index += 1) {
    const mid = (left[index] + right[index]) / 2;
    const side = (left[index] - right[index]) / 2;
    midTotal += mid * mid;
    sideTotal += side * side;
  }
  const midRms = Math.sqrt(midTotal / length);
  const sideRms = Math.sqrt(sideTotal / length);
  return sideRms / Math.max(0.000001, midRms + sideRms);
}

function estimateLatencySkew(left, right, maxLag) {
  if (!maxLag) return 0;
  let bestLag = 0;
  let bestScore = -Infinity;
  for (let lag = -maxLag; lag <= maxLag; lag += 1) {
    let score = 0;
    let count = 0;
    for (let index = 0; index < left.length; index += 1) {
      const rightIndex = index + lag;
      if (rightIndex < 0 || rightIndex >= right.length) continue;
      score += left[index] * right[rightIndex];
      count += 1;
    }
    const normalizedScore = score / Math.max(1, count);
    if (normalizedScore > bestScore) {
      bestScore = normalizedScore;
      bestLag = lag;
    }
  }
  return bestLag;
}

function rms(samples) {
  if (!samples.length) return 0;
  let total = 0;
  for (const sample of samples) total += sample * sample;
  return Math.sqrt(total / samples.length);
}

function average(values) {
  const clean = Array.from(values || [], Number).filter(Number.isFinite);
  if (!clean.length) return 0;
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

function amplitudeToDb(value) {
  if (!Number.isFinite(value) || value <= 0) return FLOOR_DB;
  return Math.max(FLOOR_DB, 20 * Math.log10(value));
}

function powerToDb(value) {
  if (!Number.isFinite(value) || value <= 0) return FLOOR_DB;
  return Math.max(FLOOR_DB, 10 * Math.log10(value));
}

function clampFloat(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(min, Math.min(max, number));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function round2(value) {
  return Number(value.toFixed(2));
}

function round3(value) {
  return Number(value.toFixed(3));
}

function round4(value) {
  return Number(value.toFixed(4));
}
