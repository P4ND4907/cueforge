import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const requiredPaths = [
  'src/app',
  'src/features/setup-command-center',
  'src/features/autodetect',
  'src/features/selftest',
  'src/features/blind-match',
  'src/features/hearing',
  'src/features/report-lab',
  'src/features/player-trial',
  'src/features/machine-play-lab-ui',
  'src/shared/schemas',
  'src/shared/privacy',
  'src/shared/audio',
  'src/shared/state',
  'native/windows/bridge',
  'native/windows/wasapi-harness',
  'native/windows/probes',
  'native/windows/apo',
  'qa/playwright/web',
  'qa/playwright/electron',
  'qa/audio/fixtures',
  'qa/audio/manifests',
  'qa/audio/policies',
  'qa/audio/analyzers',
  'qa/audio/baselines',
  'qa/audio/reports',
  'qa/hardware-profiles',
  'swarm/routes',
  'swarm/jobs',
  'swarm/repair',
  'tools/ffmpeg',
  'tools/scripts',
  'docs/architecture',
  'docs/qa',
  'docs/release'
];

const featureIndexes = [
  'src/features/setup-command-center/index.js',
  'src/features/autodetect/index.js',
  'src/features/selftest/index.js',
  'src/features/blind-match/index.js',
  'src/features/hearing/index.js',
  'src/features/report-lab/index.js',
  'src/features/player-trial/index.js',
  'src/features/machine-play-lab-ui/index.js',
  'src/shared/privacy/index.js',
  'src/shared/audio/index.js',
  'src/shared/state/index.js'
];

describe('production repository layout', () => {
  it('keeps the feature, shared, native, qa, swarm, tools, and docs lanes present', () => {
    const missing = requiredPaths.filter((item) => !existsSync(join(root, item)));

    expect(missing).toEqual([]);
  });

  it('keeps feature/shared barrels importable so extraction can happen safely', async () => {
    for (const file of featureIndexes) {
      const imported = await import(pathToFileURL(join(root, file)).href);
      expect(Object.keys(imported).length, file).toBeGreaterThan(0);
    }
  }, 15000);

  it('documents the monolith extraction path instead of hiding it', () => {
    const plan = readFileSync(join(root, 'docs/architecture/REPO_LAYOUT.md'), 'utf8');

    expect(plan).toContain('src/main.jsx');
    expect(plan).toContain('extract one complete workflow');
    expect(plan).toContain('Machine Play Lab UI');
  });
});
