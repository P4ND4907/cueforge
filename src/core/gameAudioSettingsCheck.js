const defaultSettings = {
  hrtf: 'unknown',
  windowsSpatial: 'unknown',
  sonarSpatial: 'unknown',
  gameOutput: '',
  dynamicRange: 'unknown',
  voiceChatSplit: 'unknown'
};

export const gameAudioSettingQuestions = [
  {
    id: 'hrtf',
    label: 'Game HRTF / surround',
    helper: 'Use the in-game audio menu. CueForge does not inspect protected game files or memory.',
    options: ['unknown', 'off', 'on']
  },
  {
    id: 'windowsSpatial',
    label: 'Windows spatial audio',
    helper: 'Check Windows sound device properties for Sonic, Atmos, DTS, or spatial toggles.',
    options: ['unknown', 'off', 'on']
  },
  {
    id: 'sonarSpatial',
    label: 'Sonar / headset spatial',
    helper: 'Check Sonar, headset suite, THX, Dolby, DTS, or similar virtual surround layers.',
    options: ['unknown', 'off', 'on']
  },
  {
    id: 'gameOutput',
    label: 'Game output device',
    helper: 'Pick the device the game actually uses. If the game has no selector, use Windows default output.',
    options: []
  },
  {
    id: 'dynamicRange',
    label: 'Dynamic range mode',
    helper: 'Competitive testing is easiest when loudness and night modes are not fighting the EQ.',
    options: ['unknown', 'headphones', 'night', 'wide', 'home-theater']
  },
  {
    id: 'voiceChatSplit',
    label: 'Voice/chat split',
    helper: 'Confirm whether game chat, Discord, and stream mix use separate outputs or one shared path.',
    options: ['unknown', 'same-output', 'split-output']
  }
];

function hasCompanion(report = {}, key) {
  return report.companions?.[key]?.detected === true;
}

function completedCount(settings = {}) {
  return gameAudioSettingQuestions.filter((question) => {
    const value = settings[question.id];
    if (question.id === 'gameOutput') return Boolean(String(value || '').trim());
    return value && value !== 'unknown';
  }).length;
}

function warning(id, severity, title, detail, fix) {
  return { id, severity, title, detail, fix };
}

export function buildGameAudioSettingsCheck({
  game = 'Tarkov / Siege / COD',
  settings = {},
  autoDetectReport = {},
  soundMatchResult = null
} = {}) {
  const safeSettings = { ...defaultSettings, ...settings };
  const desktopLinked = autoDetectReport.source?.includes('desktop') || autoDetectReport.mode === 'desktop-assisted';
  const sonarDetected = hasCompanion(autoDetectReport, 'sonar');
  const spatialDetected = ['dolby', 'windowsSonic', 'nahimic', 'razer'].some((key) => hasCompanion(autoDetectReport, key));
  const virtualRoutingDetected = ['sonar', 'voicemeeter', 'vbCable'].some((key) => hasCompanion(autoDetectReport, key));
  const soundMatchReady = Boolean(soundMatchResult?.applyReadiness?.ready);
  const completed = completedCount(safeSettings);
  const warnings = [];

  if (safeSettings.hrtf === 'on' && (safeSettings.windowsSpatial === 'on' || safeSettings.sonarSpatial === 'on' || spatialDetected)) {
    warnings.push(warning(
      'double-spatial-risk',
      'high',
      'Game HRTF may be stacked with another spatial layer',
      'Direction cues can smear when game HRTF, Windows spatial, Sonar spatial, Dolby, DTS, THX, or headset surround run together.',
      'Pick one spatial layer for testing, then rerun Sound Match.'
    ));
  }

  if (safeSettings.sonarSpatial === 'on' && sonarDetected && safeSettings.gameOutput && !/sonar/i.test(safeSettings.gameOutput)) {
    warnings.push(warning(
      'sonar-output-mismatch',
      'medium',
      'Sonar is detected but the game output does not look like Sonar',
      'The game may be bypassing the Sonar path you are trying to tune.',
      'Confirm the in-game output device or Windows default endpoint before applying APO.'
    ));
  }

  if (safeSettings.dynamicRange === 'night') {
    warnings.push(warning(
      'night-mode-before-tuning',
      'medium',
      'Night mode can hide whether the tune is working',
      'Game night mode or loudness compression can change footsteps, explosions, and fatigue before CueForge sees the result.',
      'Use a neutral/headphones mode for Sound Match, then decide if night mode is still needed.'
    ));
  }

  if (safeSettings.voiceChatSplit === 'split-output' || virtualRoutingDetected) {
    warnings.push(warning(
      'chat-game-route-needs-proof',
      'medium',
      'Game and chat may be on different routes',
      'Discord, game chat, OBS, Sonar, Voicemeeter, or VB-CABLE can split what the player hears from what the stream hears.',
      'Confirm game output, Discord output/input, and OBS Stream Mix before sharing the profile.'
    ));
  }

  if (!desktopLinked) {
    warnings.push(warning(
      'desktop-evidence-missing',
      'medium',
      'Desktop scan still needed for local proof',
      'Browser mode cannot prove installed APO, Sonar, OBS, boosters, virtual mixers, or Windows endpoint defaults.',
      'Run the Windows scan or import the bridge report before calling the setup proven.'
    ));
  }

  const score = Math.max(0, Math.min(100,
    20 +
    completed * 9 +
    (desktopLinked ? 14 : 0) +
    (soundMatchReady ? 12 : 0) -
    warnings.filter((item) => item.severity === 'high').length * 18 -
    warnings.filter((item) => item.severity === 'medium').length * 7
  ));

  return {
    schema: 'cueforge.game-audio-settings-check.v1',
    game,
    settings: safeSettings,
    progress: {
      completed,
      total: gameAudioSettingQuestions.length,
      label: `${completed}/${gameAudioSettingQuestions.length} settings checked`
    },
    confidence: Math.round(score),
    status: warnings.some((item) => item.severity === 'high') ? 'needs-fix' : completed >= 5 && desktopLinked ? 'ready' : 'needs-review',
    questions: gameAudioSettingQuestions,
    warnings,
    summary: warnings.length
      ? warnings[0].fix
      : 'Game settings, desktop scan, and Sound Match are aligned enough for one real match test.'
  };
}
