import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

describe('owned social links', () => {
  it('keeps the app header pointed at the live CueForge social accounts', () => {
    const source = readFileSync(join(root, 'src/main.jsx'), 'utf8');

    expect(source).toContain("handle: '@CueForge907'");
    expect(source).toContain("['X', 'https://x.com/CueForge907']");
    expect(source).toContain("['Reddit', 'https://www.reddit.com/user/P4ND4907/']");
    expect(source).toContain("['GitHub', 'https://github.com/P4ND4907/cueforge']");
    expect(source).toContain("['Discord', 'https://discord.gg/vyQwyJ49v']");
  });

  it('keeps alternate X handles out of the app and social audit notes', () => {
    const appSource = readFileSync(join(root, 'src/main.jsx'), 'utf8');
    const audit = readFileSync(join(root, 'docs/PROMPT_BACKLOG_AUDIT.md'), 'utf8');

    expect(`${appSource}\n${audit}`).not.toMatch(/@?PAND4907|x\.com\/PAND4907/i);
  });

  it('keeps public release actions pointed at the latest GitHub release page', () => {
    const source = readFileSync(join(root, 'src/main.jsx'), 'utf8');

    expect(source).toContain("const latestReleaseUrl = 'https://github.com/P4ND4907/cueforge/releases/latest'");
    expect(source).not.toMatch(/releases\/(?:download|tag)\/v0\.1\.0-alpha\.2/);
  });

  it('keeps the checked-in GitHub Pages bundle on the same social links', () => {
    const docsIndex = readFileSync(join(root, 'docs/index.html'), 'utf8');
    const referencedAssets = [...docsIndex.matchAll(/\.\/assets\/([^"']+)/g)]
      .map((match) => match[1])
      .filter((asset) => /\.(js|css)$/.test(asset));
    const bundle = referencedAssets
      .map((asset) => readFileSync(join(root, 'docs/assets', asset), 'utf8'))
      .join('\n');

    expect(bundle).toContain('https://x.com/CueForge907');
    expect(bundle).toContain('https://github.com/P4ND4907/cueforge/releases/latest');
    expect(bundle).not.toMatch(/@?PAND4907|x\.com\/PAND4907/i);
    expect(bundle).not.toMatch(/releases\/(?:download|tag)\/v0\.1\.0-alpha\.2/);
  });
});
