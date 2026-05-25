import { analyzeAudioFrame, signalBands } from './signalAnalyzer.js';
import { createEchoSceneFrame, inferEchoScene } from './echoSceneInference.js';
import { accumulateTemporalEvidence } from './engine/temporalEvidenceAccumulator.js';

const DEFAULT_FRAME_SIZE = 1024;
const DEFAULT_HOP_SIZE = 512;

export function parseWav(input) {
  const view = new DataView(toArrayBuffer(input));
  if (readAscii(view, 0, 4) !== 'RIFF' || readAscii(view, 8, 4) !== 'WAVE') {
    throw new Error('Unsupported WAV container. Expected RIFF/WAVE.');
  }

  let offset = 12;
  let fmt = null;
  let dataOffset = 0;
  let dataSize = 0;

  while (offset + 8 <= view.byteLength) {
    const id = readAscii(view, offset, 4);
    const size = view.getUint32(offset + 4, true);
    const chunkStart = offset + 8;

    if (id === 'fmt ') {
      fmt = {
        audioFormat: view.getUint16(chunkStart, true),
        channels: view.getUint16(chunkStart + 2, true),
        sampleRate: view.getUint32(chunkStart + 4, true),
        byteRate: view.getUint32(chunkStart + 8, true),
        blockAlign: view.getUint16(chunkStart + 12, true),
        bitsPerSample: view.getUint16(chunkStart + 14, true)
      };
    }

    if (id === 'data') {
      dataOffset = chunkStart;
      dataSize = size;
    }

    offset = chunkStart + size + (size % 2);
  }

  if (!fmt) throw new Error('Invalid WAV: missing fmt chunk.');
  if (!dataOffset || !dataSize) throw new Error('Invalid WAV: missing data chunk.');
  if (![1, 3, 65534].includes(fmt.audioFormat)) {
    throw new Error(`Unsupported WAV format ${fmt.audioFormat}. Use PCM or IEEE float WAV.`);
  }

  return {
    schema: 'cueforge.wav-meta.v1',
    ...fmt,
    dataOffset,
    dataSize,
    frameCount: Math.floor(dataSize / fmt.blockAlign),
    durationMs: Math.round((Math.floor(dataSize / fmt.blockAlign) / fmt.sampleRate) * 1000),
    view
  };
}

export function decodeWavToPcm(input) {
  const wav = parseWav(input);
  const channelData = Array.from({ length: wav.channels }, () => new Float32Array(wav.frameCount));
  let offset = wav.dataOffset;

  for (let frame = 0; frame < wav.frameCount; frame += 1) {
    for (let channel = 0; channel < wav.channels; channel += 1) {
      channelData[channel][frame] = readSample(wav.view, offset, wav.audioFormat, wav.bitsPerSample);
      offset += wav.bitsPerSample / 8;
    }
  }

  return {
    schema: 'cueforge.pcm.v1',
    sampleRate: wav.sampleRate,
    channels: wav.channels,
    bitsPerSample: wav.bitsPerSample,
    audioFormat: wav.audioFormat,
    durationMs: wav.durationMs,
    frameCount: wav.frameCount,
    channelData
  };
}

export function extractWavFeatures(input, {
  frameSize = DEFAULT_FRAME_SIZE,
  hopSize = DEFAULT_HOP_SIZE,
  maxAnalysisFrames = 360,
  gameEngine = 'unknown',
  matchContext = ''
} = {}) {
  if (!isPowerOfTwo(frameSize)) throw new Error('frameSize must be a power of two.');
  const pcm = decodeWavToPcm(input);
  const mono = mixDown(pcm.channelData);
  const window = hannWindow(frameSize);
  const frameStarts = buildFrameStarts(mono.length, frameSize, hopSize).slice(0, maxAnalysisFrames);
  const frameAnalyses = [];
  const avgSpectrum = new Float64Array(frameSize / 2);
  const fluxValues = [];
  let previousSpectrum = null;

  for (const start of frameStarts) {
    const frame = readFrame(mono, start, frameSize, window);
    const spectrum = fftMagnitudes(frame);
    const frequencyData = spectrumToByteFrequency(spectrum);
    const timeDomain = frameToByteTimeDomain(frame);
    const signalAnalysis = analyzeAudioFrame({ timeDomain, frequencyData, sampleRate: pcm.sampleRate });
    const stereo = frameStereoStats(pcm.channelData, start, frameSize);
    const echoFrame = createEchoSceneFrame({
      timestampMs: (start / pcm.sampleRate) * 1000,
      analysis: signalAnalysis,
      leftLevel: stereo.leftLevel,
      rightLevel: stereo.rightLevel,
      source: 'wav-stft'
    });

    for (let index = 0; index < spectrum.length; index += 1) avgSpectrum[index] += spectrum[index];
    if (previousSpectrum) fluxValues.push(spectralFlux(previousSpectrum, spectrum));
    previousSpectrum = spectrum;
    frameAnalyses.push({ signalAnalysis, echoFrame, spectrum });
  }

  const divisor = Math.max(1, frameAnalyses.length);
  for (let index = 0; index < avgSpectrum.length; index += 1) avgSpectrum[index] /= divisor;

  const frequencyData = spectrumToByteFrequency(avgSpectrum);
  const signalAnalysis = analyzeAudioFrame({
    timeDomain: frameToByteTimeDomain(mono.slice(0, Math.min(mono.length, frameSize))),
    frequencyData,
    sampleRate: pcm.sampleRate
  });
  const stereo = fullStereoStats(pcm.channelData);
  const bandEnergy = spectrumBandEnergy(avgSpectrum, pcm.sampleRate, frameSize);
  const echoScene = inferEchoScene({
    frames: frameAnalyses.map((frame) => frame.echoFrame),
    gameEngine,
    matchContext
  });
  const temporalEvidence = accumulateTemporalEvidence(frameAnalyses.map((frame) => frame.signalAnalysis));
  const sceneGraph = buildSoundSceneGraph({ bandEnergy, stereo, signalAnalysis, echoScene, temporalEvidence });
  const coach = buildWavCoach({ signalAnalysis, echoScene, temporalEvidence, stereo });

  return {
    schema: 'cueforge.wav-analysis.v1',
    wav: {
      sampleRate: pcm.sampleRate,
      channels: pcm.channels,
      bitsPerSample: pcm.bitsPerSample,
      durationMs: pcm.durationMs,
      frameCount: pcm.frameCount
    },
    stft: {
      frameSize,
      hopSize,
      frameCount: frameAnalyses.length
    },
    features: {
      rms: round4(rms(mono)),
      peak: round4(peak(mono)),
      transientScore: clamp(Math.round(average(fluxValues) * 850), 0, 100),
      stereoPan: stereo.pan,
      stereoWidth: stereo.width,
      bandEnergy,
      spectralCentroidHz: signalAnalysis.spectralCentroidHz,
      spectralRolloffHz: signalAnalysis.spectralRolloffHz,
      spectralFlatness: signalAnalysis.spectralFlatness
    },
    signalAnalysis,
    temporalEvidence,
    echoScene,
    sceneGraph,
    coach
  };
}

function buildSoundSceneGraph({ bandEnergy, stereo, signalAnalysis, echoScene, temporalEvidence }) {
  const nodes = [
    { id: 'low-pressure', label: 'Low pressure', score: average([bandEnergy.rumble, bandEnergy.bass, bandEnergy.lowMid]) },
    { id: 'cue-window', label: 'Cue window', score: average([bandEnergy.presence, bandEnergy.cue]) },
    { id: 'stereo-image', label: 'Stereo image', score: clamp(100 - Math.abs(stereo.pan), 0, 100) },
    { id: 'temporal-track', label: 'Temporal track', score: temporalEvidence.temporalConfidence },
    { id: 'echo-scene', label: 'Echo scene inference', score: echoScene.evidence.evidenceScore }
  ].map((node) => ({ ...node, score: clamp(Math.round(node.score), 0, 100) }));

  const edges = [
    { from: 'low-pressure', to: 'cue-window', relation: 'masks', strength: echoScene.evidence.maskingPressure },
    { from: 'stereo-image', to: 'cue-window', relation: 'stabilizes', strength: echoScene.evidence.lateralStability },
    { from: 'temporal-track', to: 'echo-scene', relation: 'raises-confidence', strength: temporalEvidence.temporalConfidence },
    { from: 'echo-scene', to: 'cue-window', relation: signalAnalysis.probableCause, strength: signalAnalysis.tuningConfidence }
  ].map((edge) => ({ ...edge, strength: clamp(Math.round(edge.strength), 0, 100) }));

  return {
    schema: 'cueforge.sound-scene-graph.v1',
    nodes,
    edges,
    limitation: 'This graph is inferred from the rendered WAV/audio stream. It is not a true game-world object graph.'
  };
}

function buildWavCoach({ signalAnalysis, echoScene, temporalEvidence, stereo }) {
  const actions = [];
  if (signalAnalysis.clipRisk > 20) actions.push('Lower gain first. Clipped WAV evidence should not drive EQ.');
  if (Math.abs(stereo.pan) > 35) actions.push('Check channel routing or balance before judging direction.');
  if (echoScene.likelyProblem === 'masking-before-eq') actions.push('Trim low-end masking before adding more cue boost.');
  if (echoScene.likelyProblem === 'occlusion-or-wall-filtering-proxy') actions.push('Treat this as map/engine-specific until repeated across routes.');
  if (temporalEvidence.state === 'reliable-track') actions.push('Use this clip as a repeatable before/after benchmark.');
  if (!actions.length) actions.push('Save this as a baseline, then test one small profile change.');

  return {
    schema: 'cueforge.wav-coach.v1',
    summary: echoScene.explanation,
    decision: echoScene.likelyProblem,
    confidence: echoScene.confidence,
    actions,
    eqDecision: echoScene.eqNudge.some((gain) => gain !== 0) ? 'preview-conservative-nudge' : 'hold-eq'
  };
}

function toArrayBuffer(input) {
  if (input instanceof ArrayBuffer) return input;
  if (ArrayBuffer.isView(input)) return input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength);
  throw new Error('Expected WAV input as ArrayBuffer, Uint8Array, or Buffer.');
}

function readAscii(view, offset, length) {
  return Array.from({ length }, (_, index) => String.fromCharCode(view.getUint8(offset + index))).join('');
}

function readSample(view, offset, audioFormat, bitsPerSample) {
  if (audioFormat === 3 && bitsPerSample === 32) return clampFloat(view.getFloat32(offset, true), -1, 1);
  if (bitsPerSample === 8) return (view.getUint8(offset) - 128) / 128;
  if (bitsPerSample === 16) return clampFloat(view.getInt16(offset, true) / 32768, -1, 1);
  if (bitsPerSample === 24) {
    const value = view.getUint8(offset) | (view.getUint8(offset + 1) << 8) | (view.getUint8(offset + 2) << 16);
    const signed = value & 0x800000 ? value | 0xff000000 : value;
    return clampFloat(signed / 8388608, -1, 1);
  }
  if (bitsPerSample === 32) return clampFloat(view.getInt32(offset, true) / 2147483648, -1, 1);
  throw new Error(`Unsupported WAV bit depth ${bitsPerSample}.`);
}

function mixDown(channelData) {
  const length = channelData[0]?.length || 0;
  const mono = new Float32Array(length);
  for (let index = 0; index < length; index += 1) {
    let sum = 0;
    for (const channel of channelData) sum += channel[index] || 0;
    mono[index] = sum / Math.max(1, channelData.length);
  }
  return mono;
}

function buildFrameStarts(length, frameSize, hopSize) {
  if (length <= frameSize) return [0];
  const starts = [];
  for (let start = 0; start + frameSize <= length; start += hopSize) starts.push(start);
  if (starts[starts.length - 1] + frameSize < length) starts.push(Math.max(0, length - frameSize));
  return starts;
}

function readFrame(samples, start, frameSize, window) {
  const frame = new Float64Array(frameSize);
  for (let index = 0; index < frameSize; index += 1) {
    frame[index] = (samples[start + index] || 0) * window[index];
  }
  return frame;
}

function hannWindow(size) {
  return Float64Array.from({ length: size }, (_, index) => 0.5 * (1 - Math.cos((2 * Math.PI * index) / (size - 1))));
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

function spectrumToByteFrequency(spectrum) {
  const max = Math.max(...spectrum, 0.000001);
  return Uint8Array.from(spectrum, (value) => clamp(Math.round((value / max) * 255), 0, 255));
}

function frameToByteTimeDomain(frame) {
  return Uint8Array.from(frame, (value) => clamp(Math.round(128 + clampFloat(value, -1, 1) * 127), 0, 255));
}

function spectrumBandEnergy(spectrum, sampleRate, frameSize) {
  const max = Math.max(...spectrum, 0.000001);
  const binHz = sampleRate / frameSize;
  return Object.fromEntries(signalBands.map((band) => {
    const start = Math.max(0, Math.floor(band.from / binHz));
    const end = Math.min(spectrum.length, Math.ceil(band.to / binHz));
    const value = end > start ? average(Array.from(spectrum.slice(start, end))) : 0;
    return [band.id, clamp(Math.round((value / max) * 100), 0, 100)];
  }));
}

function frameStereoStats(channelData, start, frameSize) {
  if (channelData.length < 2) return { leftLevel: null, rightLevel: null };
  return {
    leftLevel: rms(channelData[0].slice(start, start + frameSize)),
    rightLevel: rms(channelData[1].slice(start, start + frameSize))
  };
}

function fullStereoStats(channelData) {
  if (channelData.length < 2) return { pan: 0, width: 0 };
  const left = channelData[0];
  const right = channelData[1];
  const leftRms = rms(left);
  const rightRms = rms(right);
  const pan = Math.round(((rightRms - leftRms) / Math.max(0.000001, leftRms + rightRms)) * 100);
  let midTotal = 0;
  let sideTotal = 0;
  for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
    const mid = (left[index] + right[index]) / 2;
    const side = (left[index] - right[index]) / 2;
    midTotal += mid * mid;
    sideTotal += side * side;
  }
  const midRms = Math.sqrt(midTotal / Math.max(1, Math.min(left.length, right.length)));
  const sideRms = Math.sqrt(sideTotal / Math.max(1, Math.min(left.length, right.length)));
  const width = clamp(Math.round((sideRms / Math.max(0.000001, midRms + sideRms)) * 100), 0, 100);
  return { pan, width };
}

function spectralFlux(previous, current) {
  const maxPrevious = Math.max(...previous, 0.000001);
  const maxCurrent = Math.max(...current, 0.000001);
  let total = 0;
  for (let index = 0; index < Math.min(previous.length, current.length); index += 1) {
    total += Math.max(0, current[index] / maxCurrent - previous[index] / maxPrevious);
  }
  return total / Math.max(1, Math.min(previous.length, current.length));
}

function rms(samples) {
  if (!samples.length) return 0;
  let total = 0;
  for (const sample of samples) total += sample * sample;
  return Math.sqrt(total / samples.length);
}

function peak(samples) {
  let value = 0;
  for (const sample of samples) value = Math.max(value, Math.abs(sample));
  return value;
}

function average(values) {
  const clean = values.map(Number).filter(Number.isFinite);
  if (!clean.length) return 0;
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

function isPowerOfTwo(value) {
  return Number.isInteger(value) && value > 0 && (value & (value - 1)) === 0;
}

function round4(value) {
  return Number(value.toFixed(4));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function clampFloat(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(min, Math.min(max, number));
}
