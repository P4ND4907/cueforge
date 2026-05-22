import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function appRoot() {
  return app.isPackaged ? process.resourcesPath : path.join(__dirname, '..');
}

function scriptPath() {
  return path.join(appRoot(), 'tools', 'Scan-AudioSetup.ps1');
}

function reportPath() {
  return path.join(app.getPath('userData'), 'cueforge-audio-setup-report.json');
}

async function readReport() {
  const file = reportPath();
  if (!existsSync(file)) return null;
  return JSON.parse(await readFile(file, 'utf8'));
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1320,
    height: 920,
    minWidth: 960,
    minHeight: 720,
    title: 'CueForge',
    backgroundColor: '#071112',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  win.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(permission === 'media');
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.loadFile(path.join(appRoot(), 'dist', 'index.html'));
}

ipcMain.handle('cueforge:desktop-info', () => ({
  platform: process.platform,
  reportPath: reportPath(),
  scriptPath: scriptPath(),
  packaged: app.isPackaged
}));

ipcMain.handle('cueforge:read-bridge-report', async () => readReport());

ipcMain.handle('cueforge:scan-audio-setup', async () => {
  const script = scriptPath();
  const output = reportPath();

  if (!existsSync(script)) {
    return { ok: false, error: `Missing setup scanner: ${script}` };
  }

  await mkdir(path.dirname(output), { recursive: true });

  return new Promise((resolve) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script, '-OutFile', output],
      { windowsHide: true, timeout: 20000 },
      async (error, stdout, stderr) => {
        if (error) {
          resolve({
            ok: false,
            error: stderr?.trim() || error.message,
            stdout: stdout?.trim() || ''
          });
          return;
        }

        try {
          resolve({
            ok: true,
            reportPath: output,
            stdout: stdout?.trim() || '',
            report: await readReport()
          });
        } catch (parseError) {
          resolve({
            ok: false,
            error: `Scanner ran, but the report could not be read: ${parseError.message}`,
            stdout: stdout?.trim() || ''
          });
        }
      }
    );
  });
});

ipcMain.handle('cueforge:open-bridge-folder', async () => {
  await mkdir(path.dirname(reportPath()), { recursive: true });
  await shell.openPath(path.dirname(reportPath()));
  return { ok: true, folder: path.dirname(reportPath()) };
});

app.whenReady().then(createWindow);

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
