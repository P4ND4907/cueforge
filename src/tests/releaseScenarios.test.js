import { describe, expect, it } from 'vitest';
import { buildChainGraph } from '../core/chainGraph.js';
import { evaluateConflictRules } from '../core/conflictDetector.js';
import { buildCueForgeState } from '../core/cueforgeState.js';
import { buildCueForgeReleasePack } from '../core/exportSchema.js';
import { recommendProfile } from '../core/profileEngine.js';
import { calculateReadinessScore } from '../core/readinessScore.js';
import { runPrivacyAudit } from '../privacyAudit.js';
import { browserDeviceFixture } from '../data/testFixtures.js';

const soundDevices = [
  { Name: 'USB microphone' },
  { Name: 'USB DAC headphones' }
];

function bridgeReport(tools = {}) {
  return {
    tools,
    soundDevices,
    mediaDevices: [],
    runningGames: [{ name: 'Counter-Strike 2' }],
    matches: {
      iemOrDac: true,
      hyperx: false,
      virtualRouting: Boolean(tools.voicemeeter?.installed || tools.vbCable?.installed)
    }
  };
}

function fullProofState(overrides = {}) {
  return {
    devices: {
      output: 'USB DAC headphones',
      input: 'USB microphone',
      outputType: 'iem',
      inputType: 'usb-mic'
    },
    chain: { risks: [] },
    calibration: {
      micCheck: { ready: true },
      channelCheck: { passed: true },
      hearingModel: { complete: true },
      blindMatch: { complete: true },
      maskingLab: { complete: true }
    },
    selectedGame: { profileId: 'competitive_fps' },
    exports: { apoConfig: 'Preamp: -4 dB' },
    ...overrides
  };
}

describe('release scenario gates', () => {
  it('scenario 1: clean beginner setup stays honest and asks for output check', () => {
    const readiness = calculateReadinessScore({
      devices: { output: 'Browser headphones', input: 'Browser microphone' },
      calibration: {
        micCheck: { ready: true },
        channelCheck: { passed: false },
        hearingModel: { complete: false },
        blindMatch: { complete: false },
        maskingLab: { complete: false }
      },
      chain: { risks: [] },
      exports: {}
    });

    expect(readiness.score).toBeGreaterThanOrEqual(40);
    expect(readiness.score).toBeLessThanOrEqual(60);
    expect(readiness.tier).toBe('needs_work');
    expect(readiness.warnings).toContain('Left/right/center output check incomplete.');
    expect(readiness.nextActions).toContain('Run channel check.');
  });

  it('scenario 2: proven APO setup reaches match-ready and enables reviewed apply path', () => {
    const state = buildCueForgeState({
      devices: browserDeviceFixture,
      bridgeReport: bridgeReport({
        equalizerApo: { installed: true, displayName: 'Equalizer APO' },
        peace: { installed: true, displayName: 'Peace' },
        steelSeriesSonar: { installed: false },
        voicemeeter: { installed: false },
        vbCable: { installed: false }
      }),
      desktopReady: true,
      eq: Array(10).fill(0),
      hearing: { answered: 8, score: { answered: 8, complete: true } },
      preferenceModel: { roundsCompleted: 6, confidence: 0.6 },
      selfTests: [{ id: 'full-auto-test', status: 'pass' }],
      betaCheckins: [{ id: 'before' }, { id: 'after' }],
      apoConfig: 'Preamp: -4 dB'
    });

    expect(state.readiness.score).toBeGreaterThanOrEqual(80);
    expect(state.applyPath.mode).toBe('review-and-apply');
    expect(state.stateV2.chain.apoDetected).toBe(true);
    expect(state.stateV2.exports.apoConfig).toContain('Preamp');
  });

  it('scenario 3: Sonar plus APO warns about endpoint mismatch', () => {
    const hits = evaluateConflictRules({
      chain: {
        activeCompanions: [
          { name: 'SteelSeries Sonar' },
          { name: 'Equalizer APO' }
        ],
        sonarDetected: true,
        apoDetected: true
      },
      selectedGame: { title: 'Siege' }
    });

    const warning = hits.find((item) => item.id === 'sonar_plus_apo_uncertain_target');
    expect(warning).toBeTruthy();
    expect(warning.detail).toMatch(/APO may be installed on the wrong endpoint/);
    expect(warning.fix).toMatch(/confirm APO is applied/i);
  });

  it('scenario 4: Voicemeeter plus VB-CABLE requires manual route verification', () => {
    const graph = buildChainGraph({
      browserDevices: browserDeviceFixture,
      bridgeReport: bridgeReport({
        voicemeeter: { installed: true, displayName: 'Voicemeeter' },
        vbCable: { installed: true, displayName: 'VB-CABLE' }
      }),
      userSelections: { desktopReady: true, game: 'Tarkov' }
    });

    expect(graph.virtualRoutes.map((route) => route.label)).toEqual(expect.arrayContaining(['Voicemeeter', 'VB-CABLE']));
    expect(graph.problems.map((item) => item.id)).toContain('virtual_route_stack');
    expect(graph.suggestions.join(' ')).toMatch(/verify Windows, Discord, game chat, and stream devices/i);
  });

  it('scenario 5: treble-sensitive competitive player avoids aggressive 4k and 8k boosts', () => {
    const profile = recommendProfile(fullProofState({
      player: { trebleSensitivity: 4, bassPreference: 0 },
      selectedGame: { profileId: 'competitive_fps' }
    }));

    expect(profile.eq[7]).toBeLessThanOrEqual(1);
    expect(profile.eq[8]).toBeLessThanOrEqual(1);
    expect(profile.reason.join(' ')).toMatch(/Reduced treble/);
  });

  it('scenario 6: night mode lowers ceiling, tames bass spikes, and keeps detail audible', () => {
    const profile = recommendProfile(fullProofState({
      selectedGame: { profileId: 'night_mode' }
    }));

    expect(profile.dynamics.limiterCeilingDb).toBeLessThanOrEqual(-3);
    expect(profile.dynamics.explosionTame).toBeGreaterThanOrEqual(0.8);
    expect(profile.eq[0]).toBeLessThanOrEqual(-1);
    expect(profile.eq[6]).toBeGreaterThan(0);
  });

  it('scenario 7: incomplete hearing model cannot apply strong compensation', () => {
    const incomplete = recommendProfile(fullProofState({
      calibration: {
        ...fullProofState().calibration,
        hearingModel: {
          complete: false,
          score: { answered: 2, complete: false },
          compensation: [{ frequency: 8000, averageDb: 6 }]
        }
      }
    }));
    const complete = recommendProfile(fullProofState({
      calibration: {
        ...fullProofState().calibration,
        hearingModel: {
          complete: true,
          score: { answered: 8, complete: true },
          compensation: [{ frequency: 8000, averageDb: 6 }]
        }
      }
    }));

    expect(incomplete.eq[8]).toBeLessThan(complete.eq[8]);
    expect(incomplete.eq[8]).toBeLessThanOrEqual(1);
    expect(incomplete.reason.join(' ')).toMatch(/Skipped hearing compensation/);
  });

  it('scenario 8: release report export stays free of raw private identifiers', () => {
    const state = buildCueForgeState({
      devices: browserDeviceFixture,
      bridgeReport: bridgeReport({
        equalizerApo: { installed: true, displayName: 'Equalizer APO' }
      }),
      desktopReady: true,
      eq: Array(10).fill(0),
      hearing: { answered: 8, score: { answered: 8, complete: true } },
      selfTests: [{ id: 'full-auto-test', status: 'pass' }],
      betaCheckins: [{ id: 'before' }, { id: 'after' }],
      apoConfig: 'Preamp: -4 dB'
    });
    const pack = buildCueForgeReleasePack({
      state: state.releasePack.stateV2 ? state.releasePack : state,
      apoConfig: 'Preamp: -4 dB'
    });
    const audit = runPrivacyAudit([
      { name: 'release pack', payload: pack },
      { name: 'canonical state', payload: state.stateV2 }
    ], { now: new Date('2026-05-23T00:00:00Z') });

    expect(audit.status).toBe('pass');
    expect(audit.leakCount).toBe(0);
  });
});
