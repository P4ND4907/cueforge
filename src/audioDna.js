import { attachStateAnchor, recommendedEqFromState, STATE_CONSUMERS } from './core/stateAdapters.js';

export function createAudioDna({ eq, hearingScore, micProfile, gameFocus, deviceStatus, cueforgeState = null }) {
  const safeEq = Array.isArray(eq) && eq.length ? eq : Array(10).fill(0);
  const avgGain = safeEq.reduce((sum, gain) => sum + gain, 0) / safeEq.length;
  const cueLift = (safeEq[6] + safeEq[7]) / 2;
  const lowWeight = (safeEq[0] + safeEq[1] + safeEq[2]) / 3;
  const trebleRisk = Math.max(safeEq[8], safeEq[9]);
  const identity = [
    cueLift > 2 ? 'Tactical Cue Hunter' : 'Balanced Listener',
    lowWeight < -0.5 ? 'Low-Bloom Control' : 'Full-Body Output',
    trebleRisk < 0 ? 'Treble-Safe' : 'Air-Forward',
    micProfile === 'hyperx' ? 'HyperX Voice Chain' : 'Generic Mic Chain'
  ];

  const confidence = Math.max(
    35,
    Math.min(
      98,
      52 +
        (hearingScore?.complete ? 16 : 4) +
        (deviceStatus?.bridgeLoaded ? 12 : 0) +
        (deviceStatus?.apoFound ? 10 : 0) +
        Math.round(Math.abs(cueLift - avgGain) * 3)
    )
  );

  return attachStateAnchor({
    id: identity.join(' / '),
    confidence,
    traits: identity,
    gameFocus,
    snapshot: {
      eq: safeEq,
      averageGain: Number(avgGain.toFixed(2)),
      cueLift: Number(cueLift.toFixed(2)),
      lowWeight: Number(lowWeight.toFixed(2)),
      trebleRisk: Number(trebleRisk.toFixed(2)),
      hearingComplete: Boolean(hearingScore?.complete),
      bridgeLoaded: Boolean(deviceStatus?.bridgeLoaded),
      apoFound: Boolean(deviceStatus?.apoFound)
    },
    recommendations: buildRecommendations({ cueLift, lowWeight, trebleRisk, hearingScore, deviceStatus })
  }, cueforgeState, STATE_CONSUMERS.audioDna);
}

export function createAudioDnaFromState(state, overrides = {}) {
  const eq = recommendedEqFromState(state, overrides.eq || []);
  const hearingProfile = state?.calibration?.hearingModel;
  const hearingScore = overrides.hearingScore || hearingProfile?.score || {
    complete: Boolean(hearingProfile),
    answered: Boolean(hearingProfile) ? 1 : 0,
    total: 12
  };
  const inputLabel = String(state?.devices?.input || '').toLowerCase();
  const micProfile = overrides.micProfile || (inputLabel.includes('hyperx') ? 'hyperx' : 'generic');
  const deviceStatus = {
    bridgeLoaded: Boolean(state?.chain?.activeCompanions?.length || state?.chain?.apoDetected),
    apoFound: Boolean(state?.chain?.apoDetected),
    ...(overrides.deviceStatus || {})
  };

  return createAudioDna({
    eq,
    hearingScore,
    micProfile,
    gameFocus: overrides.gameFocus || state?.selectedGame?.title || 'Tarkov / Siege / COD',
    deviceStatus,
    cueforgeState: state
  });
}

function buildRecommendations({ cueLift, lowWeight, trebleRisk, hearingScore, deviceStatus }) {
  const recommendations = [];

  if (cueLift < 1.8) recommendations.push('Raise footstep focus or 2k/4k bands before competitive FPS.');
  if (cueLift > 3.5) recommendations.push('Footstep lift is aggressive. Test for shouty voices or fatigue.');
  if (lowWeight > 0) recommendations.push('Low-end is warm. Reduce 31-125Hz if explosions mask steps.');
  if (trebleRisk > 1.5) recommendations.push('Treble may become sharp on IEMs. Run the hearing model before long sessions.');
  if (!hearingScore?.complete) recommendations.push('Finish the left/right hearing model to personalize this DNA.');
  if (!deviceStatus?.bridgeLoaded) recommendations.push('Load the Windows bridge report to improve device confidence.');
  if (!deviceStatus?.apoFound) recommendations.push('Install or configure Equalizer APO before expecting system-wide EQ.');
  if (recommendations.length === 0) recommendations.push('Profile is ready for a controlled game test. Save it and compare after one match.');

  return recommendations;
}
