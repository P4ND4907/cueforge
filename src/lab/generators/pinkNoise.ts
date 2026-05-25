function seededRandom(seed = 7331) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function generatePinkNoise(length = 48000, gain = 0.25, seed = 7331) {
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  const output = new Float32Array(length);
  const random = seededRandom(seed);

  for (let i = 0; i < length; i += 1) {
    const white = random() * 2 - 1;
    b0 = 0.99765 * b0 + white * 0.099046;
    b1 = 0.963 * b1 + white * 0.2965164;
    b2 = 0.57 * b2 + white * 1.0526913;
    output[i] = Math.max(-1, Math.min(1, (b0 + b1 + b2 + white * 0.1848) * gain));
  }

  return output;
}
