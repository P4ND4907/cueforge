const LOCAL_WEB_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

export function shouldFetchGeneratedBridgeReport(locationLike = globalThis.location) {
  const protocol = String(locationLike?.protocol || '').toLowerCase();
  if (protocol === 'file:') return false;
  if (!protocol.startsWith('http')) return false;

  const hostname = String(locationLike?.hostname || '').toLowerCase();
  return LOCAL_WEB_HOSTS.has(hostname);
}
