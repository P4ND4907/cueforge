import { attachStateAnchor, recommendedEqFromState, STATE_CONSUMERS } from './core/stateAdapters.js';

export function createAudioProfileShare({
  eq = [],
  bands = [],
  selectedGame = '',
  selectedSourceProfile = '',
  sourceProfile = {},
  appUrl = '',
  releaseUrl = '',
  createdAt = new Date().toISOString(),
  cueforgeState = null
} = {}) {
  const stateEq = recommendedEqFromState(cueforgeState, eq);
  const game = cueforgeState?.selectedGame?.title || selectedGame;
  const profileId = cueforgeState?.selectedGame?.profileId || selectedSourceProfile;

  return attachStateAnchor({
    schema: 'cueforge.audio-profile.v1',
    createdAt,
    appUrl,
    releaseUrl,
    game,
    sourceProfileId: profileId,
    sourceProfileName: sourceProfile?.name || profileId || 'Custom CueForge profile',
    eq: stateEq.map((gain, index) => ({
      band: bands[index] ?? index,
      gainDb: Number(Number(gain).toFixed(2))
    })),
    note: 'Shared from CueForge. Review before applying; this does not change Windows drivers or routing by itself.'
  }, cueforgeState, STATE_CONSUMERS.profileRecommendation);
}

export function buildAppInviteText({ appUrl = '', releaseUrl = '', discordUrl = '' } = {}) {
  return [
    'Try CueForge with me.',
    '',
    'It is a local-first FPS audio tool for setup checks, mic testing, EQ profiles, and real match feedback.',
    appUrl ? `Open app: ${appUrl}` : '',
    releaseUrl ? `Release notes: ${releaseUrl}` : '',
    discordUrl ? `Discord: ${discordUrl}` : '',
    '',
    'Run Auto Setup, Auto Tune, then one real match. If it gets worse, send that too.'
  ].filter(Boolean).join('\n');
}

export function buildAudioProfileShareText(profile) {
  return [
    'CueForge audio profile',
    `Game: ${profile.game || 'Not set'}`,
    `Target: ${profile.sourceProfileName || profile.sourceProfileId || 'Custom'}`,
    profile.appUrl ? `Open app: ${profile.appUrl}` : '',
    '',
    'Paste this JSON into CueForge Share/Profile import:',
    JSON.stringify(profile, null, 2)
  ].filter(Boolean).join('\n');
}

export function parseAudioProfileShare(text = '') {
  const trimmed = String(text || '').trim();
  const jsonStart = trimmed.indexOf('{');
  const jsonEnd = trimmed.lastIndexOf('}');
  if (jsonStart < 0 || jsonEnd <= jsonStart) {
    throw new Error('No shared CueForge profile JSON found.');
  }

  const payload = JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1));
  if (payload.schema !== 'cueforge.audio-profile.v1') {
    throw new Error('This is not a CueForge audio profile.');
  }
  if (!Array.isArray(payload.eq) || payload.eq.length !== 10) {
    throw new Error('CueForge profile needs exactly 10 EQ bands.');
  }

  return {
    ...payload,
    eq: payload.eq.map((band) => Number(band.gainDb))
  };
}
