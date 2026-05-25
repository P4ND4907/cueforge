import { describe, expect, it } from 'vitest';
import { buildIssuePatternMemory, buildIssuePatternMemoryText } from './issuePatternMemory.js';

describe('issue pattern memory', () => {
  it('learns a mic and Discord gain pattern from repeated local signals', () => {
    const memory = buildIssuePatternMemory({
      lastReport: {
        app: { currentPage: 'Report Lab', selectedGame: 'Valorant' },
        reproducibleState: {
          sample: 'Discord teammates say my USB mic is boomy and clipping when I talk loud.',
          analysis: { recommendation: 'Lower mic gain and keep suppression light.' }
        },
        diagnostics: {}
      },
      selfTests: [
        { name: 'Mic capture proof', status: 'warn', detail: 'Mic stream opened, but clipping risk is high.' }
      ],
      evidence: [
        { clipRisk: 42, noise: 20, recommendation: 'Input is clipping.', suggestedTweak: 'Reduce mic gain.' }
      ],
      now: new Date('2026-05-22T12:00:00.000Z')
    });

    expect(memory.schema).toBe('cueforge.issue-pattern-memory.v1');
    expect(memory.topPattern.id).toBe('mic-gain-discord');
    expect(memory.topPattern.automationReady).toBe(true);
    expect(memory.topPattern.debugPlaybook[0]).toContain('live mic');
  });

  it('separates routing conflicts from game/server timing issues', () => {
    const memory = buildIssuePatternMemory({
      communityItems: [
        {
          source: 'Discord',
          game: 'Tarkov',
          gear: 'Sonar plus Equalizer APO through a virtual device',
          type: 'Setup/routing',
          note: 'Output path changes when Sonar is active.'
        },
        {
          source: 'Reddit',
          game: 'COD',
          gear: 'headset',
          type: 'Game/server issue',
          note: 'Only happens on one map and bad server timing.'
        }
      ]
    });

    const ids = memory.matchedPatterns.map((pattern) => pattern.id);
    expect(ids).toContain('routing-layer-conflict');
    expect(ids).toContain('game-server-not-tuning');
    expect(memory.matchedPatterns.find((pattern) => pattern.id === 'routing-layer-conflict').debugPlaybook.join(' ')).toContain('output path');
  });

  it('redacts private data inside evidence text', () => {
    const memory = buildIssuePatternMemory({
      uiNotes: [
        {
          page: 'Auto Detect',
          tag: 'text issue',
          status: 'open',
          note: 'privacy leak at C:\\Users\\carls\\secret.txt from test@example.com 907-555-1212',
          target: { label: 'Export' }
        }
      ]
    });

    const text = JSON.stringify(memory);
    expect(memory.topPattern.id).toBe('privacy-export-risk');
    expect(text).toContain('[redacted-path]');
    expect(text).toContain('[redacted-email]');
    expect(text).toContain('[redacted-phone]');
    expect(text).not.toContain('carls');
    expect(buildIssuePatternMemoryText(memory)).toContain('Privacy');
  });
});
