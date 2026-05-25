export function detectWrongDefaultDevice({
  selectedOutput = '',
  windowsDefaultOutput = '',
  expectedLabel = ''
}: Record<string, string> = {}) {
  const selected = selectedOutput.toLowerCase();
  const windowsDefault = windowsDefaultOutput.toLowerCase();
  const expected = expectedLabel.toLowerCase();
  const mismatch = Boolean(selected && windowsDefault && selected !== windowsDefault);
  const expectedMismatch = Boolean(expected && windowsDefault && !windowsDefault.includes(expected));

  return {
    id: 'wrong-default-device',
    mismatch: mismatch || expectedMismatch,
    warning: mismatch || expectedMismatch
      ? 'The selected output and Windows default output may not be the same endpoint.'
      : null
  };
}
