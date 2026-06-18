#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import {
  buildAudioIngestManifestPlan,
  buildAudioIngestQaPlan,
  evaluateAudioIngestQa
} from '../src/core/audioIngestQaGate.js';

const args = parseArgs(process.argv.slice(2));

if (args.manifest) {
  const manifest = JSON.parse(readFileSync(args.manifest, 'utf8'));
  const plan = buildAudioIngestManifestPlan({
    manifest,
    manifestPath: args.manifest,
    outputRoot: args.outputDir || manifest.outputRoot || 'qa/audio/tmp/manifest'
  });

  if (args.plan) {
    console.log(JSON.stringify(plan, null, 2));
    process.exit(0);
  }

  const summary = runManifestPlan(plan, {
    python: args.python || 'python',
    summaryJson: args.summaryJson
  });
  console.log(JSON.stringify(summary, null, 2));
  process.exit(summary.exitCode);
}

if (args.plan || !args.ffprobeJson) {
  const plan = buildAudioIngestQaPlan({
    inputPath: args.input || '<input.wav>',
    outputDir: args.outputDir || 'qa/audio/tmp/ingest'
  });
  console.log(JSON.stringify(plan, null, 2));
  process.exit(0);
}

const ffprobe = JSON.parse(readFileSync(args.ffprobeJson, 'utf8'));
const metricsPayload = args.metricsJson ? JSON.parse(readFileSync(args.metricsJson, 'utf8')) : {};
const result = evaluateAudioIngestQa({
  ffprobe,
  channelMetrics: metricsPayload.channelMetrics ?? [],
  correlations: metricsPayload.correlations ?? [],
  patternChecks: metricsPayload.patternChecks ?? []
});

console.log(JSON.stringify(result, null, 2));
process.exit(result.exitCode);

function runManifestPlan(plan, { python, summaryJson } = {}) {
  const entries = [];

  for (const item of plan.exports) {
    if (!existsSync(item.path)) {
      const skipped = {
        id: item.id,
        label: item.label,
        path: item.path,
        status: item.required ? 'fail' : 'skipped',
        required: item.required,
        reason: item.required ? 'required audio file is missing' : 'optional audio export is not present yet'
      };
      entries.push(skipped);
      continue;
    }

    mkdirSync(item.outputDir, { recursive: true });

    const ffprobe = runJsonCommand('ffprobe', [
      '-v', 'error',
      '-select_streams', 'a:0',
      '-show_entries', 'stream=codec_type,codec_name,sample_rate,channels,channel_layout,bits_per_sample,bits_per_raw_sample',
      '-of', 'json',
      item.path
    ]);
    writeJson(item.ffprobePath, ffprobe);

    const metrics = runJsonCommand(python, [
      'tools/Measure-AudioIngestMetrics.py',
      '--input', item.path,
      '--output', item.metricsPath,
      '--json'
    ]);
    if (!existsSync(item.metricsPath)) writeJson(item.metricsPath, metrics);

    const result = evaluateAudioIngestQa({
      ffprobe,
      channelMetrics: metrics.channelMetrics ?? [],
      correlations: metrics.correlations ?? [],
      patternChecks: metrics.patternChecks ?? []
    });
    writeJson(item.resultPath, result);

    entries.push({
      id: item.id,
      label: item.label,
      path: item.path,
      required: item.required,
      status: result.ok ? 'pass' : 'fail',
      resultPath: item.resultPath,
      ffprobePath: item.ffprobePath,
      metricsPath: item.metricsPath,
      failures: result.failures
    });
  }

  const failed = entries.filter((entry) => entry.status === 'fail');
  const summary = {
    schema: 'cueforge.audio-ingest-manifest-summary.v1',
    productName: 'CueForge',
    status: failed.length ? 'fail' : 'pass',
    checked: entries.filter((entry) => ['pass', 'fail'].includes(entry.status)).length,
    skipped: entries.filter((entry) => entry.status === 'skipped').length,
    failed: failed.length,
    entries,
    boundary: 'Summary contains derived metadata, metrics, paths, and pass/fail state only; raw audio is not embedded.',
    exitCode: failed.length ? 1 : 0
  };

  if (summaryJson) writeJson(summaryJson, summary);
  return summary;
}

function runJsonCommand(command, commandArgs) {
  const result = spawnSync(command, commandArgs, {
    cwd: process.cwd(),
    encoding: 'utf8',
    windowsHide: true
  });
  if (result.error) {
    const errorCode = result.error.code ? ` (${result.error.code})` : '';
    const guidance = result.error.code === 'ENOENT'
      ? ' Ensure the binary is installed and available on PATH.'
      : '';
    throw new Error(`${command} failed to start${errorCode}: ${result.error.message}${guidance}`);
  }
  if (typeof result.status !== 'number') {
    const signal = result.signal ? ` signal ${result.signal}` : '';
    const detail = result.stderr || result.stdout;
    const hint = detail
      ? ` ${detail}`
      : ` ${command} may be missing from PATH or blocked from launching in this environment.`;
    throw new Error(`${command} did not complete successfully.${signal}${hint}`);
  }
  if (result.status !== 0) {
    const detail = result.stderr || result.stdout || 'no stdout/stderr captured';
    throw new Error(`${command} failed with code ${result.status}: ${detail}`);
  }
  try {
    return JSON.parse(result.stdout || '{}');
  } catch (error) {
    throw new Error(`${command} did not print JSON: ${error.message}\n${result.stdout}`);
  }
}

function writeJson(filePath, value) {
  const absolute = resolve(filePath);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === '--plan') parsed.plan = true;
    else if (value === '--input') parsed.input = values[++index];
    else if (value === '--output-dir') parsed.outputDir = values[++index];
    else if (value === '--ffprobe-json') parsed.ffprobeJson = values[++index];
    else if (value === '--metrics-json') parsed.metricsJson = values[++index];
    else if (value === '--manifest') parsed.manifest = values[++index];
    else if (value === '--summary-json') parsed.summaryJson = values[++index];
    else if (value === '--python') parsed.python = values[++index];
  }
  return parsed;
}
