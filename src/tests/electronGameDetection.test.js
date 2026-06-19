import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const electronMain = readFileSync(join(root, 'electron', 'main.mjs'), 'utf8');
const preload = readFileSync(join(root, 'electron', 'preload.cjs'), 'utf8');

describe('electron game detection bridge', () => {
  it('exposes a namespaced detectGame helper without exposing raw ipcRenderer', () => {
    expect(preload).toContain("contextBridge.exposeInMainWorld('cueforgeDesktop'");
    expect(preload).toContain("detectGame: () => ipcRenderer.invoke('cueforge:detect-game')");
    expect(preload).not.toContain("exposeInMainWorld('electronAPI'");
    expect(preload).not.toContain("exposeInMainWorld('ipcRenderer'");
    expect(preload).not.toContain('sendSync');
  });

  it('handles game detection through trusted CueForge IPC only', () => {
    expect(electronMain).toContain("ipcMain.handle('cueforge:detect-game', trustedIpc");
    expect(electronMain).toContain('detectRunningGame');
    expect(electronMain).not.toContain("ipcMain.handle('detect-game'");
  });
});
