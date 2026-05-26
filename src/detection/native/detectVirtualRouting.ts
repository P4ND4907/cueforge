function labels(report: Record<string, any> = {}) {
  return [...(report.soundDevices || []), ...(report.mediaDevices || [])]
    .map((device) => String(device.label || device.name || device.FriendlyName || device.Name || ''))
    .join(' ');
}

export function detectVirtualRouting(bridgeReport: Record<string, any> = {}) {
  const text = labels(bridgeReport);
  const tools = bridgeReport.tools || {};
  return {
    voicemeeter: Boolean(tools.voicemeeter?.installed || tools.voicemeeter || /voicemeeter/i.test(text)),
    vbCable: Boolean(tools.vbCable?.installed || tools.vbCable || /vb-cable|virtual cable/i.test(text)),
    sonar: Boolean(tools.steelSeriesSonar?.installed || tools.steelSeriesSonar || /sonar/i.test(text))
  };
}
