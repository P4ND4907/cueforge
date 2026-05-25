#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  formatVirtualMachinePlayerLabMarkdown,
  runVirtualMachinePlayerLab
} from '../src/virtualMachinePlayerLab.js';

const rootDir = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const repairDir = path.join(rootDir, 'docs', 'repair');
const args = parseArgs(process.argv.slice(2));
const count = Math.max(1, Number(args.count || 25));
const seed = Number(args.seed || 907);
const featureDepth = Math.max(6, Number(args.featureDepth || 9));
const desktopSmokeEnabled = args.desktopSmoke !== 'false' && args['desktop-smoke'] !== 'false' && !args.noDesktopSmoke;

async function main() {
  await mkdir(repairDir, { recursive: true });

  console.log(`Virtual machine player lab: ${count} clean-machine player(s), feature depth ${featureDepth}.`);
  const desktopSmoke = desktopSmokeEnabled
    ? await runPackagedDesktopSmoke()
    : { status: 'not-run', detail: 'Packaged desktop smoke disabled by CLI flag.' };

  const lab = runVirtualMachinePlayerLab({
    count,
    seed,
    featureDepth,
    desktopSmoke
  });

  const resultsPath = path.join(repairDir, 'cueforge-vm-player-lab-results.json');
  const notesPath = path.join(repairDir, 'cueforge-vm-player-lab-ui-feedback-notes.json');
  const reportPath = path.join(repairDir, 'VIRTUAL_MACHINE_PLAYER_LAB.md');

  await writeFile(resultsPath, JSON.stringify(lab, null, 2), 'utf8');
  await writeFile(notesPath, JSON.stringify(lab.notes, null, 2), 'utf8');
  await writeFile(reportPath, formatVirtualMachinePlayerLabMarkdown(lab), 'utf8');

  console.log(`Desktop smoke: ${desktopSmoke.status} - ${desktopSmoke.detail}`);
  console.log(`Steps: ${lab.summary.stepRuns}; pass/warn/fail ${lab.summary.pass}/${lab.summary.warn}/${lab.summary.fail}`);
  console.log(`Panda Notes: ${lab.summary.notes}`);
  console.log(`Diagnosis accuracy: ${(lab.summary.diagnosisAccuracy * 100).toFixed(1)}%`);
  console.log(`Improvement rate: ${(lab.summary.improvementRate * 100).toFixed(1)}%`);
  console.log(`Harm rate: ${(lab.summary.harmRate * 100).toFixed(2)}%`);
  console.log(`Report: ${path.relative(rootDir, reportPath)}`);
  console.log(`Notes: ${path.relative(rootDir, notesPath)}`);

  if (desktopSmoke.status === 'fail' || lab.summary.fail > 0 || lab.summary.privacyFailureRate > 0) {
    process.exit(2);
  }
}

async function runPackagedDesktopSmoke() {
  const exe = path.join(rootDir, 'release', 'win-unpacked', process.platform === 'win32' ? 'CueForge.exe' : 'CueForge');
  if (!existsSync(exe)) {
    return {
      status: 'blocked',
      detail: 'release/win-unpacked/CueForge.exe is missing. Run npm run desktop:dir before the VM player lab.'
    };
  }

  const port = 47000 + Math.floor(Math.random() * 9000);
  const profileDir = await mkdtemp(path.join(os.tmpdir(), 'cueforge-desktop-smoke-'));
  let child;
  try {
    child = spawn(exe, [
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profileDir}`,
      '--no-first-run',
      '--disable-features=AutofillServerCommunication',
      '--autoplay-policy=no-user-gesture-required'
    ], {
      cwd: path.dirname(exe),
      stdio: ['ignore', 'ignore', 'pipe'],
      windowsHide: false
    });

    const stderr = [];
    child.stderr.on('data', (chunk) => {
      const text = String(chunk).trim();
      if (text && !/DevTools listening|USB|GCM|Autofill/i.test(text)) stderr.push(text);
    });

    await waitForCdp(port, 14000);
    const target = await findPageTarget(port);
    const cdp = await CdpSession.connect(target.webSocketDebuggerUrl);
    await cdp.send('Runtime.enable');
    await wait(1400);
    const state = await evalPage(cdp, () => ({
      title: document.title,
      url: location.href,
      h1: document.querySelector('h1')?.textContent?.trim() || '',
      rootChildren: document.querySelector('#root')?.children?.length || 0,
      bodyLength: document.body.textContent.length,
      overlay: Boolean(document.querySelector('vite-error-overlay, .vite-error-overlay, [data-vite-error]')) ||
        /(?:error overlay|internal server error|uncaught runtime error|stack trace)/i.test(document.body.textContent)
    }));
    cdp.close();

    const blank = !state.rootChildren || state.bodyLength < 250 || !/CueForge/i.test(`${state.title} ${state.h1} ${documentSafeUrl(state.url)}`);
    if (blank || state.overlay) {
      return {
        status: 'fail',
        detail: `Packaged app looked blank or errored. title=${state.title || 'none'}, h1=${state.h1 || 'none'}, bodyLength=${state.bodyLength}, overlay=${state.overlay}. ${stderr.slice(0, 2).join(' ')}`
      };
    }

    return {
      status: 'pass',
      detail: `Packaged app rendered: ${state.h1 || state.title}; bodyLength ${state.bodyLength}.`
    };
  } catch (error) {
    return {
      status: 'fail',
      detail: `Could not launch/read packaged desktop app: ${error.message}`
    };
  } finally {
    if (child?.pid) killTree(child.pid);
  }
}

async function findPageTarget(port) {
  for (let index = 0; index < 60; index += 1) {
    const targets = await cdpHttp(port, '/json/list').catch(() => []);
    const page = targets.find((target) => target.type === 'page' && target.webSocketDebuggerUrl);
    if (page) return page;
    await wait(250);
  }
  throw new Error('No desktop page target appeared.');
}

async function waitForCdp(port, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      await cdpHttp(port, '/json/version');
      return;
    } catch {
      await wait(200);
    }
  }
  throw new Error('Desktop remote debugging endpoint did not start.');
}

async function cdpHttp(port, endpoint) {
  const response = await fetch(`http://127.0.0.1:${port}${endpoint}`);
  if (!response.ok) throw new Error(`CDP HTTP ${response.status}`);
  return response.json();
}

async function evalPage(cdp, pageFunction) {
  const expression = `(${pageFunction.toString()})()`;
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Evaluation failed.');
  return result.result?.value;
}

function killTree(pid) {
  if (process.platform === 'win32') {
    spawnSync('taskkill.exe', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore' });
    return;
  }
  try {
    process.kill(pid, 'SIGTERM');
  } catch {
    // Process already closed.
  }
}

function documentSafeUrl(url = '') {
  return String(url).replace(/[A-Z]:\\[^?#]+/gi, '[redacted-path]');
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) continue;
    const [key, inlineValue] = arg.slice(2).split('=');
    parsed[key] = inlineValue ?? argv[index + 1] ?? true;
    if (inlineValue === undefined && argv[index + 1] && !argv[index + 1].startsWith('--')) index += 1;
  }
  return parsed;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class CdpSession {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
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
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (!this.pending.has(id)) return;
        this.pending.delete(id);
        reject(new Error(`CDP timeout: ${method}`));
      }, 10000);
    });
  }

  handleMessage(event) {
    const message = JSON.parse(event.data);
    if (!message.id || !this.pending.has(message.id)) return;
    const { resolve, reject } = this.pending.get(message.id);
    this.pending.delete(message.id);
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
