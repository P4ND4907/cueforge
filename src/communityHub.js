import { attachStateAnchor, STATE_CONSUMERS } from './core/stateAdapters.js';

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
    return [
      base,
      '',
      'I would test one thing at a time before trusting any global preset:',
      '',
      '- same map or range',
      '- same volume',
      '- one spatial mode',
      '- one EQ change',
      '- one real match note for direction, footsteps, comms, fatigue, and mic clarity',
      '',
      'That is the loop I am building CueForge around. No link drop here unless someone asks for it.'
    ].join('\n');
  }

  if (platform === 'Reddit') {
    return buildRedditSafeDraft({ mode: 'comment', summary, appUrl, discordUrl });
  }

  return [
    base,
    '',
    'Reply in the existing thread with the useful part only:',
    '',
    '- what changed',
    '- what got worse',
    '- whether it felt like tuning, game audio, server timing, Discord, mic gain, or Windows routing',
    '',
    `If they ask for the tool, send CueForge: ${appUrl}`,
    `Main hub: ${discordUrl}`
  ].join('\n');
}

export function buildRedditSafeDraft({ mode = 'community', summary, appUrl, discordUrl } = {}) {
  const signal = summary?.total
    ? `Current tester signal: ${summary.total} notes, biggest issue is ${summary.topIssue}.`
    : 'Current tester signal: first outside notes are still being collected.';

  if (mode === 'modmail') {
    return [
      'Hey mods, quick permission check before I post.',
      '',
      'I built CueForge, a free local-first FPS audio testing app for Windows players using IEMs, headsets, USB mics, Discord, Equalizer APO, Peace, Sonar, and messy routing chains.',
      '',
      'I want to ask for a small group of real FPS players to run one match and tell me what changed: footsteps, direction, comms, mic clarity, fatigue, or whether the issue is really game/server timing instead of tuning.',
      '',
      'I will disclose that CueForge is my project, keep it to one feedback request, and follow whatever thread/flair/link rule you prefer.',
      '',
      `App: ${appUrl}`,
      `Discord hub: ${discordUrl}`,
      '',
      'Would that be allowed here, or is there a better weekly/help/self-promo thread?'
    ].join('\n');
  }

  if (mode === 'profile') {
    return [
      'I built CueForge and need real FPS audio testers',
      '',
      'Disclosure: CueForge is my project.',
      '',
      signal,
      '',
      'I am looking for honest players, not hype. Run the app, play one real match, then tell me what got better and what got worse.',
      '',
      'Best feedback:',
      '- game and mode',
      '- IEM/headset/mic chain',
      '- Equalizer APO / Peace / Sonar / Discord setup',
      '- what changed for footsteps, direction, comms, fatigue, or mic clarity',
      '- whether it felt like tuning, game audio, server timing, Discord, mic gain, or Windows routing',
      '',
      `App: ${appUrl}`,
      `Discord: ${discordUrl}`
    ].join('\n');
  }

  if (mode === 'comment') {
    return [
      'I would split the audio problem before changing EQ again:',
      '',
      '1. Is it only this game/map/server?',
      '2. Is Discord, Sonar, Windows routing, or APO changing the output path?',
      '3. Is the mic/headset/IEM chain clipping, masking, or over-boosting one band?',
      '',
      'That is the testing loop I am using for CueForge. If the issue only happens in one game, I would not overfit a global EQ to it yet.'
    ].join('\n');
  }

  return buildRedditSafeDraft({ mode: 'comment', summary, appUrl, discordUrl });
}

export function buildSetupShareText({ devices = [], bridgeReport = null } = {}) {
  const summary = summarizeDetectedSetup({ devices, bridgeReport });
  const deviceLines = summary.devices.length
    ? summary.devices.map((device) => `- ${device.kind}: ${device.label}`)
    : ['- No browser audio devices visible yet. Allow mic permission or load the Windows bridge report.'];
  const bridgeLines = summary.bridgeDevices.length
    ? summary.bridgeDevices.map((label) => `- ${label}`)
    : ['- No Windows bridge devices loaded.'];
  const toolLines = summary.tools.map((tool) => `- ${tool.name}: ${tool.status}`);

  return [
    'CueForge setup summary',
    '',
    'Browser scan:',
    ...deviceLines,
    '',
    'Windows bridge scan:',
    ...bridgeLines,
    '',
    'Companion audio layers:',
    ...toolLines,
    '',
    'Copy/paste test note:',
    'I can test one real match and report whether footsteps, direction, comms, fatigue, or mic clarity changed. I will also say if the problem feels like tuning, game/server timing, Discord, mic gain, or Windows routing.',
    '',
    'Privacy: this summary excludes raw device IDs, group IDs, phone numbers, emails, paths, tokens, and recovery info.'
  ].join('\n');
}

export function buildCommunityFeedbackPacket({
  summary,
  items = [],
  approvalQueue = [],
  threadSummary = null,
  threads = [],
  cueforgeState = null,
  now = new Date()
} = {}) {
  return attachStateAnchor({
    schema: 'cueforge.community-packet.v2',
    exportedAt: now.toISOString(),
    summary,
    items,
    approvalQueue,
    threadSummary,
    threads
  }, cueforgeState, STATE_CONSUMERS.discordFeedbackPack);
}

export function summarizeDetectedSetup({ devices = [], bridgeReport = null } = {}) {
  const safeDevices = devices
    .filter((device) => String(device?.kind || '').includes('audio'))
    .slice(0, 12)
    .map((device, index) => ({
      kind: cleanShort(String(device.kind || 'audio').replace('audio', 'audio '), 32),
      label: cleanDeviceLabel(device.label || device.name, device.kind, index)
    }));

  const bridgeDevices = [...(bridgeReport?.soundDevices || []), ...(bridgeReport?.mediaDevices || [])]
    .slice(0, 10)
    .map((device, index) => cleanDeviceLabel(device.Name || device.name || device.FriendlyName, device.Type || 'audio', index));

  const tools = [
    ['Equalizer APO', bridgeReport?.tools?.equalizerApo?.installed],
    ['Peace UI', bridgeReport?.tools?.peace?.installed],
    ['SteelSeries Sonar', bridgeReport?.tools?.steelSeriesSonar?.installed],
    ['FxSound', bridgeReport?.tools?.fxSound?.installed],
    ['Razer THX / Synapse', bridgeReport?.tools?.razerThx?.installed],
    ['Dolby Access / Atmos', bridgeReport?.tools?.dolbyAccess?.installed],
    ['DTS Sound Unbound', bridgeReport?.tools?.dtsSoundUnbound?.installed],
    ['Nahimic', bridgeReport?.tools?.nahimic?.installed],
    ['NVIDIA Broadcast', bridgeReport?.tools?.nvidiaBroadcast?.installed],
    ['Elgato Wave Link', bridgeReport?.tools?.elgatoWaveLink?.installed],
    ['Logitech G HUB', bridgeReport?.tools?.logitechGHub?.installed],
    ['Corsair iCUE', bridgeReport?.tools?.corsairIcue?.installed],
    ['Voicemod', bridgeReport?.tools?.voicemod?.installed],
    ['VB-CABLE', bridgeReport?.tools?.vbCable?.installed],
    ['Voicemeeter', bridgeReport?.tools?.voicemeeter?.installed]
  ].map(([name, installed]) => ({ name, status: installed ? 'detected' : 'not detected yet' }));

  return { devices: safeDevices, bridgeDevices, tools };
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

function cleanDeviceLabel(value, kind = 'audio', index = 0) {
  const fallback = String(kind || '').includes('input')
    ? `Microphone input ${index + 1}`
    : String(kind || '').includes('output')
      ? `Headphone/output ${index + 1}`
      : `Audio device ${index + 1}`;

  return cleanNote(cleanShort(value || fallback, 110))
    .replace(/\b[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}\b/gi, '[redacted-id]')
    .replace(/\b(?:device|group|container|instance|serial)[\s:_-]*[a-z0-9{}\\-]{6,}\b/gi, '[redacted-id]');
}
