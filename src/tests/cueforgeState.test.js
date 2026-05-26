import { describe, expect, it } from 'vitest';
import {
  buildCanonicalCueForgeState,
  buildCueForgeState,
  cueforgeStateV2
} from '../core/cueforgeState.js';
import { buildPreferenceModelFromChoices } from '../core/preferenceModel.js';
import { browserDeviceFixture, desktopBridgeFixture } from '../data/testFixtures.js';

describe('cueforge state v2 contract', () => {
  it('keeps the public state brain in the expected top-level shape', () => {
    expect(Object.keys(cueforgeStateV2)).toEqual([
      'version',
      'player',
      'devices',
      'chain',
      'calibration',
      'selectedGame',
      'recommendedProfile',
      'readiness',
      'exports'
    ]);
  });

  it('maps the detected chain, profile, readiness, and exports into one player brain', () => {
    const fullState = buildCueForgeState({
      devices: browserDeviceFixture,
      bridgeReport: desktopBridgeFixture,
      eq: Array(10).fill(0),
      game: 'Rainbow Six Siege',
      apoConfig: 'Preamp: -4 dB',
      hearing: { score: 8, tilt: 'smooth treble' },
      preferenceModel: buildPreferenceModelFromChoices({ footstep_vs_comfort: 'a', wide_vs_center: 'b' }),
      selfTests: [{ id: 'browser-audio', status: 'pass' }]
    });

    expect(fullState.stateV2.devices.input).toContain('HyperX');
    expect(fullState.stateV2.devices.output).toContain('DAC');
    expect(fullState.stateV2.chain.apoDetected).toBe(true);
    expect(fullState.stateV2.chain.peaceDetected).toBe(true);
    expect(fullState.stateV2.chain.sonarDetected).toBe(true);
    expect(fullState.autoDetectReport.schema).toBe('cueforge.auto-detect-report.v2');
    expect(fullState.autoDetectReport.companions.sonar.detected).toBe(true);
    expect(fullState.brain.schema).toBe('cueforge.brain.v1');
    expect(fullState.brain.differentiator).toBe('audio-chain-verifier-personal-sound-engine');
    expect(fullState.stateV2.calibration.preferenceModel.roundsCompleted).toBe(2);
    expect(fullState.stateV2.calibration.labInputs.schema).toBe('cueforge.personalization-lab-inputs.v1');
    expect(fullState.stateV2.calibration.labInputs.claimBoundary.notMedical).toBe(true);
    expect(fullState.stateV2.recommendedProfile.eq).toHaveLength(10);
    expect(fullState.stateV2.exports.apoConfig).toContain('Preamp');
    expect(fullState.stateV2.exports.engineManifest.schema).toBe('cueforge.native-engine-manifest.v1');
  });

  it('starts from safe defaults when setup data is not ready yet', () => {
    const emptyState = buildCanonicalCueForgeState();

    expect(emptyState.version).toBe('0.2.0-alpha.3');
    expect(emptyState.devices.outputType).toBe('unknown');
    expect(emptyState.chain.apoDetected).toBe(false);
    expect(emptyState.readiness.tier).toBe('not_ready');
    expect(emptyState.exports.engineManifest).toBeNull();
  });
});
