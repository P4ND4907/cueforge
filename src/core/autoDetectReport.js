import { classifyHardware } from '../data/hardwareProfiles.js';

const companionMap = {
  equalizerApo: ['equalizerApo'],
  peace: ['peace'],
  sonar: ['steelSeriesSonar'],
  voicemeeter: ['voicemeeter'],
  vbCable: ['vbCable'],
  discord: ['discord'],
  dolby: ['dolbyAccess', 'dtsSoundUnbound'],
  windowsSonic: ['windowsSonic'],
  nahimic: ['nahimic'],
  razer: ['razerThx']
};

const companionLabels = {
  equalizerApo: 'Equalizer APO',
  peace: 'Peace',
  sonar: 'Sonar',
  voicemeeter: 'Voicemeeter',
  vbCable: 'VB-CABLE',
  discord: 'Discord',
  dolby: 'Dolby / DTS',
  windowsSonic: 'Windows Sonic',
  nahimic: 'Nahimic',
  razer: 'Razer THX'
};

function list(value) {
  return Array.isArray(value) ? value : [];
}

function clean(value, fallback = '') {
  const text = String(value || fallback)
    .replace(/[A-Z]:\\(?:[^\\\s]+\\)*[^\\\s]*/gi, '[path-hidden]')
    .replace(/\b(?:device|group|instance|container|serial|pnp|machine)[-_ ]?id[:=]?\s*[a-z0-9\\&{}-]+/gi, '[id-hidden]')
    .replace(/\s+/g, ' ')
    .trim();
  return text || fallback;
}

function deviceLabel(device, fallback) {
  return clean(device?.label || device?.name || device?.Name || device?.FriendlyName || device?.DisplayName, fallback);
}

function sourceName({ hasBrowser, hasBridge }) {
  if (hasBrowser && hasBridge) return 'browser+desktop_bridge';
  if (hasBridge) return 'desktop_bridge';
  if (hasBrowser) return 'browser';
  return 'none';
}

function isInputDevice(device) {
  const kind = clean(device?.kind || device?.Kind || '').toLowerCase();
  const label = deviceLabel(device, '').toLowerCase();
  return kind === 'audioinput' || /mic|microphone|capture|input|quadcast|solocast|yeti|wave link/.test(label);
}

function isOutputDevice(device) {
  const kind = clean(device?.kind || device?.Kind || '').toLowerCase();
  const label = deviceLabel(device, '').toLowerCase();
  return kind === 'audiooutput' || /headphone|headset|speaker|output|render|dac|iem|usb audio|cloud alpha|arctis|sonar/.test(label);
}

function normalizeDevice(device, index, source, role) {
  const label = deviceLabel(device, `${role === 'input' ? 'Audio input' : 'Audio output'} ${index + 1}`);
  const hardware = classifyHardware(label).map((profile) => profile.id);

  return {
    label,
    role,
    source,
    kind: clean(device?.kind || device?.PNPClass || device?.Status || 'audio'),
    status: clean(device?.Status || device?.status || (label ? 'detected' : 'unknown')),
    hardware
  };
}

function normalizeBrowserDevices(devices, role) {
  return list(devices)
    .filter((device) => clean(device?.kind).includes('audio'))
    .filter(role === 'input' ? isInputDevice : isOutputDevice)
    .map((device, index) => normalizeDevice(device, index, 'browser', role));
}

function normalizeBridgeDevices(report, role) {
  return [...list(report?.soundDevices), ...list(report?.mediaDevices)]
    .filter(role === 'input' ? isInputDevice : isOutputDevice)
    .map((device, index) => normalizeDevice(device, index, 'desktop_bridge', role));
}

function toolInstalled(report, key) {
  const tool = report?.tools?.[key];
  if (typeof tool === 'boolean') return tool;
  return Boolean(tool?.installed);
}

function toolEvidence(report, keys) {
  return keys
    .map((key) => report?.tools?.[key])
    .find((tool) => tool?.installed || typeof tool === 'boolean');
}

function labelsInclude(report, pattern) {
  const labels = [
    ...list(report?.soundDevices),
    ...list(report?.mediaDevices)
  ].map((device) => deviceLabel(device, '')).join(' ');
  return pattern.test(labels);
}

function companionState(report, key, hasBridge) {
  const keys = companionMap[key];
  const installed = keys.some((toolKey) => toolInstalled(report, toolKey));
  const evidence = toolEvidence(report, keys);
  const labelDetected = key === 'windowsSonic'
    ? labelsInclude(report, /windows sonic/i)
    : false;

  if (installed || labelDetected) {
    return {
      detected: true,
      confidence: hasBridge ? 92 : 55,
      label: companionLabels[key],
      evidence: clean(evidence?.displayName || evidence?.name || evidence?.device || evidence?.source || companionLabels[key])
    };
  }

  if (key === 'windowsSonic' && !report?.tools?.windowsSonic) {
    return {
      detected: null,
      confidence: 0,
      label: companionLabels[key],
      evidence: 'Not exposed by current scan'
    };
  }

  return {
    detected: false,
    confidence: hasBridge ? 70 : 0,
    label: companionLabels[key],
    evidence: hasBridge ? 'Not found in Windows bridge report' : 'Needs desktop bridge scan'
  };
}

function buildCompanions(report, hasBridge) {
  return Object.fromEntries(
    Object.keys(companionMap).map((key) => [key, companionState(report, key, hasBridge)])
  );
}

function uniqueHardware(devices) {
  const hardware = new Map();
  devices.forEach((device) => {
    classifyHardware(device.label).forEach((profile) => {
      const existing = hardware.get(profile.id);
      hardware.set(profile.id, {
        id: profile.id,
        label: profile.label,
        kind: profile.kind,
        confidence: Math.max(existing?.confidence || 0, device.source === 'desktop_bridge' ? 86 : 58),
        evidence: device.label
      });
    });
  });
  return [...hardware.values()];
}

function risk(id, severity, title, detail, fix) {
  return { id, severity, title, detail, fix };
}

function hasChatGameSplit(report) {
  if (report?.matches?.chatGameSplit) return true;
  const defaults = report?.defaults || {};
  const playback = clean(defaults.playback || defaults.render || defaults.defaultPlayback).toLowerCase();
  const comms = clean(defaults.communicationsPlayback || defaults.communications || defaults.defaultCommunicationsPlayback).toLowerCase();
  if (playback && comms && playback !== comms) return true;

  const labels = [
    ...list(report?.soundDevices),
    ...list(report?.mediaDevices)
  ].map((device) => deviceLabel(device, '').toLowerCase());
  const hasGameSide = labels.some((label) => /\b(game|gaming)\b/.test(label));
  const hasChatSide = labels.some((label) => /\b(chat|communications|hands-free|handsfree)\b/.test(label));
  const hasWirelessHeadset = labels.some((label) => /wireless|bluetooth|headset|arctis|astro|cloud|g pro/.test(label));
  return hasWirelessHeadset && hasGameSide && hasChatSide;
}

function hasHiddenBrowserLabels({ report, outputs, inputs, hasBridge }) {
  if (hasBridge) return false;
  const exposedDevices = [...outputs, ...inputs].filter((device) => device.source === 'browser');
  if (!exposedDevices.length) return true;
  return exposedDevices.some((device) => (
    !device.label ||
    /^audio (input|output) \d+$/i.test(device.label) ||
    /name hidden|default (input|output)|audioinput|audiooutput/i.test(device.label)
  )) || report?.permissionState === 'blocked';
}

function defaultPlaybackLabel(report) {
  return clean(
    report?.defaults?.playback ||
    report?.defaults?.render ||
    report?.defaults?.defaultPlayback ||
    ''
  );
}

function buildConfidence({ permissionState, hasBridge, outputs, inputs, companions, risks }) {
  let score = 0;
  const reasons = [];

  if (hasBridge) {
    score += 46;
    reasons.push('desktop bridge evidence available');
  } else if (outputs.length || inputs.length) {
    score += 28;
    reasons.push('browser device evidence available');
  } else {
    reasons.push('browser-only evidence');
  }

  if (outputs.length) score += 16;
  else reasons.push('output not confirmed');

  if (inputs.length) score += 16;
  else reasons.push('input not confirmed');

  const detectedCompanions = Object.values(companions || {}).filter((item) => item.detected === true).length;
  if (detectedCompanions) score += Math.min(14, detectedCompanions * 4);

  if (permissionState === 'granted') score += 8;
  if (permissionState === 'denied' || permissionState === 'blocked') {
    score -= 16;
    reasons.push('browser permission denied');
  }

  risks
    .filter((item) => item.severity === 'high')
    .forEach(() => { score -= 10; });

  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const tier = clamped >= 82
    ? 'strong'
    : clamped >= 40
      ? 'partial'
      : clamped >= 25
        ? 'limited'
        : 'unknown';

  return {
    score: clamped,
    tier,
    requiresExplicitScan: !hasBridge,
    reasons: [...new Set(reasons)]
  };
}

function buildRisks({ report, companions, outputs, inputs, hasBridge }) {
  const risks = [];
  const defaultPlayback = defaultPlaybackLabel(report);
  const spatialCount = ['dolby', 'windowsSonic', 'nahimic', 'razer']
    .filter((key) => companions[key]?.detected === true).length;

  if (!hasBridge) {
    risks.push(risk(
      'browser_only_scan',
      'medium',
      'Browser-only scan',
      'Browser mode can see exposed audio devices, but it cannot prove installed Windows enhancers or routing layers.',
      'Use the desktop bridge scan before calling the setup fully detected.'
    ));
  }

  if (hasHiddenBrowserLabels({ report, outputs, inputs, hasBridge })) {
    risks.push(risk(
      'hidden_device_labels',
      'medium',
      'Likely hidden device labels',
      'The browser returned unnamed or generic audio devices, so CueForge cannot prove the exact headset, DAC, or mic yet.',
      'Allow microphone permission or run the desktop bridge scan to reveal real device names.'
    ));
  }

  if (!outputs.length) {
    risks.push(risk(
      'output_not_confirmed',
      'high',
      'Output not confirmed',
      'CueForge cannot prove the headset, IEM, DAC, speaker, or virtual output path yet.',
      'Grant browser permission or load the Windows bridge report.'
    ));
  }

  if (!inputs.length) {
    risks.push(risk(
      'mic_not_confirmed',
      'medium',
      'Mic not confirmed',
      'CueForge cannot prove the Discord, game chat, or stream input path yet.',
      'Grant mic permission or load the Windows bridge report.'
    ));
  }

  if (companions.sonar.detected) {
    risks.push(risk(
      'sonar_virtual_output',
      'medium',
      'Sonar may be routing game audio through a virtual output',
      'If the game is using Sonar, APO must be checked against the active Sonar endpoint, not a different physical device.',
      'Confirm which endpoint game audio uses before applying APO.'
    ));
  }

  if (companions.sonar.detected && companions.equalizerApo.detected) {
    risks.push(risk(
      'sonar_apo_target_mismatch',
      'medium',
      'Sonar + APO target needs confirmation',
      'Equalizer APO is detected, but Sonar can route audio through a virtual endpoint that may not be the APO target.',
      'Run Confirm APO Path before judging EQ changes.'
    ));
  }

  if (hasBridge && defaultPlayback && (
    companions.sonar.detected ||
    companions.equalizerApo.detected ||
    companions.voicemeeter.detected ||
    companions.vbCable.detected
  )) {
    risks.push(risk(
      'default_endpoint_needs_check',
      'medium',
      'Wrong default endpoint is possible',
      `Windows default playback appears to be ${defaultPlayback}. That may not be the same endpoint carrying game audio after Sonar, APO, or virtual routing.`,
      'Confirm Windows default output, communications output, Discord output, and in-game output before judging tuning.'
    ));
  }

  if (companions.voicemeeter.detected || companions.vbCable.detected || report?.matches?.virtualRouting) {
    risks.push(risk(
      'virtual_routing_present',
      'medium',
      'Virtual routing detected',
      'Voicemeeter or VB-CABLE can split game, Discord, stream, and mic paths.',
      'Manual verification required: map Windows output/input plus Discord and game devices before tuning.'
    ));
  }

  if (hasChatGameSplit(report)) {
    risks.push(risk(
      'chat_game_split_detected',
      'medium',
      'Chat/game split detected',
      'The headset or Windows defaults appear to separate game audio from communications audio.',
      'Confirm Windows playback, communications playback, Discord output, game output, and mic input before tuning.'
    ));
  }

  if (spatialCount > 1) {
    risks.push(risk(
      'multiple_spatial_layers',
      'high',
      'Multiple spatial/enhancer layers detected',
      'Stacked spatial processing can smear direction cues and make footsteps worse.',
      'Use one spatial layer during testing.'
    ));
  }

  return risks;
}

function buildRecommendations({ companions, risks, hasBridge, outputs, inputs }) {
  const recommendations = [];

  if (!hasBridge) {
    recommendations.push('Run or import the Windows bridge scan/export for real endpoint and companion-app detection.');
  }
  if (!outputs.length) {
    recommendations.push('Confirm the Windows output device before exporting or applying an EQ profile.');
  }
  if (!inputs.length) {
    recommendations.push('Confirm the mic/input device before diagnosing Discord or game chat.');
  }
  if (companions.sonar.detected || companions.equalizerApo.detected) {
    recommendations.push('Confirm which endpoint game audio uses before applying APO.');
  }
  if (risks.some((item) => item.id === 'virtual_routing_present')) {
    recommendations.push('Write down the game, Discord, stream, Windows output, and Windows input path before tuning.');
  }
  if (risks.some((item) => item.id === 'hidden_device_labels')) {
    recommendations.push('Reveal real device names with mic permission or the desktop bridge scan before sharing setup advice.');
  }
  if (risks.some((item) => item.id === 'default_endpoint_needs_check')) {
    recommendations.push('Confirm the default playback endpoint matches the device carrying game audio before judging EQ.');
  }
  if (risks.some((item) => item.id === 'chat_game_split_detected')) {
    recommendations.push('Confirm the game endpoint and chat endpoint are intentionally split before judging audio changes.');
  }
  if (!recommendations.length) {
    recommendations.push('Run output check, Mic Lab, then one real match A/B before calling the setup proven.');
  }

  return [...new Set(recommendations)].slice(0, 6);
}

export function buildAutoDetectReport({
  browserDevices = [],
  bridgeReport = null,
  permissionState = 'unknown',
  desktopReady = false,
  detectedAt = new Date().toISOString()
} = {}) {
  const browserInputs = normalizeBrowserDevices(browserDevices, 'input');
  const browserOutputs = normalizeBrowserDevices(browserDevices, 'output');
  const windowsRenderDevices = normalizeBridgeDevices(bridgeReport, 'output');
  const windowsCaptureDevices = normalizeBridgeDevices(bridgeReport, 'input');
  const hasBrowser = browserInputs.length + browserOutputs.length > 0;
  const hasBridge = Boolean(bridgeReport);
  const companions = buildCompanions(bridgeReport, hasBridge);
  const outputs = [...windowsRenderDevices, ...browserOutputs];
  const inputs = [...windowsCaptureDevices, ...browserInputs];
  const risks = buildRisks({ report: bridgeReport, companions, outputs, inputs, hasBridge });
  const confidence = buildConfidence({ permissionState, hasBridge, outputs, inputs, companions, risks });

  return {
    schema: 'cueforge.auto-detect-report.v2',
    detectedAt,
    source: sourceName({ hasBrowser, hasBridge }),
    mode: desktopReady || hasBridge ? 'desktop-assisted' : 'browser',
    permissionState,
    devices: {
      browserInputs,
      browserOutputs,
      windowsRenderDevices,
      windowsCaptureDevices
    },
    companions,
    confidence,
    suspectedHardware: uniqueHardware([...inputs, ...outputs]),
    risks,
    recommendations: buildRecommendations({ companions, risks, hasBridge, outputs, inputs })
  };
}

function firstDeviceLabel(devices, fallback) {
  return devices[0]?.label || fallback;
}

export function summarizeAutoDetectReport(report = {}) {
  const devices = report.devices || {};
  const detected = [];
  const risks = list(report.risks).map((item) => item.title);

  const windowsOutputLabel = firstDeviceLabel(devices.windowsRenderDevices, null);
  const browserOutputLabel = firstDeviceLabel(devices.browserOutputs, null);
  const windowsMicLabel = firstDeviceLabel(devices.windowsCaptureDevices, null);
  const browserMicLabel = firstDeviceLabel(devices.browserInputs, null);

  if (windowsOutputLabel) detected.push(`Windows output: ${windowsOutputLabel} suspected`);
  else if (browserOutputLabel) detected.push(`Browser output: ${browserOutputLabel} exposed`);

  if (windowsMicLabel) detected.push(`Mic: ${windowsMicLabel} detected`);
  else if (browserMicLabel) detected.push(`Browser mic: ${browserMicLabel} exposed`);

  Object.entries(report.companions || {})
    .filter(([, companion]) => companion.detected === true)
    .forEach(([, companion]) => detected.push(`${companion.label}: detected`));

  if (!detected.length) detected.push('No audio endpoint is confirmed yet.');

  return {
    detected,
    risks: risks.length ? risks : ['No major risk from the current report.'],
    recommendations: list(report.recommendations).length
      ? report.recommendations
      : ['Run Auto Detect, then complete output and mic checks.']
  };
}
