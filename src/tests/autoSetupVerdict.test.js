import { describe, expect, it } from 'vitest';
import { buildAutoSetupVerdict } from '../core/autoSetupVerdict.js';
import { buildWasapiLoopbackProof } from '../core/wasapiLoopbackProof.js';

const desktopReport = {
  source: 'browser+desktop_bridge',
  confidence: { score: 88, tier: 'strong', requiresExplicitScan: false },
  devices: {
    windowsRenderDevices: [{ label: 'USB DAC Headphones' }],
    windowsCaptureDevices: [{ label: 'HyperX QuadCast' }]
  },
  companions: {
    equalizerApo: { detected: true, label: 'Equalizer APO' },
    discord: { detected: true, label: 'Discord' },
    obs: { detected: false, label: 'OBS Studio' }
  },
  risks: []
};

const cleanConflicts = {
  summary: { high: 0, medium: 0, total: 0 },
  chainHealth: { warnings: [], blockers: [] },
  conflicts: []
};

const readyGameSettings = {
  status: 'ready',
  summary: 'Game output, HRTF, dynamic range, spatial, and voice/chat split are checked.',
  confidence: 92
};

const readySpatial = {
  status: 'ready',
  summary: 'One spatial renderer is selected.',
  confidence: 90
};

const readySoundMatch = {
  completedRounds: 15,
  requiredRounds: 15,
  repeatChecksClean: 4,
  contradictions: 0,
  applyReadiness: { ready: true }
};

function readyInput(overrides = {}) {
  return {
    autoDetectReport: desktopReport,
    conflicts: cleanConflicts,
    gameAudioCheck: readyGameSettings,
    nativeSpatialCompatibility: readySpatial,
    soundMatchResult: readySoundMatch,
    loopbackProof: buildWasapiLoopbackProof({
      status: 'available',
      endpoint: { label: 'USB DAC Headphones', id: 'secret-endpoint-id' },
      defaultRender: 'USB DAC Headphones'
    }),
    desktopReady: true,
    backupAvailable: true,
    profileReady: true,
    starterTuneApplied: true,
    matchFeedback: null,
    ...overrides
  };
}

describe('auto setup verdict', () => {
  it('returns ready when desktop evidence, loopback proof, settings, Sound Match, and backup align', () => {
    const verdict = buildAutoSetupVerdict(readyInput());

    expect(verdict).toMatchObject({
      schema: 'cueforge.auto-setup-verdict.v1',
      status: 'ready',
      safeToApply: true,
      safeToTestInMatch: true
    });
    expect(verdict.headline).toMatch(/ready/i);
    expect(verdict.nextAction.label).toMatch(/play|match|test/i);
    expect(verdict.found.join(' ')).toMatch(/USB DAC Headphones|HyperX QuadCast|Equalizer APO|Discord/i);
    expect(verdict.proof.join(' ')).toMatch(/WASAPI.*available/i);
    expect(JSON.stringify(verdict)).not.toContain('secret-endpoint-id');
  });

  it('keeps browser-only ready honest as a web match test, not Windows endpoint proof', () => {
    const verdict = buildAutoSetupVerdict(readyInput({
      autoDetectReport: {
        source: 'browser',
        confidence: { score: 74, tier: 'partial', requiresExplicitScan: true },
        devices: {
          browserRenderDevices: [{ label: 'USB DAC Headphones' }],
          browserCaptureDevices: [{ label: 'HyperX QuadCast' }]
        },
        companions: {},
        risks: []
      },
      desktopReady: false,
      loopbackProof: buildWasapiLoopbackProof()
    }));

    expect(verdict.status).toBe('ready');
    expect(verdict.safeToApply).toBe(false);
    expect(verdict.safeToTestInMatch).toBe(true);
    expect(verdict.headline).toMatch(/web match test/i);
    expect(verdict.proof.join(' ')).toMatch(/browser-only/i);
    expect(verdict.proof.join(' ')).not.toMatch(/Windows endpoint proof/i);
  });

  it('blocks direct apply when Sound Match is still preview-only', () => {
    const verdict = buildAutoSetupVerdict(readyInput({
      soundMatchResult: {
        completedRounds: 9,
        requiredRounds: 15,
        repeatChecksClean: 2,
        contradictions: 0,
        applyReadiness: { ready: false, reason: 'Preview evidence only.' }
      }
    }));

    expect(verdict.status).toBe('do-not-apply-yet');
    expect(verdict.safeToApply).toBe(false);
    expect(verdict.safeToTestInMatch).toBe(true);
    expect(verdict.nextAction).toMatchObject({
      id: 'sound-match',
      route: 'blindmatch'
    });
    expect(verdict.blockers).toContain('sound-match-apply-gate');
    expect(verdict.problems.join(' ')).toMatch(/Sound Match/i);
  });

  it('routes blocked loopback proof to fixes before claiming desktop endpoint proof', () => {
    const verdict = buildAutoSetupVerdict(readyInput({
      loopbackProof: buildWasapiLoopbackProof({
        status: 'blocked',
        endpoint: { label: 'USB DAC Headphones', id: 'secret-endpoint-id' },
        permissionRequired: true
      })
    }));

    expect(verdict.status).toBe('needs-fixes');
    expect(verdict.safeToApply).toBe(false);
    expect(verdict.nextAction).toMatchObject({
      id: 'loopback-proof',
      route: 'desktop-scan'
    });
    expect(verdict.problems.join(' ')).toMatch(/loopback/i);
    expect(JSON.stringify(verdict)).not.toContain('secret-endpoint-id');
  });

  it('routes desktop-proof game setting blockers to the Windows scan instead of vague settings copy', () => {
    const verdict = buildAutoSetupVerdict(readyInput({
      gameAudioCheck: {
        status: 'needs-review',
        confidence: 44,
        summary: 'Run the Windows scan before calling native spatial compatibility proven.'
      },
      loopbackProof: buildWasapiLoopbackProof(),
      desktopReady: false
    }));

    expect(verdict).toMatchObject({
      status: 'needs-fixes',
      headline: 'Run Windows scan for proof',
      nextAction: {
        id: 'desktop-scan',
        label: 'Run Windows Scan',
        route: 'desktop-scan'
      }
    });
    expect(verdict.problems.join(' ')).toMatch(/Windows scan/i);
  });

  it('prioritizes clipping, missing limiter, and stacked-processing conflicts as do-not-apply', () => {
    const verdict = buildAutoSetupVerdict(readyInput({
      conflicts: {
        summary: { high: 3, medium: 0, total: 3 },
        chainHealth: {
          warnings: [],
          blockers: [
            'Stream clipping risk',
            'Missing stream limiter',
            'Double processing risk'
          ]
        },
        conflicts: [
          { id: 'stream-clipping-risk', severity: 'high', title: 'Stream clipping risk' },
          { id: 'missing-stream-limiter', severity: 'high', title: 'Missing stream limiter' },
          { id: 'double-processing', severity: 'high', title: 'Double processing risk' }
        ]
      }
    }));

    expect(verdict.status).toBe('do-not-apply-yet');
    expect(verdict.safeToApply).toBe(false);
    expect(verdict.safeToTestInMatch).toBe(false);
    expect(verdict.blockers).toEqual(expect.arrayContaining([
      'stream-clipping-risk',
      'missing-stream-limiter',
      'double-processing'
    ]));
    expect(verdict.nextAction.label).toMatch(/fix/i);
  });
});
