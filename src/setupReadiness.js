export function computeSetupReadiness({
  audioApi = false,
  micPermission = 'unknown',
  deviceCount = 0,
  bridgeLoaded = false,
  apoFound = false,
  selfTests = [],
  reportReady = false,
  hearingAnswered = 0
}) {
  const checks = [
    {
      id: 'audio-api',
      label: 'Browser audio engine',
      ready: Boolean(audioApi),
      weight: 18,
      fix: 'Use a Chromium-based browser and reload AudioTuner.'
    },
    {
      id: 'devices',
      label: 'Audio devices visible',
      ready: deviceCount > 0,
      weight: 14,
      fix: 'Allow mic permission or load the Windows bridge report.'
    },
    {
      id: 'mic',
      label: 'Live mic permission',
      ready: micPermission === 'granted',
      weight: 16,
      fix: 'Click Grant mic permission, then choose the HyperX or active mic.'
    },
    {
      id: 'bridge',
      label: 'Windows bridge report',
      ready: bridgeLoaded,
      weight: 14,
      fix: 'Run tools/Scan-AudioSetup.ps1 and load the generated report.'
    },
    {
      id: 'apo',
      label: 'System EQ target',
      ready: apoFound,
      weight: 12,
      fix: 'Install or enable Equalizer APO on the output device you actually use.'
    },
    {
      id: 'self-test',
      label: 'Auto self test recorded',
      ready: selfTests.length > 0 && !selfTests.some((item) => item.status === 'fail'),
      weight: 12,
      fix: 'Run Self Test and fix any failed rows before player testing.'
    },
    {
      id: 'report',
      label: 'Recovery report ready',
      ready: reportReady,
      weight: 8,
      fix: 'Create one redacted report in Report Lab so issues can be replayed.'
    },
    {
      id: 'hearing',
      label: 'Personal hearing baseline',
      ready: hearingAnswered >= 4,
      weight: 6,
      fix: 'Mark at least two tones per ear in Hearing Model.'
    }
  ];

  const score = Math.round(
    checks.reduce((sum, check) => sum + (check.ready ? check.weight : 0), 0)
  );
  const blockers = checks.filter((check) => !check.ready && ['audio-api', 'devices', 'mic', 'self-test'].includes(check.id));
  const status = blockers.length === 0 && score >= 78 ? 'player-test-ready' : score >= 55 ? 'nearly-ready' : 'needs-setup';

  return {
    score,
    status,
    checks,
    blockers,
    nextActions: checks.filter((check) => !check.ready).slice(0, 3).map((check) => check.fix)
  };
}
