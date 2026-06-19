export async function runQuickDetect({
  desktop = globalThis.window?.cueforgeDesktop,
  navigatorRef = globalThis.navigator
} = {}) {
  const devices = await safeEnumerateDevices(navigatorRef);
  const labels = devices.map((device) => String(device.label || '')).join(' ');
  const desktopGame = await safeDetectGame(desktop);

  return {
    schema: 'cueforge.quick-detect.v1',
    completeChain: devices.some((device) => device.kind === 'audioinput') && devices.some((device) => device.kind === 'audiooutput'),
    sonar: /sonar|steelseries/i.test(labels),
    discord: /discord/i.test(labels),
    iEm: /iem|in-ear|earbud/i.test(labels),
    eqActive: /equalizer apo|peace|eq/i.test(labels),
    runningGame: desktopGame?.id || desktopGame || null,
    deviceCounts: {
      inputs: devices.filter((device) => device.kind === 'audioinput').length,
      outputs: devices.filter((device) => device.kind === 'audiooutput').length
    }
  };
}

async function safeEnumerateDevices(navigatorRef) {
  try {
    if (!navigatorRef?.mediaDevices?.enumerateDevices) return [];
    return await navigatorRef.mediaDevices.enumerateDevices();
  } catch {
    return [];
  }
}

async function safeDetectGame(desktop) {
  try {
    if (!desktop?.detectGame) return null;
    return await desktop.detectGame();
  } catch {
    return null;
  }
}
