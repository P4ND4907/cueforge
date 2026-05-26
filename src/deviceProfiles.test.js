import { describe, expect, it } from 'vitest';
import {
  applyDeviceAliases,
  cleanAudioDeviceName,
  detectActiveGameProfile,
  mergeGameProfiles,
  saveDeviceAlias,
  upsertGameProfile
} from './deviceProfiles.js';

describe('device profile helpers', () => {
  it('cleans noisy numbered audio device names while preserving the useful identity', () => {
    const cleaned = cleanAudioDeviceName({
      kind: 'audiooutput',
      label: '{0.0.0.00000000}.{d6f8a3b1-91d1-4c4f-9a21-33eaa9990001} 2- Headphones (Arctis Nova Pro Wireless Game) [USB\\VID_1038&PID_12E0\\7&31AA]'
    }, { index: 0, role: 'output' });

    expect(cleaned.displayLabel).toBe('Headphones / Arctis Nova Pro Wireless Game');
    expect(cleaned.rawLabel).toContain('VID_1038');
    expect(cleaned.needsAlias).toBe(false);
    expect(cleaned.hints).toEqual(expect.arrayContaining(['headset', 'sonar-or-wireless']));
  });

  it('falls back to a clear role label when the browser hides the real device name', () => {
    const cleaned = cleanAudioDeviceName({ kind: 'audioinput', label: 'Default - 00000000' }, { index: 1, role: 'input' });

    expect(cleaned.displayLabel).toBe('Microphone input 2');
    expect(cleaned.needsAlias).toBe(true);
    expect(cleaned.hints).toContain('needs-friendly-name');
  });

  it('applies editable aliases without losing the cleaned original label', () => {
    const devices = [
      { kind: 'audiooutput', label: 'Speakers (Realtek(R) Audio) #0004' },
      { kind: 'audioinput', label: 'Microphone Array (USB Audio Device) {private-id}' }
    ];
    const firstPass = applyDeviceAliases(devices);
    const aliases = saveDeviceAlias({}, firstPass[0].deviceKey, 'Desk speakers');
    const aliased = applyDeviceAliases(devices, aliases);

    expect(aliased[0]).toMatchObject({
      alias: 'Desk speakers',
      displayLabel: 'Desk speakers',
      cleanedLabel: 'Speakers / Realtek Audio'
    });
    expect(aliased[1].displayLabel).toBe('Microphone Array / USB Audio Device');
  });

  it('matches running games to saved profiles so CueForge can auto-switch safely', () => {
    const saved = mergeGameProfiles([
      upsertGameProfile([], {
        game: 'Valorant / CS2',
        sourceProfile: 'valorant',
        matchHints: ['VALORANT-Win64-Shipping.exe', 'RiotClientServices']
      })[0]
    ]);
    const match = detectActiveGameProfile({
      bridgeReport: {
        runningGames: [{ id: 'valorant', name: 'Valorant', process: 'VALORANT-Win64-Shipping' }]
      },
      savedProfiles: saved
    });

    expect(match).toMatchObject({
      game: 'Valorant / CS2',
      sourceProfile: 'valorant',
      confidence: 95,
      reason: 'running-game'
    });
  });

  it('keeps comma-separated custom game hints editable and matchable', () => {
    const profiles = upsertGameProfile([], {
      game: 'Arena test',
      sourceProfile: 'balanced',
      matchHints: 'arena.exe, practice client'
    });

    expect(profiles[0].matchHints).toEqual(expect.arrayContaining(['arena exe', 'practice client']));

    const match = detectActiveGameProfile({
      processText: 'C:\\Games\\Arena.exe',
      savedProfiles: profiles
    });

    expect(match).toMatchObject({
      game: 'Arena test',
      sourceProfile: 'balanced',
      reason: 'process-hint'
    });
  });
});
