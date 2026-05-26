import { describe, expect, it } from 'vitest';
import { decodeWavToPcm, extractWavFeatures, parseWav } from './wavFeatureExtractor.js';

describe('wav feature extractor', () => {
  it('parses PCM WAV metadata and decodes samples', () => {
    const wav = createPcm16Wav({
      durationSeconds: 0.1,
      sampleAt: (time) => Math.sin(2 * Math.PI * 440 * time) * 0.5
    });

    const meta = parseWav(wav);
    const pcm = decodeWavToPcm(wav);

    expect(meta.sampleRate).toBe(48000);
    expect(meta.channels).toBe(1);
    expect(meta.bitsPerSample).toBe(16);
    expect(meta.durationMs).toBe(100);
    expect(pcm.channelData[0].length).toBe(4800);
    expect(Math.max(...pcm.channelData[0])).toBeGreaterThan(0.45);
  });

  it('extracts STFT features and feeds the existing detector', () => {
    const wav = createPcm16Wav({
      durationSeconds: 0.35,
      sampleAt: (time) => {
        const burstOn = Math.floor(time * 20) % 2 === 0;
        return burstOn ? Math.sin(2 * Math.PI * 4200 * time) * 0.75 : 0;
      }
    });

    const analysis = extractWavFeatures(wav, { frameSize: 1024, hopSize: 512, gameEngine: 'Unreal' });

    expect(analysis.schema).toBe('cueforge.wav-analysis.v1');
    expect(analysis.stft.frameCount).toBeGreaterThan(5);
    expect(analysis.features.transientScore).toBeGreaterThan(5);
    expect(analysis.signalAnalysis.schema).toBe('cueforge.signal-analysis.v1');
    expect(analysis.echoScene.boundary.cannotInfer).toContain('true game object positions');
    expect(analysis.sceneGraph.limitation).toMatch(/not a true game-world object graph/i);
    expect(analysis.coach.actions.length).toBeGreaterThan(0);
  });

  it('measures stereo pan and width from real channel samples', () => {
    const wav = createPcm16Wav({
      channels: 2,
      durationSeconds: 0.12,
      sampleAt: (time, channel) => {
        const amplitude = channel === 0 ? 0.12 : 0.8;
        return Math.sin(2 * Math.PI * 1000 * time) * amplitude;
      }
    });

    const analysis = extractWavFeatures(wav);

    expect(analysis.wav.channels).toBe(2);
    expect(analysis.features.stereoPan).toBeGreaterThan(50);
    expect(analysis.features.stereoWidth).toBeGreaterThan(20);
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
