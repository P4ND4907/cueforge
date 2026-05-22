import { describe, expect, it } from 'vitest';
import { buildTesterPacket, feedbackDefaults, scoreTrialFeedback, trialSteps } from './playerTrial.js';

describe('player trial', () => {
  it('ships a complete repeatable trial plan', () => {
    expect(trialSteps.map((step) => step.id)).toEqual(['baseline', 'footsteps', 'chaos', 'comms', 'fatigue']);
  });

  it('scores strong feedback as a release candidate', () => {
    const result = scoreTrialFeedback({
      footsteps: 9,
      direction: 8,
      comms: 9,
      mic: 8,
      fatigue: 8,
      notes: 'Felt clean.'
    });

    expect(result.status).toBe('release-candidate');
    expect(result.score).toBe(84);
  });

  it('builds a tester packet with feedback and replay data', () => {
    const packet = buildTesterPacket({
      feedback: { ...feedbackDefaults, footsteps: 4, notes: 'C:\\Users\\carls\\clip.wav test@example.com' },
      readiness: { score: 80, status: 'player-test-ready' },
      issueReport: { schema: 'cueforge.issue-report.v1' },
      eq: [-1, 1, 0, -2, -1, 0, 2, 3, 1, 0],
      game: 'Warzone / Apex',
      sourceProfile: 'iemFps'
    });

    expect(packet.schema).toBe('cueforge.player-trial.v1');
    expect(packet.feedback.issues[0]).toContain('Footsteps');
    expect(packet.feedback.notes).not.toContain('carls');
    expect(packet.feedback.notes).not.toContain('test@example.com');
    expect(packet.reproducible.issueReport.schema).toBe('cueforge.issue-report.v1');
  });
});
