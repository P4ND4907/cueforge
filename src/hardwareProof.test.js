import { describe, expect, it } from 'vitest';
import { evaluateMicCaptureProof, formatBridgeReportProof, summarizeBridgeReport } from './hardwareProof.js';

describe('hardware proof helpers', () => {
  it('summarizes a Windows bridge report without exposing raw paths', () => {
    const summary = summarizeBridgeReport({
      generatedAt: '2026-05-22T10:00:00.000Z',
      soundDevices: [{ Name: 'Realtek Audio' }],
      mediaDevices: [{ Name: 'HyperX Microphone' }, { Name: 'USB DAC' }],
      tools: {
        equalizerApo: { installed: true, path: 'C:/Program Files/EqualizerAPO' },
        peace: { installed: false },
        steelSeriesSonar: { installed: true }
      },
      matches: {
        hyperx: true,
        iemOrDac: true
      }
    });

    expect(summary.totalDeviceCount).toBe(3);
    expect(summary.toolState.equalizerApo).toBe(true);
    expect(summary.namedMatches.hyperx).toBe(true);
  });

  it('formats a bridge proof as a short tester-facing result', () => {
    const proof = formatBridgeReportProof({
      soundDevices: [{ Name: 'Realtek Audio' }],
      mediaDevices: [{ Name: 'USB DAC' }],
      tools: { equalizerApo: { installed: true } },
      matches: { iemOrDac: true }
    });

    expect(proof).toContain('1 sound devices');
    expect(proof).toContain('1 media endpoints');
    expect(proof).toContain('equalizerApo');
    expect(proof).toContain('IEM/DAC/headset output match');
  });

  it('passes mic proof only when a real capture signal is present', () => {
    expect(evaluateMicCaptureProof({ streamStarted: false }).status).toBe('warn');
    expect(evaluateMicCaptureProof({ streamStarted: true, rms: 0, peak: 0, sampleRate: 48000 }).status).toBe('warn');
    expect(evaluateMicCaptureProof({ streamStarted: true, rms: 0.02, peak: 0.06, sampleRate: 48000, frameCount: 12, captureMs: 800 }).status).toBe('pass');
  });
});
