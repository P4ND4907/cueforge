export const gameplaySaveDefaults = {
  enabled: true,
  performanceMode: true,
  intervalSeconds: 30,
  maxSnapshots: 12
};

export function normalizeGameplaySaveSettings(settings = {}) {
  const interval = Number(settings.intervalSeconds ?? gameplaySaveDefaults.intervalSeconds);
  const maxSnapshots = Number(settings.maxSnapshots ?? gameplaySaveDefaults.maxSnapshots);
  return {
    enabled: settings.enabled !== false,
    performanceMode: settings.performanceMode !== false,
    intervalSeconds: clampNumber(interval, 10, 300),
    maxSnapshots: clampNumber(maxSnapshots, 3, 30)
  };
}

export function createGameplaySnapshot({ eq, selectedGame, selectedSourceProfile, betaSummary, now = new Date() }) {
  return {
    schema: 'cueforge.gameplay-save.v1',
    savedAt: now.toISOString(),
    eq: Array.isArray(eq) ? eq.map((gain) => Number(gain.toFixed(2))) : [],
    selectedGame: String(selectedGame || ''),
    selectedSourceProfile: String(selectedSourceProfile || ''),
    betaSummary: betaSummary || null
  };
}

export function appendGameplaySnapshot(snapshots = [], snapshot, maxSnapshots = gameplaySaveDefaults.maxSnapshots) {
  const max = clampNumber(maxSnapshots, 3, 30);
  return [...snapshots, snapshot].slice(-max);
}

export function shouldSaveGameplaySnapshot({ lastSavedAt, now = Date.now(), intervalSeconds = gameplaySaveDefaults.intervalSeconds }) {
  if (!lastSavedAt) return true;
  const intervalMs = clampNumber(intervalSeconds, 10, 300) * 1000;
  return now - lastSavedAt >= intervalMs;
}

function clampNumber(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
}
