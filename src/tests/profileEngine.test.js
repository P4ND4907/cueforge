import { describe, expect, it } from 'vitest';
import { buildAudioChainGraph } from '../core/chainGraph.js';
import { detectAudioConflicts } from '../core/conflictDetector.js';
import { buildProfileEngineV2, recommendProfile } from '../core/profileEngine.js';
import { buildPreferenceModelFromChoices } from '../core/preferenceModel.js';
import { genreForGame, genreProfiles } from '../data/genreProfiles.js';
import { browserDeviceFixture, desktopBridgeFixture } from '../data/testFixtures.js';

describe('profile engine v2', () => {
  it('ships an intent map beyond FPS', () => {
    expect(genreProfiles).toHaveLength(14);
    expect(genreProfiles.map((profile) => profile.id)).toEqual([
      'competitive_fps',
      'battle_royale',
      'extraction_shooter',
      'racing',
      'horror_immersion',
      'open_world_rpg',
      'mmo_raid',
      'fighting_game',
      'rhythm_game',
      'story_dialogue',
      'night_mode',
      'streaming_creator',
      'accessibility_hearing_support',
      'comfort_long_session'
    ]);
    expect(genreForGame('Dead Space').id).toBe('horror_immersion');
    expect(genreForGame('F1 26').id).toBe('racing');
  });

  it('builds one profile brain from game, chain, conflicts, and hearing progress', () => {
    const graph = buildAudioChainGraph({ devices: browserDeviceFixture, bridgeReport: desktopBridgeFixture, desktopReady: true });
    const conflicts = detectAudioConflicts({ graph, eq: Array(10).fill(0), hearing: { answered: 6 }, betaCheckins: [{}, {}] });
    const profile = buildProfileEngineV2({
      eq: [-1, 1, 0, -1, -1, 0, 2, 3, 1, 0],
      game: 'Valorant / CS2',
      graph,
      conflicts,
      hearing: { answered: 6 },
      selectedSourceProfile: 'iemFps'
    });

    expect(profile.schema).toBe('cueforge.profile-engine.v2');
    expect(profile.recommendation.eq).toHaveLength(10);
    expect(profile.recommendation.genreProfileId).toBe('competitive_fps');
    expect(profile.recommendation.intent).toBe('cue_priority');
    expect(profile.identity.join(' ')).toMatch(/cue|bass|guided|export|baseline/);
    expect(profile.confidence).toBeGreaterThan(40);
  });

  it('personalizes a non-FPS profile from player hearing, blind match, and chain context', () => {
    const recommendation = recommendProfile({
      player: {
        trebleSensitivity: 3,
        bassPreference: 2
      },
      devices: {
        output: 'USB DAC with IEM',
        input: 'USB microphone',
        outputType: 'iem'
      },
      chain: {
        risks: [
          {
            id: 'sonar_plus_apo_uncertain_target',
            severity: 'medium',
            title: 'Sonar + APO detected'
          }
        ]
      },
      calibration: {
        micCheck: { ready: true },
        channelCheck: { passed: true },
        hearingModel: {
          complete: true,
          compensation: [{ frequency: 8000, averageDb: 2.5 }]
        },
        blindMatch: {
          complete: true,
          preferredCurve: Array(10).fill(0).map((_, index) => (index === 2 ? 3 : 0))
        },
        maskingLab: { complete: true }
      },
      selectedGame: {
        profileId: 'horror_immersion'
      },
      exports: {
        apoConfig: 'Preamp: -3 dB'
      }
    });

    expect(recommendation.id).toBe('horror_immersion_personalized');
    expect(recommendation.eq).toHaveLength(10);
    expect(recommendation.spatial.mode).toBe('immersive_width');
    expect(recommendation.reason.join(' ')).toMatch(/Base mode|treble|bass|Hearing|Blind Match|Chain/);
    expect(recommendation.confidence).toBeGreaterThan(70);
    expect(Math.max(...recommendation.eq)).toBeLessThanOrEqual(2.5);
  });

  it('feeds This or That choices into the profile recommendation brain', () => {
    const preferenceModel = buildPreferenceModelFromChoices({
      footstep_vs_comfort: 'a',
      bass_vs_comms: 'b',
      wide_vs_center: 'b',
      detail_vs_fatigue: 'b',
      direction_vs_body: 'a'
    });
    const recommendation = recommendProfile({
      devices: {
        output: 'USB DAC with IEM',
        outputType: 'iem'
      },
      chain: {
        risks: []
      },
      calibration: {
        channelCheck: { passed: true },
        micCheck: { ready: true },
        preferenceModel
      },
      selectedGame: {
        profileId: 'competitive_fps'
      },
      exports: {
        apoConfig: 'Preamp: -3 dB'
      }
    });

    expect(recommendation.reason.join(' ')).toContain('This or That preference model');
    expect(recommendation.dynamics.fatigueGuard).toBeGreaterThan(0.25);
    expect(recommendation.spatial.mode).toBe('center_locked_personal');
    expect(recommendation.eq[6]).toBeGreaterThan(1.5);
  });
});
