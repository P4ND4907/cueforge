import { describe, expect, it } from 'vitest';
import { buildPermissionRecovery, formatPermissionRecoverySteps, normalizePermissionState } from './permissionRecovery.js';

describe('permission recovery', () => {
  it('normalizes common browser permission states', () => {
    expect(normalizePermissionState('granted')).toBe('granted');
    expect(normalizePermissionState('blocked or skipped')).toBe('blocked');
    expect(normalizePermissionState('Browser audio APIs are missing.')).toBe('unsupported');
  });

  it('gives concrete recovery steps for blocked mic access', () => {
    const recovery = buildPermissionRecovery({ feature: 'microphone', state: 'blocked', browserName: 'Chrome' });

    expect(recovery.status).toBe('blocked');
    expect(recovery.level).toBe('needs-action');
    expect(recovery.primaryAction).toContain('Allow');
    expect(formatPermissionRecoverySteps(recovery)).toContain('address bar');
  });

  it('keeps desktop scan and browser permission boundaries explicit', () => {
    const recovery = buildPermissionRecovery({ feature: 'setup-mic', state: 'unsupported', desktopReady: true });

    expect(recovery.status).toBe('unsupported');
    expect(recovery.detail).toContain('desktop shell');
    expect(recovery.detail).toContain('browser mic capture');
  });
});
