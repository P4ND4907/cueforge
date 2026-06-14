#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import {
  buildAudioIngestQaPlan,
  evaluateAudioIngestQa
} from '../src/core/audioIngestQaGate.js';

const args = parseArgs(process.argv.slice(2));

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

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === '--plan') parsed.plan = true;
    else if (value === '--input') parsed.input = values[++index];
    else if (value === '--output-dir') parsed.outputDir = values[++index];
    else if (value === '--ffprobe-json') parsed.ffprobeJson = values[++index];
    else if (value === '--metrics-json') parsed.metricsJson = values[++index];
  }
  return parsed;
}
