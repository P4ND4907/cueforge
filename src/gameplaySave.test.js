import { describe, expect, it } from 'vitest';
import {
  appendGameplaySnapshot,
  createGameplaySnapshot,
  normalizeGameplaySaveSettings,
  shouldSaveGameplaySnapshot
} from './gameplaySave.js';

describe('gameplay save', () => {
  it('normalizes settings to lightweight bounds', () => {
    expect(normalizeGameplaySaveSettings({ intervalSeconds: 1, maxSnapshots: 100 })).toEqual({
      enabled: true,
      performanceMode: true,
      intervalSeconds: 10,
      maxSnapshots: 30
    });
  });

  it('creates small gameplay snapshots', () => {
    const snapshot = createGameplaySnapshot({
      eq: [1.234, -2.345],
      selectedGame: 'Siege',
      selectedSourceProfile: 'iemFps',
      now: new Date('2026-05-22T00:00:00Z')
    });

    expect(snapshot.schema).toBe('cueforge.gameplay-save.v1');
    expect(snapshot.eq).toEqual([1.23, -2.35]);
    expect(JSON.stringify(snapshot)).not.toMatch(/password|phone|dob/i);
  });

  it('trims old snapshots', () => {
    const snapshots = Array.from({ length: 5 }, (_, index) => ({ index }));
    expect(appendGameplaySnapshot(snapshots, { index: 5 }, 3)).toEqual([{ index: 3 }, { index: 4 }, { index: 5 }]);
  });

  it('throttles automatic writes', () => {
    expect(shouldSaveGameplaySnapshot({ lastSavedAt: 1000, now: 5000, intervalSeconds: 10 })).toBe(false);
    expect(shouldSaveGameplaySnapshot({ lastSavedAt: 1000, now: 12000, intervalSeconds: 10 })).toBe(true);
  });
});
