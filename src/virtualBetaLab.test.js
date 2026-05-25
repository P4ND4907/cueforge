import { describe, expect, it } from 'vitest';
import { createVirtualTester, diagnoseVirtualTester, runVirtualBetaLab } from './virtualBetaLab.js';

describe('virtual beta lab', () => {
  it('creates repeatable virtual testers', () => {
    expect(createVirtualTester(907)).toEqual(createVirtualTester(907));
    expect(createVirtualTester(908).id).toBe('virtual-908');
  });

  it('diagnoses a single tester with a clear fix lane', () => {
    const tester = createVirtualTester(1234);
    const diagnosis = diagnoseVirtualTester(tester);

    expect(diagnosis.schema).toBe('cueforge.virtual-diagnosis.v1');
    expect(diagnosis.lane).toBeTruthy();
    expect(diagnosis.fix.actions.length).toBeGreaterThan(1);
  });

  it('does not let a missing bridge report hijack usable browser audio evidence', () => {
    const tester = createVirtualTester(2001);
    tester.problem = {
      id: 'game-cue-buried',
      category: 'game-audio',
      expectedLane: 'cue-presence',
      analyzerCause: 'game-cue-buried',
      severity: [34, 76],
      profile: { rms: 0.24, peak: 0.44, voice: 56, cue: 18, noise: 24, rumble: 22, bass: 30, lowMid: 34 }
    };
    tester.expectedLane = 'cue-presence';
    tester.permissionGranted = true;
    tester.browserDeviceCount = 2;
    tester.bridgeReport = null;

    const diagnosis = diagnoseVirtualTester(tester);

    expect(diagnosis.lane).toBe('cue-presence');
    expect(diagnosis.correctLane).toBe(true);
  });

  it('keeps mic permission as a hard blocker before tuning advice', () => {
    const tester = createVirtualTester(2002);
    tester.permissionGranted = false;
    tester.expectedLane = 'permission';

    const diagnosis = diagnoseVirtualTester(tester);

    expect(diagnosis.lane).toBe('permission');
    expect(diagnosis.correctLane).toBe(true);
  });

  it('runs thousands of new-user journeys without harmful tuning drift', () => {
    const lab = runVirtualBetaLab({ count: 5000, seed: 4907 });

    expect(lab.count).toBe(5000);
    expect(lab.diagnosisAccuracy).toBeGreaterThanOrEqual(0.91);
    expect(lab.improvementRate).toBeGreaterThanOrEqual(0.93);
    expect(lab.harmRate).toBeLessThanOrEqual(0.015);
    expect(lab.averageSeverityDelta).toBeGreaterThanOrEqual(20);
    expect(Object.keys(lab.byProblem).length).toBeGreaterThanOrEqual(10);
  });
});
