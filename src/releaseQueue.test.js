import { describe, expect, it } from 'vitest';
import {
  buildNextReleaseAction,
  buildReleaseProofState,
  buildReleaseUpdateDraft,
  releaseTargets,
  summarizeReleaseQueue
} from './releaseQueue.js';

describe('releaseQueue', () => {
  it('keeps the roadmap target-gated', () => {
    expect(releaseTargets).toHaveLength(5);
    expect(releaseTargets.map((target) => target.testerTarget)).toEqual([5, 10, 25, 50, 100]);
  });

  it('holds a target when testers exist but proof is missing', () => {
    const summary = summarizeReleaseQueue({ testerCount: 5, proof: { selfTest: true } });

    expect(summary.active.id).toBe('alpha-2-hardening');
    expect(summary.active.status).toBe('proof-needed');
    expect(summary.active.missingProof).toEqual(['privacyAudit', 'uiNotesReviewed', 'publicBuild']);
    expect(summary.nextAction).toContain('Hold Alpha 2 hardening');
  });

  it('advances to the next target only after gates pass', () => {
    const proof = {
      selfTest: true,
      privacyAudit: true,
      uiNotesReviewed: true,
      publicBuild: true
    };
    const summary = summarizeReleaseQueue({ testerCount: 5, proof });

    expect(summary.completed.map((target) => target.id)).toContain('alpha-2-hardening');
    expect(summary.active.id).toBe('alpha-3-evidence');
    expect(summary.active.status).toBe('queued');
  });

  it('derives proof from local app evidence conservatively', () => {
    const proof = buildReleaseProofState({
      selfTests: [{ status: 'pass' }, { status: 'pass' }],
      evidence: [{}, {}, {}],
      snapshots: [{}, {}, {}],
      lastReport: { schema: 'cueforge.issue-report.v1' },
      uiNotes: [],
      desktopReady: true,
      privacyAuditPassed: true,
      publicBuildVerified: true,
      patternMemoryReady: true
    });

    expect(proof.selfTest).toBe(true);
    expect(proof.privacyAudit).toBe(true);
    expect(proof.wavBenchmarks).toBe(true);
    expect(proof.reportReplay).toBe(true);
    expect(proof.patternMemory).toBe(true);
    expect(proof.desktopSmoke).toBe(true);
  });

  it('drafts a human update from the active target', () => {
    const summary = summarizeReleaseQueue({ testerCount: 0, proof: {} });
    const draft = buildReleaseUpdateDraft(summary);

    expect(draft).toContain('CueForge next build: Alpha 2 hardening');
    expect(draft).toContain('Quality-of-life pass');
    expect(buildNextReleaseAction(summary.active)).toContain('Collect 5 total tester signals');
  });
});
