import { test, expect, _electron as electron } from '@playwright/test';
import path from 'node:path';

const rootDir = process.cwd();

test('CueForge desktop bridge smoke', async () => {
  const app = await electron.launch({
    args: [path.join(rootDir, 'electron', 'main.mjs')],
    cwd: rootDir
  });

  try {
    const window = await app.firstWindow();
    const consoleErrors = [];
    window.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    await window.waitForLoadState('domcontentloaded');
    await expect(window.getByRole('heading', { name: /Setup Command Center|Audio Command Center/ }).first()).toBeVisible();

    const desktopInfo = await window.evaluate(async () => {
      const bridge = window.cueforgeDesktop;
      if (!bridge) return null;
      return bridge.getDesktopInfo?.() ?? bridge.info?.();
    });
    const bridgeKeys = await window.evaluate(() => Object.keys(window.cueforgeDesktop || {}).sort());

    expect(desktopInfo?.platform).toBeTruthy();
    expect(String(desktopInfo?.reportPath || '').toLowerCase()).toContain('cueforge');
    expect(String(desktopInfo?.scriptPath || '')).toContain('Scan-AudioSetup.ps1');
    expect(bridgeKeys).toEqual([
      'getDesktopInfo',
      'info',
      'isDesktop',
      'openApoDraftFolder',
      'openBridgeFolder',
      'readBridgeReport',
      'saveApoDraft',
      'scanAudioSetup'
    ]);
    expect(consoleErrors).toEqual([]);
  } finally {
    await app.close();
  }
});
