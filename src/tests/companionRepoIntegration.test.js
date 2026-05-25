import { describe, expect, it } from 'vitest';
import {
  buildCompanionIntegrationPlan,
  buildMaintenanceRunPlan,
  companionIntegrationIds,
  getCompanionIntegration,
  validateCompanionIntegrationPlan
} from '../data/companionRepoIntegration.js';
import {
  SETUP_ASSESSMENT_EVENT,
  SETUP_ASSESSMENT_STORAGE_KEY,
  SETUP_ASSESSMENT_WINDOW_KEY
} from '../core/setupAssessmentSnapshot.js';

describe('companion repo integration plan', () => {
  it('maps all four companion patterns to safe CueForge jobs', () => {
    const plan = buildCompanionIntegrationPlan();

    expect(plan).toMatchObject({
      schema: 'cueforge.companion-integration-plan.v1',
      stage: 'v0.2.0-alpha.3'
    });
    expect(plan.integrations.map((item) => item.id)).toEqual([
      companionIntegrationIds.autobot,
      companionIntegrationIds.kalshiScout,
      companionIntegrationIds.feedbackAutomation,
      companionIntegrationIds.cryptoIntelligence
    ]);
    expect(plan.commands).toContain('npm.cmd run qa:route-graph-lab');
    expect(plan.commands).toContain('npm.cmd run qa:release-readiness');
    expect(plan.guardrails).toContain('no raw audio upload');
    expect(validateCompanionIntegrationPlan(plan)).toEqual({ ok: true, issues: [] });
  });

  it('keeps Crypto Intelligence as a local snapshot contract, not a cloud dependency', () => {
    const integration = getCompanionIntegration(companionIntegrationIds.cryptoIntelligence);

    expect(integration.artifacts).toEqual([
      SETUP_ASSESSMENT_STORAGE_KEY,
      `window.${SETUP_ASSESSMENT_WINDOW_KEY}`,
      SETUP_ASSESSMENT_EVENT
    ]);
    expect(integration.guardrails).toContain('raw audio stays local and excluded');
    expect(integration.cueforgeUse).toContain('one setup assessment object for UI, lab runner, and future integrations');
  });

  it('builds nightly and release-candidate maintenance plans without hidden system changes', () => {
    const nightly = buildMaintenanceRunPlan({ nightly: true, routeGraphEnabled: false });
    const releaseCandidate = buildMaintenanceRunPlan({
      nightly: false,
      routeGraphEnabled: true,
      releaseCandidate: true
    });

    expect(nightly.commands).toContain('npm.cmd run qa:audio-fixture-regression');
    expect(nightly.commands).not.toContain('npm.cmd run qa:route-graph-lab');
    expect(releaseCandidate.commands).toContain('npm.cmd run qa:route-graph-lab');
    expect(releaseCandidate.commands).toContain('npm.cmd run qa:release-readiness');
    expect(releaseCandidate.safety).toMatchObject({
      readOnly: true,
      canPostPublicly: false,
      canModifyWindowsAudio: false,
      canWriteApoConfig: false,
      rawAudioUpload: false
    });
  });

  it('rejects unsafe companion commands', () => {
    const plan = buildCompanionIntegrationPlan();
    const validation = validateCompanionIntegrationPlan({
      ...plan,
      commands: [...plan.commands, 'post to reddit and upload raw audio']
    });

    expect(validation.ok).toBe(false);
    expect(validation.issues[0]).toContain('Unsafe companion command');
  });
});
