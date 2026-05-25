import { describe, expect, it } from 'vitest';
import {
  createVirtualMachinePlayer,
  formatVirtualMachinePlayerLabMarkdown,
  runVirtualMachinePlayerJourney,
  runVirtualMachinePlayerLab,
  virtualMachinePlayerLabCatalog
} from './virtualMachinePlayerLab.js';

describe('virtual machine player lab', () => {
  it('creates repeatable clean-machine players with gear and problem context', () => {
    expect(createVirtualMachinePlayer(907)).toEqual(createVirtualMachinePlayer(907));
    const player = createVirtualMachinePlayer(908);

    expect(player.id).toBe('vm-player-908');
    expect(player.gear.label).toBeTruthy();
    expect(player.problem.testerQuestion).toContain('?');
  });

  it('walks a player from download through setup, features, and report output', () => {
    const player = createVirtualMachinePlayer(1234);
    const journey = runVirtualMachinePlayerJourney(player, {
      featureDepth: 8,
      desktopSmoke: { status: 'pass', detail: 'Packaged app rendered CueForge.' }
    });

    expect(journey.schema).toBe('cueforge.vm-player-journey.v1');
    expect(journey.steps.some((step) => step.page === 'Download')).toBe(true);
    expect(journey.steps.some((step) => step.page === 'Setup Gate')).toBe(true);
    expect(journey.steps.some((step) => step.page === 'Report Lab')).toBe(true);
    expect(journey.redactedReport.schema).toBe('cueforge.vm-redacted-player-report.v1');
    expect(journey.redactedReport.shareProfile.bandCount).toBe(10);
  });

  it('runs a lab with meaningful gear, problem, and feature coverage', () => {
    const lab = runVirtualMachinePlayerLab({
      count: 18,
      seed: 4907,
      featureDepth: 9,
      desktopSmoke: { status: 'pass', detail: 'Packaged app rendered CueForge.' }
    });

    expect(lab.schema).toBe('cueforge.vm-player-lab.v1');
    expect(lab.summary.stepRuns).toBeGreaterThanOrEqual(18 * 10);
    expect(Object.keys(lab.summary.gearCoverage).length).toBeGreaterThanOrEqual(4);
    expect(Object.keys(lab.summary.problemCoverage).length).toBeGreaterThanOrEqual(5);
    expect(Object.keys(lab.summary.featureCoverage).length).toBeGreaterThanOrEqual(8);
    expect(lab.summary.privacyFailureRate).toBeLessThanOrEqual(0.05);
  });

  it('does not treat an APO-missing scenario as APO-ready just because the gear can use APO', () => {
    const player = createVirtualMachinePlayer(929);
    const journey = runVirtualMachinePlayerJourney(player, {
      featureDepth: 9,
      desktopSmoke: { status: 'pass', detail: 'Packaged app rendered CueForge.' }
    });

    expect(player.problem.id).toBe('missing-apo-apply-target');
    expect(player.bridgeReport.tools.equalizerApo.installed).toBe(false);
    expect(journey.summary.expectedLane).toBe('apo-setup');
    expect(journey.summary.chosenLane).toBe('apo-setup');
    expect(journey.summary.harmed).toBe(false);
  });

  it('formats a grave-detail markdown report for repair review', () => {
    const lab = runVirtualMachinePlayerLab({ count: 4, seed: 777, featureDepth: 6 });
    const markdown = formatVirtualMachinePlayerLabMarkdown(lab);

    expect(markdown).toContain('# Virtual Machine Player Lab');
    expect(markdown).toContain('## Journey Details');
    expect(markdown).toContain('## Repair Notes');
  });

  it('documents the catalog of simulated gear, problems, and features', () => {
    expect(virtualMachinePlayerLabCatalog.gearSetups.length).toBeGreaterThanOrEqual(6);
    expect(virtualMachinePlayerLabCatalog.problems.length).toBeGreaterThanOrEqual(8);
    expect(virtualMachinePlayerLabCatalog.features).toContain('Share Profile');
  });
});
