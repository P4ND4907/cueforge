import { describe, expect, it, vi } from 'vitest';
import { buildSetupShareText } from './communityHub.js';
import { buildExportPack } from './exportPack.js';
import { buildIssueReport } from './reportPack.js';
import { buildPrivacyAuditText, findPrivacyLeaks, runPrivacyAudit } from './privacyAudit.js';

describe('privacy audit', () => {
  it('fails on raw private identifiers', () => {
    const leaks = findPrivacyLeaks({
      deviceId: 'USB\\VID_0951&PID_16DF',
      notes: 'email test@example.com from C:\\Users\\carls\\secret.txt or call 907-555-1212'
    });

    expect(leaks.map((item) => item.type)).toContain('sensitive key: deviceId');
    expect(leaks.some((item) => item.type === 'email')).toBe(true);
    expect(leaks.some((item) => item.type === 'phone')).toBe(true);
    expect(leaks.some((item) => item.type.includes('path'))).toBe(true);
  });

  it('passes sanitized export, report, and setup summary payloads', () => {
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

    const eq = [-1, 1, 0, -2, -1, 0, 2, 3, 1, 0];
    const apoConfig = 'Preamp: -4.5 dB\nFilter 1: ON PK Fc 31 Hz Gain -1.0 dB Q 1.20';
    const report = buildIssueReport({
      eq,
      apoConfig,
      selectedGame: 'Tactical FPS',
      selectedSourceProfile: 'iemFps',
      currentPage: 'Report Lab',
      sample: 'Path was C:\\Users\\carls\\secret.txt and email was test@example.com',
      analysis: { clarity: 80 },
      browserDevices: [{ kind: 'audioinput', label: 'HyperX QuadCast', deviceId: 'raw-id' }],
      bridgeReport: { computer: 'PANDA-PC', mediaDevices: [{ name: 'USB mic', deviceId: 'raw-id' }] },
      notes: 'Call 907-555-1212'
    });
    const pack = buildExportPack({
      apoConfig,
      calibration: { eq, equalizerApoConfig: apoConfig },
      hearing: null,
      dna: null,
      uiFeedbackNotes: [{ note: 'C:\\Users\\carls\\bad.txt test@example.com', tag: 'text issue' }]
    });
    const setup = buildSetupShareText({
      devices: [{ kind: 'audioinput', label: 'HyperX QuadCast deviceid abcdef12345', deviceId: 'secret' }],
      bridgeReport: { soundDevices: [{ Name: 'SteelSeries Sonar Gaming {7d8a58e4-8b4d-48a4-9f6c-222222222222}' }] }
    });

    const audit = runPrivacyAudit([
      { name: 'issue report', payload: report },
      { name: 'export pack', payload: pack },
      { name: 'setup summary', payload: setup }
    ], { now: new Date('2026-05-22T12:00:00.000Z') });

    expect(audit.status).toBe('pass');
    expect(audit.leakCount).toBe(0);
    expect(buildPrivacyAuditText(audit)).toContain('no raw emails');

    vi.unstubAllGlobals();
  });
});
