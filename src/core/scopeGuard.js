export const blockedV020Scopes = [
  {
    id: 'kernel_mode_driver',
    label: 'Kernel-mode driver',
    reason: 'Kernel drivers raise trust, signing, stability, and anti-cheat risk. Stay user-mode until the product earns that level of responsibility.',
    keywords: ['kernel-mode driver', 'kernel mode driver', 'kernel driver']
  },
  {
    id: 'custom_apo_installer',
    label: 'Full custom APO installer',
    reason: 'CueForge can export Equalizer APO configs and safe drafts, but installing a system APO needs a separate signed, reversible setup plan.',
    keywords: ['custom apo installer', 'install apo', 'apo installer', 'system apo installer']
  },
  {
    id: 'auto_routing_changes',
    label: 'Auto-routing changes',
    reason: 'Changing Windows, Discord, game, or virtual-device routing without a visible user step can break audio or privacy expectations.',
    keywords: ['auto-routing', 'auto routing', 'change routing automatically', 'silently route', 'automatic routing change']
  },
  {
    id: 'always_on_background_service',
    label: 'Always-on background service',
    reason: 'An always-running process needs a later power, privacy, update, crash, and uninstall design. v0.2.0 stays explicit and session-based.',
    keywords: ['always-on background service', 'always on background service', 'background daemon', 'run in background forever']
  },
  {
    id: 'cloud_ai_personalization',
    label: 'Cloud AI personalization',
    reason: 'The trust promise is local-first. Personal audio identity should not leave the machine unless a future opt-in cloud design is reviewed.',
    keywords: ['cloud ai personalization', 'upload hearing model', 'cloud tuning', 'remote personalization', 'server personalization']
  },
  {
    id: 'aggressive_pitch_shifting',
    label: 'Aggressive pitch shifting',
    reason: 'Pitch tricks can distort direction, fatigue players, and create fake confidence. CueForge should tune clarity without reshaping the game unrealistically.',
    keywords: ['aggressive pitch shifting', 'pitch shift enemies', 'enemy pitch shifting', 'pitch-shift footsteps']
  },
  {
    id: 'real_money_paid_unlocks',
    label: 'Real-money paid unlocks',
    reason: 'Tester trust comes first. Paid unlocks wait until the product has proven value, support, and a clear free testing lane.',
    keywords: ['paid unlock', 'real-money unlock', 'real money unlock', 'paywall', 'subscription gate']
  },
  {
    id: 'game_memory_reading',
    label: 'Game memory reading',
    reason: 'Reading game memory is anti-cheat-adjacent and outside CueForge scope. Use audio signals, explicit user input, and game-approved integrations only.',
    keywords: ['game memory reading', 'read game memory', 'memory hook', 'process memory', 'scan game memory']
  },
  {
    id: 'anti_cheat_adjacent_hooks',
    label: 'Anti-cheat-adjacent hooks',
    reason: 'CueForge must not inject, hook protected game processes, or behave like cheat tooling. Keep capture and analysis on allowed audio paths.',
    keywords: ['anti-cheat hook', 'anti cheat hook', 'inject into game', 'game hook', 'protected process hook']
  },
  {
    id: 'exact_enemy_position_claims',
    label: 'Exact enemy position claims',
    reason: 'CueForge can improve a final audio chain and estimate post-mix cues, but exact game-world enemy positions require game-engine metadata or validated integrations.',
    keywords: ['exact enemy position', 'exact enemy positions', 'hear exact enemy', 'ai hears enemies', 'enemy positions automatically', 'automatic enemy position']
  }
];

export const trustedScopePrinciples = [
  'No hidden driver changes.',
  'No silent routing changes.',
  'No game memory reads or anti-cheat-adjacent hooks.',
  'No cloud personalization by default.',
  'No claims beyond what browser, bridge, and audio evidence can prove.'
];

function normalizeText(value) {
  return String(value || '').toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function findBlockedScopeMatches(text = '') {
  const normalized = normalizeText(text);
  if (!normalized) return [];

  return blockedV020Scopes.filter((item) => {
    const normalizedId = normalizeText(item.id);
    const normalizedLabel = normalizeText(item.label);
    return normalized.includes(normalizedId) ||
      normalized.includes(normalizedLabel) ||
      item.keywords.some((keyword) => normalized.includes(normalizeText(keyword)));
  });
}

export function evaluateScopeBoundary({ feature = '', description = '', claims = [], actions = [] } = {}) {
  const fields = [feature, description, ...claims, ...actions].filter(Boolean);
  const blockersById = new Map();

  fields.forEach((field) => {
    findBlockedScopeMatches(field).forEach((match) => {
      blockersById.set(match.id, match);
    });
  });

  const blockers = [...blockersById.values()];
  return {
    schema: 'cueforge.scope-boundary-check.v1',
    ok: blockers.length === 0,
    blockers,
    message: blockers.length
      ? 'Blocked for v0.2.0. Keep CueForge trusted: local-first, explicit, and away from driver/game-hook risk.'
      : 'Allowed for v0.2.0 if it stays local-first, explicit, redacted, and proof-gated.',
    principles: trustedScopePrinciples
  };
}

export function buildScopeBoundarySummary() {
  return {
    schema: 'cueforge.scope-boundary.v1',
    version: '0.2.0-alpha.3',
    status: 'trusted-alpha-boundary',
    allowedNow: [
      'browser/device detection',
      'optional desktop bridge scans',
      'audio analysis',
      'guided recommendations',
      'safe APO text export',
      'local reports and Panda Notes',
      'native engine manifests for future review'
    ],
    blocked: blockedV020Scopes.map(({ id, label, reason }) => ({ id, label, reason })),
    principles: trustedScopePrinciples
  };
}
