import { describe, expect, it } from 'vitest';
import {
  getReleaseShipBar,
  releaseShipBars,
  summarizeReleaseShipBars,
  validateReleaseShipBars
} from '../data/releaseShipBars.js';

describe('release ship bars', () => {
  it('locks the v0.2 through v0.4 version themes and order', () => {
    expect(releaseShipBars.map((bar) => [bar.version, bar.theme])).toEqual([
      ['v0.2.0', 'Foundations'],
      ['v0.3.0', 'Proof'],
      ['v0.4.0', 'Production readiness']
    ]);
  });

  it('keeps the minimum ship bar concrete for each release', () => {
    expect(getReleaseShipBar('v0.2.0').minimumShipBar).toEqual(expect.arrayContaining([
      'Setup Command Center is the default landing surface.',
      'Playwright web smoke is release-blocking.',
      'Electron smoke is release-blocking.',
      'Hardware profile manifests exist and validate.',
      'Route graph schema exists and is consumed by detection, readiness, and reports.'
    ]));
    expect(getReleaseShipBar('v0.3.0').minimumShipBar).toEqual(expect.arrayContaining([
      'WASAPI loopback helper is live behind explicit local permission.',
      'FFmpeg/libebur128 regression job is live or reports a documented missing-tool fallback.',
      'Latency tests are live.',
      'Phase and stereo-health tests are live.',
      'Feedback ingestion is wired for redacted tester packets.'
    ]));
    expect(getReleaseShipBar('v0.4.0').minimumShipBar).toEqual(expect.arrayContaining([
      'Nightly Machine Play Lab runs on real Windows hardware.',
      'Release gating is enforced before public builds.',
      'Swarm manifests are checked in and validated.',
      'Redaction is audited as a release blocker.',
      'User-facing assessment summaries are trustworthy and explain confidence, warnings, and next action.'
    ]));
  });

  it('summarizes readiness from proof gates without guessing', () => {
    const summary = summarizeReleaseShipBars({
      'default-guided-flow': true,
      'playwright-web-smoke': true
    });

    expect(summary.schema).toBe('cueforge.release-ship-bars.v1');
    expect(summary.releaseCount).toBe(3);
    expect(summary.allReady).toBe(false);
    expect(summary.nextBlockedRelease.version).toBe('v0.2.0');
    expect(summary.nextBlockedRelease.missingProof).toContain('electron-smoke');
  });

  it('validates the contract as a release-planning gate', () => {
    expect(validateReleaseShipBars()).toEqual({ ok: true, issues: [] });
  });
});
