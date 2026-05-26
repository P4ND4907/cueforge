import { describe, expect, it } from 'vitest';
import { buildChainGraph } from '../core/chain/buildChainGraph.ts';
import { inferReadiness } from '../core/chain/inferReadiness.ts';
import { validateNativeEngineManifest, validateNativeManifest } from '../core/manifests/validateNativeEngineManifest.ts';
import { buildNativeEngineManifest } from '../engines/nativeEngineManifest.js';
import { normalizeMachineEvidence } from '../core/chain/evidence.ts';
import { assessMachine } from '../detection/assessMachine.ts';
import { detectDoubleEq } from '../detection/heuristics/detectDoubleEq.ts';
import { renderOfflineFixture } from '../lab/harness/renderOfflineFixture.ts';
import { runMaskingFixture } from '../lab/harness/runMaskingFixture.ts';
import { generateFootsteps } from '../lab/generators/footsteps.ts';

describe('architecture scaffold', () => {
  it('keeps the new chain folder wired to the current chain logic', () => {
    const graph = buildChainGraph({
      browserDevices: [{ kind: 'audiooutput', label: 'USB DAC' }],
      userSelections: { game: 'test match' }
    });

    expect(graph.outputPath.length).toBeGreaterThan(0);
    expect(graph.confidence).toBeGreaterThan(0);
  });

  it('validates native manifests from the existing engine builder', () => {
    const manifest = buildNativeEngineManifest({ state: { recommendedProfile: { eq: [] } } });
    expect(validateNativeEngineManifest(manifest).ok).toBe(true);
  });

  it('validates the desktop helper manifest contract and blocks system-state modification claims', () => {
    const manifest = {
      manifestVersion: 'cueforge.native.v1',
      os: { family: 'windows', build: '10.0.26100' },
      endpoints: [
        {
          id: 'playback-1',
          name: 'USB DAC / IEM output',
          role: 'playback',
          transport: 'usb',
          sampleRates: [48000],
          channels: [2],
          defaultFor: ['playback']
        },
        {
          id: 'recording-1',
          name: 'HyperX USB mic',
          role: 'recording',
          transport: 'usb',
          sampleRates: [48000],
          channels: [1],
          defaultFor: ['recording']
        }
      ],
      tools: {
        equalizerApo: true,
        peace: false,
        sonar: true,
        voicemeeter: false,
        vbCable: false
      },
      capabilities: {
        canReadDefaults: true,
        canReadSessions: true,
        canReadLoopback: false,
        canWriteApoDraft: true,
        canModifySystemState: false
      }
    };
    const valid = validateNativeManifest(manifest);

    expect(valid.ok).toBe(true);
    expect(valid.manifest.endpoints[0].sampleRates).toEqual([48000]);

    const unsafe = validateNativeManifest({
      ...manifest,
      capabilities: {
        ...manifest.capabilities,
        canModifySystemState: true
      }
    });

    expect(unsafe.ok).toBe(false);
    expect(unsafe.errors.join(' ')).toContain('capabilities.canModifySystemState');
  });

  it('runs fixture and heuristic helpers', () => {
    const fixture = renderOfflineFixture([generateFootsteps({ seconds: 1, steps: 2 })]);
    expect(fixture.samples.length).toBe(48000);

    const doubleEq = detectDoubleEq({
      companions: {
        equalizerApo: { detected: true },
        sonar: { detected: true }
      }
    });
    expect(doubleEq.warning).toContain('Multiple');

    const readiness = inferReadiness({});
    expect(readiness.schema).toBe('cueforge.readiness.v2');
  });

  it('runs deterministic rendered masking fixtures through the signal analyzer', async () => {
    const fixture = {
      sampleRate: 48000,
      durationSec: 1,
      seed: 907,
      scenarioId: 'footsteps-under-explosion',
      footstep: { steps: 3, pan: -0.2 },
      masker: { gain: 0.42, pan: 0.1 }
    };
    const first = await runMaskingFixture(fixture);
    const second = await runMaskingFixture(fixture);

    expect(first.schema).toBe('cueforge.masking-fixture-result.v1');
    expect(first.renderer).toMatch(/deterministic-js|offline-audio-context/);
    expect(first.before.fpsClarity).toBe(second.before.fpsClarity);
    expect(first.after.fpsClarity).toBe(second.after.fpsClarity);
    expect(first.improved).toBe(true);
    expect(first.after.fpsClarity).toBeGreaterThanOrEqual(first.before.fpsClarity);
  });

  it('merges browser hints with native evidence and lets native evidence carry confidence', () => {
    const browser = {
      audioApi: true,
      micApi: true,
      permission: 'prompt',
      devices: [
        { kind: 'audiooutput', label: 'Default output' },
        { kind: 'audioinput', label: '' }
      ]
    };
    const native = {
      manifestVersion: 'cueforge.native.v1',
      os: { family: 'windows', build: 'test-build' },
      endpoints: [
        { id: 'endpoint-output-1', role: 'playback', name: 'SteelSeries Sonar - Gaming', transport: 'virtual', defaultFor: ['playback'] },
        { id: 'endpoint-output-2', role: 'playback', name: 'USB DAC / IEM output', transport: 'usb' },
        { id: 'endpoint-input-1', role: 'recording', name: 'HyperX QuadCast', transport: 'usb', defaultFor: ['recording'] }
      ],
      sessions: [{ app: 'Game.exe', endpointId: 'endpoint-output-1', active: true }],
      tools: {
        equalizerApo: true,
        sonar: true,
        voicemeeter: false,
        vbCable: false
      },
      capabilities: {
        canReadDefaults: true,
        canReadSessions: true,
        canReadLoopback: false,
        canWriteApoDraft: true,
        canModifySystemState: false
      }
    };

    const evidence = normalizeMachineEvidence({ browser, native });
    expect(evidence.source).toBe('browser+desktop_bridge');
    expect(evidence.evidenceConfidence).toBeGreaterThan(80);
    expect(evidence.bridgeReport.tools.steelSeriesSonar.installed).toBe(true);
    expect(evidence.bridgeReport.defaults.playback).toBe('SteelSeries Sonar - Gaming');

    const assessment = assessMachine(browser, native, {
      game: 'Rainbow Six Siege',
      selfTests: [{ id: 'browser-audio', status: 'pass' }],
      exportReady: true
    });

    expect(assessment.schema).toBe('cueforge.machine-assessment.v1');
    expect(assessment.source).toBe('browser+desktop_bridge');
    expect(assessment.confidence).toBeGreaterThan(0.8);
    expect(assessment.topology.nodes.some((item) => item.kind === 'virtual-mixer' && item.label.includes('Sonar'))).toBe(true);
    expect(assessment.topology.nodes.some((item) => item.kind === 'apo-layer')).toBe(true);
    expect(assessment.topology.edges.some((item) => item.relation === 'defaults-to')).toBe(true);
    expect(assessment.topology.warnings.some((item) => item.id === 'potential-double-eq-spatial-stack')).toBe(true);
    expect(assessment.graph.outputPath.map((item) => item.label).join(' ')).toContain('SteelSeries Sonar');
    expect(assessment.warnings.conflicts.some((item) => item.id === 'sonar_plus_apo_uncertain_target')).toBe(true);
    expect(assessment.readiness.schema).toBe('cueforge.readiness.v2');
    expect(assessment.autoDetect.source).toBe('browser+desktop_bridge');
  });
});
