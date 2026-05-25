export function collectEnhancements() {
  return {
    schema: 'cueforge.native-enhancements.v1',
    supported: false,
    message: 'Enhancement detection should come from the desktop bridge report and never silently change settings.'
  };
}
