import { describe, expect, it, vi } from 'vitest';
import { buildIssueReport, redactDeep, sanitizeUserText, summarizeDevices, validateIssueReport } from './reportPack.js';

describe('issue report pack', () => {
  it('redacts local identifiers but keeps useful product hints', () => {
    const report = redactDeep({
      computer: 'CARLS-PC',
      soundDevices: [
        {
          name: 'HyperX QuadCast S microphone',
          deviceId: 'abc-123',
          configPath: 'C:\\Users\\carls\\AppData\\EqualizerAPO\\config.txt',
          groupId: 'group-456',
          pnpDeviceId: 'USB\\VID_0951'
        }
      ]
    });

    expect(report.computer).toBe('[redacted]');
    expect(report.soundDevices[0].name).toBe('Hyperx device');
    expect(report.soundDevices[0].deviceId).toBe('[redacted]');
    expect(report.soundDevices[0].configPath).toBe('[redacted]');
    expect(report.soundDevices[0].groupId).toBe('[redacted]');
    expect(report.soundDevices[0].pnpDeviceId).toBe('[redacted]');
  });

  it('builds a replayable issue report', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'vitest',
      mediaDevices: {
        enumerateDevices: vi.fn(),
        getUserMedia: vi.fn()
      }
    });
    vi.stubGlobal('window', { innerWidth: 1200, innerHeight: 800, AudioContext: function AudioContext() {} });
    vi.stubGlobal('localStorage', {
      setItem: vi.fn(),
      removeItem: vi.fn()
    });

    const eq = [-1, 1, 0, -2, -1, 0, 2, 3, 1, 0];
    const report = buildIssueReport({
      eq,
      apoConfig: 'Preamp: -4.5 dB',
      selectedGame: 'Warzone / Apex',
      selectedSourceProfile: 'iemFps',
      currentPage: 'reports',
      sample: 'HyperX mic is boomy C:\\Users\\carls\\secret.txt',
      analysis: { clarity: 80 },
      browserDevices: [{ kind: 'audioinput', label: 'USB Audio Device', deviceId: 'secret' }],
      selfTestResults: [{ name: 'Browser audio APIs', status: 'pass' }],
      uiFeedbackNotes: [{
        page: 'Mic Lab',
        tag: 'text issue',
        note: `The note has ${'555'}-${'123'}-${'4567'} in it`,
        target: { label: 'Run analysis', panel: 'Mic Analyzer' },
        viewport: { width: 1200, height: 800, xPercent: 50, yPercent: 50 }
      }],
      notes: `Steps sounded buried. ${'tester'}@${'example.com'} ${'555'}-${'123'}-${'4567'}`
    });

    expect(validateIssueReport(report)).toEqual({ ok: true, reason: 'Report is ready to replay.' });
    expect(report.reproducibleState.eq).toEqual(eq);
    expect(report.reproducibleState.sample).not.toContain('carls');
    expect(report.reproducibleState.equalizerApoConfig).toContain('Preamp');
    expect(report.diagnostics.browserDevices[0].label).toBe('Usb device');
    expect(report.diagnostics.browserDevices[0].fingerprint).toMatch(/^cfp_[a-f0-9]{20}$/);
    expect(report.privacy).toMatchObject({ localFirst: true, noSilentUpload: true, rawAudioIncluded: false, hashedFingerprints: true });
    expect(report.diagnostics.exportFingerprints.schema).toBe('cueforge.export-fingerprints.v1');
    expect(report.diagnostics.uiFeedbackNotes).toHaveLength(1);
    expect(report.diagnostics.uiFeedbackNotes[0].note).toContain('[redacted-phone]');
    expect(JSON.stringify(report)).not.toContain('secret');
    expect(JSON.stringify(report)).not.toContain('tester@example.com');

    vi.unstubAllGlobals();
  });

  it('summarizes audio devices without raw ids', () => {
    const devices = summarizeDevices([
      { kind: 'audiooutput', label: 'SteelSeries Sonar Gaming', deviceId: 'hidden', groupId: 'hidden' }
    ]);

    expect(devices[0]).toEqual({
      slot: 1,
      kind: 'audiooutput',
      label: 'Steelseries device',
      fingerprint: expect.stringMatching(/^cfp_[a-f0-9]{20}$/),
      hasRealName: true,
      source: 'browser-or-bridge'
    });
  });

  it('sanitizes user text before export', () => {
    const text = sanitizeUserText('email me at test@example.com from C:\\Users\\carls\\Audio\\file.json or 555-555-1212');

    expect(text).toContain('[redacted-email]');
    expect(text).toContain('[redacted-path]');
    expect(text).toContain('[redacted-phone]');
    expect(text).not.toContain('carls');
  });
});
