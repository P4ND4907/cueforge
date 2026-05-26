#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAutoDetectReport } from '../src/core/autoDetectReport.js';
import { buildChainGraph } from '../src/core/chainGraph.js';

const rootDir = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const outputDir = path.join(rootDir, 'docs', 'repair');
const outputPath = path.join(outputDir, 'ROUTE_GRAPH_LAB.md');
const jsonPath = path.join(outputDir, 'route-graph-lab-summary.json');
const rawPath = path.join(os.tmpdir(), `cueforge-route-graph-lab-${Date.now()}.json`);

mkdirSync(outputDir, { recursive: true });

if (process.platform !== 'win32') {
  finish({
    status: 'SKIPPED',
    reason: 'Route Graph Lab is Windows-only because it reads Windows endpoint/tool evidence.',
    checks: []
  }, 0);
}

const scan = spawnSync('powershell.exe', [
  '-NoProfile',
  '-ExecutionPolicy',
  'Bypass',
  '-File',
  path.join(rootDir, 'tools', 'Scan-AudioSetup.ps1'),
  '-OutFile',
  rawPath
], {
  cwd: rootDir,
  encoding: 'utf8',
  windowsHide: true
});

if (scan.status !== 0 || !existsSync(rawPath)) {
  finish({
    status: 'FAIL',
    reason: `Windows scan failed or did not write a report. ${trim(scan.stderr || scan.stdout)}`,
    checks: []
  }, 1);
}

const bridgeReport = JSON.parse(readFileSync(rawPath, 'utf8').replace(/^\uFEFF/, ''));
const graph = buildChainGraph({
  browserDevices: [],
  bridgeReport,
  userSelections: {
    desktopReady: true,
    game: bridgeReport.runningGames?.[0]?.name || 'Game audio'
  }
});
const autoDetect = buildAutoDetectReport({
  bridgeReport,
  permissionState: 'unknown',
  desktopReady: true
});

const checks = [
  {
    id: 'windows-endpoint-evidence',
    status: graph.summary.outputs > 0 || graph.summary.inputs > 0 ? 'PASS' : 'FAIL',
    detail: `${graph.summary.outputs} output node(s), ${graph.summary.inputs} input node(s).`
  },
  {
    id: 'chain-graph-detected',
    status: graph.nodes.length > 0 && graph.edges.length > 0 ? 'PASS' : 'FAIL',
    detail: `${graph.nodes.length} node(s), ${graph.edges.length} edge(s), confidence ${graph.confidence}.`
  },
  {
    id: 'autodetect-native-confidence',
    status: autoDetect.source.includes('desktop') && autoDetect.confidence.score > 0 ? 'PASS' : 'FAIL',
    detail: `${autoDetect.source}, confidence ${autoDetect.confidence.score}.`
  },
  {
    id: 'safe-capability-boundary',
    status: bridgeReport.effectsDiscovery?.canModifySystemState === false ? 'PASS' : 'FAIL',
    detail: 'Scanner reports evidence only and cannot modify system state.'
  }
];

finish({
  schema: 'cueforge.route-graph-lab.v1',
  generatedAt: new Date().toISOString(),
  status: checks.every((check) => check.status === 'PASS') ? 'PASS' : 'FAIL',
  checks,
  summary: {
    nodes: graph.nodes.length,
    edges: graph.edges.length,
    confidence: graph.confidence,
    inputs: graph.summary.inputs,
    outputs: graph.summary.outputs,
    companions: graph.summary.companions,
    risks: autoDetect.risks.length,
    source: autoDetect.source
  }
}, checks.every((check) => check.status === 'PASS') ? 0 : 1);

function finish(result, code) {
  writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf8');
  writeFileSync(outputPath, formatMarkdown(result), 'utf8');
  console.log(`Route Graph Lab: ${result.status}`);
  if (result.reason) console.log(result.reason);
  (result.checks || []).forEach((check) => console.log(`${check.status} - ${check.id}: ${check.detail}`));
  console.log(`Output: ${path.relative(rootDir, outputPath)}`);
  process.exit(code);
}

function formatMarkdown(result) {
  const lines = [
    '# Route Graph Lab',
    '',
    `Status: ${result.status}`,
    `Generated: ${result.generatedAt || new Date().toISOString()}`
  ];

  if (result.reason) lines.push('', result.reason);
  if (result.summary) {
    lines.push(
      '',
      '## Summary',
      '',
      `- Source: ${result.summary.source}`,
      `- Nodes: ${result.summary.nodes}`,
      `- Edges: ${result.summary.edges}`,
      `- Confidence: ${result.summary.confidence}`,
      `- Inputs: ${result.summary.inputs}`,
      `- Outputs: ${result.summary.outputs}`,
      `- Companions: ${result.summary.companions}`,
      `- Risks: ${result.summary.risks}`
    );
  }

  lines.push(
    '',
    '| Check | Status | Detail |',
    '| --- | --- | --- |',
    ...(result.checks || []).map((check) => `| ${check.id} | ${check.status} | ${check.detail} |`),
    '',
    'Boundary: raw Windows device IDs and paths are read only into a temporary local file. The committed artifact stores counts and confidence only.'
  );

  return `${lines.join('\n')}\n`;
}

function trim(text = '') {
  const clean = String(text).replace(/\s+/g, ' ').trim();
  return clean.length > 500 ? `${clean.slice(0, 500)}...` : clean;
}
