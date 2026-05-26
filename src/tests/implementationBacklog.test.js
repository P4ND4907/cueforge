import { describe, expect, it } from 'vitest';
import {
  getImplementationBacklogByLane,
  getImplementationBacklogByStage,
  getImplementationTask,
  getNextImplementationTasks,
  implementationBacklog,
  implementationEffort,
  implementationStatus,
  summarizeImplementationBacklog,
  validateImplementationBacklog
} from '../data/implementationBacklog.js';

describe('implementation backlog', () => {
  it('tracks the full release-path task list with honest effort counts', () => {
    const summary = summarizeImplementationBacklog();

    expect(implementationBacklog).toHaveLength(14);
    expect(summary).toMatchObject({
      schema: 'cueforge.implementation-backlog.v1',
      taskCount: 14,
      byEffort: {
        low: 4,
        medium: 8,
        high: 2
      }
    });
  });

  it('keeps native endpoint and WASAPI work as the only high-effort tasks', () => {
    const highEffort = implementationBacklog
      .filter((item) => item.effort === implementationEffort.high)
      .map((item) => item.id);

    expect(highEffort).toEqual(['windows-default-endpoints-helper', 'wasapi-loopback-helper']);
    expect(getImplementationTask('wasapi-loopback-helper').proof).toContain('protected playback boundary');
  });

  it('marks existing foundations as live instead of pretending they are still queued', () => {
    expect(getImplementationTask('conflict-rules-engine').status).toBe(implementationStatus.live);
    expect(getImplementationTask('hardware-profile-manifests').status).toBe(implementationStatus.live);
    expect(getImplementationTask('playwright-web-smoke').status).toBe(implementationStatus.live);
    expect(getImplementationTask('playwright-electron-smoke').status).toBe(implementationStatus.live);
    expect(getImplementationTask('fixture-pack').status).toBe(implementationStatus.inProgress);
  });

  it('groups work by release stage and lane for planning', () => {
    expect(getImplementationBacklogByStage('v0.2-hardening').map((item) => item.id)).toEqual([
      'extract-feature-modules',
      'canonical-chain-graph-schema',
      'conflict-rules-engine',
      'playwright-web-smoke',
      'playwright-electron-smoke',
      'hardware-profile-manifests',
      'commit-readiness-smoke'
    ]);
    expect(getImplementationBacklogByLane('native-helper').map((item) => item.id)).toEqual([
      'windows-default-endpoints-helper',
      'wasapi-loopback-helper'
    ]);
  });

  it('picks practical next tasks without including foundation-live work', () => {
    const next = getNextImplementationTasks({ limit: 4 }).map((item) => item.id);

    expect(next).toEqual([
      'canonical-chain-graph-schema',
      'extract-feature-modules',
      'commit-readiness-smoke',
      'ffmpeg-libebur128-analyzers'
    ]);
    expect(next).not.toContain('hardware-profile-manifests');
    expect(next).not.toContain('playwright-web-smoke');
    expect(next).not.toContain('playwright-electron-smoke');
  });

  it('validates IDs, proof gates, statuses, and required tasks', () => {
    const result = validateImplementationBacklog();

    expect(result).toEqual({ ok: true, issues: [] });
  });
});
