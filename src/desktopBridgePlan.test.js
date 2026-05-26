import { describe, expect, it } from 'vitest';
import { buildDesktopBridgeFixPlan, buildDesktopBridgeFixText } from './desktopBridgePlan.js';

describe('desktop bridge fix plan', () => {
  it('explains that browser mode needs the desktop shell', () => {
    const plan = buildDesktopBridgeFixPlan({ desktopAvailable: false });

    expect(plan.status).toBe('browser-needs-desktop');
    expect(plan.warningIsExpected).toBe(true);
    expect(plan.primaryOption).toMatchObject({
      label: 'Use desktop app for full scan',
      mode: 'open-desktop'
    });
    expect(plan.fallbackOption).toMatchObject({
      label: 'Continue browser-only',
      mode: 'browser-only'
    });
    expect(plan.developerCommands).toContain('npm run desktop');
    expect(plan.boundary).toContain('never silently bypass');
    expect(buildDesktopBridgeFixText(plan)).toContain('Browser mode can test Web Audio');
  });

  it('tells desktop users to run the Windows scan when no report is loaded', () => {
    const plan = buildDesktopBridgeFixPlan({
      desktopAvailable: true,
      desktopInfo: { reportPath: 'C:\\Users\\Panda\\AppData\\CueForge\\cueforge-audio-setup-report.json' }
    });

    expect(plan.status).toBe('desktop-needs-scan');
    expect(plan.summary).toContain('Run the Windows scan');
    expect(plan.playerSteps[0]).toBe('Open Auto Detect.');
  });

  it('marks the bridge ready when desktop and report are present', () => {
    const plan = buildDesktopBridgeFixPlan({
      desktopAvailable: true,
      desktopInfo: { reportPath: 'bridge.json' },
      bridgeReport: { soundDevices: [] }
    });

    expect(plan.status).toBe('desktop-ready');
    expect(plan.warningIsExpected).toBe(false);
    expect(plan.proofChecks).toContain('Privacy Export Audit passes after bridge data is included');
  });
});
