export const knownCompanions = [
  { key: 'equalizerApo', name: 'Equalizer APO', type: 'apply-target', group: 'system-eq', risk: 'low' },
  { key: 'peace', name: 'Peace UI', type: 'apply-target', group: 'system-eq', risk: 'low' },
  { key: 'steelSeriesSonar', name: 'SteelSeries Sonar', type: 'mixer', group: 'virtual-mixer', risk: 'medium' },
  { key: 'fxSound', name: 'FxSound', type: 'enhancer', group: 'enhancer', risk: 'medium' },
  { key: 'razerThx', name: 'Razer THX / Synapse', type: 'spatial', group: 'spatial', risk: 'medium' },
  { key: 'dolbyAccess', name: 'Dolby Access / Atmos', type: 'spatial', group: 'spatial', risk: 'medium' },
  { key: 'dtsSoundUnbound', name: 'DTS Sound Unbound', type: 'spatial', group: 'spatial', risk: 'medium' },
  { key: 'nahimic', name: 'Nahimic', type: 'enhancer', group: 'enhancer', risk: 'medium' },
  { key: 'realtekAudio', name: 'Realtek Audio Console', type: 'driver-console', group: 'driver-console', risk: 'low' },
  { key: 'nvidiaBroadcast', name: 'NVIDIA Broadcast', type: 'mic-processing', group: 'mic-processing', risk: 'medium' },
  { key: 'discord', name: 'Discord', type: 'communication-app', group: 'communication-app', risk: 'low' },
  { key: 'elgatoWaveLink', name: 'Elgato Wave Link', type: 'mixer', group: 'virtual-mixer', risk: 'medium' },
  { key: 'logitechGHub', name: 'Logitech G HUB', type: 'device-suite', group: 'device-suite', risk: 'medium' },
  { key: 'corsairIcue', name: 'Corsair iCUE', type: 'device-suite', group: 'device-suite', risk: 'medium' },
  { key: 'voicemod', name: 'Voicemod', type: 'mic-processing', group: 'mic-processing', risk: 'medium' },
  { key: 'voicemeeter', name: 'Voicemeeter', type: 'routing', group: 'virtual-routing', risk: 'high' },
  { key: 'vbCable', name: 'VB-CABLE', type: 'routing', group: 'virtual-routing', risk: 'high' }
];

export function toolInstalled(report, key) {
  const tool = report?.tools?.[key];
  if (typeof tool === 'boolean') return tool;
  return Boolean(tool?.installed);
}

export function companionEvidence(report, key) {
  const tool = report?.tools?.[key];
  return String(tool?.displayName || tool?.name || tool?.path || tool?.source || '').trim();
}

export function installedCompanions(report) {
  return knownCompanions
    .map((item) => ({
      ...item,
      installed: toolInstalled(report, item.key),
      evidence: companionEvidence(report, item.key)
    }))
    .filter((item) => item.installed);
}
