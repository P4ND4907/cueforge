import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createThreadMemory } from '../src/socialMemory.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const watchlistPath = path.join(rootDir, 'docs', 'social', 'community-watchlist.json');
const memoryPath = path.join(rootDir, 'docs', 'social', 'COMMUNITY_MEMORY.md');
const now = new Date();
const userAgent = 'CueForgeCommunityMemory/0.1 by P4ND4907 (public reddit json; no private scraping)';

const watchlist = JSON.parse(await readFile(watchlistPath, 'utf8'));
const communities = [];

for (const community of watchlist.communities || []) {
  communities.push(await refreshCommunity(community));
}

const refreshed = {
  ...watchlist,
  updatedAt: now.toISOString(),
  communities
};

await writeFile(watchlistPath, `${JSON.stringify(refreshed, null, 2)}\n`);
await writeFile(memoryPath, buildMemoryMarkdown(refreshed));

console.log(`Updated ${path.relative(rootDir, watchlistPath)}`);
console.log(`Updated ${path.relative(rootDir, memoryPath)}`);

async function refreshCommunity(community) {
  const name = String(community.name || '').replace(/^r\//i, '');
  const observed = {
    fetchedAt: now.toISOString(),
    source: 'reddit-public-json',
    status: 'pending'
  };

  const [aboutResult, hotResult] = await Promise.allSettled([
    fetchJson(`https://www.reddit.com/r/${name}/about.json`),
    fetchJson(`https://www.reddit.com/r/${name}/hot.json?limit=8&raw_json=1`)
  ]);

  if (aboutResult.status === 'fulfilled') {
    const data = aboutResult.value?.data || {};
    observed.subscribers = numberOrNull(data.subscribers);
    observed.activeUsers = numberOrNull(data.active_user_count);
    observed.title = data.title || community.name;
    observed.publicDescription = cleanText(data.public_description || '', 220);
  } else {
    observed.aboutError = aboutResult.reason?.message || 'about fetch failed';
  }

  if (hotResult.status === 'fulfilled') {
    const posts = (hotResult.value?.data?.children || [])
      .map((child) => child.data)
      .filter(Boolean)
      .filter((post) => !post.stickied)
      .slice(0, 5)
      .map((post) => ({
        title: cleanText(post.title, 140),
        url: `https://www.reddit.com${post.permalink || ''}`,
        score: numberOrNull(post.score),
        comments: numberOrNull(post.num_comments),
        createdUtc: numberOrNull(post.created_utc)
      }));

    observed.hotPostsChecked = posts.length;
    observed.hotCommentVolume = posts.reduce((sum, post) => sum + (post.comments || 0), 0);
    observed.topHotThreads = posts;
  } else {
    observed.hotError = hotResult.reason?.message || 'hot fetch failed';
  }

  observed.status = observed.subscribers || observed.hotPostsChecked ? 'ok' : 'unavailable';

  return {
    ...community,
    engagement: classifyEngagement(observed),
    observed
  };
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      'user-agent': userAgent
    }
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return response.json();
}

function buildMemoryMarkdown(data) {
  const lines = [
    '# CueForge Community Memory',
    '',
    `Last updated: ${now.toISOString()}`,
    '',
    'This is the GitHub-side memory for public outreach. It uses public community/thread data only; no account cookies, private messages, or personal data are collected.',
    '',
    '## Rules',
    '',
    '- Build karma with useful comments and replies before any new launch posts.',
    '- Prefer high-engagement, relevant communities over random posting.',
    '- Save the thread before replying.',
    '- Do not repost filtered or removed content.',
    '- Do not drop links unless the community rules clearly allow it or someone asks.',
    '- Do not use assisted comments in communities that visibly prohibit them.',
    '- Never claim personal testing experience that did not happen.',
    '',
    '## Current Diagnosis',
    '',
    'Reddit filtered the early tester posts in `r/alphaandbetausers`, `r/betatests`, and `r/SideProject`. Treat that as an account-trust signal. The safe path is profile completion, useful no-link comments, and slow follow-up after people reply. Do not create new subreddit posts right now.',
    '',
    '## High-Engagement Watchlist',
    '',
    '| Community | Members | Active Now | Hot Comments | Mode | Fit | Next move |',
    '| --- | ---: | ---: | ---: | --- | --- | --- |',
    ...(data.communities || []).map((community) => {
      const observed = community.observed || {};
      return [
        `| ${community.name}`,
        formatNumber(observed.subscribers),
        formatNumber(observed.activeUsers),
        formatNumber(observed.hotCommentVolume),
        community.risk === 'manual-only' ? 'manual/read-only' : community.engagement || 'watch',
        escapePipes(community.fit || community.lane || ''),
        `${escapePipes(community.nextMove || '')} |`
      ].join(' | ');
    }),
    '',
    '## Active Thread Queue',
    ''
  ];

  if (!data.threads?.length) {
    lines.push('No saved threads yet. Save one active discussion before commenting.', '');
  } else {
    data.threads.forEach((thread, index) => {
      const memory = createThreadMemory({
        community: thread.community,
        title: thread.title,
        url: thread.url,
        status: thread.status || 'watching',
        tags: thread.tags || [],
        snapshot: `${thread.title || ''} ${(thread.tags || []).join(' ')} ${thread.nextMove || ''}`
      });
      lines.push(
        `### ${index + 1}. ${memory.community} - ${memory.title}`,
        '',
        `URL: ${memory.url || thread.url || 'not saved'}`,
        `Status: ${thread.status || memory.status}`,
        `Tags: ${memory.tags.join(', ') || 'none'}`,
        `Next move: ${normalizeReplyMove(thread.nextMove)}`,
        '',
        'Suggested reply shape:',
        '',
        '```text',
        memory.nextReply,
        '```',
        ''
      );
    });
  }

  lines.push(
    '## Conversation Flow',
    '',
    '1. Pick one priority community where the thread is directly about audio, routing, EQ, mic quality, footsteps, or setup problems.',
    '2. Save the URL, title, and copied public context in CueForge Community Hub -> Thread Memory.',
    '3. Use the generated reply as a starting point, then make it sound like the owner actually read the thread.',
    '4. Leave the app link out unless somebody asks for the tool.',
    '5. Mark the thread as `commented`, `needs-followup`, or `filtered` so the next reply queue stays honest.',
    ''
  );

  return `${lines.join('\n')}\n`;
}

function classifyEngagement(observed) {
  const subscribers = observed.subscribers || 0;
  const activeUsers = observed.activeUsers || 0;
  const hotComments = observed.hotCommentVolume || 0;
  const score =
    Math.log10(Math.max(subscribers, 1)) * 14 +
    Math.log10(Math.max(activeUsers, 1)) * 11 +
    Math.log10(Math.max(hotComments, 1)) * 18;

  if (score >= 150) return 'very high';
  if (score >= 115) return 'high';
  if (score >= 75) return 'medium';
  return 'low';
}

function cleanText(value, limit = 500) {
  return String(value || '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, limit);
}

function numberOrNull(value) {
  if (value == null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatNumber(value) {
  if (value == null) return 'unknown';
  return new Intl.NumberFormat('en-US').format(value);
}

function escapePipes(value) {
  return String(value || '').replace(/\|/g, '/');
}

function normalizeReplyMove(value = '') {
  const fallback = 'Watch replies, then write one helpful no-link answer.';
  return String(value || fallback)
    .replace(/^Post one/i, 'Reply with one')
    .replace(/\bpost\b/gi, 'reply')
    .replace(/\bposting\b/gi, 'replying');
}
