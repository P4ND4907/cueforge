import { describe, expect, it } from 'vitest';
import {
  LOOPBACK_PROOF_SCHEMA,
  buildWasapiLoopbackProof,
  summarizeWasapiLoopbackProof
} from '../core/wasapiLoopbackProof.js';

describe('WASAPI loopback proof contract', () => {
  it('defaults to a no-recording not-run proof state', () => {
    const proof = buildWasapiLoopbackProof();

    expect(proof).toMatchObject({
      schema: LOOPBACK_PROOF_SCHEMA,
      status: 'not-run',
      mode: 'endpoint-loopback',
      permissionRequired: false,
      protectedPlaybackBoundary: true,
      canRecord: false,
      rawAudioStored: false
    });
    expect(proof.nextAction).toMatch(/run.*windows scan/i);
    expect(summarizeWasapiLoopbackProof(proof)).toMatch(/not run/i);
  });

  it('reports available endpoint proof without leaking raw endpoint ids or paths', () => {
    const proof = buildWasapiLoopbackProof({
      status: 'available',
      endpoint: {
        label: 'SteelSeries Sonar - Gaming',
        id: 'SWD\\MMDEVAPI\\{0.0.0.00000000}.{c0ffee-cafe-babe}',
        devicePath: 'C:\\Users\\khepr\\Audio\\private-device-path.wav'
      },
      defaultRender: 'SteelSeries Sonar - Gaming'
    });

    const serialized = JSON.stringify(proof);

    expect(proof.status).toBe('available');
    expect(proof.endpointLabel).toBe('SteelSeries Sonar - Gaming');
    expect(proof.endpointHash).toMatch(/^ep_[a-f0-9]{12}$/);
    expect(proof.defaultRenderMatchesScan).toBe(true);
    expect(proof.canRecord).toBe(false);
    expect(proof.rawAudioStored).toBe(false);
    expect(serialized).not.toContain('MMDEVAPI');
    expect(serialized).not.toContain('c0ffee');
    expect(serialized).not.toContain('C:\\Users');
    expect(summarizeWasapiLoopbackProof(proof)).toMatch(/available/i);
  });

  it('keeps permission-blocked proof local-first and non-capturing', () => {
    const proof = buildWasapiLoopbackProof({
      status: 'blocked',
      endpoint: {
        label: 'USB DAC Headphones',
        id: 'endpoint-id-secret'
      },
      reason: 'Desktop helper could not query loopback capability.',
      permissionRequired: true
    });

    expect(proof).toMatchObject({
      status: 'blocked',
      endpointLabel: 'USB DAC Headphones',
      permissionRequired: true,
      protectedPlaybackBoundary: true,
      canRecord: false,
      rawAudioStored: false
    });
    expect(proof.nextAction).toMatch(/permission|desktop|windows/i);
    expect(JSON.stringify(proof)).not.toContain('endpoint-id-secret');
  });

  it('does not promise protected playback capture or automatic routing changes', () => {
    const proof = buildWasapiLoopbackProof({
      status: 'unsupported',
      reason: 'Current Windows build or device path does not expose endpoint loopback proof.'
    });

    expect(proof.protectedPlaybackBoundary).toBe(true);
    expect(proof.canRecord).toBe(false);
    expect(proof.rawAudioStored).toBe(false);
    expect(proof.safety).toEqual(expect.arrayContaining([
      'No capture starts automatically.',
      'No Windows routing, driver, APO, or system setting is modified.'
    ]));
  });
});
