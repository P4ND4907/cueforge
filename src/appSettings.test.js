import { describe, expect, it } from 'vitest';
import {
  buildAudioPolicySummary,
  canPlayBackgroundAudio,
  canPlayCinematicVideoAudio,
  isExpertMode,
  normalizeUserSettings,
  readUserSettingsFromStorage,
  USER_SETTINGS_KEY
} from './appSettings.js';

describe('app settings', () => {
  it('starts quiet by default', () => {
    const settings = normalizeUserSettings();

    expect(settings.interfaceMode).toBe('simple');
    expect(isExpertMode(settings)).toBe(false);
    expect(settings.quietMode).toBe(true);
    expect(canPlayBackgroundAudio(settings)).toBe(false);
    expect(canPlayCinematicVideoAudio(settings)).toBe(false);
    expect(buildAudioPolicySummary(settings)).toMatch(/Quiet mode is on/i);
  });

  it('allows raw tools only in expert mode', () => {
    expect(isExpertMode({ interfaceMode: 'simple' })).toBe(false);
    expect(isExpertMode({ interfaceMode: 'expert' })).toBe(true);
    expect(normalizeUserSettings({ interfaceMode: 'weird' }).interfaceMode).toBe('simple');
  });

  it('requires quiet mode off before background audio can play', () => {
    expect(canPlayBackgroundAudio({ quietMode: true, backgroundAudio: true })).toBe(false);
    expect(canPlayBackgroundAudio({ quietMode: false, backgroundAudio: true })).toBe(true);
    expect(canPlayCinematicVideoAudio({ quietMode: false, cinematicVideoAudio: true })).toBe(true);
  });

  it('recovers from bad stored settings', () => {
    const storage = {
      getItem: (key) => (key === USER_SETTINGS_KEY ? '{bad json' : null)
    };

    expect(readUserSettingsFromStorage(storage)).toEqual(normalizeUserSettings());
  });
});
