export const audioIngestQaPolicy = {
  schema: 'cueforge.audio-ingest-qa-policy.v1',
  productName: 'CueForge',
  requiredSampleRate: 48000,
  requiredChannels: 2,
  allowedBitDepths: [16, 24, 32],
  allowedCodecs: ['pcm_s16le', 'pcm_s24le', 'pcm_s32le', 'pcm_f32le'],
  targetIntegratedLufs: -18,
  maxIntegratedLufsDelta: 4,
  maxChannelLufsSpread: 3,
  maxTruePeakDbfs: -1,
  maxSilencePercent: 35,
  maxCorrelation: 0.98,
  minCorrelation: -0.8,
  rawAudioLeavesMachine: false
};

export function buildFfprobeAudioStreamCommand(inputPath = '<input.wav>') {
  return [
    'ffprobe',
    '-v error',
    '-select_streams a:0',
    '-show_entries stream=codec_type,codec_name,sample_rate,channels,channel_layout,bits_per_sample,bits_per_raw_sample',
    '-of json',
    quotePath(inputPath)
  ].join(' ');
}

export function parseFfprobeAudioStream(input = {}) {
  const payload = typeof input === 'string' ? JSON.parse(input) : input;
  const stream = (payload.streams ?? []).find((candidate) => candidate.codec_type === 'audio') ?? payload.streams?.[0] ?? {};
  const rawBits = firstFiniteNumber(stream.bits_per_raw_sample, stream.bits_per_sample, inferBitDepthFromCodec(stream.codec_name));

  return {
    schema: 'cueforge.ffprobe-audio-stream.v1',
    codecName: stream.codec_name ?? 'unknown',
    sampleRate: firstFiniteNumber(stream.sample_rate),
    channels: firstFiniteNumber(stream.channels),
    channelLayout: stream.channel_layout ?? 'unknown',
    bitDepth: rawBits,
    source: 'ffprobe'
  };
}

export function buildFfmpegChannelSplitPlan({
  inputPath = '<input.wav>',
  outputDir = 'qa/audio/tmp',
  channels = audioIngestQaPolicy.requiredChannels
} = {}) {
  const outputs = Array.from({ length: channels }, (_, index) => `${outputDir}/channel-${index + 1}.wav`);
  return {
    schema: 'cueforge.ffmpeg-channel-split-plan.v1',
    inputPath,
    outputDir,
    channels,
    outputs,
    commands: outputs.map((output, index) => [
      'ffmpeg',
      '-hide_banner',
      '-y',
      '-i',
      quotePath(inputPath),
      `-map_channel 0.0.${index}`,
      quotePath(output)
    ].join(' ')),
    boundary: 'Local channel isolation only. Split files are temporary QA artifacts and are not included in public reports.'
  };
}

export function buildPythonLoudnessProbePlan({
  inputPath = '<channel.wav>',
  channelLabel = 'L'
} = {}) {
  return {
    schema: 'cueforge.python-loudness-probe-plan.v1',
    inputPath,
    channelLabel,
    libraries: ['soundfile', 'numpy', 'pyloudnorm'],
    algorithm: 'ITU-R BS.1770 integrated loudness via pyloudnorm',
    metrics: ['integratedLufs', 'rmsDbfs', 'truePeakDbfs', 'silencePercent'],
    outputsRawAudio: false,
    command: `python tools/scripts/Measure-AudioLoudness.py --input ${quotePath(inputPath)} --channel ${quoteArg(channelLabel)} --json`
  };
}

export function buildAudioIngestQaPlan({
  inputPath = '<input.wav>',
  outputDir = 'qa/audio/tmp/ingest',
  channels = audioIngestQaPolicy.requiredChannels
} = {}) {
  return {
    schema: 'cueforge.audio-ingest-qa-plan.v1',
    productName: 'CueForge',
    inputPath,
    policy: audioIngestQaPolicy,
    steps: [
      {
        id: 'ffprobe-metadata',
        command: buildFfprobeAudioStreamCommand(inputPath),
        gates: ['sample rate', 'channel count', 'bit depth', 'codec']
      },
      {
        id: 'ffmpeg-channel-split',
        ...buildFfmpegChannelSplitPlan({ inputPath, outputDir, channels })
      },
      {
        id: 'python-loudness-probe',
        probes: Array.from({ length: channels }, (_, index) => buildPythonLoudnessProbePlan({
          inputPath: `${outputDir}/channel-${index + 1}.wav`,
          channelLabel: channelLabelFor(index)
        }))
      },
      {
        id: 'cueforge-threshold-gate',
        gates: [
          'per-channel LUFS target window',
          'channel loudness spread',
          'true peak ceiling',
          'silence percent',
          'left/right correlation',
          'pattern/channel-order checks'
        ]
      },
      {
        id: 'optional-normalization-after-pass',
        tool: 'ffmpeg-normalize'
      }
    ],
    normalization: {
      tool: 'ffmpeg-normalize',
      when: 'after QA passes or with an explicit repair task',
      command: `ffmpeg-normalize ${quotePath(inputPath)} -o ${quotePath(`${outputDir}/normalized.wav`)} -f --target-level ${audioIngestQaPolicy.targetIntegratedLufs}`
    },
    boundary: 'This plan analyzes local or CI-provided files, reports derived metrics, and does not upload raw audio or mutate player settings.'
  };
}

export function evaluateAudioIngestQa({
  ffprobe,
  channelMetrics = [],
  correlations = [],
  patternChecks = [],
  policy = audioIngestQaPolicy
} = {}) {
  const metadata = parseFfprobeAudioStream(ffprobe ?? {});
  const failures = [];
  const warnings = [];

  if (metadata.sampleRate !== policy.requiredSampleRate) {
    failures.push(`sample rate ${metadata.sampleRate} does not match required ${policy.requiredSampleRate}.`);
  }
  if (metadata.channels !== policy.requiredChannels) {
    failures.push(`channel count ${metadata.channels} does not match required ${policy.requiredChannels}.`);
  }
  if (!policy.allowedBitDepths.includes(metadata.bitDepth)) {
    failures.push(`bit depth ${metadata.bitDepth} is not allowed; expected one of ${policy.allowedBitDepths.join(', ')}.`);
  }
  if (!policy.allowedCodecs.includes(metadata.codecName)) {
    failures.push(`codec ${metadata.codecName} is not in allowed ingest codecs: ${policy.allowedCodecs.join(', ')}.`);
  }

  if (failures.length) {
    return buildQaResult({ metadata, failures, warnings, stage: 'metadata', channelMetrics, correlations, patternChecks, policy });
  }

  const channelLoudness = [];
  for (const metric of channelMetrics) {
    const label = metric.channel ?? `ch-${channelLoudness.length + 1}`;
    const integratedLufs = Number(metric.integratedLufs);
    const truePeakDbfs = Number(metric.truePeakDbfs);
    const silencePercent = Number(metric.silencePercent ?? 0);

    if (!Number.isFinite(integratedLufs)) {
      failures.push(`${label} LUFS is missing.`);
    } else {
      channelLoudness.push(integratedLufs);
      if (Math.abs(integratedLufs - policy.targetIntegratedLufs) > policy.maxIntegratedLufsDelta) {
        failures.push(`${label} LUFS ${integratedLufs} is outside target ${policy.targetIntegratedLufs} +/-${policy.maxIntegratedLufsDelta}.`);
      }
    }

    if (Number.isFinite(truePeakDbfs) && truePeakDbfs > policy.maxTruePeakDbfs) {
      failures.push(`${label} true peak ${truePeakDbfs} dBFS exceeds ceiling ${policy.maxTruePeakDbfs} dBFS.`);
    }
    if (Number.isFinite(silencePercent) && silencePercent > policy.maxSilencePercent) {
      failures.push(`${label} silence ${silencePercent}% exceeds max ${policy.maxSilencePercent}%.`);
    }
  }

  if (channelMetrics.length < policy.requiredChannels) {
    failures.push(`only ${channelMetrics.length} channel metric(s) provided for ${policy.requiredChannels} required channel(s).`);
  }

  if (channelLoudness.length >= 2) {
    const spread = Math.max(...channelLoudness) - Math.min(...channelLoudness);
    if (spread > policy.maxChannelLufsSpread) {
      failures.push(`channel LUFS spread ${round2(spread)} exceeds max ${policy.maxChannelLufsSpread}.`);
    }
  }

  for (const correlation of correlations) {
    const value = Number(correlation.value);
    if (!Number.isFinite(value)) continue;
    if (value > policy.maxCorrelation) {
      failures.push(`${correlation.pair ?? 'channel pair'} correlation ${value} exceeds max ${policy.maxCorrelation}; possible mono collapse.`);
    }
    if (value < policy.minCorrelation) {
      failures.push(`${correlation.pair ?? 'channel pair'} correlation ${value} is below min ${policy.minCorrelation}; possible polarity inversion.`);
    }
  }

  for (const check of patternChecks) {
    if (check.ok !== true) {
      failures.push(`pattern check ${check.id ?? 'unknown'} failed: expected ${check.expected ?? 'unknown'}, actual ${check.actual ?? 'unknown'}.`);
    }
  }

  return buildQaResult({
    metadata,
    failures,
    warnings,
    stage: failures.length ? 'metrics' : 'passed',
    channelMetrics,
    correlations,
    patternChecks,
    policy
  });
}

function buildQaResult({ metadata, failures, warnings, stage, channelMetrics, correlations, patternChecks, policy }) {
  return {
    schema: 'cueforge.audio-ingest-qa.v1',
    productName: 'CueForge',
    ok: failures.length === 0,
    stage,
    failures,
    warnings,
    metadata,
    channelMetrics,
    correlations,
    patternChecks,
    policy: {
      requiredSampleRate: policy.requiredSampleRate,
      requiredChannels: policy.requiredChannels,
      targetIntegratedLufs: policy.targetIntegratedLufs,
      rawAudioLeavesMachine: false
    },
    summary: {
      status: failures.length ? 'fail' : 'pass',
      sampleRate: metadata.sampleRate,
      channels: metadata.channels,
      bitDepth: metadata.bitDepth,
      failureCount: failures.length,
      warningCount: warnings.length
    },
    exitCode: failures.length ? 1 : 0,
    boundary: 'Result contains derived metadata and metrics only; raw audio is not embedded.'
  };
}

function firstFiniteNumber(...values) {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return null;
}

function inferBitDepthFromCodec(codecName = '') {
  const match = String(codecName).match(/(?:s|f)(16|24|32|64)/);
  return match ? Number(match[1]) : null;
}

function channelLabelFor(index) {
  return ['L', 'R', 'C', 'LFE', 'Ls', 'Rs', 'Lrs', 'Rrs'][index] ?? `ch-${index + 1}`;
}

function quotePath(value) {
  return `"${String(value).replaceAll('"', '\\"')}"`;
}

function quoteArg(value) {
  return `"${String(value).replaceAll('"', '\\"')}"`;
}

function round2(value) {
  return Number(value.toFixed(2));
}
