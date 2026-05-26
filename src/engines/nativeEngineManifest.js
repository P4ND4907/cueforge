import { buildDspPlan } from './dspPlan.js';
import { buildDynamicsPlan } from './dynamicsPlan.js';
import { buildMicPlan } from './micPlan.js';
import { buildSpatialPlan } from './spatialPlan.js';
import { buildNativeCaptureHarnessPlan } from '../native/harness/nativeCaptureHarness.js';
import {
  calculateRequiredPreamp,
  clampEqToSafety,
  safetyRules
} from '../core/safetyRules.js';

function normalizedState(input = {}) {
  return input?.state || input || {};
}

function recommendedProfile(state = {}) {
  return state.recommendedProfile || state.profile?.recommendation || {};
}

function normalizeEq(eq = []) {
  return Array.isArray(eq) ? clampEqToSafety(eq) : [];
}

export function calculateSafePreamp(eq = []) {
  const filters = normalizeEq(eq);
  return calculateRequiredPreamp(filters);
}

function manifestReady(state = {}) {
  const noHighConflicts = (state.conflicts?.summary?.high || 0) === 0;
  const readiness = state.readiness?.status || state.readiness?.tier;
  return ['native-engine-ready', 'native_ready', 'match_ready'].includes(readiness) && noHighConflicts;
}

function buildModules(profile = {}) {
  const eq = normalizeEq(profile.eq);

  return [
    {
      id: 'preamp',
      type: 'gain',
      enabled: true,
      gainDb: calculateSafePreamp(eq)
    },
    {
      id: 'peq',
      type: 'parametric_eq',
      enabled: eq.length > 0,
      filters: eq
    },
    {
      id: 'limiter',
      type: 'true_peak_limiter_placeholder',
      enabled: true,
      ceilingDb: safetyRules.limiterCeilingDb
    },
    {
      id: 'dynamics',
      type: 'light_dynamics_placeholder',
      enabled: Boolean(profile.dynamics),
      settings: profile.dynamics || null
    },
    {
      id: 'spatial',
      type: 'spatial_placeholder',
      enabled: profile.spatial?.hrtf === 'optional',
      settings: profile.spatial || null
    }
  ];
}

function buildBackendPlan() {
  return {
    firstPrototype: 'miniaudio',
    shipAsSystemWideApp: false,
    reason: 'Compact embedded native backend candidate for offline rendering, playback, capture, WASAPI loopback proof, full-duplex latency experiments, device enumeration, and native bridge proof-of-concept work.',
    allowedUses: [
      'offline audio test rendering',
      'tone generation',
      'explicit WASAPI loopback measurement',
      'explicit mic capture measurement',
      'device enumeration experiments',
      'DSP validation',
      'latency experiments',
      'internal native node graph prototype',
      'future native bridge proof-of-concept'
    ],
    blockedUses: [
      'silent driver changes',
      'system-wide routing changes without review',
      'default production apply engine'
    ]
  };
}

export function buildNativeEngineManifest(input = {}) {
  const state = normalizedState(input);
  const profile = recommendedProfile(state);
  const dsp = buildDspPlan({ profile: state.profile, readiness: state.readiness });
  const dynamics = buildDynamicsPlan({ conflicts: state.conflicts, profile: state.profile });
  const spatial = buildSpatialPlan({ graph: state.chainGraph, conflicts: state.conflicts, profile: state.profile || profile });
  const mic = buildMicPlan({ graph: state.chainGraph, conflicts: state.conflicts });
  const modules = buildModules(profile);
  const nativeHarness = buildNativeCaptureHarnessPlan({
    platform: 'win32',
    helperManifest: state.nativeHelperManifest || null,
    engineManifest: {
      sampleRate: 48000,
      blockSizeTarget: 128
    }
  });

  return {
    schema: 'cueforge.native-engine-manifest.v1',
    version: '0.1',
    sampleRate: 48000,
    blockSizeTarget: 128,
    channels: 2,
    ready: manifestReady(state),
    boundary: 'This manifest prepares explicit native processing. It does not silently change Windows routing, drivers, or APO configs.',
    requirements: [
      'desktop bridge scan',
      'apply target or export-only confirmation',
      'conflict report',
      'profile engine v2 output',
      'before/after player proof'
    ],
    modules,
    safety: {
      ...safetyRules,
      maxBoostDb: safetyRules.maxTotalBoostDb,
      limiterRequired: true,
      clippingGuard: true,
      preampDb: modules.find((module) => module.id === 'preamp')?.gainDb ?? -1
    },
    prototypeBackend: buildBackendPlan(),
    nativeHarness,
    plans: { dsp, dynamics, spatial, mic }
  };
}
