import { describe, expect, it, vi } from 'vitest';
import { buildAutoDetectReport } from '../core/autoDetectReport.js';
import { buildChainGraph } from '../core/chainGraph.js';
import { calculateReadinessScore } from '../core/readinessScore.js';
import { buildExportPack } from '../exportPack.js';
import { buildIssueReport } from '../reportPack.js';
import { browserDeviceFixture, desktopBridgeFixture } from '../data/testFixtures.js';

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

describe('UI acceptance criteria data contracts', () => {
  it('treats browser-only detection as partial evidence with an explicit scan path', () => {
    const report = buildAutoDetectReport({
      browserDevices: [
        { kind: 'audioinput', label: 'Name hidden until permission is granted' },
        { kind: 'audiooutput', label: 'audiooutput' }
      ],
      permissionState: 'blocked',
      detectedAt: '2026-05-24T00:00:00.000Z'
    });

    const riskIds = report.risks.map((risk) => risk.id);
    expect(report.source).toBe('browser');
    expect(report.confidence.tier).toMatch(/partial|limited|unknown/);
    expect(report.confidence.requiresExplicitScan).toBe(true);
    expect(riskIds).toEqual(expect.arrayContaining(['browser_only_scan', 'hidden_device_labels']));
    expect(report.recommendations.join(' ')).toMatch(/bridge scan|device names|mic permission/i);
  });

  it('surfaces route risks for native evidence instead of hiding them behind product badges', () => {
    const bridgeReport = {
      ...desktopBridgeFixture,
      defaults: {
        playback: 'Realtek Speakers',
        communicationsPlayback: 'SteelSeries Sonar Chat'
      },
      matches: {
        ...desktopBridgeFixture.matches,
        chatGameSplit: true
      }
    };
    const report = buildAutoDetectReport({
      browserDevices: browserDeviceFixture,
      bridgeReport,
      permissionState: 'granted',
      desktopReady: true
    });

    const riskIds = report.risks.map((risk) => risk.id);
    expect(report.source).toBe('browser+desktop_bridge');
    expect(report.confidence.score).toBeGreaterThanOrEqual(60);
    expect(riskIds).toEqual(expect.arrayContaining([
      'sonar_apo_target_mismatch',
      'default_endpoint_needs_check',
      'chat_game_split_detected'
    ]));
    expect(report.recommendations.join(' ')).toMatch(/endpoint|game endpoint|chat endpoint/i);
  });

  it('renders the audio chain as paths with confidence, processors, and manual verification warnings', () => {
    const bridgeReport = {
      ...desktopBridgeFixture,
      tools: {
        ...desktopBridgeFixture.tools,
        vbCable: { installed: true, displayName: 'VB-CABLE' },
        voicemeeter: { installed: true, displayName: 'Voicemeeter' }
      },
      matches: {
        ...desktopBridgeFixture.matches,
        virtualRouting: true
      }
    };
    const graph = buildChainGraph({
      browserDevices: browserDeviceFixture,
      bridgeReport,
      userSelections: {
        game: 'Counter-Strike 2',
        outputDevice: 'USB DAC Headphones'
      }
    });

    expect(graph.outputPath.map((item) => item.type)).toEqual(expect.arrayContaining(['app', 'windows', 'companion', 'apo', 'hardware']));
    expect(graph.inputPath.map((item) => item.type)).toEqual(expect.arrayContaining(['mic', 'windows', 'destination']));
    expect(graph.virtualRoutes.length).toBeGreaterThan(0);
    expect(graph.confidence).toBeGreaterThan(50);
    expect([...graph.problems, ...graph.suggestions].map((item) => item.fix || item).join(' ')).toMatch(/verify|Write down|manual/i);
  });

  it('explains low readiness with the highest-value next action', () => {
    const readiness = calculateReadinessScore({
      devices: {},
      calibration: {},
      chain: { risks: [] },
      exports: {}
    });

    expect(readiness.score).toBeLessThan(40);
    expect(readiness.tier).toBe('not_ready');
    expect(readiness.blockers).toContain('No output device confirmed.');
    expect(readiness.nextActions[0]).toBe('Run Auto Detect.');
  });

  it('keeps report and export artifacts replay-safe by redacting raw identifiers', () => {
    stubReportGlobals();
    const bridgeReport = {
      soundDevices: [
        {
          Name: 'USB DAC Headphones',
          deviceId: 'RAW-DEVICE-ID-123',
          groupId: 'RAW-GROUP-ID-456',
          path: 'C:\\Users\\carls\\secret\\audio.json'
        }
      ],
      contact: 'player@example.com',
      phone: '907-521-6032'
    };
    const issueReport = buildIssueReport({
      description: 'Player report from C:\\Users\\carls\\Desktop\\clip.wav by player@example.com',
      bridgeReport,
      uiFeedbackNotes: [
        { page: 'Report Lab', note: 'The box overlaps near 907-521-6032', target: 'button' }
      ]
    });
    const exportPack = buildExportPack({
      apoConfig: 'Preamp: -4 dB',
      calibration: { path: 'C:\\Users\\carls\\secret\\calibration.json' },
      uiFeedbackNotes: issueReport.userNotes,
      cueforgeState: {
        devices: {
          output: 'RAW-DEVICE-ID-123'
        },
        machineId: 'machine-secret'
      }
    });
    const combined = JSON.stringify({ issueReport, exportPack });

    expect(combined).not.toContain('RAW-DEVICE-ID-123');
    expect(combined).not.toContain('RAW-GROUP-ID-456');
    expect(combined).not.toContain('player@example.com');
    expect(combined).not.toContain('907-521-6032');
    expect(combined).not.toContain('C:\\Users\\carls');
    expect(combined).toContain('redactedExports');
    vi.unstubAllGlobals();
  });
});
