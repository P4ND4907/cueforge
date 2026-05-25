#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  analyzeAudioMetrics,
  buildFfmpegAudioMetricPlan,
  compareAudioMetrics
} from '../src/engine/audioMetricsEngine.js';
import {
  evaluateAudioRegressionPolicy,
  summarizeAudioRegressionPolicy,
  validateAudioRegressionPolicy
} from '../src/shared/schemas/audioRegressionPolicy.js';

const rootDir = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const outputDir = path.join(rootDir, 'docs', 'repair');
const outputPath = path.join(outputDir, 'AUDIO_FIXTURE_REGRESSION.md');
const jsonPath = path.join(outputDir, 'audio-fixture-regression.json');
const policyPath = path.join(rootDir, 'qa', 'audio', 'policies', 'eq-render-a-b.json');
const sampleRate = 48000;

const before = mix([
  sine(120, 0.32),
  sine(4200, 0.04)
]);
const after = mix([
  sine(120, 0.32),
  sine(4200, 0.22)
]);
const policyBefore = mix([
  sine(120, 0.24),
  sine(4200, 0.1)
]);
const policyAfter = mix([
  sine(120, 0.24),
  sine(4200, 0.15)
]);
const clipped = Float32Array.from({ length: 4096 }, (_, index) => (index % 8 < 4 ? 1 : -1));
const left = sine(1000, 0.25);

const comparison = compareAudioMetrics({
  sampleRate,
  before: { samples: before },
  after: { samples: after },
  targetBands: ['presence', 'cue']
});
const policyComparison = compareAudioMetrics({
  sampleRate,
  before: { samples: policyBefore },
  after: { samples: policyAfter },
  targetBands: ['presence', 'cue']
});
const clipping = analyzeAudioMetrics({ sampleRate, samples: clipped });
const inverted = analyzeAudioMetrics({
  sampleRate,
  channelData: [left, Float32Array.from(left, (value) => -value)]
});
const usable = analyzeAudioMetrics({
  sampleRate,
  channelData: [after, after]
});
const policyCapture = analyzeAudioMetrics({
  sampleRate,
  channelData: [policyAfter, policyAfter]
});
const ffmpegPlan = buildFfmpegAudioMetricPlan({
  inputPath: 'fixture.wav',
  beforePath: 'before.wav',
  afterPath: 'after.wav'
});
const eqRenderPolicy = JSON.parse(readFileSync(policyPath, 'utf8'));
const policyValidation = validateAudioRegressionPolicy(eqRenderPolicy);
const policyResult = evaluateAudioRegressionPolicy(eqRenderPolicy, {
  integratedLoudnessDeltaLufs: policyComparison.delta.loudnessDeltaDb,
  phaseAverage: policyCapture.buckets.spatialStereoHealth.correlation,
  cueBandGainIncreaseDb: policyComparison.delta.targetDeltaDb,
  dcOffsetWarning: Math.abs(policyCapture.buckets.chainIntegrity.dcOffset) > 0.01,
  clippingEvent: policyCapture.buckets.loudnessDynamics.status === 'fail',
  outputDeviceChangedMidTest: false,
  communicationsEndpointHijacksRenderPath: false,
  doubleProcessingSignatureDetected: false
});

const checks = [
  {
    id: 'spectral-cue-region',
    status: comparison.delta.targetDeltaDb >= 5 && comparison.verdict.intendedCueRegionChanged ? 'PASS' : 'FAIL',
    detail: `Cue/presence delta ${comparison.delta.targetDeltaDb}dB.`
  },
  {
    id: 'louder-but-not-clearer-guard',
    status: !comparison.verdict.louderButNotClearer && !comparison.verdict.lowMaskGotWorse ? 'PASS' : 'FAIL',
    detail: `Low-mask delta ${comparison.delta.lowMaskDeltaDb}dB, loudness delta ${comparison.delta.loudnessDeltaDb}dB.`
  },
  {
    id: 'clipping-risk',
    status: clipping.buckets.loudnessDynamics.status === 'fail' && clipping.buckets.loudnessDynamics.clippingRisk >= 80 ? 'PASS' : 'FAIL',
    detail: `Clipping risk ${clipping.buckets.loudnessDynamics.clippingRisk}/100.`
  },
  {
    id: 'phase-inversion',
    status: inverted.buckets.spatialStereoHealth.status === 'fail' && inverted.buckets.spatialStereoHealth.polarityInversionRisk ? 'PASS' : 'FAIL',
    detail: 'Stereo polarity inversion is detected as a fail state.'
  },
  {
    id: 'ffmpeg-reference-plan',
    status: hasReferenceFilters(ffmpegPlan) ? 'PASS' : 'FAIL',
    detail: 'FFmpeg astats, ebur128, aphasemeter, and axcorrelate references are declared.'
  },
  {
    id: 'eq-render-a-b-policy',
    status: policyValidation.ok && policyResult.ok ? 'PASS' : 'FAIL',
    detail: policyResult.ok
      ? 'Policy locks WASAPI loopback, +/-1 LUFS, phase > 0.95, cue +1.5 to +3dB, no DC offset, and no clipping.'
      : policyResult.failures.join('; ')
  },
  {
    id: 'usable-signal',
    status: usable.buckets.chainIntegrity.status === 'pass' ? 'PASS' : 'FAIL',
    detail: `Chain integrity ${usable.buckets.chainIntegrity.status}.`
  }
];

const summary = {
  schema: 'cueforge.audio-fixture-regression.v1',
  generatedAt: new Date().toISOString(),
  status: checks.every((check) => check.status === 'PASS') ? 'PASS' : 'FAIL',
  checks,
  thresholds: {
    minCueDeltaDb: 5,
    maxLowMaskDeltaDb: 1.5,
    eqRenderAB: summarizeAudioRegressionPolicy(eqRenderPolicy),
    minClippingRiskForClippedFixture: 80,
    phaseInversionMustFail: true
  },
  metrics: {
    targetDeltaDb: comparison.delta.targetDeltaDb,
    lowMaskDeltaDb: comparison.delta.lowMaskDeltaDb,
    loudnessDeltaDb: comparison.delta.loudnessDeltaDb,
    clippingRisk: clipping.buckets.loudnessDynamics.clippingRisk,
    phaseStatus: inverted.buckets.spatialStereoHealth.status,
    eqRenderAB: policyResult.metrics
  },
  policies: {
    eqRenderAB: policyResult
  }
};

mkdirSync(outputDir, { recursive: true });
writeFileSync(jsonPath, JSON.stringify(summary, null, 2), 'utf8');
writeFileSync(outputPath, formatMarkdown(summary), 'utf8');

console.log(`Audio fixture regression: ${summary.status}`);
checks.forEach((check) => console.log(`${check.status} - ${check.id}: ${check.detail}`));
console.log(`Output: ${path.relative(rootDir, outputPath)}`);

if (summary.status !== 'PASS') process.exit(1);

function hasReferenceFilters(plan) {
  const text = JSON.stringify(plan).toLowerCase();
  return ['astats', 'ebur128', 'aphasemeter', 'axcorrelate'].every((needle) => text.includes(needle));
}

function sine(freq, gain, length = 4096) {
  return Float32Array.from({ length }, (_, index) => Math.sin((2 * Math.PI * freq * index) / sampleRate) * gain);
}

function mix(parts) {
  const length = Math.min(...parts.map((part) => part.length));
  return Float32Array.from({ length }, (_, index) => parts.reduce((sum, part) => sum + part[index], 0));
}

function formatMarkdown(result) {
  return [
    '# Audio Fixture Regression',
    '',
    `Status: ${result.status}`,
    `Generated: ${result.generatedAt}`,
    '',
    '| Check | Status | Detail |',
    '| --- | --- | --- |',
    ...result.checks.map((check) => `| ${check.id} | ${check.status} | ${check.detail} |`),
    '',
    '## Metrics',
    '',
    `- Cue/presence delta: ${result.metrics.targetDeltaDb}dB`,
    `- Low-mask delta: ${result.metrics.lowMaskDeltaDb}dB`,
    `- Loudness delta: ${result.metrics.loudnessDeltaDb}dB`,
    `- Clipping risk fixture: ${result.metrics.clippingRisk}/100`,
    `- Phase fixture status: ${result.metrics.phaseStatus}`,
    `- EQ render A/B policy: ${result.policies.eqRenderAB.status} (${result.metrics.eqRenderAB.cueBandGainIncreaseDb}dB cue lift, ${result.metrics.eqRenderAB.integratedLoudnessDeltaLufs} LUFS loudness delta, phase ${result.metrics.eqRenderAB.phaseAverage})`,
    '',
    'Boundary: this runner uses deterministic synthetic buffers only. It does not capture, upload, route, or apply live audio.'
  ].join('\n') + '\n';
}
