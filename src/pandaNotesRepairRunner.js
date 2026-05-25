import {
  buildUiFeedbackRepairCheck,
  buildUiFeedbackRepairPacket,
  sanitizeUiFeedbackNotes,
  summarizeUiFeedback
} from './uiFeedback.js';

export function extractUiFeedbackNotesFromPayload(payload) {
  if (Array.isArray(payload)) return sanitizeUiFeedbackNotes(payload);
  if (!payload || typeof payload !== 'object') return [];

  const candidates = [
    payload.uiFeedbackNotes,
    payload.diagnostics?.uiFeedbackNotes,
    payload.report?.diagnostics?.uiFeedbackNotes
  ];

  if (payload.files?.['ui-feedback-notes.json']) {
    try {
      candidates.push(JSON.parse(payload.files['ui-feedback-notes.json']));
    } catch {
      candidates.push([]);
    }
  }

  return sanitizeUiFeedbackNotes(candidates.flatMap((candidate) => Array.isArray(candidate) ? candidate : []));
}

export function buildPandaNotesRepairOutput({ notes = [], sources = [], now = new Date() } = {}) {
  const safeNotes = sanitizeUiFeedbackNotes(notes);
  const check = buildUiFeedbackRepairCheck(safeNotes, { now });
  const summary = summarizeUiFeedback(safeNotes);

  return {
    schema: 'cueforge.panda-notes-repair-run.v1',
    generatedAt: check.generatedAt,
    sources: sources.map((source) => ({
      file: String(source.file || '').slice(0, 260),
      notes: Number(source.notes) || 0
    })),
    summary,
    check,
    packet: buildUiFeedbackRepairPacket(safeNotes, { now })
  };
}

export function formatPandaNotesRepairMarkdown(output) {
  const check = output?.check || buildUiFeedbackRepairCheck([]);
  const summary = output?.summary || summarizeUiFeedback([]);
  const topAction = check.topAction;
  const lines = [
    '# Panda Notes Repair Queue',
    '',
    `Generated: ${output?.generatedAt || check.generatedAt}`,
    `Status: ${check.status}`,
    `Notes scanned: ${check.totalNotes}`,
    `Open notes: ${summary.open}`,
    `Repair actions: ${check.actionCount}`,
    '',
    '## Sources',
    ''
  ];

  if (output?.sources?.length) {
    output.sources.forEach((source) => {
      lines.push(`- ${source.file} (${source.notes} notes)`);
    });
  } else {
    lines.push('- No exported Panda Notes or redacted reports found.');
  }

  lines.push('', '## Top Action', '');
  if (topAction) {
    lines.push(`- ${topAction.title}`);
    lines.push(`- Page: ${topAction.page}`);
    lines.push(`- Priority: ${topAction.priority}`);
    lines.push(`- Suggested fix: ${topAction.suggestedFix}`);
    lines.push(`- Test plan: ${topAction.testPlan}`);
  } else {
    lines.push('- No repair action yet. Export notes from System Info > Panda Notes Inbox, then rerun `npm run notes:repair`.');
  }

  lines.push('', '## Action Queue', '');
  if (check.actions.length) {
    check.actions.forEach((action, index) => {
      lines.push(`${index + 1}. ${action.title}`);
      lines.push(`   - Page: ${action.page}`);
      lines.push(`   - Area: ${action.area}`);
      lines.push(`   - Tag: ${action.tag}`);
      lines.push(`   - Priority: ${action.priority}`);
      lines.push(`   - Notes: ${action.count}`);
      lines.push(`   - Test: ${action.testPlan}`);
    });
  } else {
    lines.push('No queued actions.');
  }

  lines.push('', '## Boundary', '', check.boundary);
  return lines.join('\n');
}

