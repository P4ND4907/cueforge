import { describe, expect, it } from 'vitest';
import {
  buildCommunityMemoryMarkdown,
  buildCommunityPlan,
  buildNextReply,
  buildRedditThreadJsonUrl,
  createThreadMemory,
  defaultCommunityWatchlist,
  parseRedditSnapshot,
  scoreCommunity,
  summarizeThreads,
  threadFromRedditJson
} from './socialMemory.js';

describe('social memory', () => {
  it('scores high-flow communities while marking no-assisted-posting communities as read-only', () => {
    const plan = buildCommunityPlan(defaultCommunityWatchlist);
    const iems = plan.find((community) => community.name === 'r/iems');

    expect(plan[0].score).toBeGreaterThan(30);
    expect(iems.status).toBe('read-only');
  });

  it('creates thread memory with a useful no-link reply draft', () => {
    const thread = createThreadMemory({
      community: 'buildapc',
      title: 'Are gaming sound cards actually a thing anymore?',
      url: 'https://www.reddit.com/r/buildapc/comments/abc/are_gaming_sound_cards_actually_a_thing_anymore/',
      snapshot: '517 votes 291 comments I mostly play Counter-Strike 2 and care about footsteps with IEMs.'
    });

    expect(thread.community).toBe('r/buildapc');
    expect(thread.tags).toContain('sound-card');
    expect(thread.nextReply).toContain('do not stack every spatializer');
    expect(thread.engagementScore).toBeGreaterThan(40);
  });

  it('parses a copied Reddit snapshot and redacts private contact data', () => {
    const parsed = parseRedditSnapshot(
      'Best Gaming IEM for Warzone r/iems 0 votes 4 comments u/Misterkhb email test@example.com',
      'https://www.reddit.com/r/iems/comments/123/best_gaming_iem_for_warzone/'
    );
    const thread = createThreadMemory({
      url: 'https://www.reddit.com/r/iems/comments/123/best_gaming_iem_for_warzone/',
      snapshot: 'Call me at 907-555-1212 about Warzone footsteps',
      ...parsed
    });

    expect(parsed.community).toBe('r/iems');
    expect(parsed.comments).toBe(4);
    expect(thread.snapshot).toContain('[redacted-phone]');
  });

  it('builds public Reddit JSON URLs and normalizes public payloads', () => {
    const url = 'https://www.reddit.com/r/buildapc/comments/1tjgc1a/are_gaming_sound_cards_actually_a_thing_anymore/';
    const jsonUrl = buildRedditThreadJsonUrl(url);
    const thread = threadFromRedditJson([
      {
        data: {
          children: [
            {
              data: {
                subreddit_name_prefixed: 'r/buildapc',
                title: 'Are gaming sound cards actually a thing anymore?',
                author: 'tester',
                score: 517,
                num_comments: 291,
                permalink: '/r/buildapc/comments/1tjgc1a/are_gaming_sound_cards_actually_a_thing_anymore/',
                selftext: 'I play CS2 and care about footsteps.'
              }
            }
          ]
        }
      }
    ], url);

    expect(jsonUrl).toContain('.json');
    expect(thread.author).toBe('u/tester');
    expect(thread.nextReply).toContain('Fair test');
  });

  it('summarizes threads and exports a GitHub-readable memory file', () => {
    const threads = [
      createThreadMemory({ community: 'r/buildapc', title: 'Sound cards', snapshot: '291 comments DAC footsteps' })
    ];
    const summary = summarizeThreads(threads);
    const markdown = buildCommunityMemoryMarkdown({ threads });

    expect(summary.status).toBe('reply-ready');
    expect(markdown).toContain('CueForge Community Memory');
    expect(markdown).toContain('Next reply draft');
  });

  it('keeps advice generic when no specific audio topic is detected', () => {
    expect(buildNextReply({ title: 'How do you test changes?' })).toContain('Same game');
    expect(scoreCommunity({ members: 1000000, weeklyVisitors: 50000, weeklyContributions: 2000, risk: 'low' })).toBeGreaterThan(40);
  });
});
