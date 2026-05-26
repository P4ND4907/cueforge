export function generateFootsteps({ sampleRate = 48000, seconds = 3, steps = 5 } = {}) {
  const length = Math.floor(sampleRate * seconds);
  const output = new Float32Array(length);
  const spacing = Math.floor(length / Math.max(1, steps));

  for (let step = 0; step < steps; step += 1) {
    const start = step * spacing;
    for (let i = 0; i < Math.min(800, length - start); i += 1) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 28);
      const lowThump = Math.sin(2 * Math.PI * 120 * t) * 0.25;
      const cueClick = Math.sin(2 * Math.PI * 3600 * t) * 0.08;
      output[start + i] += (lowThump + cueClick) * envelope;
    }
  }

  return output;
}
