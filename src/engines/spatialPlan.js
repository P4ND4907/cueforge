export const spatialTruthWarning = 'CueForge can improve the final audio chain, but true object-level occlusion and scene-aware spatial audio require game-engine support.';

export const honestSpatialModes = [
  {
    id: 'safe_stereo',
    label: 'Safe Stereo',
    promise: 'No fake surround. Best for competitive clarity.',
    bestFor: ['competitive FPS', 'rhythm', 'fighting games', 'low-latency testing'],
    settings: {
      crossfeed: 0,
      hrtf: 'off',
      fakeSurround: false
    }
  },
  {
    id: 'competitive_width',
    label: 'Competitive Width',
    promise: 'Slight crossfeed and controlled width without exaggerated virtual surround.',
    bestFor: ['battle royale', 'extraction shooters', 'wide but readable stereo'],
    settings: {
      crossfeed: 0.12,
      hrtf: 'off_by_default',
      fakeSurround: false
    }
  },
  {
    id: 'immersive_hrtf_preview',
    label: 'Immersive HRTF Preview',
    promise: 'Optional preview for story, horror, RPG, and racing. Not true game-scene occlusion.',
    bestFor: ['story', 'horror', 'open world', 'racing'],
    settings: {
      crossfeed: 0.32,
      hrtf: 'optional',
      fakeSurround: false
    }
  },
  {
    id: 'developer_spatial_sdk',
    label: 'Developer Spatial SDK',
    promise: 'Future game-partner path for engine hooks, metadata, and SDK research.',
    bestFor: ['future SDKs', 'Steam Audio research', 'FMOD/Wwise/Unreal/Unity hooks'],
    settings: {
      crossfeed: null,
      hrtf: 'engine_provided',
      fakeSurround: false
    },
    futureOnly: true
  }
];

function modeById(id) {
  return honestSpatialModes.find((mode) => mode.id === id) || honestSpatialModes[0];
}

function chooseSpatialMode({ graph, conflicts, profile } = {}) {
  const hasSpatialConflict = conflicts?.conflicts?.some((item) => (
    ['double-processing', 'routing-stack', 'multiple_spatial_layers'].includes(item.id)
  ));
  if (hasSpatialConflict) return modeById('safe_stereo');

  const spatial = profile?.recommendation?.spatial || profile?.spatial || {};
  if (spatial.hrtf === 'optional') return modeById('immersive_hrtf_preview');
  if ((Number(spatial.crossfeed) || 0) > 0.05 || (graph?.summary?.processingLayers || 0) > 0) {
    return modeById('competitive_width');
  }

  return modeById('safe_stereo');
}

export function buildSpatialPlan({ graph, conflicts, profile } = {}) {
  const hasSpatialConflict = conflicts?.conflicts?.some((item) => (
    ['double-processing', 'routing-stack', 'multiple_spatial_layers'].includes(item.id)
  ));
  const selectedMode = chooseSpatialMode({ graph, conflicts, profile });
  return {
    schema: 'cueforge.spatial-plan.v1',
    mode: hasSpatialConflict ? 'single-layer-required' : selectedMode.id,
    selectedMode,
    modes: honestSpatialModes,
    warning: spatialTruthWarning,
    guidance: hasSpatialConflict
      ? 'Do not stack spatial/enhancer layers until routing is proven.'
      : 'Use one honest spatial mode at a time and compare before/after match notes.',
    layerCount: (graph?.summary?.processingLayers || 0) + (graph?.summary?.routingLayers || 0),
    claims: {
      canImproveFinalChain: true,
      canClaimTrueObjectOcclusionFromStereoMix: false,
      requiresGameEngineSupportForSceneAwareSpatial: true
    },
    researchLane: {
      sdk: 'Steam Audio',
      license: 'Apache-2.0',
      platforms: ['Windows', 'Linux', 'macOS', 'Android', 'iOS'],
      integrations: ['Unity', 'Unreal', 'FMOD', 'Wwise'],
      role: 'Research and future game-partner SDK path, not a promise for mixed stereo output.'
    }
  };
}
