import { sanitizeUserText } from './reportPack.js';

export const trialSteps = [
  {
    id: 'baseline',
    title: 'Baseline check',
    detail: 'Play one short round with the current EQ and no extra changes.'
  },
  {
    id: 'footsteps',
    title: 'Footstep read',
    detail: 'Listen for distance, floor level, and direction during quiet movement.'
  },
  {
    id: 'chaos',
    title: 'Chaos check',
    detail: 'Fight through explosions, abilities, or vehicles and note whether cues disappear.'
  },
  {
    id: 'comms',
    title: 'Comms check',
    detail: 'Talk in Discord or party chat while game audio is loud.'
  },
  {
    id: 'fatigue',
    title: 'Fatigue check',
    detail: 'After 10 minutes, rate sharpness, boom, and comfort.'
  }
];

export const feedbackDefaults = {
  footsteps: 5,
  direction: 5,
  comms: 5,
  mic: 5,
  fatigue: 5,
  notes: ''
};

export function scoreTrialFeedback(feedback = feedbackDefaults) {
  const values = ['footsteps', 'direction', 'comms', 'mic', 'fatigue'].map((key) => Number(feedback[key] || 0));
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const issues = [];

  if (feedback.footsteps < 6) issues.push('Footsteps need more separation from bass and game-bed noise.');
  if (feedback.direction < 6) issues.push('Directional reads need a safer 2k-4k cue lift.');
  if (feedback.comms < 6) issues.push('Comms are fighting the game mix.');
  if (feedback.mic < 6) issues.push('Mic chain needs gain/noise/boom cleanup.');
  if (feedback.fatigue < 6) issues.push('Treble or upper mids may be too sharp for longer sessions.');
  if (issues.length === 0) issues.push('Tester feedback is strong enough for the next player batch.');

  return {
    score: Math.round(average * 10),
    status: average >= 8 ? 'release-candidate' : average >= 6.5 ? 'testable' : 'needs-tuning',
    issues
  };
}

export function buildTesterPacket({ feedback, readiness, issueReport, eq, game, sourceProfile }) {
  const scored = scoreTrialFeedback(feedback);
  return {
    schema: 'audiotuner.player-trial.v1',
    generatedAt: new Date().toISOString(),
    readiness,
    feedback: {
      ...feedback,
      notes: sanitizeUserText(feedback.notes),
      score: scored.score,
      status: scored.status,
      issues: scored.issues
    },
    reproducible: {
      eq,
      game,
      sourceProfile,
      issueReport
    },
    nextFixes: scored.issues
  };
}
