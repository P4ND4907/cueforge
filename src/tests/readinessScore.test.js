import { describe, expect, it } from 'vitest';
import { buildAudioChainGraph } from '../core/chainGraph.js';
import { detectAudioConflicts } from '../core/conflictDetector.js';
import { calculateReadinessScore, computeReadinessScoreV2 } from '../core/readinessScore.js';
import { buildProfileEngineV2 } from '../core/profileEngine.js';
import { browserDeviceFixture, desktopBridgeFixture } from '../data/testFixtures.js';

describe('readiness score v2', () => {
  it('calculates the v2 weighted state score from the eight player-proof inputs', () => {
    const readiness = calculateReadinessScore({
      devices: { output: 'USB DAC Headphones' },
      calibration: {
        micCheck: { ready: true },
        channelCheck: { passed: true },
        hearingModel: { complete: true },
        blindMatch: { complete: true },
        maskingLab: { complete: true }
      },
      chain: { risks: [] },
      exports: { apoConfig: 'Preamp: -4 dB' }
    });

    expect(readiness).toEqual({
      score: 100,
      tier: 'match_ready',
      blockers: [],
      warnings: [],
      nextActions: []
    });
  });

  it('keeps incomplete player proof usable but honest', () => {
    const readiness = calculateReadinessScore({
      devices: { output: 'USB DAC Headphones' },
      calibration: {
        micCheck: { ready: false },
        channelCheck: { passed: true },
        hearingModel: { complete: false },
        blindMatch: { complete: true },
        maskingLab: { complete: false }
      },
      chain: { risks: [] },
      exports: {}
    });

    expect(readiness.score).toBe(55);
    expect(readiness.tier).toBe('needs_work');
    expect(readiness.warnings).toContain('Mic readiness not confirmed.');
    expect(readiness.nextActions).toEqual([
      'Run Mic Lab.',
      'Complete Hearing Model.',
      'Run Masking Lab.',
      'Generate export pack.'
    ]);
  });

  it('promotes a complete chain with proof toward player-test-ready', () => {
    const graph = buildAudioChainGraph({ devices: browserDeviceFixture, bridgeReport: desktopBridgeFixture, desktopReady: true });
    const conflicts = detectAudioConflicts({ graph, eq: Array(10).fill(0), hearing: { answered: 6 }, betaCheckins: [{}, {}] });
    const profile = buildProfileEngineV2({ graph, conflicts, hearing: { answered: 6 } });
    const readiness = computeReadinessScoreV2({
      graph,
      conflicts,
      profile,
      hearing: { answered: 6 },
      exportReady: true,
      selfTests: [{ status: 'pass' }],
      betaCheckins: [{}, {}]
    });

    expect(readiness.score).toBeGreaterThanOrEqual(70);
    expect(readiness.tier).toBe('match_ready');
    expect(readiness.status).toBe('player-test-ready');
    expect(readiness.gates.find((gate) => gate.id === 'masking-lab').ready).toBe(true);
    expect(readiness.nextActions.length).toBeLessThanOrEqual(5);
  });
});
