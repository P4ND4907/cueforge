const schema = 'cueforge.native-spatial-compatibility.v1';

const spatialGroups = {
  windowsSpatial: ['windowsSonic', 'dolby'],
  oemApo: ['audioscenic', 'nahimic'],
  headsetSuite: ['sonar', 'razer', 'corsairIcue', 'logitechGHub'],
  virtualRoute: ['sonar', 'voicemeeter', 'vbCable']
};

const rendererLabels = {
  gameNative: 'Game HRTF / native game spatial',
  windowsSpatial: 'Windows spatial audio',
  oemApo: 'Native/OEM spatial APO',
  headsetSuite: 'Headset suite spatial',
  safeStereo: 'Safe stereo / no spatial renderer'
};

function hasCompanion(report = {}, key) {
  return report.companions?.[key]?.detected === true;
}

function detectedCompanions(report = {}, keys = []) {
  return keys
    .map((key) => report.companions?.[key])
    .filter((item) => item?.detected === true)
    .map((item) => item.label || item.evidence)
    .filter(Boolean);
}

function desktopLinked(report = {}) {
  return report.source?.includes('desktop') || report.source?.includes('bridge') || report.mode === 'desktop-assisted';
}

function answered(value) {
  return value === 'on' || value === 'off';
}

function renderer({
  id,
  category,
  label,
  setting,
  detectedLabels = [],
  sourceQuestion
}) {
  const detected = detectedLabels.length > 0;
  const state = setting === 'on'
    ? 'active'
    : setting === 'off'
      ? 'off'
      : detected
        ? 'detected'
        : 'unknown';

  return {
    id,
    category,
    label,
    state,
    setting,
    detected,
    sourceQuestion,
    evidence: detectedLabels.length ? detectedLabels.join(' / ') : setting === 'on' ? 'Player-confirmed on' : 'Not detected'
  };
}

function warning(id, severity, title, detail, fix) {
  return { id, severity, title, detail, fix };
}

function buildQuestions() {
  return [
    'Is game HRTF or in-game surround on?',
    'Is Windows spatial audio, Dolby, or DTS on for this output?',
    'Is an OEM/native APO spatial feature active, such as listener-tracked laptop speaker audio?',
    'Is headset-suite spatial active, such as Sonar, THX, G HUB, or iCUE surround?',
    'Is a virtual mixer or cable in the game, chat, or stream route?'
  ];
}

function chooseRecommendation(activeRenderers = []) {
  if (activeRenderers.length === 0) return rendererLabels.safeStereo;
  if (activeRenderers.length === 1) return activeRenderers[0].label;
  return 'Choose one renderer before tuning';
}

export function buildNativeSpatialCompatibility({
  settings = {},
  autoDetectReport = {},
  soundMatchResult = null
} = {}) {
  const windowsLabels = detectedCompanions(autoDetectReport, spatialGroups.windowsSpatial);
  const oemLabels = detectedCompanions(autoDetectReport, spatialGroups.oemApo);
  const headsetLabels = detectedCompanions(autoDetectReport, spatialGroups.headsetSuite);
  const virtualRouteLabels = detectedCompanions(autoDetectReport, spatialGroups.virtualRoute);
  const hasDesktop = desktopLinked(autoDetectReport);

  const renderers = [
    renderer({
      id: 'game-hrtf',
      category: 'game-native',
      label: rendererLabels.gameNative,
      setting: settings.hrtf,
      sourceQuestion: 'hrtf'
    }),
    renderer({
      id: 'windows-spatial',
      category: 'windows-spatial',
      label: rendererLabels.windowsSpatial,
      setting: settings.windowsSpatial,
      detectedLabels: windowsLabels,
      sourceQuestion: 'windowsSpatial'
    }),
    renderer({
      id: 'native-oem-apo',
      category: 'oem-apo',
      label: rendererLabels.oemApo,
      setting: settings.nativePlatformSpatial,
      detectedLabels: oemLabels,
      sourceQuestion: 'nativePlatformSpatial'
    }),
    renderer({
      id: 'headset-suite-spatial',
      category: 'headset-suite',
      label: rendererLabels.headsetSuite,
      setting: settings.sonarSpatial,
      detectedLabels: headsetLabels,
      sourceQuestion: 'sonarSpatial'
    })
  ];

  const activeRenderers = renderers.filter((item) => item.state === 'active' || item.state === 'detected');
  const warnings = [];

  if (activeRenderers.length > 1) {
    warnings.push(warning(
      'stacked-spatial-renderers',
      'high',
      'Multiple spatial renderers are active or unconfirmed',
      'Game HRTF, Windows spatial, OEM APO spatial, and headset spatial should not run together during tuning.',
      'Pick exactly one spatial renderer before tuning: game HRTF, Windows/OEM spatial, or headset spatial.'
    ));
  }

  if (oemLabels.length && settings.nativePlatformSpatial === 'unknown') {
    warnings.push(warning(
      'native-platform-spatial-unconfirmed',
      'medium',
      'Native/OEM spatial state is unconfirmed',
      'The desktop scan sees an OEM spatial APO, but CueForge needs the player to confirm whether it is on for this output.',
      'Confirm Native/OEM spatial is on or off before judging Sound Match.'
    ));
  }

  if (virtualRouteLabels.length && activeRenderers.length > 0) {
    warnings.push(warning(
      'virtual-route-before-spatial-proof',
      'medium',
      'Virtual route can hide the active renderer',
      'Sonar, Voicemeeter, or VB-CABLE can move game, chat, and stream audio through different paths.',
      'Confirm the game output, chat output, and stream mix before judging spatial behavior.'
    ));
  }

  if (!hasDesktop && !activeRenderers.length) {
    warnings.push(warning(
      'desktop-spatial-proof-missing',
      'medium',
      'Desktop scan needed for platform spatial proof',
      'Browser mode cannot prove Windows spatial, OEM APO spatial, headset suite spatial, or virtual routing.',
      'Run the Windows scan before calling native spatial compatibility proven.'
    ));
  }

  const highWarnings = warnings.filter((item) => item.severity === 'high').length;
  const mediumWarnings = warnings.filter((item) => item.severity === 'medium').length;
  const allCoreQuestionsAnswered = [
    settings.hrtf,
    settings.windowsSpatial,
    settings.nativePlatformSpatial,
    settings.sonarSpatial
  ].every(answered);
  const rendererMode = activeRenderers.length > 1
    ? 'stacked-renderers'
    : activeRenderers.length === 1
      ? 'single-renderer'
      : 'safe-stereo';
  const status = highWarnings
    ? 'needs-fix'
    : mediumWarnings || !allCoreQuestionsAnswered
      ? 'needs-review'
      : 'ready';
  const confidence = Math.max(0, Math.min(100, Math.round(
    42 +
    (hasDesktop ? 20 : 0) +
    (allCoreQuestionsAnswered ? 18 : 0) +
    (rendererMode !== 'stacked-renderers' ? 12 : 0) +
    (soundMatchResult?.applyReadiness?.ready ? 6 : 0) -
    highWarnings * 32 -
    mediumWarnings * 8
  )));
  const recommendedRenderer = chooseRecommendation(activeRenderers);
  const summary = status === 'needs-fix'
    ? 'Pick exactly one spatial renderer before tuning.'
    : status === 'needs-review'
      ? warnings[0]?.fix || 'Confirm native spatial settings before applying.'
      : `One spatial path is safe for tuning: ${recommendedRenderer}.`;

  return {
    schema,
    status,
    confidence,
    rendererMode,
    recommendedRenderer,
    activeRenderers,
    renderers,
    layers: {
      gameNative: renderers[0],
      windowsSpatial: renderers[1],
      oemApo: renderers[2],
      headsetSuite: renderers[3],
      virtualRoute: {
        detected: virtualRouteLabels.length > 0,
        evidence: virtualRouteLabels.join(' / '),
        labels: virtualRouteLabels
      }
    },
    questions: buildQuestions(),
    warnings,
    summary
  };
}
