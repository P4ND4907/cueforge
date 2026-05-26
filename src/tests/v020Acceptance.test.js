import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { buildCommandCenterSummary, commandCenterFlow } from '../core/commandCenterFlow.js';
import { buildChainGraph } from '../core/chainGraph.js';
import { conflictRules, evaluateConflictRules } from '../core/conflictDetector.js';
import { buildCueForgeBrain } from '../core/cueforgeBrain.js';
import { buildCueForgeState, cueforgeStateV2 } from '../core/cueforgeState.js';
import { buildCueForgeReleasePack } from '../core/exportSchema.js';
import { buildHearingModelV2 } from '../core/hearingModelV2.js';
import { buildPersonalizationLabInputs } from '../core/personalizationLabInputs.js';
import { updatePreferenceModel } from '../core/preferenceModel.js';
import { recommendProfile } from '../core/profileEngine.js';
import { calculateReadinessScore } from '../core/readinessScore.js';
import { buildScopeBoundarySummary, evaluateScopeBoundary } from '../core/scopeGuard.js';
import { buildNativeEngineManifest } from '../engines/nativeEngineManifest.js';
import { createEmptyHearingResults, normalizeHearingResults } from '../hearingModel.js';
import { runPrivacyAudit } from '../privacyAudit.js';
import { buildIssueReport, validateIssueReport } from '../reportPack.js';
import { browserDeviceFixture, desktopBridgeFixture } from '../data/testFixtures.js';
import { genreProfiles } from '../data/genreProfiles.js';
import { nextNativeEngineMilestone, summarizeNativeEngineRoadmap } from '../data/nativeEngineRoadmap.js';

function fullState(overrides = {}) {
  return {
    player: {
      trebleSensitivity: 0,
      bassPreference: 0
    },
    devices: {
      output: 'USB DAC headphones',
      input: 'USB microphone',
      outputType: 'iem',
      inputType: 'usb-mic'
    },
    chain: { risks: [] },
    calibration: {
      micCheck: { ready: true },
      channelCheck: { passed: true },
      hearingModel: { complete: true },
      blindMatch: { complete: true },
      maskingLab: { complete: true }
    },
    selectedGame: { profileId: 'story_dialogue' },
    exports: { apoConfig: 'Preamp: -4 dB' },
    ...overrides
  };
}

describe('v0.2.0 acceptance checklist', () => {
  it('proves the guided setup engine foundations are present and connected', () => {
    const builtState = buildCueForgeState({
      devices: browserDeviceFixture,
      bridgeReport: desktopBridgeFixture,
      desktopReady: true,
      eq: Array(10).fill(0),
      game: 'Rainbow Six Siege',
      hearing: { answered: 8, score: { answered: 8, complete: true } },
      selfTests: [{ status: 'pass' }],
      betaCheckins: [{ id: 'before' }, { id: 'after' }],
      apoConfig: 'Preamp: -4 dB'
    });
    const commandCenter = buildCommandCenterSummary(builtState, { betaCheckins: [{ id: 'before' }] });
    const graph = buildChainGraph({
      browserDevices: browserDeviceFixture,
      bridgeReport: desktopBridgeFixture,
      userSelections: { desktopReady: true, game: 'Rainbow Six Siege' }
    });
    const conflicts = evaluateConflictRules({
      chain: {
        activeCompanions: [
          { name: 'SteelSeries Sonar' },
          { name: 'Equalizer APO' }
        ],
        sonarDetected: true,
        apoDetected: true
      },
      selectedGame: { title: 'Rainbow Six Siege' }
    });
    const readiness = calculateReadinessScore(fullState());
    const profile = recommendProfile(fullState({ selectedGame: { profileId: 'story_dialogue' } }), genreProfiles);
    const preferenceModel = updatePreferenceModel({}, {
      weightDelta: {
        footstepPriority: 1,
        voiceClarity: 1,
        spatialWidth: -0.5
      }
    });
    const engineManifest = buildNativeEngineManifest({
      state: {
        recommendedProfile: profile,
        readiness: { tier: 'match_ready' },
        conflicts: { summary: { high: 0 } }
      }
    });
    const releasePack = buildCueForgeReleasePack({ state: builtState, apoConfig: 'Preamp: -4 dB' });
    const brain = buildCueForgeBrain(builtState);
    const scopeBoundary = buildScopeBoundarySummary();
    const riskyScope = evaluateScopeBoundary({
      claims: ['CueForge can hear exact enemy positions automatically.'],
      actions: ['install a kernel-mode driver']
    });
    const nativeRoadmap = summarizeNativeEngineRoadmap({ currentVersion: cueforgeStateV2.version });
    const labInputs = buildPersonalizationLabInputs({
      hearingModel: builtState.stateV2.calibration.hearingModel,
      preferenceModel
    });

    expect(commandCenterFlow.map((step) => step.id)).toContain('setup-command-center');
    expect(builtState.brain.schema).toBe('cueforge.brain.v1');
    expect(builtState.brain.differentiator).toBe('audio-chain-verifier-personal-sound-engine');
    expect(builtState.brain.pillars.map((pillar) => pillar.id)).toContain('conflict-doctor');
    expect(brain.boundary).toMatch(/does not silently change Windows settings/i);
    expect(commandCenter.cards.map((card) => card.id)).toEqual([
      'setup-health',
      'active-profile',
      'audio-chain',
      'next-best-action',
      'last-match-feedback',
      'export-apply-status'
    ]);
    expect(commandCenter.operatingQuestions.map((item) => item.id)).toEqual([
      'hardware-software',
      'active-route',
      'chain-conflicts',
      'tests-replay',
      'safest-next-step'
    ]);
    expect(commandCenter.operatingQuestions.find((item) => item.id === 'active-route').detail).toMatch(/Game ->/i);
    expect(cueforgeStateV2.version).toBe('0.2.0-alpha.3');
    expect(builtState.stateV2.version).toBe('0.2.0-alpha.3');
    expect(builtState.stateV2.calibration.labInputs.schema).toBe('cueforge.personalization-lab-inputs.v1');
    expect(labInputs.claimBoundary.notMedical).toBe(true);
    expect(graph.outputPath.length).toBeGreaterThan(3);
    expect(graph.inputPath.length).toBeGreaterThan(2);
    expect(conflictRules.map((rule) => rule.id)).toContain('sonar_plus_apo_uncertain_target');
    expect(conflicts.map((item) => item.id)).toContain('sonar_plus_apo_uncertain_target');
    expect(readiness.score).toBe(100);
    expect(readiness.tier).toBe('match_ready');
    expect(profile.id).toBe('story_dialogue_personalized');
    expect(profile.intent).toBe('voice_clarity');
    expect(profile.dynamics.dialogueLift).toBeGreaterThan(0.5);
    expect(preferenceModel.roundsCompleted).toBe(1);
    expect(preferenceModel.footstepPriority).toBe(1);
    expect(engineManifest.schema).toBe('cueforge.native-engine-manifest.v1');
    expect(engineManifest.modules.map((module) => module.id)).toEqual(['preamp', 'peq', 'limiter', 'dynamics', 'spatial']);
    expect(engineManifest.boundary).toMatch(/does not silently change Windows routing, drivers, or APO configs/i);
    expect(builtState.applyPath.explicit).toBe(true);
    expect(releasePack.files['equalizer-apo-config.txt']).toContain('Preamp');
    expect(releasePack.files['cueforge-brain.json']).toContain('personal-sound-engine');
    expect(releasePack.files['cueforge-apo-export-v2.json']).toContain('cueforge.apo-export.v2');
    expect(scopeBoundary.blocked.map((item) => item.id)).toContain('anti_cheat_adjacent_hooks');
    expect(riskyScope.ok).toBe(false);
    expect(riskyScope.blockers.map((item) => item.id)).toEqual(['exact_enemy_position_claims', 'kernel_mode_driver']);
    expect(nextNativeEngineMilestone(cueforgeStateV2.version).version).toBe('v0.3.0');
    expect(nativeRoadmap.next.codename).toBe('Native DSP Sandbox');
  });

  it('accepts Hearing Model v2 while migrating the old yes/no model safely', () => {
    const results = createEmptyHearingResults();
    results.left[4000] = {
      audibleAtDb: -24,
      comfortableAtDb: -18,
      harshAtDb: -6,
      confidence: 0.8
    };
    results.right[4000] = {
      audibleAtDb: -21,
      comfortableAtDb: -16,
      harshAtDb: -8,
      confidence: 0.8
    };
    const model = buildHearingModelV2({ results, fatigue: 'low' });
    const migrated = normalizeHearingResults({
      left: { 250: true },
      right: { 250: false }
    });

    expect(model.schema).toBe('cueforge.hearing-model.v2');
    expect(model.bands).toEqual([125, 250, 500, 1000, 2000, 3000, 4000, 6000, 8000, 12000]);
    expect(model.thresholds.left[4000].comfortableAtDb).toBe(-18);
    expect(model.safety.maxHearingBoostDb).toBeLessThanOrEqual(3);
    expect(migrated.left[250].legacy).toBe('heard');
    expect(migrated.right[250].legacy).toBe('missed');
  });

  it('keeps report exports redacted and package commands available for release gates', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'vitest',
      mediaDevices: {
        enumerateDevices: vi.fn(),
        getUserMedia: vi.fn()
      }
    });
    vi.stubGlobal('window', { innerWidth: 1280, innerHeight: 720, AudioContext: function AudioContext() {} });
    vi.stubGlobal('localStorage', {
      setItem: vi.fn(),
      removeItem: vi.fn()
    });

    const report = buildIssueReport({
      eq: Array(10).fill(0),
      apoConfig: 'Preamp: -4 dB',
      selectedGame: 'Valorant / CS2',
      selectedSourceProfile: 'competitive_fps',
      currentPage: 'Report Lab',
      sample: 'USB mic got weird at C:\\Users\\carls\\secret.txt',
      analysis: { clarity: 80 },
      browserDevices: [{ kind: 'audioinput', label: 'USB Audio Device', deviceId: 'secret-device-id' }],
      bridgeReport: {
        computer: 'CARLS-PC',
        soundDevices: [{ Name: 'HyperX QuadCast', DeviceID: 'USB\\VID_SECRET' }]
      },
      notes: 'Tester email test@example.com and phone 555-123-4567'
    });
    const audit = runPrivacyAudit([{ name: 'issue report', payload: report }], {
      now: new Date('2026-05-24T00:00:00Z')
    });
    const packageJson = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));

    expect(validateIssueReport(report).ok).toBe(true);
    expect(audit.status).toBe('pass');
    expect(JSON.stringify(report)).not.toContain('carls');
    expect(JSON.stringify(report)).not.toContain('test@example.com');
    expect(JSON.stringify(report)).not.toContain('555-123-4567');
    expect(packageJson.scripts.test).toContain('vitest');
    expect(packageJson.scripts.build).toContain('vite build');

    vi.unstubAllGlobals();
  });
});
