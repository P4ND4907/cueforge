import { describe, expect, it } from 'vitest';
import {
  applyMixerSnapshot,
  buildCueForgeMiddlewareCompatibilityManifest,
  buildMiddlewareSmokeChecklist,
  buildSdkPrototypeDefinitionOfDone,
  evaluateProfilerBudget,
  resolveBinauralRoute,
  validateAudioBackendAdapter,
  validateMixerSnapshot
} from '../core/middlewareCompatibility.js';

describe('CueForge middleware compatibility contract', () => {
  it('builds one CueForge manifest for Wwise and FMOD from canonical event IDs', () => {
    const manifest = buildCueForgeMiddlewareCompatibilityManifest({
      events: [
        { id: 'weapon.fire', busId: 'sfx', params: ['distance_m', 'player_focus'] },
        { id: 'ui.menu_open', busId: 'ui', params: [] }
      ],
      rtpcs: [{ id: 'engine_rpm', min: 0, max: 10000, unit: 'rpm' }],
      states: [{ group: 'Surface', values: ['Dirt', 'Asphalt', 'Metal'] }]
    });

    expect(manifest.schema).toBe('cueforge.middleware-compatibility.v1');
    expect(manifest.productName).toBe('CueForge');
    expect(manifest.backends.map((backend) => backend.id)).toEqual(['wwise', 'fmod']);
    expect(manifest.backendInterface.methods).toEqual([
      'Init',
      'Shutdown',
      'LoadBank',
      'Play',
      'SetRTPC',
      'SetState',
      'GetProfilerStats'
    ]);
    expect(manifest.events.map((event) => event.id)).toEqual(['weapon.fire', 'ui.menu_open']);
    expect(manifest.backendEventMap.wwise['weapon.fire']).toBe('Event/CueForge/weapon/fire');
    expect(manifest.backendEventMap.fmod['weapon.fire']).toBe('event:/CueForge/weapon/fire');
    expect(manifest.rtpcs[0]).toMatchObject({ id: 'engine_rpm', min: 0, max: 10000, unit: 'rpm' });
    expect(manifest.states[0]).toMatchObject({ group: 'Surface', values: ['Dirt', 'Asphalt', 'Metal'] });
  });

  it('rejects backend adapters that skip required parity methods or use ad-hoc event names', () => {
    const manifest = buildCueForgeMiddlewareCompatibilityManifest({
      events: [{ id: 'ambience.loop', busId: 'ambience' }]
    });

    const result = validateAudioBackendAdapter({
      backendId: 'wwise',
      methods: ['Init', 'LoadBank', 'Play', 'SetRTPC', 'SetState', 'GetProfilerStats'],
      referencedEvents: ['ambience.loop', 'random/string/from/gameplay']
    }, manifest);

    expect(result.ok).toBe(false);
    expect(result.issues).toContain('Missing required backend method: Shutdown.');
    expect(result.issues).toContain('Gameplay code references non-canonical event: random/string/from/gameplay.');
  });

  it('maps headphone binaural safely and avoids double HRTF or non-stereo downmix traps', () => {
    const stereo = resolveBinauralRoute({
      middleware: 'wwise',
      outputChannels: 2,
      userHrtfEnabled: true,
      busMode: 'auto',
      activePlatformSpatialLayers: []
    });
    const surroundFallback = resolveBinauralRoute({
      middleware: 'fmod',
      outputChannels: 6,
      userHrtfEnabled: true,
      busMode: 'force',
      activePlatformSpatialLayers: []
    });
    const doubleHrtfGuard = resolveBinauralRoute({
      middleware: 'fmod',
      outputChannels: 2,
      userHrtfEnabled: true,
      busMode: 'auto',
      activePlatformSpatialLayers: ['windows-sonic']
    });

    expect(stereo).toMatchObject({
      mode: 'middleware-binaural',
      preventsDoubleHrtf: true,
      backendSetting: 'Wwise Spatial Audio Binaural'
    });
    expect(surroundFallback).toMatchObject({
      mode: 'speaker-panning-fallback',
      middlewareHrtfEnabled: false,
      reason: 'Output is not stereo.'
    });
    expect(doubleHrtfGuard).toMatchObject({
      mode: 'platform-spatial-fallback',
      middlewareHrtfEnabled: false,
      preventsDoubleHrtf: true
    });
  });

  it('evaluates per-platform CPU, voice caps, heavy-chain caps, and profiler parity', () => {
    const manifest = buildCueForgeMiddlewareCompatibilityManifest();

    const result = evaluateProfilerBudget({
      platform: 'pc',
      audioThreadMs: 5.4,
      voices: { sfx: 52, ambience: 10, vo: 4 },
      heavyVoices: 3,
      overlayVoiceCount: 67,
      profilerVoiceCount: 69,
      virtualizedVoices: 12
    }, manifest);

    expect(result.ok).toBe(false);
    expect(result.issues).toContain('PC audio thread budget exceeded: 5.4 ms > 5 ms.');
    expect(result.issues).toContain('SFX voice cap exceeded: 52 > 48.');
    expect(result.issues).toContain('Heavy voice cap exceeded: 3 > 2.');
    expect(result.issues).toContain('Profiler parity mismatch: overlay 67 vs profiler 69.');
    expect(result.telemetry).toContain('poly-cap-hit');
  });

  it('serializes mixer snapshots as additive, ramped, versioned CueForge data', () => {
    const snapshot = {
      schema: 'cueforge.mix-snapshot.v1',
      id: 'combat',
      version: '1.0',
      priority: 40,
      rampMs: 250,
      busGains: { sfx: 1.5, music: -4, vo: 0 },
      sendLevels: { reverb: -7 },
      sidechainDucks: { musicFromVo: -5 },
      limiterThresholds: { master: -1 }
    };

    expect(validateMixerSnapshot(snapshot)).toEqual({ ok: true, issues: [] });

    const applied = applyMixerSnapshot(
      {
        busGains: { sfx: 0, music: -1, vo: 0 },
        activeSnapshots: [{ id: 'calm', priority: 10, busGains: { music: -2 } }]
      },
      snapshot
    );

    expect(applied.schema).toBe('cueforge.mix-snapshot-application.v1');
    expect(applied.mode).toBe('additive-ramped');
    expect(applied.rampMs).toBe(250);
    expect(applied.resolvedBusGains).toMatchObject({ sfx: 1.5, music: -4, vo: 0 });
    expect(applied.conflictResolution).toBe('priority-wins');
  });

  it('builds the 15-minute middleware smoke checklist and SDK prototype definition of done', () => {
    const checklist = buildMiddlewareSmokeChecklist();
    const dod = buildSdkPrototypeDefinitionOfDone();

    expect(checklist.estimateMinutes).toBe(15);
    expect(checklist.steps.map((step) => step.id)).toEqual([
      'listener-binaural-toggle',
      'voice-cap-virtualization',
      'snapshot-ramp-sidechain',
      'profiler-overlay-parity'
    ]);
    expect(checklist.steps[0].assertions).toContain('No comb-filtering or double-HRTF warning.');
    expect(dod.productName).toBe('CueForge');
    expect(dod.items).toContain('One codepath behind IAudioBackend, switchable Wwise/FMOD by runtime selection or build flag.');
    expect(dod.items).toContain('Voice caps and profiler overlay work on both middleware backends.');
  });
});
