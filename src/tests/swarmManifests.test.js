import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  buildSwarmCoverageSummary,
  validateSwarmJobManifest,
  validateSwarmRepairManifest,
  validateSwarmRouteManifest
} from '../shared/schemas/swarmManifest.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

function readJsonFolder(relativeFolder) {
  const folder = join(root, relativeFolder);
  return readdirSync(folder)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .map((file) => JSON.parse(readFileSync(join(folder, file), 'utf8')));
}

function routeManifests() {
  return readJsonFolder('swarm/routes');
}

function jobManifests() {
  return readJsonFolder('swarm/jobs');
}

function repairManifests() {
  return readJsonFolder('swarm/repair');
}

describe('CueForge swarm manifests', () => {
  it('validates checked-in route manifests with CueForge-specific proof fields', () => {
    const routes = routeManifests();
    const results = routes.map(validateSwarmRouteManifest);

    expect(routes.map((route) => route.routeId)).toEqual([
      'auto-detect',
      'report-lab',
      'self-test',
      'setup-command-center'
    ]);
    expect(results).toEqual(results.map((result) => ({ ...result, ok: true, errors: [] })));
    routes.forEach((route) => {
      expect(route.requiredSelectors.length).toBeGreaterThanOrEqual(5);
      expect(route.expectedStateTransitions.length).toBeGreaterThanOrEqual(2);
      expect(route.analyzerThresholds.maxRawLeakCount).toBe(0);
      expect(route.privacy.allowRawAudioExport).toBe(false);
      expect(route.safeAutoRepairActions.join(' ')).not.toMatch(/post|change Windows|write APO|upload raw/i);
    });
  });

  it('validates jobs against known routes and keeps public/system mutations blocked', () => {
    const routes = routeManifests();
    const jobs = jobManifests();
    const routeIds = routes.map((route) => route.routeId);
    const results = jobs.map((job) => validateSwarmJobManifest(job, routeIds));

    expect(jobs.map((job) => job.jobId)).toEqual([
      'daily-smoke',
      'nightly-audio-regression',
      'release-candidate'
    ]);
    expect(results).toEqual(results.map((result) => ({ ...result, ok: true, errors: [] })));
    jobs.forEach((job) => {
      expect(job.gates.canModifySystemState).toBe(false);
      expect(job.gates.canPostPublicly).toBe(false);
      expect(job.privacy.redactDeviceIds).toBe(true);
    });
  });

  it('validates repair manifests as reviewed queues, not hidden self-repair', () => {
    const repairs = repairManifests();
    const results = repairs.map(validateSwarmRepairManifest);

    expect(repairs.map((repair) => repair.repairId)).toEqual([
      'panda-notes',
      'route-regressions'
    ]);
    expect(results).toEqual(results.map((result) => ({ ...result, ok: true, errors: [] })));
    repairs.forEach((repair) => {
      expect(repair.allowedActions.join(' ')).not.toMatch(/post|change Windows|write APO|upload raw/i);
      expect(repair.blockedActions.join(' ')).toMatch(/Windows|APO|raw audio|passwords|tokens/i);
    });
  });

  it('summarizes coverage so the swarm can become a CI gate', () => {
    const summary = buildSwarmCoverageSummary({
      routes: routeManifests(),
      jobs: jobManifests(),
      repairs: repairManifests()
    });

    expect(summary).toMatchObject({
      schema: 'cueforge.swarm-coverage.v1',
      routeCount: 4,
      jobCount: 3,
      repairCount: 2,
      uncoveredRoutes: [],
      hasReleaseCandidateJob: true,
      readyForCi: true
    });
  });
});
