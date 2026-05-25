import { describe, expect, it } from 'vitest';
import {
  getNativeEngineMilestone,
  nativeEngineRoadmap,
  nativeEngineRoadmapPrinciples,
  nextNativeEngineMilestone,
  summarizeNativeEngineRoadmap
} from '../data/nativeEngineRoadmap.js';

describe('native engine roadmap', () => {
  it('keeps the post-v0.2 release ladder in the intended order', () => {
    expect(nativeEngineRoadmap.map((milestone) => milestone.version)).toEqual([
      'v0.3.0',
      'v0.4.0',
      'v0.5.0',
      'v0.6.0',
      'v0.7.0',
      'v1.0.0'
    ]);
    expect(nativeEngineRoadmap.map((milestone) => milestone.codename)).toEqual([
      'Native DSP Sandbox',
      'Desktop Real-Time Preview',
      'Windows User-Mode Engine Path',
      'Mic Enhancement Pack',
      'Spatial Research Pack',
      'Signed Public Beta'
    ]);
  });

  it('makes v0.3 the next move after v0.2 and keeps it sandbox-only', () => {
    const next = nextNativeEngineMilestone('0.2.0-alpha.3');

    expect(next.version).toBe('v0.3.0');
    expect(next.deliverables).toContain('miniaudio prototype');
    expect(next.deliverables).toContain('native capture/render harness contract');
    expect(next.deliverables).toContain('explicit WASAPI loopback measurement spike');
    expect(next.deliverables).toContain('test WAV renderer');
    expect(next.proofGates).toContain('native harness request validation');
    expect(next.proofGates).toContain('loopback capture remains explicit, bounded, and local');
    expect(next.blockedScope).toContain('no driver install');
  });

  it('guards the desktop and Windows engine phases from hidden system changes', () => {
    const preview = getNativeEngineMilestone('v0.4.0');
    const windowsPath = getNativeEngineMilestone('v0.5.0');

    expect(preview.deliverables).toContain('NAudio sidecar evidence spike');
    expect(preview.proofGates).toContain('helper manifest validates before any UI consumes native evidence');
    expect(preview.deliverables).toContain('no driver install yet');
    expect(preview.proofGates).toContain('no hidden routing changes');
    expect(windowsPath.deliverables).toContain('signed build planning');
    expect(windowsPath.proofGates).toContain('user approval required before every system-level change');
    expect(windowsPath.blockedScope).toContain('no kernel-mode driver');
  });

  it('keeps mic and spatial work honest before public beta', () => {
    const mic = getNativeEngineMilestone('v0.6.0');
    const spatial = getNativeEngineMilestone('v0.7.0');
    const publicBeta = getNativeEngineMilestone('v1.0.0');

    expect(mic.deliverables).toContain('RNNoise adapter');
    expect(mic.proofGates).toContain('raw audio remains local by default');
    expect(spatial.deliverables).toContain('libmysofa HRTF loader');
    expect(spatial.deliverables).toContain('Steam Audio research sandbox');
    expect(spatial.proofGates).toContain('no exact enemy-position claim');
    expect(publicBeta.deliverables).toContain('signed installer and release notes');
    expect(publicBeta.blockedScope).toContain('no hidden telemetry');
  });

  it('summarizes the roadmap for UI and docs', () => {
    const summary = summarizeNativeEngineRoadmap({
      proof: {
        wavRenderer: true,
        privacyAudit: true
      }
    });

    expect(summary.schema).toBe('cueforge.native-engine-roadmap.v1');
    expect(summary.next.version).toBe('v0.3.0');
    expect(summary.milestoneCount).toBe(6);
    expect(summary.completedProofGates).toBe(2);
    expect(summary.totalProofGates).toBeGreaterThan(20);
    expect(nativeEngineRoadmapPrinciples[0]).toBe('Manifest first, processing second, system integration last.');
  });
});
