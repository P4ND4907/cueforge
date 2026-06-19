import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(__dirname, '..', '..');
const mainSource = readFileSync(resolve(repoRoot, 'src', 'main.jsx'), 'utf8');

describe('Panda Notes simple mode access', () => {
  it('allows the right-click note popover whenever Panda Notes are enabled', () => {
    expect(mainSource).not.toContain('if (!expertMode || !userSettings.uiNotesEnabled) return;');
    expect(mainSource).not.toContain('{expertMode && userSettings.uiNotesEnabled && uiNoteDraft && (');
  });
});
