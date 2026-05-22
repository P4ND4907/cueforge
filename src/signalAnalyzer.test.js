import { describe, expect, it } from 'vitest';
import { analyzeAudioFrame, createEmptySignalAnalysis } from './signalAnalyzer.js';

describe('signal analyzer', () => {
  it('returns a stable empty analysis when no buffers are available', () => {
    const analysis = createEmptySignalAnalysis();
    expect(analysis.schema).toBe('cueforge.signal-analysis.v1');
    expect(analysis.fpsClarity).toBe(0);
    expect(analysis.eqNudge).toHaveLength(10);
  });

  it('detects input clipping from the waveform', () => {
    const timeDomain = new Uint8Array(2048).map((_, index) => (index % 2 === 0 ? 255 : 1));
    const frequencyData = new Uint8Array(1024).fill(42);

    const analysis = analyzeAudioFrame({ timeDomain, frequencyData, sampleRate: 48000 });

    expect(analysis.clipRisk).toBeGreaterThan(70);
    expect(analysis.probableCause).toBe('input-clipping');
    expect(analysis.recommendation).toMatch(/clipping/i);
  });

  it('flags low-end masking when rumble is strong and cue detail is weak', () => {
    const timeDomain = sineFrame({ amplitude: 0.25 });
    const frequencyData = new Uint8Array(1024).fill(5);
    fillBins(frequencyData, 48000, 20, 250, 230);
    fillBins(frequencyData, 48000, 3500, 6500, 18);

    const analysis = analyzeAudioFrame({ timeDomain, frequencyData, sampleRate: 48000 });

    expect(analysis.bands.rumble).toBeGreaterThan(70);
    expect(analysis.cueStrength).toBeLessThan(35);
    expect(analysis.probableCause).toBe('low-end-masking');
    expect(analysis.eqNudge[0]).toBeLessThan(0);
  });

  it('scores a balanced voice-and-cue signal as usable', () => {
    const timeDomain = sineFrame({ amplitude: 0.2 });
    const frequencyData = new Uint8Array(1024).fill(8);
    fillBins(frequencyData, 48000, 700, 3500, 150);
    fillBins(frequencyData, 48000, 3500, 6500, 135);
    fillBins(frequencyData, 48000, 20, 250, 35);

    const analysis = analyzeAudioFrame({ timeDomain, frequencyData, sampleRate: 48000 });

    expect(analysis.voicePresence).toBeGreaterThan(40);
    expect(analysis.fpsClarity).toBeGreaterThan(60);
    expect(analysis.commsReadiness).toBeGreaterThan(55);
    expect(analysis.probableCause).toBe('usable-signal');
  });
});

function sineFrame({ amplitude = 0.2, cycles = 16 } = {}) {
  return Uint8Array.from({ length: 2048 }, (_, index) => {
    const value = Math.sin((index / 2048) * Math.PI * 2 * cycles) * amplitude;
    return Math.round(128 + value * 127);
  });
}

function fillBins(buffer, sampleRate, fromHz, toHz, value) {
  const binHz = (sampleRate / 2) / buffer.length;
  const start = Math.max(0, Math.floor(fromHz / binHz));
  const end = Math.min(buffer.length, Math.ceil(toHz / binHz));
  for (let index = start; index < end; index += 1) buffer[index] = value;
}
