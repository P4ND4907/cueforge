export function generateCommsBed({ sampleRate = 48000, seconds = 3, gain = 0.16 } = {}) {
  const length = Math.floor(sampleRate * seconds);
  const output = new Float32Array(length);

  for (let i = 0; i < length; i += 1) {
    const t = i / sampleRate;
    output[i] = gain * (
      Math.sin(2 * Math.PI * 180 * t) * 0.35 +
      Math.sin(2 * Math.PI * 900 * t) * 0.45 +
      Math.sin(2 * Math.PI * 2200 * t) * 0.2
    );
  }

  return output;
}
