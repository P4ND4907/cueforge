import { describe, expect, it } from 'vitest';
import { buildCommunityDraft, buildRollCallPrompt, createCommunityItem, summarizeCommunityFeedback } from './communityHub.js';

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
    expect(buildCommunityDraft({ platform: 'Reddit', summary, appUrl: 'https://app.test', discordUrl: 'https://discord.test' })).toContain('Discord hub');
  });
});
