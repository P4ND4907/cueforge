import { analyzeAudioFrame } from '../../signalAnalyzer.js';

export function runSignalAnalysisFixture(samples: Float32Array, sampleRate = 48000) {
  const frame = samples.slice(0, Math.min(samples.length, 2048));
  const timeDomain = Uint8Array.from(frame, (value) => Math.max(0, Math.min(255, Math.round(128 + value * 127))));
  const frequencyData = new Uint8Array(1024);

  for (let i = 0; i < frequencyData.length; i += 1) {
    frequencyData[i] = Math.max(0, Math.min(255, Math.round(Math.abs(frame[i % frame.length] || 0) * 255)));
  }

  return analyzeAudioFrame({ timeDomain, frequencyData, sampleRate });
}
