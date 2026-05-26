import { describe, expect, it } from 'vitest';
import {
  buildAudioChainGraph,
  buildChainGraph,
  buildChainWarnings,
  buildReadableAudioChainPath,
  buildReadableMicChainPath
} from '../core/chainGraph.js';
import { browserDeviceFixture, desktopBridgeFixture } from '../data/testFixtures.js';

describe('audio chain graph v2', () => {
  it('connects browser devices, bridge devices, companions, and apply targets', () => {
    const graph = buildAudioChainGraph({
      devices: browserDeviceFixture,
      bridgeReport: desktopBridgeFixture,
      game: 'Tarkov / Siege / COD',
      desktopReady: true
    });

    expect(graph.schema).toBe('cueforge.audio-chain-graph.v2');
    expect(graph.summary.inputs).toBeGreaterThan(0);
    expect(graph.summary.outputs).toBeGreaterThan(0);
    expect(graph.summary.applyTargets).toBeGreaterThan(0);
    expect(graph.summary.defaults).toBeGreaterThan(0);
    expect(graph.summary.sessions).toBeGreaterThan(0);
    expect(graph.summary.communicationApps).toBeGreaterThan(0);
    expect(graph.nodes.some((node) => node.label.includes('SteelSeries'))).toBe(true);
    expect(graph.nodes.some((node) => node.kind === 'physical-input' && node.label.includes('HyperX'))).toBe(true);
    expect(graph.nodes.some((node) => node.kind === 'physical-output' && node.label.includes('DAC'))).toBe(true);
    expect(graph.nodes.some((node) => node.kind === 'communication-app' && node.label.includes('Discord'))).toBe(true);
    expect(graph.nodes.some((node) => node.type === 'windows-default' && node.label.includes('multimedia'))).toBe(true);
    expect(graph.nodes.some((node) => node.kind === 'apo-layer' && node.label.includes('Equalizer APO'))).toBe(true);
    expect(graph.edges.some((edge) => edge.relation === 'defaults-to')).toBe(true);
    expect(graph.edges.some((edge) => edge.relation === 'processed-by')).toBe(true);
    expect(graph.edges.length).toBeGreaterThan(2);
  });

  it('builds a player-readable output path from game to player', () => {
    const graph = buildAudioChainGraph({
      devices: browserDeviceFixture,
      bridgeReport: desktopBridgeFixture,
      game: 'Rainbow Six Siege',
      desktopReady: true
    });
    const path = buildReadableAudioChainPath(graph);

    expect(path.map((stage) => stage.label)).toEqual([
      'Game',
      'Windows Output Device',
      'Possible Layer',
      'Physical DAC / Headset / IEM',
      'Player'
    ]);
    expect(path[0].value).toBe('Rainbow Six Siege');
    expect(path[1].value).toContain('DAC');
    expect(path[2].value).toContain('SteelSeries Sonar');
    expect(path[2].value).toContain('Equalizer APO');
    expect(path[3].detail).toContain('DAC / amp');
  });

  it('builds a player-readable mic path from mic to chat targets', () => {
    const graph = buildAudioChainGraph({
      devices: browserDeviceFixture,
      bridgeReport: {
        ...desktopBridgeFixture,
        tools: {
          ...desktopBridgeFixture.tools,
          nvidiaBroadcast: { installed: true, displayName: 'NVIDIA Broadcast' },
          vbCable: { installed: true, displayName: 'VB-CABLE' }
        }
      },
      game: 'Rainbow Six Siege',
      desktopReady: true
    });
    const path = buildReadableMicChainPath(graph);

    expect(path.map((stage) => stage.label)).toEqual([
      'Mic',
      'Windows Input Device',
      'Noise Suppression / Chat Layer',
      'Game Chat / Discord / Stream'
    ]);
    expect(path[0].value).toContain('HyperX');
    expect(path[2].value).toContain('NVIDIA Broadcast');
    expect(path[2].value).toContain('VB-CABLE');
    expect(path[3].detail).toContain('teammate feedback');
  });

  it('recommends fixes when trusted companion layers create routing risk', () => {
    const graph = buildAudioChainGraph({
      devices: browserDeviceFixture,
      bridgeReport: {
        ...desktopBridgeFixture,
        tools: {
          ...desktopBridgeFixture.tools,
          voicemeeter: { installed: true, displayName: 'Voicemeeter' },
          vbCable: { installed: true, displayName: 'VB-CABLE' }
        }
      }
    });
    const warnings = buildChainWarnings(graph);

    expect(warnings.some((warning) => warning.id === 'routing-stack')).toBe(true);
    expect(warnings.find((warning) => warning.id === 'routing-stack')?.fix).toContain('Pick one routing tool');
  });

  it('builds the simple product-facing chain graph shape for app features', () => {
    const graph = buildChainGraph({
      browserDevices: browserDeviceFixture,
      bridgeReport: desktopBridgeFixture
    });

    expect(Object.keys(graph)).toEqual([
      'schema',
      'nodes',
      'edges',
      'summary',
      'outputPath',
      'inputPath',
      'companions',
      'virtualRoutes',
      'confidence',
      'problems',
      'suggestions'
    ]);
    expect(graph.summary.outputs).toBeGreaterThan(0);
    expect(graph.nodes.some((item) => item.type === 'output')).toBe(true);
    expect(graph.nodes.some((item) => item.kind === 'communication-app' && item.label.includes('Discord'))).toBe(true);
    expect(graph.edges.some((item) => item.relation === 'defaults-to')).toBe(true);
    expect(graph.edges.some((item) => item.relation === 'processed-by')).toBe(true);
    expect(graph.outputPath[0]).toEqual({ type: 'app', label: 'Game audio', status: 'unknown' });
    expect(graph.outputPath.some((item) => item.type === 'companion' && item.label === 'SteelSeries Sonar' && item.status === 'active')).toBe(true);
    expect(graph.outputPath.some((item) => item.type === 'apo' && item.label === 'Equalizer APO' && item.status === 'detected')).toBe(true);
    expect(graph.outputPath.some((item) => item.type === 'hardware' && item.status === 'suspected')).toBe(true);
    expect(graph.inputPath.map((item) => item.type)).toContain('destination');
    expect(graph.problems.find((item) => item.id === 'sonar_apo_target_mismatch')).toMatchObject({
      severity: 'warning',
      title: 'APO may be installed on the wrong endpoint',
      fix: 'Apply APO to the active Sonar output or disable Sonar routing before testing.'
    });
    expect(graph.confidence).toBe(78);
  });
});
