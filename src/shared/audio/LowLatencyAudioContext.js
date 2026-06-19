export class LowLatencyAudioContext {
  constructor({ target = globalThis } = {}) {
    this.target = target;
  }

  async init() {
    return createLowLatencyAudioContext({ target: this.target });
  }
}

export function createLowLatencyAudioContext({ target = globalThis } = {}) {
  const AudioContextCtor = target.AudioContext || target.webkitAudioContext;
  if (!AudioContextCtor) throw new Error('Web Audio is unavailable');
  return new AudioContextCtor({
    latencyHint: 'interactive',
    sampleRate: 48000
  });
}
