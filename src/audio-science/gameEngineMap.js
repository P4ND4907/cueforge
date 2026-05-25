export const gameAudioEngineMap = [
  {
    id: 'wwise',
    name: 'Wwise',
    exposes: ['rooms', 'portals', 'geometry', 'diffraction', 'transmission', 'reverb sends'],
    downstreamRisk: 'CueForge sees only rendered audio unless the game or middleware exposes debug telemetry.',
    usefulAsk: 'Ask for room/portal, diffraction, transmission-loss, and emitter virtual-position debug values.'
  },
  {
    id: 'fmod',
    name: 'FMOD',
    exposes: ['events', 'spatializers', 'distance attenuation', 'routing', 'occlusion via integrations'],
    downstreamRisk: 'A stereo mix hides event identity and object positions after FMOD renders the bus.',
    usefulAsk: 'Ask for event routing, spatializer, attenuation, occlusion, and bus output state.'
  },
  {
    id: 'unreal',
    name: 'Unreal Audio Engine',
    exposes: ['orientation', 'attenuation', 'propagation', 'occlusion', 'obstruction', 'reverb'],
    downstreamRisk: 'The final output may preserve only panning and spectral effects, not actor/source metadata.',
    usefulAsk: 'Ask for attenuation, spatialization, occlusion, obstruction, reverb, and listener geometry settings.'
  },
  {
    id: 'unity',
    name: 'Unity Audio',
    exposes: ['AudioListener', 'AudioSource', 'spatial blend', 'spread', 'reverb zone mix', 'spatializer metadata'],
    downstreamRisk: 'Unity can pass rich per-source spatializer data to plugins, but CueForge will not receive it from a normal post-mix capture.',
    usefulAsk: 'Ask whether a spatializer plugin is active and whether source/listener metadata is exported.'
  },
  {
    id: 'steam-audio',
    name: 'Steam Audio',
    exposes: ['HRTF', 'distance attenuation', 'air absorption', 'occlusion', 'reflections', 'pathing'],
    downstreamRisk: 'Physics-based propagation may be flattened by game routing or other spatial layers before CueForge sees it.',
    usefulAsk: 'Ask for HRTF, occlusion, reflections, pathing, and air-absorption settings.'
  },
  {
    id: 'windows-spatial-sound',
    name: 'Windows Spatial Sound',
    exposes: ['surround', 'elevation', 'audio objects', 'endpoint rendering'],
    downstreamRisk: 'Depending on routing, a downstream app may receive only the rendered endpoint mix instead of object channels.',
    usefulAsk: 'Ask whether the capture source is object/surround aware or already rendered to stereo.'
  },
  {
    id: 'dolby-atmos',
    name: 'Dolby Atmos',
    exposes: ['object rendering', 'height cues', 'virtualized endpoint output'],
    downstreamRisk: 'Virtualized output can stack with other spatializers and confuse pan or cue stability.',
    usefulAsk: 'Ask whether Atmos is on, whether the game outputs objects, and whether another spatial layer is also active.'
  },
  {
    id: 'steelseries-sonar',
    name: 'SteelSeries Sonar',
    exposes: ['virtual game/chat/media/mic routing', 'EQ', 'noise processing', 'spatial processing'],
    downstreamRisk: 'Virtual device routing can make the app tune the wrong endpoint or double-process spatial cues.',
    usefulAsk: 'Ask for default output, communication output, Sonar channel, and enabled processing modules.'
  },
  {
    id: 'razer-thx',
    name: 'Razer THX',
    exposes: ['virtual surround', 'game profiles', 'endpoint virtualization'],
    downstreamRisk: 'Competitive tuning may already boost or suppress bands, so global EQ can overcorrect.',
    usefulAsk: 'Ask whether THX is enabled and which game/profile mode is active.'
  },
  {
    id: 'wasapi',
    name: 'WASAPI',
    exposes: ['endpoint capture', 'loopback capture', 'process loopback on newer Windows builds'],
    downstreamRisk: 'Endpoint loopback captures the rendered mix; process loopback is safer later for game-only capture.',
    usefulAsk: 'Ask whether the desktop capture is endpoint-wide or process-specific.'
  },
  {
    id: 'equalizer-apo',
    name: 'Equalizer APO',
    exposes: ['system-level APO filters', 'device attachment', 'config text'],
    downstreamRisk: 'APO must be attached to the actual output endpoint, and stacking with other EQ can mask results.',
    usefulAsk: 'Ask for attached device, active config text, and whether Peace or another controller is writing config.'
  }
];

export function getGameAudioEngine(idOrName = '') {
  const key = String(idOrName).toLowerCase();
  return gameAudioEngineMap.find((engine) => engine.id === key || engine.name.toLowerCase().includes(key)) || null;
}

export function canClaimTruePosition({ metadata = false, surroundOrObjectInput = false, validatedInference = false } = {}) {
  return Boolean(metadata || surroundOrObjectInput || validatedInference);
}
