import { describe, expect, it } from 'vitest';
import {
  buildUiFeedbackRepairCheck,
  buildUiFeedbackRepairPacket,
  cleanupUiFeedbackNotes,
  cueforgeCodeStructure,
  createUiFeedbackNote,
  getUiFeedbackSnippet,
  markUiFeedbackNotes,
  sanitizeUiFeedbackNotes,
  summarizeUiFeedback
} from './uiFeedback.js';

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

  it('auto-triages notes into prioritized repair actions', () => {
    const notes = [
      createUiFeedbackNote({
        page: 'Mic Lab',
        tag: 'text issue',
        note: 'This copy is hard to read',
        target: { label: 'Mic analyzer' },
        viewport: { width: 390, height: 844, xPercent: 44, yPercent: 60 },
        now: new Date('2026-05-22T12:01:00.000Z')
      }),
      createUiFeedbackNote({
        page: 'Mic Lab',
        tag: 'layout issue',
        note: 'The buttons overlap on mobile',
        target: { label: 'Mic analyzer' },
        viewport: { width: 390, height: 844, xPercent: 51, yPercent: 62 },
        now: new Date('2026-05-22T12:02:00.000Z')
      }),
      createUiFeedbackNote({
        page: 'Report Lab',
        tag: 'broken',
        note: 'Export did nothing',
        target: { label: 'Download report' },
        viewport: { width: 1280, height: 900, xPercent: 72, yPercent: 54 },
        now: new Date('2026-05-22T12:03:00.000Z')
      })
    ];

    const check = buildUiFeedbackRepairCheck(notes, { now: new Date('2026-05-22T12:10:00.000Z') });

    expect(check.schema).toBe('cueforge.ui-repair-check.v1');
    expect(check.totalNotes).toBe(3);
    expect(check.actionCount).toBe(3);
    expect(check.topAction.tag).toBe('broken');
    expect(check.topAction.snippet.file).toBe('src/main.jsx');
    expect(check.topAction.snippet.code).toContain('saveUiNote');
    expect(check.actions[1].tag).toBe('layout issue');
    expect(check.actions[1].suggestedFix).toContain('responsive');
    expect(check.actions[1].snippet.file).toBe('src/styles.css');
  });

  it('builds a redacted developer repair packet', () => {
    const notes = [
      createUiFeedbackNote({
        page: 'Auto Detect',
        tag: 'missing feedback',
        note: 'Nothing changed for C:\\Users\\carls\\secret.txt and test@example.com after scan',
        target: { label: 'Scan audio devices' },
        viewport: { width: 1024, height: 768, xPercent: 20, yPercent: 30 },
        now: new Date('2026-05-22T12:04:00.000Z')
      })
    ];

    const packet = buildUiFeedbackRepairPacket(notes, { now: new Date('2026-05-22T12:11:00.000Z') });

    expect(packet).toContain('CueForge Panda Notes repair packet');
    expect(packet).toContain('Add missing state feedback');
    expect(packet).toContain('[redacted-path]');
    expect(packet).toContain('[redacted-email]');
    expect(packet).not.toContain('carls');
    expect(packet).toContain('Do not remove privacy redaction');
    expect(packet).toContain('Target code: src/uiFeedback.js');
  });

  it('exposes a code structure map and target snippets for selected notes', () => {
    const action = {
      page: 'Report Lab',
      area: 'Download report',
      tag: 'broken'
    };
    const snippet = getUiFeedbackSnippet(action);

    expect(cueforgeCodeStructure.length).toBeGreaterThanOrEqual(6);
    expect(cueforgeCodeStructure.some((entry) => entry.path === 'src/main.jsx')).toBe(true);
    expect(cueforgeCodeStructure.some((entry) => entry.path === 'src/reportPack.js')).toBe(true);
    expect(snippet.file).toBe('src/main.jsx');
    expect(snippet.code).toContain('saveUiNote');
  });

  it('marks notes through review, retest, and cleanup states', () => {
    const notes = [
      createUiFeedbackNote({
        page: 'System Info',
        tag: 'confusing',
        note: 'The next step is not obvious',
        now: new Date('2026-05-22T12:05:00.000Z')
      }),
      createUiFeedbackNote({
        page: 'Mic Lab',
        tag: 'broken',
        note: 'Start button did nothing',
        now: new Date('2026-05-22T12:06:00.000Z')
      })
    ];

    const reviewed = markUiFeedbackNotes(notes, [notes[0].id], 'reviewed', { now: new Date('2026-05-22T12:12:00.000Z') });
    const retest = markUiFeedbackNotes(reviewed, [notes[1].id], 'needs-retest', { now: new Date('2026-05-22T12:13:00.000Z') });
    const fixed = markUiFeedbackNotes(retest, [notes[0].id], 'fixed', { now: new Date('2026-05-22T12:14:00.000Z') });
    const summary = summarizeUiFeedback(fixed);
    const repairCheck = buildUiFeedbackRepairCheck(fixed);
    const cleaned = cleanupUiFeedbackNotes(fixed);

    expect(summary.reviewed).toBe(0);
    expect(summary.fixed).toBe(1);
    expect(summary.needsRetest).toBe(1);
    expect(repairCheck.totalNotes).toBe(2);
    expect(repairCheck.actionableNotes).toBe(1);
    expect(cleaned).toHaveLength(1);
    expect(cleaned[0].status).toBe('needs-retest');
  });
});
