import { describe, expect, it } from 'vitest';
import { buildGameAudioSettingsCheck } from '../core/gameAudioSettingsCheck.js';

describe('game audio settings check', () => {
  it('asks safe user-facing questions instead of pretending to inspect game settings', () => {
    const check = buildGameAudioSettingsCheck({
      game: 'Tarkov / Siege / COD'
    });

    expect(check.schema).toBe('cueforge.game-audio-settings-check.v1');
    expect(check.questions.map((question) => question.id)).toEqual([
      'hrtf',
      'windowsSpatial',
      'sonarSpatial',
      'gameOutput',
      'dynamicRange',
      'voiceChatSplit'
    ]);
    expect(check.questions[0].helper).toMatch(/does not inspect protected game files or memory/i);
    expect(check.status).toBe('needs-review');
    expect(check.warnings.map((warning) => warning.id)).toContain('desktop-evidence-missing');
  });

  it('catches stacked spatial, route split, and night mode before Sound Match apply', () => {
    const check = buildGameAudioSettingsCheck({
      game: 'Rainbow Six Siege',
      settings: {
        hrtf: 'on',
        windowsSpatial: 'on',
        sonarSpatial: 'on',
        gameOutput: 'USB DAC Headphones',
        dynamicRange: 'night',
        voiceChatSplit: 'split-output'
      },
      autoDetectReport: {
        source: 'browser+desktop_bridge',
        mode: 'desktop-assisted',
        companions: {
          sonar: { detected: true },
          dolby: { detected: true },
          voicemeeter: { detected: true }
        }
      }
    });

    expect(check.progress).toMatchObject({
      completed: 6,
      total: 6,
      label: '6/6 settings checked'
    });
    expect(check.status).toBe('needs-fix');
    expect(check.warnings.map((warning) => warning.id)).toEqual(expect.arrayContaining([
      'double-spatial-risk',
      'sonar-output-mismatch',
      'night-mode-before-tuning',
      'chat-game-route-needs-proof'
    ]));
    expect(check.summary).toMatch(/Pick one spatial layer/i);
  });

  it('marks the settings ready when answers, desktop evidence, and Sound Match align', () => {
    const check = buildGameAudioSettingsCheck({
      game: 'Valorant / CS2',
      settings: {
        hrtf: 'off',
        windowsSpatial: 'off',
        sonarSpatial: 'off',
        gameOutput: 'USB DAC Headphones',
        dynamicRange: 'headphones',
        voiceChatSplit: 'same-output'
      },
      autoDetectReport: {
        source: 'browser+desktop_bridge',
        mode: 'desktop-assisted',
        companions: {}
      },
      soundMatchResult: {
        applyReadiness: { ready: true }
      }
    });

    expect(check.status).toBe('ready');
    expect(check.confidence).toBeGreaterThanOrEqual(90);
    expect(check.warnings).toEqual([]);
    expect(check.summary).toMatch(/one real match test/i);
  });
});
