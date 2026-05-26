import { describe, expect, it } from 'vitest';
import {
  declaredNativeCapabilities,
  evaluateSecurityPrivacyGate,
  hearingSafetyCopy,
  securityPrivacyCriteria
} from './securityPrivacyGate.js';
import {
  electronContentSecurityPolicy,
  electronSecurityPolicy,
  isSafeExternalUrl,
  isTrustedCueForgeUrl,
  validateIpcSender
} from './security/electronPolicy.js';

describe('security and privacy release gate', () => {
  it('passes the default local-first release criteria', () => {
    const result = evaluateSecurityPrivacyGate({
      nativeManifest: {
        manifestVersion: 'cueforge.native.v1',
        capabilities: Object.fromEntries(declaredNativeCapabilities.map((key) => [key, key === 'canModifySystemState' ? false : true]))
      }
    });

    expect(result.status).toBe('pass');
    expect(result.criteria.map((item) => item.id)).toEqual(securityPrivacyCriteria.map((item) => item.id));
    expect(result.audit.status).toBe('pass');
    expect(result.failedChecks).toEqual([]);
    expect(result.checks.find((item) => item.id === 'protected-playback-boundary').status).toBe('pass');
  });

  it('fails if native capabilities are undeclared or system modification is claimed', () => {
    const result = evaluateSecurityPrivacyGate({
      nativeManifest: {
        manifestVersion: 'cueforge.native.v1',
        capabilities: {
          canReadDefaults: true,
          canModifySystemState: true
        }
      }
    });

    expect(result.status).toBe('fail');
    expect(result.failedChecks).toContain('native-manifest-contract');
  });

  it('keeps hearing copy out of medical territory', () => {
    expect(hearingSafetyCopy).toMatch(/not a medical hearing test/i);

    const result = evaluateSecurityPrivacyGate({ hearingCopy: 'Certified clinical diagnosis mode.' });
    expect(result.status).toBe('fail');
    expect(result.failedChecks).toContain('hearing-not-medical');
  });

  it('codifies Electron security defaults and trusted sender checks', () => {
    expect(electronSecurityPolicy.webPreferences).toMatchObject({
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false
    });
    expect(electronSecurityPolicy.ipc.validateSender).toBe(true);
    expect(electronContentSecurityPolicy).toContain("object-src 'none'");
    expect(electronContentSecurityPolicy).not.toMatch(/connect-src[^;]*https:/i);

    expect(isTrustedCueForgeUrl('file:///C:/app/dist/index.html')).toBe(true);
    expect(isTrustedCueForgeUrl('http://127.0.0.1:5177')).toBe(true);
    expect(isTrustedCueForgeUrl('https://evil.example/app')).toBe(false);
    expect(isSafeExternalUrl('https://github.com/P4ND4907/cueforge')).toBe(true);
    expect(isSafeExternalUrl('javascript:alert(1)')).toBe(false);
    expect(validateIpcSender({ senderFrame: { url: 'file:///C:/app/dist/index.html' } })).toBe(true);
    expect(validateIpcSender({ senderFrame: { url: 'https://evil.example/app' } })).toBe(false);
  });
});
