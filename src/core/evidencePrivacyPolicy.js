export const evidencePrivacyDefaults = {
  schema: 'cueforge.evidence-privacy-policy.v1',
  localFirst: true,
  noSilentUpload: true,
  uploadsOptInOnly: true,
  rawAudioIncluded: false,
  rawAudioStaysLocalByDefault: true,
  publicPacketsUseSummariesOnly: true,
  publicPacketsUseDerivedMetrics: true,
  redactDeviceIds: true,
  redactUsernames: true,
  redactPaths: true,
  redactEmails: true,
  redactPhones: true,
  hashedFingerprints: true,
  protectedPlaybackUniversalCapture: false,
  protectedPlaybackBoundary: 'Windows loopback capture can be limited by DRM or protected playback paths. CueForge must not promise universal capture of protected streams.'
};

const privatePatterns = [
  { id: 'windows-path', pattern: /[A-Z]:\\(?:[^\\\s]+\\)*[^\\\s]*/gi },
  { id: 'email', pattern: /\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/gi },
  { id: 'phone', pattern: /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g },
  { id: 'raw-id', pattern: /\b(?:raw[-_ ]*)?(?:device|group|instance|container|serial|machine)[-_ ]?(?:id|guid|serial)(?:[-_ :=]+)[a-z0-9\\-]+/gi },
  { id: 'user-path', pattern: /\b(?:[A-Z0-9._%+-]+\\)?Users\\[^\\\s]+/gi },
  { id: 'username-field', pattern: /\b(?:user(?:name)?|handle|discord|reddit|x)[-_: ]+@?[a-z0-9_.-]{3,}\b/gi },
  { id: 'raw-audio-url', pattern: /\b(?:blob:|data:audio\/)[^\s"]+/gi }
];

export function evidencePrivacyBlock(overrides = {}) {
  return {
    ...evidencePrivacyDefaults,
    ...overrides
  };
}

export function redactPublicEvidenceText(value, fallback = '') {
  const text = String(value || fallback || '').slice(0, 1400);
  return text
    .replace(new RegExp(privatePatterns[0].pattern), '[redacted-path]')
    .replace(new RegExp(privatePatterns[1].pattern), '[redacted-email]')
    .replace(new RegExp(privatePatterns[2].pattern), '[redacted-phone]')
    .replace(new RegExp(privatePatterns[3].pattern), '[redacted-id]')
    .replace(new RegExp(privatePatterns[4].pattern), 'Users\\[redacted]')
    .replace(new RegExp(privatePatterns[5].pattern), '[redacted-username]')
    .replace(new RegExp(privatePatterns[6].pattern), '[redacted-audio]');
}

export function findEvidencePrivacyLeaks(payload) {
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload || {});
  return privatePatterns
    .filter((item) => {
      item.pattern.lastIndex = 0;
      return item.pattern.test(text);
    })
    .map((item) => item.id);
}

export function validateEvidencePrivacyPosture(payload = {}) {
  const privacy = payload.privacy || {};
  const leaks = findEvidencePrivacyLeaks(payload);
  const failures = [];

  if (privacy.localFirst !== true) failures.push('Evidence must be local-first by default.');
  if (privacy.noSilentUpload !== true) failures.push('Evidence must not upload silently.');
  if (privacy.uploadsOptInOnly !== true) failures.push('Uploads must be opt-in only.');
  if (privacy.rawAudioIncluded !== false) failures.push('Public evidence packets must not include raw audio.');
  if (privacy.publicPacketsUseSummariesOnly !== true) failures.push('Public evidence packets must use summaries and derived metrics.');
  if (privacy.protectedPlaybackUniversalCapture !== false) failures.push('Protected playback capture must not be promised as universal.');
  if (leaks.length) failures.push(`Private data patterns found: ${leaks.join(', ')}.`);

  return {
    ok: failures.length === 0,
    failures,
    leaks
  };
}
