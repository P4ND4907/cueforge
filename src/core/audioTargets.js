export const audioTargets = {
  mic: { id: 'mic', label: 'Mic/input', requiredFor: ['mic-lab', 'discord-proof'] },
  output: { id: 'output', label: 'Headphones/IEM output', requiredFor: ['eq', 'hearing', 'match-proof'] },
  applyTarget: { id: 'applyTarget', label: 'Apply/export target', requiredFor: ['apo-export'] },
  companionLayer: { id: 'companionLayer', label: 'Companion audio layer', requiredFor: ['conflict-review'] },
  game: { id: 'game', label: 'Game/session', requiredFor: ['profile-engine'] },
  playerEvidence: { id: 'playerEvidence', label: 'Player evidence', requiredFor: ['readiness-proof'] }
};
