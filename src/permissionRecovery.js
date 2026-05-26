const RECOVERABLE_STATES = new Set(['prompt', 'denied', 'blocked', 'skipped', 'error', 'unknown']);

export function normalizePermissionState(value = '') {
  const text = String(value || '').toLowerCase();
  if (text.includes('grant') || text.includes('allow')) return 'granted';
  if (text.includes('unsupported') || text.includes('missing')) return 'unsupported';
  if (text.includes('denied')) return 'denied';
  if (text.includes('block')) return 'blocked';
  if (text.includes('skip')) return 'skipped';
  if (text.includes('prompt') || text.includes('ask') || text.includes('not checked')) return 'prompt';
  if (text.includes('error') || text.includes('fail')) return 'error';
  return 'unknown';
}

export function buildPermissionRecovery({
  feature = 'microphone',
  state = 'unknown',
  browserName = 'this browser',
  desktopReady = false
} = {}) {
  const status = normalizePermissionState(state);
  const featureLabel = featureLabelFor(feature);
  const base = {
    schema: 'cueforge.permission-recovery.v1',
    feature,
    featureLabel,
    status,
    browserName,
    desktopReady,
    canRetry: RECOVERABLE_STATES.has(status),
    steps: []
  };

  if (status === 'granted') {
    return {
      ...base,
      level: 'ready',
      title: `${featureLabel} access is ready`,
      detail: 'CueForge can read the local signal path that the browser exposes.',
      primaryAction: 'Continue setup',
      steps: [
        'Run the scan again if you changed devices.',
        'Use Self Test before a real match.'
      ]
    };
  }

  if (status === 'unsupported') {
    return {
      ...base,
      level: 'blocked',
      title: `${featureLabel} access is not available here`,
      detail: desktopReady
        ? 'The desktop shell can still run the Windows setup scan, but browser mic capture needs a supported Web Audio browser surface.'
        : 'Open CueForge in Chrome, Edge, or the desktop shell so Web Audio and device scanning are available.',
      primaryAction: desktopReady ? 'Run Windows scan' : 'Open supported browser',
      steps: [
        'Use Chrome, Edge, or the CueForge desktop build.',
        'Refresh CueForge after switching browsers.',
        'Run Self Test to confirm the audio APIs are visible.'
      ]
    };
  }

  if (status === 'denied' || status === 'blocked') {
    return {
      ...base,
      level: 'needs-action',
      title: `${featureLabel} permission is blocked`,
      detail: 'CueForge cannot silently bypass browser permission. You stay in control, but setup needs one visible allow step.',
      primaryAction: 'Allow in address bar, then rescan',
      steps: [
        'Click the permission or tune icon next to the address bar.',
        'Set Microphone to Allow for this local CueForge page.',
        'Refresh the page, then run Scan audio devices or Self Test again.'
      ]
    };
  }

  if (status === 'skipped') {
    return {
      ...base,
      level: 'needs-action',
      title: `${featureLabel} permission was skipped`,
      detail: 'Device names may stay hidden until the browser gets a real allow decision.',
      primaryAction: 'Retry permission',
      steps: [
        'Click Scan audio devices again.',
        'Choose Allow when the browser asks for microphone access.',
        'If no prompt appears, use the address bar permission control and refresh.'
      ]
    };
  }

  return {
    ...base,
    level: 'check',
    title: `${featureLabel} permission needs a check`,
    detail: 'CueForge will try the safe browser path first, then fall back to redacted setup summaries if the browser keeps names hidden.',
    primaryAction: 'Run scan',
    steps: [
      'Run Scan audio devices.',
      'Allow microphone access if prompted.',
      desktopReady
        ? 'Run the desktop Windows scan if browser names stay hidden.'
        : 'Use the desktop build for one-click Windows device/tool detection.'
    ]
  };
}

export function formatPermissionRecoverySteps(recovery) {
  if (!recovery?.steps?.length) return '';
  return recovery.steps.map((step, index) => `${index + 1}. ${step}`).join(' ');
}

function featureLabelFor(feature) {
  const text = String(feature || '').toLowerCase();
  if (text.includes('device')) return 'Device scan';
  if (text.includes('setup')) return 'Setup microphone';
  if (text.includes('mic')) return 'Microphone';
  return 'Audio permission';
}
