export const electronContentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' http://127.0.0.1:* ws://127.0.0.1:*",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'"
].join('; ');

export const electronSecurityPolicy = {
  schema: 'cueforge.electron-security-policy.v1',
  webPreferences: {
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
    webSecurity: true,
    allowRunningInsecureContent: false
  },
  ipc: {
    validateSender: true,
    declaredChannelsOnly: true
  },
  navigation: {
    localOnlyAppContent: true,
    externalLinksRequireHttps: true
  },
  permissions: {
    mediaOnlyForAppWindow: true
  },
  contentSecurityPolicy: electronContentSecurityPolicy
};

export function getSecureWebPreferences(preload) {
  return {
    ...electronSecurityPolicy.webPreferences,
    preload
  };
}

export function isTrustedCueForgeUrl(rawUrl = '') {
  try {
    const url = new URL(String(rawUrl || ''));
    if (url.protocol === 'file:') return true;
    if (url.protocol === 'app:' && url.hostname === 'cueforge') return true;
    if ((url.protocol === 'http:' || url.protocol === 'https:') && ['127.0.0.1', 'localhost', '::1'].includes(url.hostname)) return true;
    return false;
  } catch {
    return false;
  }
}

export function isSafeExternalUrl(rawUrl = '') {
  try {
    const url = new URL(String(rawUrl || ''));
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function validateIpcSender(event) {
  const senderUrl = event?.senderFrame?.url || event?.sender?.getURL?.() || '';
  return isTrustedCueForgeUrl(senderUrl);
}
