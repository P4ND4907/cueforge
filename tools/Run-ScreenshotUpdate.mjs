#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const args = parseArgs(process.argv.slice(2));
const ifNeeded = Boolean(args['if-needed'] || process.env.npm_config_if_needed);
const updateAlways = Boolean(args.force || args.update);
const port = Number(args.port || 4187);
const baseUrl = `http://127.0.0.1:${port}/`;
const outputDir = path.join(rootDir, 'docs', 'repair', 'screenshots');
const reportPath = path.join(rootDir, 'docs', 'repair', 'SCREENSHOT_SMOKE_RUN.md');

const desktopViewport = { width: 1440, height: 900, mobile: false };
const mobileViewport = { width: 390, height: 844, mobile: true };
const pages = [
  { id: 'command-center', title: 'Command Center', mode: 'simple', clicks: [], expectedText: 'Setup Command Center', viewport: desktopViewport },
  { id: 'auto-detect', title: 'Auto Detect', mode: 'simple', clicks: ['Auto Setup'], expectedText: 'Browser-only partial evidence', viewport: desktopViewport },
  { id: 'hearing', title: 'Hearing Model', mode: 'expert', clicks: ['Hearing Model'], expectedText: 'Replay-safe export status', viewport: desktopViewport },
  { id: 'blind-match', title: 'Blind Match', mode: 'expert', clicks: ['Blind Match'], expectedText: 'Replay-safe export status', viewport: desktopViewport },
  { id: 'masking-lab', title: 'Masking Lab', mode: 'expert', clicks: ['Masking Lab'], expectedText: 'Replay-safe export status', viewport: desktopViewport },
  { id: 'report-lab', title: 'Report Lab', mode: 'expert', clicks: ['Report Lab'], expectedText: 'Replay-safe export status', viewport: desktopViewport },
  { id: 'command-center-mobile', title: 'Command Center Mobile', mode: 'simple', clicks: ['Command Center'], expectedText: 'Setup Command Center', viewport: mobileViewport }
];

async function main() {
  await mkdir(outputDir, { recursive: true });
  if (!existsSync(path.join(rootDir, 'dist', 'index.html'))) {
    runChecked('npm.cmd', ['run', 'build'], 'Production build');
  }

  const preview = spawn(process.platform === 'win32' ? 'cmd.exe' : 'npm', process.platform === 'win32'
    ? ['/d', '/s', '/c', 'npm.cmd', 'run', 'preview', '--', '--host', '127.0.0.1', '--port', String(port)]
    : ['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(port)], {
    cwd: rootDir,
    stdio: ['ignore', 'ignore', 'pipe'],
    windowsHide: true
  });

  const chrome = { child: null };
  try {
    await waitForHttp(baseUrl, 15000);
    const result = await captureScreenshots(chrome);
    await writeReport(result);
    console.log(`Screenshot smoke: ${result.status}`);
    console.log(`Captured: ${result.captured}/${pages.length}`);
    console.log(`Report: ${path.relative(rootDir, reportPath)}`);
    if (result.status !== 'PASS') process.exit(1);
  } finally {
    killProcessTree(chrome.child);
    killProcessTree(preview);
  }
}

async function captureScreenshots(chrome) {
  const debugPort = 45000 + Math.floor(Math.random() * 8000);
  const profileDir = await mkdtemp(path.join(os.tmpdir(), 'cueforge-screenshot-'));
  const chromePath = findChrome();
  chrome.child = spawn(chromePath, [
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-features=AutofillServerCommunication',
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    '--autoplay-policy=no-user-gesture-required',
    '--mute-audio',
    '--headless=new',
    '--window-size=1440,900',
    'about:blank'
  ], {
    stdio: ['ignore', 'ignore', 'pipe'],
    windowsHide: true
  });

  const logs = [];
  chrome.child.stderr.on('data', (chunk) => {
    const text = String(chunk).trim();
    if (text && !/DevTools listening|USB|GCM|Autofill|Variations/i.test(text)) logs.push(text);
  });

  await waitForCdp(debugPort);
  const target = await cdpHttp(debugPort, `/json/new?${encodeURIComponent(`${baseUrl}?qa=screenshot-smoke`)}`, { method: 'PUT' });
  const cdp = await CdpSession.connect(target.webSocketDebuggerUrl);
  cdp.onLog = (entry) => logs.push(entry);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');
  await setViewport(cdp, desktopViewport);
  await waitForReady(cdp);
  await primeStorage(cdp, 'simple');
  await cdp.send('Page.reload', { ignoreCache: true });
  await waitForReady(cdp);

  const captures = [];
  for (const page of pages) {
    await setViewport(cdp, page.viewport || desktopViewport);
    await setMode(cdp, page.mode || 'simple');
    if (page.clicks.length) {
      const clickResult = await clickAny(cdp, page.clicks);
      if (!clickResult.ok) {
        captures.push({
          ...page,
          file: '',
          captured: false,
          health: {
            blank: false,
            overlay: false,
            horizontalOverflow: false,
            expectedTextFound: false,
            bodyLength: 0,
            h1: ''
          },
          clickFailure: `Could not open ${page.title} with labels: ${page.clicks.join(' / ')}`
        });
        continue;
      }
    }
    await wait(500);
    const health = await evaluatePageHealth(cdp, page.expectedText);
    const filePath = path.join(outputDir, `${page.id}.png`);
    const shouldCapture = updateAlways || !ifNeeded || !existsSync(filePath);
    if (shouldCapture) {
      const shot = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
      await writeFile(filePath, Buffer.from(shot.data, 'base64'));
    }
    captures.push({
      ...page,
      file: path.relative(rootDir, filePath),
      captured: shouldCapture,
      health
    });
  }
  cdp.close();

  const failures = captures.flatMap((item) => {
    const pageFailures = [];
    if (item.clickFailure) pageFailures.push(item.clickFailure);
    if (item.health.blank) pageFailures.push(`${item.title}: blank page`);
    if (item.health.overlay) pageFailures.push(`${item.title}: runtime overlay`);
    if (item.health.horizontalOverflow) pageFailures.push(`${item.title}: horizontal overflow`);
    if (item.expectedText && !item.health.expectedTextFound) pageFailures.push(`${item.title}: expected text missing (${item.expectedText})`);
    return pageFailures;
  });
  const runtimeErrors = logs.filter((entry) => /error|exception|failed/i.test(entry)).slice(0, 8);

  return {
    status: failures.length || runtimeErrors.length ? 'FAIL' : 'PASS',
    captured: captures.filter((item) => item.file && (item.captured || existsSync(path.join(rootDir, item.file)))).length,
    pages: captures,
    failures,
    runtimeErrors
  };
}

async function evaluatePageHealth(cdp, expectedText = '') {
  return await evalPage(cdp, (expected) => {
    const root = document.querySelector('#root');
    const bodyText = document.body.textContent || '';
    const overflowers = [...document.querySelectorAll('body *')]
      .filter((element) => element.scrollWidth > element.clientWidth + 2 && element.clientWidth > 0)
      .slice(0, 8)
      .map((element) => ({
        tag: element.tagName,
        text: (element.textContent || '').trim().slice(0, 80),
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth
      }));

    return {
      title: document.title,
      h1: document.querySelector('h1')?.textContent?.trim() || '',
      expectedTextFound: expected ? bodyText.includes(expected) : true,
      bodyLength: bodyText.length,
      rootChildren: root?.children?.length || 0,
      blank: !root?.children?.length || bodyText.length < 250,
      overlay: Boolean(document.querySelector('vite-error-overlay, .vite-error-overlay, [data-vite-error]')) ||
        /(?:error overlay|internal server error|uncaught runtime error|stack trace)/i.test(bodyText),
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
      overflowers
    };
  }, expectedText);
}

async function setViewport(cdp, viewport) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: Boolean(viewport.mobile)
  });
}

async function primeStorage(cdp, mode) {
  await evalPage(cdp, (interfaceMode) => {
    localStorage.setItem('cueforge-setup-complete', 'yes');
    localStorage.setItem('cueforge-user-settings', JSON.stringify({
      interfaceMode,
      quietMode: true,
      backgroundAudio: false,
      cinematicVideoAudio: false,
      uiNotesEnabled: true,
      desktopBridgeHints: true
    }));
  }, mode);
}

async function setMode(cdp, mode) {
  const current = await evalPage(cdp, () => {
    try {
      return JSON.parse(localStorage.getItem('cueforge-user-settings') || '{}')?.interfaceMode || 'simple';
    } catch {
      return 'simple';
    }
  });
  if (current === mode) return;
  await primeStorage(cdp, mode);
  await cdp.send('Page.reload', { ignoreCache: true });
  await waitForReady(cdp);
}

async function clickAny(cdp, labels) {
  for (const label of labels) {
    const result = await evalPage(cdp, (wanted) => {
      const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
      const target = normalize(wanted);
      const controls = [...document.querySelectorAll('button, a, [role="button"]')];
      const control = controls.find((item) => {
        const text = normalize(item.textContent || item.getAttribute('aria-label') || item.title);
        return text === target || text.includes(target);
      });
      if (!control) return { ok: false, label: wanted };
      control.scrollIntoView({ block: 'center', inline: 'center' });
      control.click();
      return { ok: true, label: wanted };
    }, label);
    await wait(250);
    if (result.ok) return result;
  }
  return { ok: false, label: labels.join(' / ') };
}

async function waitForReady(cdp) {
  for (let index = 0; index < 80; index += 1) {
    const ready = await evalPage(cdp, () => ({
      rootChildren: document.querySelector('#root')?.children?.length || 0,
      text: document.body.textContent || ''
    })).catch(() => ({ rootChildren: 0, text: '' }));
    if (ready.rootChildren > 0 && /CueForge/i.test(ready.text)) return;
    await wait(150);
  }
  throw new Error('CueForge UI did not become ready.');
}

async function evalPage(cdp, pageFunction, ...args) {
  const expression = `(${pageFunction.toString()})(...${JSON.stringify(args)})`;
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || result.exceptionDetails.exception?.description || 'Evaluation failed.');
  return result.result?.value;
}

async function writeReport(result) {
  const lines = [
    '# Screenshot Smoke Run',
    '',
    `Status: ${result.status}`,
    `Captured or verified: ${result.captured}/${pages.length}`,
    '',
    '| Page | File | Captured | Viewport | H1 | Expected Text | Body | Overflow |',
    '| --- | --- | --- | --- | --- | --- | ---: | --- |',
    ...result.pages.map((page) => `| ${page.title} | ${page.file ? `\`${page.file}\`` : 'not captured'} | ${page.captured ? 'yes' : page.file ? 'existing' : 'no'} | ${page.viewport?.width || '?'}x${page.viewport?.height || '?'} | ${page.health.h1 || 'none'} | ${page.health.expectedTextFound ? 'yes' : 'no'} | ${page.health.bodyLength} | ${page.health.horizontalOverflow ? 'yes' : 'no'} |`),
    '',
    '## Failures',
    ...(result.failures.length ? result.failures.map((item) => `- ${item}`) : ['- none']),
    '',
    '## Runtime Errors',
    ...(result.runtimeErrors.length ? result.runtimeErrors.map((item) => `- ${item}`) : ['- none'])
  ];
  await writeFile(reportPath, lines.join('\n'), 'utf8');
}

function runChecked(command, args, label) {
  const result = spawnSync(process.platform === 'win32' ? 'cmd.exe' : command, process.platform === 'win32'
    ? ['/d', '/s', '/c', command, ...args]
    : args, {
    cwd: rootDir,
    stdio: 'inherit',
    shell: false
  });
  if (result.status !== 0) throw new Error(`${label} failed.`);
}

async function waitForHttp(url, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // keep waiting
    }
    await wait(200);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function waitForCdp(port) {
  for (let index = 0; index < 80; index += 1) {
    try {
      await cdpHttp(port, '/json/version');
      return;
    } catch {
      await wait(100);
    }
  }
  throw new Error('Chrome DevTools Protocol did not start.');
}

async function cdpHttp(port, endpoint, options = {}) {
  const response = await fetch(`http://127.0.0.1:${port}${endpoint}`, options);
  if (!response.ok) throw new Error(`CDP HTTP ${response.status}: ${endpoint}`);
  return response.json();
}

function findChrome() {
  const candidates = process.platform === 'win32'
    ? [
        path.join(process.env.ProgramFiles || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(process.env['ProgramFiles(x86)'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(process.env.ProgramFiles || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
        path.join(process.env['ProgramFiles(x86)'] || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe')
      ]
    : [
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
      ];
  const found = candidates.find((candidate) => candidate && existsSync(candidate));
  if (!found) throw new Error('Chrome, Chromium, or Edge was not found for screenshot smoke.');
  return found;
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) continue;
    const [key, inlineValue] = arg.slice(2).split('=');
    parsed[key] = inlineValue ?? true;
  }
  return parsed;
}

function killProcessTree(child) {
  if (!child?.pid) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill.exe', ['/pid', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true
    });
    return;
  }
  try {
    child.kill('SIGTERM');
  } catch {
    // Already closed.
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class CdpSession {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.handlers = new Map();
    socket.addEventListener('message', (event) => this.handleMessage(event));
  }

  static async connect(url) {
    const socket = new WebSocket(url);
    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true });
      socket.addEventListener('error', reject, { once: true });
    });
    return new CdpSession(socket);
  }

  send(method, params = {}) {
    const id = this.nextId++;
    this.socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (!this.pending.has(id)) return;
        this.pending.delete(id);
        reject(new Error(`CDP timeout: ${method}`));
      }, 10000);
      timeout.unref?.();
      this.pending.set(id, { resolve, reject, timeout });
    });
  }

  handleMessage(event) {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(message.params?.type)) {
      this.onLog?.(message.params.args?.map((arg) => arg.value || arg.description || '').join(' '));
    }
    if (message.method === 'Runtime.exceptionThrown') {
      this.onLog?.(`Runtime exception: ${message.params?.exceptionDetails?.text || 'unknown'}`);
    }
    if (message.method === 'Log.entryAdded' && ['error', 'warning'].includes(message.params?.entry?.level)) {
      this.onLog?.(message.params.entry.text);
    }
    if (!message.id || !this.pending.has(message.id)) return;
    const { resolve, reject, timeout } = this.pending.get(message.id);
    this.pending.delete(message.id);
    clearTimeout(timeout);
    message.error ? reject(new Error(message.error.message)) : resolve(message.result || {});
  }

  close() {
    try {
      this.socket.close();
    } catch {
      // Already closed.
    }
  }
}

await main();
