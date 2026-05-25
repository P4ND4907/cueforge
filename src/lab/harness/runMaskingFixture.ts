import { createMaskingTune, maskingScenarios } from '../../maskingLab.js';
import { analyzeAudioFrame } from '../../signalAnalyzer.js';
import { generateExplosionMasker } from '../generators/explosionMasker.js';
import { generateFootsteps } from '../generators/footsteps.js';

const eqBandCenters = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

type MaskingFixture = {
  sampleRate?: number;
  durationSec?: number;
  seed?: number;
  scenarioId?: string;
  footstep?: {
    gain?: number;
    steps?: number;
    pan?: number;
  };
  masker?: {
    gain?: number;
    pan?: number;
  };
  expectedFix?: number[];
};

type RenderedFixture = {
  schema: 'cueforge.rendered-masking-fixture.v1';
  renderer: 'offline-audio-context' | 'deterministic-js';
  sampleRate: number;
  durationSec: number;
  channels: [Float32Array, Float32Array];
  spectralDelta?: number[];
};

function clamp(value: number, min = -1, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function fixtureDefaults(fixture: MaskingFixture = {}) {
  const scenario = maskingScenarios.find((item) => item.id === fixture.scenarioId) || maskingScenarios[0];
  return {
    sampleRate: fixture.sampleRate || 48000,
    durationSec: fixture.durationSec || 3,
    seed: fixture.seed || 20260524,
    scenario,
    footstep: {
      gain: fixture.footstep?.gain ?? 1,
      steps: fixture.footstep?.steps ?? 5,
      pan: fixture.footstep?.pan ?? -0.18
    },
    masker: {
      gain: fixture.masker?.gain ?? 0.38,
      pan: fixture.masker?.pan ?? 0.08
    },
    expectedFix: fixture.expectedFix || scenario.fix
  };
}

function panGains(pan = 0) {
  const normalized = clamp(pan, -1, 1);
  return {
    left: normalized <= 0 ? 1 : 1 - normalized * 0.45,
    right: normalized >= 0 ? 1 : 1 + normalized * 0.45
  };
}

function mixIntoStereo({
  left,
  right,
  source,
  gain = 1,
  pan = 0
}: {
  left: Float32Array;
  right: Float32Array;
  source: Float32Array;
  gain?: number;
  pan?: number;
}) {
  const panGain = panGains(pan);
  for (let i = 0; i < source.length; i += 1) {
    left[i] = clamp(left[i] + source[i] * gain * panGain.left);
    right[i] = clamp(right[i] + source[i] * gain * panGain.right);
  }
}

function renderDeterministicMaskingFixture(fixture: MaskingFixture = {}): RenderedFixture {
  const config = fixtureDefaults(fixture);
  const length = Math.floor(config.sampleRate * config.durationSec);
  const left = new Float32Array(length);
  const right = new Float32Array(length);
  const footstep = generateFootsteps({
    sampleRate: config.sampleRate,
    seconds: config.durationSec,
    steps: config.footstep.steps
  });
  const masker = generateExplosionMasker({
    sampleRate: config.sampleRate,
    seconds: config.durationSec,
    gain: config.masker.gain,
    seed: config.seed
  });

  mixIntoStereo({ left, right, source: footstep, gain: config.footstep.gain, pan: config.footstep.pan });
  mixIntoStereo({ left, right, source: masker, gain: 1, pan: config.masker.pan });

  return {
    schema: 'cueforge.rendered-masking-fixture.v1',
    renderer: 'deterministic-js',
    sampleRate: config.sampleRate,
    durationSec: config.durationSec,
    channels: [left, right]
  };
}

async function renderWithOfflineAudioContext(fixture: MaskingFixture = {}) {
  const OfflineAudio = (globalThis as any).OfflineAudioContext;
  if (!OfflineAudio) return null;

  const config = fixtureDefaults(fixture);
  const fallback = renderDeterministicMaskingFixture(fixture);
  const length = Math.floor(config.sampleRate * config.durationSec);
  const ctx = new OfflineAudio({
    numberOfChannels: 2,
    length,
    sampleRate: config.sampleRate
  });
  const buffer = ctx.createBuffer(2, length, config.sampleRate);
  buffer.copyToChannel(fallback.channels[0], 0);
  buffer.copyToChannel(fallback.channels[1], 1);

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start(0);

  const rendered = await ctx.startRendering();
  return {
    schema: 'cueforge.rendered-masking-fixture.v1',
    renderer: 'offline-audio-context',
    sampleRate: config.sampleRate,
    durationSec: config.durationSec,
    channels: [
      new Float32Array(rendered.getChannelData(0)),
      new Float32Array(rendered.getChannelData(1))
    ] as [Float32Array, Float32Array]
  };
}

function findAnalysisWindow(samples: Float32Array, size: number) {
  if (samples.length <= size) return 0;
  let bestIndex = 0;
  let bestEnergy = -Infinity;
  const hop = Math.max(128, Math.floor(size / 4));

  for (let start = 0; start <= samples.length - size; start += hop) {
    let energy = 0;
    for (let i = 0; i < size; i += 1) energy += samples[start + i] * samples[start + i];
    if (energy > bestEnergy) {
      bestEnergy = energy;
      bestIndex = start;
    }
  }

  return bestIndex;
}

function toMono(rendered: RenderedFixture) {
  const [left, right] = rendered.channels;
  const length = Math.min(left.length, right.length);
  const mono = new Float32Array(length);
  for (let i = 0; i < length; i += 1) mono[i] = clamp((left[i] + right[i]) * 0.5);
  return mono;
}

function frameToTimeDomain(frame: Float32Array) {
  return Uint8Array.from(frame, (value) => Math.max(0, Math.min(255, Math.round(128 + clamp(value) * 127))));
}

function hann(index: number, length: number) {
  return 0.5 * (1 - Math.cos((2 * Math.PI * index) / Math.max(1, length - 1)));
}

function frameToFrequencyData(frame: Float32Array, spectralDelta: number[] = []) {
  const bins = 1024;
  const length = Math.min(frame.length, 2048);
  const frequencyData = new Uint8Array(bins);

  for (let bin = 0; bin < bins; bin += 1) {
    let real = 0;
    let imag = 0;
    const angleStep = (2 * Math.PI * bin) / length;
    for (let i = 0; i < length; i += 1) {
      const value = frame[i] * hann(i, length);
      real += value * Math.cos(angleStep * i);
      imag -= value * Math.sin(angleStep * i);
    }
    const magnitude = Math.sqrt(real * real + imag * imag) / Math.max(1, length / 2);
    const hz = (bin / bins) * 24000;
    const foundBand = eqBandCenters.findIndex((center) => center >= hz);
    const bandIndex = foundBand === -1
      ? Math.max(0, spectralDelta.length - 1)
      : Math.min(Math.max(0, spectralDelta.length - 1), foundBand);
    const deltaDb = spectralDelta.length ? spectralDelta[bandIndex] || 0 : 0;
    const scaled = magnitude * Math.pow(10, deltaDb / 20);
    frequencyData[bin] = Math.max(0, Math.min(255, Math.round(scaled * 900)));
  }

  return frequencyData;
}

export function sliceForAnalyzer(rendered: RenderedFixture, options: { frameSize?: number } = {}) {
  const frameSize = options.frameSize || 2048;
  const mono = toMono(rendered);
  const start = findAnalysisWindow(mono, frameSize);
  const frame = mono.slice(start, start + frameSize);

  return {
    timeDomain: frameToTimeDomain(frame),
    frequencyData: frameToFrequencyData(frame, rendered.spectralDelta || []),
    frameStart: start,
    frameSize,
    sampleRate: rendered.sampleRate
  };
}

export function applyEqDelta(rendered: RenderedFixture, expectedFix: number[] = []) {
  return {
    ...rendered,
    channels: [
      new Float32Array(rendered.channels[0]),
      new Float32Array(rendered.channels[1])
    ] as [Float32Array, Float32Array],
    spectralDelta: expectedFix.map((value) => Number(value) || 0)
  };
}

export async function renderMaskingFixture(fixture: MaskingFixture = {}) {
  return await renderWithOfflineAudioContext(fixture) || renderDeterministicMaskingFixture(fixture);
}

export async function runRenderedMaskingFixture(fixture: MaskingFixture = {}) {
  const config = fixtureDefaults(fixture);
  const rendered = await renderMaskingFixture(fixture);
  const beforeSlice = sliceForAnalyzer(rendered);
  const before = analyzeAudioFrame({
    timeDomain: beforeSlice.timeDomain,
    frequencyData: beforeSlice.frequencyData,
    sampleRate: rendered.sampleRate
  });
  const tuned = applyEqDelta(rendered, config.expectedFix);
  const afterSlice = sliceForAnalyzer(tuned);
  const after = analyzeAudioFrame({
    timeDomain: afterSlice.timeDomain,
    frequencyData: afterSlice.frequencyData,
    sampleRate: tuned.sampleRate
  });

  return {
    schema: 'cueforge.masking-fixture-result.v1',
    renderer: rendered.renderer,
    scenario: config.scenario,
    sampleRate: rendered.sampleRate,
    durationSec: rendered.durationSec,
    before,
    after,
    improved: after.fpsClarity >= before.fpsClarity,
    delta: {
      fpsClarity: after.fpsClarity - before.fpsClarity,
      noiseRisk: after.noiseRisk - before.noiseRisk,
      cueStrength: after.cueStrength - before.cueStrength
    },
    frame: {
      beforeStart: beforeSlice.frameStart,
      afterStart: afterSlice.frameStart,
      size: beforeSlice.frameSize
    }
  };
}

export function runMaskingFixture(eqOrFixture: number[] | MaskingFixture = Array(10).fill(0), scenarioId = 'footsteps-under-explosion') {
  if (Array.isArray(eqOrFixture)) {
    return createMaskingTune(eqOrFixture, scenarioId);
  }

  return runRenderedMaskingFixture(eqOrFixture);
}
