import { describe, expect, it } from 'vitest';
import {
  analyzeAudioMetrics,
  audioMetricBucketDefinitions,
  buildFfmpegAudioMetricPlan,
  compareAudioMetrics
} from './audioMetricsEngine.js';

const SAMPLE_RATE = 48000;

describe('audio metrics engine', () => {
  it('defines the four release-proof metric buckets and FFmpeg reference plan', () => {
    expect(audioMetricBucketDefinitions.map((bucket) => bucket.id)).toEqual([
      'chain-integrity',
      'loudness-dynamics',
      'spectral-eq-behavior',
      'spatial-stereo-health'
    ]);

    const plan = buildFfmpegAudioMetricPlan({
      inputPath: 'match.wav',
      beforePath: 'before.wav',
      afterPath: 'after.wav'
    });

    expect(plan.buckets.find((bucket) => bucket.bucket === 'chain-integrity').filters).toContain('astats=metadata=1:reset=1');
    expect(plan.buckets.find((bucket) => bucket.bucket === 'loudness-dynamics').filters).toContain('ebur128=peak=true');
    expect(plan.buckets.find((bucket) => bucket.bucket === 'spatial-stereo-health').filters).toContain('aphasemeter');
    expect(plan.buckets.find((bucket) => bucket.bucket === 'spatial-stereo-health').filters.join(' ')).toContain('axcorrelate');
    expect(plan.boundary).toContain('does not record, upload, route, or apply');
  });

  it('fails chain integrity for silence instead of pretending the setup is good', () => {
    const report = analyzeAudioMetrics({
      sampleRate: SAMPLE_RATE,
      samples: new Float32Array(SAMPLE_RATE)
    });

    expect(report.schema).toBe('cueforge.audio-metrics.v1');
    expect(report.buckets.chainIntegrity.status).toBe('fail');
    expect(report.buckets.chainIntegrity.signalPresent).toBe(false);
    expect(report.buckets.chainIntegrity.muteRisk).toBe(100);
    expect(report.summary.status).toBe('fail');
  });

  it('catches clipping and unsafe headroom in the loudness/dynamics bucket', () => {
    const clipped = Float32Array.from({ length: 4096 }, (_, index) => (index % 8 < 4 ? 1 : -1));
    const report = analyzeAudioMetrics({
      sampleRate: SAMPLE_RATE,
      samples: clipped
    });

    expect(report.buckets.loudnessDynamics.status).toBe('fail');
    expect(report.buckets.loudnessDynamics.clippingRisk).toBeGreaterThan(80);
    expect(report.buckets.loudnessDynamics.preampHeadroomDb).toBe(0);
    expect(report.buckets.loudnessDynamics.proof).toMatch(/Clipping/i);
  });

  it('proves intended cue-region changes with before/after spectral deltas', () => {
    const before = mix([
      sine(120, 0.4),
      sine(4200, 0.05)
    ]);
    const after = mix([
      sine(120, 0.4),
      sine(4200, 0.22)
    ]);
    const comparison = compareAudioMetrics({
      sampleRate: SAMPLE_RATE,
      before: { samples: before },
      after: { samples: after },
      targetBands: ['presence', 'cue']
    });

    expect(comparison.schema).toBe('cueforge.audio-metrics-comparison.v1');
    expect(comparison.delta.targetDeltaDb).toBeGreaterThan(5);
    expect(comparison.verdict.intendedCueRegionChanged).toBe(true);
    expect(comparison.verdict.louderButNotClearer).toBe(false);
  });

  it('flags mono collapse and polarity inversion in the spatial bucket', () => {
    const left = sine(1000, 0.25);
    const mono = analyzeAudioMetrics({
      sampleRate: SAMPLE_RATE,
      channelData: [left, left]
    });
    const inverted = analyzeAudioMetrics({
      sampleRate: SAMPLE_RATE,
      channelData: [left, Float32Array.from(left, (value) => -value)]
    });

    expect(mono.buckets.spatialStereoHealth.monoCollapseRisk).toBe(true);
    expect(mono.buckets.spatialStereoHealth.status).toBe('warn');
    expect(inverted.buckets.spatialStereoHealth.polarityInversionRisk).toBe(true);
    expect(inverted.buckets.spatialStereoHealth.status).toBe('fail');
  });
});

function sine(freq, gain, length = 4096) {
  return Float32Array.from({ length }, (_, index) => Math.sin((2 * Math.PI * freq * index) / SAMPLE_RATE) * gain);
}

function mix(parts) {
  const length = Math.min(...parts.map((part) => part.length));
  return Float32Array.from({ length }, (_, index) => parts.reduce((sum, part) => sum + part[index], 0));
}

