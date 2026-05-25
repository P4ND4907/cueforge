import { describe, expect, it } from 'vitest';
import {
  buildShortcutExportText,
  createDefaultShortcuts,
  lockSensitiveShortcuts,
  mergeShortcutDefaults,
  saveShortcut,
  sanitizeShortcutsForExport,
  summarizeShortcutVault
} from './shortcutVault.js';

describe('shortcut vault', () => {
  it('keeps player shortcuts exportable', () => {
    const shortcuts = saveShortcut(createDefaultShortcuts(), {
      label: 'Open feedback form',
      kind: 'link',
      value: 'https://github.com/P4ND4907/cueforge/issues/1'
    });
    const safe = sanitizeShortcutsForExport(shortcuts);

    expect(safe.some((shortcut) => shortcut.label === 'Open feedback form' && shortcut.exportable)).toBe(true);
    expect(buildShortcutExportText(shortcuts)).toContain('Open feedback form');
    expect(buildShortcutExportText(shortcuts)).not.toMatch(/Download CueForge alpha|Download alpha/i);
  });

  it('auto-locks code-like shortcuts before export', () => {
    const shortcuts = saveShortcut([], {
      label: 'Discord bot token',
      kind: 'code',
      value: 'abc.def.ghijklmnopqrstuvwxyz1234567890'
    });
    const safe = sanitizeShortcutsForExport(shortcuts);

    expect(shortcuts[0].locked).toBe(true);
    expect(safe[0].value).toBe('[locked]');
    expect(JSON.stringify(safe)).not.toContain('abcdefghijklmnopqrstuvwxyz');
  });

  it('locks sensitive saved shortcuts without dropping normal ones', () => {
    const shortcuts = [
      { id: 'download', label: 'Download', kind: 'link', value: 'https://example.com/download' },
      { id: 'private-code', label: 'Private release code', kind: 'note', value: 'release secret code 1234' }
    ];
    const locked = lockSensitiveShortcuts(shortcuts);
    const summary = summarizeShortcutVault(locked);

    expect(summary.exportable).toBe(1);
    expect(summary.locked).toBe(1);
    expect(locked.find((shortcut) => shortcut.id === 'download')?.value).toContain('example.com');
    expect(locked.find((shortcut) => shortcut.id === 'private-code')?.value).toBe('[locked]');
  });

  it('does not unlock a saved locked shortcut by accident', () => {
    const shortcuts = saveShortcut([
      { id: 'discord-bot-token', label: 'Discord bot token', kind: 'code', value: '[locked]', locked: true }
    ], {
      id: 'discord-bot-token',
      label: 'Discord bot token',
      kind: 'link',
      value: 'https://example.com'
    });

    expect(shortcuts[0].locked).toBe(true);
    expect(shortcuts[0].value).toBe('[locked]');
  });

  it('drops the retired public alpha download shortcut when merging saved defaults', () => {
    const merged = mergeShortcutDefaults([{
      id: 'download-alpha',
      label: 'Download CueForge alpha',
      kind: 'link',
      value: 'https://github.com/P4ND4907/cueforge/releases/latest'
    }]);
    const labels = merged.map((shortcut) => shortcut.label).join('\n');

    expect(labels).not.toMatch(/Download CueForge alpha/i);
    expect(labels).toContain('Open CueForge web build');
    expect(labels).toContain('Read CueForge release notes');
  });
});
