import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(__dirname, '..', '..');
const indexHtml = readFileSync(resolve(repoRoot, 'index.html'), 'utf8');
const mainSource = readFileSync(resolve(repoRoot, 'src', 'main.jsx'), 'utf8');
const commandCenterSource = readFileSync(
  resolve(repoRoot, 'src', 'ui', 'SetupCommandCenter.jsx'),
  'utf8'
);

describe('public social preview metadata', () => {
  it('serves a large preview card for shared launch links', () => {
    expect(indexHtml).toContain(
      '<meta property="og:image" content="https://p4nd4907.github.io/cueforge/cueforge-social-card.png" />'
    );
    expect(indexHtml).toContain(
      '<meta name="twitter:card" content="summary_large_image" />'
    );
    expect(indexHtml).toContain(
      '<meta name="twitter:image" content="https://p4nd4907.github.io/cueforge/cueforge-social-card.png" />'
    );
    expect(existsSync(resolve(repoRoot, 'public', 'cueforge-social-card.png'))).toBe(true);
  });

  it('keeps the first-run tester path visible before the step controls', () => {
    expect(mainSource).toContain('Open app -> run setup -> send feedback');
    expect(mainSource).toContain('Start with Device Scan');
  });

  it('keeps the default command center tester path visible for shared links', () => {
    expect(commandCenterSource).toContain('Open link -> Auto setup -> Starter tune -> Sound Match -> feedback');
    expect(commandCenterSource).toContain('Post the link with the screenshot card, then ask testers for one setup note');
  });
});
