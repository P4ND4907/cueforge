import { describe, expect, it } from 'vitest';
import { computeUiNoteFocusScrollDelta, computeUiNotePopoverPosition } from './uiNotePosition.js';

describe('ui note popover position', () => {
  it('flips above the click near the bottom of the viewport', () => {
    const position = computeUiNotePopoverPosition({
      clientX: 1200,
      clientY: 1020,
      viewportWidth: 1365,
      viewportHeight: 1080
    });

    expect(position.verticalPlacement).toBe('above');
    expect(position.horizontalPlacement).toBe('left');
    expect(position.y).toBeLessThan(1020);
    expect(position.y + position.maxHeight).toBeLessThanOrEqual(1080 - 16);
    expect(position.x + position.width).toBeLessThanOrEqual(1365 - 16);
  });

  it('opens below the click when there is enough room', () => {
    const position = computeUiNotePopoverPosition({
      clientX: 300,
      clientY: 80,
      viewportWidth: 1280,
      viewportHeight: 900
    });

    expect(position.verticalPlacement).toBe('below');
    expect(position.horizontalPlacement).toBe('right');
    expect(position.y).toBeGreaterThan(80);
  });

  it('shrinks and clamps inside small mobile viewports', () => {
    const position = computeUiNotePopoverPosition({
      clientX: 360,
      clientY: 810,
      viewportWidth: 390,
      viewportHeight: 844
    });

    expect(position.width).toBeLessThanOrEqual(390 - 32);
    expect(position.maxHeight).toBeLessThanOrEqual(844 - 32);
    expect(position.x).toBeGreaterThanOrEqual(16);
    expect(position.y).toBeGreaterThanOrEqual(16);
    expect(position.x + position.width).toBeLessThanOrEqual(390 - 16);
    expect(position.y + position.maxHeight).toBeLessThanOrEqual(844 - 16);
  });

  it('does not scroll the note body when the field is already visible', () => {
    const delta = computeUiNoteFocusScrollDelta({
      popoverTop: 100,
      popoverBottom: 520,
      fieldTop: 380,
      fieldBottom: 480
    });

    expect(delta).toBe(0);
  });

  it('scrolls only enough when the focused field is clipped by an edge', () => {
    expect(computeUiNoteFocusScrollDelta({
      popoverTop: 100,
      popoverBottom: 520,
      fieldTop: 470,
      fieldBottom: 540
    })).toBe(32);

    expect(computeUiNoteFocusScrollDelta({
      popoverTop: 100,
      popoverBottom: 520,
      fieldTop: 80,
      fieldBottom: 180
    })).toBe(-32);
  });

  it('treats a sticky footer as the visible bottom edge', () => {
    const delta = computeUiNoteFocusScrollDelta({
      popoverTop: 100,
      popoverBottom: 450,
      fieldTop: 390,
      fieldBottom: 500
    });

    expect(delta).toBe(62);
  });
});
