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
      'nativePlatformSpatial',
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
        nativePlatformSpatial: 'on',
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
          audioscenic: { detected: true },
          voicemeeter: { detected: true }
        }
      }
    });

    expect(check.progress).toMatchObject({
      completed: 7,
      total: 7,
      label: '7/7 settings checked'
    });
    expect(check.status).toBe('needs-fix');
    expect(check.warnings.map((warning) => warning.id)).toEqual(expect.arrayContaining([
      'double-spatial-risk',
      'native-spatial-stack-blocked',
      'sonar-output-mismatch',
      'night-mode-before-tuning',
      'chat-game-route-needs-proof'
    ]));
    expect(check.nativeSpatial).toMatchObject({
      schema: 'cueforge.native-spatial-compatibility.v1',
      status: 'needs-fix',
      rendererMode: 'stacked-renderers'
    });
    expect(check.nativeSpatial.activeRenderers.map((renderer) => renderer.category)).toEqual(expect.arrayContaining([
      'game-native',
      'windows-spatial',
      'oem-apo',
      'headset-suite'
    ]));
    expect(check.nativeSpatial.warnings.map((warning) => warning.id)).toContain('stacked-spatial-renderers');
    expect(check.summary).toMatch(/Pick exactly one spatial renderer/i);
  });

  it('marks the settings ready when answers, desktop evidence, and Sound Match align', () => {
    const check = buildGameAudioSettingsCheck({
      game: 'Valorant / CS2',
      settings: {
        hrtf: 'off',
        windowsSpatial: 'off',
        nativePlatformSpatial: 'off',
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
    expect(check.nativeSpatial).toMatchObject({
      status: 'ready',
      rendererMode: 'safe-stereo'
    });
    expect(check.summary).toMatch(/one real match test/i);
  });
});
