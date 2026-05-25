function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function safeList(value) {
  return Array.isArray(value) ? value : [];
}

export function summarizeBridgeReport(report = null) {
  const soundDeviceCount = safeList(report?.soundDevices).length;
  const mediaDeviceCount = safeList(report?.mediaDevices).length;
  const toolState = {
    equalizerApo: Boolean(report?.tools?.equalizerApo?.installed),
    peace: Boolean(report?.tools?.peace?.installed),
    steelSeriesSonar: Boolean(report?.tools?.steelSeriesSonar?.installed),
    voicemeeter: Boolean(report?.tools?.voicemeeter?.installed),
    vbCable: Boolean(report?.tools?.vbCable?.installed)
  };
  const namedMatches = {
    hyperx: Boolean(report?.matches?.hyperx),
    iemOrDac: Boolean(report?.matches?.iemOrDac),
    virtualRouting: Boolean(report?.matches?.virtualRouting)
  };

  return {
    hasReport: Boolean(report),
    soundDeviceCount,
    mediaDeviceCount,
    totalDeviceCount: soundDeviceCount + mediaDeviceCount,
    toolState,
    namedMatches,
    generatedAt: report?.generatedAt || null
  };
}

export function formatBridgeReportProof(report = null) {
  const summary = summarizeBridgeReport(report);
  if (!summary.hasReport) {
    return 'No Windows bridge report is loaded yet.';
  }

  const foundTools = Object.entries(summary.toolState)
    .filter(([, installed]) => installed)
    .map(([name]) => name)
    .join(', ') || 'no companion audio tools detected yet';
  const matches = [
    summary.namedMatches.hyperx ? 'HyperX-style mic match' : '',
    summary.namedMatches.iemOrDac ? 'IEM/DAC/headset output match' : '',
    summary.namedMatches.virtualRouting ? 'virtual routing match' : ''
  ].filter(Boolean).join(', ') || 'no named gear match';

  return `${summary.soundDeviceCount} sound devices, ${summary.mediaDeviceCount} media endpoints, ${foundTools}; ${matches}.`;
}

export function evaluateMicCaptureProof({
  streamStarted = false,
  rms = 0,
  peak = 0,
  sampleRate = 0,
  frameCount = 0,
  captureMs = 0,
  deviceLabel = ''
} = {}) {
  if (!streamStarted) {
    return {
      status: 'warn',
      signalPercent: 0,
      detail: 'Microphone permission is blocked, skipped, or unavailable. Grant mic permission, then rerun Self Test.'
    };
  }

  const safeRms = Number.isFinite(rms) ? Math.max(0, rms) : 0;
  const safePeak = Number.isFinite(peak) ? Math.max(0, peak) : 0;
  const signalPercent = clamp(Math.round(Math.max(safeRms * 420, safePeak * 120)), 0, 100);
  const hasUsefulSignal = signalPercent >= 2 || safePeak >= 0.025;
  const deviceText = deviceLabel ? ` from ${deviceLabel}` : '';
  const captureText = `${Math.round(captureMs)}ms / ${frameCount} frames / ${sampleRate || 'unknown'}Hz`;

  if (hasUsefulSignal) {
    return {
      status: 'pass',
      signalPercent,
      detail: `Mic stream opened${deviceText}; real signal detected at ${signalPercent}% (${captureText}).`
    };
  }

  return {
    status: 'warn',
    signalPercent,
    detail: `Mic stream opened${deviceText}, but the capture was silent or near silent (${captureText}). Speak into the selected mic, check Windows input level, then rerun.`
  };
}
