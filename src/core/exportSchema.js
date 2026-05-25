import { attachStateAnchor, buildApoExportFromState, STATE_CONSUMERS } from './stateAdapters.js';

export function buildCueForgeReleasePack({
  state,
  apoConfig = '',
  createdAt = new Date().toISOString()
} = {}) {
  const payload = attachStateAnchor({
    schema: 'cueforge.release-pack.v2',
    version: '0.2.0-alpha.3',
    codename: 'Seamless Engine Foundation',
    createdAt,
    readiness: state?.readiness || null,
    chainGraph: state?.chainGraph || null,
    conflicts: state?.conflicts || null,
    stateV2: state?.stateV2 || null,
    profile: state?.profile || null,
    brain: state?.brain || null,
    engine: state?.engine || null,
    applyPath: state?.applyPath || null,
    files: {
      'cueforge-state-anchor.json': state?.stateV2 ? JSON.stringify(attachStateAnchor({}, state.stateV2, STATE_CONSUMERS.releasePack).stateAnchor, null, 2) : '',
      'cueforge-state-v2.json': state?.stateV2 ? JSON.stringify(state.stateV2, null, 2) : '',
      'cueforge-brain.json': state?.brain ? JSON.stringify(state.brain, null, 2) : '',
      'cueforge-apo-export-v2.json': JSON.stringify(buildApoExportFromState(state?.stateV2, apoConfig), null, 2),
      'cueforge-profile-v2.json': state?.profile ? JSON.stringify(state.profile, null, 2) : '',
      'cueforge-chain-graph.json': state?.chainGraph ? JSON.stringify(state.chainGraph, null, 2) : '',
      'cueforge-readiness.json': state?.readiness ? JSON.stringify(state.readiness, null, 2) : '',
      'equalizer-apo-config.txt': String(apoConfig || '')
    }
  }, state?.stateV2, STATE_CONSUMERS.releasePack);

  return payload;
}

export function summarizeReleasePack(pack) {
  return [
    `${pack.version} / ${pack.codename}`,
    `Readiness: ${pack.readiness?.score ?? 0}% (${pack.readiness?.status || 'unknown'})`,
    `Brain: ${pack.brain?.score ?? 0}% (${pack.brain?.tier || 'not built'})`,
    `State v2: ${pack.stateV2 ? 'included' : 'missing'}`,
    `Profile: ${pack.profile?.recommendation?.label || 'not built'}`,
    `Conflicts: ${pack.conflicts?.summary?.total ?? 0}`,
    `Apply path: ${pack.applyPath?.mode || 'export-only'}`
  ].join('\n');
}
