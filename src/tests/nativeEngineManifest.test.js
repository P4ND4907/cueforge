import { describe, expect, it } from 'vitest';
import { buildNativeEngineManifest, calculateSafePreamp } from '../engines/nativeEngineManifest.js';

describe('native engine manifest', () => {
  it('builds the future native DSP contract from canonical state', () => {
    const manifest = buildNativeEngineManifest({
      recommendedProfile: {
        eq: [-1, 1.5, 0.5, -2, -1, 0.5, 2.5, 3.2, 1.2, -0.5],
        dynamics: { transientClarity: 0.75 },
        spatial: { hrtf: 'optional', mode: 'competitive_width_safe' }
      },
      readiness: { tier: 'match_ready' },
      conflicts: { summary: { high: 0 } }
    });

    expect(manifest.schema).toBe('cueforge.native-engine-manifest.v1');
    expect(manifest.version).toBe('0.1');
    expect(manifest.sampleRate).toBe(48000);
    expect(manifest.blockSizeTarget).toBe(128);
    expect(manifest.channels).toBe(2);
    expect(manifest.ready).toBe(true);
    expect(manifest.modules.map((module) => module.id)).toEqual(['preamp', 'peq', 'limiter', 'dynamics', 'spatial']);
    expect(manifest.modules.find((module) => module.id === 'preamp').gainDb).toBe(-4.2);
    expect(manifest.modules.find((module) => module.id === 'limiter').enabled).toBe(true);
    expect(manifest.modules.find((module) => module.id === 'spatial').enabled).toBe(true);
    expect(manifest.safety).toMatchObject({
      maxBoostDb: 6,
      maxHearingBoostDb: 3,
      limiterRequired: true,
      clippingGuard: true
    });
    expect(manifest.plans.mic.modules).toContain('rnnoise_future_adapter');
    expect(manifest.plans.mic.futureBackend).toMatchObject({
      id: 'rnnoise',
      enabled: false,
      appliesHiddenProcessing: false
    });
    expect(manifest.plans.spatial.warning).toContain('true object-level occlusion');
    expect(manifest.plans.spatial.claims.canClaimTrueObjectOcclusionFromStereoMix).toBe(false);
    expect(manifest.nativeHarness.schema).toBe('cueforge.native-capture-harness.v1');
    expect(manifest.nativeHarness.primaryBackend).toBe('miniaudio');
    expect(manifest.nativeHarness.modes.map((mode) => mode.id)).toContain('wasapi-loopback-capture');
    expect(manifest.nativeHarness.safety.canModifySystemState).toBe(false);
  });

  it('keeps legacy buildCueForgeState callers working', () => {
    const manifest = buildNativeEngineManifest({
      state: {
        profile: {
          recommendation: {
            eq: [0, 7, -1],
            dynamics: null,
            spatial: { hrtf: 'off' }
          }
        },
        readiness: { status: 'usable-chain-uncertain' },
        conflicts: { summary: { high: 1 } }
      }
    });

    expect(manifest.ready).toBe(false);
    expect(manifest.modules.find((module) => module.id === 'peq').filters).toEqual([0, 6, -1]);
    expect(manifest.modules.find((module) => module.id === 'spatial').enabled).toBe(false);
    expect(manifest.plans.dsp.stages.length).toBeGreaterThan(0);
  });

  it('calculates conservative preamp from max positive boost', () => {
    expect(calculateSafePreamp([-2, 0, 3.5])).toBe(-4.5);
    expect(calculateSafePreamp([-2, -1, 0])).toBe(-1);
    expect(calculateSafePreamp([12])).toBe(-7);
  });

  it('keeps miniaudio as a prototype-only backend plan', () => {
    const manifest = buildNativeEngineManifest();

    expect(manifest.prototypeBackend.firstPrototype).toBe('miniaudio');
    expect(manifest.prototypeBackend.shipAsSystemWideApp).toBe(false);
    expect(manifest.prototypeBackend.allowedUses).toContain('offline audio test rendering');
    expect(manifest.prototypeBackend.allowedUses).toContain('explicit WASAPI loopback measurement');
    expect(manifest.prototypeBackend.allowedUses).toContain('device enumeration experiments');
    expect(manifest.prototypeBackend.blockedUses).toContain('silent driver changes');
  });
});
