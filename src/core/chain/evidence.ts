export function createEvidencePacket({
  source = 'unknown',
  confidence = 0,
  observations = [],
  risks = []
}: {
  source?: string;
  confidence?: number;
  observations?: unknown[];
  risks?: unknown[];
} = {}) {
  return {
    schema: 'cueforge.chain-evidence.v1',
    collectedAt: new Date().toISOString(),
    source,
    confidence: Math.max(0, Math.min(100, Math.round(Number(confidence) || 0))),
    observations,
    risks
  };
}

export function mergeEvidencePackets(packets: Array<Record<string, unknown>> = []) {
  const confidence = packets.reduce((sum, item) => sum + Number(item.confidence || 0), 0) / Math.max(1, packets.length);
  return createEvidencePacket({
    source: packets.map((item) => item.source).filter(Boolean).join('+') || 'none',
    confidence,
    observations: packets.flatMap((item) => Array.isArray(item.observations) ? item.observations : []),
    risks: packets.flatMap((item) => Array.isArray(item.risks) ? item.risks : [])
  });
}

function list(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function clean(value: unknown, fallback = '') {
  const text = String(value || fallback)
    .replace(/[A-Z]:\\(?:[^\\\s]+\\)*[^\\\s]*/gi, '[path-hidden]')
    .replace(/\b(?:device|group|instance|container|serial|pnp|machine)[-_ ]?id[:=]?\s*[a-z0-9\\&{}-]+/gi, '[id-hidden]')
    .replace(/\s+/g, ' ')
    .trim();
  return text || fallback;
}

function normalizePermission(value: unknown) {
  const text = String(value || '').toLowerCase();
  if (text.includes('granted') || text.includes('remembered')) return 'granted';
  if (text.includes('denied') || text.includes('blocked')) return 'denied';
  if (text.includes('prompt') || text.includes('hidden')) return 'prompt';
  return 'unknown';
}

function normalizeDeviceKind(device: any) {
  const kind = String(device?.kind || device?.Kind || '').toLowerCase();
  const label = clean(device?.label || device?.name || device?.Name || device?.FriendlyName, '').toLowerCase();
  if (kind === 'audioinput' || kind.includes('capture') || /mic|microphone|input|capture/.test(label)) return 'audioinput';
  if (kind === 'audiooutput' || kind.includes('render') || /speaker|headphone|headset|output|dac|iem|sonar/.test(label)) return 'audiooutput';
  return kind.includes('input') ? 'audioinput' : 'audiooutput';
}

function endpointLabel(endpoint: any, fallback: string) {
  return clean(endpoint?.label || endpoint?.name || endpoint?.friendlyName || endpoint?.FriendlyName || endpoint?.Name, fallback);
}

function endpointKind(endpoint: any) {
  const role = String(endpoint?.role || endpoint?.dataFlow || '').toLowerCase();
  if (endpoint?.kind === 'audioinput' || role.includes('capture') || role.includes('record')) return 'audioinput';
  if (endpoint?.kind === 'audiooutput' || role.includes('render') || role.includes('playback')) return 'audiooutput';
  return normalizeDeviceKind(endpoint);
}

function normalizeInstallState(tool: any, displayName: string) {
  if (typeof tool === 'boolean') {
    return tool ? { installed: true, displayName } : { installed: false, displayName };
  }

  if (!tool) return { installed: false, displayName };

  return {
    installed: Boolean(tool.installed ?? tool.detected),
    displayName: clean(tool.displayName || tool.name || displayName),
    version: clean(tool.version || ''),
    source: clean(tool.source || '')
  };
}

function normalizeDefaults(native: any, endpoints: any[]) {
  const endpointDefaults = Object.fromEntries(
    endpoints.flatMap((endpoint) => list(endpoint?.defaultFor).map((role) => [role, endpoint?.id || endpointLabel(endpoint, '')]))
  );
  const defaults = {
    ...endpointDefaults,
    ...(native?.defaults || {})
  };
  const byId = new Map(endpoints.map((endpoint) => [String(endpoint.id || ''), endpointLabel(endpoint, '')]));

  return Object.fromEntries(
    Object.entries(defaults).map(([key, value]) => {
      const label = byId.get(String(value || '')) || clean(value);
      return [key, label];
    })
  );
}

function inferChatGameSplit(native: any, endpoints: any[], defaults: Record<string, string>) {
  const endpointById = new Map(endpoints.map((endpoint) => [String(endpoint.id || ''), endpointLabel(endpoint, '')]));
  const playback = clean(defaults.playback || defaults.render || '');
  const commsPlayback = clean(defaults.communicationsPlayback || defaults.communicationPlayback || '');
  if (playback && commsPlayback && playback.toLowerCase() !== commsPlayback.toLowerCase()) return true;

  const sessions = list(native?.sessions);
  const gameTargets = new Set<string>();
  const chatTargets = new Set<string>();

  sessions.forEach((session) => {
    const app = clean(session.app || session.processName || session.ProcessName || '').toLowerCase();
    const endpoint = endpointById.get(String(session.endpointId || '')) || clean(session.endpoint || session.device || '');
    if (!endpoint) return;
    if (/discord|teamspeak|mumble|obs|streamlabs|chat|voice/i.test(app)) chatTargets.add(endpoint.toLowerCase());
    if (/game|valorant|tarkov|siege|rainbow|cod|warzone|apex|fortnite|counter|cs2|overwatch|pubg|battlefield/i.test(app)) gameTargets.add(endpoint.toLowerCase());
  });

  return [...gameTargets].some((target) => !chatTargets.has(target)) && chatTargets.size > 0;
}

export function normalizeBrowserEvidence(browser: any = {}) {
  const source = Array.isArray(browser) ? { devices: browser } : (browser || {});
  const devices = list(source.devices).map((device, index) => ({
    kind: normalizeDeviceKind(device),
    label: clean(device?.label || device?.name || device?.Name || '', ''),
    deviceId: device?.deviceId ? '[browser-hidden]' : undefined,
    isDefault: Boolean(device?.isDefault || /default/i.test(String(device?.label || ''))),
    _index: index
  })).filter((device) => device.kind === 'audioinput' || device.kind === 'audiooutput');

  return {
    audioApi: Boolean(source.audioApi ?? source.audioContext ?? source.mediaDevices ?? devices.length),
    micApi: Boolean(source.micApi ?? source.getUserMedia ?? devices.some((device) => device.kind === 'audioinput')),
    permission: normalizePermission(source.permission || source.permissionState),
    devices: devices.map(({ _index, ...device }) => device)
  };
}

export function nativeEvidenceToBridgeReport(native: any = null) {
  if (!native) return null;

  const endpoints = list(native.endpoints);
  const tools = native.tools || {};
  const defaults = normalizeDefaults(native, endpoints);
  const soundDevices = endpoints.map((endpoint, index) => {
    const label = endpointLabel(endpoint, `Windows endpoint ${index + 1}`);
    const kind = endpointKind(endpoint);

    return {
      FriendlyName: label,
      Name: label,
      kind,
      Status: clean(endpoint.state || 'detected'),
      isDefault: Boolean(endpoint.isDefault || Object.values(defaults).includes(label)),
      source: 'native-evidence'
    };
  });
  const sessions = list(native.sessions).map((session) => ({
    app: clean(session.app || session.processName || 'App session'),
    active: Boolean(session.active),
    endpointId: session.endpointId ? '[endpoint-hidden]' : undefined
  }));
  const normalizedTools = {
    equalizerApo: normalizeInstallState(tools.equalizerApo, 'Equalizer APO'),
    peace: normalizeInstallState(tools.peace, 'Peace'),
    steelSeriesSonar: normalizeInstallState(tools.sonar || tools.steelSeriesSonar, 'SteelSeries Sonar'),
    voicemeeter: normalizeInstallState(tools.voicemeeter, 'Voicemeeter'),
    vbCable: normalizeInstallState(tools.vbCable, 'VB-CABLE'),
    dolbyAccess: normalizeInstallState(tools.dolby || tools.dolbyAccess, 'Dolby Access / Atmos'),
    dtsSoundUnbound: normalizeInstallState(tools.dts || tools.dtsSoundUnbound, 'DTS Sound Unbound'),
    windowsSonic: normalizeInstallState(tools.windowsSonic, 'Windows Sonic'),
    nahimic: normalizeInstallState(tools.nahimic, 'Nahimic'),
    razerThx: normalizeInstallState(tools.razer || tools.razerThx, 'Razer THX')
  };

  return {
    schema: 'cueforge.native-bridge-adapter.v1',
    manifestVersion: native.manifestVersion || 'cueforge.native.v1',
    host: {
      os: native.host?.os || native.os?.family || 'windows',
      build: clean(native.host?.build || native.os?.build || '')
    },
    soundDevices,
    mediaDevices: [],
    sessions,
    tools: normalizedTools,
    defaults,
    matches: {
      virtualRouting: Boolean(normalizedTools.voicemeeter.installed || normalizedTools.vbCable.installed || normalizedTools.steelSeriesSonar.installed),
      chatGameSplit: inferChatGameSplit(native, endpoints, defaults)
    }
  };
}

function evidenceConfidence({ browser, bridgeReport }: { browser: any; bridgeReport: any }) {
  let browserScore = 0;
  if (browser.audioApi) browserScore += 15;
  if (browser.micApi) browserScore += 10;
  if (browser.permission === 'granted') browserScore += 10;
  if (browser.devices.some((device: any) => device.kind === 'audiooutput')) browserScore += 10;
  if (browser.devices.some((device: any) => device.kind === 'audioinput')) browserScore += 10;

  if (!bridgeReport) return Math.max(0, Math.min(65, browserScore));

  const endpointCount = list(bridgeReport.soundDevices).length + list(bridgeReport.mediaDevices).length;
  const installedTools = Object.values(bridgeReport.tools || {}).filter((tool: any) => tool?.installed).length;
  let nativeScore = 68;
  nativeScore += Math.min(16, endpointCount * 4);
  nativeScore += Math.min(10, installedTools * 3);
  nativeScore += Object.keys(bridgeReport.defaults || {}).length ? 6 : 0;

  return Math.max(0, Math.min(100, Math.round(nativeScore + browserScore * 0.15)));
}

export function normalizeMachineEvidence({
  browser = null,
  native = null,
  browserDevices = null,
  bridgeReport = null,
  permissionState = 'unknown'
}: Record<string, any> = {}) {
  const normalizedBrowser = normalizeBrowserEvidence(browser || {
    devices: browserDevices || [],
    permission: permissionState
  });
  const normalizedBridgeReport = bridgeReport || nativeEvidenceToBridgeReport(native);
  const source = normalizedBridgeReport
    ? normalizedBrowser.devices.length ? 'browser+desktop_bridge' : 'desktop_bridge'
    : normalizedBrowser.devices.length ? 'browser' : 'none';
  const confidence = evidenceConfidence({
    browser: normalizedBrowser,
    bridgeReport: normalizedBridgeReport
  });
  const evidence = mergeEvidencePackets([
    createEvidencePacket({
      source: 'browser',
      confidence: Math.min(confidence, normalizedBridgeReport ? 45 : confidence),
      observations: normalizedBrowser.devices.map((device: any) => ({
        type: 'browser-device',
        kind: device.kind,
        label: device.label || 'Name hidden until permission is granted'
      })),
      risks: normalizedBrowser.permission === 'denied'
        ? [{ id: 'browser-permission-denied', severity: 'medium' }]
        : []
    }),
    ...(normalizedBridgeReport ? [createEvidencePacket({
      source: 'desktop_bridge',
      confidence,
      observations: list(normalizedBridgeReport.soundDevices).map((device: any) => ({
        type: 'native-endpoint',
        kind: device.kind,
        label: device.FriendlyName || device.Name
      })),
      risks: normalizedBridgeReport.matches?.virtualRouting
        ? [{ id: 'virtual-routing-present', severity: 'medium' }]
        : []
    })] : [])
  ]);

  return {
    browser: normalizedBrowser,
    nativeBridgeReport: normalizedBridgeReport,
    bridgeReport: normalizedBridgeReport,
    browserDevices: normalizedBrowser.devices,
    permissionState: normalizedBrowser.permission,
    source,
    evidenceConfidence: confidence,
    evidence
  };
}
