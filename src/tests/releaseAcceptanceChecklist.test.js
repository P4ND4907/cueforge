import { describe, expect, it } from 'vitest';
import {
  commonConflictRuleRequirements,
  defaultReleaseCandidateEvidence,
  evaluateReleaseCandidateAcceptance,
  openReleaseLimitations,
  releaseAcceptanceChecklist,
  validateReleaseAcceptanceChecklist,
  validateOpenReleaseLimitations,
  validateReleaseNotesBoundary
} from '../data/releaseAcceptanceChecklist.js';

describe('release candidate acceptance checklist', () => {
  it('locks the public release-candidate ship blockers in order', () => {
    expect(releaseAcceptanceChecklist.map((item) => item.id)).toEqual([
      'setup-command-center-default',
      'autodetect-presence-active-conflicts',
      'desktop-native-scan-bridge-report',
      'web-electron-smoke',
      'real-windows-loopback-regression',
      'redacted-reports-no-private-data',
      'apo-draft-explicit-reversible',
      'common-conflict-rules-covered',
      'player-evidence-local-default',
      'build-metadata-visible',
      'release-notes-honest-boundary'
    ]);
  });

  it('keeps real Windows loopback proof as the honest hard blocker', () => {
    const result = evaluateReleaseCandidateAcceptance();

    expect(defaultReleaseCandidateEvidence.realWindowsLoopbackRegressionPassed).toBe(false);
    expect(result.status).toBe('BLOCKED');
    expect(result.ready).toBe(false);
    expect(result.hardBlockers.map((item) => item.id)).toEqual(['real-windows-loopback-regression']);
    expect(result.blockers[0].detail).toMatch(/realWindowsLoopbackRegressionPassed/);
  });

  it('passes only when every release-candidate proof key is present', () => {
    const result = evaluateReleaseCandidateAcceptance({
      realWindowsLoopbackRegressionPassed: true
    });

    expect(result.status).toBe('PASS');
    expect(result.ready).toBe(true);
    expect(result.blockers).toEqual([]);
  });

  it('requires the common messy Windows stack conflict rules', () => {
    const conflictCheck = releaseAcceptanceChecklist.find((item) => item.id === 'common-conflict-rules-covered');

    expect(conflictCheck.requiredRules).toEqual(commonConflictRuleRequirements);
    expect(conflictCheck.requiredRules).toEqual(expect.arrayContaining([
      'apo_plus_sonar',
      'sonar_plus_discord_effects',
      'voicemeeter_loop_echo_risk',
      'wrong_default_comms_endpoint'
    ]));
  });

  it('validates release notes boundary language without letting hype sneak in', () => {
    const safeCopy = [
      'CueForge is Windows-first for this release.',
      'It verifies the local audio chain and exports safe drafts.',
      'It does not promise engine-level occlusion for arbitrary games because true object data requires game-engine support.'
    ].join(' ');
    const unsafeCopy = 'CueForge guarantees exact enemy positions and true object-level occlusion for arbitrary games.';

    expect(validateReleaseNotesBoundary(safeCopy)).toEqual({ ok: true, issues: [] });
    expect(validateReleaseNotesBoundary(unsafeCopy).ok).toBe(false);
  });

  it('keeps open limitations honest for public release copy', () => {
    expect(openReleaseLimitations.map((item) => item.id)).toEqual([
      'windows-first-scope',
      'public-repo-visibility',
      'post-mix-spatial-truth'
    ]);
    expect(openReleaseLimitations[0].detail).toMatch(/WASAPI/);
    expect(openReleaseLimitations[0].detail).toMatch(/Core Audio/);
    expect(openReleaseLimitations[0].detail).toMatch(/PipeWire\/ALSA/);
    expect(openReleaseLimitations[1].detail).toMatch(/visible public files/);
    expect(openReleaseLimitations[2].releaseCopyRule).toMatch(/arbitrary-game post-mix/);
  });

  it('validates the checklist contract', () => {
    expect(validateReleaseAcceptanceChecklist()).toEqual({ ok: true, issues: [] });
    expect(validateOpenReleaseLimitations()).toEqual({ ok: true, issues: [] });
  });
});
