import { describe, expect, it } from 'vitest';
import { createUiFeedbackNote } from './uiFeedback.js';
import {
  buildPandaNotesRepairOutput,
  extractUiFeedbackNotesFromPayload,
  formatPandaNotesRepairMarkdown
} from './pandaNotesRepairRunner.js';

describe('panda notes repair runner', () => {
  it('extracts notes from issue reports and setup packs', () => {
    const note = createUiFeedbackNote({
      page: 'Mic Lab',
      tag: 'layout issue',
      note: 'Button overlaps low on mobile',
      target: { label: 'Run analysis' }
    });

    const fromReport = extractUiFeedbackNotesFromPayload({
      diagnostics: { uiFeedbackNotes: [note] }
    });
    const fromPack = extractUiFeedbackNotesFromPayload({
      files: { 'ui-feedback-notes.json': JSON.stringify([note]) }
    });

    expect(fromReport).toHaveLength(1);
    expect(fromPack).toHaveLength(1);
    expect(fromReport[0].tag).toBe('layout issue');
  });

  it('formats a developer repair queue with top action', () => {
    const notes = [
      createUiFeedbackNote({
        page: 'Report Lab',
        tag: 'broken',
        note: 'Export report did nothing',
        target: { label: 'Download report' },
        now: new Date('2026-05-22T12:00:00.000Z')
      })
    ];

    const output = buildPandaNotesRepairOutput({
      notes,
      sources: [{ file: 'cueforge-ui-feedback-notes.json', notes: 1 }],
      now: new Date('2026-05-22T12:05:00.000Z')
    });
    const markdown = formatPandaNotesRepairMarkdown(output);

    expect(output.check.status).toBe('repair-queue-ready');
    expect(markdown).toContain('Fix broken control');
    expect(markdown).toContain('cueforge-ui-feedback-notes.json');
    expect(markdown).toContain('Run the exact click/type/export path');
  });
});

