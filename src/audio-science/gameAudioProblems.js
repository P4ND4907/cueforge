export const gameAudioProblems = [
  {
    id: 'low-end-masking',
    name: 'Low-end masking hides movement cues',
    rootCauses: ['explosions', 'vehicles', 'bass-heavy headset tuning', 'stacked loudness or virtual surround'],
    audibleSymptoms: ['footsteps vanish during chaos', 'distance feels smeared', 'small movement loses edge'],
    measurableSignals: ['high rumble/bass/lowMid bands', 'low cueStrength', 'repeat masking across temporal evidence'],
    eventTypes: ['footsteps', 'reloads', 'cloth', 'floor transitions'],
    frequencyBandsHz: [[20, 250], [250, 700], [3500, 6500]],
    betterApproach: 'Reduce masking pressure first; do not blindly boost treble.',
    modules: ['Signal Analyzer', 'Masking Lab', 'Echo Scene', 'Player Trial'],
    testStrategy: 'Compare one quiet route and one chaotic fight with the same EQ.',
    riskIfIgnored: 'The app will over-boost cue bands and create harshness without improving real reads.'
  },
  {
    id: 'spatial-layer-stacking',
    name: 'Duplicate spatial layers destabilize direction',
    rootCauses: ['game HRTF plus Sonar', 'Atmos plus THX', 'Windows spatial sound plus headset virtualization'],
    audibleSymptoms: ['left/right feels jumpy', 'center image drifts', 'vertical cues feel fake or inconsistent'],
    measurableSignals: ['unstable stereo pan', 'low lateral stability', 'high scene variance across repeated routes'],
    eventTypes: ['enemy movement', 'teammate comms', 'near-field sounds'],
    frequencyBandsHz: [[700, 3500], [3500, 10000]],
    betterApproach: 'Confirm one spatial layer before EQ decisions.',
    modules: ['Auto Detect', 'Driver Layer', 'Echo Scene', 'Self Test'],
    testStrategy: 'Run left/right/center, then compare game-only audio against game plus virtual mixer.',
    riskIfIgnored: 'EQ changes will chase routing artifacts instead of solving the game audio issue.'
  },
  {
    id: 'occlusion-or-wall-filtering',
    name: 'Occlusion or wall filtering removes cue detail',
    rootCauses: ['engine occlusion', 'map geometry', 'portal/diffraction behavior', 'game patch audio changes'],
    audibleSymptoms: ['sounds behind walls become dull', 'stairs or doors feel inconsistent', 'open space sounds fine'],
    measurableSignals: ['high-frequency damping proxy', 'low cueStrength', 'stable low/mid energy'],
    eventTypes: ['footsteps behind cover', 'doors', 'vertical movement', 'room transitions'],
    frequencyBandsHz: [[1800, 6500], [6500, 10000]],
    betterApproach: 'Treat as map/game-specific until proven by repeated captures.',
    modules: ['Echo Scene', 'Community Hub', 'Report Lab'],
    testStrategy: 'Record door, stairwell, wall, and open-space comparisons on the same map.',
    riskIfIgnored: 'A global EQ may damage other maps or games while failing the real occlusion case.'
  },
  {
    id: 'server-or-game-mix',
    name: 'Game/server behavior gets mistaken for tuning',
    rootCauses: ['server timing', 'patch mix changes', 'animation desync', 'map-specific audio bugs'],
    audibleSymptoms: ['offline range sounds fine but live match feels wrong', 'problem appears only in one mode'],
    measurableSignals: ['stable local signal', 'weak player clarity score', 'community reports clustered by game/map'],
    eventTypes: ['footsteps', 'gunshots', 'abilities', 'voice ducking'],
    frequencyBandsHz: [[250, 6500]],
    betterApproach: 'Separate offline/training and live-server evidence before tuning.',
    modules: ['Player Trial', 'Community Hub', 'Report Lab', 'Echo Scene'],
    testStrategy: 'Compare training/offline against live server using the same setup and profile.',
    riskIfIgnored: 'The app will promise fixes for problems that belong to the game, server, or patch.'
  }
];

export function getGameAudioProblem(problemId = '') {
  return gameAudioProblems.find((problem) => problem.id === problemId) || null;
}

export function mapProblemToModules(problemId) {
  return getGameAudioProblem(problemId)?.modules || [];
}
