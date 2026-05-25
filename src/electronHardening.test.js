import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const electronMain = readFileSync(join(process.cwd(), 'electron', 'main.mjs'), 'utf8');

describe('electron hardening wiring', () => {
  it('uses the shared security policy in the actual desktop shell', () => {
    expect(electronMain).toContain('app.enableSandbox()');
    expect(electronMain).toContain('getSecureWebPreferences');
    expect(electronMain).toContain('Content-Security-Policy');
    expect(electronMain).toContain('setPermissionRequestHandler');
    expect(electronMain).toContain('setWindowOpenHandler');
    expect(electronMain).toContain('will-navigate');
  });

  it('wraps desktop IPC handlers with sender validation', () => {
    const ipcHandlers = [...electronMain.matchAll(/ipcMain\.handle\('cueforge:/g)].length;
    const trustedHandlers = [...electronMain.matchAll(/ipcMain\.handle\('cueforge:[^']+', trustedIpc/g)].length;

    expect(electronMain).toContain('validateIpcSender');
    expect(electronMain).toContain('Blocked untrusted CueForge desktop IPC sender.');
    expect(ipcHandlers).toBeGreaterThan(0);
    expect(trustedHandlers).toBe(ipcHandlers);
  });
});
