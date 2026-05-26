import { describe, expect, it } from 'vitest';
import {
  buildDeviceExportFingerprint,
  buildExportFingerprint,
  buildRouteExportFingerprint,
  buildStateExportFingerprints
} from './exportFingerprints.js';

describe('export fingerprints', () => {
  it('creates stable hashes without exposing raw device identifiers', () => {
    const device = {
      kind: 'audioinput',
      label: 'HyperX QuadCast S',
      deviceId: 'USB\\VID_0951&PID_SECRET',
      groupId: 'private-group'
    };

    const first = buildDeviceExportFingerprint(device);
    const second = buildDeviceExportFingerprint({ ...device });

    expect(first).toBe(second);
    expect(first).toMatch(/^cfp_[a-f0-9]{20}$/);
    expect(first).not.toContain('HyperX');
    expect(first).not.toContain('VID');
    expect(first).not.toContain('private');
  });

  it('separates device and route namespaces', () => {
    const value = { label: 'same' };

    expect(buildDeviceExportFingerprint(value)).not.toBe(buildRouteExportFingerprint(value));
    expect(buildExportFingerprint(value)).toMatch(/^cfp_[a-f0-9]{20}$/);
  });

  it('summarizes state fingerprints for export packs', () => {
    const fingerprints = buildStateExportFingerprints({
      devices: {
        output: { label: 'DAC', deviceId: 'raw-output-id' },
        suspectedHardware: ['IEM']
      },
      chainGraph: {
        edges: [{ from: 'game', to: 'sonar', relation: 'routes-to' }]
      }
    });

    expect(fingerprints.schema).toBe('cueforge.export-fingerprints.v1');
    expect(fingerprints.deviceFingerprints).toHaveLength(2);
    expect(fingerprints.routeFingerprints).toHaveLength(1);
    expect(JSON.stringify(fingerprints)).not.toContain('raw-output-id');
  });
});
