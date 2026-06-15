import { describe, expect, it } from 'vitest';
import {
  buildAudioIngestQaPlan,
  buildAudioIngestManifestPlan,
  buildFfmpegChannelSplitPlan,
  buildFfprobeAudioStreamCommand,
  buildPythonLoudnessProbePlan,
  evaluateAudioIngestQa,
  normalizeAudioIngestManifest,
  parseFfprobeAudioStream
} from '../core/audioIngestQaGate.js';

const cleanFfprobeJson = {
  streams: [
    {
      codec_type: 'audio',
      codec_name: 'pcm_s24le',
      sample_rate: '48000',
      channels: 2,
      channel_layout: 'stereo',
      bits_per_raw_sample: '24'
    }
  ]
};

describe('audio ingest QA gate', () => {
  it('builds ffprobe metadata extraction and parses sample rate, channels, and bit depth', () => {
    const command = buildFfprobeAudioStreamCommand('captures/match.wav');
    const parsed = parseFfprobeAudioStream(cleanFfprobeJson);

    expect(command).toContain('ffprobe');
    expect(command).toContain('-show_entries stream=codec_type,codec_name,sample_rate,channels,channel_layout,bits_per_sample,bits_per_raw_sample');
    expect(command).toContain('-of json');
    expect(parsed).toMatchObject({
      codecName: 'pcm_s24le',
      sampleRate: 48000,
      channels: 2,
      channelLayout: 'stereo',
      bitDepth: 24
    });
  });

  it('fails early when metadata does not match the CueForge ingest policy', () => {
    const result = evaluateAudioIngestQa({
      ffprobe: {
        streams: [
          {
            codec_type: 'audio',
            codec_name: 'aac',
            sample_rate: '44100',
            channels: 6,
            bits_per_sample: 16
          }
        ]
      },
      channelMetrics: []
    });

    expect(result.ok).toBe(false);
    expect(result.stage).toBe('metadata');
    expect(result.failures).toContain('sample rate 44100 does not match required 48000.');
    expect(result.failures).toContain('channel count 6 does not match required 2.');
    expect(result.failures).toContain('codec aac is not in allowed ingest codecs: pcm_s16le, pcm_s24le, pcm_s32le, pcm_f32le.');
  });

  it('evaluates per-channel loudness, RMS, peak, correlation, and channel order metrics', () => {
    const result = evaluateAudioIngestQa({
      ffprobe: cleanFfprobeJson,
      channelMetrics: [
        { channel: 'L', integratedLufs: -18.2, rmsDbfs: -19, truePeakDbfs: -1.5, silencePercent: 1 },
        { channel: 'R', integratedLufs: -17.8, rmsDbfs: -18.7, truePeakDbfs: -1.3, silencePercent: 1 }
      ],
      correlations: [{ pair: 'L/R', value: 0.42 }],
      patternChecks: [{ id: 'left-right-id', expected: 'L then R', actual: 'L then R', ok: true }]
    });

    expect(result.ok).toBe(true);
    expect(result.stage).toBe('passed');
    expect(result.failures).toEqual([]);
    expect(result.summary).toMatchObject({
      status: 'pass',
      sampleRate: 48000,
      channels: 2,
      bitDepth: 24
    });
  });

  it('catches loudness, true-peak, silence, and channel correlation violations', () => {
    const result = evaluateAudioIngestQa({
      ffprobe: cleanFfprobeJson,
      channelMetrics: [
        { channel: 'L', integratedLufs: -10, rmsDbfs: -11, truePeakDbfs: -0.1, silencePercent: 0 },
        { channel: 'R', integratedLufs: -28, rmsDbfs: -29, truePeakDbfs: -8, silencePercent: 88 }
      ],
      correlations: [{ pair: 'L/R', value: 0.995 }],
      patternChecks: [{ id: 'left-right-id', expected: 'L then R', actual: 'R then L', ok: false }]
    });

    expect(result.ok).toBe(false);
    expect(result.stage).toBe('metrics');
    expect(result.failures.join(' ')).toMatch(/LUFS|true peak|silence|correlation|left-right-id/i);
  });

  it('builds channel split and Python loudness probe plans without storing raw audio in reports', () => {
    const split = buildFfmpegChannelSplitPlan({
      inputPath: 'captures/match.wav',
      outputDir: 'qa/audio/tmp/match',
      channels: 2
    });
    const loudness = buildPythonLoudnessProbePlan({
      inputPath: 'qa/audio/tmp/match/channel-1.wav',
      channelLabel: 'L'
    });

    expect(split.commands).toHaveLength(2);
    expect(split.commands[0]).toContain('-map_channel 0.0.0');
    expect(split.outputs).toEqual(['qa/audio/tmp/match/channel-1.wav', 'qa/audio/tmp/match/channel-2.wav']);
    expect(loudness.libraries).toEqual(['soundfile', 'numpy', 'pyloudnorm']);
    expect(loudness.outputsRawAudio).toBe(false);
    expect(loudness.metrics).toContain('integratedLufs');
  });

  it('builds a CI-safe ingest plan with ffprobe, channel split, metrics, and optional normalization advice', () => {
    const plan = buildAudioIngestQaPlan({
      inputPath: 'captures/match.wav',
      outputDir: 'qa/audio/tmp/match'
    });

    expect(plan.schema).toBe('cueforge.audio-ingest-qa-plan.v1');
    expect(plan.steps.map((step) => step.id)).toEqual([
      'ffprobe-metadata',
      'ffmpeg-channel-split',
      'python-loudness-probe',
      'cueforge-threshold-gate',
      'optional-normalization-after-pass'
    ]);
    expect(plan.boundary).toContain('does not upload raw audio');
    expect(plan.normalization.command).toContain('ffmpeg-normalize');
    expect(plan.normalization.when).toBe('after QA passes or with an explicit repair task');
  });

  it('normalizes the export manifest into required and optional CueForge audio export slots', () => {
    const manifest = normalizeAudioIngestManifest({
      exports: [
        { id: 'ci-fixture', label: 'CI fixture', path: 'qa/audio/ci/stereo-pass.wav', required: true },
        { id: 'sound-match-preview', label: 'Sound Match preview', path: 'qa/audio/exports/sound-match-preview.wav' }
      ]
    });

    expect(manifest.schema).toBe('cueforge.audio-export-manifest.v1');
    expect(manifest.exports).toHaveLength(2);
    expect(manifest.exports[0]).toMatchObject({
      id: 'ci-fixture',
      required: true,
      outputDir: 'qa/audio/tmp/ci-fixture',
      metricsPath: 'qa/audio/tmp/ci-fixture/metrics.json'
    });
    expect(manifest.exports[1]).toMatchObject({
      id: 'sound-match-preview',
      required: false,
      category: 'cueforge-export'
    });
  });

  it('builds a manifest-wide plan for one command that can gate every listed export', () => {
    const plan = buildAudioIngestManifestPlan({
      manifest: {
        exports: [
          { id: 'ci-fixture', label: 'CI fixture', path: 'qa/audio/ci/stereo-pass.wav', required: true },
          { id: 'obs-stream-check', label: 'OBS stream check', path: 'qa/audio/exports/obs-stream-check.wav', required: false }
        ]
      },
      outputRoot: 'qa/audio/ci'
    });

    expect(plan.schema).toBe('cueforge.audio-ingest-manifest-plan.v1');
    expect(plan.command).toBe('npm run qa:audio-ingest -- --manifest qa/audio/export-manifest.json --output-dir qa/audio/ci');
    expect(plan.exports.map((item) => item.id)).toEqual(['ci-fixture', 'obs-stream-check']);
    expect(plan.exports[0].plan.steps.map((step) => step.id)).toContain('python-loudness-probe');
    expect(plan.exports[0].metricsCommand).toContain('tools/Measure-AudioIngestMetrics.py');
    expect(plan.boundary).toContain('derived JSON');
  });
});
