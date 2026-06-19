import { describe, expect, it } from 'vitest';
import { extractor, WavFeatureExtractor } from '../wavFeatureExtractor.js';

describe('WavFeatureExtractor class', () => {
  it('wraps the existing WAV analyzer with transient, band, and coach output', async () => {
    const wav = createPcm16Wav({
      durationSeconds: 0.2,
      sampleAt: (time) => Math.sin(2 * Math.PI * 4200 * time) * 0.6
    });
    const localExtractor = new WavFeatureExtractor();

    const analysis = await localExtractor.analyzeWav(wav);

    expect(analysis.schema).toBe('cueforge.wav-analysis.v1');
    expect(analysis.features.transientScore).toBeGreaterThanOrEqual(0);
    expect(analysis.features.bandEnergy.cue).toBeGreaterThan(0);
    expect(analysis.coach.schema).toBe('cueforge.wav-coach.v1');
    await expect(extractor.analyzeWav(wav)).resolves.toMatchObject({ schema: 'cueforge.wav-analysis.v1' });
  });
});

function createPcm16Wav({ sampleRate = 48000, channels = 1, durationSeconds = 0.1, sampleAt }) {
  const frameCount = Math.round(sampleRate * durationSeconds);
  const bytesPerSample = 2;
  const blockAlign = channels * bytesPerSample;
  const dataSize = frameCount * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let frame = 0; frame < frameCount; frame += 1) {
    const time = frame / sampleRate;
    for (let channel = 0; channel < channels; channel += 1) {
      const sample = Math.max(-1, Math.min(1, sampleAt(time, channel, frame)));
      view.setInt16(offset, Math.round(sample * 32767), true);
      offset += bytesPerSample;
    }
  }

  return buffer;
}

function writeAscii(view, offset, value) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}
