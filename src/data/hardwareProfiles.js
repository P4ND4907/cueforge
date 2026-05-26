export const hardwareProfiles = {
  genericIem: {
    id: 'genericIem',
    label: 'Generic IEM / DAC',
    kind: 'output',
    match: /iem|dac|usb audio|headphone|earbud|moondrop|truthear/i,
    strengths: ['detail', 'fast transients'],
    risks: ['treble fatigue', 'low bass rumble'],
    setupTip: 'Start with controlled sub-bass and gentle 2k-4k lift.'
  },
  gamingHeadset: {
    id: 'gamingHeadset',
    label: 'Gaming headset',
    kind: 'output',
    match: /headset|cloud alpha|arctis|g pro|blackshark|kraken|corsair/i,
    strengths: ['simple chain', 'built-in mic'],
    risks: ['software double EQ', 'boomy cups'],
    setupTip: 'Keep headset app EQ flat while CueForge builds the first profile.'
  },
  usbMic: {
    id: 'usbMic',
    label: 'USB mic',
    kind: 'input',
    match: /hyperx|quadcast|solocast|yeti|wave|elgato|usb mic|microphone/i,
    strengths: ['clear capture', 'easy Discord setup'],
    risks: ['auto gain', 'room noise', 'clipping'],
    setupTip: 'Disable auto gain where possible and run Mic Lab before a match.'
  }
};

export function classifyHardware(label = '') {
  const text = String(label);
  return Object.values(hardwareProfiles).filter((profile) => profile.match.test(text));
}
