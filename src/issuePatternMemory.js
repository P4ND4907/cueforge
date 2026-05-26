const PATTERN_SCHEMA = 'cueforge.issue-pattern-memory.v1';

export const issuePatternRules = [
  {
    id: 'permission-device-names',
    label: 'Hidden device names or blocked mic permission',
    source: 'browser permission',
    keywords: ['permission', 'blocked', 'skipped', 'hidden device', 'device names', 'microphone permission', 'address bar', 'enumeration'],
    debugPlaybook: [
      'Confirm the browser permission state first.',
      'Use the address bar permission control, allow microphone, refresh, then rescan.',
      'If names still stay hidden, load the desktop Windows bridge report.'
    ],
    futureAutomation: 'Auto-tag reports where device labels are hidden and queue the permission recovery card before any tuning advice.'
  },
  {
    id: 'mic-gain-discord',
    label: 'Boomy, clipped, or inconsistent mic chain',
    source: 'mic gain / Discord',
    keywords: ['boomy', 'boom', 'clip', 'clipping', 'too loud', 'gain', 'auto gain', 'discord', 'noise suppression', 'input sensitivity', 'robotic'],
    debugPlaybook: [
      'Check live mic level, peak, noise, and clip risk before EQ changes.',
      'Lower Windows or Discord input gain if clipping is visible.',
      'Keep suppression light, then record a short local evidence clip for comparison.'
    ],
    futureAutomation: 'Cluster repeat mic complaints by clip risk, noise pressure, and Discord settings so CueForge can suggest a safe mic preset first.'
  },
  {
    id: 'routing-layer-conflict',
    label: 'Sonar, Peace, APO, or virtual routing conflict',
    source: 'Windows routing layer',
    keywords: ['sonar', 'peace', 'equalizer apo', 'apo', 'voicemeeter', 'vb-cable', 'routing', 'virtual device', 'default device', 'output path', 'configurator'],
    debugPlaybook: [
      'Map the real output path before changing EQ.',
      'Check whether Sonar or a virtual device sits between the game and physical output.',
      'Verify Equalizer APO is installed on the endpoint actually being heard.'
    ],
    futureAutomation: 'Compare bridge reports across testers and flag repeated routing stacks that break APO or duplicate processing.'
  },
  {
    id: 'game-server-not-tuning',
    label: 'Likely game mix, map, server, or timing issue',
    source: 'game/session',
    keywords: ['server', 'desync', 'map', 'mode', 'game issue', 'only this game', 'only happens', 'cod', 'tarkov', 'siege', 'valorant', 'cs2', 'apex', 'warzone'],
    debugPlaybook: [
      'Ask whether the issue repeats across game, map, mode, and server.',
      'Run one unchanged baseline match before changing global EQ.',
      'Keep this separate from headset or mic tuning until it repeats outside one game context.'
    ],
    futureAutomation: 'Learn game-specific issue clusters from check-ins and avoid overfitting global EQ to one bad server or map.'
  },
  {
    id: 'footstep-masking',
    label: 'Footsteps or direction buried by masking',
    source: 'game audio balance',
    keywords: ['footstep', 'footsteps', 'direction', 'imaging', 'positioning', 'buried', 'masking', 'explosion', 'bass', 'rumble', 'low end', 'low-end'],
    debugPlaybook: [
      'Run Masking Lab before boosting treble.',
      'Reduce rumble or low-mid masking first, then retest the same map/mode.',
      'Use Player Trial to compare direction and fatigue after one controlled match.'
    ],
    futureAutomation: 'Combine spectral masking, repeated match notes, and before/after preferences into a confidence score before applying EQ nudges.'
  },
  {
    id: 'iem-fatigue-harshness',
    label: 'IEM or headset harshness and fatigue',
    source: 'output tuning',
    keywords: ['iem', 'headset', 'headphone', 'harsh', 'sharp', 'fatigue', 'treble', '8k', '16k', 'piercing', 'sibilance'],
    debugPlaybook: [
      'Check left/right/center/sweep at low volume.',
      'Use Hearing Model and Blind Match before pushing more treble.',
      'Apply small cuts in sharp bands and compare comfort after a real match.'
    ],
    futureAutomation: 'Group fatigue reports by gear type and EQ shape so CueForge can avoid repeatedly suggesting harsh curves.'
  },
  {
    id: 'ui-flow-confusion',
    label: 'Tester confused by app flow or copy',
    source: 'CueForge UI',
    keywords: ['confusing', 'unclear', 'what next', 'text issue', 'layout issue', 'button', 'nothing happened', 'overflow', 'cramped', 'not obvious'],
    debugPlaybook: [
      'Open the exact page and target from Panda Notes.',
      'Make the next action obvious in one line.',
      'Rerun responsive smoke before clearing the note.'
    ],
    futureAutomation: 'Turn repeated Panda Notes into repair packets and release blockers until the same flow passes retest.'
  },
  {
    id: 'privacy-export-risk',
    label: 'Private data or export safety risk',
    source: 'privacy/export',
    keywords: ['privacy', 'redact', 'device id', 'group id', 'path', 'email', 'phone', 'token', 'password', 'leak', 'export'],
    debugPlaybook: [
      'Run Privacy Export Audit before sharing any report or tester update.',
      'Inspect leaks by payload path and fix redaction before posting.',
      'Keep raw audio and private account data out of public files.'
    ],
    futureAutomation: 'Block public update drafts automatically when the privacy audit fails or unknown payloads are attached.'
  },
  {
    id: 'performance-gameplay-save',
    label: 'Gameplay save or live analyzer performance concern',
    source: 'performance',
    keywords: ['performance', 'ram', 'cpu', 'lag', 'stutter', 'slow', 'gameplay save', 'fps drop', 'overhead'],
    debugPlaybook: [
      'Check Performance Mode and snapshot caps.',
      'Run live analyzer idle and active, then compare browser responsiveness.',
      'Keep saves throttled and never write high-volume data during a match.'
    ],
    futureAutomation: 'Learn which live features are safe to leave on during matches by comparing snapshot counts, timing, and tester complaints.'
  }
];

export function buildIssuePatternMemory({
  lastReport = null,
  uiNotes = [],
  checkIns = [],
  communityItems = [],
  selfTests = [],
  evidence = [],
  now = new Date()
} = {}) {
  const signals = collectSignals({ lastReport, uiNotes, checkIns, communityItems, selfTests, evidence });
  const matchedPatterns = issuePatternRules
    .map((rule) => scoreRule(rule, signals))
    .filter((pattern) => pattern.score > 0)
    .sort((a, b) => b.score - a.score || b.evidenceCount - a.evidenceCount || a.label.localeCompare(b.label))
    .slice(0, 8);

  return {
    schema: PATTERN_SCHEMA,
    generatedAt: safeDate(now).toISOString(),
    promise: 'CueForge learns local patterns from redacted reports, Panda Notes, check-ins, self tests, and community signals without hidden uploads.',
    totalSignals: signals.length,
    matchedCount: matchedPatterns.length,
    topPattern: matchedPatterns[0] || null,
    matchedPatterns,
    unmatchedSignals: signals.filter((signal) => !matchedPatterns.some((pattern) => pattern.evidence.some((item) => item.id === signal.id))).slice(0, 10),
    boundary: 'Pattern memory suggests debug playbooks. Source edits, driver changes, and public replies still need explicit review.'
  };
}

export function buildIssuePatternMemoryText(memory) {
  if (!memory || memory.schema !== PATTERN_SCHEMA) return 'CueForge issue pattern memory\nStatus: no memory built yet.';
  const lines = [
    'CueForge issue pattern memory',
    `Generated: ${memory.generatedAt}`,
    `Signals scanned: ${memory.totalSignals}`,
    `Patterns found: ${memory.matchedCount}`,
    '',
    memory.promise,
    '',
    `Boundary: ${memory.boundary}`,
    ''
  ];

  if (!memory.matchedPatterns.length) {
    lines.push('No repeated pattern yet. Collect one redacted report, one Panda Note, or one check-in after a real match.');
    return lines.join('\n');
  }

  memory.matchedPatterns.forEach((pattern, index) => {
    lines.push(`${index + 1}. ${pattern.label}`);
    lines.push(`   Source: ${pattern.source}`);
    lines.push(`   Confidence: ${pattern.confidence}%`);
    lines.push(`   Evidence: ${pattern.evidenceCount}`);
    lines.push(`   Next debug step: ${pattern.debugPlaybook[0]}`);
    lines.push(`   Later automation: ${pattern.futureAutomation}`);
    lines.push('');
  });

  return lines.join('\n').trim();
}

function collectSignals({ lastReport, uiNotes, checkIns, communityItems, selfTests, evidence }) {
  const signals = [];
  const add = (source, text, extra = {}) => {
    const clean = sanitizeSignalText(text);
    if (!clean) return;
    signals.push({
      id: `${source}-${signals.length + 1}`,
      source,
      text: clean,
      ...extra
    });
  };

  if (lastReport) {
    add('report', [
      lastReport.app?.selectedGame,
      lastReport.app?.selectedSourceProfile,
      lastReport.reproducibleState?.sample,
      lastReport.notes,
      lastReport.reproducibleState?.analysis?.recommendation,
      lastReport.diagnostics?.bridgeReport ? JSON.stringify(lastReport.diagnostics.bridgeReport) : ''
    ].join(' '), { page: lastReport.app?.currentPage || 'Report Lab' });
  }

  uiNotes.forEach((note) => add('panda-note', [
    note.page,
    note.tag,
    note.status,
    note.note,
    note.target?.panel,
    note.target?.label
  ].join(' '), { page: note.page, status: note.status }));

  checkIns.forEach((checkIn) => add('check-in', [
    checkIn.game,
    checkIn.gear,
    checkIn.source,
    checkIn.notes
  ].join(' ')));

  communityItems.forEach((item) => add('community', [
    item.source,
    item.game,
    item.gear,
    item.type,
    item.note
  ].join(' ')));

  selfTests.forEach((test) => add('self-test', [
    test.name,
    test.status,
    test.detail
  ].join(' '), { status: test.status }));

  evidence.forEach((item) => add('evidence', [
    item.recommendation,
    item.suggestedTweak,
    `clip risk ${item.clipRisk}`,
    `noise ${item.noise}`
  ].join(' ')));

  return signals.slice(-120);
}

function scoreRule(rule, signals) {
  const evidence = [];
  let score = 0;

  for (const signal of signals) {
    const text = normalize(signal.text);
    const hits = rule.keywords.filter((keyword) => text.includes(normalize(keyword)));
    if (!hits.length) continue;
    const sourceWeight = signal.source === 'report' ? 8 : signal.source === 'self-test' ? 7 : signal.source === 'panda-note' ? 6 : 5;
    const statusWeight = /fail|warn|needs-retest|broken|blocked/i.test(`${signal.status || ''} ${signal.text}`) ? 5 : 0;
    score += hits.length * 4 + sourceWeight + statusWeight;
    evidence.push({
      id: signal.id,
      source: signal.source,
      page: signal.page || '',
      status: signal.status || '',
      matched: hits.slice(0, 5),
      text: signal.text.slice(0, 180)
    });
  }

  const evidenceCount = evidence.length;
  const confidence = clamp(Math.round(score * 5 + evidenceCount * 6), 1, 96);

  return {
    id: rule.id,
    label: rule.label,
    source: rule.source,
    score,
    confidence,
    evidenceCount,
    automationReady: evidenceCount >= 2 && confidence >= 45,
    similarityTags: [...new Set(evidence.flatMap((item) => item.matched))].slice(0, 8),
    debugPlaybook: rule.debugPlaybook,
    futureAutomation: rule.futureAutomation,
    evidence: evidence.slice(0, 5)
  };
}

function sanitizeSignalText(value) {
  return String(value || '')
    .replace(/[A-Z]:\\(?:[^\\\s]+\\)*[^\\\s]*/gi, '[redacted-path]')
    .replace(/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/gi, '[redacted-email]')
    .replace(/\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[redacted-phone]')
    .replace(/\b[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}\b/gi, '[redacted-id]')
    .replace(/\b(?:device|group|container|instance|serial)[\s:_-]*[a-z0-9{}\\-]{6,}\b/gi, '[redacted-id]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1000);
}

function normalize(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9#+.-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function safeDate(value) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
