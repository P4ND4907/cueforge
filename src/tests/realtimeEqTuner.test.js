import { describe, expect, it } from 'vitest';
import {
  buildCueForgeDiagnosticsEvent,
  buildRealtimeEqTunerReport,
  createCueForgeDiagnosticsClient,
  exportCueForgeRealtimeEqFilters
} from '../core/realtimeEqTuner.js';

function emptyFrequencyData() {
  return new Uint8Array(1024).fill(8);
}

function setBand(frequencyData, sampleRate, from, to, value) {
  const binHz = (sampleRate / 2) / frequencyData.length;
  const start = Math.max(0, Math.floor(from / binHz));
  const end = Math.min(frequencyData.length, Math.ceil(to / binHz));
  for (let index = start; index < end; index += 1) frequencyData[index] = value;
}

function centeredTimeDomain(length = 512) {
  return new Uint8Array(length).fill(128);
}

describe('CueForge realtime EQ tuner', () => {
  it('uses CueForge naming and stays preview-only', () => {
    const frequencyData = emptyFrequencyData();
    setBand(frequencyData, 48000, 6500, 9000, 235);

    const report = buildRealtimeEqTunerReport({
      frequencyData,
      timeDomain: centeredTimeDomain(),
      sampleRate: 48000
    });

    expect(report.schema).toBe('cueforge.realtime-eq-tuner.v1');
    expect(report.productName).toBe('CueForge');
    expect(report.mode).toBe('preview');
    expect(report.runtimeApply).toBe(false);
    expect(report.latency.hopMs).toBeLessThanOrEqual(10);
  });

  it('suggests a narrow cut when harsh sibilance dominates', () => {
    const frequencyData = emptyFrequencyData();
    setBand(frequencyData, 48000, 6500, 9000, 240);
    setBand(frequencyData, 48000, 2000, 4000, 80);

    const report = buildRealtimeEqTunerReport({
      frequencyData,
      timeDomain: centeredTimeDomain(),
      sampleRate: 48000
    });

    const suggestion = report.suggestions.find((item) => item.reason === 'sibilance_spike');
    expect(suggestion).toMatchObject({
      type: 'peaking',
      freq: 7200,
      gainDb: -3,
      previewOnly: true
    });
    expect(suggestion.confidence).toBeGreaterThan(0.7);
  });

  it('suggests low-mid cleanup and dialogue lift when cues are masked', () => {
    const frequencyData = emptyFrequencyData();
    setBand(frequencyData, 48000, 200, 350, 230);
    setBand(frequencyData, 48000, 2000, 4000, 38);
    setBand(frequencyData, 48000, 700, 1800, 145);

    const report = buildRealtimeEqTunerReport({
      frequencyData,
      timeDomain: centeredTimeDomain(),
      sampleRate: 48000
    });

    expect(report.suggestions.map((item) => item.reason)).toContain('mud_buildup');
    expect(report.suggestions.map((item) => item.reason)).toContain('dialogue_clarity_low');
    expect(report.flags.map((flag) => flag.type)).toContain('low_mid_masking');
  });

  it('detects clipping and DC offset before recommending trust in EQ', () => {
    const frequencyData = emptyFrequencyData();
    const clippedOffset = new Uint8Array(512).fill(252);

    const report = buildRealtimeEqTunerReport({
      frequencyData,
      timeDomain: clippedOffset,
      sampleRate: 48000
    });

    expect(report.flags.map((flag) => flag.type)).toContain('clipping');
    expect(report.flags.map((flag) => flag.type)).toContain('dc_offset');
    expect(report.blockers).toContain('Fix clipping before trusting EQ suggestions.');
  });

  it('exports replay-safe CueForge filters with no hidden routing or driver writes', () => {
    const frequencyData = emptyFrequencyData();
    setBand(frequencyData, 48000, 6500, 9000, 235);
    const report = buildRealtimeEqTunerReport({
      frequencyData,
      timeDomain: centeredTimeDomain(),
      sampleRate: 48000
    });

    const exportPayload = exportCueForgeRealtimeEqFilters(report);

    expect(exportPayload.schema).toBe('cueforge.filters.v1');
    expect(exportPayload.source).toBe('cueforge.realtime-eq-tuner');
    expect(exportPayload.runtimeApply).toBe(false);
    expect(exportPayload.noHiddenNativeRouting).toBe(true);
    expect(exportPayload.noSilentDriverChanges).toBe(true);
    expect(exportPayload.filters[0]).toMatchObject({
      type: 'peaking',
      freq: 7200,
      reason: 'sibilance_spike'
    });
  });

  it('builds the dashboard and SDK event contract without fake apply behavior', () => {
    const report = buildRealtimeEqTunerReport({
      frequencyData: emptyFrequencyData(),
      timeDomain: centeredTimeDomain(),
      sampleRate: 48000
    });
    const event = buildCueForgeDiagnosticsEvent(report);
    const client = createCueForgeDiagnosticsClient('ws://localhost:6789');
    const seen = [];

    client.on('analysis', (payload) => seen.push(payload.schema));
    client.emitLocal('analysis', event);

    const applyResult = client.apply(event.suggestions);

    expect(event.schema).toBe('cueforge.diagnostics.event.v1');
    expect(event.productName).toBe('CueForge');
    expect(seen).toEqual(['cueforge.diagnostics.event.v1']);
    expect(applyResult).toMatchObject({
      applied: false,
      reason: 'runtime_eq_not_enabled'
    });
  });
});
