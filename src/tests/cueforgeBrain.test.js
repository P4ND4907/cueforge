import { describe, expect, it } from 'vitest';
import { buildCueForgeBrain, cueforgeDifferentiator, summarizeCueForgeBrain } from '../core/cueforgeBrain.js';
import { buildCueForgeState } from '../core/cueforgeState.js';
import { buildPreferenceModelFromChoices } from '../core/preferenceModel.js';
import { browserDeviceFixture, desktopBridgeFixture } from '../data/testFixtures.js';

function builtPlayerState(overrides = {}) {
  return buildCueForgeState({
    devices: browserDeviceFixture,
    bridgeReport: desktopBridgeFixture,
    desktopReady: true,
    eq: Array(10).fill(0),
    game: 'Rainbow Six Siege',
    hearing: { complete: true, score: { answered: 8, complete: true } },
    preferenceModel: buildPreferenceModelFromChoices({
      footstep_vs_comfort: 'a',
      wide_vs_center: 'b',
      detail_vs_fatigue: 'a'
    }),
    selfTests: [{ id: 'browser-audio', status: 'pass' }],
    betaCheckins: [{ id: 'before' }, { id: 'after' }],
    apoConfig: 'Preamp: -4 dB',
    ...overrides
  });
}

describe('CueForge Brain differentiator', () => {
  it('connects chain proof, personal preference, conflict health, game intent, safe export, local evidence, and native readiness', () => {
    const state = builtPlayerState();
    const brain = state.brain;

    expect(brain.schema).toBe('cueforge.brain.v1');
    expect(brain.differentiator).toBe(cueforgeDifferentiator.id);
    expect(brain.label).toBe('Audio chain verifier + personal sound engine');
    expect(brain.score).toBeGreaterThanOrEqual(70);
    expect(brain.pillars.map((pillar) => pillar.id)).toEqual([
      'chain-verifier',
      'personal-sound-engine',
      'conflict-doctor',
      'game-intent',
      'safe-export-apply',
      'local-evidence',
      'native-ready-brain'
    ]);
    expect(brain.pillars.find((pillar) => pillar.id === 'chain-verifier').proof.join(' ')).toMatch(/Desktop bridge/i);
    expect(brain.pillars.find((pillar) => pillar.id === 'personal-sound-engine').proof.join(' ')).toMatch(/preference/i);
    expect(brain.pillars.find((pillar) => pillar.id === 'safe-export-apply').proof.join(' ')).toMatch(/explicit/i);
    expect(state.releasePack.files['cueforge-brain.json']).toContain('audio-chain-verifier-personal-sound-engine');
    expect(state.releasePack.files['cueforge-setup-assessment.json']).toContain('cueforge.setup-assessment-snapshot.v1');
    expect(state.releasePack.files['cueforge-setup-assessment.json']).not.toMatch(/"deviceId"|"groupId"|C:\\Users/i);
  });

  it('acts like an audio doctor when routing and spatial layers make the chain unproven', () => {
    const messyState = builtPlayerState({
      devices: [],
      bridgeReport: {
        tools: {
          voicemeeter: { installed: true },
          vbCable: { installed: true },
          dolbyAccess: { installed: true },
          razerThx: { installed: true }
        },
        soundDevices: []
      },
      desktopReady: true,
      betaCheckins: []
    });
    const conflictDoctor = messyState.brain.pillars.find((pillar) => pillar.id === 'conflict-doctor');

    expect(conflictDoctor.status).toBe('blocked');
    expect(messyState.brain.tier).toBe('needs-foundation');
    expect(messyState.brain.nextActions.join(' ')).toMatch(/Fix blocker|Conflict|Detect|Output|Mic/i);
  });

  it('keeps the industry contrast honest instead of claiming magic enemy location or hidden driver changes', () => {
    const brain = buildCueForgeBrain(builtPlayerState());
    const summary = summarizeCueForgeBrain(brain);

    expect(brain.boundary).toMatch(/does not silently change Windows settings/i);
    expect(brain.boundary).toMatch(/does not.*claim exact enemy positions/i);
    expect(brain.competitorContrast.join(' ')).toMatch(/Not just EQ/i);
    expect(brain.competitorContrast.join(' ')).toMatch(/Not a magic enemy-location claim/i);
    expect(summary.title).toBe('Audio chain verifier + personal sound engine');
    expect(summary.nextActions.length).toBeGreaterThan(0);
  });
});
