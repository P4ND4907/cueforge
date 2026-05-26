export function collectBrowserAudioCaps() {
  const AudioCtor = typeof window !== 'undefined'
    ? (window.AudioContext || (window as any).webkitAudioContext)
    : null;

  return {
    source: 'browser',
    audioContext: Boolean(AudioCtor),
    mediaDevices: typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices),
    enumerateDevices: typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.enumerateDevices),
    getUserMedia: typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia),
    canAutoplayLoudTone: false,
    boundary: 'Browser capabilities do not prove native Windows routing or installed APO layers.'
  };
}
