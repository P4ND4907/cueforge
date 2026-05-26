#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateReleaseCandidateAcceptance } from '../src/data/releaseAcceptanceChecklist.js';

const rootDir = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const outputDir = path.join(rootDir, 'docs', 'repair');
const outputPath = path.join(outputDir, 'RELEASE_READINESS.md');
const jsonPath = path.join(outputDir, 'release-readiness.json');
const packageJson = JSON.parse(readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const version = packageJson.version;
const needs = parseNeeds(process.env.NEEDS_JSON);
const githubRef = process.env.GITHUB_REF || '';
const githubRefName = process.env.GITHUB_REF_NAME || '';
const isTag = githubRef.startsWith('refs/tags/');
const isReleaseCandidate = isTag || process.env.CUEFORGE_RELEASE_CANDIDATE === 'true';
const releaseAcceptance = evaluateReleaseCandidateAcceptance({
  realWindowsLoopbackRegressionPassed:
    process.env.CUEFORGE_REAL_LOOPBACK_PROOF === 'true' ||
    process.env.CUEFORGE_REAL_WINDOWS_LOOPBACK_PASSED === 'true'
});

const checks = [
  check('package-version-present', Boolean(version), `package.json version ${version || 'missing'}.`),
  check('state-version-match', fileContains('src/core/stateAdapters.js', version) && fileContains('src/core/cueforgeState.js', version), `Core state files reference ${version}.`),
  check('release-pack-version-match', fileContains('src/core/exportSchema.js', version) && fileContains('src/main.jsx', version), `Release pack/app copy references ${version}.`),
  check('acceptance-doc-version-match', fileContains('docs/ACCEPTANCE_CHECKLIST_v0.2.0.md', version), `Acceptance checklist references ${version}.`),
  check('docs-bundle-present', existsSync(path.join(rootDir, 'docs', 'index.html')), 'GitHub Pages entrypoint exists.'),
  check('workflow-needs-green', needsAreGreen(needs), summarizeNeeds(needs)),
  check(
    'release-candidate-acceptance',
    !isReleaseCandidate || releaseAcceptance.ready,
    isReleaseCandidate
      ? summarizeReleaseAcceptance(releaseAcceptance)
      : `Not enforcing for local metadata run. Candidate status: ${releaseAcceptance.status}; blockers: ${releaseAcceptance.blockers.length}.`
  ),
  check('tag-version-match', !isTag || stripTag(githubRefName) === version, isTag ? `Tag ${githubRefName} vs package ${version}.` : 'Not a tag-triggered release.')
];

const result = {
  schema: 'cueforge.release-readiness.v1',
  generatedAt: new Date().toISOString(),
  version,
  ref: githubRef || 'local',
  status: checks.every((item) => item.status === 'PASS') ? 'PASS' : 'FAIL',
  checks,
  releaseAcceptance
};

mkdirSync(outputDir, { recursive: true });
writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf8');
writeFileSync(outputPath, formatMarkdown(result), 'utf8');

console.log(`Release readiness: ${result.status}`);
checks.forEach((item) => console.log(`${item.status} - ${item.id}: ${item.detail}`));
console.log(`Release candidate acceptance: ${releaseAcceptance.status}`);
console.log(`Output: ${path.relative(rootDir, outputPath)}`);

if (result.status !== 'PASS') process.exit(1);

function check(id, ok, detail) {
  return { id, status: ok ? 'PASS' : 'FAIL', detail };
}

function fileContains(relativePath, needle) {
  const fullPath = path.join(rootDir, relativePath);
  return existsSync(fullPath) && readFileSync(fullPath, 'utf8').includes(needle);
}

function parseNeeds(raw) {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function needsAreGreen(value) {
  const entries = Object.entries(value || {});
  if (!entries.length) return true;
  return entries.every(([, job]) => job?.result === 'success');
}

function summarizeNeeds(value) {
  const entries = Object.entries(value || {});
  if (!entries.length) return 'No GitHub Actions dependency context was provided; local metadata checks only.';
  return entries.map(([name, job]) => `${name}: ${job?.result || 'unknown'}`).join(', ');
}

function summarizeReleaseAcceptance(value) {
  if (value.ready) return 'Release-candidate acceptance checklist is fully proven.';
  const hard = value.hardBlockers.map((item) => item.id).join(', ') || 'none';
  const blockers = value.blockers.map((item) => item.id).join(', ');
  return `Release-candidate acceptance is blocked. Hard blockers: ${hard}. Blockers: ${blockers}.`;
}

function stripTag(value = '') {
  return String(value).replace(/^v/i, '');
}

function formatMarkdown(result) {
  return [
    '# Release Readiness',
    '',
    `Status: ${result.status}`,
    `Version: ${result.version}`,
    `Ref: ${result.ref}`,
    `Generated: ${result.generatedAt}`,
    '',
    '| Check | Status | Detail |',
    '| --- | --- | --- |',
    ...result.checks.map((item) => `| ${item.id} | ${item.status} | ${item.detail} |`),
    '',
    '## Release Candidate Acceptance',
    '',
    `Status: ${result.releaseAcceptance.status}`,
    `Ready: ${result.releaseAcceptance.ready ? 'yes' : 'no'}`,
    '',
    '| Check | Status | Detail |',
    '| --- | --- | --- |',
    ...result.releaseAcceptance.checks.map((item) => `| ${item.id} | ${item.status} | ${item.detail.replace(/\|/g, '/')} |`),
    '',
    'Boundary: this gate checks release metadata and upstream job results. It does not publish, tag, upload, or modify release assets.'
  ].join('\n') + '\n';
}
