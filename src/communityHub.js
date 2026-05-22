export const communitySources = ['Discord', 'X', 'Reddit', 'In-game squad'];

export const feedbackTypes = [
  'Footsteps',
  'Direction',
  'Comms',
  'Mic',
  'Fatigue',
  'Game/server issue',
  'Setup/routing'
];

export function createCommunityItem({
  source = 'Discord',
  handle = '',
  game = '',
  gear = '',
  choice = 'this',
  type = 'Footsteps',
  note = '',
  now = new Date()
}) {
  return {
    schema: 'cueforge.community-feedback.v1',
    receivedAt: now.toISOString(),
    source: cleanShort(source, 32),
    handle: cleanShort(handle, 48),
    game: cleanShort(game, 80),
    gear: cleanShort(gear, 140),
    choice: choice === 'that' ? 'that' : 'this',
    type: feedbackTypes.includes(type) ? type : 'Footsteps',
    note: cleanNote(note)
  };
}

export function summarizeCommunityFeedback(items = []) {
  const safeItems = items.filter((item) => item?.schema === 'cueforge.community-feedback.v1');
  const sourceCounts = countBy(safeItems, 'source');
  const typeCounts = countBy(safeItems, 'type');
  const choiceCounts = countBy(safeItems, 'choice');
  const topSource = topKey(sourceCounts) || 'Discord';
  const topIssue = topKey(typeCounts) || 'Footsteps';
  const total = safeItems.length;
  const needsAction = total > 0 && ['Direction', 'Game/server issue', 'Setup/routing'].includes(topIssue);

  return {
    total,
    sourceCounts,
    typeCounts,
    choiceCounts,
    topSource,
    topIssue,
    thisVotes: choiceCounts.this || 0,
    thatVotes: choiceCounts.that || 0,
    status: total >= 12 ? 'strong-signal' : total >= 4 ? 'forming-signal' : 'needs-more-input',
    recommendation: buildRecommendation({ topIssue, topSource, needsAction, total })
  };
}

export function buildRollCallPrompt({ focus = 'FPS audio', game = 'Tarkov / Siege / COD', summary } = {}) {
  const signal = summary?.total
    ? `${summary.total} notes collected. Top issue: ${summary.topIssue}.`
    : 'No signal yet. Start with Discord and collect clean first-hand notes.';

  return [
    'Panda Lab roll call',
    '',
    `Today focus: ${cleanShort(focus, 80)}`,
    `Games: ${cleanShort(game, 80)}`,
    signal,
    '',
    'Reply with:',
    '1. Game and mode',
    '2. IEM/headset/mic chain',
    '3. This or that: which setting felt better?',
    '4. What got better, worse, or stayed the same?',
    '5. Did it feel like tuning, game audio, server timing, Discord, or Windows routing?'
  ].join('\n');
}

export function buildCommunityDraft({ platform = 'Discord', summary, appUrl, discordUrl }) {
  const base = summary?.total
    ? `We have ${summary.total} tester notes so far. Biggest signal: ${summary.topIssue}.`
    : 'We are collecting first tester notes now.';

  if (platform === 'X') {
    return `${base}\n\nCueForge beta is free to test. Bring your real FPS setup: IEMs, headset, mic, Discord, APO, messy Windows routing, all of it.\n\nApp: ${appUrl}\nDiscord: ${discordUrl}\n\n#CueForge #FPSAudio #GamingAudio #IEM #EqualizerAPO`;
  }

  if (platform === 'Reddit') {
    return `${base}\n\nI am looking for honest FPS audio testers, especially people using IEMs, headsets, USB mics, Equalizer APO, Peace, Sonar, or Discord routing.\n\nThe point is not hype. I want to know what actually helps, what gets worse, and whether the problem is tuning, game audio, server timing, Discord, or Windows setup.\n\nApp: ${appUrl}\nDiscord hub: ${discordUrl}`;
  }

  return `${base}\n\nTonight: run CueForge, play one real match, then post a clean check-in.\n\nDrop game, gear, this-or-that choice, and whether the issue feels like tuning, game/server, Discord, mic, or Windows routing.\n\nApp: ${appUrl}`;
}

function buildRecommendation({ topIssue, topSource, needsAction, total }) {
  if (total === 0) return 'Post a Discord roll call first, then compare the same question on X and Reddit.';
  if (needsAction) return `${topIssue} is leading from ${topSource}. Ask for clips or before/after reports before changing the global EQ.`;
  return `${topIssue} is leading from ${topSource}. Tune one small profile change, then run another roll call.`;
}

function countBy(items, key) {
  return items.reduce((counts, item) => {
    const value = item[key] || 'Unknown';
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

function topKey(counts) {
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
}

function cleanShort(value, limit) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit);
}

function cleanNote(value) {
  return cleanShort(value, 700)
    .replace(/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/gi, '[redacted-email]')
    .replace(/\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[redacted-phone]');
}
