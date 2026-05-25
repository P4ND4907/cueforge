import { describe, expect, it } from 'vitest';
import {
  getIntegrationPlan,
  getOpenSourceStackByTier,
  getOpenSourceTool,
  openSourceStack,
  openSourceStackTiers,
  summarizeOpenSourceStack,
  validateOpenSourceBoundaries
} from '../data/openSourceStack.js';

describe('open source stack registry', () => {
  it('keeps the use-now stack focused on proven CueForge handoffs', () => {
    const useNow = getOpenSourceStackByTier(openSourceStackTiers.useNow);
    const ids = useNow.map((tool) => tool.id);

    expect(ids).toEqual(['equalizer-apo', 'autoeq', 'playwright']);
    expect(getOpenSourceTool('equalizer-apo').role).toContain('output EQ');
    expect(getOpenSourceTool('autoeq').guardrails.join(' ')).toContain('starting point');
    expect(getOpenSourceTool('playwright').proofGates.join(' ')).toContain('horizontal overflow');
  });

  it('keeps browser DSP infrastructure separate from native engine claims', () => {
    const offline = getIntegrationPlan('offline-audio-context');
    const worklet = getIntegrationPlan('audio-worklet');

    expect(offline.tier).toBe(openSourceStackTiers.browserCore);
    expect(offline.guardrails.join(' ')).toContain('not a live latency claim');
    expect(worklet.integrationPath.join(' ')).toContain('AudioWorklet');
    expect(worklet.guardrails.join(' ')).toContain('No autoplay');
  });

  it('keeps native candidates behind explicit proof and opt-in boundaries', () => {
    const naudio = getOpenSourceTool('naudio');
    const miniaudio = getOpenSourceTool('miniaudio');
    const rnnoise = getOpenSourceTool('rnnoise');

    expect(naudio.proofGates).toContain('Capabilities say canModifySystemState: false.');
    expect(miniaudio.integrationPath).toContain('Start in v0.3 Native DSP Sandbox.');
    expect(rnnoise.proofGates).toContain('Noise suppression requires explicit opt-in.');
    expect(rnnoise.guardrails).toContain('Not hidden always-on processing.');
  });

  it('reserves Steam Audio for game or middleware integration, not post-mix magic', () => {
    const steamAudio = getOpenSourceTool('steam-audio');

    expect(steamAudio.tier).toBe(openSourceStackTiers.differentiatedTier);
    expect(steamAudio.proofGates).toContain('No exact enemy-position claim.');
    expect(steamAudio.guardrails).toContain('No post-mix true occlusion claim.');
    expect(steamAudio.guardrails).toContain('No game memory reads or anti-cheat-adjacent hooks.');
  });

  it('validates every tool has sources, proof gates, and guardrails', () => {
    const result = validateOpenSourceBoundaries(openSourceStack);
    const summary = summarizeOpenSourceStack();

    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
    expect(summary.schema).toBe('cueforge.open-source-stack.v1');
    expect(summary.toolCount).toBe(9);
    expect(summary.boundaryCheck.ok).toBe(true);
    expect(summary.tiers[openSourceStackTiers.nextNativeStage]).toHaveLength(3);
  });
});
