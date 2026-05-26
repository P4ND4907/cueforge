export const CUEFORGE_STATE_VERSION = '0.2.0-alpha.3';

export const STATE_CONSUMERS = {
  setupCommandCenter: 'setup-command-center',
  nativeEngine: 'native-engine',
  apoExport: 'apo-export',
  profileRecommendation: 'profile-recommendation',
  discordFeedbackPack: 'discord-feedback-pack',
  reportLab: 'report-lab',
  audioDna: 'audio-dna',
  releasePack: 'release-pack'
};

export function isCueForgeStateV2(state) {
  return Boolean(
    state &&
      state.version === CUEFORGE_STATE_VERSION &&
      state.devices &&
      state.chain &&
      state.recommendedProfile &&
      state.readiness &&
      state.exports
  );
}

export function buildStateAnchor(state, consumer = 'feature') {
  const valid = isCueForgeStateV2(state);
  const safe = valid ? state : {};
  const recommendedProfile = safe.recommendedProfile || {};
  const readiness = safe.readiness || {};
  const chain = safe.chain || {};

  return {
    schema: 'cueforge.state-anchor.v1',
    consumer,
    stateVersion: safe.version || 'unknown',
    statePresent: valid,
    selectedGame: {
      title: safe.selectedGame?.title || null,
      genre: safe.selectedGame?.genre || 'unknown',
      intent: safe.selectedGame?.intent || 'balanced',
      profileId: safe.selectedGame?.profileId || null
    },
    devices: {
      outputType: safe.devices?.outputType || 'unknown',
      inputType: safe.devices?.inputType || 'unknown',
      suspectedHardware: safe.devices?.suspectedHardware || []
    },
    chain: {
      activeCompanions: chain.activeCompanions || [],
      virtualDevices: chain.virtualDevices || [],
      apoDetected: Boolean(chain.apoDetected),
      sonarDetected: Boolean(chain.sonarDetected),
      voicemeeterDetected: Boolean(chain.voicemeeterDetected),
      vbCableDetected: Boolean(chain.vbCableDetected),
      peaceDetected: Boolean(chain.peaceDetected),
      riskCount: chain.risks?.length || 0
    },
    profile: {
      id: recommendedProfile.id || null,
      confidence: recommendedProfile.confidence || 0,
      eqBands: recommendedProfile.eq?.length || 0,
      hasDynamics: Boolean(recommendedProfile.dynamics),
      hasMic: Boolean(recommendedProfile.mic),
      hasSpatial: Boolean(recommendedProfile.spatial)
    },
    readiness: {
      score: readiness.score || 0,
      tier: readiness.tier || 'not_ready',
      blockerCount: readiness.blockers?.length || 0,
      warningCount: readiness.warnings?.length || 0,
      nextActions: readiness.nextActions || []
    },
    exports: {
      hasApoConfig: Boolean(safe.exports?.apoConfig),
      hasSetupPack: Boolean(safe.exports?.setupPack),
      hasReportPack: Boolean(safe.exports?.reportPack),
      hasEngineManifest: Boolean(safe.exports?.engineManifest)
    }
  };
}

export function attachStateAnchor(payload, state, consumer) {
  return {
    ...payload,
    stateAnchor: buildStateAnchor(state, consumer)
  };
}

export function recommendedEqFromState(state, fallbackEq = []) {
  return Array.isArray(state?.recommendedProfile?.eq) && state.recommendedProfile.eq.length
    ? state.recommendedProfile.eq
    : fallbackEq;
}

export function buildApoExportFromState(state, fallbackConfig = '') {
  return attachStateAnchor({
    schema: 'cueforge.apo-export.v2',
    version: CUEFORGE_STATE_VERSION,
    config: state?.exports?.apoConfig || fallbackConfig || '',
    eq: recommendedEqFromState(state, []),
    boundary: 'CueForge exports Equalizer APO text for review. It does not silently change Windows drivers, routing, or APO files.'
  }, state, STATE_CONSUMERS.apoExport);
}

export function sanitizeStateForReport(state) {
  if (!isCueForgeStateV2(state)) return null;

  return {
    schema: 'cueforge.state-v2.redacted',
    version: state.version,
    anchor: buildStateAnchor(state, STATE_CONSUMERS.reportLab),
    player: {
      experienceLevel: state.player?.experienceLevel || 'unknown',
      preferredStyle: state.player?.preferredStyle || 'balanced',
      trebleSensitivity: state.player?.trebleSensitivity || 0,
      bassPreference: state.player?.bassPreference || 0,
      comfortPriority: state.player?.comfortPriority || 0,
      competitivePriority: state.player?.competitivePriority || 0
    },
    devices: {
      outputType: state.devices?.outputType || 'unknown',
      inputType: state.devices?.inputType || 'unknown',
      suspectedHardware: state.devices?.suspectedHardware || []
    },
    chain: buildStateAnchor(state, STATE_CONSUMERS.reportLab).chain,
    calibration: {
      channelCheck: Boolean(state.calibration?.channelCheck),
      sweepCheck: Boolean(state.calibration?.sweepCheck),
      micCheck: Boolean(state.calibration?.micCheck),
      hearingModel: Boolean(state.calibration?.hearingModel),
      blindMatch: Boolean(state.calibration?.blindMatch),
      maskingLab: Boolean(state.calibration?.maskingLab)
    },
    selectedGame: state.selectedGame,
    recommendedProfile: state.recommendedProfile,
    readiness: state.readiness,
    exports: {
      hasApoConfig: Boolean(state.exports?.apoConfig),
      hasSetupPack: Boolean(state.exports?.setupPack),
      hasReportPack: Boolean(state.exports?.reportPack),
      hasEngineManifest: Boolean(state.exports?.engineManifest)
    }
  };
}
