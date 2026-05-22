export const blindMatchRounds = [
  {
    id: 'footstep-clarity',
    label: 'Footstep clarity',
    prompt: 'Which sample makes small movement easier to pick out?',
    a: { name: 'Clean Cue Lift', eqDelta: [0, 0, -0.2, -0.4, -0.2, 0.2, 1.4, 1.6, -0.4, -0.6], frequencies: [900, 2200, 4200] },
    b: { name: 'Warm Detail', eqDelta: [0.8, 0.6, 0.2, -0.2, 0, 0.1, 0.8, 0.9, 0.2, 0], frequencies: [700, 1800, 3600] }
  },
  {
    id: 'explosion-control',
    label: 'Explosion control',
    prompt: 'Which sample feels powerful without hiding detail?',
    a: { name: 'Tight Low End', eqDelta: [-1.4, -1, -0.5, 0, 0, 0.3, 0.7, 0.6, -0.2, -0.4], frequencies: [80, 180, 3000] },
    b: { name: 'Cinematic Weight', eqDelta: [1.2, 1, 0.7, 0, -0.2, 0, 0.2, 0.2, 0, 0], frequencies: [55, 120, 1200] }
  },
  {
    id: 'voice-separation',
    label: 'Voice separation',
    prompt: 'Which sample keeps teammate voice clearer?',
    a: { name: 'Comms Forward', eqDelta: [-0.4, -0.5, -0.4, -0.2, 0.6, 1, 0.9, 0.4, -0.2, -0.4], frequencies: [500, 1000, 2400] },
    b: { name: 'Game Forward', eqDelta: [0.2, 0.2, 0, -0.3, -0.4, 0, 1.2, 1.3, 0.2, 0], frequencies: [250, 2200, 4700] }
  },
  {
    id: 'treble-comfort',
    label: 'Treble comfort',
    prompt: 'Which sample is less sharp on your IEMs?',
    a: { name: 'Smooth Air', eqDelta: [0, 0, 0, 0, 0.2, 0.4, 0.6, 0.2, -1.4, -1], frequencies: [1500, 3800, 6500] },
    b: { name: 'Edge Detail', eqDelta: [0, 0, 0, -0.2, 0, 0.2, 1, 1.4, 0.6, 0.4], frequencies: [2400, 5200, 9000] }
  },
  {
    id: 'center-image',
    label: 'Center image',
    prompt: 'Which sample feels more centered and locked in?',
    a: { name: 'Narrow Lock', eqDelta: [-0.2, -0.2, 0, 0.3, 0.6, 0.4, 0.2, 0, -0.2, -0.2], frequencies: [440, 880, 1760] },
    b: { name: 'Wide Space', eqDelta: [0.2, 0.3, 0.1, -0.2, -0.2, 0, 0.5, 0.7, 0.5, 0.4], frequencies: [330, 1320, 5280] }
  }
];

export function createBlindMatchResult(choices, baseEq) {
  const deltas = new Array(baseEq.length).fill(0);
  const picked = [];

  blindMatchRounds.forEach((round) => {
    const choice = choices[round.id];
    if (!choice) return;
    const sample = round[choice];
    picked.push(`${round.label}: ${sample.name}`);
    sample.eqDelta.forEach((delta, index) => {
      deltas[index] += delta;
    });
  });

  const rounds = Math.max(1, picked.length);
  const eq = baseEq.map((gain, index) => clamp(Number((gain + deltas[index] / rounds).toFixed(1)), -6, 6));
  const confidence = Math.min(96, 44 + picked.length * 10);

  return {
    confidence,
    completedRounds: picked.length,
    picked,
    eq,
    signature: buildSignature(eq),
    summary: picked.length
      ? `Learned from ${picked.length} blind choices. ${buildSignature(eq)}.`
      : 'No choices yet.'
  };
}

function buildSignature(eq) {
  const low = (eq[0] + eq[1] + eq[2]) / 3;
  const cue = (eq[6] + eq[7]) / 2;
  const air = (eq[8] + eq[9]) / 2;
  const parts = [];
  parts.push(cue > 2.5 ? 'cue-forward' : 'balanced cues');
  parts.push(low < -0.8 ? 'controlled bass' : 'fuller lows');
  parts.push(air < 0 ? 'smooth treble' : 'open treble');
  return parts.join(', ');
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
