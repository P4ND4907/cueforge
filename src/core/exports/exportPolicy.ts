const SENSITIVE_PATTERNS = [
  /\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/i,
  /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/,
  /[A-Z]:\\Users\\/i,
  /deviceid|groupid|instanceid|containerid|serial|token|password|recovery/i
];

export const exportPolicy = {
  localFirst: true,
  neverSilentlyApply: true,
  redactRawIdentifiers: true,
  allowedPublicFiles: [
    'equalizer-apo-config.txt',
    'cueforge-state-anchor.json',
    'cueforge-brain.json',
    'cueforge-setup-assessment.json'
  ]
};

export function auditExportText(text: string) {
  const value = String(text || '');
  const findings = SENSITIVE_PATTERNS
    .filter((pattern) => pattern.test(value))
    .map((pattern) => pattern.source);

  return {
    ok: findings.length === 0,
    findings
  };
}
