import { describe, expect, it } from 'vitest';
import { buildAudioChainGraph } from '../core/chainGraph.js';
import { conflictRules, detectAudioConflicts, evaluateConflictRules } from '../core/conflictDetector.js';
import { browserDeviceFixture, desktopBridgeFixture } from '../data/testFixtures.js';

describe('conflict detector v2', () => {
  it('exports the explicit audio doctor rule set', () => {
    expect(conflictRules.map((rule) => rule.id)).toEqual([
      'multiple_spatial_layers',
      'sonar_plus_apo_uncertain_target',
      'voicemeeter_route_complexity',
      'exclusive_mode_warning'
    ]);
  });

  it('flags browser-only setup and missing apply proof', () => {
    const graph = buildAudioChainGraph({ devices: browserDeviceFixture, bridgeReport: null });
    const report = detectAudioConflicts({ graph, eq: [0, 0, 0, 0, 0, 0, 2, 4, 3, 1] });

    expect(report.conflicts.map((item) => item.id)).toContain('desktop-bridge-missing');
    expect(report.conflicts.map((item) => item.id)).toContain('no-apply-target');
    expect(report.conflicts.map((item) => item.id)).toContain('treble-without-hearing');
    expect(report.clearToApply).toBe(false);
  });

  it('acts like an audio doctor for messy stacked sound shapers', () => {
    const messyBridge = {
      ...desktopBridgeFixture,
      tools: {
        ...desktopBridgeFixture.tools,
        fxSound: { installed: true, displayName: 'FxSound' },
        dolbyAccess: { installed: true, displayName: 'Dolby Atmos' },
        nahimic: { installed: true, displayName: 'Nahimic' }
      }
    };
    const graph = buildAudioChainGraph({ devices: browserDeviceFixture, bridgeReport: messyBridge });
    const report = detectAudioConflicts({
      graph,
      eq: Array(10).fill(0),
      hearing: { answered: 6 },
      betaCheckins: [{}, {}],
      bridgeReport: messyBridge
    });

    expect(report.conflicts.map((item) => item.id)).toContain('too-many-sound-shapers');
    expect(report.audioDoctor.headline).toMatch(/layers trying to shape sound/);
    expect(report.audioDoctor.summary).toMatch(/footsteps worse, not better/);
    expect(report.summary.shapingLayers).toBeGreaterThanOrEqual(4);
    expect(report.clearToApply).toBe(false);
  });

  it('flags when APO may be installed but not touching the active game path', () => {
    const graph = buildAudioChainGraph({ devices: browserDeviceFixture, bridgeReport: desktopBridgeFixture });
    const report = detectAudioConflicts({
      graph,
      eq: Array(10).fill(0),
      hearing: { answered: 6 },
      betaCheckins: [{}, {}],
      bridgeReport: desktopBridgeFixture
    });

    const apoRisk = report.conflicts.find((item) => item.id === 'apo-may-not-touch-active-path');
    expect(apoRisk).toBeTruthy();
    expect(apoRisk.fix).toMatch(/active Sonar\/virtual output|direct Windows output/);
    expect(report.audioDoctor.likelyApoBypass).toBe(true);
    expect(report.summary.likelyApoBypass).toBe(true);
  });

  it('summarizes player-facing chain health with blockers, warnings, and next action', () => {
    const graph = buildAudioChainGraph({ devices: browserDeviceFixture, bridgeReport: desktopBridgeFixture });
    const report = detectAudioConflicts({
      graph,
      eq: Array(10).fill(0),
      hearing: { answered: 6 },
      betaCheckins: [{}, {}],
      bridgeReport: desktopBridgeFixture
    });

    expect(report.chainHealth).toEqual({
      label: 'Audio Chain Health',
      score: 72,
      blockers: [],
      warnings: [
        'Sonar + APO detected. Confirm target endpoint.',
        'Spatial layer unknown. Run output check.'
      ],
      nextAction: 'Run "Confirm APO Path" test.'
    });
    expect(report.summary.chainHealthScore).toBe(72);
  });

  it('evaluates spatial, Sonar/APO, Voicemeeter, and exclusive-mode rules from canonical state', () => {
    const ruleHits = evaluateConflictRules({
      chain: {
        activeCompanions: [
          { name: 'Windows Sonic' },
          { name: 'Dolby Access / Atmos' },
          { name: 'Voicemeeter' },
          { name: 'Equalizer APO' },
          { name: 'SteelSeries Sonar' }
        ],
        sonarDetected: true,
        apoDetected: true,
        voicemeeterDetected: true
      },
      selectedGame: { title: 'Example FPS', usesExclusiveAudio: true }
    });

    expect(ruleHits.map((item) => item.id)).toEqual([
      'multiple_spatial_layers',
      'sonar_plus_apo_uncertain_target',
      'voicemeeter_route_complexity',
      'exclusive_mode_warning'
    ]);
    expect(ruleHits.find((item) => item.id === 'multiple_spatial_layers').severity).toBe('high');
    expect(ruleHits.find((item) => item.id === 'exclusive_mode_warning').fix).toMatch(/A\/B tone/);
  });
});
