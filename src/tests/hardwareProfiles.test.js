import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  assessHardwareProfileEvidence,
  HARDWARE_PROFILE_SCHEMA,
  validateHardwareProfile
} from '../shared/schemas/hardwareProfile.js';

const root = fileURLToPath(new URL('../..', import.meta.url));
const profileDir = join(root, 'qa', 'hardware-profiles');

function readProfile(name) {
  return JSON.parse(readFileSync(join(profileDir, name), 'utf8'));
}

describe('hardware profile manifests', () => {
  it('keeps every QA hardware profile on the explicit v1 schema', () => {
    const profiles = readdirSync(profileDir)
      .filter((name) => name.endsWith('.json'))
      .map(readProfile);

    expect(profiles.length).toBeGreaterThanOrEqual(4);
    profiles.forEach((profile) => {
      expect(profile.schema).toBe(HARDWARE_PROFILE_SCHEMA);
      expect(validateHardwareProfile(profile)).toEqual({ ok: true, errors: [] });
      expect(profile.input.matchHints.length).toBeGreaterThan(0);
      expect(profile.output.matchHints.length).toBeGreaterThan(0);
    });
  });

  it('matches the HyperX/Sonar sample when the expected chain is present', () => {
    const profile = readProfile('win-realtek-hyperx-sonar.json');
    const assessment = assessHardwareProfileEvidence(profile, {
      endpoints: [
        { id: 'hyperx-game', name: 'HyperX Cloud Game Headphones', role: 'playback', transport: 'usb', defaultFor: ['playback'] },
        { id: 'hyperx-chat', name: 'HyperX Cloud Chat', role: 'communications', transport: 'usb', defaultFor: ['communicationsPlayback'] },
        { id: 'hyperx-mic', name: 'Headset Microphone HyperX USB Audio', role: 'recording', transport: 'usb', defaultFor: ['recording'] }
      ],
      tools: {
        sonar: true,
        equalizerApo: false,
        peace: false,
        voicemeeter: false
      },
      defaults: {
        playback: 'hyperx-game',
        communicationsPlayback: 'hyperx-chat',
        recording: 'hyperx-mic'
      },
      capabilities: {
        canReadLoopback: true
      },
      metrics: {
        roundTripLatencyMs: 42
      }
    });

    expect(assessment.validProfile).toBe(true);
    expect(assessment.tier).toBe('strong_match');
    expect(assessment.problems).toEqual([]);
    expect(assessment.companions.find((item) => item.key === 'sonar')).toMatchObject({ expectation: 'expected', detected: true, ok: true });
  });

  it('flags forbidden companions and missing loopback proof', () => {
    const profile = readProfile('win-realtek-hyperx-sonar.json');
    const assessment = assessHardwareProfileEvidence(profile, {
      endpoints: [
        { id: 'hyperx-game', name: 'HyperX Cloud Game Headphones', role: 'playback', transport: 'usb', defaultFor: ['playback'] },
        { id: 'hyperx-mic', name: 'Headset Microphone HyperX USB Audio', role: 'recording', transport: 'usb', defaultFor: ['recording'] }
      ],
      tools: {
        sonar: false,
        voicemeeter: true
      },
      defaults: {
        playback: 'hyperx-game',
        communicationsPlayback: 'hyperx-game',
        recording: 'hyperx-mic'
      },
      capabilities: {
        canReadLoopback: false
      }
    });

    expect(assessment.tier).not.toBe('strong_match');
    expect(assessment.problems.join(' ')).toMatch(/sonar is missing/i);
    expect(assessment.problems.join(' ')).toMatch(/voicemeeter is detected/i);
    expect(assessment.problems.join(' ')).toMatch(/loopbackCaptureRequired/i);
    expect(assessment.expectations.find((item) => item.key === 'loopbackCaptureRequired').note).toMatch(/protected playback/i);
  });

  it('rejects vague or malformed profile manifests', () => {
    const result = validateHardwareProfile({
      schema: HARDWARE_PROFILE_SCHEMA,
      profileId: '',
      os: 'windows',
      input: { kind: 'usb-mic', matchHints: [] },
      output: { kind: 'headphones', matchHints: ['Headphones'] },
      companions: { voicemeeter: 'maybe' },
      expectations: { maxRoundTripLatencyMs: -1 }
    });

    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toMatch(/profileId|required|voicemeeter|maxRoundTripLatency/i);
  });
});
