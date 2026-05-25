import { buildAutoDetectReport } from '../../core/autoDetectReport.js';
import { nativeEvidenceToBridgeReport, normalizeMachineEvidence } from '../../core/chain/evidence.js';

export function mergeBridgeEvidence({
  browser = null,
  native = null,
  browserDevices = [],
  bridgeReport = null,
  permissionState = 'unknown',
  detectedAt
}: Record<string, unknown> = {}) {
  const evidence = normalizeMachineEvidence({
    browser,
    native,
    browserDevices,
    bridgeReport,
    permissionState
  });

  return buildAutoDetectReport({
    browserDevices: evidence.browserDevices,
    bridgeReport: evidence.bridgeReport,
    permissionState: evidence.permissionState,
    desktopReady: Boolean(evidence.bridgeReport),
    detectedAt
  });
}

export { nativeEvidenceToBridgeReport };
