export const UI_FEEDBACK_KEY = 'cueforge-ui-debug-notes';

export const uiFeedbackTags = [
  'confusing',
  'broken',
  'text issue',
  'layout issue',
  'missing feedback',
  'slow',
  'idea'
];

export function createUiFeedbackNote({
  page = 'unknown',
  tag = 'confusing',
  note = '',
  target = {},
  viewport = {},
  now = new Date()
} = {}) {
  return {
    schema: 'cueforge.ui-feedback-note.v1',
    id: `ui-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now.toISOString(),
    page: sanitizeShortText(page, 80),
    tag: uiFeedbackTags.includes(tag) ? tag : 'confusing',
    note: sanitizeLongText(note),
    target: sanitizeTarget(target),
    viewport: {
      width: clampNumber(viewport.width, 0, 10000),
      height: clampNumber(viewport.height, 0, 10000),
      xPercent: clampNumber(viewport.xPercent, 0, 100),
      yPercent: clampNumber(viewport.yPercent, 0, 100)
    }
  };
}

export function sanitizeUiFeedbackNotes(notes = []) {
  if (!Array.isArray(notes)) return [];
  return notes.slice(-80).map((item) => createUiFeedbackNote({
    page: item.page,
    tag: item.tag,
    note: item.note,
    target: item.target,
    viewport: item.viewport,
    now: safeDate(item.createdAt)
  }));
}

export function summarizeUiFeedback(notes = []) {
  const safe = sanitizeUiFeedbackNotes(notes);
  const byTag = Object.fromEntries(uiFeedbackTags.map((tag) => [tag, 0]));
  for (const item of safe) byTag[item.tag] = (byTag[item.tag] || 0) + 1;
  const topTag = Object.entries(byTag).sort((a, b) => b[1] - a[1])[0];

  return {
    total: safe.length,
    topTag: topTag?.[1] ? topTag[0] : 'none yet',
    latest: safe.at(-1) || null,
    byTag
  };
}

function sanitizeTarget(target = {}) {
  return {
    label: sanitizeShortText(target.label || 'Unknown area', 120),
    role: sanitizeShortText(target.role || '', 60),
    tagName: sanitizeShortText(target.tagName || '', 32),
    panel: sanitizeShortText(target.panel || '', 80)
  };
}

function sanitizeShortText(value, limit) {
  return sanitizeLongText(value).slice(0, limit);
}

function sanitizeLongText(value) {
  return String(value || '')
    .replace(/[A-Z]:\\(?:[^\\\s]+\\)*[^\\\s]*/gi, '[redacted-path]')
    .replace(/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/gi, '[redacted-email]')
    .replace(/\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[redacted-phone]')
    .replace(/\b(?:[A-Z0-9._%+-]+\\)?Users\\[^\\\s]+/gi, 'Users\\[redacted]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 700);
}

function safeDate(value) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, Math.round(Number(value) || 0)));
}
