import { describe, expect, it } from 'vitest';
import {
  applyGamerPreset,
  buildDefaultGamerHubState,
  buildEpicGamerAudioAssessment,
  epicBlueprintSafetyBoundary,
  enhancerDetectionTargets,
  evaluateEpicGamerAudioConflicts,
  gamerAudioChannels,
  gamerPresets,
  getNextEpicBuildSlices,
  summarizeEpicGamerBlueprint,
  validateEpicGamerBlueprint
} from '../data/epicGamerAudioBlueprint.js';

describe('epic gamer audio blueprint', () => {
  it('turns the uploaded blueprint into a tested CueForge contract', () => {
    const summary = summarizeEpicGamerBlueprint();

    expect(summary).toMatchObject({
      schema: 'cueforge.epic-gamer-audio-blueprint.v1',
      channelCount: 7,
      presetCount: 6,
      enhancerTargetCount: 11,
      phaseCount: 4
    });
    expect(summary.channelIds).toEqual([
      'game',
      'voice',
      'mic',
      'music',
      'browser',
      'streamMix',
      'headphonesOutput'
    ]);
    expect(summary.releaseGates).toContain('npm run test:ui');
    expect(summary.releaseGates).toContain('npm run export:redaction-check');
    expect(summary.safetyBoundary).toEqual(epicBlueprintSafetyBoundary);
  });

  it('validates required channels, controls, presets, and no hidden native changes', () => {
    const result = validateEpicGamerBlueprint();

    expect(result).toEqual({ ok: true, issues: [] });
    expect(gamerPresets.every((preset) => preset.requiresLimiter)).toBe(true);
    expect(gamerPresets.every((preset) => preset.hiddenNativeChanges === false)).toBe(true);
    expect(gamerPresets.every((preset) => preset.defaultChannelDeltas.streamMix.limiter.enabled)).toBe(true);
    expect(gamerAudioChannels.every((channel) => channel.controls.length > 0)).toBe(true);
  });

  it('keeps the blueprint inside the local-first safety boundary', () => {
    expect(epicBlueprintSafetyBoundary).toEqual({
      localFirst: true,
      noFakeEnabledControls: true,
      noHiddenNativeRouting: true,
      noSilentDriverChanges: true,
      noSilentSystemApply: true,
      noUnsafePresetBehavior: true,
      noRawAudioExportByDefault: true
    });
  });

  it('builds a real default hub state instead of fake UI buttons', () => {
    const state = buildDefaultGamerHubState();

    expect(state.schema).toBe('cueforge.gamer-audio-hub-state.v1');
    expect(Object.keys(state.channels)).toEqual([
      'game',
      'voice',
      'mic',
      'music',
      'browser',
      'streamMix',
      'headphonesOutput'
    ]);
    expect(state.channels.game.controls.gain).toBe(0);
    expect(state.channels.streamMix.controls.limiter).toMatchObject({ enabled: true, ceilingDb: -1 });
    expect(Object.keys(state.enhancerLinks)).toHaveLength(enhancerDetectionTargets.length);
  });

  it('applies safe presets without mutating original state', () => {
    const base = buildDefaultGamerHubState();
    const result = applyGamerPreset(base, 'safeHearing');

    expect(result.applied).toBe(true);
    expect(base.channels.game.controls.gain).toBe(0);
    expect(result.state.channels.game.controls.gain).toBeLessThanOrEqual(0);
    expect(result.state.channels.headphonesOutput.controls.limiter.ceilingDb).toBeLessThanOrEqual(-4);
    expect(result.state.selectedPresetId).toBe('safeHearing');
  });

  it('keeps FPS Competitive spatial safe by default', () => {
    const { state } = applyGamerPreset(buildDefaultGamerHubState(), 'fpsCompetitive');

    expect(state.channels.headphonesOutput.controls.spatialPolicy).toMatchObject({
      mode: 'safe-stereo',
      externalHrtfAllowed: false
    });
    expect(state.channels.streamMix.controls.limiter.enabled).toBe(true);
  });

  it('detects the key gamer audio conflict stack', () => {
    const { state } = applyGamerPreset(buildDefaultGamerHubState(), 'fpsCompetitive');
    state.enhancerLinks.dolbyAtmos.state = 'detected';
    state.enhancerLinks.dtsHeadphoneX.state = 'detected';
    state.enhancerLinks.equalizerApo.state = 'detected';
    state.enhancerLinks.nvidiaBroadcast.state = 'detected';
    state.enhancerLinks.discordNoiseSuppression.state = 'detected';
    state.channels.streamMix.controls.limiter.enabled = false;
    state.channels.game.controls.eq = [4, 4, 3.5, 0, 0, 0, 0, 0, 0, 0];

    const conflicts = evaluateEpicGamerAudioConflicts({
      state,
      metrics: { streamPeakDb: -0.5, latencyMs: 45, bassMaskingRisk: true },
      selectedGame: { externalHrtfEnabled: true }
    }).map((item) => item.id);

    expect(conflicts).toEqual(expect.arrayContaining([
      'double-spatial-audio',
      'double-eq-risk',
      'stacked-noise-suppression',
      'missing-stream-limiter',
      'stream-clipping-risk',
      'bass-masking-footsteps',
      'latency-budget-fail'
    ]));
  });

  it('produces command-center-ready assessment copy', () => {
    const state = buildDefaultGamerHubState();
    state.channels.streamMix.controls.limiter.enabled = false;

    const assessment = buildEpicGamerAudioAssessment({ state });

    expect(assessment.schema).toBe('cueforge.epic-gamer-audio-assessment.v1');
    expect(assessment.status).toBe('needs-fix');
    expect(assessment.score).toBeLessThan(100);
    expect(assessment.nextBestAction).toContain('Stream Mix limiter');
  });

  it('keeps the first build path focused on a working vertical slice', () => {
    expect(getNextEpicBuildSlices(5)).toEqual([
      {
        phaseId: 'phase-1-working-hub',
        task: 'dashboard',
        proofGate: 'User can pick devices, move channel controls, apply a safe preset, reload, and see persisted state.'
      },
      {
        phaseId: 'phase-1-working-hub',
        task: 'device-selection',
        proofGate: 'User can pick devices, move channel controls, apply a safe preset, reload, and see persisted state.'
      },
      {
        phaseId: 'phase-1-working-hub',
        task: 'channel-strips',
        proofGate: 'User can pick devices, move channel controls, apply a safe preset, reload, and see persisted state.'
      },
      {
        phaseId: 'phase-1-working-hub',
        task: 'preset-engine',
        proofGate: 'User can pick devices, move channel controls, apply a safe preset, reload, and see persisted state.'
      },
      {
        phaseId: 'phase-1-working-hub',
        task: 'settings-persistence',
        proofGate: 'User can pick devices, move channel controls, apply a safe preset, reload, and see persisted state.'
      }
    ]);
  });
});
