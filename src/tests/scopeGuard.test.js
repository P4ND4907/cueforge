import { describe, expect, it } from 'vitest';
import {
  blockedV020Scopes,
  buildScopeBoundarySummary,
  evaluateScopeBoundary,
  findBlockedScopeMatches,
  trustedScopePrinciples
} from '../core/scopeGuard.js';

describe('v0.2.0 scope guard', () => {
  it('tracks every feature that should not ship in v0.2.0', () => {
    expect(blockedV020Scopes.map((item) => item.id)).toEqual([
      'kernel_mode_driver',
      'custom_apo_installer',
      'auto_routing_changes',
      'always_on_background_service',
      'cloud_ai_personalization',
      'aggressive_pitch_shifting',
      'real_money_paid_unlocks',
      'game_memory_reading',
      'anti_cheat_adjacent_hooks',
      'exact_enemy_position_claims'
    ]);
    expect(trustedScopePrinciples).toContain('No hidden driver changes.');
  });

  it('blocks risky feature requests and overclaims', () => {
    const check = evaluateScopeBoundary({
      feature: 'Cloud AI personalization with an always-on background service',
      claims: ['CueForge can hear exact enemy positions automatically.'],
      actions: ['Read game memory for better live intelligence.']
    });

    expect(check.ok).toBe(false);
    expect(check.blockers.map((item) => item.id)).toEqual([
      'always_on_background_service',
      'cloud_ai_personalization',
      'exact_enemy_position_claims',
      'game_memory_reading'
    ]);
    expect(findBlockedScopeMatches('install a custom APO installer')).toHaveLength(1);
  });

  it('allows the trusted local-first v0.2.0 lane', () => {
    const check = evaluateScopeBoundary({
      feature: 'Auto Detect normalizes browser devices and optional desktop bridge data.',
      description: 'Generate readable tuning recommendations, APO config text, redacted reports, and a native engine manifest for later review.'
    });
    const summary = buildScopeBoundarySummary();

    expect(check.ok).toBe(true);
    expect(summary.allowedNow).toContain('safe APO text export');
    expect(summary.blocked).toHaveLength(10);
  });
});
