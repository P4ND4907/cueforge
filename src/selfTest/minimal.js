export async function runMinimalSelfTest({
  target = globalThis.window,
  navigatorRef = globalThis.navigator
} = {}) {
  const audioApi = Boolean(target?.AudioContext || target?.webkitAudioContext);
  const mediaDevices = Boolean(navigatorRef?.mediaDevices?.enumerateDevices);

  return {
    schema: 'cueforge.minimal-self-test.v1',
    passed: audioApi && mediaDevices,
    checks: {
      audioApi,
      mediaDevices,
      desktopBridge: Boolean(target?.cueforgeDesktop?.isDesktop)
    }
  };
}
