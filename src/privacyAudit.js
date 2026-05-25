const AUDIT_SCHEMA = 'cueforge.privacy-audit.v1';

const SENSITIVE_KEY_PATTERNS = [
  /device.*id/i,
  /group.*id/i,
  /instance.*id/i,
  /container.*id/i,
  /machine.*guid/i,
  /serial/i,
  /computer/i,
  /user(name)?/i,
  /password/i,
  /token/i,
  /secret/i,
  /recovery/i,
  /api.*key/i,
  /path/i
];

const VALUE_PATTERNS = [
  ['email', /\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/i],
  ['phone', /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/],
  ['windows-user-path', /[A-Z]:\\Users\\(?!\[redacted\])[^\\\s]+/i],
  ['windows-path', /[A-Z]:\\(?:[^\\\s]+\\)*[^\\\s]+/i],
  ['guid', /\b[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}\b/i],
  ['raw-device-token', /\b(?:USB\\VID_|HDAUDIO\\|SWD\\|MMDEVAPI\\|\{[a-f0-9-]{18,}\})/i],
  ['secret-word', /\b(?:password|api key|token|recovery code|secret)\b/i]
];

const SAFE_PLACEHOLDERS = [
  '[redacted]',
  '[redacted-id]',
  '[redacted-path]',
  '[redacted-email]',
  '[redacted-phone]',
  'Users\\[redacted]'
];

const SAFE_KEY_NAMES = new Set([
  'applyPath',
  'inputPath',
  'outputPath',
  'redactDeviceIds',
  'redactUsernames',
  'redactPaths'
]);

export function runPrivacyAudit(items = [], { now = new Date() } = {}) {
  const checkedItems = normalizeItems(items);
  const leaks = checkedItems.flatMap((item) => findPrivacyLeaks(item.payload, { root: item.name }));

  return {
    schema: AUDIT_SCHEMA,
    generatedAt: safeDate(now).toISOString(),
    status: leaks.length ? 'fail' : 'pass',
    leakCount: leaks.length,
    checkedItems: checkedItems.map((item) => item.name),
    leaks: leaks.slice(0, 30)
  };
}

export function findPrivacyLeaks(value, { root = 'payload' } = {}) {
  const leaks = [];
  scanValue(value, root, leaks);
  return leaks;
}

export function buildPrivacyAuditText(audit) {
  if (!audit || audit.schema !== AUDIT_SCHEMA) {
    return 'CueForge privacy audit\nStatus: invalid audit payload';
  }

  const lines = [
    'CueForge privacy audit',
    `Generated: ${audit.generatedAt}`,
    `Status: ${audit.status}`,
    `Checked: ${audit.checkedItems.join(', ') || 'nothing'}`,
    `Leaks found: ${audit.leakCount}`,
    ''
  ];

  if (!audit.leaks.length) {
    lines.push('Result: no raw emails, phone numbers, local paths, device IDs, group IDs, tokens, passwords, or recovery codes were found in the checked export payloads.');
    return lines.join('\n');
  }

  lines.push('Fix before release:');
  audit.leaks.forEach((leak, index) => {
    lines.push(`${index + 1}. ${leak.type} at ${leak.path}`);
  });

  return lines.join('\n');
}

function normalizeItems(items) {
  if (!Array.isArray(items)) return [{ name: 'payload', payload: items }];
  return items.map((item, index) => {
    if (item && typeof item === 'object' && 'payload' in item) {
      return {
        name: cleanName(item.name || `payload ${index + 1}`),
        payload: item.payload
      };
    }
    return { name: `payload ${index + 1}`, payload: item };
  });
}

function scanValue(value, path, leaks) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanValue(item, `${path}[${index}]`, leaks));
    return;
  }

  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, entryValue]) => {
      const entryPath = `${path}.${key}`;
      if (isSensitiveKey(key) && hasUnredactedValue(entryValue)) {
        leaks.push({ type: `sensitive key: ${key}`, path: entryPath });
      }
      scanValue(entryValue, entryPath, leaks);
    });
    return;
  }

  if (typeof value !== 'string' || isSafePlaceholder(value)) return;

  for (const [type, pattern] of VALUE_PATTERNS) {
    if (pattern.test(value)) {
      leaks.push({ type, path });
    }
  }
}

function hasUnredactedValue(value) {
  if (value === null || value === undefined || value === '' || value === false) return false;
  if (typeof value === 'string') return !isSafePlaceholder(value);
  if (typeof value === 'number') return true;
  if (Array.isArray(value)) return value.some(hasUnredactedValue);
  if (typeof value === 'object') return Object.values(value).some(hasUnredactedValue);
  return Boolean(value);
}

function isSensitiveKey(key) {
  if (SAFE_KEY_NAMES.has(key)) return false;
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

function isSafePlaceholder(value) {
  const text = String(value || '');
  return SAFE_PLACEHOLDERS.some((placeholder) => text.includes(placeholder));
}

function cleanName(value) {
  return String(value || 'payload').replace(/\s+/g, ' ').trim().slice(0, 80);
}

function safeDate(value) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}
