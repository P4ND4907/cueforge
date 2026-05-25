#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const outputDir = path.join(rootDir, 'docs', 'repair');
const markdownPath = path.join(outputDir, 'WORKTREE_CLEANUP_PLAN.md');
const jsonPath = path.join(outputDir, 'worktree-cleanup-plan.json');

const entries = parsePorcelain(git(['status', '--porcelain=v1', '-uall']));
const lanes = groupByLane(entries);
const result = {
  schema: 'cueforge.worktree-cleanup-plan.v1',
  generatedAt: new Date().toISOString(),
  branch: git(['branch', '--show-current']).trim() || 'unknown',
  head: git(['rev-parse', '--short', 'HEAD']).trim(),
  totals: summarize(entries),
  lanes: lanes.map((lane) => ({
    id: lane.id,
    title: lane.title,
    intent: lane.intent,
    count: lane.entries.length,
    entries: lane.entries
  })),
  policy: [
    'Do not revert sprint work just to make the status clean.',
    'Commit or review changes by lane so CI/docs, app product work, desktop/native work, social work, and generated artifacts do not get mixed accidentally.',
    'Generated repair reports and screenshots are evidence artifacts; decide intentionally which ones belong in GitHub before adding them.',
    'Release candidate gates should be committed with their tests and docs before any public release work.'
  ]
};

mkdirSync(outputDir, { recursive: true });
writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf8');
writeFileSync(markdownPath, formatMarkdown(result), 'utf8');

console.log(`Worktree audit: ${entries.length} dirty entries`);
lanes.forEach((lane) => console.log(`${lane.entries.length} - ${lane.title}`));
console.log(`Output: ${path.relative(rootDir, markdownPath)}`);

function git(args) {
  return execFileSync('git', args, { cwd: rootDir, encoding: 'utf8' });
}

function parsePorcelain(raw) {
  return raw
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const code = line.slice(0, 2);
      const filePath = line.slice(3);
      return {
        status: code.trim() || code,
        path: filePath,
        kind: statusKind(code)
      };
    });
}

function statusKind(code) {
  if (code === '??') return 'untracked';
  if (code.includes('D')) return 'deleted';
  if (code.includes('M')) return 'modified';
  if (code.includes('A')) return 'added';
  if (code.includes('R')) return 'renamed';
  return 'changed';
}

function summarize(entries) {
  return entries.reduce((acc, entry) => {
    acc.total += 1;
    acc[entry.kind] = (acc[entry.kind] || 0) + 1;
    return acc;
  }, { total: 0 });
}

function groupByLane(entries) {
  const laneDefs = [
    {
      id: 'release-ci',
      title: 'Release / CI gates',
      intent: 'Keep this lane tight: workflows, package scripts, Playwright configs, release-readiness tools, and the RC acceptance contract.',
      match: (filePath) =>
        filePath.startsWith('.github/') ||
        ['package.json', 'package-lock.json', 'vite.config.js', 'playwright.config.mjs', 'playwright.electron.config.mjs'].includes(filePath) ||
        filePath === 'src/data/releaseAcceptanceChecklist.js' ||
        filePath === 'src/tests/releaseAcceptanceChecklist.test.js' ||
        filePath.startsWith('tools/Run-') ||
        filePath === 'tools/run-checks.ps1' ||
        filePath === 'tools/run-checks.sh' ||
        filePath.startsWith('qa/')
    },
    {
      id: 'repair-evidence',
      title: 'Generated QA / repair evidence',
      intent: 'Evidence from local runs. Useful, but should be curated before public commits.',
      match: (filePath) => filePath.startsWith('docs/repair/')
    },
    {
      id: 'public-bundle',
      title: 'GitHub Pages bundle / public media',
      intent: 'Generated public site assets and media. Commit only when the matching build is intended.',
      match: (filePath) => filePath === 'docs/index.html' || filePath.startsWith('docs/assets/') || filePath.startsWith('docs/media/')
    },
    {
      id: 'social-discord',
      title: 'Social / Discord / outreach',
      intent: 'Community docs, Discord bot changes, social memory, and outreach queues should stay separate from release gates.',
      match: (filePath) =>
        filePath.startsWith('discord-bot/') ||
        filePath.startsWith('docs/social/') ||
        /DISCORD|REDDIT|X_OUTREACH|NITRO/i.test(filePath) ||
        filePath === 'src/communityHub.js' ||
        filePath === 'src/communityHub.test.js' ||
        filePath === 'src/socialMemory.js' ||
        filePath === 'src/socialMemory.test.js' ||
        filePath === 'tools/Update-CommunityMemory.mjs'
    },
    {
      id: 'docs-product',
      title: 'Product docs / roadmap',
      intent: 'Architecture, roadmap, privacy, release notes, and public truth docs.',
      match: (filePath) =>
        filePath === 'README.md' ||
        filePath === 'FILE_INVENTORY.md' ||
        filePath.startsWith('docs/') ||
        filePath === 'docs/RELEASE_CHECKLIST.md'
    },
    {
      id: 'desktop-native',
      title: 'Desktop / native bridge',
      intent: 'Electron bridge, Windows scanner, native harness stubs, and desktop permission boundaries.',
      match: (filePath) =>
        filePath.startsWith('electron/') ||
        filePath.startsWith('native/') ||
        filePath.startsWith('src/native/') ||
        filePath === 'tools/Scan-AudioSetup.ps1' ||
        filePath === 'src/desktopBridgePlan.js' ||
        filePath === 'src/desktopBridgePlan.test.js'
    },
    {
      id: 'app-product',
      title: 'App product code',
      intent: 'Main CueForge app, UI, state, analyzer, privacy, setup intelligence, tests, and feature modules.',
      match: (filePath) =>
        filePath.startsWith('src/') ||
        filePath === '.gitignore'
    },
    {
      id: 'swarm-lab',
      title: 'Swarm / lab manifests',
      intent: 'Checked-in persona routes, jobs, repair rules, and lab manifests.',
      match: (filePath) => filePath.startsWith('swarm/') || filePath.startsWith('tools/scripts/') || filePath.startsWith('tools/ffmpeg/')
    }
  ];

  const grouped = laneDefs.map((lane) => ({ ...lane, entries: [] }));
  const other = { id: 'other', title: 'Other / needs review', intent: 'Files not matched by the current cleanup lanes.', entries: [] };

  entries.forEach((entry) => {
    const lane = grouped.find((item) => item.match(entry.path));
    (lane || other).entries.push(entry);
  });

  return [...grouped, other].filter((lane) => lane.entries.length > 0);
}

function formatMarkdown(result) {
  return [
    '# Worktree Cleanup Plan',
    '',
    `Generated: ${result.generatedAt}`,
    `Branch: ${result.branch}`,
    `HEAD: ${result.head}`,
    '',
    '## Status',
    '',
    `Dirty entries: ${result.totals.total}`,
    `Modified: ${result.totals.modified || 0}`,
    `Deleted: ${result.totals.deleted || 0}`,
    `Untracked: ${result.totals.untracked || 0}`,
    '',
    '## Policy',
    '',
    ...result.policy.map((item) => `- ${item}`),
    '',
    '## Suggested Commit Slices',
    '',
    '1. Release/CI gates: package scripts, workflows, release-readiness tools, RC acceptance contract, and matching docs.',
    '2. App product core: Setup Command Center, analyzer, state, privacy, profile, UI, and feature modules.',
    '3. Desktop/native bridge: Electron, PowerShell scanner, native harness stubs, and desktop docs.',
    '4. QA/lab/swarm: manifests, harnesses, generated reports selected for evidence, and screenshot baselines.',
    '5. Social/Discord/outreach: Discord bot, social memory, post queues, and community docs.',
    '6. Public bundle/media: GitHub Pages assets and panda media only when the build is meant to publish.',
    '',
    '## Lanes',
    '',
    ...result.lanes.flatMap((lane) => [
      `### ${lane.title}`,
      '',
      lane.intent,
      '',
      `Count: ${lane.count}`,
      '',
      '| Status | Kind | Path |',
      '| --- | --- | --- |',
      ...lane.entries.map((entry) => `| ${entry.status} | ${entry.kind} | \`${entry.path}\` |`),
      ''
    ]),
    '## Next Review',
    '',
    '- Run `npm.cmd run repo:worktree-audit` after each cleanup pass.',
    '- Before committing a lane, run the smallest relevant test gate plus `git diff --check`.',
    '- Do not use `git reset --hard` or broad checkout commands on this sprint worktree.'
  ].join('\n') + '\n';
}
