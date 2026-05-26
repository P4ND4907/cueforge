import { describe, expect, it } from 'vitest';
import { buildCueForgeState } from '../core/cueforgeState.js';
import { buildCueForgeReleasePack, summarizeReleasePack } from '../core/exportSchema.js';
import { browserDeviceFixture, desktopBridgeFixture } from '../data/testFixtures.js';

describe('release pack v2', () => {
  it('exports one state package for setup, profile, readiness, and apply path', () => {
    const state = buildCueForgeState({
      devices: browserDeviceFixture,
      bridgeReport: desktopBridgeFixture,
      eq: Array(10).fill(0),
      apoConfig: 'Preamp: -4 dB'
    });
    const pack = buildCueForgeReleasePack({ state, apoConfig: 'Preamp: -4 dB' });

    expect(pack.schema).toBe('cueforge.release-pack.v2');
    expect(pack.version).toBe('0.2.0-alpha.3');
    expect(pack.stateV2.version).toBe('0.2.0-alpha.3');
    expect(pack.files['cueforge-state-v2.json']).toContain('recommendedProfile');
    expect(pack.files['cueforge-brain.json']).toContain('cueforge.brain.v1');
    expect(pack.files['cueforge-profile-v2.json']).toContain('profile-engine.v2');
    expect(summarizeReleasePack(pack)).toContain('Brain:');
    expect(summarizeReleasePack(pack)).toContain('State v2: included');
  });
});
