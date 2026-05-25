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

export const uiFeedbackStatuses = ['open', 'reviewed', 'fixed', 'needs-retest', 'archived'];

export function createUiFeedbackNote({
  id = '',
  page = 'unknown',
  tag = 'confusing',
  note = '',
  target = {},
  viewport = {},
  status = 'open',
  reviewedAt = null,
  resolvedAt = null,
  now = new Date()
} = {}) {
  const createdAt = safeDate(now);
  return {
    schema: 'cueforge.ui-feedback-note.v1',
    id: sanitizeId(id) || `ui-${createdAt.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: createdAt.toISOString(),
    page: sanitizeShortText(page, 80),
    tag: uiFeedbackTags.includes(tag) ? tag : 'confusing',
    status: uiFeedbackStatuses.includes(status) ? status : 'open',
    reviewedAt: nullableIsoDate(reviewedAt),
    resolvedAt: nullableIsoDate(resolvedAt),
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
    id: item.id,
    page: item.page,
    tag: item.tag,
    note: item.note,
    target: item.target,
    viewport: item.viewport,
    status: item.status,
    reviewedAt: item.reviewedAt,
    resolvedAt: item.resolvedAt,
    now: safeDate(item.createdAt)
  }));
}

export function summarizeUiFeedback(notes = []) {
  const safe = sanitizeUiFeedbackNotes(notes);
  const byTag = Object.fromEntries(uiFeedbackTags.map((tag) => [tag, 0]));
  const byStatus = Object.fromEntries(uiFeedbackStatuses.map((status) => [status, 0]));
  for (const item of safe) byTag[item.tag] = (byTag[item.tag] || 0) + 1;
  for (const item of safe) byStatus[item.status] = (byStatus[item.status] || 0) + 1;
  const topTag = Object.entries(byTag).sort((a, b) => b[1] - a[1])[0];

  return {
    total: safe.length,
    open: (byStatus.open || 0) + (byStatus['needs-retest'] || 0),
    reviewed: byStatus.reviewed || 0,
    fixed: byStatus.fixed || 0,
    needsRetest: byStatus['needs-retest'] || 0,
    archived: byStatus.archived || 0,
    topTag: topTag?.[1] ? topTag[0] : 'none yet',
    latest: safe.at(-1) || null,
    byTag,
    byStatus
  };
}

export function buildUiFeedbackRepairCheck(notes = [], { now = new Date() } = {}) {
  const safe = sanitizeUiFeedbackNotes(notes);
  const actionable = safe.filter((item) => !['fixed', 'archived'].includes(item.status));
  const groups = new Map();

  for (const item of actionable) {
    const area = item.target.panel || item.target.label || 'Unknown area';
    const key = [item.page, area, item.tag].join('::');
    if (!groups.has(key)) {
      groups.set(key, {
        id: `repair-${groups.size + 1}`,
        page: item.page,
        area,
        tag: item.tag,
        notes: [],
        priority: priorityForTag(item.tag),
        suggestedFix: suggestedFixForTag(item.tag),
        testPlan: testPlanForTag(item.tag)
      });
    }
    groups.get(key).notes.push(item);
  }

  const actions = [...groups.values()]
    .map((group) => ({
      ...group,
      count: group.notes.length,
      latestAt: group.notes.at(-1)?.createdAt || null,
      title: `${titleForTag(group.tag)}: ${group.area}`,
      evidence: group.notes.slice(-3).map((item) => ({
        note: item.note,
        status: item.status,
        target: item.target.label,
        viewport: item.viewport,
        createdAt: item.createdAt
      }))
    }))
    .sort((a, b) => b.priority - a.priority || b.count - a.count || String(b.latestAt).localeCompare(String(a.latestAt)))
    .slice(0, 12);

  return {
    schema: 'cueforge.ui-repair-check.v1',
    generatedAt: safeDate(now).toISOString(),
    status: actionable.length ? 'repair-queue-ready' : safe.length ? 'notes-reviewed' : 'no-notes-yet',
    totalNotes: safe.length,
    actionableNotes: actionable.length,
    actionCount: actions.length,
    topAction: actions[0] || null,
    actions,
    boundary: 'CueForge can auto-triage local notes and generate a repair packet. Source edits still need a developer or explicit desktop automation review.'
  };
}

export function markUiFeedbackNotes(notes = [], ids = [], status = 'reviewed', { now = new Date() } = {}) {
  if (!uiFeedbackStatuses.includes(status)) return sanitizeUiFeedbackNotes(notes);
  const safe = sanitizeUiFeedbackNotes(notes);
  const targetIds = new Set(Array.isArray(ids) ? ids : [ids]);
  const stamp = safeDate(now).toISOString();

  return safe.map((item) => {
    if (!targetIds.has(item.id) && !targetIds.has('all')) return item;
    return {
      ...item,
      status,
      reviewedAt: ['reviewed', 'fixed', 'needs-retest', 'archived'].includes(status)
        ? item.reviewedAt || stamp
        : item.reviewedAt,
      resolvedAt: ['fixed', 'archived'].includes(status) ? stamp : item.resolvedAt
    };
  });
}

export function cleanupUiFeedbackNotes(notes = [], { mode = 'fixed' } = {}) {
  const safe = sanitizeUiFeedbackNotes(notes);
  if (mode === 'all') return [];
  if (mode === 'reviewed') return safe.filter((item) => !['reviewed', 'fixed', 'archived'].includes(item.status));
  return safe.filter((item) => !['fixed', 'archived'].includes(item.status));
}

export function buildUiFeedbackRepairPacket(notes = [], options = {}) {
  const check = buildUiFeedbackRepairCheck(notes, options);
  const lines = [
    'CueForge Panda Notes repair packet',
    `Generated: ${check.generatedAt}`,
    `Status: ${check.status}`,
    `Notes scanned: ${check.totalNotes}`,
    `Repair actions: ${check.actionCount}`,
    '',
    'Boundary:',
    check.boundary,
    '',
    'Instruction:',
    'Use these notes to make targeted code/UI fixes, then run tests, build, and browser QA. Do not remove privacy redaction, do not add hidden telemetry, and do not silently change Windows audio settings.',
    ''
  ];

  if (!check.actions.length) {
    lines.push('No developer notes were found. Right-click an app area, tag the issue, save a note, then rerun this packet.');
    return lines.join('\n');
  }

  check.actions.forEach((action, index) => {
    lines.push(`${index + 1}. ${action.title}`);
    lines.push(`   Page: ${action.page}`);
    lines.push(`   Tag: ${action.tag}`);
    lines.push(`   Priority: ${action.priority}`);
    lines.push(`   Evidence count: ${action.count}`);
    lines.push(`   Suggested fix: ${action.suggestedFix}`);
    lines.push(`   Test plan: ${action.testPlan}`);
    action.evidence.forEach((item, evidenceIndex) => {
      lines.push(`   Note ${evidenceIndex + 1}: ${item.note || '[empty]'}`);
      lines.push(`   Target ${evidenceIndex + 1}: ${item.target || '[unknown]'} at ${item.viewport.width}x${item.viewport.height}, ${item.viewport.xPercent}%/${item.viewport.yPercent}%`);
    });
    lines.push('');
  });

  return lines.join('\n').trim();
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

function nullableIsoDate(value) {
  if (!value) return null;
  const date = safeDate(value);
  return date.toISOString();
}

function sanitizeId(value) {
  return String(value || '').replace(/[^a-z0-9_-]/gi, '').slice(0, 80);
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, Math.round(Number(value) || 0)));
}

function priorityForTag(tag) {
  return {
    broken: 100,
    'layout issue': 90,
    'missing feedback': 78,
    slow: 72,
    'text issue': 64,
    confusing: 58,
    idea: 35
  }[tag] || 50;
}

function titleForTag(tag) {
  return {
    broken: 'Fix broken control',
    'layout issue': 'Fix layout or resize issue',
    'missing feedback': 'Add missing state feedback',
    slow: 'Profile slow flow',
    'text issue': 'Rewrite unclear text',
    confusing: 'Clarify confusing flow',
    idea: 'Review product idea'
  }[tag] || 'Review note';
}

function suggestedFixForTag(tag) {
  return {
    broken: 'Reproduce the target interaction, repair the handler/state path, and add a focused regression check.',
    'layout issue': 'Inspect the target at the noted viewport, add containment/wrapping/responsive grid rules, and rerun overflow checks.',
    'missing feedback': 'Add a visible loading, success, empty, blocked, or error state near the control that caused the note.',
    slow: 'Profile the flow, reduce expensive synchronous work, and keep gameplay/live audio paths lightweight.',
    'text issue': 'Replace vague or cramped copy with direct player-facing wording that fits the container.',
    confusing: 'Simplify the workflow label, order, or next-step copy so the tester knows what to do next.',
    idea: 'Decide whether this belongs in the current release, the roadmap, or the rejected list.'
  }[tag] || 'Review the note and make the smallest targeted fix.';
}

function testPlanForTag(tag) {
  return {
    broken: 'Run the exact click/type/export path, then rerun unit tests and browser smoke.',
    'layout issue': 'Check desktop, tablet, and mobile widths for overflow, clipping, and text collisions.',
    'missing feedback': 'Trigger pass, fail, blocked, and empty states to confirm the message appears.',
    slow: 'Run a before/after smoke while live audio/gameplay save features are idle and active.',
    'text issue': 'Verify the longest visible text still wraps cleanly on mobile and desktop.',
    confusing: 'Walk the page from a fresh tester state and confirm the next action is obvious.',
    idea: 'Validate the idea against the master plan before adding UI.'
  }[tag] || 'Run focused browser QA for the noted area.';
}
