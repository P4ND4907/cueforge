import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  assessLabManifestCoverage,
  buildLabRunPlan,
  getLabTestClassesByPriority,
  LAB_MANIFEST_SCHEMA,
  labTestPriorities,
  summarizeLabManifest,
  validateLabManifest
} from '../shared/schemas/labManifest.js';
import { validateHardwareProfile } from '../shared/schemas/hardwareProfile.js';

const root = fileURLToPath(new URL('../..', import.meta.url));
const manifestDir = join(root, 'qa', 'audio', 'manifests');
const profileDir = join(root, 'qa', 'hardware-profiles');

function readJson(dir, name) {
  return JSON.parse(readFileSync(join(dir, name), 'utf8'));
}

function readProfiles() {
  return readdirSync(profileDir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => readJson(profileDir, name));
}

describe('lab manifests', () => {
  it('keeps every lab manifest on the explicit v1 schema and known hardware profiles', () => {
    const profileIds = readProfiles().map((profile) => profile.profileId);
    const manifests = readdirSync(manifestDir)
      .filter((name) => name.endsWith('.json'))
      .map((name) => readJson(manifestDir, name));

    expect(manifests.length).toBeGreaterThanOrEqual(3);
    manifests.forEach((manifest) => {
      expect(manifest.schema).toBe(LAB_MANIFEST_SCHEMA);
      expect(validateLabManifest(manifest, { knownProfileIds: profileIds })).toEqual({ ok: true, errors: [] });
      expect(manifest.tests.length).toBeGreaterThan(0);
      expect(manifest.privacy.allowRawAudioExport).toBe(false);
      expect(manifest.privacy.redactDeviceIds).toBe(true);
      expect(manifest.privacy.redactUserPaths).toBe(true);
    });
  });

  it('turns the setup command center smoke manifest into a deterministic run plan', () => {
    const manifest = readJson(manifestDir, 'setup-command-center-smoke.json');
    const profile = readJson(profileDir, `${manifest.profileId}.json`);
    expect(validateHardwareProfile(profile).ok).toBe(true);

    const plan = buildLabRunPlan(manifest, profile);

    expect(plan).toMatchObject({
      schema: 'cueforge.lab-run-plan.v1',
      manifestId: 'setup-command-center-smoke',
      profileId: 'win-realtek-hyperx-sonar',
      hardwareProfileLabel: 'Windows Realtek / HyperX / Sonar headset chain',
      testCount: 6,
      gates: {
        rawAudioExportAllowed: false,
        redactionRequired: true,
        systemMutationAllowed: false
      }
    });
    expect(plan.tests.map((test) => [test.id, test.runner])).toEqual([
      ['device-scan', 'machine-assessment'],
      ['route-graph', 'chain-graph'],
      ['output-loopback-impulse', 'native-harness'],
      ['eq-render-a-b', 'audio-fixture-render'],
      ['mic-cleanliness', 'mic-analyzer'],
      ['electron-onboarding', 'playwright-electron']
    ]);
    expect(plan.tests.find((test) => test.id === 'eq-render-a-b')).toMatchObject({
      type: 'audio-regression',
      canonicalType: 'ab-audio-render',
      priority: 'immediate',
      fixture: 'cue_steps_reference.wav',
      policy: 'qa/audio/policies/eq-render-a-b.json',
      capture: {
        method: 'wasapi-loopback',
        endpoint: 'active-default-render',
        allowSystemMutation: false
      }
    });
  });

  it('summarizes manifest coverage without exposing private machine details', () => {
    const summary = summarizeLabManifest(readJson(manifestDir, 'complex-routing-vm-lab.json'));

    expect(summary).toEqual({
      manifestId: 'complex-routing-vm-lab',
      profileId: 'win-voicemeeter-vbcable-complex',
      testCount: 7,
      typeCounts: {
        integration: 1,
        'chain-graph': 1,
        fixture: 1,
        latency: 1,
        'mic-pipeline': 1,
        privacy: 1,
        e2e: 1
      },
      privacyLocked: true
    });
  });

  it('declares every required lab test class from the start', () => {
    const immediate = getLabTestClassesByPriority(labTestPriorities.immediate).map((item) => item.type);
    const next = getLabTestClassesByPriority(labTestPriorities.next).map((item) => item.type);

    expect(immediate).toEqual([
      'unit',
      'integration',
      'e2e',
      'ab-audio-render',
      'chain-graph-verification',
      'conflict-detection',
      'latency-regression',
      'mic-pipeline'
    ]);
    expect(next).toEqual([
      'blind-match-automation',
      'hearing-model-automation',
      'bit-exact-dsp-regression'
    ]);
  });

  it('uses the full coverage manifest to cover every immediate lab class', () => {
    const manifest = readJson(manifestDir, 'machine-play-lab-full-coverage.json');
    const coverage = assessLabManifestCoverage([manifest]);
    const plan = buildLabRunPlan(manifest);

    expect(validateLabManifest(manifest, { knownProfileIds: readProfiles().map((profile) => profile.profileId) })).toEqual({ ok: true, errors: [] });
    expect(coverage).toMatchObject({
      schema: 'cueforge.lab-manifest-coverage.v1',
      manifestCount: 1,
      supportedClassCount: 11,
      missingImmediate: [],
      missingNext: [],
      readyForReleaseGate: true
    });
    expect(plan.tests.map((test) => [test.type, test.runner, test.priority])).toContainEqual([
      'conflict-detection',
      'conflict-detector',
      'immediate'
    ]);
    expect(plan.tests.map((test) => [test.type, test.runner, test.priority])).toContainEqual([
      'bit-exact-dsp-regression',
      'dsp-regression',
      'next'
    ]);
  });

  it('rejects unsafe, vague, or mismatched lab manifests', () => {
    const result = validateLabManifest({
      schema: LAB_MANIFEST_SCHEMA,
      manifestId: '',
      profileId: 'unknown-profile',
      tests: [
        { id: 'device-scan', type: 'integration' },
        { id: 'device-scan', type: 'magic' }
      ],
      privacy: {
        allowRawAudioExport: true,
        redactDeviceIds: false,
        redactUserPaths: false
      }
    }, {
      knownProfileIds: ['win-realtek-hyperx-sonar']
    });

    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toMatch(/manifestId|required|unknown-profile|duplicates|magic|allowRawAudioExport|redactDeviceIds|redactUserPaths/i);
  });
});
