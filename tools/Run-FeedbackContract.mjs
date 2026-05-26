#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildBetaTesterPacket, createBetaCheckIn, createTesterId } from '../src/betaCheckIn.js';
import {
  buildCommunityFeedbackPacket,
  createCommunityItem,
  summarizeCommunityFeedback
} from '../src/communityHub.js';
import { buildTesterPacket, feedbackDefaults } from '../src/playerTrial.js';

const rootDir = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const outputDir = path.join(rootDir, 'docs', 'repair');
const outputPath = path.join(outputDir, 'FEEDBACK_CONTRACT.md');
const jsonPath = path.join(outputDir, 'feedback-contract.json');
const now = new Date('2026-05-24T00:00:00.000Z');

const trialPacket = buildTesterPacket({
  feedback: {
    ...feedbackDefaults,
    footsteps: 7,
    direction: 7,
    comms: 8,
    mic: 6,
    fatigue: 7,
    notes: 'Felt clearer after one match. Private path C:\\Users\\carls\\clip.wav and test@example.com must not leak.'
  },
  readiness: { score: 78, status: 'ready-with-warnings' },
  issueReport: { schema: 'cueforge.issue-report.v1', privacy: { redacted: true } },
  eq: [-1, 1, 0, -2, -1, 0, 2, 3, 1, 0],
  game: 'Tarkov / Siege / COD',
  sourceProfile: 'iemFps'
});

const testerId = createTesterId(() => 0.4907);
const checkIn = createBetaCheckIn({
  testerId,
  handle: 'P4ND4907',
  game: 'Tarkov / Siege / COD',
  gear: 'IEM + USB mic',
  source: 'discord',
  now
});
const betaPacket = buildBetaTesterPacket({
  testerId,
  checkIns: [checkIn],
  notes: 'Tester wants a cleaner setup flow.',
  evidence: [{
    recordedAt: now.toISOString(),
    durationMs: 12000,
    level: 42,
    voicePresence: 72,
    noise: 18,
    clipRisk: 4,
    recommendation: 'Mic is usable.',
    suggestedTweak: 'Keep suppression light.'
  }],
  now
});

const communityItems = [
  createCommunityItem({
    source: 'Discord',
    handle: 'Panda',
    game: 'Valorant / CS2',
    gear: 'USB headset + mic',
    choice: 'this',
    type: 'Direction',
    note: 'The route graph made the next setup step obvious.',
    now
  })
];
const communityPacket = buildCommunityFeedbackPacket({
  summary: summarizeCommunityFeedback(communityItems),
  items: communityItems,
  approvalQueue: [],
  now
});

const checks = [
  {
    id: 'player-trial-schema',
    status: trialPacket.schema === 'cueforge.player-trial.v1' && trialPacket.feedback.score > 0 ? 'PASS' : 'FAIL',
    detail: `${trialPacket.feedback.status} / ${trialPacket.feedback.score}`
  },
  {
    id: 'player-trial-redaction',
    status: leaksPrivateText(trialPacket) ? 'FAIL' : 'PASS',
    detail: 'Trial notes redact local paths and emails.'
  },
  {
    id: 'beta-packet-schema',
    status: betaPacket.schema === 'cueforge.beta-tester-packet.v1' && betaPacket.summary.totalCheckIns === 1 ? 'PASS' : 'FAIL',
    detail: `${betaPacket.summary.totalCheckIns} check-in accepted.`
  },
  {
    id: 'community-packet-schema',
    status: communityPacket.schema === 'cueforge.community-packet.v2' && communityPacket.summary.total === 1 ? 'PASS' : 'FAIL',
    detail: `${communityPacket.summary.topIssue} from ${communityPacket.summary.topSource}.`
  },
  {
    id: 'feedback-privacy-flags',
    status: betaPacket.privacy.containsRawDeviceIds === false && betaPacket.privacy.containsPhone === false ? 'PASS' : 'FAIL',
    detail: 'Feedback packets declare no raw IDs, phone numbers, DOB, or passwords.'
  }
];

const result = {
  schema: 'cueforge.feedback-contract-run.v1',
  generatedAt: new Date().toISOString(),
  status: checks.every((check) => check.status === 'PASS') ? 'PASS' : 'FAIL',
  checks,
  acceptedSchemas: [
    trialPacket.schema,
    betaPacket.schema,
    communityPacket.schema
  ]
};

mkdirSync(outputDir, { recursive: true });
writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf8');
writeFileSync(outputPath, formatMarkdown(result), 'utf8');

console.log(`Feedback contract: ${result.status}`);
checks.forEach((check) => console.log(`${check.status} - ${check.id}: ${check.detail}`));
console.log(`Output: ${path.relative(rootDir, outputPath)}`);

if (result.status !== 'PASS') process.exit(1);

function leaksPrivateText(value) {
  const text = JSON.stringify(value);
  return /[A-Z]:\\|test@example\.com|907[- ]?\d{3}[- ]?\d{4}|Egyptian13/i.test(text);
}

function formatMarkdown(result) {
  return [
    '# Feedback Contract',
    '',
    `Status: ${result.status}`,
    `Generated: ${result.generatedAt}`,
    '',
    '| Check | Status | Detail |',
    '| --- | --- | --- |',
    ...result.checks.map((check) => `| ${check.id} | ${check.status} | ${check.detail} |`),
    '',
    'Accepted schemas:',
    '',
    ...result.acceptedSchemas.map((schema) => `- \`${schema}\``),
    '',
    'Boundary: this runner validates local/redacted packet shape only. It does not post publicly, upload audio, or touch Discord/X/Reddit accounts.'
  ].join('\n') + '\n';
}
