import { describe, expect, it } from 'vitest';
import {
  buildCommunityDraft,
  buildRedditSafeDraft,
  buildRollCallPrompt,
  buildSetupShareText,
  createCommunityItem,
  summarizeCommunityFeedback
} from './communityHub.js';

describe('community hub', () => {
  it('creates redacted community feedback items', () => {
    const item = createCommunityItem({
      source: 'Discord',
      handle: 'Panda',
      game: 'Siege',
      gear: 'IEM + HyperX',
      choice: 'that',
      type: 'Direction',
      note: 'email me at test@example.com or 907-555-1212'
    });

    expect(item.choice).toBe('that');
    expect(item.note).toContain('[redacted-email]');
    expect(item.note).toContain('[redacted-phone]');
  });

  it('summarizes source and issue signal', () => {
    const items = [
      createCommunityItem({ source: 'Discord', type: 'Direction' }),
      createCommunityItem({ source: 'Discord', type: 'Direction', choice: 'that' }),
      createCommunityItem({ source: 'X', type: 'Mic' })
    ];

    const summary = summarizeCommunityFeedback(items);

    expect(summary.total).toBe(3);
    expect(summary.topSource).toBe('Discord');
    expect(summary.topIssue).toBe('Direction');
    expect(summary.thatVotes).toBe(1);
  });

  it('builds roll call and social drafts from summary', () => {
    const summary = summarizeCommunityFeedback([
      createCommunityItem({ source: 'Reddit', type: 'Game/server issue' })
    ]);

    expect(buildRollCallPrompt({ focus: 'IEMs', game: 'Tarkov', summary })).toContain('Top issue: Game/server issue');
    expect(buildCommunityDraft({ platform: 'Reddit', summary, appUrl: 'https://app.test', discordUrl: 'https://discord.test' })).toContain('keeping links out');
  });

  it('builds Reddit drafts for profile, modmail, and community posts', () => {
    const summary = summarizeCommunityFeedback([createCommunityItem({ source: 'Discord', type: 'Mic' })]);

    expect(buildRedditSafeDraft({ mode: 'profile', summary, appUrl: 'https://app.test', discordUrl: 'https://discord.test' })).toContain('https://app.test');
    expect(buildRedditSafeDraft({ mode: 'modmail', summary, appUrl: 'https://app.test', discordUrl: 'https://discord.test' })).toContain('permission check');
    expect(buildRedditSafeDraft({ mode: 'community', summary, appUrl: 'https://app.test', discordUrl: 'https://discord.test' })).not.toContain('https://app.test');
  });

  it('builds a redacted auto-detected setup share', () => {
    const share = buildSetupShareText({
      devices: [
        { kind: 'audioinput', label: 'HyperX QuadCast deviceid abcdef12345', deviceId: 'secret' },
        { kind: 'audiooutput', label: 'USB DAC' }
      ],
      bridgeReport: {
        soundDevices: [{ Name: 'SteelSeries Sonar Gaming {7d8a58e4-8b4d-48a4-9f6c-222222222222}' }],
        tools: {
          equalizerApo: { installed: true },
          peace: { installed: false },
          steelSeriesSonar: { installed: true }
        }
      }
    });

    expect(share).toContain('HyperX QuadCast');
    expect(share).toContain('Equalizer APO: detected');
    expect(share).toContain('[redacted-id]');
    expect(share).not.toContain('secret');
  });
});
