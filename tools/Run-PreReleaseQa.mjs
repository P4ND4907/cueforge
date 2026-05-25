import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const npmBin = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const outputDir = path.join(rootDir, 'docs', 'repair');
const outputPath = path.join(outputDir, 'PRE_RELEASE_QA_RUN.md');

const steps = [
  { label: 'Security and privacy release gate', command: npmBin, args: ['test', '--', 'src/securityPrivacyGate.test.js', 'src/exportFingerprints.test.js', 'src/privacyAudit.test.js', 'src/electronHardening.test.js'] },
  { label: 'Release readiness matrix', command: npmBin, args: ['test', '--', 'src/tests/releaseReadinessMatrix.test.js'] },
  { label: 'Swarm manifest contract', command: npmBin, args: ['run', 'validate:swarm'] },
  { label: 'Unit and regression tests', command: npmBin, args: ['test'] },
  { label: 'Production web build', command: npmBin, args: ['run', 'build'] },
  { label: 'Panda Notes repair queue', command: npmBin, args: ['run', 'notes:repair'] },
  { label: 'Dependency audit', command: npmBin, args: ['audit', '--audit-level=moderate'] }
];

const startedAt = new Date();
const results = steps.map(runStep);
const privacyChecks = runPrivacyChecks();
const repairState = readRepairState();
const blockedSteps = results.filter((item) => item.status === 'BLOCKED');
const failedSteps = results.filter((item) => item.status === 'FAIL');
const failingPrivacyChecks = privacyChecks.filter((item) => item.status !== 'PASS');
const humanCases = [
  'Open the app from a fresh browser state and confirm the first useful screen is clear.',
  'Right-click the top-left, center, bottom-right, and mobile-width areas; Panda Note must stay inside the window and remain typeable.',
  'Save one Panda Note, export notes, run `npm run notes:repair`, and verify the note becomes a repair queue item.',
  'Run Self Test with mic permission allowed, denied, and skipped; each state needs clear recovery copy.',
  'Open Auto Detect in browser mode and desktop mode; browser must explain the boundary, desktop must load the Windows bridge report.',
  'Create a Report Lab packet, import it back, and confirm EQ/game/source/mic state is restored.',
  'Sweep desktop, tablet, and mobile widths for horizontal overflow, clipped buttons, trapped popovers, and unreadable long text.',
  'Confirm Settings starts quiet: background audio off, cinematic audio off, and no surprise playback.'
];

const overallStatus = failedSteps.length || failingPrivacyChecks.length
  ? 'FAIL'
  : blockedSteps.length
    ? 'BLOCKED_ENVIRONMENT'
  : repairState.actionCount > 0
    ? 'BLOCKED_BY_REPAIR_QUEUE'
    : 'PASS';

mkdirSync(outputDir, { recursive: true });
writeFileSync(outputPath, formatReport({
  startedAt,
  completedAt: new Date(),
  overallStatus,
  results,
  privacyChecks,
  repairState,
  humanCases
}));

console.log(`Pre-release QA: ${overallStatus}`);
console.log(`Command checks: ${results.filter((item) => item.status === 'PASS').length}/${results.length} passed`);
console.log(`Blocked checks: ${blockedSteps.length}`);
console.log(`Privacy checks: ${privacyChecks.filter((item) => item.status === 'PASS').length}/${privacyChecks.length} passed`);
console.log(`Repair actions: ${repairState.actionCount}`);
console.log(`Output: ${path.relative(rootDir, outputPath)}`);

if (overallStatus === 'FAIL') process.exit(1);
if (overallStatus === 'BLOCKED_BY_REPAIR_QUEUE') process.exit(2);
if (overallStatus === 'BLOCKED_ENVIRONMENT') process.exit(3);

function runStep(step) {
  const started = Date.now();
  const command = process.platform === 'win32' ? 'cmd.exe' : step.command;
  const args = process.platform === 'win32'
    ? ['/d', '/s', '/c', step.command, ...step.args]
    : step.args;
  const result = spawnSync(command, args, {
    cwd: rootDir,
    encoding: 'utf8',
    env: {
      ...process.env,
      CI: '1',
      FORCE_COLOR: '0',
      NO_COLOR: '1'
    },
    shell: false
  });

  return {
    label: step.label,
    command: [step.command, ...step.args].join(' '),
    status: result.error ? 'BLOCKED' : result.status === 0 ? 'PASS' : 'FAIL',
    durationMs: Date.now() - started,
    error: result.error ? `${result.error.code || 'ERROR'}: ${result.error.message}` : '',
    stdout: trimLog(result.stdout),
    stderr: trimLog(result.stderr)
  };
}

function trimLog(text = '') {
  const clean = sanitizeTerminalText(String(text)).trim();
  if (clean.length <= 2400) return clean;
  return `${clean.slice(0, 1100)}\n...\n${clean.slice(-1100)}`;
}

function sanitizeTerminalText(text) {
  return text
    .replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/âœ“/g, 'ok')
    .replace(/✓/g, 'ok')
    .replace(/â”‚/g, '|')
    .replace(/│/g, '|')
    .replace(/â”€/g, '-')
    .replace(/─/g, '-');
}

function runPrivacyChecks() {
  const forbiddenFiles = [
    'tools/cueforge-audio-setup-report.json',
    'release/win-unpacked/resources/tools/cueforge-audio-setup-report.json',
    'release/win-unpacked/resources/app.asar.unpacked/tools/cueforge-audio-setup-report.json'
  ];

  return forbiddenFiles.map((relativePath) => ({
    label: `Generated private report excluded: ${relativePath}`,
    status: existsSync(path.join(rootDir, relativePath)) ? 'FAIL' : 'PASS'
  }));
}

function readRepairState() {
  const checkPath = path.join(outputDir, 'panda-notes-repair-check.json');
  if (!existsSync(checkPath)) {
    return {
      status: 'missing',
      actionCount: 0,
      noteCount: 0,
      summary: 'No repair check file exists yet.'
    };
  }

  try {
    const parsed = JSON.parse(readFileSync(checkPath, 'utf8'));
    return {
      status: parsed.status || 'unknown',
      actionCount: Array.isArray(parsed.repairActions) ? parsed.repairActions.length : 0,
      noteCount: parsed.summary?.total || 0,
      summary: parsed.boundary || 'Repair queue loaded.'
    };
  } catch (error) {
    return {
      status: 'unreadable',
      actionCount: 1,
      noteCount: 0,
      summary: `Repair check could not be parsed: ${error.message}`
    };
  }
}

function formatReport({
  startedAt,
  completedAt,
  overallStatus,
  results,
  privacyChecks,
  repairState,
  humanCases
}) {
  const lines = [
    '# Pre-Release QA Run',
    '',
    `Status: ${overallStatus}`,
    `Started: ${startedAt.toISOString()}`,
    `Completed: ${completedAt.toISOString()}`,
    '',
    '## Command Gates',
    '',
    '| Gate | Status | Duration | Command |',
    '| --- | --- | ---: | --- |',
    ...results.map((item) => `| ${item.label} | ${item.status} | ${item.durationMs}ms | \`${item.command}\` |`),
    '',
    '## Panda Notes Gate',
    '',
    `- Status: ${repairState.status}`,
    `- Notes scanned: ${repairState.noteCount}`,
    `- Repair actions: ${repairState.actionCount}`,
    `- Boundary: ${repairState.summary}`,
    '',
    '## Privacy Gates',
    '',
    '| Check | Status |',
    '| --- | --- |',
    ...privacyChecks.map((item) => `| ${item.label} | ${item.status} |`),
    '',
    '## Human-Found Bug Standard',
    '',
    'A tester-found issue is not considered fixed until it has:',
    '',
    '1. A reproduction path written in plain player language.',
    '2. A smallest-useful source fix.',
    '3. A unit or data regression test when the behavior can be tested without a browser.',
    '4. A live browser proof for the actual player flow.',
    '5. No console errors, no offscreen UI, no privacy leak, and no hidden Windows/audio change.',
    '6. A release-note or repair-queue entry if players already saw the bug.',
    '',
    '## Live Browser Cases To Run Before Sharing',
    '',
    ...humanCases.map((item, index) => `${index + 1}. ${item}`),
    '',
    '## Logs',
    ''
  ];

  for (const result of results) {
    lines.push(`### ${result.label}`);
    lines.push('');
    if (result.error) {
      lines.push('```text');
      lines.push(result.error);
      lines.push('```');
    }
    if (result.stdout) {
      lines.push('```text');
      lines.push(result.stdout);
      lines.push('```');
    }
    if (result.stderr) {
      lines.push('```text');
      lines.push(result.stderr);
      lines.push('```');
    }
    if (!result.stdout && !result.stderr) lines.push('_No output._');
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}
