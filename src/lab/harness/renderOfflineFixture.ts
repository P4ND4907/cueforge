export function renderOfflineFixture(parts: Float32Array[] = []) {
  const length = Math.max(0, ...parts.map((part) => part.length));
  const output = new Float32Array(length);

  for (const part of parts) {
    for (let i = 0; i < part.length; i += 1) {
      output[i] = Math.max(-1, Math.min(1, output[i] + part[i]));
    }
  }

  return {
    schema: 'cueforge.offline-fixture.v1',
    sampleRate: 48000,
    channels: 1,
    samples: output
  };
}
