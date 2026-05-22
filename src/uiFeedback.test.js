import { describe, expect, it } from 'vitest';
import { createUiFeedbackNote, sanitizeUiFeedbackNotes, summarizeUiFeedback } from './uiFeedback.js';

describe('ui feedback notes', () => {
  it('creates a redacted retrievable UI note', () => {
    const note = createUiFeedbackNote({
      page: 'Mic Lab',
      tag: 'layout issue',
      note: 'This card overlaps on C:\\Users\\carls\\Desktop and email test@example.com 555-123-4567',
      target: {
        label: 'Live Mic + IEM Test Bench',
        role: 'article',
        tagName: 'ARTICLE',
        panel: 'Live Mic + IEM Test Bench'
      },
      viewport: { width: 1280, height: 900, xPercent: 45, yPercent: 62 },
      now: new Date('2026-05-22T12:00:00.000Z')
    });

    expect(note.schema).toBe('cueforge.ui-feedback-note.v1');
    expect(note.tag).toBe('layout issue');
    expect(note.target.panel).toBe('Live Mic + IEM Test Bench');
    expect(note.note).toContain('[redacted-path]');
    expect(note.note).toContain('[redacted-email]');
    expect(note.note).toContain('[redacted-phone]');
    expect(JSON.stringify(note)).not.toContain('carls');
  });

  it('caps and summarizes feedback notes', () => {
    const notes = Array.from({ length: 90 }, (_, index) => createUiFeedbackNote({
      tag: index % 2 ? 'broken' : 'confusing',
      note: `note ${index}`,
      now: new Date(`2026-05-22T12:${String(index % 60).padStart(2, '0')}:00.000Z`)
    }));

    const safe = sanitizeUiFeedbackNotes(notes);
    const summary = summarizeUiFeedback(notes);

    expect(safe).toHaveLength(80);
    expect(summary.total).toBe(80);
    expect(['broken', 'confusing']).toContain(summary.topTag);
  });
});
