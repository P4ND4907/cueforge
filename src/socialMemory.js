export const defaultCommunityWatchlist = [
  {
    name: 'r/buildapc',
    url: 'https://www.reddit.com/r/buildapc/',
    lane: 'PC hardware / audio routing',
    audience: 'PC builders, streamers, players asking DAC, headset, mic, and routing questions',
    membersText: 'large',
    weeklyVisitorsText: 'high',
    weeklyContributionsText: 'high',
    rulesFit: 'helpful comments only',
    risk: 'medium',
    nextMove: 'Answer active hardware/audio questions without links. Mention CueForge only if someone asks what tool you are building.'
  },
  {
    name: 'r/pcgaming',
    url: 'https://www.reddit.com/r/pcgaming/',
    lane: 'PC gaming discussion',
    audience: 'High-flow PC players and game-audio debates',
    membersText: 'large',
    weeklyVisitorsText: 'very high',
    weeklyContributionsText: 'high',
    rulesFit: 'discussion first',
    risk: 'high',
    nextMove: 'Read and comment on game-audio threads. Do not post app links without a clear allowed thread.'
  },
  {
    name: 'r/Gaming_Headsets',
    url: 'https://www.reddit.com/r/Gaming_Headsets/',
    lane: 'Headset advice',
    audience: 'Players buying or tuning headsets',
    membersText: 'niche',
    weeklyVisitorsText: 'medium',
    weeklyContributionsText: 'medium',
    rulesFit: 'advice comments',
    risk: 'medium',
    nextMove: 'Give practical setup and test advice. Avoid self-promo and avoid claiming one product fixes every game.'
  },
  {
    name: 'r/EqualizerAPO',
    url: 'https://www.reddit.com/r/EqualizerAPO/',
    lane: 'EQ troubleshooting',
    audience: 'Players and PC users already editing APO chains',
    membersText: 'niche',
    weeklyVisitorsText: 'medium',
    weeklyContributionsText: 'medium',
    rulesFit: 'technical help',
    risk: 'low',
    nextMove: 'Help with safe APO config structure, device selection, and avoiding stacked filters.'
  },
  {
    name: 'r/audioengineering',
    url: 'https://www.reddit.com/r/audioengineering/',
    lane: 'Audio knowledge',
    audience: 'Experienced audio people who dislike hype',
    membersText: 'large',
    weeklyVisitorsText: 'high',
    weeklyContributionsText: 'high',
    rulesFit: 'question/comment only',
    risk: 'high',
    nextMove: 'Ask precise measurement questions. Do not pitch the app.'
  },
  {
    name: 'r/iems',
    url: 'https://www.reddit.com/r/iems/',
    lane: 'IEM buying and fit',
    audience: 'Players and listeners comparing IEMs',
    membersText: '170K visible in latest check',
    weeklyVisitorsText: 'high',
    weeklyContributionsText: 'high',
    rulesFit: 'manual only',
    risk: 'do-not-auto-comment',
    nextMove: 'Do not use assisted posting here because the visible rules include No AI. Read only, or have the owner write manually.'
  }
];

const riskPenalty = {
  low: 0,
  medium: 10,
  high: 22,
  'do-not-auto-comment': 80
};

const textScale = {
  low: 15,
  medium: 35,
  high: 55,
  'very high': 70,
  niche: 22,
  large: 55,
  unknown: 18
};

export function scoreCommunity(community = {}) {
  const members = scoreTextOrNumber(community.members ?? community.membersText);
  const visitors = scoreTextOrNumber(community.weeklyVisitors ?? community.weeklyVisitorsText);
  const contributions = scoreTextOrNumber(community.weeklyContributions ?? community.weeklyContributionsText);
  const fit = community.rulesFit === 'technical help'
    ? 18
    : community.rulesFit === 'advice comments'
      ? 16
      : community.rulesFit === 'discussion first'
        ? 12
        : community.rulesFit === 'manual only'
          ? -35
          : 10;
  const penalty = riskPenalty[community.risk] ?? 12;
  return clamp(Math.round(members * 0.25 + visitors * 0.34 + contributions * 0.25 + fit - penalty), 0, 100);
}

export function buildCommunityPlan(communities = defaultCommunityWatchlist) {
  return communities
    .map((community) => {
      const score = scoreCommunity(community);
      return {
        ...community,
        score,
        status: community.risk === 'do-not-auto-comment'
          ? 'read-only'
          : score >= 60
            ? 'priority'
            : score >= 42
              ? 'watch'
              : 'slow'
      };
    })
    .sort((a, b) => b.score - a.score);
}

export function createThreadMemory({
  community = '',
  title = '',
  url = '',
  snapshot = '',
  author = '',
  score = null,
  comments = null,
  votes = null,
  status = 'watching',
  lastAction = '',
  nextReply = '',
  tags = [],
  now = new Date()
} = {}) {
  const cleanSnapshot = cleanText(snapshot, 1800);
  const inferred = inferThreadStats(cleanSnapshot);
  const safeCommunity = cleanCommunity(community || inferCommunity(url) || inferred.community || 'r/unknown');
  const safeTitle = cleanText(title || inferred.title || 'Untitled thread', 180);
  const safeUrl = cleanUrl(url);
  const safeTags = normalizeTags(tags.length ? tags : inferTags(`${safeTitle} ${cleanSnapshot}`));
  const thread = {
    schema: 'cueforge.community-thread.v1',
    id: buildThreadId({ url: safeUrl, title: safeTitle, now }),
    savedAt: now.toISOString(),
    community: safeCommunity,
    title: safeTitle,
    url: safeUrl,
    author: cleanText(author || inferred.author || '', 80),
    votes: numberOrNull(votes ?? inferred.votes),
    comments: numberOrNull(comments ?? inferred.comments),
    engagementScore: numberOrNull(score) ?? scoreThread({ comments: inferred.comments, votes: inferred.votes, snapshot: cleanSnapshot }),
    status: normalizeStatus(status),
    tags: safeTags,
    lastAction: cleanText(lastAction, 240),
    nextReply: cleanText(nextReply || buildNextReply({ title: safeTitle, snapshot: cleanSnapshot, tags: safeTags }), 1200),
    snapshot: cleanSnapshot
  };
  return thread;
}

export function summarizeThreads(threads = []) {
  const valid = threads.filter((thread) => thread?.schema === 'cueforge.community-thread.v1');
  const active = valid.filter((thread) => !['filtered', 'closed', 'skip'].includes(thread.status));
  const priority = active.filter((thread) => thread.engagementScore >= 55);
  const byCommunity = countBy(valid, 'community');
  return {
    total: valid.length,
    active: active.length,
    priority: priority.length,
    byCommunity,
    nextThread: [...priority, ...active].sort((a, b) => b.engagementScore - a.engagementScore)[0] || null,
    status: valid.length === 0 ? 'empty' : priority.length ? 'reply-ready' : 'watching'
  };
}

export function buildNextReply(thread = {}) {
  const text = `${thread.title || ''} ${thread.snapshot || ''}`.toLowerCase();
  const tags = new Set(thread.tags || inferTags(text));

  if (tags.has('sound-card') || tags.has('dac')) {
    return [
      'I would separate the problem into clean output, driver/routing stability, and software processing.',
      '',
      'For IEMs or normal headphones, a decent USB DAC/interface is usually enough if the motherboard output is already clean. A gaming sound card only really earns its spot if you use its routing or surround features.',
      '',
      'Big thing for FPS: do not stack every spatializer at once. Game HRTF plus Windows Sonic/Dolby plus device surround plus EQ can make direction worse.',
      '',
      'Fair test: same map/range, same volume, one spatial mode at a time, one EQ at a time, then one real match note for footsteps, direction, comms, and fatigue.'
    ].join('\n');
  }

  if (tags.has('iem') || tags.has('headset')) {
    return [
      'For FPS I would not buy from footstep hype alone. Fit and comfort matter a lot because bad seal or ear pain changes the sound faster than any EQ preset.',
      '',
      'I would compare imaging, separation, and fatigue in the same map or range, then play one real match before deciding. If a set makes footsteps pop but makes comms harsh after an hour, that is not really an upgrade.'
    ].join('\n');
  }

  if (tags.has('mic') || tags.has('discord')) {
    return [
      'I would check gain staging before adding more processing. If the input is already clipping or Discord auto-gain is fighting you, EQ/noise suppression can make things worse.',
      '',
      'Quick path: lower input gain, turn off one auto feature at a time, record a short test, then compare voice clarity and room noise before touching heavier filters.'
    ].join('\n');
  }

  if (tags.has('eq') || tags.has('apo')) {
    return [
      'I would keep the EQ change small and test one problem at a time. Big boosts can make footsteps louder but also make reloads, glass, UI ticks, and teammate comms more tiring.',
      '',
      'Best sanity check: save a flat baseline, make one profile change, then compare the same game situation before using it in ranked.'
    ].join('\n');
  }

  return [
    'I would make the test smaller before changing the setup again.',
    '',
    'Same game, same volume, one setting changed, one real match note: what got better, what got worse, and what stayed the same. That usually tells you whether it is tuning, routing, the game mix, or just a bad server/session.'
  ].join('\n');
}

export function parseRedditSnapshot(snapshot = '', url = '') {
  const text = String(snapshot || '');
  const community = inferCommunity(url) || firstMatch(text, /\b(r\/[A-Za-z0-9_]+)\b/);
  const comments = firstNumber(text, /([\d,.]+)\s+comments?/i);
  const votes = firstNumber(text, /([\d,.]+)\s+votes?/i);
  const author = firstMatch(text, /\bu\/([A-Za-z0-9_-]{3,})\b/);
  const title = extractLikelyTitle(text);
  return { community, comments, votes, author: author ? `u/${author.replace(/^u\//, '')}` : '', title };
}

export function buildRedditThreadJsonUrl(url = '') {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/r\/([^/]+)\/comments\/([^/]+)/i);
    if (!match) return '';
    return `https://www.reddit.com/r/${match[1]}/comments/${match[2]}.json?raw_json=1&limit=12`;
  } catch {
    return '';
  }
}

export function threadFromRedditJson(payload, url = '') {
  const listing = Array.isArray(payload) ? payload[0]?.data?.children?.[0]?.data : null;
  if (!listing) return null;
  return createThreadMemory({
    community: listing.subreddit_name_prefixed,
    title: listing.title,
    url: url || `https://www.reddit.com${listing.permalink || ''}`,
    author: listing.author ? `u/${listing.author}` : '',
    votes: listing.score,
    comments: listing.num_comments,
    snapshot: listing.selftext || listing.title || '',
    status: 'watching'
  });
}

export function buildCommunityMemoryMarkdown({ communities = defaultCommunityWatchlist, threads = [], updatedAt = new Date() } = {}) {
  const plan = buildCommunityPlan(communities);
  const summary = summarizeThreads(threads);
  const lines = [
    '# CueForge Community Memory',
    '',
    `Last updated: ${updatedAt.toISOString()}`,
    '',
    '## Guardrails',
    '',
    '- Build trust before posting links.',
    '- Prefer useful no-link comments in active audio and PC gaming threads.',
    '- Do not repost filtered content.',
    '- Skip communities that disallow assisted or generated comments.',
    '- Never claim personal testing experience that did not happen.',
    '',
    '## Watchlist',
    '',
    '| Community | Score | Status | Lane | Next move |',
    '| --- | ---: | --- | --- | --- |',
    ...plan.map((community) => `| ${community.name} | ${community.score} | ${community.status} | ${escapePipes(community.lane)} | ${escapePipes(community.nextMove)} |`),
    '',
    '## Thread Queue',
    '',
    `Total saved threads: ${summary.total}`,
    `Priority threads: ${summary.priority}`,
    ''
  ];

  if (threads.length === 0) {
    lines.push('No threads saved yet. Save one active discussion before commenting.');
  } else {
    threads.forEach((thread, index) => {
      lines.push(
        `### ${index + 1}. ${thread.community} - ${thread.title}`,
        '',
        `URL: ${thread.url || 'not saved'}`,
        `Status: ${thread.status}`,
        `Engagement score: ${thread.engagementScore}`,
        `Comments: ${thread.comments ?? 'unknown'} / Votes: ${thread.votes ?? 'unknown'}`,
        `Tags: ${thread.tags.join(', ') || 'none'}`,
        '',
        'Next reply draft:',
        '',
        '```text',
        thread.nextReply,
        '```',
        ''
      );
    });
  }

  return lines.join('\n');
}

function scoreTextOrNumber(value) {
  if (typeof value === 'number') return clamp(Math.round(Math.log10(Math.max(value, 1)) * 14), 0, 80);
  const text = String(value || 'unknown').toLowerCase();
  const numeric = parseCompactNumber(text);
  if (numeric != null) return scoreTextOrNumber(numeric);
  for (const [key, score] of Object.entries(textScale)) {
    if (text.includes(key)) return score;
  }
  return textScale.unknown;
}

function scoreThread({ comments = null, votes = null, snapshot = '' } = {}) {
  const commentScore = numberOrNull(comments) == null ? 12 : clamp(Math.log10(Math.max(comments, 1)) * 28, 0, 55);
  const voteScore = numberOrNull(votes) == null ? 8 : clamp(Math.log10(Math.max(votes, 1)) * 16, 0, 35);
  const freshScore = /\b(min|hour|hr|today|1d|2d)\b/i.test(snapshot) ? 10 : 4;
  return Math.round(clamp(commentScore + voteScore + freshScore, 0, 100));
}

function inferThreadStats(snapshot) {
  return parseRedditSnapshot(snapshot);
}

function inferTags(text = '') {
  const value = String(text || '').toLowerCase();
  const tags = [];
  if (/\biem|in-ear|earbud/.test(value)) tags.push('iem');
  if (/\bheadset|headphone|cans\b/.test(value)) tags.push('headset');
  if (/\bmic|microphone|discord|comms/.test(value)) tags.push('mic');
  if (/\beq|equalizer|apo|peace\b/.test(value)) tags.push('eq');
  if (/\bsound card|soundcard|dac|amp|interface|schiit|fiio|jds\b/.test(value)) tags.push('sound-card', 'dac');
  if (/\bfootstep|imaging|direction|positioning|warzone|cs2|valorant|tarkov|siege|battlefield|cod\b/.test(value)) tags.push('fps-audio');
  return [...new Set(tags)].slice(0, 6);
}

function normalizeTags(tags = []) {
  return [...new Set(tags.map((tag) => cleanText(tag, 32).toLowerCase()).filter(Boolean))].slice(0, 8);
}

function normalizeStatus(status) {
  return ['watching', 'drafted', 'commented', 'needs-followup', 'filtered', 'closed', 'skip'].includes(status)
    ? status
    : 'watching';
}

function cleanText(value, limit = 500) {
  return String(value || '')
    .replace(/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/gi, '[redacted-email]')
    .replace(/\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[redacted-phone]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, limit);
}

function cleanUrl(url = '') {
  const value = String(url || '').trim();
  if (!value) return '';
  try {
    const parsed = new URL(value);
    if (!['https:', 'http:'].includes(parsed.protocol)) return '';
    return parsed.toString().slice(0, 300);
  } catch {
    return '';
  }
}

function cleanCommunity(value) {
  const text = cleanText(value, 64);
  if (!text) return 'r/unknown';
  if (/^r\//i.test(text)) return `r/${text.slice(2).replace(/[^A-Za-z0-9_]/g, '')}`;
  return `r/${text.replace(/[^A-Za-z0-9_]/g, '') || 'unknown'}`;
}

function inferCommunity(url = '') {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/r\/([^/]+)/i);
    return match ? `r/${match[1]}` : '';
  } catch {
    return '';
  }
}

function firstMatch(text, pattern) {
  const match = String(text || '').match(pattern);
  return match?.[1] || '';
}

function firstNumber(text, pattern) {
  const match = String(text || '').match(pattern);
  return match ? parseCompactNumber(match[1]) : null;
}

function parseCompactNumber(value) {
  const text = String(value || '').toLowerCase().replace(/,/g, '').trim();
  const match = text.match(/([\d.]+)\s*([km])?/);
  if (!match) return null;
  const number = Number(match[1]);
  if (!Number.isFinite(number)) return null;
  if (match[2] === 'k') return Math.round(number * 1000);
  if (match[2] === 'm') return Math.round(number * 1000000);
  return Math.round(number);
}

function extractLikelyTitle(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^(skip to main|advertise|open chat|create|share|sort by|reply|reddit rules)/i.test(line));
  return cleanText(lines.find((line) => line.length > 12 && line.length < 180) || '', 180);
}

function numberOrNull(value) {
  if (value == null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function buildThreadId({ url, title, now }) {
  const source = url || `${title}-${now.getTime()}`;
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
  }
  return `thread-${hash.toString(16)}`;
}

function countBy(items, key) {
  return items.reduce((counts, item) => {
    const value = item[key] || 'unknown';
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

function escapePipes(value) {
  return String(value || '').replace(/\|/g, '/');
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
