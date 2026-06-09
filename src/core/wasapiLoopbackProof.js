export const LOOPBACK_PROOF_SCHEMA = 'cueforge.wasapi-loopback-proof.v1';

const STATUS_COPY = {
  available: {
    reason: 'Endpoint loopback capability can be checked later from this desktop build.',
    nextAction: 'Use this as endpoint proof, then run one match test before trusting changes.'
  },
  unavailable: {
    reason: 'Endpoint loopback capability was not available from the current desktop scan.',
    nextAction: 'Run the Windows scan again or confirm the default output endpoint.'
  },
  blocked: {
    reason: 'Endpoint loopback proof is blocked by permission, helper access, or desktop scan state.',
    nextAction: 'Check desktop helper permission, run the Windows scan, then retry loopback proof.'
  },
  unsupported: {
    reason: 'This Windows/device path does not expose endpoint loopback proof in alpha.6.',
    nextAction: 'Use scan, game settings, Sound Match, and match feedback until native proof is supported.'
  },
  'not-run': {
    reason: 'WASAPI endpoint loopback proof has not run yet.',
    nextAction: 'Run the Windows scan from the desktop build to check endpoint loopback proof.'
  }
};

const SAFETY_BOUNDARY = [
  'No capture starts automatically.',
  'No raw audio is stored.',
  'No protected playback bypass is attempted.',
  'No Windows routing, driver, APO, or system setting is modified.'
];

function cleanText(value, fallback = '') {
  const text = String(value || fallback)
    .replace(/[A-Z]:\\(?:[^\\\s]+\\)*[^\\\s]*/gi, '[path-hidden]')
    .replace(/\b(?:device|group|instance|container|serial|pnp|machine|endpoint)[-_ ]?id[:=]?\s*[a-z0-9\\&{}.-]+/gi, '[id-hidden]')
    .replace(/\s+/g, ' ')
    .trim();
  return text || fallback;
}

function normalizeStatus(status) {
  return Object.prototype.hasOwnProperty.call(STATUS_COPY, status) ? status : 'not-run';
}

function hashEndpoint(value) {
  const text = String(value || 'unknown-endpoint');
  let hash = 0x811c9dc5;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  const first = (hash >>> 0).toString(16).padStart(8, '0');
  let secondHash = 0x811c9dc5 ^ text.length;
  for (let index = text.length - 1; index >= 0; index -= 1) {
    secondHash ^= text.charCodeAt(index);
    secondHash = Math.imul(secondHash, 0x01000193);
  }
  const second = (secondHash >>> 0).toString(16).padStart(8, '0');

  return `ep_${`${first}${second}`.slice(0, 12)}`;
}

function rawEndpointSeed(endpoint = {}) {
  return [
    endpoint.id,
    endpoint.deviceId,
    endpoint.endpointId,
    endpoint.instanceId,
    endpoint.devicePath,
    endpoint.path,
    endpoint.label,
    endpoint.name,
    endpoint.Name,
    endpoint.FriendlyName
  ].filter(Boolean).join('|');
}

function endpointLabel(endpoint = {}, fallback = 'Endpoint not confirmed') {
  return cleanText(
    endpoint.label ||
    endpoint.name ||
    endpoint.Name ||
    endpoint.FriendlyName ||
    endpoint.displayLabel ||
    fallback,
    fallback
  );
}

function labelsMatch(left, right) {
  const a = cleanText(left).toLowerCase();
  const b = cleanText(right).toLowerCase();
  return Boolean(a && b && a === b);
}

export function buildWasapiLoopbackProof({
  status = 'not-run',
  endpoint = null,
  endpointLabel: explicitEndpointLabel = null,
  endpointHash: explicitEndpointHash = null,
  defaultRender = null,
  defaultRenderMatchesScan = null,
  permissionRequired = false,
  reason = null,
  nextAction = null,
  checkedAt = null
} = {}) {
  const normalizedStatus = normalizeStatus(status);
  const copy = STATUS_COPY[normalizedStatus];
  const label = endpoint
    ? endpointLabel(endpoint)
    : cleanText(explicitEndpointLabel, normalizedStatus === 'not-run' ? 'Endpoint not checked' : 'Endpoint not confirmed');
  const seed = endpoint ? rawEndpointSeed(endpoint) : explicitEndpointLabel || label;
  const hasEndpoint = Boolean(endpoint || explicitEndpointLabel || explicitEndpointHash);
  const safeHash = explicitEndpointHash && /^ep_[a-f0-9]{12}$/i.test(explicitEndpointHash)
    ? explicitEndpointHash.toLowerCase()
    : hasEndpoint
      ? hashEndpoint(seed)
      : null;

  return {
    schema: LOOPBACK_PROOF_SCHEMA,
    status: normalizedStatus,
    mode: 'endpoint-loopback',
    endpointLabel: label,
    endpointHash: safeHash,
    defaultRenderMatchesScan: typeof defaultRenderMatchesScan === 'boolean'
      ? defaultRenderMatchesScan
      : defaultRender
        ? labelsMatch(label, defaultRender)
        : null,
    permissionRequired: Boolean(permissionRequired || normalizedStatus === 'blocked'),
    protectedPlaybackBoundary: true,
    canRecord: false,
    rawAudioStored: false,
    reason: cleanText(reason, copy.reason),
    nextAction: cleanText(nextAction, copy.nextAction),
    checkedAt: checkedAt || null,
    safety: SAFETY_BOUNDARY
  };
}

export function summarizeWasapiLoopbackProof(proof = {}) {
  const status = normalizeStatus(proof.status);
  const label = cleanText(proof.endpointLabel, 'endpoint not confirmed');
  if (status === 'available') {
    return `WASAPI loopback proof available for ${label}. No recording is enabled in alpha.6.`;
  }
  if (status === 'not-run') {
    return 'WASAPI loopback proof not run. Use the desktop Windows scan to check endpoint capability.';
  }
  return `WASAPI loopback proof ${status}: ${cleanText(proof.reason, STATUS_COPY[status].reason)}`;
}
