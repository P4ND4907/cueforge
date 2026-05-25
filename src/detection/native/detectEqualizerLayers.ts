export function detectEqualizerLayers(bridgeReport: Record<string, any> = {}) {
  const tools = bridgeReport.tools || {};
  return {
    equalizerApo: Boolean(tools.equalizerApo?.installed || tools.equalizerApo),
    peace: Boolean(tools.peace?.installed || tools.peace),
    sonar: Boolean(tools.steelSeriesSonar?.installed || tools.steelSeriesSonar),
    evidence: Object.keys(tools).filter((key) => /apo|peace|sonar/i.test(key))
  };
}
