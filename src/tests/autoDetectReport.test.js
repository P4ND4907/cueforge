import { describe, expect, it } from 'vitest';
import { buildAutoDetectReport, buildDesktopEvidenceSummary, summarizeAutoDetectReport } from '../core/autoDetectReport.js';
import { browserDeviceFixture, desktopBridgeFixture } from '../data/testFixtures.js';

describe('auto detect report v2', () => {
  it('normalizes browser and desktop bridge findings into one report', () => {
    const report = buildAutoDetectReport({
      browserDevices: browserDeviceFixture,
      bridgeReport: desktopBridgeFixture,
      permissionState: 'granted',
      desktopReady: true,
      detectedAt: '2026-05-23T00:00:00.000Z'
    });

    expect(report.schema).toBe('cueforge.auto-detect-report.v2');
    expect(report.detectedAt).toBe('2026-05-23T00:00:00.000Z');
    expect(report.source).toBe('browser+desktop_bridge');
    expect(report.devices.browserInputs[0].label).toBe('HyperX QuadCast');
    expect(report.devices.browserOutputs[0].label).toBe('USB DAC Headphones');
    expect(report.devices.windowsCaptureDevices[0].label).toContain('HyperX');
    expect(report.devices.windowsRenderDevices[0].label).toContain('DAC');
    expect(report.companions.equalizerApo).toMatchObject({ detected: true, confidence: 92 });
    expect(report.companions.peace.detected).toBe(true);
    expect(report.companions.sonar.detected).toBe(true);
    expect(report.companions.vbCable.detected).toBe(false);
    expect(report.suspectedHardware.map((item) => item.id)).toEqual(expect.arrayContaining(['usbMic', 'genericIem']));
    expect(report.risks.map((item) => item.id)).toEqual(expect.arrayContaining(['sonar_virtual_output', 'sonar_apo_target_mismatch']));
    expect(report.recommendations).toContain('Confirm which endpoint game audio uses before applying APO.');
  });

  it('keeps browser-only scans honest and does not leak raw ids', () => {
    const report = buildAutoDetectReport({
      browserDevices: [
        {
          kind: 'audioinput',
          label: 'USB Microphone device id: ABCDEF123456',
          deviceId: 'secret-browser-device-id',
          groupId: 'secret-browser-group-id'
        }
      ],
      permissionState: 'blocked',
      detectedAt: '2026-05-23T00:00:00.000Z'
    });

    expect(report.source).toBe('browser');
    expect(report.companions.windowsSonic.detected).toBeNull();
    expect(JSON.stringify(report)).not.toContain('secret-browser-device-id');
    expect(JSON.stringify(report)).not.toContain('secret-browser-group-id');
    expect(JSON.stringify(report)).not.toContain('ABCDEF123456');
    expect(report.risks.find((item) => item.id === 'browser_only_scan')).toMatchObject({
      severity: 'medium',
      title: 'Browser-only scan'
    });
    expect(report.recommendations[0]).toContain('Windows bridge scan');

    const summary = summarizeAutoDetectReport(report);
    expect(summary.detected[0]).toBe('Browser mic: USB Microphone [id-hidden] exposed');
    expect(summary.detected.join(' ')).not.toContain('Windows output');
  });

  it('adds cleaned display labels and stable alias keys for weird device names', () => {
    const report = buildAutoDetectReport({
      browserDevices: [
        { kind: 'audiooutput', label: '{0.0.0.00000000}.{abc} 3- Headphones (Arctis Nova Pro Wireless Game) #0009' },
        { kind: 'audioinput', label: 'Default - 00000000' }
      ],
      permissionState: 'granted',
      detectedAt: '2026-05-23T00:00:00.000Z'
    });

    expect(report.devices.browserOutputs[0]).toMatchObject({
      label: 'Headphones / Arctis Nova Pro Wireless Game',
      displayLabel: 'Headphones / Arctis Nova Pro Wireless Game',
      rawLabel: expect.stringContaining('Arctis Nova Pro'),
      needsAlias: false
    });
    expect(report.devices.browserOutputs[0].deviceKey).toMatch(/^cfdev_output_/);
    expect(report.devices.browserInputs[0]).toMatchObject({
      label: 'Microphone input 1',
      needsAlias: true
    });
  });

  it('summarizes the report into detected, risk, and recommendation copy', () => {
    const report = buildAutoDetectReport({
      browserDevices: browserDeviceFixture,
      bridgeReport: desktopBridgeFixture,
      detectedAt: '2026-05-23T00:00:00.000Z'
    });
    const summary = summarizeAutoDetectReport(report);

    expect(summary.detected).toEqual(expect.arrayContaining([
      'Windows output: USB DAC Headphones suspected',
      'Mic: HyperX QuadCast USB Microphone detected',
      'Equalizer APO: detected',
      'Sonar: detected'
    ]));
    expect(summary.risks).toContain('Sonar may be routing game audio through a virtual output');
    expect(summary.recommendations).toContain('Confirm which endpoint game audio uses before applying APO.');
  });

  it('explains desktop scan evidence across APO, mixers, chat apps, boosters, and device names', () => {
    const report = buildAutoDetectReport({
      bridgeReport: {
        ...desktopBridgeFixture,
        tools: {
          ...desktopBridgeFixture.tools,
          obs: { installed: true, displayName: 'OBS Studio', source: 'process' },
          fxSound: { installed: true, displayName: 'FxSound' },
          nvidiaBroadcast: { installed: true, displayName: 'NVIDIA Broadcast' },
          voicemeeter: { installed: true, displayName: 'Voicemeeter' },
          vbCable: { installed: true, displayName: 'VB-CABLE' }
        },
        mediaDevices: [
          { Name: 'SteelSeries Sonar - Gaming' },
          { Name: 'CABLE Output (VB-Audio Virtual Cable)' }
        ],
        sessions: [
          { app: 'Discord', processName: 'Discord', active: true },
          { app: 'OBS Studio', processName: 'obs64', active: true }
        ],
        matches: {
          ...desktopBridgeFixture.matches,
          virtualRouting: true
        }
      },
      desktopReady: true,
      detectedAt: '2026-05-23T00:00:00.000Z'
    });
    const desktop = buildDesktopEvidenceSummary(report);

    expect(report.companions.obs).toMatchObject({ detected: true, label: 'OBS Studio' });
    expect(desktop.cards.map((card) => card.id)).toEqual([
      'device-names',
      'apo-eq',
      'virtual-mixers',
      'voice-stream',
      'boosters',
      'mic-processing'
    ]);
    expect(desktop.cards.find((card) => card.id === 'device-names')).toMatchObject({
      status: 'found',
      detail: expect.stringContaining('Windows device names')
    });
    expect(desktop.cards.find((card) => card.id === 'apo-eq')?.items).toEqual(expect.arrayContaining(['Equalizer APO', 'Peace']));
    expect(desktop.cards.find((card) => card.id === 'virtual-mixers')?.items).toEqual(expect.arrayContaining(['SteelSeries Sonar', 'Voicemeeter', 'VB-CABLE']));
    expect(desktop.cards.find((card) => card.id === 'voice-stream')?.items).toEqual(expect.arrayContaining(['Discord', 'OBS Studio']));
    expect(desktop.cards.find((card) => card.id === 'boosters')?.items).toEqual(expect.arrayContaining(['FxSound']));
    expect(desktop.cards.find((card) => card.id === 'mic-processing')?.items).toEqual(expect.arrayContaining(['NVIDIA Broadcast']));
    expect(desktop.nextBestQuestions).toEqual(expect.arrayContaining([
      'Which endpoint does the game actually use?',
      'Is OBS listening to the same Stream Mix that CueForge is limiting?'
    ]));
  });
});
