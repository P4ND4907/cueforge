import { describe, expect, it } from 'vitest';
import { detectBottleneck } from '../core/bottleneckDiagnosis.js';
import { runSmartAssessment } from '../core/smartAssessment.js';

describe('bottleneck diagnosis', () => {
  it('prioritizes conflicts that block reliable audio tuning', () => {
    const result = detectBottleneck({
      conflicts: [
        { id: 'double-spatial-risk', severity: 'high', title: 'Double spatial audio' },
        { id: 'stream-clipping-risk', severity: 'medium', title: 'Stream clipping risk' }
      ],
      metrics: {
        cpuLoadPercent: 82,
        audioLatencyMs: 44,
        droppedFrames: 3
      }
    });

    expect(result.schema).toBe('cueforge.bottleneck-diagnosis.v1');
    expect(result.status).toBe('blocked');
    expect(result.primary.id).toBe('double-spatial-risk');
    expect(result.findings.map((item) => item.id)).toEqual(expect.arrayContaining([
      'double-spatial-risk',
      'cpu-load-high',
      'latency-budget-fail',
      'monitor-drops'
    ]));
  });

  it('builds a smart assessment without fake apply actions', async () => {
    const assessment = await runSmartAssessment('quick', {
      detectData: {
        metrics: { cpuLoadPercent: 24, audioLatencyMs: 12 },
        conflicts: []
      },
      performanceProfile: 'game',
      runningGame: 'valorant'
    });

    expect(assessment).toMatchObject({
      schema: 'cueforge.smart-assessment.v1',
      mode: 'quick',
      game: 'valorant',
      performance: {
        profile: 'game',
        monitoring: false
      },
      apply: {
        safeToApply: false
      }
    });
    expect(assessment.apply.reason).toMatch(/preview/i);
  });
});
