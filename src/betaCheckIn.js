export function createTesterId(random = Math.random) {
  const value = Math.floor(random() * Number.MAX_SAFE_INTEGER).toString(36);
  return `cf-${value.padStart(10, '0').slice(0, 10)}`;
}

export function createBetaCheckIn({ testerId, handle = '', game = '', gear = '', source = 'manual', now = new Date() }) {
  const checkedAt = now.toISOString();
  const cleanHandle = String(handle || '').trim().slice(0, 48);
  const cleanGame = String(game || '').trim().slice(0, 80);
  const cleanGear = String(gear || '').trim().slice(0, 140);
  const proof = buildProofCode({ testerId, checkedAt, game: cleanGame, gear: cleanGear });

  return {
    schema: 'cueforge.beta-checkin.v1',
    testerId,
    checkedAt,
    handle: cleanHandle,
    game: cleanGame,
    gear: cleanGear,
    source,
    proof
  };
}

export function summarizeBetaActivity(checkIns = []) {
  const sorted = [...checkIns].sort((a, b) => String(a.checkedAt).localeCompare(String(b.checkedAt)));
  const uniqueDays = new Set(sorted.map((item) => String(item.checkedAt || '').slice(0, 10))).size;
  return {
    totalCheckIns: sorted.length,
    uniqueDays,
    firstSeen: sorted[0]?.checkedAt || null,
    lastSeen: sorted[sorted.length - 1]?.checkedAt || null,
    latestGame: sorted[sorted.length - 1]?.game || '',
    latestGear: sorted[sorted.length - 1]?.gear || ''
  };
}

export function buildBetaTesterPacket({ testerId, checkIns, notes = '', now = new Date() }) {
  const summary = summarizeBetaActivity(checkIns);
  return {
    schema: 'cueforge.beta-tester-packet.v1',
    exportedAt: now.toISOString(),
    testerId,
    summary,
    checkIns,
    notes: String(notes || '').trim().slice(0, 600),
    privacy: {
      containsPassword: false,
      containsPhone: false,
      containsDob: false,
      containsRawDeviceIds: false
    }
  };
}

function buildProofCode({ testerId, checkedAt, game, gear }) {
  const input = `${testerId}|${checkedAt.slice(0, 10)}|${game}|${gear}`;
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `proof-${(hash >>> 0).toString(36).padStart(7, '0')}`;
}
