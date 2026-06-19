import { describe, expect, it } from 'vitest';
import { LowLatencyAudioContext, createLowLatencyAudioContext } from '../shared/audio/LowLatencyAudioContext.js';

describe('low latency audio context', () => {
  it('creates an interactive 48k context when the browser supports Web Audio', async () => {
    const calls = [];
    class FakeAudioContext {
      constructor(options) {
        calls.push(options);
        this.options = options;
      }
    }

    const context = await createLowLatencyAudioContext({
      target: { AudioContext: FakeAudioContext }
    });

    expect(context.options).toEqual({
      latencyHint: 'interactive',
      sampleRate: 48000
    });
    expect(calls).toHaveLength(1);
  });

  it('exposes a class wrapper for UI flows that need lazy init', async () => {
    class FakeAudioContext {
      constructor(options) {
        this.options = options;
      }
    }

    const factory = new LowLatencyAudioContext({ target: { webkitAudioContext: FakeAudioContext } });
    const context = await factory.init();

    expect(context.options.latencyHint).toBe('interactive');
    expect(context.options.sampleRate).toBe(48000);
  });
});
