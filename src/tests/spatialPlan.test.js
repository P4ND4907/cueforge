import { describe, expect, it } from 'vitest';
import { buildSpatialPlan, honestSpatialModes, spatialTruthWarning } from '../engines/spatialPlan.js';

describe('spatial plan', () => {
  it('publishes honest spatial modes without fake surround promises', () => {
    expect(honestSpatialModes.map((mode) => mode.id)).toEqual([
      'safe_stereo',
      'competitive_width',
      'immersive_hrtf_preview',
      'developer_spatial_sdk'
    ]);
    expect(honestSpatialModes.find((mode) => mode.id === 'safe_stereo').promise).toContain('No fake surround');
    expect(honestSpatialModes.find((mode) => mode.id === 'developer_spatial_sdk').futureOnly).toBe(true);
    expect(honestSpatialModes.every((mode) => mode.settings.fakeSurround === false)).toBe(true);
  });

  it('warns that true object-level occlusion needs game-engine support', () => {
    const plan = buildSpatialPlan();

    expect(plan.warning).toBe(spatialTruthWarning);
    expect(plan.claims).toMatchObject({
      canImproveFinalChain: true,
      canClaimTrueObjectOcclusionFromStereoMix: false,
      requiresGameEngineSupportForSceneAwareSpatial: true
    });
  });

  it('keeps Steam Audio in a future research and SDK lane', () => {
    const plan = buildSpatialPlan();

    expect(plan.researchLane).toMatchObject({
      sdk: 'Steam Audio',
      license: 'Apache-2.0',
      role: 'Research and future game-partner SDK path, not a promise for mixed stereo output.'
    });
    expect(plan.researchLane.integrations).toEqual(['Unity', 'Unreal', 'FMOD', 'Wwise']);
  });

  it('falls back to Safe Stereo when spatial layers are stacked', () => {
    const plan = buildSpatialPlan({
      graph: { summary: { processingLayers: 2, routingLayers: 1 } },
      conflicts: {
        conflicts: [
          { id: 'multiple_spatial_layers', severity: 'high' }
        ]
      }
    });

    expect(plan.mode).toBe('single-layer-required');
    expect(plan.selectedMode.id).toBe('safe_stereo');
    expect(plan.guidance).toContain('Do not stack');
  });

  it('allows immersive HRTF only as a preview mode', () => {
    const plan = buildSpatialPlan({
      profile: {
        recommendation: {
          spatial: {
            hrtf: 'optional',
            crossfeed: 0.35
          }
        }
      }
    });

    expect(plan.mode).toBe('immersive_hrtf_preview');
    expect(plan.selectedMode.promise).toContain('Not true game-scene occlusion');
  });
});
