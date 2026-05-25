export const desktopBridgeFixture = {
  tools: {
    equalizerApo: { installed: true, displayName: 'Equalizer APO' },
    peace: { installed: true, displayName: 'Peace' },
    steelSeriesSonar: { installed: true, displayName: 'SteelSeries Sonar' },
    fxSound: { installed: false },
    dolbyAccess: { installed: false },
    vbCable: { installed: false },
    voicemeeter: { installed: false },
    discord: { installed: true, displayName: 'Discord' }
  },
  soundDevices: [
    { Name: 'HyperX QuadCast USB Microphone' },
    { Name: 'USB DAC Headphones' }
  ],
  mediaDevices: [],
  defaults: {
    playback: 'USB DAC Headphones',
    communicationsPlayback: 'USB DAC Headphones',
    recording: 'HyperX QuadCast USB Microphone',
    communicationsRecording: 'HyperX QuadCast USB Microphone'
  },
  sessions: [
    { app: 'Rainbow Six Siege', endpoint: 'USB DAC Headphones', active: true },
    { app: 'Discord', endpoint: 'HyperX QuadCast USB Microphone', active: true }
  ],
  runningGames: [{ name: 'Rainbow Six Siege' }],
  matches: { hyperx: true, iemOrDac: true, virtualRouting: false }
};

export const browserDeviceFixture = [
  { kind: 'audioinput', label: 'HyperX QuadCast' },
  { kind: 'audiooutput', label: 'USB DAC Headphones' }
];
