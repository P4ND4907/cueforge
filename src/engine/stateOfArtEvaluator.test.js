import { describe, expect, it } from 'vitest';
import { calculateBinaryMetrics, summarizeLatency } from './benchmarkMetrics.js';
import { evaluateStateOfArtReadiness } from './stateOfArtEvaluator.js';
import { accumulateTemporalEvidence } from './temporalEvidenceAccumulator.js';
import { canClaimTruePosition, getGameAudioEngine } from '../audio-science/gameEngineMap.js';
import { getGameAudioProblem, mapProblemToModules } from '../audio-science/gameAudioProblems.js';

describe('sound-scene intelligence scaffolding', () => {
  it('keeps state-of-art claims honest', () => {
    const result = evaluateStateOfArtReadiness({
      wavFeatures: true,
      stft: true,
      temporalEvidence: true,
      sceneInference: true,
      gameEngineMap: true,
      problemMap: true
    });

    expect(result.score).toBeGreaterThan(50);
    expect(result.tier).toBe('research-prototype');
    expect(result.blockers).toContain('Live WASAPI loopback capture');
    expect(result.honestyRule).toMatch(/Do not claim true game-world position/i);
  });

  it('accumulates repeated weak cues into a stronger track', () => {
    const result = accumulateTemporalEvidence([
      { cueStrength: 48, clipRisk: 0, bands: { rumble: 20, bass: 22, lowMid: 25 } },
      { cueStrength: 52, clipRisk: 0, bands: { rumble: 20, bass: 22, lowMid: 25 } },
      { cueStrength: 55, clipRisk: 0, bands: { rumble: 20, bass: 22, lowMid: 25 } },
      { cueStrength: 58, clipRisk: 0, bands: { rumble: 20, bass: 22, lowMid: 25 } }
    ]);

    expect(result.weakCuePulses).toBe(4);
    expect(result.temporalConfidence).toBeGreaterThan(35);
    expect(result.state).toBe('forming-track');
  });

  it('maps game engines, problem modules, and benchmark metrics', () => {
    expect(getGameAudioEngine('wwise').usefulAsk).toMatch(/diffraction/i);
    expect(canClaimTruePosition()).toBe(false);
    expect(canClaimTruePosition({ validatedInference: true })).toBe(true);
    expect(getGameAudioProblem('low-end-masking').betterApproach).toMatch(/masking pressure/i);
    expect(mapProblemToModules('spatial-layer-stacking')).toContain('Driver Layer');

    const metrics = calculateBinaryMetrics({ expected: [true, true, false, false], actual: [true, false, true, false] });
    expect(metrics.precision).toBe(0.5);
    expect(metrics.recall).toBe(0.5);
    expect(metrics.falsePositiveRate).toBe(0.5);
    expect(summarizeLatency([8, 12, 4, 30, 20]).p95).toBe(30);
  });
});
