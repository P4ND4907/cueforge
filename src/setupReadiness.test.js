import { describe, expect, it } from 'vitest';
import { computeSetupReadiness } from './setupReadiness.js';

describe('setup readiness', () => {
  it('marks a complete setup ready for player testing', () => {
    const readiness = computeSetupReadiness({
      audioApi: true,
      micPermission: 'granted',
      deviceCount: 3,
      bridgeLoaded: true,
      apoFound: true,
      selfTests: [{ name: 'Browser audio APIs', status: 'pass' }],
      reportReady: true,
      hearingAnswered: 6
    });

    expect(readiness.status).toBe('player-test-ready');
    expect(readiness.score).toBe(100);
    expect(readiness.blockers).toHaveLength(0);
  });

  it('keeps mic permission and self-test as player-test blockers', () => {
    const readiness = computeSetupReadiness({
      audioApi: true,
      micPermission: 'prompt',
      deviceCount: 2,
      bridgeLoaded: true,
      apoFound: true,
      selfTests: [],
      reportReady: false,
      hearingAnswered: 0
    });

    expect(readiness.status).not.toBe('player-test-ready');
    expect(readiness.blockers.map((item) => item.id)).toContain('mic');
    expect(readiness.blockers.map((item) => item.id)).toContain('self-test');
    expect(readiness.nextActions[0]).toContain('Grant mic permission');
  });
});
