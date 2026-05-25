import { describe, expect, it } from 'vitest';
import { buildCommandCenterSummary, commandCenterFlow, routeForAction } from '../core/commandCenterFlow.js';

const baseState = {
  chainGraph: {
    summary: {
      inputs: 1,
      outputs: 1,
      companions: 2,
      applyTargets: 1
    }
  },
  conflicts: {
    summary: {
      high: 0
    },
    chainHealth: {
      warnings: ['Sonar + APO detected. Confirm target endpoint.'],
      blockers: [],
      nextAction: 'Run "Confirm APO Path" test.'
    },
    conflicts: []
  },
  readiness: {
    score: 78,
    status: 'ready-with-minor-warnings',
    gates: [
      { id: 'channel-check', ready: true },
      { id: 'mic-readiness', ready: true },
      { id: 'hearing-model', ready: false },
      { id: 'blind-match', ready: false },
      { id: 'masking-lab', ready: false }
    ]
  },
  profile: {
    recommendation: {
      id: 'competitive_fps_personalized',
      label: 'Competitive FPS',
      game: 'Tarkov / Siege / COD',
      explanation: 'Personalized from setup state.'
    }
  },
  stateV2: {
    selectedGame: {
      title: 'Tarkov / Siege / COD'
    },
    recommendedProfile: {
      id: 'competitive_fps_personalized'
    },
    exports: {
      apoConfig: 'Preamp: -4.5 dB'
    }
  },
  engine: {
    schema: 'cueforge.native-engine-manifest.v1'
  },
  applyPath: {
    mode: 'review-and-apply',
    reason: 'Apply target detected; user still reviews before native/apply steps.'
  }
};

describe('command center flow', () => {
  it('keeps the guided CueForge flow in the expected order', () => {
    expect(commandCenterFlow.map((step) => step.label)).toEqual([
      'Start',
      'Setup Command Center',
      'Auto Detect',
      'Chain Graph',
      'Conflict Fix',
      'Output Check',
      'Mic Check',
      'Hearing Model',
      'Choose Game / Genre',
      'Blind Match',
      'Masking Lab',
      'Profile Recommendation',
      'Engine Preview',
      'Export / Apply',
      'Player Trial',
      'Report / Audio DNA'
    ]);
  });

  it('builds the six home cards from readiness, profile, chain, and apply state', () => {
    const summary = buildCommandCenterSummary(baseState, {
      lastTrial: {
        feedback: {
          score: 82,
          status: 'testable'
        }
      },
      lastReport: { schema: 'cueforge.issue-report.v1' }
    });

    expect(summary.setupHealth.copy).toBe('CueForge Setup Health: 78/100');
    expect(summary.currentMode).toBe('Competitive FPS - personalized');
    expect(summary.mainWarning).toBe('Sonar + APO detected. Confirm target endpoint.');
    expect(summary.nextBestAction).toBe('Run "Confirm APO Path" test.');
    expect(summary.operatingQuestions.map((item) => item.id)).toEqual([
      'hardware-software',
      'active-route',
      'chain-conflicts',
      'tests-replay',
      'safest-next-step'
    ]);
    expect(summary.operatingQuestions.find((item) => item.id === 'hardware-software').value).toBe('1 output / 1 input / 2 layers');
    expect(summary.operatingQuestions.find((item) => item.id === 'chain-conflicts').value).toBe('0 blockers / 1 warning');
    expect(summary.operatingQuestions.find((item) => item.id === 'safest-next-step').route).toBe('detect');
    expect(summary.cards).toHaveLength(6);
    expect(summary.cards.map((card) => card.label)).toEqual([
      'Setup Health',
      'Active Profile',
      'Audio Chain',
      'Next Best Action',
      'Last Match Feedback',
      'Export / Apply Status'
    ]);
    expect(summary.cards.find((card) => card.id === 'last-match-feedback').value).toBe('82/100');
    expect(summary.cards.find((card) => card.id === 'export-apply-status').value).toBe('Review And Apply');
  });

  it('marks the guided flow with useful next states', () => {
    const summary = buildCommandCenterSummary(baseState);
    const byId = Object.fromEntries(summary.flow.map((step) => [step.id, step]));

    expect(byId['auto-detect'].status).toBe('done');
    expect(byId['conflict-fix'].status).toBe('done');
    expect(byId['output-check'].status).toBe('done');
    expect(byId['hearing-model'].status).toBe('next');
    expect(byId['blind-match'].status).toBe('next');
    expect(byId['engine-preview'].status).toBe('done');
  });

  it('routes common next actions to the right page', () => {
    expect(routeForAction('Run Confirm APO Path.')).toBe('detect');
    expect(routeForAction('Run Mic Lab.')).toBe('mic');
    expect(routeForAction('Complete Hearing Model.')).toBe('hearing');
    expect(routeForAction('Generate export pack.')).toBe('export');
  });
});
