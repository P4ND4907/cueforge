export const localSourceProfiles = {
  iemFps: {
    name: 'Generic IEM FPS',
    preampDb: -5.5,
    source: '../autoeq/profiles/headsets/generic-iem-fps.json',
    filters: [
      { type: 'PK', fc: 35, gainDb: -2.0, q: 0.7 },
      { type: 'PK', fc: 120, gainDb: -1.5, q: 0.9 },
      { type: 'PK', fc: 2200, gainDb: 1.5, q: 1.1 },
      { type: 'PK', fc: 4200, gainDb: 2.0, q: 1.2 },
      { type: 'PK', fc: 7800, gainDb: -1.2, q: 2.0 }
    ]
  },
  valorant: {
    name: 'Valorant FPS Overlay',
    preampDb: -0.5,
    source: '../autoeq/profiles/games/valorant.json',
    processes: ['VALORANT-Win64-Shipping.exe', 'valorant.exe'],
    filters: [
      { type: 'PK', fc: 150, gainDb: -0.8, q: 1.0 },
      { type: 'PK', fc: 3000, gainDb: 1.6, q: 1.1 },
      { type: 'PK', fc: 4700, gainDb: 1.9, q: 1.3 }
    ]
  },
  competitiveFps: {
    name: 'Competitive FPS',
    preampDb: -0.5,
    source: '../autoeq/profiles/modes/competitive-fps.json',
    description: 'Leans into footsteps and directional detail while trimming some low-end bloom.',
    filters: [
      { type: 'PK', fc: 110, gainDb: -1.2, q: 0.9 },
      { type: 'PK', fc: 2400, gainDb: 1.4, q: 1.1 },
      { type: 'PK', fc: 4100, gainDb: 1.6, q: 1.2 }
    ]
  },
  balanced: {
    name: 'Balanced',
    preampDb: 0,
    source: '../autoeq/profiles/modes/balanced.json',
    description: 'A calmer everyday profile that keeps things clean without pushing the upper mids too hard.',
    filters: [
      { type: 'PK', fc: 95, gainDb: -0.6, q: 0.9 },
      { type: 'PK', fc: 2800, gainDb: 0.7, q: 1.0 }
    ]
  }
};

export const hardwareTargets = [
  {
    name: 'Generic IEM FPS',
    type: 'IEM',
    aim: 'Clean footstep cue lift without piercing 7-8kHz glare.',
    setup: 'Use this as your starting point for in-ear monitors. Keep preamp at -5.5dB to prevent clipping.'
  },
  {
    name: 'HyperX boom mic',
    type: 'Microphone',
    aim: 'Reduce boom, preserve consonants, avoid aggressive noise suppression artifacts.',
    setup: 'Start at 80-90% Windows input gain, then reduce if clip risk rises above 15%.'
  }
];

export function buildApoConfigFromFilters(profile) {
  const lines = [`Preamp: ${profile.preampDb.toFixed(1)} dB`];
  profile.filters.forEach((filter, index) => {
    lines.push(
      `Filter ${index + 1}: ON ${filter.type} Fc ${filter.fc} Hz Gain ${filter.gainDb.toFixed(1)} dB Q ${filter.q.toFixed(2)}`
    );
  });
  return lines.join('\n');
}
