import { describe, expect, it } from 'vitest';
import { EfficientMonitor } from '../shared/audio/EfficientMonitor.js';
import { resetPerformanceProfile, setPerformanceProfile } from '../settings/performanceSettings.js';

describe('EfficientMonitor', () => {
  it('throttles updates according to the current performance profile', () => {
    resetPerformanceProfile();
    setPerformanceProfile('high');
    const scheduled = [];
    const monitor = new EfficientMonitor({
      scheduler: (callback, delay) => {
        scheduled.push({ callback, delay });
        return scheduled.length;
      },
      cancelScheduler: () => {}
    });
    const updates = [];

    const session = monitor.start((event) => updates.push(event));

    expect(session.running).toBe(true);
    expect(updates[0]).toMatchObject({ profile: 'high', tick: 1 });
    expect(scheduled[0].delay).toBe(50);

    scheduled[0].callback();
    expect(updates[1]).toMatchObject({ profile: 'high', tick: 2 });

    session.stop();
  });

  it('does not start a monitor loop in game mode', () => {
    setPerformanceProfile('game');
    const scheduled = [];
    const monitor = new EfficientMonitor({
      scheduler: (callback, delay) => {
        scheduled.push({ callback, delay });
        return scheduled.length;
      }
    });

    const session = monitor.start(() => {});

    expect(session).toMatchObject({
      running: false,
      profile: 'game',
      reason: 'monitoring-disabled'
    });
    expect(scheduled).toEqual([]);
    resetPerformanceProfile();
  });
});
