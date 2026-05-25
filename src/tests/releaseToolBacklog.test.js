import { describe, expect, it } from 'vitest';
import {
  buildReleaseImplementationBacklog,
  getReleaseToolCandidate,
  getReleaseToolsByRecommendation,
  releaseImplementationBacklog,
  releaseToolCandidates,
  releaseToolRecommendations,
  summarizeReleaseToolBacklog,
  validateReleaseToolBacklog
} from '../data/releaseToolBacklog.js';

describe('release tool backlog', () => {
  it('marks Windows lab proof, audio metrics, and Playwright as required', () => {
    const required = getReleaseToolsByRecommendation(releaseToolRecommendations.required).map((tool) => tool.id);

    expect(required).toEqual(['wasapi-loopback', 'ffmpeg-libebur128', 'playwright']);
    expect(getReleaseToolCandidate('wasapi-loopback').bestUse).toContain('Windows render mix');
    expect(getReleaseToolCandidate('ffmpeg-libebur128').bestUse).toContain('loudness');
    expect(getReleaseToolCandidate('playwright').bestUse).toContain('Electron');
  });

  it('keeps miniaudio primary and PortAudio/RtAudio as fallback references', () => {
    expect(getReleaseToolCandidate('miniaudio')).toMatchObject({
      recommendation: releaseToolRecommendations.primary,
      implementationLane: 'native-engine'
    });
    expect(getReleaseToolCandidate('portaudio').recommendation).toBe(releaseToolRecommendations.fallback);
    expect(getReleaseToolCandidate('rtaudio').recommendation).toBe(releaseToolRecommendations.fallback);
  });

  it('keeps RNNoise optional and Steam Audio scene-lab only', () => {
    const rnnoise = getReleaseToolCandidate('rnnoise');
    const steamAudio = getReleaseToolCandidate('steam-audio');

    expect(rnnoise.recommendation).toBe(releaseToolRecommendations.optional);
    expect(rnnoise.blockedUses).toContain('No hidden always-on mic processing.');
    expect(steamAudio.recommendation).toBe(releaseToolRecommendations.sceneLabOnly);
    expect(steamAudio.blockedUses).toContain('No arbitrary-game post-mix occlusion claims.');
    expect(steamAudio.proofGates).toContain('No exact enemy-position promise.');
  });

  it('turns candidates into a release-stage backlog with tool records attached', () => {
    const backlog = buildReleaseImplementationBacklog();
    const nativeStage = backlog.find((stage) => stage.stage === 'v0.3-native-dsp-sandbox');
    const spatialStage = backlog.find((stage) => stage.stage === 'v0.7-spatial-research-pack');

    expect(releaseImplementationBacklog).toHaveLength(5);
    expect(nativeStage.tools.map((tool) => tool.id)).toEqual([
      'wasapi-loopback',
      'miniaudio',
      'portaudio',
      'rtaudio',
      'ffmpeg-libebur128'
    ]);
    expect(spatialStage.tools.map((tool) => tool.id)).toEqual(['steam-audio']);
  });

  it('validates sources, proof gates, guardrails, and stage references', () => {
    const result = validateReleaseToolBacklog();
    const summary = summarizeReleaseToolBacklog();

    expect(result).toEqual({ ok: true, issues: [] });
    expect(summary).toMatchObject({
      schema: 'cueforge.release-tool-backlog.v1',
      candidateCount: 9,
      stageCount: 5,
      validation: { ok: true, issues: [] }
    });
    expect(releaseToolCandidates.every((tool) => tool.source.url.startsWith('https://'))).toBe(true);
  });
});
