import { describe, expect, it } from 'vitest';
import { buildSetupIntelligence, buildSetupIntelligenceText } from './setupIntelligence.js';

const bridgeReport = {
  tools: {
    equalizerApo: { installed: true, path: 'C:/Program Files/EqualizerAPO' },
    peace: { installed: false },
    steelSeriesSonar: { installed: true, displayName: 'SteelSeries GG' },
    fxSound: { installed: true, displayName: 'FxSound' },
    dolbyAccess: { installed: true, displayName: 'Dolby Access' },
    vbCable: { installed: false }
  },
  soundDevices: [{ Name: 'HyperX QuadCast' }, { Name: 'USB DAC Headphones' }],
  mediaDevices: [],
  runningGames: [{ id: 'valorant', name: 'Valorant' }],
  matches: { hyperx: true, iemOrDac: true, virtualRouting: false }
};

describe('setup intelligence', () => {
  it('turns browser devices and bridge tools into a recommendation pack', () => {
    const pack = buildSetupIntelligence({
      devices: [{ kind: 'audioinput', label: 'HyperX QuadCast' }],
      bridgeReport,
      game: 'Tarkov / Siege / COD',
      budgetTier: 'no-spend',
      desktopReady: true
    });

    expect(pack.confidence).toBeGreaterThan(70);
    expect(pack.detected.namedMic).toMatch(/named mic/i);
    expect(pack.detected.namedOutput).toMatch(/named output/i);
    expect(pack.detected.companionLayers).toContain('SteelSeries Sonar');
    expect(pack.detected.companionLayers).toContain('FxSound');
    expect(pack.detected.runningGames).toContain('Valorant');
    expect(pack.gamePlan.profile).toBe('Competitive FPS');
    expect(pack.gamePlan.sourceProfile).toBe('competitiveFps');
    expect(pack.budgetPlan.label).toBe('Use what you have');
    expect(pack.chainStages.map((stage) => stage.id)).toContain('match-proof');
    expect(pack.proofGates.find((gate) => gate.id === 'desktop-scan').ready).toBe(true);
  });

  it('warns when browser mode lacks a Windows bridge report', () => {
    const pack = buildSetupIntelligence({
      devices: [{ kind: 'audioinput', label: '' }],
      bridgeReport: null,
      desktopReady: false
    });

    expect(pack.mode).toBe('browser');
    expect(pack.promise).toMatch(/full auto-detect needs the desktop scan/i);
    expect(pack.warnings.join(' ')).toMatch(/desktop mode is needed/i);
    expect(pack.riskFlags.find((flag) => flag.id === 'browser-only').severity).toBe('medium');
    expect(pack.proofGates.find((gate) => gate.id === 'desktop-scan').status).toBe('needed');
  });

  it('flags double processing from multiple enhancer or spatial layers', () => {
    const pack = buildSetupIntelligence({ bridgeReport, desktopReady: true });

    expect(pack.warnings.join(' ')).toMatch(/Multiple spatial\/enhancer layers/i);
    expect(pack.riskFlags.find((flag) => flag.id === 'double-processing').severity).toBe('high');
    expect(pack.proofGates.find((gate) => gate.id === 'risk-reviewed').ready).toBe(false);
  });

  it('formats a copyable setup intelligence note without raw ids', () => {
    const text = buildSetupIntelligenceText(buildSetupIntelligence({ bridgeReport, desktopReady: true }));

    expect(text).toContain('CueForge setup intelligence');
    expect(text).toContain('Proof label: local hardware proof ready');
    expect(text).toContain('Chain stages:');
    expect(text).toContain('Proof gates:');
    expect(text).not.toMatch(/DeviceID|PNP|groupId/i);
  });
});
