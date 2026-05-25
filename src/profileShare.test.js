import { describe, expect, it } from 'vitest';
import {
  buildAppInviteText,
  buildAudioProfileShareText,
  createAudioProfileShare,
  parseAudioProfileShare
} from './profileShare.js';

describe('profile sharing', () => {
  it('builds a privacy-safe app invite', () => {
    const invite = buildAppInviteText({
      appUrl: 'https://example.test/app',
      releaseUrl: 'https://example.test/download',
      discordUrl: 'https://discord.test'
    });

    expect(invite).toContain('Try CueForge with me.');
    expect(invite).toContain('Open app: https://example.test/app');
    expect(invite).toContain('Release notes: https://example.test/download');
    expect(invite).not.toContain('Download:');
    expect(invite).not.toMatch(/password|token|phone|DOB/i);
  });

  it('round-trips a 10-band shared audio profile from copy text', () => {
    const profile = createAudioProfileShare({
      eq: [-1, 1.5, 0.5, -2, -1, 0.5, 2.5, 3.2, 1.2, -0.5],
      bands: [31, 62, 125, 250, 500, '1k', '2k', '4k', '8k', '16k'],
      selectedGame: 'Tarkov / Siege / COD',
      selectedSourceProfile: 'iemFps',
      sourceProfile: { name: 'Generic IEM FPS' },
      appUrl: 'https://p4nd4907.github.io/cueforge/',
      createdAt: '2026-05-23T00:00:00.000Z'
    });
    const text = buildAudioProfileShareText(profile);
    const parsed = parseAudioProfileShare(text);

    expect(text).toContain('CueForge audio profile');
    expect(parsed.schema).toBe('cueforge.audio-profile.v1');
    expect(parsed.game).toBe('Tarkov / Siege / COD');
    expect(parsed.eq).toHaveLength(10);
    expect(parsed.eq[7]).toBe(3.2);
  });

  it('rejects non-CueForge profile text', () => {
    expect(() => parseAudioProfileShare('just some text')).toThrow('No shared CueForge profile JSON found.');
    expect(() => parseAudioProfileShare(JSON.stringify({ schema: 'other' }))).toThrow('This is not a CueForge audio profile.');
  });
});
