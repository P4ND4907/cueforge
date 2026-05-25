function seededRandom(seed = 1337) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateExplosionMasker({ sampleRate = 48000, seconds = 3, gain = 0.35, seed = 1337 } = {}) {
  const length = Math.floor(sampleRate * seconds);
  const output = new Float32Array(length);
  const random = seededRandom(seed);

  for (let i = 0; i < Math.min(length, sampleRate); i += 1) {
    const t = i / sampleRate;
    const envelope = Math.exp(-t * 3.2);
    output[i] = gain * envelope * (
      Math.sin(2 * Math.PI * 42 * t) * 0.7 +
      Math.sin(2 * Math.PI * 90 * t) * 0.45 +
      (random() * 2 - 1) * 0.2
    );
  }

  return output;
}
