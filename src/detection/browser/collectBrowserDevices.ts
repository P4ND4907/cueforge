export async function collectBrowserDevices() {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
    return {
      source: 'browser',
      audioApi: false,
      micApi: false,
      permission: 'unknown',
      devices: [],
      permissionState: 'unavailable'
    };
  }

  let permission = 'unknown';
  try {
    const result = await (navigator as any).permissions?.query?.({ name: 'microphone' });
    permission = result?.state || 'unknown';
  } catch {
    permission = 'unknown';
  }

  const devices = await navigator.mediaDevices.enumerateDevices();
  const labelsVisible = devices.some((device) => device.label);

  return {
    source: 'browser',
    audioApi: typeof window !== 'undefined' && Boolean(window.AudioContext || (window as any).webkitAudioContext),
    micApi: Boolean(navigator.mediaDevices.getUserMedia),
    permission,
    devices: devices.map((device) => ({
      kind: device.kind,
      label: device.label || '',
      deviceId: device.deviceId ? '[hidden-by-browser]' : '',
      groupId: device.groupId ? '[hidden-by-browser]' : '',
      isDefault: /default/i.test(device.label || '')
    })),
    permissionState: labelsVisible ? 'granted-or-remembered' : 'labels-hidden'
  };
}
