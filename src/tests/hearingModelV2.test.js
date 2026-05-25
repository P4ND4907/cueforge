import { describe, expect, it } from 'vitest';
import { buildHearingModelV2 } from '../core/hearingModelV2.js';
import { createEmptyHearingResults } from '../hearingModel.js';

describe('hearing model v2', () => {
  it('keeps treble conservative until enough hearing answers exist', () => {
    const model = buildHearingModelV2({
      results: createEmptyHearingResults(),
      profile: { metrics: { comfortRisk: 3.2 } }
    });

    expect(model.schema).toBe('cueforge.hearing-model.v2');
    expect(model.gates.find((gate) => gate.id === 'minimum-answers').ready).toBe(false);
    expect(model.guidance).toMatch(/conservative/i);
  });
});
