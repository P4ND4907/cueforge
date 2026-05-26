export function collectWasapi() {
  return {
    schema: 'cueforge.native-wasapi.v1',
    supported: false,
    message: 'WASAPI collection is planned for the native sandbox. Current builds use explicit bridge reports only.'
  };
}
