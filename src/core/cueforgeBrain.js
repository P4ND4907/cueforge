import { nextNativeEngineMilestone } from '../data/nativeEngineRoadmap.js';

const DIFFERENTIATOR_ID = 'audio-chain-verifier-personal-sound-engine';

export const cueforgeDifferentiator = {
  id: DIFFERENTIATOR_ID,
  label: 'Audio chain verifier + personal sound engine',
  promise: 'CueForge proves what the player setup is doing, learns what the player prefers, warns when other audio apps are fighting the chain, maps each game to an audio intent, exports safely, keeps evidence local, and prepares the native engine path.',
  boundary: 'CueForge improves the final audio chain. It does not silently change Windows settings, install drivers, read game memory, or claim exact enemy positions from a mixed stereo output.',
  pillars: [
    'chain-verifier',
    'personal-sound-engine',
    'conflict-doctor',
    'game-intent',
    'safe-export-apply',
    'local-evidence',
    'native-ready-brain'
  ]
};

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function list(value) {
  return Array.isArray(value) ? value : [];
}

function text(value, fallback = '') {
  return String(value || fallback).replace(/\s+/g, ' ').trim();
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean).map((value) => text(value)).filter(Boolean))];
}

function complete(value) {
  const answered = Number(value?.score?.answered ?? value?.answered ?? 0);
  return Boolean(value?.complete || value?.score?.complete || value?.ready || value?.passed || answered >= 4);
}

function statusForScore(score, blocked = false) {
  if (blocked) return 'blocked';
  if (score >= 85) return 'proven';
  if (score >= 65) return 'ready';
  if (score >= 45) return 'partial';
  return 'needs-proof';
}

function tierForScore(score) {
  if (score >= 85) return 'native-ready-brain';
  if (score >= 72) return 'personal-engine-ready';
  if (score >= 58) return 'verifier-ready';
  return 'needs-foundation';
}

function sourceState(source = {}) {
  return source.stateV2 || source.cueforgeState || source;
}

function releaseFiles(releasePack = {}) {
  return Object.keys(releasePack.files || {});
}

function firstWarning(source = {}) {
  return (
    source.conflicts?.chainHealth?.warnings?.[0] ||
    source.conflicts?.conflicts?.[0]?.title ||
    source.readiness?.warnings?.[0] ||
    'No major warning yet.'
  );
}

function buildPillar(id, label, score, proof = [], nextAction = 'Keep testing with one real player setup.', blocked = false) {
  const clamped = clamp(score);
  return {
    id,
    label,
    score: clamped,
    status: statusForScore(clamped, blocked),
    proof: unique(proof).slice(0, 4),
    nextAction
  };
}

function chainVerifierPillar(source, state) {
  const summary = source.chainGraph?.summary || {};
  const chainHealth = source.conflicts?.chainHealth || {};
  const report = source.autoDetectReport || {};
  let score = 12;

  if (summary.outputs || state.devices?.output) score += 18;
  if (summary.inputs || state.devices?.input) score += 14;
  if (summary.desktopBridge || report.source?.includes('desktop')) score += 22;
  if (summary.companions || state.chain?.activeCompanions?.length) score += 14;
  if (summary.applyTargets || state.chain?.apoDetected || state.chain?.peaceDetected) score += 10;
  score += Math.round((Number(chainHealth.score || 0) / 100) * 20);

  return buildPillar(
    'chain-verifier',
    'Proves the real audio chain',
    score,
    [
      summary.desktopBridge ? 'Desktop bridge data is loaded.' : 'Browser scan is available; desktop proof is still stronger.',
      `${summary.outputs || (state.devices?.output ? 1 : 0)} output path(s), ${summary.inputs || (state.devices?.input ? 1 : 0)} input path(s).`,
      summary.companions ? `${summary.companions} companion layer(s) detected.` : null,
      chainHealth.score ? `Audio Chain Health: ${chainHealth.score}/100.` : null
    ],
    summary.desktopBridge ? 'Run one before/after match check.' : 'Run or import the desktop bridge scan.'
  );
}

function personalSoundPillar(source, state) {
  const calibration = state.calibration || {};
  const labInputs = calibration.labInputs || {};
  const labReadiness = labInputs.readiness || {};
  const labInfluence = labInputs.influence || {};
  const preference = calibration.preferenceModel || calibration.blindMatch?.preferenceModel;
  const profile = source.profile?.recommendation || state.recommendedProfile;
  let score = 10;

  if (profile?.id) score += 22;
  if (complete(calibration.hearingModel)) score += 20;
  if (complete(calibration.blindMatch) || Number(preference?.roundsCompleted || 0) > 0) score += 20;
  if (complete(calibration.maskingLab)) score += 14;
  if (labReadiness.ready) score += 8;
  if (Number(labInfluence.total || 0) >= 0.35) score += 6;
  if (Number(source.profile?.confidence || state.recommendedProfile?.confidence || 0) >= 70) score += 14;
  const personalNextAction = labReadiness.nextActions?.[0] ||
    (complete(calibration.hearingModel) && (complete(calibration.blindMatch) || Number(preference?.roundsCompleted || 0) > 0)
      ? 'Run Player Trial to prove the profile in a match.'
      : 'Complete Hearing Model and Sound Match.');

  return buildPillar(
    'personal-sound-engine',
    'Learns the player sound identity',
    score,
    [
      profile?.label || profile?.id ? `Profile: ${profile.label || profile.id}.` : null,
      complete(calibration.hearingModel) ? 'Hearing model proof is present.' : 'Hearing model is not complete yet.',
      labInputs.schema ? 'Preference and personalization labs are formal inputs, not side panels.' : null,
      labInputs.claimBoundary?.notMedical ? 'Hearing layer stays self-calibration only, not medical.' : null,
      Number(preference?.roundsCompleted || 0) ? `${preference.roundsCompleted} preference round(s) saved.` : null,
      source.profile?.identity?.length ? `Identity: ${source.profile.identity.slice(0, 3).join(', ')}.` : null
    ],
    personalNextAction
  );
}

function conflictDoctorPillar(source) {
  const summary = source.conflicts?.summary || {};
  const chainHealth = source.conflicts?.chainHealth || {};
  const doctor = source.conflicts?.audioDoctor || {};
  const score = chainHealth.score ?? Math.max(0, 100 - Number(summary.high || 0) * 26 - Number(summary.medium || 0) * 12);
  const blocked = Number(summary.high || 0) > 0;

  return buildPillar(
    'conflict-doctor',
    'Warns when apps fight each other',
    score,
    [
      doctor.headline || firstWarning(source),
      summary.total ? `${summary.high || 0} high / ${summary.medium || 0} medium conflict(s).` : 'No conflict report yet.',
      chainHealth.nextAction ? `Next: ${chainHealth.nextAction}` : null
    ],
    chainHealth.nextAction || 'Open Conflict Fix Panel.',
    blocked
  );
}

function gameIntentPillar(source, state) {
  const profile = source.profile?.recommendation || {};
  const selectedGame = state.selectedGame || {};
  let score = 20;

  if (profile.id || state.recommendedProfile?.id) score += 35;
  if (profile.intent || selectedGame.intent) score += 20;
  if (profile.genreProfileId || selectedGame.profileId) score += 15;
  if (profile.explanation || list(state.recommendedProfile?.reason).length) score += 10;

  return buildPillar(
    'game-intent',
    'Maps games to audio intent',
    score,
    [
      `Intent: ${profile.intent || selectedGame.intent || 'balanced'}.`,
      profile.genreProfileId ? `Genre profile: ${profile.genreProfileId}.` : null,
      profile.game || selectedGame.title ? `Game: ${profile.game || selectedGame.title}.` : null
    ],
    'Pick the game or genre before exporting the final profile.'
  );
}

function safeExportPillar(source, state) {
  const files = releaseFiles(source.releasePack);
  const hasExport = Boolean(state.exports?.apoConfig || state.exports?.engineManifest || files.length);
  const explicit = source.applyPath?.explicit === true;
  const boundary = text(source.engine?.boundary || '');
  let score = 18;

  if (hasExport) score += 30;
  if (explicit) score += 20;
  if (/does not silently change/i.test(boundary)) score += 18;
  if (source.applyPath?.mode) score += 14;

  return buildPillar(
    'safe-export-apply',
    'Exports safely before applying',
    score,
    [
      source.applyPath?.mode ? `Apply mode: ${source.applyPath.mode}.` : null,
      explicit ? 'Apply path requires an explicit user action.' : null,
      files.length ? `Release pack files: ${files.slice(0, 3).join(', ')}.` : null,
      boundary || null
    ],
    hasExport ? 'Review the export pack before using it in another tool.' : 'Generate the export pack.'
  );
}

function localEvidencePillar(source, state) {
  const readinessProof = source.readiness?.proof || {};
  const files = releaseFiles(source.releasePack);
  let score = 18;

  if (files.length) score += 22;
  if (readinessProof.selfTestReady) score += 18;
  if (readinessProof.matchProofReady) score += 20;
  if (state.exports?.reportPack || source.releasePack) score += 12;
  if (source.releasePack?.privacy?.rawAudio === false || source.releasePack?.privacy?.localFirst !== false) score += 10;

  return buildPillar(
    'local-evidence',
    'Keeps proof local and shareable',
    score,
    [
      readinessProof.selfTestReady ? 'Self-test proof is present.' : 'Self-test proof still needed.',
      readinessProof.matchProofReady ? 'Before/after match proof is present.' : 'Real match proof still needed.',
      files.length ? `${files.length} exportable file(s) in the release pack.` : null,
      'Reports should stay redacted before sharing.'
    ],
    readinessProof.matchProofReady ? 'Use the report pack to reproduce issues.' : 'Run Beta Check-in before and after one match.'
  );
}

function nativeReadyPillar(source, state) {
  const next = nextNativeEngineMilestone(state.version || '0.2.0-alpha.3');
  const hasManifest = Boolean(source.engine?.schema || state.exports?.engineManifest);
  const hasAnchor = Boolean(source.engine?.stateAnchor);
  let score = 15;

  if (hasManifest) score += 35;
  if (hasAnchor) score += 18;
  if (source.engine?.prototypeBackend?.firstPrototype === 'miniaudio') score += 14;
  if (next?.version === 'v0.3.0') score += 18;

  return buildPillar(
    'native-ready-brain',
    'Prepares the native engine later',
    score,
    [
      hasManifest ? 'Native engine manifest is generated from state.' : 'Native manifest is not generated yet.',
      hasAnchor ? 'State anchor is attached for native consumers.' : null,
      next ? `Next native move: ${next.version} ${next.codename}.` : null,
      'Native work stays manifest-first before system integration.'
    ],
    next ? `Build ${next.codename} proof gates before any system-wide engine.` : 'Keep native work behind proof gates.'
  );
}

export function buildCueForgeBrain(source = {}) {
  const state = sourceState(source);
  const pillars = [
    chainVerifierPillar(source, state),
    personalSoundPillar(source, state),
    conflictDoctorPillar(source, state),
    gameIntentPillar(source, state),
    safeExportPillar(source, state),
    localEvidencePillar(source, state),
    nativeReadyPillar(source, state)
  ];
  const score = Math.round(pillars.reduce((sum, pillar) => sum + pillar.score, 0) / pillars.length);
  const blocked = pillars.some((pillar) => pillar.status === 'blocked');
  const topProof = pillars
    .filter((pillar) => pillar.score >= 65)
    .flatMap((pillar) => pillar.proof.slice(0, 1))
    .slice(0, 6);
  const nextActions = unique([
    ...pillars.filter((pillar) => pillar.score < 75 || pillar.status === 'blocked').map((pillar) => pillar.nextAction),
    source.readiness?.nextActions?.[0],
    source.conflicts?.chainHealth?.nextAction
  ]).slice(0, 5);

  return {
    schema: 'cueforge.brain.v1',
    differentiator: cueforgeDifferentiator.id,
    label: cueforgeDifferentiator.label,
    promise: cueforgeDifferentiator.promise,
    boundary: cueforgeDifferentiator.boundary,
    score,
    tier: blocked ? 'needs-foundation' : tierForScore(score),
    pillars,
    topProof,
    nextActions,
    competitorContrast: [
      'Not just EQ preset packs.',
      'Not a magic enemy-location claim.',
      'Not a hidden driver or routing changer.',
      'Not cloud personalization by default.',
      'Built around proof, preference, game intent, safe export, and local evidence.'
    ]
  };
}

export function summarizeCueForgeBrain(brain = {}) {
  const pillars = list(brain.pillars);
  return {
    title: brain.label || cueforgeDifferentiator.label,
    score: Number(brain.score || 0),
    tier: brain.tier || 'needs-foundation',
    proof: list(brain.topProof).length ? brain.topProof : pillars.flatMap((pillar) => pillar.proof || []).slice(0, 4),
    nextActions: list(brain.nextActions).length ? brain.nextActions : ['Run Auto Detect, then one real match proof.'],
    contrast: list(brain.competitorContrast).length ? brain.competitorContrast : cueforgeDifferentiator.pillars
  };
}
