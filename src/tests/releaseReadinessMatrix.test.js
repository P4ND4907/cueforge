import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { createBlindMatchResult } from '../blindMatch.js';
import { buildAutoDetectReport, summarizeAutoDetectReport } from '../core/autoDetectReport.js';
import { nativeEvidenceToBridgeReport } from '../core/chain/evidence.ts';
import { buildChainGraph } from '../core/chainGraph.js';
import { buildCommandCenterSummary } from '../core/commandCenterFlow.js';
import { detectAudioConflicts } from '../core/conflictDetector.js';
import { buildHearingModelV2 } from '../core/hearingModelV2.js';
import { validateNativeManifest } from '../core/manifests/validateNativeEngineManifest.ts';
import { computeReadinessScoreV2 } from '../core/readinessScore.js';
import { buildNativeEngineManifest } from '../engines/nativeEngineManifest.js';
import { buildExportPack } from '../exportPack.js';
import {
  createEmptyHearingResults,
  evaluateHearingAnswerConsistency,
  hearingFrequencies,
  updateThresholdEntry
} from '../hearingModel.js';
import { runMaskingFixture } from '../lab/harness/runMaskingFixture.ts';
import { buildIssueReport, validateIssueReport } from '../reportPack.js';
import { analyzeAudioFrame, signalBands } from '../signalAnalyzer.js';

function nativeFixture(overrides = {}) {
  return {
    manifestVersion: 'cueforge.native.v1',
    os: { family: 'windows', build: '10.0.26100' },
    endpoints: [
      {
        id: 'out-dac',
        name: 'USB DAC / IEM output',
        role: 'playback',
        transport: 'usb',
        sampleRates: [48000],
        channels: [2],
        defaultFor: ['playback']
      },
      {
        id: 'in-mic',
        name: 'USB microphone',
        role: 'recording',
        transport: 'usb',
        sampleRates: [48000],
        channels: [1],
        defaultFor: ['recording']
      }
    ],
    sessions: [],
    tools: {
      equalizerApo: true,
      peace: false,
      sonar: false,
      voicemeeter: false,
      vbCable: false
    },
    defaults: {
      playback: 'out-dac',
      recording: 'in-mic'
    },
    capabilities: {
      canReadDefaults: true,
      canReadSessions: true,
      canReadLoopback: false,
      canWriteApoDraft: true,
      canModifySystemState: false
    },
    ...overrides
  };
}

function browserFixture(permission = 'granted') {
  return {
    audioApi: true,
    micApi: true,
    permission,
    devices: [
      { kind: 'audiooutput', label: permission === 'denied' ? '' : 'Default output', isDefault: true },
      { kind: 'audioinput', label: permission === 'denied' ? '' : 'Default mic', isDefault: true }
    ]
  };
}

function filledHearingResults() {
  const results = createEmptyHearingResults();
  hearingFrequencies.forEach((frequency) => {
    results.left[frequency] = {
      audibleAtDb: -30,
      comfortableAtDb: frequency >= 6000 ? -20 : -24,
      harshAtDb: frequency >= 8000 ? -8 : null,
      confidence: 0.84
    };
    results.right[frequency] = {
      audibleAtDb: -28,
      comfortableAtDb: frequency >= 6000 ? -19 : -23,
      harshAtDb: frequency >= 8000 ? -7 : null,
      confidence: 0.82
    };
  });
  return results;
}

function timeDomain({ amp = 0.2, clip = false } = {}) {
  return Uint8Array.from({ length: 2048 }, (_, index) => {
    if (clip) return index % 2 ? 255 : 0;
    return Math.max(0, Math.min(255, Math.round(128 + Math.sin(index / 10) * amp * 127)));
  });
}

function spectrum(bands = {}) {
  const sampleRate = 48000;
  const data = new Uint8Array(1024);
  const binHz = (sampleRate / 2) / data.length;
  signalBands.forEach((band) => {
    const value = bands[band.id] ?? 0;
    const byteValue = value <= 100 ? Math.round(value * 2.55) : value;
    const start = Math.max(0, Math.floor(band.from / binHz));
    const end = Math.min(data.length, Math.ceil(band.to / binHz));
    for (let index = start; index < end; index += 1) data[index] = byteValue;
  });
  return data;
}

function stubReportGlobals() {
  vi.stubGlobal('navigator', {
    userAgent: 'vitest',
    mediaDevices: {
      enumerateDevices: vi.fn(),
      getUserMedia: vi.fn()
    }
  });
  vi.stubGlobal('window', { innerWidth: 1280, innerHeight: 800, AudioContext: function AudioContext() {} });
  vi.stubGlobal('localStorage', {
    setItem: vi.fn(),
    removeItem: vi.fn()
  });
}

describe('release readiness matrix', () => {
  it('Auto Detect: browser only with denied permission reports partial confidence and asks for explicit scan/export', () => {
    const report = buildAutoDetectReport({
      browserDevices: browserFixture('denied').devices,
      permissionState: 'denied',
      detectedAt: '2026-05-24T00:00:00.000Z'
    });

    expect(report.source).toBe('browser');
    expect(report.permissionState).toBe('denied');
    expect(report.confidence).toMatchObject({ tier: 'partial', requiresExplicitScan: true });
    expect(report.risks.map((item) => item.id)).toContain('browser_only_scan');
    expect(report.recommendations.join(' ')).toMatch(/Windows bridge scan\/export/i);
  });

  it('Auto Detect: USB mic + DAC + APO gets endpoint roles and no double-EQ warning', () => {
    const bridgeReport = nativeEvidenceToBridgeReport(nativeFixture());
    const report = buildAutoDetectReport({ bridgeReport, desktopReady: true });

    expect(report.devices.windowsRenderDevices[0]).toMatchObject({ role: 'output', label: 'USB DAC / IEM output' });
    expect(report.devices.windowsCaptureDevices[0]).toMatchObject({ role: 'input', label: 'USB microphone' });
    expect(report.companions.equalizerApo.detected).toBe(true);
    expect(report.risks.map((item) => item.id)).not.toContain('sonar_apo_target_mismatch');
    expect(report.risks.map((item) => item.id)).not.toContain('multiple_spatial_layers');
  });

  it('Auto Detect: Sonar + APO stacked is flagged as double-processing/endpoint risk', () => {
    const bridgeReport = nativeEvidenceToBridgeReport(nativeFixture({
      endpoints: [
        { id: 'sonar-game', name: 'SteelSeries Sonar - Gaming', role: 'playback', transport: 'virtual', defaultFor: ['playback'] },
        { id: 'out-dac', name: 'USB DAC / IEM output', role: 'playback', transport: 'usb' },
        { id: 'in-mic', name: 'USB microphone', role: 'recording', transport: 'usb', defaultFor: ['recording'] }
      ],
      tools: { equalizerApo: true, sonar: true, voicemeeter: false, vbCable: false },
      defaults: { playback: 'sonar-game', recording: 'in-mic' }
    }));
    const report = buildAutoDetectReport({ bridgeReport, desktopReady: true });
    const graph = buildChainGraph({ bridgeReport });
    const conflicts = detectAudioConflicts({ graph });

    expect(report.risks.map((item) => item.id)).toEqual(expect.arrayContaining(['sonar_virtual_output', 'sonar_apo_target_mismatch']));
    expect(conflicts.conflicts.map((item) => item.id)).toEqual(expect.arrayContaining(['sonar_plus_apo_uncertain_target']));
    expect(conflicts.chainHealth.warnings.join(' ')).toMatch(/Sonar \+ APO/i);
  });

  it('Auto Detect: Voicemeeter + VB-Cable renders a virtual route graph and requests manual verification', () => {
    const bridgeReport = nativeEvidenceToBridgeReport(nativeFixture({
      tools: { equalizerApo: false, sonar: false, voicemeeter: true, vbCable: true },
      endpoints: [
        { id: 'vm-out', name: 'Voicemeeter Input', role: 'playback', transport: 'virtual', defaultFor: ['playback'] },
        { id: 'cable-out', name: 'CABLE Output (VB-Audio Virtual Cable)', role: 'recording', transport: 'virtual', defaultFor: ['recording'] },
        { id: 'out-dac', name: 'USB DAC / IEM output', role: 'playback', transport: 'usb' }
      ],
      defaults: { playback: 'vm-out', recording: 'cable-out' }
    }));
    const report = buildAutoDetectReport({ bridgeReport, desktopReady: true });
    const graph = buildChainGraph({ bridgeReport });

    expect(report.risks.map((item) => item.id)).toContain('virtual_routing_present');
    expect(graph.virtualRoutes.map((item) => item.label).join(' ')).toMatch(/Voicemeeter|VB-CABLE/i);
    expect(graph.suggestions.join(' ')).toMatch(/Discord|game|devices|routing/i);
  });

  it('Auto Detect: wireless headset chat/game endpoints are recognized and surfaced', () => {
    const bridgeReport = nativeEvidenceToBridgeReport(nativeFixture({
      endpoints: [
        { id: 'game', name: 'Arctis Nova Wireless Game', role: 'playback', transport: 'virtual', defaultFor: ['playback'] },
        { id: 'chat', name: 'Arctis Nova Wireless Chat', role: 'communications', transport: 'virtual', defaultFor: ['communicationsPlayback'] },
        { id: 'mic', name: 'Arctis Nova Wireless Microphone', role: 'recording', transport: 'usb', defaultFor: ['recording'] }
      ],
      tools: { equalizerApo: false, sonar: false, voicemeeter: false, vbCable: false },
      defaults: { playback: 'game', communicationsPlayback: 'chat', recording: 'mic' },
      sessions: [
        { app: 'Game.exe', endpointId: 'game', active: true },
        { app: 'Discord.exe', endpointId: 'chat', active: true }
      ]
    }));
    const report = buildAutoDetectReport({ bridgeReport, desktopReady: true });

    expect(bridgeReport.matches.chatGameSplit).toBe(true);
    expect(report.risks.map((item) => item.id)).toContain('chat_game_split_detected');
    expect(summarizeAutoDetectReport(report).risks.join(' ')).toMatch(/Chat\/game split/i);
  });

  it('Readiness: missing mic permission stays blocked for player test even with complete desktop evidence', () => {
    const bridgeReport = nativeEvidenceToBridgeReport(nativeFixture());
    const graph = buildChainGraph({ browser: browserFixture('denied'), bridgeReport });
    const readiness = computeReadinessScoreV2({
      graph,
      conflicts: { conflicts: [], summary: { high: 0, medium: 0 } },
      profile: { id: 'competitive_fps_personalized' },
      hearing: { answered: 8, score: { answered: 8, complete: true } },
      exportReady: true,
      selfTests: [{ id: 'browser-audio', status: 'pass' }],
      betaCheckins: [{}, {}],
      permissionState: 'denied'
    });

    expect(readiness.status).toBe('blocked-mic-permission');
    expect(readiness.score).toBeLessThan(60);
    expect(readiness.blockers.join(' ')).toMatch(/Mic permission is blocked/i);
    expect(readiness.gates.find((gate) => gate.id === 'mic-readiness').ready).toBe(false);
  });

  it('Readiness: multiple risky layers reduce score and explain route risk', () => {
    const bridgeReport = nativeEvidenceToBridgeReport(nativeFixture({
      tools: {
        equalizerApo: true,
        sonar: true,
        voicemeeter: true,
        vbCable: true,
        dolby: true,
        razer: true
      },
      endpoints: [
        { id: 'sonar-game', name: 'SteelSeries Sonar - Gaming', role: 'playback', transport: 'virtual', defaultFor: ['playback'] },
        { id: 'vm-out', name: 'Voicemeeter Input', role: 'playback', transport: 'virtual' },
        { id: 'cable', name: 'CABLE Input (VB-Audio Virtual Cable)', role: 'playback', transport: 'virtual' },
        { id: 'out-dac', name: 'USB DAC / IEM output', role: 'playback', transport: 'usb' },
        { id: 'mic', name: 'USB microphone', role: 'recording', transport: 'usb', defaultFor: ['recording'] }
      ],
      defaults: { playback: 'sonar-game', recording: 'mic' }
    }));
    const graph = buildChainGraph({ bridgeReport });
    const conflicts = detectAudioConflicts({ graph });
    const readiness = computeReadinessScoreV2({
      graph,
      conflicts,
      profile: { id: 'competitive_fps_personalized' },
      hearing: { answered: 8, score: { answered: 8, complete: true } },
      exportReady: true,
      selfTests: [{ id: 'browser-audio', status: 'pass' }],
      betaCheckins: [{}, {}],
      permissionState: 'granted'
    });

    expect(conflicts.summary.high).toBeGreaterThan(0);
    expect(readiness.score).toBeLessThan(90);
    expect(readiness.blockers.join(' ')).toMatch(/High-risk audio chain conflict/i);
    expect(conflicts.conflicts.map((item) => item.id)).toEqual(expect.arrayContaining(['routing-stack', 'double-processing']));
  });

  it('Hearing: inconsistent repeated answers drop confidence and recommend retest', () => {
    const results = filledHearingResults();
    const repeatedAnswers = [
      { ear: 'left', frequency: 4000, response: 'not_heard', levelDb: -18 },
      { ear: 'left', frequency: 4000, response: 'clear', levelDb: -18 },
      { ear: 'right', frequency: 8000, response: 'clear', levelDb: -24 },
      { ear: 'right', frequency: 8000, response: 'too_sharp', levelDb: -20 }
    ];
    const consistency = evaluateHearingAnswerConsistency(repeatedAnswers);
    const model = buildHearingModelV2({ results, repeatedAnswers });

    expect(consistency.retestRecommended).toBe(true);
    expect(model.score.retestRecommended).toBe(true);
    expect(model.score.confidence).toBeLessThan(model.score.answered ? 84 : 100);
    expect(model.consistency.recommendation).toMatch(/Retest/i);
  });

  it('Hearing: valid threshold ladder per ear generates bounded safe compensation', () => {
    const results = createEmptyHearingResults();
    hearingFrequencies.forEach((frequency) => {
      results.left[frequency] = updateThresholdEntry(results.left[frequency], 'clear', frequency >= 6000 ? -18 : -24);
      results.right[frequency] = updateThresholdEntry(results.right[frequency], 'clear', frequency >= 6000 ? -17 : -23);
    });
    const model = buildHearingModelV2({ results });

    expect(model.score.complete).toBe(true);
    expect(model.compensation.length).toBe(10);
    expect(Math.max(...model.compensation.map((point) => point.averageDb))).toBeLessThanOrEqual(3);
    expect(Math.max(...model.compensation.filter((point) => point.frequency >= 6000).map((point) => point.averageDb))).toBeLessThanOrEqual(2);
    expect(model.equalizerApoOverlay).toContain('Preamp:');
  });

  it('Blind Match: deterministic A/B cue deltas shift learned curve in expected direction', () => {
    const result = createBlindMatchResult({
      footstep_vs_comfort: 'a',
      bass_vs_comms: 'b',
      wide_vs_center: 'b'
    }, Array(10).fill(0));

    expect(result.completedRounds).toBe(3);
    expect(result.eq[6]).toBeGreaterThan(0);
    expect(result.eq[7]).toBeGreaterThan(0);
    expect(result.preferenceModel.footstepPriority).toBeGreaterThan(0);
    expect(result.preferenceModel.voiceClarity).toBeGreaterThan(0);
  });

  it('Masking Lab: explosion + footsteps fixture improves the target metric', async () => {
    const fixture = await runMaskingFixture({
      sampleRate: 48000,
      durationSec: 1,
      seed: 907,
      scenarioId: 'footsteps-under-explosion',
      footstep: { steps: 3, pan: -0.15 },
      masker: { gain: 0.42, pan: 0.1 }
    });

    expect(fixture.schema).toBe('cueforge.masking-fixture-result.v1');
    expect(fixture.improved).toBe(true);
    expect(fixture.after.fpsClarity).toBeGreaterThanOrEqual(fixture.before.fpsClarity);
  });

  it('Signal Analyzer: synthetic buffers classify clipping, masking, quiet voice, and usable signal', () => {
    const clipping = analyzeAudioFrame({
      timeDomain: timeDomain({ clip: true }),
      frequencyData: spectrum({ voice: 70, presence: 60 }),
      sampleRate: 48000
    });
    const masking = analyzeAudioFrame({
      timeDomain: timeDomain({ amp: 0.22 }),
      frequencyData: spectrum({ rumble: 95, bass: 90, lowMid: 80, cue: 10, voice: 15 }),
      sampleRate: 48000
    });
    const quiet = analyzeAudioFrame({
      timeDomain: timeDomain({ amp: 0.04 }),
      frequencyData: spectrum({ voice: 5, presence: 4, cue: 4 }),
      sampleRate: 48000
    });
    const usable = analyzeAudioFrame({
      timeDomain: timeDomain({ amp: 0.18 }),
      frequencyData: spectrum({ rumble: 8, bass: 8, lowMid: 10, voice: 58, presence: 55, cue: 58, edge: 8, air: 4 }),
      sampleRate: 48000
    });

    expect(clipping.probableCause).toBe('input-clipping');
    expect(masking.probableCause).toBe('low-end-masking');
    expect(quiet.probableCause).toBe('voice-too-quiet');
    expect(usable.probableCause).toBe('usable-signal');
  });

  it('Export: redacted issue report and native manifest export do not leak raw IDs, paths, emails, or phones', () => {
    stubReportGlobals();
    const rawDeviceId = 'USB\\VID_PRIVATE_907';
    const rawPath = 'C:\\Users\\carls\\secret\\config.txt';
    const report = buildIssueReport({
      eq: Array(10).fill(0),
      apoConfig: 'Preamp: -1.0 dB',
      selectedGame: 'Siege',
      selectedSourceProfile: 'competitive',
      currentPage: 'Report Lab',
      sample: `Bad sound from ${rawPath}`,
      analysis: { probableCause: 'low-end-masking' },
      browserDevices: [{ kind: 'audiooutput', label: 'USB DAC', deviceId: rawDeviceId, groupId: 'group-private' }],
      notes: `Email ${'tester'}@${'example.com'} phone ${'907'}-${'555'}-${'1212'}`
    });
    const manifest = buildNativeEngineManifest({
      recommendedProfile: { eq: [0, 1, 2] },
      readiness: { tier: 'match_ready' },
      conflicts: { summary: { high: 0 } }
    });
    const pack = buildExportPack({
      apoConfig: 'Preamp: -1.0 dB',
      cueforgeState: {
        devices: {
          output: { label: 'USB DAC', deviceId: rawDeviceId },
          input: { label: 'USB mic', path: rawPath }
        },
        exports: { engineManifest: manifest }
      }
    });
    const serialized = JSON.stringify({ report, pack, manifest });

    expect(validateIssueReport(report).ok).toBe(true);
    expect(report.diagnostics.browserDevices[0].fingerprint).toMatch(/^cfp_[a-f0-9]{20}$/);
    expect(pack.files['export-fingerprints.json']).toMatch(/cfp_[a-f0-9]{20}/);
    expect(serialized).not.toContain(rawDeviceId);
    expect(serialized).not.toContain(rawPath);
    expect(serialized).not.toContain('tester@example.com');
    expect(serialized).not.toContain('907-555-1212');
    vi.unstubAllGlobals();
  });

  it('Desktop: Electron preload exposes only allowed CueForge APIs', () => {
    const preload = readFileSync(resolve(process.cwd(), 'electron/preload.cjs'), 'utf8');
    const allowedApis = [
      'isDesktop',
      'info',
      'getDesktopInfo',
      'scanAudioSetup',
      'readBridgeReport',
      'openBridgeFolder',
      'saveApoDraft',
      'openApoDraftFolder'
    ];

    expect(preload).toContain("contextBridge.exposeInMainWorld('cueforgeDesktop'");
    allowedApis.forEach((name) => expect(preload).toContain(name));
    expect(preload).not.toContain("exposeInMainWorld('ipcRenderer'");
    expect(preload).not.toContain('sendSync');
    expect(preload).not.toContain('eval(');
  });

  it('UI: guided flow default is visible/actionable and Auto Detect summary renders graph warnings/fixes', () => {
    const bridgeReport = nativeEvidenceToBridgeReport(nativeFixture({
      tools: { equalizerApo: true, sonar: true, voicemeeter: false, vbCable: false }
    }));
    const graph = buildChainGraph({ bridgeReport });
    const conflicts = detectAudioConflicts({ graph });
    const readiness = computeReadinessScoreV2({
      graph,
      conflicts,
      profile: { id: 'competitive_fps_personalized' },
      hearing: { answered: 8, score: { answered: 8, complete: true } },
      exportReady: true,
      selfTests: [{ id: 'browser-audio', status: 'pass' }],
      betaCheckins: [{}, {}],
      permissionState: 'granted'
    });
    const commandCenter = buildCommandCenterSummary({
      chainGraph: graph,
      conflicts,
      readiness,
      profile: { recommendation: { id: 'competitive_fps_personalized', label: 'Competitive FPS' } },
      applyPath: { mode: 'export-only', reason: 'No native apply step runs silently.' }
    });

    expect(commandCenter.cards.map((card) => card.label)).toEqual([
      'Setup Health',
      'Active Profile',
      'Audio Chain',
      'Next Best Action',
      'Last Match Feedback',
      'Export / Apply Status'
    ]);
    expect(commandCenter.nextBestAction).toMatch(/Confirm APO Path|Run one real match|output check/i);
    expect(conflicts.chainHealth.warnings.join(' ')).toMatch(/Sonar \+ APO|Spatial layer/i);
  });

  it('UI: report replay flow keeps EQ state and replay notice intact', () => {
    stubReportGlobals();
    const eq = [-1, 0.5, 0.2, -0.8, 0, 0.4, 1.1, 1.2, -0.4, -0.6];
    const report = buildIssueReport({
      eq,
      apoConfig: 'Preamp: -2.0 dB',
      selectedGame: 'Tarkov',
      selectedSourceProfile: 'competitive_fps',
      currentPage: 'Report Lab',
      sample: 'Footsteps buried under explosions',
      analysis: { probableCause: 'low-end-masking' },
      browserDevices: []
    });

    expect(validateIssueReport(report)).toEqual({ ok: true, reason: 'Report is ready to replay.' });
    expect(report.reproducibleState.eq).toEqual(eq);
    expect(report.reproducibleState.equalizerApoConfig).toContain('Preamp');
    vi.unstubAllGlobals();
  });

  it('Visual/Contracts: golden-page list and native manifest schema stay explicit', () => {
    const goldenPages = ['Command Center', 'Auto Detect', 'Hearing', 'Blind Match', 'Report Lab'];
    const invalidManifest = validateNativeManifest({
      manifestVersion: 'cueforge.native.v1',
      os: { family: 'windows' },
      endpoints: [{ id: '', name: '', role: 'playback' }],
      tools: { equalizerApo: true },
      capabilities: {
        canReadDefaults: true,
        canReadSessions: true,
        canReadLoopback: false,
        canWriteApoDraft: true,
        canModifySystemState: true
      }
    });

    expect(goldenPages).toEqual(['Command Center', 'Auto Detect', 'Hearing', 'Blind Match', 'Report Lab']);
    expect(invalidManifest.ok).toBe(false);
    expect(invalidManifest.errors.join(' ')).toMatch(/actionable|string|canModifySystemState|min/i);
  });
});
