import { describe, expect, it } from 'vitest';
import {
  buildNativeCaptureHarnessPlan,
  buildNativeHarnessRequest,
  nativeHarnessBackends,
  validateNativeHarnessRequest
} from '../native/harness/nativeCaptureHarness.js';

const helperManifest = {
  manifestVersion: 'cueforge.native.v1',
  os: { family: 'windows', build: '10.0.26100' },
  endpoints: [
    {
      id: 'playback-1',
      name: 'USB DAC',
      role: 'playback',
      transport: 'usb',
      sampleRates: [48000],
      channels: [2],
      defaultFor: ['playback']
    }
  ],
  tools: {
    equalizerApo: true,
    peace: false,
    sonar: false,
    voicemeeter: false,
    vbCable: false
  },
  capabilities: {
    canReadDefaults: true,
    canReadSessions: true,
    canReadLoopback: true,
    canWriteApoDraft: true,
    canModifySystemState: false
  }
};

describe('native capture and render harness', () => {
  it('centers the native lab helper on miniaudio with WASAPI loopback support', () => {
    const plan = buildNativeCaptureHarnessPlan({
      platform: 'win32',
      helperManifest,
      engineManifest: { sampleRate: 48000, blockSizeTarget: 128 }
    });

    expect(plan.schema).toBe('cueforge.native-capture-harness.v1');
    expect(plan.primaryBackend).toBe('miniaudio');
    expect(plan.alternatives).toEqual(['portaudio', 'rtaudio']);
    expect(plan.safety.canModifySystemState).toBe(false);
    expect(plan.safety.canInstallDriver).toBe(false);
    expect(plan.helperEvidence.canReadLoopback).toBe(true);
    expect(plan.safety.protectedPlaybackUniversalCapture).toBe(false);
    expect(plan.safety.protectedPlaybackBoundary).toMatch(/DRM|protected playback/i);
    expect(plan.modes.map((mode) => mode.id)).toContain('wasapi-loopback-capture');
    expect(plan.modes.find((mode) => mode.id === 'wasapi-loopback-capture')).toMatchObject({
      available: true,
      requiresPlayerClick: true,
      requiredCapability: 'wasapi-loopback'
    });
    expect(nativeHarnessBackends[0].capabilities).toContain('full-duplex');
    expect(nativeHarnessBackends[0].capabilities).toContain('device-enumeration');
    expect(nativeHarnessBackends[0].capabilities).toContain('node-graph');
  });

  it('keeps WASAPI loopback explicit, bounded, and local', () => {
    const request = buildNativeHarnessRequest({
      mode: 'wasapi-loopback-capture',
      endpointId: 'playback-1',
      durationMs: 3000,
      userGesture: true,
      reason: 'Confirm exported EQ is audible on the active endpoint.'
    });
    const result = validateNativeHarnessRequest(request, {
      platform: 'win32',
      helperManifest
    });

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('blocks hidden live capture, system writes, unsafe helpers, and oversized capture windows', () => {
    const request = buildNativeHarnessRequest({
      mode: 'mic-capture',
      durationMs: 60000,
      userGesture: false,
      persistRawAudio: true,
      writeSystemState: true
    });
    const result = validateNativeHarnessRequest(request, {
      platform: 'win32',
      helperManifest: {
        ...helperManifest,
        capabilities: {
          ...helperManifest.capabilities,
          canModifySystemState: true
        }
      }
    });

    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('explicit player action');
    expect(result.errors.join(' ')).toContain('cannot modify Windows routing');
    expect(result.errors.join(' ')).toContain('between 1 and 15000 ms');
    expect(result.errors.join(' ')).toContain('Unsafe helper manifest');
    expect(result.warnings.join(' ')).toContain('Raw audio persistence');
  });

  it('keeps non-Windows harness work on offline rendering until platform capture exists', () => {
    const plan = buildNativeCaptureHarnessPlan({ platform: 'darwin' });

    expect(plan.modes.find((mode) => mode.id === 'offline-render').available).toBe(true);
    expect(plan.modes.find((mode) => mode.id === 'wasapi-loopback-capture').available).toBe(false);

    const request = buildNativeHarnessRequest({
      mode: 'wasapi-loopback-capture',
      durationMs: 1000,
      userGesture: true
    });
    const result = validateNativeHarnessRequest(request, { platform: 'darwin' });

    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('requires win32');
  });
});
