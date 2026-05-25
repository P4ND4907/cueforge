export const SHORTCUT_VAULT_KEY = 'cueforge-shortcut-vault';

const SECRET_WORDS = /\b(api[-_\s]?key|auth|bearer|bot[-_\s]?token|code|discord[-_\s]?token|license|password|private|recovery|secret|signing|token|webhook)\b/i;
const SECRET_VALUE = /\b(?:sk-[a-z0-9_-]{12,}|[a-f0-9]{24,}|[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{20,})\b/;
const SHORTCUT_LIMIT = 80;

export function createDefaultShortcuts({ release = {}, brand = {} } = {}) {
  return [
    {
      id: 'download-alpha',
      label: 'Download CueForge alpha',
      kind: 'link',
      value: release.download || 'https://github.com/P4ND4907/cueforge/releases/latest',
      scope: 'player',
      locked: false
    },
    {
      id: 'open-web-app',
      label: 'Open CueForge web build',
      kind: 'link',
      value: 'https://p4nd4907.github.io/cueforge/',
      scope: 'player',
      locked: false
    },
    {
      id: 'discord-hub',
      label: 'Join the Panda Lab',
      kind: 'link',
      value: brand.discord || 'https://discord.gg/vyQwyJ49v',
      scope: 'player',
      locked: false
    },
    {
      id: 'github-feedback',
      label: 'Send a replayable issue',
      kind: 'link',
      value: release.feedback || 'https://github.com/P4ND4907/cueforge/issues',
      scope: 'player',
      locked: false
    },
    {
      id: 'self-test',
      label: 'Run Self Test',
      kind: 'action',
      value: 'Open CueForge > Self Test > Run full auto test',
      scope: 'player',
      locked: false
    },
    {
      id: 'auto-detect',
      label: 'Import or auto-detect setup',
      kind: 'action',
      value: 'Open CueForge > Auto Detect > Scan audio devices',
      scope: 'player',
      locked: false
    },
    {
      id: 'discord-bot-token',
      label: 'Discord bot token',
      kind: 'code',
      value: '[redacted]',
      scope: 'developer',
      locked: true
    },
    {
      id: 'release-signing-code',
      label: 'Release signing code',
      kind: 'code',
      value: '[redacted]',
      scope: 'developer',
      locked: true
    }
  ].map((shortcut) => normalizeShortcut(shortcut));
}

export function mergeShortcutDefaults(saved = [], options = {}) {
  const defaults = createDefaultShortcuts(options);
  const savedShortcuts = Array.isArray(saved) ? saved.map(normalizeShortcut).filter(Boolean) : [];
  const byId = new Map(defaults.map((shortcut) => [shortcut.id, shortcut]));

  savedShortcuts.forEach((shortcut) => {
    const current = byId.get(shortcut.id);
    byId.set(shortcut.id, current ? { ...current, ...shortcut, locked: current.locked || shortcut.locked } : shortcut);
  });

  return Array.from(byId.values()).slice(-SHORTCUT_LIMIT);
}

export function normalizeShortcut(input = {}) {
  if (!input || typeof input !== 'object') return null;
  const label = cleanText(input.label || input.name || 'Untitled shortcut', 72);
  const kind = normalizeKind(input.kind);
  const value = cleanText(input.value || input.url || input.command || '', 280);
  const scope = input.scope === 'developer' || input.scope === 'staff' ? input.scope : 'player';
  const id = cleanId(input.id || `${label}-${kind}`);
  const sensitive = isSensitiveShortcut({ ...input, label, kind, value, scope });

  return {
    id,
    label,
    kind,
    value: input.locked || sensitive ? redactShortcutValue(value) : value,
    scope: input.locked || sensitive ? 'developer' : scope,
    locked: Boolean(input.locked || sensitive),
    updatedAt: input.updatedAt || new Date().toISOString()
  };
}

export function saveShortcut(shortcuts = [], draft = {}) {
  const nextShortcut = normalizeShortcut(draft);
  if (!nextShortcut) return Array.isArray(shortcuts) ? shortcuts : [];
  const existing = Array.isArray(shortcuts) ? shortcuts.map(normalizeShortcut).filter(Boolean) : [];
  const previous = existing.find((shortcut) => shortcut.id === nextShortcut.id);
  const savedShortcut = previous?.locked
    ? { ...nextShortcut, locked: true, scope: 'developer', value: '[locked]' }
    : nextShortcut;
  const withoutMatch = existing.filter((shortcut) => shortcut.id !== nextShortcut.id);
  return [...withoutMatch, savedShortcut].slice(-SHORTCUT_LIMIT);
}

export function lockSensitiveShortcuts(shortcuts = []) {
  return (Array.isArray(shortcuts) ? shortcuts : [])
    .map(normalizeShortcut)
    .filter(Boolean)
    .map((shortcut) => {
      if (!shortcut.locked && isSensitiveShortcut(shortcut)) {
        return { ...shortcut, locked: true, scope: 'developer', value: redactShortcutValue(shortcut.value), updatedAt: new Date().toISOString() };
      }
      return shortcut.locked ? { ...shortcut, value: redactShortcutValue(shortcut.value), scope: 'developer' } : shortcut;
    });
}

export function sanitizeShortcutsForExport(shortcuts = []) {
  return (Array.isArray(shortcuts) ? shortcuts : [])
    .map(normalizeShortcut)
    .filter(Boolean)
    .map((shortcut) => {
      if (shortcut.locked || isSensitiveShortcut(shortcut)) {
        return {
          id: shortcut.id,
          label: shortcut.label,
          kind: shortcut.kind,
          scope: 'developer',
          locked: true,
          value: '[locked]',
          exportable: false
        };
      }

      return {
        id: shortcut.id,
        label: shortcut.label,
        kind: shortcut.kind,
        scope: shortcut.scope,
        locked: false,
        value: shortcut.value,
        exportable: true
      };
    });
}

export function buildShortcutExportText(shortcuts = []) {
  const safeShortcuts = sanitizeShortcutsForExport(shortcuts);
  const lines = [
    'CueForge shortcut kit',
    'Safe player shortcuts only. Locked code shortcuts stay redacted.',
    ''
  ];

  const exportable = safeShortcuts.filter((shortcut) => shortcut.exportable);
  if (!exportable.length) lines.push('No public shortcuts saved yet.');
  exportable.forEach((shortcut) => {
    lines.push(`- ${shortcut.label}: ${shortcut.value}`);
  });

  const locked = safeShortcuts.filter((shortcut) => shortcut.locked);
  if (locked.length) {
    lines.push('', `Locked developer shortcuts: ${locked.length}`);
    locked.slice(0, 8).forEach((shortcut) => {
      lines.push(`- ${shortcut.label}: [locked]`);
    });
  }

  return lines.join('\n');
}

export function summarizeShortcutVault(shortcuts = []) {
  const safeShortcuts = sanitizeShortcutsForExport(shortcuts);
  const locked = safeShortcuts.filter((shortcut) => shortcut.locked).length;
  const exportable = safeShortcuts.filter((shortcut) => shortcut.exportable).length;

  return {
    total: safeShortcuts.length,
    exportable,
    locked,
    latest: safeShortcuts[0] || null,
    status: locked ? 'locked' : 'clear'
  };
}

export function isSensitiveShortcut(shortcut = {}) {
  const text = `${shortcut.label || ''} ${shortcut.kind || ''} ${shortcut.value || ''} ${shortcut.scope || ''}`;
  return shortcut.kind === 'code' || shortcut.scope === 'developer' || SECRET_WORDS.test(text) || SECRET_VALUE.test(text);
}

function normalizeKind(kind = 'link') {
  const value = cleanText(kind, 24).toLowerCase();
  return ['action', 'code', 'command', 'link', 'note'].includes(value) ? value : 'link';
}

function redactShortcutValue(value = '') {
  if (!value || value === '[redacted]' || value === '[locked]') return '[locked]';
  return '[locked]';
}

function cleanId(value = '') {
  return cleanText(value, 90)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `shortcut-${Date.now()}`;
}

function cleanText(value = '', maxLength = 120) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}
