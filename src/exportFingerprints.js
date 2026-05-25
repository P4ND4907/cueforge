const DEFAULT_NAMESPACE = 'cueforge.export-fingerprint.v1';

export function buildExportFingerprint(value, { namespace = DEFAULT_NAMESPACE, length = 20 } = {}) {
  const canonical = stableStringify(value);
  return `cfp_${sha256Hex(`${namespace}:${canonical}`).slice(0, length)}`;
}

export function buildDeviceExportFingerprint(device = {}) {
  return buildExportFingerprint({
    kind: device.kind || device.type || device.role || 'audio',
    label: device.label || device.name || device.Name || '',
    id: device.deviceId || device.DeviceID || device.id || '',
    group: device.groupId || device.GroupID || '',
    source: device.source || device.Source || 'unknown'
  }, { namespace: `${DEFAULT_NAMESPACE}:device` });
}

export function buildRouteExportFingerprint(route = {}) {
  return buildExportFingerprint({
    from: route.from || route.input || route.source || '',
    to: route.to || route.output || route.target || '',
    relation: route.relation || route.type || '',
    processor: route.processor || route.companion || ''
  }, { namespace: `${DEFAULT_NAMESPACE}:route` });
}

export function buildStateExportFingerprints(state = {}) {
  const devices = [
    state.devices?.output,
    state.devices?.input,
    ...(state.devices?.suspectedHardware || [])
  ].filter(Boolean);

  const routes = [
    ...(state.chainGraph?.edges || []),
    ...(state.chain?.activeCompanions || []).map((companion) => ({ processor: companion.name || companion.label || companion })),
    ...(state.chain?.virtualDevices || []).map((device) => ({ processor: device.name || device.label || device }))
  ];

  return {
    schema: 'cueforge.export-fingerprints.v1',
    deviceFingerprints: devices.map((device) => buildDeviceExportFingerprint(typeof device === 'string' ? { label: device } : device)),
    routeFingerprints: routes.map((route) => buildRouteExportFingerprint(route)),
    note: 'Fingerprints are stable hashes for correlation. Raw device IDs, group IDs, paths, and account data stay out of exports.'
  };
}

function stableStringify(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value !== 'object') return JSON.stringify(String(value));
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

function sha256Hex(input) {
  const ascii = toUtf8Binary(String(input));
  const maxWord = 2 ** 32;
  const words = [];
  const hash = [];
  const k = [];
  let primeCounter = 0;

  for (let candidate = 2; primeCounter < 64; candidate += 1) {
    if (!isPrime(candidate)) continue;
    if (primeCounter < 8) hash[primeCounter] = (Math.sqrt(candidate) * maxWord) | 0;
    k[primeCounter] = (Math.cbrt(candidate) * maxWord) | 0;
    primeCounter += 1;
  }

  for (let i = 0; i < ascii.length; i += 1) {
    words[i >> 2] |= ascii.charCodeAt(i) << ((3 - i) % 4) * 8;
  }

  const bitLength = ascii.length * 8;
  words[bitLength >> 5] |= 0x80 << (24 - bitLength % 32);
  words[(((bitLength + 64) >> 9) << 4) + 15] = bitLength;

  for (let j = 0; j < words.length; j += 16) {
    const w = words.slice(j, j + 16);
    const oldHash = hash.slice(0);

    for (let i = 0; i < 64; i += 1) {
      const w15 = w[i - 15];
      const w2 = w[i - 2];
      const a = hash[0];
      const e = hash[4];
      const temp1 = hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ ((~e) & hash[6])) +
        k[i] +
        (w[i] = i < 16 ? w[i] : (
          w[i - 16] +
          (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
          w[i - 7] +
          (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
        ) | 0);
      const temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

      hash.pop();
      hash.unshift((temp1 + temp2) | 0);
      hash[4] = (hash[4] + temp1) | 0;
    }

    for (let i = 0; i < 8; i += 1) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  return hash.map((value) => ((value < 0 ? value + maxWord : value).toString(16).padStart(8, '0'))).join('');
}

function rightRotate(value, amount) {
  return (value >>> amount) | (value << (32 - amount));
}

function isPrime(value) {
  for (let factor = 2; factor * factor <= value; factor += 1) {
    if (value % factor === 0) return false;
  }
  return true;
}

function toUtf8Binary(value) {
  return encodeURIComponent(value).replace(/%([0-9A-F]{2})/g, (_match, code) => String.fromCharCode(parseInt(code, 16)));
}
