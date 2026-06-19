import { describe, expect, it } from 'vitest';
import { calculateHolisticScore, runSmartAssessment } from '../smartOnboarding.js';

function memoryStorage() {
  const store = new Map();
  return {
    getItem: (key) => store.get(key) || null,
    setItem: (key, value) => store.set(key, value)
  };
}

describe('smart onboarding', () => {
  it('combines self test, quick detect, bottleneck, and local DNA history', async () => {
    const storage = memoryStorage();

    const assessment = await runSmartAssessment('quick', {
      storage,
      runMinimalSelfTest: async () => ({ passed: true }),
      runQuickDetect: async () => ({
        completeChain: true,
        sonar: true,
        discord: true,
        micClip: 0.2,
        iEm: true,
        eqActive: false
      })
    });

    expect(assessment).toMatchObject({
      schema: 'cueforge.smart-onboarding-assessment.v1',
      mode: 'quick',
      score: 85,
      bottleneck: {
        primaryBottleneck: {
          severity: 'high',
          msg: 'Sonar + Discord likely conflicting'
        }
      }
    });
    expect(assessment.recommendations).toContain('Sonar + Discord likely conflicting');
    expect(assessment.recommendations).toContain('Try Player Trial in your main game');

    const saved = JSON.parse(storage.getItem('cueforge_dna_history'));
    expect(saved).toHaveLength(1);
    expect(saved[0].data.detect).toEqual({
      completeChain: true,
      sonar: true,
      discord: true,
      micClip: 0.2,
      iEm: true,
      eqActive: false
    });
  });

  it('scores full Sound Match confidence without exceeding 100', () => {
    expect(calculateHolisticScore({
      selfTest: { passed: true },
      detect: { completeChain: true },
      match: { confidence: 0.75 }
    })).toBe(100);
  });
});
