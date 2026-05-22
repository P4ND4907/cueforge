const REPORT_SCHEMA = 'cueforge.issue-report.v1';

const SENSITIVE_KEYS = new Set([
  'deviceid',
  'groupid',
  'computer',
  'user',
  'username',
  'machineguid',
  'serial',
  'pnpdeviceid',
  'instanceid',
  'containerid',
  'path',
  'installpath'
]);

const PRODUCT_HINTS = ['hyperx', 'steelseries', 'sonar', 'realtek', 'nvidia', 'usb', 'apo'];
const SENSITIVE_KEY_PATTERNS = [/device.*id/i, /group.*id/i, /instance.*id/i, /container.*id/i, /machine.*guid/i, /serial/i, /computer/i, /user(name)?/i, /path/i];

export function redactText(value, fallback = 'redacted') {
  if (typeof value !== 'string') return value;
  const lower = value.toLowerCase();
  const hint = PRODUCT_HINTS.find((item) => lower.includes(item));
  if (hint) return `${capitalize(hint)} device`;
  if (!value.trim()) return fallback;
  return fallback;
}

export function sanitizeUserText(value) {
  return String(value || '')
    .replace(/[A-Z]:\\(?:[^\\\s]+\\)*[^\\\s]*/gi, '[redacted-path]')
    .replace(/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/gi, '[redacted-email]')
    .replace(/\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[redacted-phone]')
    .replace(/\b(?:[A-Z0-9._%+-]+\\)?Users\\[^\\\s]+/gi, 'Users\\[redacted]')
    .slice(0, 1400);
}

export function redactDeep(value, key = '') {
  if (Array.isArray(value)) return value.map((item) => redactDeep(item));
  if (!value || typeof value !== 'object') {
    if (typeof value === 'string' && SENSITIVE_KEYS.has(key)) return redactText(value);
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([entryKey, entryValue]) => {
      const normalizedKey = entryKey.toLowerCase();
      if (SENSITIVE_KEYS.has(normalizedKey) || SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(entryKey))) {
        return [entryKey, '[redacted]'];
      }
      if (normalizedKey === 'label' || normalizedKey === 'name' || normalizedKey.includes('friendly')) {
        return [entryKey, redactText(entryValue)];
      }
      return [entryKey, redactDeep(entryValue, entryKey)];
    })
  );
}

export function summarizeDevices(devices = []) {
  return devices.map((device, index) => ({
    slot: index + 1,
    kind: device.kind || device.type || 'audio',
    label: redactText(device.label || device.name || '', `${device.kind || 'audio'} ${index + 1}`),
    hasRealName: Boolean(device.label || device.name),
    source: device.source || 'browser-or-bridge'
  }));
}

export function buildIssueReport({
  eq,
  apoConfig,
  selectedGame,
  selectedSourceProfile,
  currentPage,
  sample,
  analysis,
  hearing,
  dna,
  bridgeReport,
  browserDevices,
  selfTestResults,
  notes = ''
}) {
  const safeDevices = summarizeDevices(browserDevices);
  const redactedBridge = bridgeReport ? redactDeep(bridgeReport) : null;

  return {
    schema: REPORT_SCHEMA,
    generatedAt: new Date().toISOString(),
    app: {
      name: 'CueForge',
      currentPage,
      selectedGame,
      selectedSourceProfile,
      browser: summarizeBrowser(navigator.userAgent),
      viewport: `${window.innerWidth}x${window.innerHeight}`
    },
    reproducibleState: {
      eq,
      equalizerApoConfig: apoConfig,
      selectedGame,
      selectedSourceProfile,
      sample: sanitizeUserText(sample),
      analysis,
      hearing,
      dna
    },
    diagnostics: {
      audioApi: Boolean(window.AudioContext && navigator.mediaDevices?.enumerateDevices),
      micApi: Boolean(navigator.mediaDevices?.getUserMedia),
      localStorage: hasLocalStorage(),
      browserDevices: safeDevices,
      bridgeReport: redactedBridge,
      selfTestResults: selfTestResults || []
    },
    notes: sanitizeUserText(notes)
  };
}

export function validateIssueReport(report) {
  if (!report || report.schema !== REPORT_SCHEMA) return { ok: false, reason: 'Wrong report type.' };
  if (!Array.isArray(report.reproducibleState?.eq) || report.reproducibleState.eq.length !== 10) {
    return { ok: false, reason: 'Report does not include a 10-band EQ state.' };
  }
  return { ok: true, reason: 'Report is ready to replay.' };
}

function hasLocalStorage() {
  try {
    localStorage.setItem('cueforge-report-check', 'ok');
    localStorage.removeItem('cueforge-report-check');
    return true;
  } catch {
    return false;
  }
}

function capitalize(value) {
  return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : value;
}

function summarizeBrowser(userAgent = '') {
  if (/Edg\//.test(userAgent)) return 'Edge';
  if (/Chrome\//.test(userAgent)) return 'Chromium';
  if (/Firefox\//.test(userAgent)) return 'Firefox';
  if (/Safari\//.test(userAgent)) return 'Safari';
  return 'Unknown browser';
}
