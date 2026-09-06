import { describe, expect, it } from 'vitest';
import {
  SMART_LAST_ASSESSMENT_KEY,
  calculateHolisticScore,
  runQuickAssessment,
  runSmartAssessment
} from '../smartOnboarding.js';

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
      completed: true,
      score: 85,
      bottleneck: {
        primaryBottleneck: {
          severity: 'high',
          type: 'high',
          msg: 'Sonar + Discord likely conflicting',
          message: 'Sonar + Discord likely conflicting'
        }
      }
    });
    expect(assessment.recommendations).toContain('Sonar + Discord likely conflicting');
    expect(assessment.suggestions).toEqual(assessment.recommendations);
    expect(assessment.recommendations).toContain('Try Player Trial in your main game');

    const saved = JSON.parse(storage.getItem('cueforge_dna_history'));
    expect(saved).toHaveLength(1);
    expect(saved[0].data.detect).toMatchObject({
      completeChain: true,
      chainComplete: true,
      sonar: true,
      sonarDetected: true,
      discord: true,
      micClip: 0.2,
      iEm: true,
      eqActive: false,
      apoDetected: false
    });
  });

  it('keeps the quick assessment shape compatible with Command Center UI snippets', async () => {
    const storage = memoryStorage();

    const assessment = await runQuickAssessment({
      storage,
      runMinimalSelfTest: async () => ({ micOk: true, audioApiOk: true }),
      runQuickDetect: async () => ({
        chainComplete: true,
        apoDetected: false,
        deviceCounts: { inputs: 1, outputs: 1 }
      })
    });

    expect(assessment.completed).toBe(true);
    expect(assessment.results).toMatchObject({
      detect: {
        chainComplete: true,
        completeChain: true,
        apoDetected: false
      }
    });
    expect(assessment.bottleneck.primaryBottleneck.message).toBeTruthy();
    expect(assessment.bottleneck.primaryBottleneck.type).toBeTruthy();
    expect(assessment.suggestions).toContain('Set up Equalizer APO or stay in export-only mode until a real apply target is proven');
    expect(JSON.parse(storage.getItem(SMART_LAST_ASSESSMENT_KEY))).toMatchObject({
      schema: 'cueforge.smart-onboarding-assessment.v1',
      completed: true,
      mode: 'quick'
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
