#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const args = parseArgs(process.argv.slice(2));
const rootDir = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const repairDir = path.join(rootDir, 'docs', 'repair');
const sourceUrl = args.url || 'http://127.0.0.1:5177/';
const durationMs = Number(args.duration || args.durationMs || 120000);
const repeat = Math.max(1, Number(args.repeat || 1));
const headless = args.show ? false : true;
const profileName = String(args.profile || args.personas || 'standard');
const runSeed = String(args.seed || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
const visualFaultMode = String(args.visualFault || args['visual-fault'] || args.fault || args.mutation || 'none').toLowerCase();
const visualFaultEnabled = !['none', 'off', 'false', '0', ''].includes(visualFaultMode);

const personas = buildPersonaProfile(profileName);

const ROUTE_UNIVERSE = [
  'Home',
  'Community Hub',
  'Self Test',
  'Audio DNA',
  'Blind Match',
  'Tactical Masking Lab',
  'Player Trial',
  'Beta Check-in',
  'Gameplay Save',
  'Report Lab',
  'Auto Calibration',
  'Mic Lab',
  'EQ Studio',
  'Game Profiles',
  'Auto Detect',
  'Driver Layer',
  'Hearing Model',
  'System Info',
  'Settings'
];

const SIMPLE_ROUTE_IDS = new Set(['dashboard', 'detect', 'mic', 'eq', 'blindmatch', 'trial', 'reports', 'settings']);

async function main() {
  await mkdir(repairDir, { recursive: true });

  let chrome;
  try {
    const chromePath = findChrome();
    const port = await findFreeDebugPort();
    const profileDir = await mkdtemp(path.join(os.tmpdir(), 'cueforge-swarm-'));
    chrome = spawn(chromePath, [
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profileDir}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--disable-features=AutofillServerCommunication',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--autoplay-policy=no-user-gesture-required',
      '--mute-audio',
      '--window-size=1440,900',
      ...(headless ? ['--headless=new'] : []),
      'about:blank'
    ], {
      detached: false,
      stdio: ['ignore', 'ignore', 'pipe']
    });

    const stderr = [];
    chrome.stderr.on('data', (chunk) => {
      const text = String(chunk);
      if (!/DevTools listening|USB|GCM|Variations/i.test(text)) stderr.push(text.trim());
    });

    await waitForCdp(port);
    const allRuns = [];
    for (let runIndex = 0; runIndex < repeat; runIndex += 1) {
      console.log(`Human swarm CDP run ${runIndex + 1}/${repeat}: ${(durationMs / 60000).toFixed(2)} min`);
      allRuns.push(await runSwarm({ port, runIndex }));
    }

    await writeOutputs(allRuns, stderr);
    console.log(`Human swarm CDP complete: ${allRuns.length} run(s), ${allRuns.reduce((sum, run) => sum + run.summary.routeRuns, 0)} route checks, ${allRuns.reduce((sum, run) => sum + run.notes.length, 0)} note(s).`);
  } finally {
    if (chrome && !chrome.killed) chrome.kill();
  }
}

async function runSwarm({ port, runIndex }) {
  const startedAt = new Date();
  const endAt = Date.now() + durationMs;
  const notes = [];
  const tabs = await Promise.all(personas.map((persona) => createPersonaTab({ port, persona, runIndex })));
  const results = personas.map((persona) => ({
    ...persona,
    routesRun: 0,
    failures: 0,
    notesSavedViaUi: 0,
    actions: []
  }));

  await Promise.all(tabs.map(async ({ cdp, persona }, personaIndex) => {
    const personaResult = results[personaIndex];
    const probeMemory = new Set();
    const stressMemory = new Set();
    const rng = createRng(`${runSeed}:${profileName}:${runIndex}:${persona.id}`);
    const routeState = createRouteState(persona, rng);
    let routeIndex = 0;
    while (Date.now() < endAt) {
      await ensureMode(cdp, persona.mode);
      const route = nextRoute(routeState, rng, routeIndex);
      const action = await exerciseRoute({ cdp, persona, route, probeMemory, stressMemory, rng });
      personaResult.actions.push(action);
      personaResult.routesRun += 1;
      if (!action.ok) personaResult.failures += 1;
      for (const note of action.notes) {
        notes.push(note);
        if (await leavePandaNote(cdp, note)) personaResult.notesSavedViaUi += 1;
      }
      routeIndex += 1;
      await wait(260 + Math.floor(rng() * 240) + personaIndex * 40);
    }
  }));

  for (const tab of tabs) tab.cdp.close();

  const summary = {
    schema: 'cueforge.human-swarm-cdp-run.v1',
    runIndex: runIndex + 1,
    seed: `${runSeed}:${profileName}:${runIndex + 1}`,
    startedAt: startedAt.toISOString(),
    completedAt: new Date().toISOString(),
    requestedDurationMs: durationMs,
    elapsedMs: Date.now() - startedAt.getTime(),
    personaCount: personas.length,
    routeRuns: results.reduce((sum, result) => sum + result.routesRun, 0),
    failures: results.reduce((sum, result) => sum + result.failures, 0),
    notesCreated: notes.length,
    notesSavedViaUi: results.reduce((sum, result) => sum + result.notesSavedViaUi, 0)
  };

  return { summary, personas: results, notes };
}

async function createPersonaTab({ port, persona, runIndex }) {
  const target = await cdpHttp(port, `/json/new?${encodeURIComponent(`${sourceUrl}?qa=cdp-swarm-${runIndex + 1}-${persona.id}&seed=${encodeURIComponent(runSeed)}`)}`, { method: 'PUT' });
  const cdp = await CdpSession.connect(target.webSocketDebuggerUrl);
  cdp.logs = [];
  cdp.on('Runtime.exceptionThrown', (event) => {
    cdp.logs.push(`Runtime exception: ${event.exceptionDetails?.text || event.exceptionDetails?.exception?.description || 'unknown'}`);
  });
  cdp.on('Log.entryAdded', (event) => {
    if (['error', 'warning'].includes(event.entry?.level)) cdp.logs.push(event.entry.text);
  });
  cdp.on('Runtime.consoleAPICalled', (event) => {
    if (['error', 'warning'].includes(event.type)) cdp.logs.push(event.args?.map((arg) => arg.value || arg.description || '').join(' '));
  });
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');
  await setViewport(cdp, persona.viewport);
  await waitForReady(cdp);
  await ensureMode(cdp, persona.mode);
  return { cdp, persona };
}

async function exerciseRoute({ cdp, persona, route, probeMemory, stressMemory, rng }) {
  const started = Date.now();
  const notes = [];
  const actionLog = [];
  const nav = await clickRoute(cdp, route);
  if (!nav.ok) {
    notes.push(makeNote({ persona, page: route, tag: 'confusing', note: nav.reason, panel: 'Navigation' }));
    return { route, page: route, ok: false, durationMs: Date.now() - started, actionLog, notes };
  }

  await wait(120);
  if (visualFaultEnabled) await applyVisualFault(cdp, visualFaultMode);
  notes.push(...healthNotes({ persona, page: nav.used, health: await health(cdp), phase: 'Open' }));
  notes.push(...await visualGeometryNotes({ cdp, persona, page: nav.used, phase: 'Open' }));
  notes.push(...await curiosityProbeNotes({ cdp, persona, page: nav.used, phase: 'Product read', probeMemory }));
  const actions = await routeActions(cdp);
  for (const label of chooseActionLabels(actions, rng, persona.actionLimit || 3)) {
    const result = await clickButton(cdp, label);
    actionLog.push(`${result.ok ? 'clicked' : 'skipped'} ${label}${result.reason ? ` (${result.reason})` : ''}`);
    await wait(80);
  }
  const stressResult = await runStressActions({ cdp, persona, page: nav.used, stressMemory, rng });
  actionLog.push(...stressResult.actionLog);
  notes.push(...stressResult.notes);
  const postHealth = await health(cdp);
  const postPage = postHealth.state.h1 || nav.used;
  if (visualFaultEnabled) await applyVisualFault(cdp, visualFaultMode);
  notes.push(...healthNotes({ persona, page: postPage, health: postHealth, phase: 'After interaction' }));
  notes.push(...await visualGeometryNotes({ cdp, persona, page: postPage, phase: 'After interaction' }));
  if (sameRoute(nav.used, postPage)) {
    notes.push(...await curiosityProbeNotes({ cdp, persona, page: postPage, phase: 'After interaction', probeMemory }));
  }

  return {
    route,
    page: nav.used,
    ok: notes.length === 0,
    durationMs: Date.now() - started,
    actionLog,
    notes
  };
}

async function ensureMode(cdp, mode) {
  const wanted = mode === 'expert' ? 'Expert Mode' : 'Simple Mode';
  for (let index = 0; index < 12; index += 1) {
    const current = await evalPage(cdp, () => document.querySelector('.mode-badge')?.textContent?.trim() || '').catch(() => '');
    if (current === wanted) return;
    if (mode === 'expert') await clickButton(cdp, 'Expert');
    if (mode === 'simple') await clickButton(cdp, 'Simple');
    await wait(120);
  }
  await evalPage(cdp, (nextMode) => {
    const current = JSON.parse(localStorage.getItem('cueforge-user-settings') || '{}');
    localStorage.setItem('cueforge-user-settings', JSON.stringify({
      ...current,
      interfaceMode: nextMode
    }));
    location.reload();
    return true;
  }, mode);
  await waitForReady(cdp);
  await wait(180);
}

async function clickRoute(cdp, route) {
  if (routeNeedsExpert(route)) await ensureMode(cdp, 'expert');
  for (const id of routeIds(route)) {
    const result = await clickNavId(cdp, id);
    if (result.ok) return { ok: true, used: result.label || id };
  }
  for (const label of routeAliases(route)) {
    const result = await clickButton(cdp, label);
    if (result.ok) return { ok: true, used: label };
  }
  return { ok: false, reason: `Could not find route button for ${route}.` };
}

async function clickNavId(cdp, id) {
  const result = await evalPage(cdp, (navId) => {
    const button = document.querySelector(`button[data-qa-nav="${navId}"]`);
    if (!button) return { ok: false, reason: 'missing' };
    if (button.disabled) return { ok: false, reason: 'disabled' };
    const label = button.textContent.trim();
    button.click();
    return { ok: true, label };
  }, id);
  if (result.ok) await wait(80);
  return result;
}

async function clickButton(cdp, label) {
  const result = await evalPage(cdp, (text) => {
    const buttons = [...document.querySelectorAll('button')];
    const button = buttons.find((item) => item.textContent.trim() === text);
    if (!button) return { ok: false, reason: 'missing' };
    if (button.disabled) return { ok: false, reason: 'disabled' };
    button.click();
    return { ok: true };
  }, label);
  if (result.ok) await wait(80);
  return result;
}

async function health(cdp) {
  const state = await evalPage(cdp, () => ({
    h1: document.querySelector('h1')?.textContent?.trim() || '',
    bodyLength: document.body.textContent.length,
    mounted: Boolean(document.querySelector('#root')?.children?.length),
    overlay: Boolean(document.querySelector('vite-error-overlay, .react-error-overlay, #webpack-dev-server-client-overlay')) ||
      /Unhandled Runtime Error|Failed to compile|TypeError:|ReferenceError:|SyntaxError:/i.test(document.body.innerText || ''),
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
    mode: document.querySelector('.mode-badge')?.textContent?.trim() || ''
  }));
  const logs = consumeLogs(cdp);
  return { state, logs };
}

async function routeActions(cdp) {
  return evalPage(cdp, () => {
    const text = document.body.textContent;
    const actions = [];
    if (/Sound Match|Blind Match/.test(text)) actions.push('Play This', 'This felt better', 'Play That', 'That felt better');
    if (/Mic Problem Analyzer|Mic Analyzer/.test(text)) actions.push('Run analysis');
    if (/Simple Tune|10-Band EQ Studio/.test(text)) actions.push('Auto tune now', 'Open expert EQ');
    if (/Self Test|Auto Self Test/.test(text)) actions.push('Run full auto test', 'Run self test');
    if (/Report Lab|Fix Issue/.test(text)) actions.push('Create report', 'Copy report');
    if (/Beta Check-in/.test(text)) actions.push('Add check-in', 'Export beta packet');
    if (/Calibration|Auto Calibration/.test(text)) actions.push('Generate autotune', 'Apply calibration');
    if (/Masking/.test(text)) actions.push('Apply anti-masking tune', 'Create masking tune');
    if (/Gameplay Save/.test(text)) actions.push('Save gameplay snapshot');
    if (/Audio DNA/.test(text)) actions.push('Save DNA');
    if (/Hearing Model/.test(text)) actions.push('I heard it', 'I missed it');
    if (/Auto Detect|Auto Setup/.test(text)) actions.push('Scan audio devices', 'Run Windows scan', 'Copy setup kit');
    if (/Settings/.test(text)) actions.push('Simple', 'Expert');
    return actions;
  });
}

function chooseActionLabels(actions, rng, limit) {
  if (!actions.length) return [];
  return shuffle([...new Set(actions)], rng).slice(0, Math.max(1, Math.min(limit, actions.length)));
}

async function leavePandaNote(cdp, note) {
  await ensureMode(cdp, 'expert');
  return evalPage(cdp, (payload) => {
    const target = document.querySelector('.panel') || document.querySelector('main') || document.body;
    target.dispatchEvent(new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      clientX: Math.round(window.innerWidth * 0.55),
      clientY: Math.round(window.innerHeight * 0.55)
    }));
    const textarea = document.querySelector('.ui-note-popover textarea');
    if (!textarea) return false;
    const textareaSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
    textareaSetter?.call(textarea, payload.note);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    const select = document.querySelector('.ui-note-popover select');
    if (select) {
      const selectSetter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
      selectSetter?.call(select, payload.tag);
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    const save = [...document.querySelectorAll('.ui-note-popover button')].find((button) => button.textContent.trim() === 'Save note');
    if (!save) return false;
    save.click();
    return true;
  }, note).catch(() => false);
}

function healthNotes({ persona, page, health: current, phase }) {
  const notes = [];
  if (!current.state.mounted || current.state.bodyLength < 250) {
    notes.push(makeNote({ persona, page, tag: 'broken', note: `${phase}: app looked blank or did not mount.`, panel: 'Page health' }));
  }
  if (current.state.overlay) {
    notes.push(makeNote({ persona, page, tag: 'broken', note: `${phase}: possible framework error overlay text appeared.`, panel: 'Page health' }));
  }
  if (current.state.overflow) {
    notes.push(makeNote({ persona, page, tag: 'layout issue', note: `${phase}: horizontal overflow detected at ${persona.viewport.width}x${persona.viewport.height}.`, panel: 'Responsive layout' }));
  }
  const appLogs = current.logs.filter((message) => !/Autofill|ERR_BLOCKED_BY_CLIENT|Grammarly|Content Security Policy|WebSocket connection/i.test(message));
  if (appLogs.length) {
    notes.push(makeNote({ persona, page, tag: 'broken', note: `${phase}: console warning/error: ${appLogs.slice(0, 2).join(' | ')}`, panel: 'Console' }));
  }
  return notes;
}

async function visualGeometryNotes({ cdp, persona, page, phase }) {
  const issues = await evalPage(cdp, () => {
    const round = (value) => Math.round(value * 10) / 10;
    const drift = (values) => values.length ? Math.max(...values) - Math.min(...values) : 0;
    const rowSets = [
      {
        name: 'Player Trial task rows',
        selector: '.trial-step',
        controlSelector: 'input[type="checkbox"]',
        expectedControl: 24,
        minimumCount: 2
      }
    ];
    const found = [];

    for (const set of rowSets) {
      const rows = [...document.querySelectorAll(set.selector)];
      if (rows.length < set.minimumCount) continue;
      const measurements = rows.map((row) => {
        const rowRect = row.getBoundingClientRect();
        const controlRect = row.querySelector(set.controlSelector)?.getBoundingClientRect();
        const textRect = row.querySelector('div')?.getBoundingClientRect();
        const strong = row.querySelector('strong');
        return {
          rowX: round(rowRect.x),
          rowW: round(rowRect.width),
          rowH: round(rowRect.height),
          controlX: round(controlRect?.x || 0),
          controlW: round(controlRect?.width || 0),
          controlH: round(controlRect?.height || 0),
          textX: round(textRect?.x || 0),
          fontSize: round(parseFloat(strong ? getComputedStyle(strong).fontSize : '0'))
        };
      });

      const rowDrift = drift(measurements.map((item) => item.rowX));
      const widthDrift = drift(measurements.map((item) => item.rowW));
      const heightDrift = drift(measurements.map((item) => item.rowH));
      const controlDrift = drift(measurements.map((item) => item.controlX));
      const textDrift = drift(measurements.map((item) => item.textX));
      const fontDrift = drift(measurements.map((item) => item.fontSize).filter(Boolean));
      const badControl = measurements.find((item) => (
        Math.abs(item.controlW - set.expectedControl) > 1 ||
        Math.abs(item.controlH - set.expectedControl) > 1
      ));

      if (rowDrift > 1 || widthDrift > 1 || controlDrift > 1 || textDrift > 1 || fontDrift > 2 || heightDrift > 24 || badControl) {
        found.push(`${set.name} are visually uneven: row drift ${rowDrift}px, width drift ${widthDrift}px, height drift ${heightDrift}px, checkbox drift ${controlDrift}px, text drift ${textDrift}px, font drift ${fontDrift}px, checkbox size ${badControl ? `${badControl.controlW}x${badControl.controlH}` : 'ok'}.`);
      }
    }

    const oversizedControls = [...document.querySelectorAll('input[type="checkbox"], input[type="radio"]')]
      .map((control) => {
        const rect = control.getBoundingClientRect();
        return { width: round(rect.width), height: round(rect.height), visible: rect.width > 0 && rect.height > 0 };
      })
      .filter((control) => control.visible && (control.width > 36 || control.height > 36));
    if (oversizedControls.length) {
      found.push(`${oversizedControls.length} checkbox/radio control(s) look oversized; largest ${Math.max(...oversizedControls.map((item) => item.width))}x${Math.max(...oversizedControls.map((item) => item.height))}.`);
    }

    return found;
  }).catch((error) => [`Geometry probe failed: ${error.message}`]);

  return issues.map((issue) => makeNote({
    persona,
    page,
    tag: 'layout issue',
    panel: 'Visual geometry',
    note: `${phase}: ${issue}`
  }));
}

async function applyVisualFault(cdp, mode) {
  return evalPage(cdp, (faultMode) => {
    if (document.getElementById('cueforge-qa-visual-fault')) return true;
    document.documentElement.dataset.qaVisualFault = faultMode || 'visual';
    const style = document.createElement('style');
    style.id = 'cueforge-qa-visual-fault';
    style.textContent = `
      .trial-step:nth-child(2) input[type="checkbox"] {
        width: 58px !important;
        min-width: 58px !important;
        height: 34px !important;
        min-height: 34px !important;
        margin-left: 24px !important;
      }
      .trial-step:nth-child(3) {
        transform: translateX(18px) !important;
      }
      .trial-step:nth-child(4) strong {
        font-size: 27px !important;
        line-height: 1.05 !important;
      }
      .trial-step:nth-child(5) > div {
        transform: translateX(14px) !important;
      }
    `;
    document.head.appendChild(style);
    return true;
  }, mode).catch(() => false);
}

async function curiosityProbeNotes({ cdp, persona, page, phase, probeMemory }) {
  if (!persona.probes?.length) return [];
  const snapshot = await evalPage(cdp, () => ({
    title: document.querySelector('h1')?.textContent?.trim() || '',
    body: document.body.textContent.replace(/\s+/g, ' ').trim().slice(0, 8000),
    primaryButtons: [...document.querySelectorAll('button.primary, a.primary, .button-link.primary')]
      .map((item) => item.textContent.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .slice(0, 8)
  })).catch(() => ({ title: '', body: '', primaryButtons: [] }));
  const haystack = `${snapshot.title} ${snapshot.body}`.toLowerCase();
  const notes = [];

  for (const probe of persona.probes) {
    if (probe.routes?.length && !probe.routes.some((route) => sameRoute(route, page))) continue;
    const matchedSignals = (probe.signals || []).filter((signal) => haystack.includes(signal.toLowerCase()));
    const missing = (probe.signals || []).filter((signal) => !matchedSignals.includes(signal));
    const enoughSignals = matchedSignals.length >= (probe.minSignals || 1);
    const hasAction = !probe.needsAction || snapshot.primaryButtons.length > 0 || /\b(copy|export|save|apply|run|scan|download|start|try|open)\b/i.test(snapshot.body);
    const baseKey = `${persona.id}::${normalizeRouteName(page)}::${normalizeRouteName(probe.question)}`;

    if (!enoughSignals) {
      const key = `${baseKey}::signals`;
      if (probeMemory?.has(key)) continue;
      probeMemory?.add(key);
      notes.push(makeNote({
        persona,
        page,
        tag: probe.tag || 'idea',
        panel: probe.panel || 'Curious product probe',
        note: `${phase}: ${probe.question} Missing clear signal(s): ${missing.slice(0, 4).join(', ')}.`
      }));
    }

    if (!hasAction) {
      const key = `${baseKey}::action`;
      if (probeMemory?.has(key)) continue;
      probeMemory?.add(key);
      notes.push(makeNote({
        persona,
        page,
        tag: 'confusing',
        panel: probe.panel || 'Curious product probe',
        note: `${phase}: I can read the idea, but I do not see an obvious next action for a tester.`
      }));
    }
  }

  return notes.slice(0, 2);
}

async function runStressActions({ cdp, persona, page, stressMemory, rng }) {
  const stress = persona.stress || {};
  const actionLog = [];
  const notes = [];
  const routeKey = `${persona.id}::${normalizeRouteName(page)}`;

  if (stress.inputFlood && rememberOnce(stressMemory, `${routeKey}::inputFlood`)) {
    const result = await floodInputs(cdp);
    actionLog.push(`input flood: ${result.changed} field(s), ${result.ranges} range(s)`);
    notes.push(...healthNotes({ persona, page, health: await health(cdp), phase: 'After weird input flood' }));
  }

  if (stress.buttonStorm && rememberOnce(stressMemory, `${routeKey}::buttonStorm`)) {
    const result = await buttonStorm(cdp, stress.buttonStormClicks || 12);
    actionLog.push(`button storm: ${result.clicked} click(s)`);
    notes.push(...healthNotes({ persona, page, health: await health(cdp), phase: 'After button storm' }));
  }

  if (stress.viewportJitter && rememberOnce(stressMemory, `${routeKey}::viewportJitter`)) {
    const jitter = await viewportJitter(cdp, persona.viewport, rng);
    actionLog.push(`viewport jitter: ${jitter.checked} sizes`);
    jitter.notes.forEach((note) => notes.push(makeNote({
      persona,
      page,
      tag: note.tag,
      panel: 'Viewport stress',
      note: note.note
    })));
  }

  if (stress.pandaEdges && rememberOnce(stressMemory, `${routeKey}::pandaEdges`)) {
    await ensureMode(cdp, 'expert');
    const result = await pandaNoteBoundaryProbe(cdp);
    actionLog.push(`Panda Note edge probe: ${result.checked} edge(s)`);
    for (const issue of result.issues) {
      notes.push(makeNote({
        persona,
        page,
        tag: 'layout issue',
        panel: 'Panda Note boundary',
        note: issue
      }));
    }
  }

  if (stress.storagePressure && rememberOnce(stressMemory, `${persona.id}::storagePressure`)) {
    const result = await storagePressure(cdp);
    actionLog.push(`storage pressure: ${result.ok ? 'ok' : 'failed'} ${result.detail}`);
    if (!result.ok) {
      notes.push(makeNote({
        persona,
        page,
        tag: 'broken',
        panel: 'Local storage pressure',
        note: result.detail
      }));
    }
  }

  if (stress.corruptStorage && rememberOnce(stressMemory, `${persona.id}::corruptStorage`)) {
    const result = await corruptStorageAndReload(cdp, persona.mode);
    actionLog.push(`corrupt storage reload: ${result.ok ? 'recovered' : 'failed'}`);
    if (!result.ok) {
      notes.push(makeNote({
        persona,
        page,
        tag: 'broken',
        panel: 'Corrupt local state',
        note: result.detail
      }));
    }
    notes.push(...healthNotes({ persona, page, health: await health(cdp), phase: 'After corrupt local state reload' }));
  }

  if (stress.rapidNav && rememberOnce(stressMemory, `${persona.id}::rapidNav`)) {
    const result = await rapidNavigation(cdp);
    actionLog.push(`rapid nav: ${result.clicked} nav click(s)`);
    notes.push(...healthNotes({ persona, page, health: await health(cdp), phase: 'After rapid navigation' }));
  }

  return { actionLog, notes };
}

async function floodInputs(cdp) {
  return evalPage(cdp, () => {
    const weird = [
      'HyperX??? Sonar + Peace + APO + Discord + Windows spatial ON/OFF',
      'very long tester note '.repeat(180),
      'unicode-ish safe text: <> {} [] / \\ % $ # @ ! ?',
      'Tarkov, Siege, COD, CS2, Apex, Valorant all in one setup'
    ].join('\n');
    let changed = 0;
    let ranges = 0;
    const textSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    const textareaSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
    document.querySelectorAll('textarea').forEach((item) => {
      textareaSetter?.call(item, weird);
      item.dispatchEvent(new Event('input', { bubbles: true }));
      changed += 1;
    });
    document.querySelectorAll('input').forEach((item, index) => {
      if (item.type === 'range') {
        const next = index % 2 ? item.max : item.min;
        textSetter?.call(item, next || item.value);
        item.dispatchEvent(new Event('input', { bubbles: true }));
        item.dispatchEvent(new Event('change', { bubbles: true }));
        ranges += 1;
      } else if (['text', 'search', 'url', 'email', ''].includes(item.type)) {
        textSetter?.call(item, weird.slice(0, 240));
        item.dispatchEvent(new Event('input', { bubbles: true }));
        changed += 1;
      }
    });
    document.querySelectorAll('select').forEach((item) => {
      if (!item.options.length) return;
      item.selectedIndex = item.options.length - 1;
      item.dispatchEvent(new Event('change', { bubbles: true }));
    });
    return { changed, ranges };
  });
}

async function buttonStorm(cdp, limit) {
  const result = await evalPage(cdp, (maxClicks) => {
    const skip = /download|export|copy|windows scan|desktop|start live|start recording|stop recording|permission|post|open release/i;
    const buttons = [...document.querySelectorAll('button')]
      .filter((button) => !button.disabled && !skip.test(button.textContent || ''))
      .slice(0, maxClicks);
    let clicked = 0;
    for (const button of buttons) {
      try {
        button.click();
        clicked += 1;
      } catch {
        // Keep hammering the remaining safe controls.
      }
    }
    return { clicked };
  }, limit);
  await wait(150);
  return result;
}

async function viewportJitter(cdp, originalViewport, rng) {
  const viewports = shuffle([
    { width: randomInt(rng, 320, 430), height: randomInt(rng, 560, 900) },
    { width: randomInt(rng, 620, 940), height: randomInt(rng, 340, 620) },
    { width: randomInt(rng, 1180, 1620), height: randomInt(rng, 620, 980) },
    { width: randomInt(rng, 1920, 2560), height: randomInt(rng, 900, 1440) },
    originalViewport
  ], rng).slice(0, 4);
  const notes = [];
  for (const viewport of viewports) {
    await setViewport(cdp, viewport);
    await wait(80);
    const state = await evalPage(cdp, () => ({
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
      mounted: Boolean(document.querySelector('#root')?.children?.length),
      bodyLength: document.body.textContent.length
    }));
    if (!state.mounted || state.bodyLength < 250) {
      notes.push({ tag: 'broken', note: `App did not stay mounted at ${viewport.width}x${viewport.height}.` });
    }
    if (state.overflow) {
      notes.push({ tag: 'layout issue', note: `Horizontal overflow appeared at ${viewport.width}x${viewport.height}.` });
    }
  }
  await setViewport(cdp, originalViewport);
  await wait(80);
  return { checked: viewports.length, notes };
}

async function pandaNoteBoundaryProbe(cdp) {
  const points = await evalPage(cdp, () => [
      [4, 4],
      [window.innerWidth - 4, 4],
      [4, window.innerHeight - 4],
      [window.innerWidth - 4, window.innerHeight - 4]
    ]);
  const issues = [];
  let checked = 0;

  for (const [x, y] of points) {
    await evalPage(cdp, ([clickX, clickY]) => {
      document.querySelector('.ui-note-popover button')?.click();
      const hit = document.elementFromPoint(clickX, clickY);
      const target = hit?.closest?.('.app-shell, .setup-journey-shell') || document.querySelector('.app-shell') || document.querySelector('main') || hit || document.body;
      target.dispatchEvent(new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: clickX,
        clientY: clickY
      }));
      return true;
    }, [x, y]);

    await wait(90);

    const result = await evalPage(cdp, ([clickX, clickY]) => {
      const popover = document.querySelector('.ui-note-popover');
      const textarea = document.querySelector('.ui-note-popover textarea');
      if (!popover || !textarea) {
        return { ok: false, issue: `Panda Note did not open at ${clickX},${clickY}.` };
      }
      const rect = popover.getBoundingClientRect();
      if (rect.left < 0 || rect.top < 0 || rect.right > window.innerWidth || rect.bottom > window.innerHeight) {
        return { ok: false, issue: `Panda Note escaped the viewport at ${clickX},${clickY}.` };
      }
      textarea.focus();
      if (document.activeElement !== textarea) {
        return { ok: false, issue: `Panda Note textarea was not focusable at ${clickX},${clickY}.` };
      }
      document.querySelector('.ui-note-popover button')?.click();
      return { ok: true };
    }, [x, y]);

    if (!result.ok) issues.push(result.issue);
    checked += 1;
    await wait(40);
  }

  return { checked, issues };
}

async function storagePressure(cdp) {
  return evalPage(cdp, () => {
    try {
      const payload = 'cueforge-stress-payload:'.repeat(12000);
      localStorage.setItem('cueforge-stress-large-payload', payload);
      const ok = localStorage.getItem('cueforge-stress-large-payload')?.length === payload.length;
      localStorage.removeItem('cueforge-stress-large-payload');
      return { ok, detail: ok ? 'temporary payload stored and cleared' : 'payload length mismatch' };
    } catch (error) {
      return { ok: false, detail: error.message || 'localStorage pressure failed' };
    }
  });
}

async function corruptStorageAndReload(cdp, mode) {
  await evalPage(cdp, () => {
    [
      'cueforge-hearing-results',
      'cueforge-dna-history',
      'cueforge-blind-match',
      'cueforge-beta-checkins',
      'cueforge-gameplay-snapshots',
      'cueforge-last-issue-report',
      'cueforge-user-settings'
    ].forEach((key) => localStorage.setItem(key, '{not-valid-json'));
    location.reload();
    return true;
  });
  await waitForReady(cdp);
  await wait(220);
  await ensureMode(cdp, mode);
  const current = await health(cdp);
  const ok = current.state.mounted && current.state.bodyLength > 250 && !current.logs.length;
  return {
    ok,
    detail: ok ? 'App recovered from invalid local JSON.' : `App did not cleanly recover: ${current.logs.slice(0, 2).join(' | ') || 'blank or unhealthy UI'}`
  };
}

async function rapidNavigation(cdp) {
  const result = await evalPage(cdp, () => {
    const buttons = [...document.querySelectorAll('button[data-qa-nav]')].filter((button) => !button.disabled);
    let clicked = 0;
    for (let index = 0; index < Math.min(40, buttons.length * 3); index += 1) {
      buttons[index % buttons.length]?.click();
      clicked += 1;
    }
    return { clicked };
  });
  await wait(200);
  return result;
}

function rememberOnce(memory, key) {
  if (!memory) return true;
  if (memory.has(key)) return false;
  memory.add(key);
  return true;
}

function makeNote({ persona, page, tag, note, panel }) {
  return {
    schema: 'cueforge.ui-feedback-note.v1',
    id: `cdp-${persona.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    page: String(page || 'unknown').slice(0, 80),
    tag,
    status: 'open',
    reviewedAt: null,
    resolvedAt: null,
    note: `[${persona.name} / ${persona.focus}] ${String(note || '').slice(0, 560)}`,
    target: {
      label: 'Human swarm tester',
      role: 'qa-persona',
      tagName: 'cdp-browser',
      panel: String(panel || '').slice(0, 80)
    },
    viewport: {
      width: persona.viewport.width,
      height: persona.viewport.height,
      xPercent: 55,
      yPercent: 55
    }
  };
}

async function writeOutputs(runs, stderr = []) {
  const allNotes = runs.flatMap((run) => run.notes);
  const resultsPath = path.join(repairDir, 'cueforge-human-swarm-cdp-results.json');
  const notesPath = path.join(repairDir, 'cueforge-human-swarm-cdp-ui-feedback-notes.json');
  const markdownPath = path.join(repairDir, 'HUMAN_SWARM_CDP_QA_RUN.md');
  const imagePath = path.join(repairDir, 'human-swarm-cdp-summary.png');
  const payload = {
    schema: 'cueforge.human-swarm-cdp.v1',
    generatedAt: new Date().toISOString(),
    sourceUrl,
    profile: profileName,
    seed: runSeed,
    visualFault: visualFaultEnabled ? visualFaultMode : 'none',
    randomization: {
      routeOrder: 'seeded shuffled preferred routes with exploratory cross-route checks',
      actions: 'seeded shuffled safe action subset',
      viewports: 'seeded jittered viewport sizes for stress/design profiles',
      visualFault: visualFaultEnabled ? 'QA-only deliberate visual defect injection enabled' : 'off'
    },
    durationMs,
    repeat,
    runs,
    chromeStderr: stderr.slice(-20)
  };
  await writeFile(notesPath, JSON.stringify(allNotes, null, 2), 'utf8');
  await writeFile(resultsPath, JSON.stringify(payload, null, 2), 'utf8');
  await writeFile(markdownPath, formatMarkdown(runs, { resultsPath, notesPath, imagePath }), 'utf8');
  await renderSummaryPng({ runs, imagePath });
}

function formatMarkdown(runs, files) {
  const totalNotes = runs.reduce((sum, run) => sum + run.notes.length, 0);
  const totalRoutes = runs.reduce((sum, run) => sum + run.summary.routeRuns, 0);
  const totalFailures = runs.reduce((sum, run) => sum + run.summary.failures, 0);
  const lines = [
    '# Human Swarm CDP QA Run',
    '',
    `Profile: ${profileName}`,
    `Seed: ${runSeed}`,
    `Visual fault injection: ${visualFaultEnabled ? visualFaultMode : 'off'}`,
    'Randomization: seeded shuffled routes, varied safe action order, exploratory cross-page checks, and jittered viewport stress where enabled.',
    `Runs: ${runs.length}`,
    `Duration per run: ${(durationMs / 60000).toFixed(2)} minutes`,
    `Personas per run: ${personas.length}`,
    `Route checks: ${totalRoutes}`,
    `Failures/friction routes: ${totalFailures}`,
    `Panda Notes created: ${totalNotes}`,
    '',
    '## Persona Split',
    '',
    ...personas.map((persona) => `- ${persona.name}: ${persona.focus}`),
    '',
    '## Run Summaries',
    ''
  ];
  for (const run of runs) {
    lines.push(`### Run ${run.summary.runIndex}`);
    lines.push(`- Routes: ${run.summary.routeRuns}`);
    lines.push(`- Notes: ${run.notes.length}`);
    lines.push(`- Notes saved through UI: ${run.summary.notesSavedViaUi}`);
    for (const persona of run.personas) {
      lines.push(`- ${persona.name}: ${persona.routesRun} routes, ${persona.failures} friction route(s), ${persona.notesSavedViaUi} UI note(s).`);
    }
    lines.push('');
  }
  lines.push('## Notes', '');
  if (!totalNotes) {
    lines.push('No failures or friction notes were created.');
  } else {
    runs.flatMap((run) => run.notes).forEach((note, index) => {
      lines.push(`${index + 1}. [${note.tag}] ${note.page} / ${note.target.panel}: ${note.note}`);
    });
  }
  lines.push('', '## Files', '');
  for (const file of [files.resultsPath, files.notesPath, files.imagePath]) lines.push(`- ${path.relative(rootDir, file).replaceAll('\\', '/')}`);
  return `${lines.join('\n')}\n`;
}

async function renderSummaryPng({ runs, imagePath }) {
  const port = await findFreeDebugPort();
  const chromePath = findChrome();
  const profileDir = await mkdtemp(path.join(os.tmpdir(), 'cueforge-summary-'));
  const chrome = spawn(chromePath, [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--headless=new',
    '--window-size=1200,900',
    'about:blank'
  ], { stdio: 'ignore' });
  try {
    await waitForCdp(port);
    const target = await cdpHttp(port, `/json/new?${encodeURIComponent(`data:text/html;charset=utf-8,${encodeURIComponent(summaryHtml(runs))}`)}`, { method: 'PUT' });
    const cdp = await CdpSession.connect(target.webSocketDebuggerUrl);
    await cdp.send('Page.enable');
    await waitForReady(cdp);
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    await writeFile(imagePath, Buffer.from(shot.data, 'base64'));
    cdp.close();
  } finally {
    chrome.kill();
  }
}

function summaryHtml(runs) {
  const totalRoutes = runs.reduce((sum, run) => sum + run.summary.routeRuns, 0);
  const totalNotes = runs.reduce((sum, run) => sum + run.notes.length, 0);
  const totalSaved = runs.reduce((sum, run) => sum + run.summary.notesSavedViaUi, 0);
  const totalFailures = runs.reduce((sum, run) => sum + run.summary.failures, 0);
  const latestNotes = runs.flatMap((run) => run.notes).slice(-8);
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{margin:0;background:#061214;color:#d8fff7;font:18px Inter,Segoe UI,Arial,sans-serif;padding:44px}
    h1{font-size:42px;margin:0 0 8px} h2{font-size:22px;color:#22d3b6;margin:30px 0 12px}
    .sub{color:#93c9c0;margin-bottom:30px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
    .card{background:#102326;border:1px solid #21464a;border-radius:12px;padding:18px}.card span{display:block;color:#9ccac4;font-size:13px;text-transform:uppercase}.card strong{font-size:34px;color:#ffc247}
    li{margin:12px 0;color:#c9e8e3}.ok{color:#22d3b6}.warn{color:#ffc247}
  </style></head><body>
    <h1>CueForge Human Swarm QA</h1><div class="sub">Five personas. Separate focus areas. Notes go into the repair queue.</div>
    <div class="grid">
      <div class="card"><span>Route checks</span><strong>${totalRoutes}</strong></div>
      <div class="card"><span>Friction routes</span><strong>${totalFailures}</strong></div>
      <div class="card"><span>Panda Notes</span><strong>${totalNotes}</strong></div>
      <div class="card"><span>Saved through UI</span><strong>${totalSaved}</strong></div>
    </div>
    <h2>Persona Coverage</h2>
    <ul>${personas.map((p) => `<li><b>${p.name}</b> - ${escapeHtml(p.focus)}</li>`).join('')}</ul>
    <h2>Latest Findings</h2>
    <ul>${latestNotes.length ? latestNotes.map((n) => `<li><span class="${n.tag === 'broken' ? 'warn' : 'ok'}">[${escapeHtml(n.tag)}]</span> ${escapeHtml(n.page)} - ${escapeHtml(n.note)}</li>`).join('') : '<li class="ok">No failure notes were created in this run.</li>'}</ul>
  </body></html>`;
}

async function setViewport(cdp, viewport) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.width < 600
  });
}

async function waitForReady(cdp) {
  for (let i = 0; i < 80; i += 1) {
    const ready = await evalPage(cdp, () => document.readyState === 'complete' || document.readyState === 'interactive').catch(() => false);
    if (ready) return;
    await wait(100);
  }
}

async function evalPage(cdp, fn, arg) {
  const expression = `(${fn})(${JSON.stringify(arg)})`;
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Runtime.evaluate failed');
  return result.result.value;
}

function consumeLogs(cdp) {
  const logs = (cdp.logs || []).splice(0);
  return logs.map((item) => String(item || '')).filter(Boolean);
}

function createRouteState(persona, rng) {
  const preferred = shuffle([...(persona.routes || ROUTE_UNIVERSE)], rng);
  const exploratory = shuffle(ROUTE_UNIVERSE.filter((route) => !preferred.some((item) => sameRoute(item, route))), rng);
  return {
    preferred,
    exploratory: exploratory.length ? exploratory : shuffle(ROUTE_UNIVERSE, rng),
    explorationRate: Number.isFinite(persona.explorationRate) ? persona.explorationRate : 0.18
  };
}

function nextRoute(routeState, rng, routeIndex) {
  const explorationRate = routeState.explorationRate ?? 0.18;
  if (routeIndex > 0 && routeIndex % routeState.preferred.length === 0) {
    routeState.preferred = shuffle(routeState.preferred, rng);
    routeState.exploratory = shuffle(routeState.exploratory, rng);
  }
  if (routeState.exploratory.length && rng() < explorationRate) {
    return pick(routeState.exploratory, rng);
  }
  return routeState.preferred[routeIndex % routeState.preferred.length];
}

function buildPersonaProfile(profile) {
  if (profile === 'visual-drill') {
    return [
      {
        id: 'grid-symmetry',
        name: 'Grid',
        focus: 'row alignment, repeated task geometry, and checkbox consistency',
        mode: 'expert',
        viewport: { width: 1344, height: 1216 },
        explorationRate: 0,
        routes: ['Player Trial'],
        stress: { viewportJitter: true }
      },
      {
        id: 'font-rhythm',
        name: 'Rhythm',
        focus: 'font size rhythm, label scale, and visual hierarchy breaks',
        mode: 'simple',
        viewport: { width: 1280, height: 720 },
        explorationRate: 0,
        routes: ['Play Test']
      },
      {
        id: 'mobile-symmetry',
        name: 'Pocket',
        focus: 'mobile alignment, cramped controls, and touch target geometry',
        mode: 'simple',
        viewport: { width: 390, height: 844 },
        explorationRate: 0,
        routes: ['Play Test'],
        stress: { viewportJitter: true }
      },
      {
        id: 'wide-layout',
        name: 'Axis',
        focus: 'wide desktop balance, column alignment, and repeated card widths',
        mode: 'expert',
        viewport: { width: 1920, height: 1080 },
        explorationRate: 0,
        routes: ['Player Trial']
      },
      {
        id: 'logic-eye',
        name: 'Square',
        focus: 'does the UI look intentionally built or accidentally shifted',
        mode: 'expert',
        viewport: { width: 1024, height: 768 },
        explorationRate: 0,
        routes: ['Player Trial']
      }
    ];
  }

  if (profile === 'audio-science-reviewers') {
    return [
      {
        id: 'dsp-researcher',
        name: 'Sable',
        focus: 'DSP signal quality, analyzer evidence, and whether audio claims are earned',
        mode: 'expert',
        viewport: { width: 1440, height: 900 },
        explorationRate: 0.32,
        routes: ['Mic Lab', 'Audio DNA', 'Tactical Masking Lab', 'Auto Calibration', 'System Info'],
        probes: [
          thinkerProbe({
            routes: ['Mic Lab', 'Audio DNA', 'Tactical Masking Lab', 'System Info'],
            question: 'Does the app show measured signal evidence before making a tuning claim?',
            signals: ['signal', 'evidence', 'confidence', 'analyzer', 'local', 'recommend'],
            minSignals: 2,
            needsAction: true,
            tag: 'idea',
            panel: 'Audio science evidence'
          })
        ],
        stress: { inputFlood: true, viewportJitter: true }
      },
      {
        id: 'hearing-calibration-auditor',
        name: 'Nia',
        focus: 'hearing model, calibration flow, and personal tuning logic',
        mode: 'expert',
        viewport: { width: 1366, height: 768 },
        explorationRate: 0.28,
        routes: ['Hearing Model', 'Auto Calibration', 'Blind Match', 'EQ Studio', 'Audio DNA'],
        probes: [
          thinkerProbe({
            routes: ['Hearing Model', 'Auto Calibration', 'Blind Match', 'Audio DNA'],
            question: 'Can a player understand how personal choices become a safer EQ curve?',
            signals: ['hearing', 'calibration', 'learn', 'profile', 'EQ', 'safe'],
            minSignals: 2,
            needsAction: true,
            tag: 'confusing',
            panel: 'Personal tuning proof'
          })
        ]
      },
      {
        id: 'masking-scene-scientist',
        name: 'Orin',
        focus: 'masking, footsteps, scene pressure, and explainable game-audio tradeoffs',
        mode: 'expert',
        viewport: { width: 1280, height: 720 },
        explorationRate: 0.34,
        routes: ['Tactical Masking Lab', 'Game Profiles', 'Player Trial', 'EQ Studio', 'Mic Lab'],
        probes: [
          thinkerProbe({
            routes: ['Tactical Masking Lab', 'Game Profiles', 'Player Trial'],
            question: 'Does the app explain why one sound is masking another during a real game?',
            signals: ['masking', 'footstep', 'game', 'because', 'risk', 'score'],
            minSignals: 2,
            needsAction: true,
            tag: 'idea',
            panel: 'Masking science'
          })
        ],
        stress: { buttonStorm: true, buttonStormClicks: 8 }
      },
      {
        id: 'wav-latency-skeptic',
        name: 'Dray',
        focus: 'readiness for WAV analysis, latency proof, and future live capture claims',
        mode: 'expert',
        viewport: { width: 1536, height: 864 },
        explorationRate: 0.25,
        routes: ['System Info', 'Self Test', 'Report Lab', 'Audio DNA', 'Mic Lab'],
        probes: [
          thinkerProbe({
            routes: ['System Info', 'Self Test', 'Report Lab'],
            question: 'Does the app avoid pretending simulated evidence is the same as live waveform proof?',
            signals: ['proof', 'live', 'report', 'privacy', 'test', 'evidence'],
            minSignals: 2,
            needsAction: true,
            tag: 'confusing',
            panel: 'Waveform proof boundary'
          })
        ]
      },
      {
        id: 'audio-fatigue-reviewer',
        name: 'Elowen',
        focus: 'fatigue, harshness, listening safety, and long-session player comfort',
        mode: 'expert',
        viewport: { width: 390, height: 844 },
        explorationRate: 0.32,
        routes: ['EQ Studio', 'Hearing Model', 'Blind Match', 'Settings', 'Gameplay Save'],
        probes: [
          thinkerProbe({
            routes: ['EQ Studio', 'Hearing Model', 'Blind Match', 'Settings'],
            question: 'Does the flow keep comfort and safe tuning visible on small screens?',
            signals: ['safe', 'hearing', 'local', 'save', 'tune', 'profile'],
            minSignals: 2,
            needsAction: true,
            tag: 'layout',
            panel: 'Long-session comfort'
          })
        ],
        stress: { viewportJitter: true }
      }
    ];
  }

  if (profile === 'desktop-release-engineers') {
    return [
      {
        id: 'windows-installer-trust',
        name: 'Marin',
        focus: 'Windows install trust, desktop bridge recovery, and SmartScreen-style friction',
        mode: 'expert',
        viewport: { width: 1440, height: 900 },
        explorationRate: 0.3,
        routes: ['Self Test', 'Auto Detect', 'Driver Layer', 'System Info', 'Settings'],
        probes: [
          thinkerProbe({
            routes: ['Self Test', 'Auto Detect', 'Driver Layer', 'System Info'],
            question: 'Does a Windows player know when they need the desktop app and what stays manual?',
            signals: ['desktop', 'Windows', 'scan', 'driver', 'safe', 'permission'],
            minSignals: 2,
            needsAction: true,
            tag: 'confusing',
            panel: 'Windows desktop trust'
          })
        ],
        stress: { rapidNav: true, buttonStorm: true, buttonStormClicks: 10 }
      },
      {
        id: 'bridge-data-auditor',
        name: 'Tala',
        focus: 'desktop bridge report import, redaction, and device/tool detection proof',
        mode: 'expert',
        viewport: { width: 1366, height: 768 },
        explorationRate: 0.3,
        routes: ['Auto Detect', 'Self Test', 'System Info', 'Report Lab', 'Driver Layer'],
        probes: [
          thinkerProbe({
            routes: ['Auto Detect', 'Self Test', 'System Info'],
            question: 'Can bridge data be detected or imported without leaking private identifiers?',
            signals: ['bridge', 'report', 'device', 'privacy', 'redact', 'export'],
            minSignals: 2,
            needsAction: true,
            tag: 'privacy',
            panel: 'Bridge data privacy'
          })
        ]
      },
      {
        id: 'apo-routing-engineer',
        name: 'Keir',
        focus: 'Equalizer APO, Sonar, virtual routing, and no silent driver writes',
        mode: 'expert',
        viewport: { width: 1280, height: 720 },
        explorationRate: 0.28,
        routes: ['Driver Layer', 'EQ Studio', 'Auto Detect', 'Self Test', 'Game Profiles'],
        probes: [
          thinkerProbe({
            routes: ['Driver Layer', 'EQ Studio', 'Auto Detect'],
            question: 'Does the app separate exportable config from changing Windows audio routing?',
            signals: ['APO', 'export', 'driver', 'routing', 'manual', 'safe'],
            minSignals: 2,
            needsAction: true,
            tag: 'confusing',
            panel: 'APO routing boundary'
          })
        ],
        stress: { inputFlood: true }
      },
      {
        id: 'portable-build-smoker',
        name: 'Yara',
        focus: 'portable build expectations, download flow, and recovery if desktop opens blank',
        mode: 'expert',
        viewport: { width: 1536, height: 864 },
        explorationRate: 0.32,
        routes: ['System Info', 'Settings', 'Self Test', 'Auto Detect', 'Report Lab'],
        probes: [
          thinkerProbe({
            routes: ['System Info', 'Settings', 'Self Test'],
            question: 'Does the app give a tester a recovery path when startup or permission checks are not green?',
            signals: ['recovery', 'run', 'desktop', 'test', 'blocked', 'export'],
            minSignals: 2,
            needsAction: true,
            tag: 'confusing',
            panel: 'Desktop startup recovery'
          })
        ]
      },
      {
        id: 'release-pack-verifier',
        name: 'Cato',
        focus: 'release pack files, export pack, privacy audit, and proof gates',
        mode: 'expert',
        viewport: { width: 390, height: 844 },
        explorationRate: 0.3,
        routes: ['System Info', 'Self Test', 'Report Lab', 'Beta Check-in', 'Settings'],
        probes: [
          thinkerProbe({
            routes: ['System Info', 'Self Test', 'Report Lab', 'Beta Check-in'],
            question: 'Can release proof be exported and audited before a public update?',
            signals: ['export', 'audit', 'privacy', 'proof', 'report', 'tester'],
            minSignals: 2,
            needsAction: true,
            tag: 'privacy',
            panel: 'Release proof gate'
          })
        ],
        stress: { viewportJitter: true, storagePressure: true }
      }
    ];
  }

  if (profile === 'accessibility-privacy-guardians') {
    return [
      {
        id: 'quiet-start-accessibility',
        name: 'June',
        focus: 'quiet startup, motion/audio settings, and low-surprise player experience',
        mode: 'simple',
        viewport: { width: 1280, height: 720 },
        explorationRate: 0.3,
        routes: ['Home', 'Settings', 'Auto Setup', 'Mic Check', 'Fix Issue'],
        probes: [
          thinkerProbe({
            routes: ['Home', 'Settings'],
            question: 'Does the app start quiet and make audio/motion controls understandable?',
            signals: ['quiet', 'audio', 'settings', 'safe', 'local', 'background'],
            minSignals: 2,
            needsAction: true,
            tag: 'accessibility',
            panel: 'Quiet start accessibility'
          })
        ],
        stress: { viewportJitter: true }
      },
      {
        id: 'keyboard-flow-auditor',
        name: 'Rin',
        focus: 'keyboard-ish flow, button labels, readable actions, and no trap states',
        mode: 'expert',
        viewport: { width: 1366, height: 768 },
        explorationRate: 0.32,
        routes: ['Settings', 'System Info', 'Report Lab', 'Beta Check-in', 'Community Hub'],
        probes: [
          thinkerProbe({
            routes: ['Settings', 'System Info', 'Report Lab'],
            question: 'Are the next actions labeled clearly enough for someone moving fast?',
            signals: ['run', 'copy', 'export', 'save', 'clear', 'open'],
            minSignals: 2,
            needsAction: true,
            tag: 'confusing',
            panel: 'Action label clarity'
          })
        ],
        stress: { buttonStorm: true, buttonStormClicks: 8 }
      },
      {
        id: 'privacy-red-team',
        name: 'Mira',
        focus: 'private data, local-only promises, and redacted issue reports',
        mode: 'expert',
        viewport: { width: 1440, height: 900 },
        explorationRate: 0.3,
        routes: ['Report Lab', 'System Info', 'Beta Check-in', 'Community Hub', 'Settings'],
        probes: [
          thinkerProbe({
            routes: ['Report Lab', 'System Info', 'Beta Check-in', 'Community Hub'],
            question: 'Is it obvious what stays local and what a tester must choose to export?',
            signals: ['local', 'privacy', 'redact', 'export', 'report', 'private'],
            minSignals: 3,
            needsAction: true,
            tag: 'privacy',
            panel: 'Privacy red team'
          })
        ],
        stress: { inputFlood: true }
      },
      {
        id: 'mobile-reader',
        name: 'Ari',
        focus: 'mobile-width reading, wrapping, popover boundaries, and thumb flow',
        mode: 'simple',
        viewport: { width: 360, height: 640 },
        explorationRate: 0.36,
        routes: ['Home', 'Auto Setup', 'Tune', 'Sound Match', 'Settings', 'Fix Issue'],
        probes: [
          thinkerProbe({
            routes: ['Home', 'Auto Setup', 'Tune', 'Fix Issue', 'Settings'],
            question: 'Can the core player flow be read and acted on at phone width?',
            signals: ['setup', 'tune', 'safe', 'report', 'settings', 'export'],
            minSignals: 1,
            needsAction: true,
            tag: 'layout',
            panel: 'Mobile readability'
          })
        ],
        stress: { viewportJitter: true, pandaEdges: true }
      },
      {
        id: 'plain-language-guardian',
        name: 'Solace',
        focus: 'human wording, no raw developer wall unless Expert Mode needs it',
        mode: 'simple',
        viewport: { width: 1536, height: 864 },
        explorationRate: 0.28,
        routes: ['Home', 'Auto Setup', 'Mic Check', 'Play Test', 'Fix Issue'],
        probes: [
          thinkerProbe({
            routes: ['Home', 'Auto Setup', 'Mic Check', 'Play Test'],
            question: 'Does a non-developer understand what CueForge wants them to do next?',
            signals: ['start', 'setup', 'check', 'play', 'report', 'try'],
            minSignals: 1,
            needsAction: true,
            tag: 'confusing',
            panel: 'Plain-language flow'
          })
        ]
      }
    ];
  }

  if (profile === 'competitive-fps-coaches') {
    return [
      {
        id: 'tactical-audio-coach',
        name: 'Voss',
        focus: 'footsteps, explosions, comms, and tactical FPS tradeoff coaching',
        mode: 'expert',
        viewport: { width: 1440, height: 900 },
        explorationRate: 0.32,
        routes: ['Tactical Masking Lab', 'Game Profiles', 'Player Trial', 'EQ Studio', 'Audio DNA'],
        probes: [
          thinkerProbe({
            routes: ['Tactical Masking Lab', 'Game Profiles', 'Player Trial'],
            question: 'Does a competitive player get a useful game-specific next test?',
            signals: ['footstep', 'game', 'match', 'test', 'score', 'tune'],
            minSignals: 2,
            needsAction: true,
            tag: 'idea',
            panel: 'Competitive FPS coaching'
          })
        ],
        stress: { rapidNav: true }
      },
      {
        id: 'comms-clarity-coach',
        name: 'Lex',
        focus: 'mic clarity, Discord notes, and teammate feedback loop',
        mode: 'expert',
        viewport: { width: 1366, height: 768 },
        explorationRate: 0.3,
        routes: ['Mic Lab', 'Beta Check-in', 'Report Lab', 'Community Hub', 'Self Test'],
        probes: [
          thinkerProbe({
            routes: ['Mic Lab', 'Beta Check-in', 'Community Hub'],
            question: 'Can teammate mic feedback turn into a concrete test and fix?',
            signals: ['Discord', 'mic', 'feedback', 'analysis', 'report', 'evidence'],
            minSignals: 2,
            needsAction: true,
            tag: 'confusing',
            panel: 'Comms feedback loop'
          })
        ],
        stress: { inputFlood: true }
      },
      {
        id: 'ranked-session-reviewer',
        name: 'Noor',
        focus: 'before/after match check-ins, gameplay saves, and real-session comparison',
        mode: 'expert',
        viewport: { width: 1280, height: 720 },
        explorationRate: 0.3,
        routes: ['Gameplay Save', 'Beta Check-in', 'Player Trial', 'Report Lab', 'System Info'],
        probes: [
          thinkerProbe({
            routes: ['Gameplay Save', 'Beta Check-in', 'Player Trial'],
            question: 'Does the app push players toward one real match and a saved comparison?',
            signals: ['match', 'save', 'check-in', 'before', 'after', 'trial'],
            minSignals: 2,
            needsAction: true,
            tag: 'idea',
            panel: 'Ranked session comparison'
          })
        ],
        stress: { storagePressure: true }
      },
      {
        id: 'game-engine-reality-checker',
        name: 'Ilan',
        focus: 'not blaming gear when game engine, server, map, HRTF, or mode is the real cause',
        mode: 'expert',
        viewport: { width: 1536, height: 864 },
        explorationRate: 0.28,
        routes: ['Game Profiles', 'Driver Layer', 'System Info', 'Tactical Masking Lab', 'Auto Detect'],
        probes: [
          thinkerProbe({
            routes: ['Game Profiles', 'Driver Layer', 'Tactical Masking Lab'],
            question: 'Does the app remind testers that game, server, HRTF, or routing can be the cause?',
            signals: ['game', 'routing', 'HRTF', 'server', 'risk', 'test'],
            minSignals: 2,
            needsAction: true,
            tag: 'confusing',
            panel: 'Game issue reality check'
          })
        ]
      },
      {
        id: 'setup-budget-coach',
        name: 'Pax',
        focus: 'setup recommendations, gear chain fit, and budget-aware next moves',
        mode: 'simple',
        viewport: { width: 390, height: 844 },
        explorationRate: 0.34,
        routes: ['Auto Setup', 'Home', 'Tune', 'Play Test', 'Settings'],
        probes: [
          thinkerProbe({
            routes: ['Auto Setup', 'Home', 'Tune'],
            question: 'Can a player get a sane starting path without buying anything first?',
            signals: ['setup', 'gear', 'safe', 'tune', 'start', 'export'],
            minSignals: 1,
            needsAction: true,
            tag: 'confusing',
            panel: 'Setup/budget coaching'
          })
        ],
        stress: { viewportJitter: true }
      }
    ];
  }

  if (profile === 'community-growth-operators') {
    return [
      {
        id: 'discord-hub-operator',
        name: 'Basil',
        focus: 'Discord-first hub, roll calls, tester welcome path, and useful channels',
        mode: 'expert',
        viewport: { width: 1440, height: 900 },
        explorationRate: 0.32,
        routes: ['Community Hub', 'Beta Check-in', 'System Info', 'Report Lab', 'Settings'],
        probes: [
          thinkerProbe({
            routes: ['Community Hub', 'Beta Check-in', 'System Info'],
            question: 'Does the app support a Discord-first tester loop without turning spammy?',
            signals: ['Discord', 'tester', 'feedback', 'roll call', 'reply', 'spam'],
            minSignals: 2,
            needsAction: true,
            tag: 'idea',
            panel: 'Discord tester hub'
          })
        ],
        stress: { inputFlood: true }
      },
      {
        id: 'reddit-comment-strategist',
        name: 'Ren',
        focus: 'community-safe Reddit comments, thread memory, and no repost blasting',
        mode: 'expert',
        viewport: { width: 1366, height: 768 },
        explorationRate: 0.3,
        routes: ['Community Hub', 'System Info', 'Report Lab', 'Beta Check-in'],
        probes: [
          thinkerProbe({
            routes: ['Community Hub', 'System Info'],
            question: 'Does outreach prefer helpful replies and saved thread memory over repeated posting?',
            signals: ['Reddit', 'thread', 'reply', 'memory', 'queue', 'spam'],
            minSignals: 2,
            needsAction: true,
            tag: 'confusing',
            panel: 'Reddit community-safe growth'
          })
        ]
      },
      {
        id: 'release-story-editor',
        name: 'Ciel',
        focus: 'human release updates, proof-first story, and non-corporate product voice',
        mode: 'expert',
        viewport: { width: 1280, height: 720 },
        explorationRate: 0.28,
        routes: ['System Info', 'Community Hub', 'Beta Check-in', 'Report Lab'],
        probes: [
          thinkerProbe({
            routes: ['System Info', 'Community Hub'],
            question: 'Can the next update be explained like a real build note with proof?',
            signals: ['update', 'proof', 'tester', 'release', 'queue', 'privacy'],
            minSignals: 2,
            needsAction: true,
            tag: 'idea',
            panel: 'Release story'
          })
        ],
        stress: { buttonStorm: true, buttonStormClicks: 7 }
      },
      {
        id: 'reward-community-moderator',
        name: 'Wynn',
        focus: 'reward claims, verified retests, anti-farming, and moderator workload',
        mode: 'expert',
        viewport: { width: 1536, height: 864 },
        explorationRate: 0.3,
        routes: ['Beta Check-in', 'Community Hub', 'System Info', 'Report Lab'],
        probes: [
          thinkerProbe({
            routes: ['Beta Check-in', 'Community Hub', 'System Info'],
            question: 'Can moderators tell which tester rewards are earned and which are fake?',
            signals: ['reward', 'claim', 'proof', 'verified', 'spam', 'fake'],
            minSignals: 3,
            needsAction: true,
            tag: 'confusing',
            panel: 'Reward moderation'
          })
        ]
      },
      {
        id: 'feedback-memory-archivist',
        name: 'Tovi',
        focus: 'saving conversations, next replies, and making community findings actionable in GitHub',
        mode: 'expert',
        viewport: { width: 390, height: 844 },
        explorationRate: 0.34,
        routes: ['Community Hub', 'Report Lab', 'System Info', 'Beta Check-in'],
        probes: [
          thinkerProbe({
            routes: ['Community Hub', 'Report Lab'],
            question: 'Can a conversation become a saved memory, report, or follow-up action?',
            signals: ['memory', 'report', 'export', 'reply', 'follow', 'GitHub'],
            minSignals: 2,
            needsAction: true,
            tag: 'layout',
            panel: 'Feedback memory'
          })
        ],
        stress: { viewportJitter: true, storagePressure: true }
      }
    ];
  }

  if (profile === 'alpha-beta-hunters') {
    return [
      {
        id: 'alpha-edge-hunter',
        name: 'Rook',
        focus: 'alpha tester hunting hard repros, edge cases, and reward-worthy bugs',
        mode: 'expert',
        viewport: { width: 1440, height: 900 },
        explorationRate: 0.34,
        routes: ['Beta Check-in', 'Report Lab', 'System Info', 'Self Test', 'Audio DNA'],
        probes: [
          thinkerProbe({
            routes: ['Beta Check-in', 'Report Lab', 'System Info'],
            question: 'Can a serious alpha tester tell what counts as a high-value find and how to prove it?',
            signals: ['reward', 'proof', 'repro', 'report', 'retest', 'verified', 'local', 'privacy'],
            minSignals: 3,
            needsAction: true,
            tag: 'confusing',
            panel: 'Alpha hunter reward proof'
          })
        ],
        stress: { inputFlood: true, buttonStorm: true, buttonStormClicks: 8, pandaEdges: true }
      },
      {
        id: 'beta-community-hunter',
        name: 'Bree',
        focus: 'beta tester checking if feedback feels worth sending after a real match',
        mode: 'simple',
        viewport: { width: 1366, height: 768 },
        explorationRate: 0.3,
        routes: ['Home', 'Play Test', 'Fix Issue', 'Settings', 'Auto Setup'],
        probes: [
          thinkerProbe({
            routes: ['Home', 'Play Test', 'Fix Issue'],
            question: 'Does the beta path explain what to send after a match without feeling like a form wall?',
            signals: ['test', 'feedback', 'report', 'check-in', 'proof', 'send', 'safe'],
            minSignals: 2,
            needsAction: true,
            tag: 'confusing',
            panel: 'Beta tester useful feedback'
          })
        ],
        stress: { viewportJitter: true, inputFlood: true }
      },
      {
        id: 'reward-skeptic',
        name: 'Knox',
        focus: 'reward system clarity, anti-farming language, and proof-based recognition',
        mode: 'expert',
        viewport: { width: 1280, height: 720 },
        explorationRate: 0.32,
        routes: ['Beta Check-in', 'Community Hub', 'System Info', 'Report Lab'],
        probes: [
          thinkerProbe({
            routes: ['Beta Check-in', 'Community Hub', 'System Info'],
            question: 'Could someone understand the reward ladder without thinking fake spam earns points?',
            signals: ['reward', 'points', 'tier', 'claim', 'verified', 'proof', 'spam', 'fake'],
            minSignals: 3,
            needsAction: true,
            tag: 'confusing',
            panel: 'Reward ladder anti-farming'
          })
        ],
        stress: { buttonStorm: true, buttonStormClicks: 12 }
      },
      {
        id: 'evidence-replay-hunter',
        name: 'Ivy',
        focus: 'evidence quality, redaction, replayability, and whether hard reports can be fixed later',
        mode: 'expert',
        viewport: { width: 1536, height: 864 },
        explorationRate: 0.28,
        routes: ['Report Lab', 'Beta Check-in', 'Mic Lab', 'Gameplay Save', 'System Info'],
        probes: [
          thinkerProbe({
            routes: ['Report Lab', 'Beta Check-in', 'Mic Lab'],
            question: 'Can a hard audio bug be captured, redacted, replayed, and retested without leaking private data?',
            signals: ['evidence', 'redact', 'replay', 'report', 'local', 'privacy', 'retest', 'export'],
            minSignals: 3,
            needsAction: true,
            tag: 'privacy',
            panel: 'Evidence replay hunter'
          })
        ],
        stress: { inputFlood: true, viewportJitter: true }
      },
      {
        id: 'power-session-tester',
        name: 'Max',
        focus: 'repeat sessions, saved state, setup changes, and performance under heavy tester use',
        mode: 'expert',
        viewport: { width: 390, height: 844 },
        explorationRate: 0.36,
        routes: ['Beta Check-in', 'Gameplay Save', 'Auto Detect', 'Settings', 'Self Test'],
        probes: [
          thinkerProbe({
            routes: ['Beta Check-in', 'Gameplay Save', 'Auto Detect', 'Settings'],
            question: 'Does the app survive repeat check-ins, setup changes, and mobile-width tester use?',
            signals: ['save', 'check-in', 'setup', 'local', 'export', 'recover', 'shortcut', 'privacy'],
            minSignals: 2,
            needsAction: true,
            tag: 'layout',
            panel: 'Power tester repeat sessions'
          })
        ],
        stress: { storagePressure: true, rapidNav: true, viewportJitter: true, buttonStorm: true, buttonStormClicks: 10 }
      }
    ];
  }

  if (profile === 'final-flow-qol') {
    return [
      {
        id: 'first-run-player',
        name: 'Remy',
        focus: 'fresh install flow, first useful action, and whether setup feels guided',
        mode: 'simple',
        viewport: { width: 1440, height: 900 },
        explorationRate: 0.24,
        routes: ['Home', 'Auto Setup', 'Mic Check', 'Tune', 'Sound Match', 'Play Test', 'Settings'],
        probes: [
          thinkerProbe({
            routes: ['Home', 'Auto Setup', 'Mic Check', 'Tune', 'Sound Match', 'Play Test'],
            question: 'Can a new tester understand the next useful step without reading docs?',
            signals: ['setup', 'run', 'try', 'tune', 'safe', 'local', 'match', 'save'],
            minSignals: 1,
            needsAction: true,
            tag: 'confusing',
            panel: 'Final release: first-run flow'
          })
        ],
        stress: { viewportJitter: true }
      },
      {
        id: 'permission-recovery-tester',
        name: 'Lena',
        focus: 'blocked mic, browser limits, desktop bridge recovery, and plain-language fixes',
        mode: 'expert',
        viewport: { width: 1366, height: 768 },
        explorationRate: 0.28,
        routes: ['Self Test', 'Auto Detect', 'Mic Lab', 'Driver Layer', 'Settings'],
        probes: [
          thinkerProbe({
            routes: ['Self Test', 'Auto Detect', 'Mic Lab', 'Driver Layer', 'Settings'],
            question: 'If something is blocked, does the app say what happened and what to do next?',
            signals: ['permission', 'blocked', 'browser', 'desktop', 'scan', 'safe', 'copy', 'manual'],
            minSignals: 2,
            needsAction: true,
            tag: 'missing feedback',
            panel: 'Final release: recovery flow'
          })
        ],
        stress: { buttonStorm: true, buttonStormClicks: 8 }
      },
      {
        id: 'report-export-clerk',
        name: 'Jules',
        focus: 'copy/export/report paths, redaction trust, and tester handoff packets',
        mode: 'expert',
        viewport: { width: 1280, height: 720 },
        explorationRate: 0.3,
        routes: ['Report Lab', 'Beta Check-in', 'Gameplay Save', 'System Info', 'Community Hub'],
        probes: [
          thinkerProbe({
            routes: ['Report Lab', 'Beta Check-in', 'Gameplay Save', 'System Info', 'Community Hub'],
            question: 'Can a tester send useful feedback without leaking private data or guessing what to copy?',
            signals: ['report', 'redact', 'privacy', 'copy', 'export', 'local', 'feedback', 'replay'],
            minSignals: 2,
            needsAction: true,
            tag: 'missing feedback',
            panel: 'Final release: report handoff'
          })
        ],
        stress: { inputFlood: true, pandaEdges: true }
      },
      {
        id: 'qol-friction-minimizer',
        name: 'Owen',
        focus: 'mode switching, shortcut clarity, quiet defaults, and low-friction repeated use',
        mode: 'simple',
        viewport: { width: 390, height: 844 },
        explorationRate: 0.34,
        routes: ['Settings', 'Home', 'Fix Issue', 'Auto Setup', 'Tune', 'Sound Match'],
        probes: [
          thinkerProbe({
            routes: ['Settings', 'Home', 'Fix Issue', 'Auto Setup', 'Tune', 'Sound Match'],
            question: 'Does repeated use feel calm, quick, and not noisy or overcomplicated?',
            signals: ['quiet', 'simple', 'expert', 'save', 'copy', 'clear', 'local', 'safe'],
            minSignals: 1,
            needsAction: true,
            tag: 'confusing',
            panel: 'Final release: QOL friction'
          })
        ],
        stress: { viewportJitter: true, pandaEdges: true }
      },
      {
        id: 'release-captain',
        name: 'Mara',
        focus: 'final readiness, proof gates, known limits, and whether the build can be handed to players',
        mode: 'expert',
        viewport: { width: 1280, height: 720 },
        explorationRate: 0.36,
        routes: ['Control', 'System Info', 'Self Test', 'Audio DNA', 'Report Lab', 'Settings'],
        probes: [
          thinkerProbe({
            routes: ['Control', 'System Info', 'Self Test', 'Audio DNA', 'Report Lab', 'Settings'],
            question: 'Would I approve this as a tester build with clear limits and proof?',
            signals: ['pass', 'proof', 'privacy', 'safe', 'release', 'tested', 'report', 'local'],
            minSignals: 2,
            needsAction: true,
            tag: 'confusing',
            panel: 'Final release: readiness'
          })
        ],
        stress: { rapidNav: true, buttonStorm: true, buttonStormClicks: 10 }
      }
    ];
  }

  if (profile === 'logic-council') {
    return [
      {
        id: 'claim-boundary-logician',
        name: 'Ada',
        focus: 'claims, safety boundaries, and whether the app promises only what it can prove',
        mode: 'expert',
        viewport: { width: 1440, height: 900 },
        explorationRate: 0.3,
        routes: ['Self Test', 'Auto Detect', 'Driver Layer', 'System Info', 'Control'],
        probes: [
          thinkerProbe({
            routes: ['Self Test', 'Auto Detect', 'Driver Layer', 'System Info', 'Control'],
            question: 'Does the page separate what CueForge knows, what it estimates, and what needs desktop permission?',
            signals: ['browser', 'desktop', 'permission', 'safe', 'local', 'explicit', 'report'],
            minSignals: 2,
            needsAction: true,
            tag: 'confusing',
            panel: 'Logic council: claim boundary'
          })
        ]
      },
      {
        id: 'cause-effect-auditor',
        name: 'Bo',
        focus: 'cause/effect reasoning from audio symptom to recommendation',
        mode: 'expert',
        viewport: { width: 1366, height: 768 },
        explorationRate: 0.28,
        routes: ['Mic Lab', 'Tactical Masking Lab', 'Auto Calibration', 'EQ Studio', 'Game Profiles'],
        probes: [
          thinkerProbe({
            routes: ['Mic Lab', 'Tactical Masking Lab', 'Auto Calibration', 'EQ Studio', 'Game Profiles'],
            question: 'Can I see why this recommendation follows from the stated symptom or game need?',
            signals: ['because', 'risk', 'confidence', 'likely', 'recommend', 'apply', 'safe', 'game'],
            minSignals: 1,
            needsAction: true,
            tag: 'confusing',
            panel: 'Logic council: cause and effect'
          })
        ]
      },
      {
        id: 'flow-consistency-referee',
        name: 'Cy',
        focus: 'flow order, next action logic, and simple/expert consistency',
        mode: 'simple',
        viewport: { width: 390, height: 844 },
        explorationRate: 0.35,
        routes: ['Home', 'Auto Setup', 'Mic Check', 'Tune', 'Sound Match', 'Fix Issue', 'Settings'],
        probes: [
          thinkerProbe({
            routes: ['Home', 'Auto Setup', 'Mic Check', 'Tune', 'Sound Match', 'Fix Issue', 'Settings'],
            question: 'Does the next step make sense from a fresh-player state without sending me in circles?',
            signals: ['next', 'setup', 'run', 'try', 'save', 'report', 'simple', 'expert'],
            minSignals: 1,
            needsAction: true,
            tag: 'confusing',
            panel: 'Logic council: flow consistency'
          })
        ],
        stress: { viewportJitter: true }
      },
      {
        id: 'proof-data-skeptic',
        name: 'Dee',
        focus: 'metrics, confidence, evidence, and report replay logic',
        mode: 'expert',
        viewport: { width: 1280, height: 720 },
        explorationRate: 0.32,
        routes: ['Audio DNA', 'Report Lab', 'Beta Check-in', 'Gameplay Save', 'Player Trial'],
        probes: [
          thinkerProbe({
            routes: ['Audio DNA', 'Report Lab', 'Beta Check-in', 'Gameplay Save', 'Player Trial'],
            question: 'Can I tell what data was collected, what was redacted, and how it can be replayed?',
            signals: ['evidence', 'report', 'replay', 'redact', 'confidence', 'save', 'export', 'local'],
            minSignals: 2,
            needsAction: true,
            tag: 'confusing',
            panel: 'Logic council: proof and data'
          })
        ]
      },
      {
        id: 'contradiction-hunter',
        name: 'Len',
        focus: 'contradictions, vague labels, impossible promises, and mixed messaging',
        mode: 'expert',
        viewport: { width: 1280, height: 720 },
        explorationRate: 0.4,
        routes: ['Community Hub', 'Settings', 'Self Test', 'Auto Detect', 'Hearing Model', 'System Info'],
        probes: [
          thinkerProbe({
            routes: ['Community Hub', 'Settings', 'Self Test', 'Auto Detect', 'Hearing Model', 'System Info'],
            question: 'Would two reasonable people agree on what this page means and what it will not do?',
            signals: ['safe', 'local', 'explicit', 'privacy', 'blocked', 'manual', 'desktop', 'browser'],
            minSignals: 2,
            needsAction: true,
            tag: 'confusing',
            panel: 'Logic council: contradiction check'
          })
        ]
      }
    ];
  }

  if (profile === 'design-reviewers') {
    return [
      {
        id: 'web-product-designer',
        name: 'Vale',
        focus: 'web product flow, clear calls to action, and first-screen usefulness',
        mode: 'simple',
        viewport: { width: 1440, height: 900 },
        routes: ['Home', 'Auto Setup', 'Tune', 'Fix Issue', 'Settings'],
        probes: [
          thinkerProbe({
            routes: ['Home', 'Auto Setup', 'Tune', 'Fix Issue', 'Settings'],
            question: 'Does this page have a clear player-facing next step without feeling like homework?',
            signals: ['setup', 'tune', 'report', 'copy', 'run', 'safe', 'local', 'try'],
            minSignals: 1,
            needsAction: true,
            panel: 'Web product design review'
          })
        ],
        stress: { viewportJitter: true }
      },
      {
        id: 'spatial-layout-designer',
        name: 'Mina',
        focus: 'interior-style spacing, visual rhythm, breathing room, and panel balance',
        mode: 'expert',
        viewport: { width: 1366, height: 768 },
        routes: ['Control', 'Community Hub', 'System Info', 'Auto Detect', 'Settings'],
        probes: [
          thinkerProbe({
            routes: ['Control', 'Community Hub', 'System Info', 'Auto Detect', 'Settings'],
            question: 'Does the screen feel organized into rooms instead of one dense wall of controls?',
            signals: ['summary', 'status', 'ready', 'next', 'safe', 'privacy', 'queue'],
            minSignals: 1,
            needsAction: true,
            panel: 'Spatial layout design review'
          })
        ],
        stress: { viewportJitter: true }
      },
      {
        id: 'brand-art-director',
        name: 'Arlo',
        focus: 'brand identity, art direction, Panda/CueForge consistency, and visual memorability',
        mode: 'expert',
        viewport: { width: 1280, height: 720 },
        routes: ['Control', 'Blind Match', 'Audio DNA', 'Game Profiles', 'Community Hub'],
        probes: [
          thinkerProbe({
            routes: ['Control', 'Blind Match', 'Audio DNA', 'Game Profiles', 'Community Hub'],
            question: 'Does this feel like CueForge instead of a generic audio dashboard?',
            signals: ['cueforge', 'panda', 'audio', 'profile', 'match', 'tester', 'game'],
            minSignals: 2,
            needsAction: true,
            panel: 'Brand art direction review'
          })
        ]
      },
      {
        id: 'accessibility-interface-designer',
        name: 'Nia',
        focus: 'accessibility, readable controls, recovery copy, and edge-case interaction design',
        mode: 'expert',
        viewport: { width: 390, height: 844 },
        routes: ['Settings', 'Self Test', 'Mic Lab', 'Report Lab', 'Auto Detect'],
        probes: [
          thinkerProbe({
            routes: ['Settings', 'Self Test', 'Mic Lab', 'Report Lab', 'Auto Detect'],
            question: 'Can a tired tester understand permissions, privacy, and recovery without help?',
            signals: ['permission', 'privacy', 'redact', 'local', 'blocked', 'copy', 'safe'],
            minSignals: 1,
            needsAction: true,
            panel: 'Accessible interface design review'
          })
        ],
        stress: { viewportJitter: true, pandaEdges: true }
      },
      {
        id: 'sensory-motion-designer',
        name: 'Theo',
        focus: 'sensory design, motion/audio restraint, sound-match clarity, and emotional feel',
        mode: 'expert',
        viewport: { width: 1280, height: 720 },
        routes: ['Blind Match', 'Tactical Masking Lab', 'Hearing Model', 'Gameplay Save', 'Settings'],
        probes: [
          thinkerProbe({
            routes: ['Blind Match', 'Tactical Masking Lab', 'Hearing Model', 'Gameplay Save', 'Settings'],
            question: 'Does the sensory side feel controlled, useful, and not overwhelming?',
            signals: ['quiet', 'save', 'safe', 'better', 'match', 'hearing', 'audio'],
            minSignals: 1,
            needsAction: true,
            panel: 'Sensory design review'
          })
        ],
        stress: { viewportJitter: true }
      }
    ];
  }

  if (profile === 'stress-breakers') {
    return [
      {
        id: 'rapid-click-breaker',
        name: 'Kai',
        focus: 'rapid navigation, click storms, and state-change collisions',
        mode: 'expert',
        viewport: { width: 1440, height: 900 },
        routes: ['Control', 'Self Test', 'Audio DNA', 'EQ Studio', 'Report Lab', 'System Info'],
        stress: { rapidNav: true, buttonStorm: true, buttonStormClicks: 16 }
      },
      {
        id: 'setup-spoofer',
        name: 'Mako',
        focus: 'weird gear chains, conflicting setup text, and fake-looking audio stacks',
        mode: 'expert',
        viewport: { width: 1366, height: 768 },
        routes: ['Auto Detect', 'Driver Layer', 'Mic Lab', 'Game Profiles', 'Calibration'],
        stress: { inputFlood: true, buttonStorm: true, buttonStormClicks: 10 }
      },
      {
        id: 'storage-corruptor',
        name: 'Tess',
        focus: 'corrupt local data, storage pressure, reload recovery, and saved-state limits',
        mode: 'expert',
        viewport: { width: 1280, height: 720 },
        routes: ['System Info', 'Settings', 'Audio DNA', 'Report Lab', 'Gameplay Save'],
        stress: { corruptStorage: true, storagePressure: true, buttonStorm: true, buttonStormClicks: 8 }
      },
      {
        id: 'viewport-crusher',
        name: 'Sol',
        focus: 'tiny screens, low-height windows, edge popovers, and responsive crash paths',
        mode: 'simple',
        viewport: { width: 360, height: 640 },
        routes: ['Home', 'Auto Setup', 'Tune', 'Fix Issue', 'Settings'],
        stress: { viewportJitter: true, pandaEdges: true, rapidNav: true }
      },
      {
        id: 'evidence-chaos',
        name: 'Noor',
        focus: 'report/export/save flows, repeated evidence actions, and recovery after messy inputs',
        mode: 'expert',
        viewport: { width: 1280, height: 720 },
        routes: ['Beta Check-in', 'Report Lab', 'Gameplay Save', 'Blind Match', 'Hearing Model'],
        stress: { inputFlood: true, buttonStorm: true, buttonStormClicks: 14, pandaEdges: true }
      }
    ];
  }

  if (profile === 'curious-thinkers') {
    return [
      {
        id: 'invention-skeptic',
        name: 'Iris',
        focus: 'product invention, proof, and "is this actually different?" questions',
        mode: 'expert',
        viewport: { width: 1440, height: 900 },
        routes: ['Control', 'Audio DNA', 'Blind Match', 'Tactical Masking Lab', 'System Info'],
        probes: [
          thinkerProbe({
            routes: ['Control', 'Audio DNA', 'Blind Match', 'Tactical Masking Lab'],
            question: 'Can I tell what CueForge is learning that a normal preset app would not?',
            signals: ['learn', 'evidence', 'confidence', 'profile', 'local'],
            minSignals: 2,
            needsAction: true
          })
        ]
      },
      {
        id: 'live-intelligence-researcher',
        name: 'Rhea',
        focus: 'live intelligence, evidence loops, and whether conclusions are earned',
        mode: 'expert',
        viewport: { width: 1366, height: 768 },
        routes: ['Community Hub', 'Self Test', 'Audio DNA', 'Beta Check-in', 'Report Lab'],
        probes: [
          thinkerProbe({
            routes: ['Community Hub', 'Self Test', 'Audio DNA', 'Beta Check-in', 'Report Lab'],
            question: 'Does this show where the evidence came from and how it becomes a useful decision?',
            signals: ['signal', 'evidence', 'report', 'replay', 'confidence', 'tested'],
            minSignals: 2,
            needsAction: true
          })
        ]
      },
      {
        id: 'setup-chain-detective',
        name: 'Sage',
        focus: 'auto-detect, Windows audio chain, setup shortcuts, and trust boundaries',
        mode: 'expert',
        viewport: { width: 1280, height: 720 },
        routes: ['Auto Detect', 'Driver Layer', 'Game Profiles', 'Mic Lab', 'Settings'],
        probes: [
          thinkerProbe({
            routes: ['Auto Detect', 'Driver Layer', 'Game Profiles', 'Mic Lab', 'Settings'],
            question: 'Can a real Windows player understand what is detected, what is manual, and what is safe?',
            signals: ['detect', 'setup', 'windows', 'browser', 'desktop', 'safe', 'permission', 'routing'],
            minSignals: 2,
            needsAction: true
          })
        ]
      },
      {
        id: 'competitive-flow-strategist',
        name: 'Vex',
        focus: 'FPS usefulness, match flow, game-mode fit, and whether it helps play better',
        mode: 'expert',
        viewport: { width: 1280, height: 720 },
        routes: ['Game Profiles', 'Tactical Masking Lab', 'Blind Match', 'Player Trial', 'Gameplay Save'],
        probes: [
          thinkerProbe({
            routes: ['Game Profiles', 'Tactical Masking Lab', 'Blind Match', 'Player Trial', 'Gameplay Save'],
            question: 'Can I connect this page to a real match decision instead of just a cool lab metric?',
            signals: ['game', 'match', 'footstep', 'comms', 'mask', 'better', 'worse', 'save'],
            minSignals: 2,
            needsAction: true
          })
        ]
      },
      {
        id: 'trust-community-editor',
        name: 'June',
        focus: 'privacy, community feedback, update story, and whether the product feels human',
        mode: 'expert',
        viewport: { width: 390, height: 844 },
        routes: ['Community Hub', 'Report Lab', 'System Info', 'Settings', 'Beta Check-in'],
        probes: [
          thinkerProbe({
            routes: ['Community Hub', 'Report Lab', 'System Info', 'Settings', 'Beta Check-in'],
            question: 'Would I trust this enough to send feedback, and is the community loop clear?',
            signals: ['privacy', 'redact', 'local', 'feedback', 'discord', 'report', 'tester', 'copy'],
            minSignals: 2,
            needsAction: true
          })
        ]
      }
    ];
  }

  return [
    {
      id: 'simple-new-player',
      name: 'Mika',
      focus: 'simple onboarding and first match path',
      mode: 'simple',
      viewport: { width: 1280, height: 720 },
      routes: ['Home', 'Auto Setup', 'Mic Check', 'Tune', 'Sound Match', 'Play Test', 'Fix Issue', 'Settings']
    },
    {
      id: 'expert-lab',
      name: 'Rowan',
      focus: 'expert pages, raw tools, and proof panels',
      mode: 'expert',
      viewport: { width: 1440, height: 900 },
      routes: ['Self Test', 'Audio DNA', 'Masking Lab', 'Calibration', 'EQ Studio', 'Game Profiles', 'Driver Layer', 'Hearing Model', 'System Info']
    },
    {
      id: 'mic-report',
      name: 'Chiefy',
      focus: 'mic analyzer, permissions, reports, and replay readiness',
      mode: 'expert',
      viewport: { width: 1366, height: 768 },
      routes: ['Mic Lab', 'Beta Check-in', 'Report Lab', 'Auto Detect', 'System Info']
    },
    {
      id: 'tuning-hearing',
      name: 'Panda',
      focus: 'Sound Match, hearing model, masking, calibration, and player trial',
      mode: 'expert',
      viewport: { width: 1280, height: 720 },
      routes: ['Blind Match', 'Hearing Model', 'Tactical Masking Lab', 'Auto Calibration', 'Player Trial', 'Gameplay Save']
    },
    {
      id: 'responsive-privacy',
      name: 'Nova',
      focus: 'mobile-style overflow, quiet mode, privacy, and exports',
      mode: 'simple',
      viewport: { width: 390, height: 844 },
      routes: ['Home', 'Settings', 'Fix Issue', 'Auto Setup', 'Sound Match', 'Tune']
    }
  ];
}

function thinkerProbe({
  routes,
  question,
  signals,
  minSignals = 2,
  needsAction = true,
  tag = 'idea',
  panel = 'Curious product probe'
}) {
  return { routes, question, signals, minSignals, needsAction, tag, panel };
}

function sameRoute(expected, actual) {
  const expectedAliases = routeAliases(expected).map(normalizeRouteName);
  const actualName = normalizeRouteName(actual);
  return normalizeRouteName(expected) === actualName || expectedAliases.includes(actualName);
}

function normalizeRouteName(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function routeAliases(route) {
  return {
    Control: ['Control', 'Home'],
    'Community Hub': ['Community Hub'],
    Home: ['Home'],
    'Auto Setup': ['Auto Setup', 'Auto Detect'],
    'Mic Check': ['Mic Check', 'Mic Lab'],
    Tune: ['Tune', 'EQ Studio'],
    'Sound Match': ['Sound Match', 'Blind Match'],
    'Fix Issue': ['Fix Issue', 'Report Lab'],
    Settings: ['Settings'],
    'Self Test': ['Self Test'],
    'Audio DNA': ['Audio DNA'],
    'Masking Lab': ['Masking Lab', 'Tactical Masking Lab'],
    Calibration: ['Calibration', 'Auto Calibration'],
    'EQ Studio': ['EQ Studio', 'Tune'],
    'Game Profiles': ['Game Profiles'],
    'Driver Layer': ['Driver Layer'],
    'Hearing Model': ['Hearing Model'],
    'System Info': ['System Info'],
    'Mic Lab': ['Mic Lab', 'Mic Check'],
    'Beta Check-in': ['Beta Check-in'],
    'Report Lab': ['Report Lab', 'Fix Issue'],
    'Auto Detect': ['Auto Detect', 'Auto Setup'],
    'Blind Match': ['Blind Match', 'Sound Match'],
    'Tactical Masking Lab': ['Tactical Masking Lab', 'Masking Lab'],
    'Auto Calibration': ['Auto Calibration', 'Calibration'],
    'Player Trial': ['Player Trial', 'Play Test'],
    'Gameplay Save': ['Gameplay Save']
  }[route] || [route];
}

function routeIds(route) {
  return {
    Control: ['dashboard'],
    'Community Hub': ['hub'],
    Home: ['dashboard'],
    'Auto Setup': ['detect'],
    'Mic Check': ['mic'],
    Tune: ['eq'],
    'Sound Match': ['blindmatch'],
    'Fix Issue': ['reports'],
    Settings: ['settings'],
    'Self Test': ['selftest'],
    'Audio DNA': ['dna'],
    'Masking Lab': ['masking'],
    Calibration: ['calibration'],
    'EQ Studio': ['eq'],
    'Game Profiles': ['games'],
    'Driver Layer': ['drivers'],
    'Hearing Model': ['hearing'],
    'System Info': ['inventory'],
    'Mic Lab': ['mic'],
    'Beta Check-in': ['beta'],
    'Report Lab': ['reports'],
    'Auto Detect': ['detect'],
    'Blind Match': ['blindmatch'],
    'Tactical Masking Lab': ['masking'],
    'Auto Calibration': ['calibration'],
    'Player Trial': ['trial'],
    'Gameplay Save': ['saves']
  }[route] || [];
}

function routeNeedsExpert(route) {
  const ids = routeIds(route);
  return ids.length > 0 && ids.some((id) => !SIMPLE_ROUTE_IDS.has(id));
}

class CdpSession {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.handlers = new Map();
    this.logs = [];
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

  on(method, handler) {
    if (!this.handlers.has(method)) this.handlers.set(method, []);
    this.handlers.get(method).push(handler);
  }

  handleMessage(event) {
    const message = JSON.parse(event.data);
    if (message.id && this.pending.has(message.id)) {
      const { resolve, reject } = this.pending.get(message.id);
      this.pending.delete(message.id);
      message.error ? reject(new Error(message.error.message)) : resolve(message.result || {});
      return;
    }
    if (message.method && this.handlers.has(message.method)) {
      for (const handler of this.handlers.get(message.method)) handler(message.params || {});
    }
  }

  close() {
    this.socket.close();
  }
}

async function cdpHttp(port, endpoint, options = {}) {
  const response = await fetch(`http://127.0.0.1:${port}${endpoint}`, options);
  if (!response.ok) throw new Error(`CDP HTTP ${response.status}: ${endpoint}`);
  return response.json();
}

async function waitForCdp(port) {
  for (let i = 0; i < 80; i += 1) {
    try {
      await cdpHttp(port, '/json/version');
      return;
    } catch {
      await wait(100);
    }
  }
  throw new Error('Chrome DevTools Protocol did not start.');
}

async function findFreeDebugPort() {
  return 43000 + Math.floor(Math.random() * 12000);
}

function findChrome() {
  const candidates = [
    path.join(process.env.ProgramFiles || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(process.env['ProgramFiles(x86)'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(process.env.ProgramFiles || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(process.env['ProgramFiles(x86)'] || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe')
  ];
  const found = candidates.find((candidate) => candidate && existsSync(candidate));
  if (!found) throw new Error('Chrome or Edge was not found.');
  return found;
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) continue;
    const [key, inlineValue] = arg.slice(2).split('=');
    parsed[key] = inlineValue ?? argv[index + 1] ?? true;
    if (inlineValue === undefined) index += 1;
  }
  return parsed;
}

function createRng(seedText) {
  let state = 2166136261;
  for (const char of String(seedText)) {
    state ^= char.charCodeAt(0);
    state = Math.imul(state, 16777619);
  }
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(items, rng) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function pick(items, rng) {
  return items[Math.floor(rng() * items.length)];
}

function randomInt(rng, min, max) {
  return Math.floor(min + rng() * (max - min + 1));
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

await main();
