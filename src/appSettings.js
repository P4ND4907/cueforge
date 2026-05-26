export const USER_SETTINGS_KEY = 'cueforge-user-settings';

export const DEFAULT_USER_SETTINGS = Object.freeze({
  interfaceMode: 'simple',
  quietMode: true,
  backgroundAudio: false,
  cinematicVideoAudio: false,
  uiNotesEnabled: true,
  desktopBridgeHints: true
});

export function normalizeUserSettings(input = {}) {
  const source = input && typeof input === 'object' ? input : {};

  return {
    interfaceMode: source.interfaceMode === 'expert' ? 'expert' : 'simple',
    quietMode: source.quietMode !== false,
    backgroundAudio: Boolean(source.backgroundAudio),
    cinematicVideoAudio: Boolean(source.cinematicVideoAudio),
    uiNotesEnabled: source.uiNotesEnabled !== false,
    desktopBridgeHints: source.desktopBridgeHints !== false
  };
}

export function isExpertMode(settings = {}) {
  return normalizeUserSettings(settings).interfaceMode === 'expert';
}

export function canPlayBackgroundAudio(settings = {}) {
  const normalized = normalizeUserSettings(settings);
  return !normalized.quietMode && normalized.backgroundAudio;
}

export function canPlayCinematicVideoAudio(settings = {}) {
  const normalized = normalizeUserSettings(settings);
  return !normalized.quietMode && normalized.cinematicVideoAudio;
}

export function buildAudioPolicySummary(settings = {}) {
  const normalized = normalizeUserSettings(settings);

  if (normalized.quietMode) {
    return 'Quiet mode is on. CueForge blocks background and cinematic audio; mic and headphone checks still require a click.';
  }

  if (!normalized.backgroundAudio && !normalized.cinematicVideoAudio) {
    return 'Quiet mode is off, but background and cinematic audio are still disabled.';
  }

  const enabled = [
    normalized.backgroundAudio ? 'background soundwalks' : '',
    normalized.cinematicVideoAudio ? 'cinematic video audio' : ''
  ].filter(Boolean);

  return `Enabled: ${enabled.join(' and ')}. Test tones and mic feedback still only start from explicit controls.`;
}

export function readUserSettingsFromStorage(storage = globalThis.localStorage) {
  try {
    if (!storage?.getItem) return normalizeUserSettings();
    return normalizeUserSettings(JSON.parse(storage.getItem(USER_SETTINGS_KEY) || 'null'));
  } catch {
    return normalizeUserSettings();
  }
}
