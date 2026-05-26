export const DEVICE_ALIAS_KEY = 'cueforge-device-aliases';
export const GAME_PROFILE_KEY = 'cueforge-game-profiles';

export const defaultGameProfiles = [
  {
    id: 'tarkov-siege-cod',
    game: 'Tarkov / Siege / COD',
    sourceProfile: 'competitiveFps',
    matchHints: ['tarkov', 'escape from tarkov', 'siege', 'rainbowsix', 'call of duty', 'cod', 'modernwarfare', 'bootstrapper']
  },
  {
    id: 'valorant-cs2',
    game: 'Valorant / CS2',
    sourceProfile: 'valorant',
    matchHints: ['valorant', 'riotclientservices', 'counter-strike 2', 'counter strike 2', 'cs2']
  },
  {
    id: 'warzone-apex',
    game: 'Warzone / Apex',
    sourceProfile: 'competitiveFps',
    matchHints: ['warzone', 'apex', 'r5apex']
  },
  {
    id: 'discord-game',
    game: 'Discord + Game',
    sourceProfile: 'balanced',
    matchHints: ['discord', 'discordcanary', 'discordptb']
  }
];

function compactText(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeText(value = '') {
  return compactText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function inferRole(device = {}, role = '') {
  if (role) return role;
  const kind = normalizeText(device.kind || device.Kind || '');
  const raw = normalizeText(rawDeviceLabel(device));
  if (kind.includes('audioinput') || /mic|microphone|capture|input/.test(raw)) return 'input';
  if (kind.includes('audiooutput') || /speaker|headphone|headset|output|render|dac|iem/.test(raw)) return 'output';
  return 'device';
}

function rawDeviceLabel(device = {}) {
  return compactText(device.label || device.name || device.Name || device.FriendlyName || device.DisplayName || device.device || '');
}

function stripNoise(value = '') {
  let text = compactText(value)
    .replace(/\[[^\]]*(?:vid_|pid_|usb\\|hdaudio\\|mmdevapi)[^\]]*\]/gi, ' ')
    .replace(/\{[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\}/gi, ' ')
    .replace(/\{[0-9a-f. -]{8,}\}/gi, ' ')
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/\{[^}]{6,}\}/g, ' ')
    .replace(/\b(?:usb|hdaudio|swd|mmdevapi)\\[^\s()[\]]+/gi, ' ')
    .replace(/\b(?:device|group|instance|container|serial|pnp|machine)[-_ ]?id[:=]?\s*[a-z0-9\\&{}-]+/gi, ' ')
    .replace(/\bvid_[0-9a-f]+&pid_[0-9a-f]+\b/gi, ' ')
    .replace(/\b[0-9a-f]{16,}\b/gi, ' ')
    .replace(/#[0-9a-f]{3,}\b/gi, ' ')
    .replace(/^\s*(?:[0-9a-f]\.?){6,}\s*\.?\s*/gi, '')
    .replace(/^\s*[. -]+\s*/g, '')
    .replace(/^\s*\d+\s*[-:]\s*/g, '')
    .replace(/\bdefault\s*[-:]?\s*\d*\b/gi, ' ')
    .replace(/\(R\)/g, '')
    .replace(/[{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const pair = text.match(/^(.+?)\s*\(([^()]+)\)\s*$/);
  if (pair && pair[2] && !/^default$/i.test(pair[2])) {
    text = `${pair[1]} / ${pair[2]}`;
  }

  return compactText(text.replace(/\s*\/\s*/g, ' / '));
}

function fallbackLabel(role, index) {
  if (role === 'input') return `Microphone input ${index + 1}`;
  if (role === 'output') return `Headphone/output ${index + 1}`;
  return `Audio device ${index + 1}`;
}

function hintsFor(label, needsAlias) {
  const normalized = normalizeText(label);
  const hints = [];
  if (/mic|microphone|quadcast|solocast|yeti|wave link/.test(normalized)) hints.push('mic');
  if (/headphone|headset|speaker|arctis|cloud|g pro/.test(normalized)) hints.push('headset');
  if (/dac|iem|usb audio/.test(normalized)) hints.push('dac-output');
  if (/arctis|sonar|wireless|game|chat/.test(normalized)) hints.push('sonar-or-wireless');
  if (needsAlias) hints.push('needs-friendly-name');
  return [...new Set(hints)];
}

function shortHash(value = '') {
  let hash = 5381;
  const input = String(value || '');
  for (let index = 0; index < input.length; index += 1) {
    hash = ((hash << 5) + hash) ^ input.charCodeAt(index);
  }
  return Math.abs(hash >>> 0).toString(36).padStart(6, '0').slice(0, 8);
}

function aliasText(value = '') {
  return compactText(value)
    .replace(/[A-Z]:\\(?:[^\\\s]+\\)*[^\\\s]*/gi, '[path-hidden]')
    .replace(/\b(?:sk-[a-z0-9_-]{12,}|[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{20,})\b/gi, '[locked]')
    .slice(0, 80);
}

export function cleanAudioDeviceName(device = {}, { index = 0, role = '' } = {}) {
  const rawLabel = rawDeviceLabel(device);
  const inferredRole = inferRole(device, role);
  const cleanedLabel = stripNoise(rawLabel);
  const generic = !cleanedLabel || /^(default|communications|audioinput|audiooutput|input|output|\d+)$/i.test(cleanedLabel);
  const needsAlias = generic || /^default\s*[-:]?\s*\d*$/i.test(rawLabel);
  const displayLabel = needsAlias ? fallbackLabel(inferredRole, index) : cleanedLabel;

  return {
    deviceKey: `cfdev_${inferredRole}_${shortHash(`${device.kind || device.Kind || ''}|${rawLabel || displayLabel}|${index}`)}`,
    role: inferredRole,
    displayLabel,
    cleanedLabel: displayLabel,
    rawLabel,
    needsAlias,
    hints: hintsFor(displayLabel, needsAlias)
  };
}

export function applyDeviceAliases(devices = [], aliases = {}) {
  return (Array.isArray(devices) ? devices : []).map((device, index) => {
    const cleaned = cleanAudioDeviceName(device, { index });
    const saved = aliases?.[cleaned.deviceKey];
    const alias = typeof saved === 'string' ? aliasText(saved) : aliasText(saved?.label || '');
    return {
      ...cleaned,
      rawDevice: device,
      kind: device.kind || device.Kind || cleaned.role,
      alias,
      displayLabel: alias || cleaned.displayLabel
    };
  });
}

export function saveDeviceAlias(aliases = {}, deviceKey = '', label = '') {
  const key = compactText(deviceKey);
  if (!key) return { ...aliases };
  const next = { ...aliases };
  const cleanLabel = aliasText(label);
  if (!cleanLabel) delete next[key];
  else next[key] = { label: cleanLabel, updatedAt: new Date().toISOString() };
  return next;
}

function slug(value = '') {
  return normalizeText(value).replace(/\s+/g, '-').slice(0, 80) || `profile-${Date.now()}`;
}

function normalizeHints(hints = []) {
  return [...new Set((Array.isArray(hints) ? hints : String(hints || '').split(/[,;\n]/))
    .map((hint) => normalizeText(hint))
    .filter(Boolean))];
}

export function normalizeGameProfile(profile = {}) {
  const game = compactText(profile.game || profile.name || 'Custom game');
  const sourceProfile = compactText(profile.sourceProfile || profile.profile || 'competitiveFps');
  const editableHints = Array.isArray(profile.matchHints)
    ? profile.matchHints
    : String(profile.matchHints || '').split(/[,;\n]/);
  const matchHints = normalizeHints([
    game,
    profile.id,
    profile.process,
    profile.processName,
    ...editableHints
  ]);

  return {
    id: compactText(profile.id) || slug(game),
    game,
    sourceProfile,
    matchHints,
    updatedAt: profile.updatedAt || new Date().toISOString()
  };
}

export function mergeGameProfiles(savedProfiles = []) {
  const profiles = new Map(defaultGameProfiles.map((profile) => [profile.id, normalizeGameProfile(profile)]));
  (Array.isArray(savedProfiles) ? savedProfiles : [])
    .map(normalizeGameProfile)
    .forEach((profile) => {
      profiles.set(profile.id, {
        ...(profiles.get(profile.id) || {}),
        ...profile,
        matchHints: [...new Set([...(profiles.get(profile.id)?.matchHints || []), ...profile.matchHints])]
      });
    });
  return [...profiles.values()];
}

export function upsertGameProfile(profiles = [], profile = {}) {
  const normalized = normalizeGameProfile(profile);
  const existing = Array.isArray(profiles) ? profiles.map(normalizeGameProfile) : [];
  return [
    ...existing.filter((item) => item.id !== normalized.id),
    normalized
  ];
}

function collectGameSignals({ bridgeReport = null, processText = '' } = {}) {
  const runningGames = (Array.isArray(bridgeReport?.runningGames) ? bridgeReport.runningGames : [])
    .flatMap((game) => [game.id, game.name, game.process]);
  const sessions = (Array.isArray(bridgeReport?.sessions) ? bridgeReport.sessions : [])
    .filter((session) => session.active !== false)
    .flatMap((session) => [session.app, session.processName, session.kind]);
  return normalizeHints([...runningGames, ...sessions, processText]);
}

export function detectActiveGameProfile({ bridgeReport = null, processText = '', savedProfiles = [] } = {}) {
  const signals = collectGameSignals({ bridgeReport, processText });
  if (!signals.length) return null;
  const profiles = mergeGameProfiles(savedProfiles);

  for (const profile of profiles) {
    const match = profile.matchHints.find((hint) => (
      signals.some((signal) => signal.includes(hint) || hint.includes(signal))
    ));
    if (match) {
      return {
        ...profile,
        confidence: Array.isArray(bridgeReport?.runningGames) && bridgeReport.runningGames.length ? 95 : 72,
        reason: Array.isArray(bridgeReport?.runningGames) && bridgeReport.runningGames.length ? 'running-game' : 'process-hint',
        matchedHint: match,
        signals
      };
    }
  }

  return null;
}
