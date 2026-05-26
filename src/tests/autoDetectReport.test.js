import { describe, expect, it } from 'vitest';
import { buildAutoDetectReport, summarizeAutoDetectReport } from '../core/autoDetectReport.js';
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
});
