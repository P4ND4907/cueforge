#!/usr/bin/env electron
import { app, BrowserWindow, session } from 'electron';
import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const repairDir = path.join(rootDir, 'docs', 'repair');
const debugLogPath = path.join(repairDir, 'human-swarm-qa-debug.log');
const args = parseArgs(process.argv.slice(2));
const durationMs = Number(args.durationMs || args.duration || 10 * 60 * 1000);
const repeat = Math.max(1, Number(args.repeat || 1));
const sourceUrl = args.url || 'http://127.0.0.1:5177/';

const personas = [
  {
    id: 'simple-new-player',
    name: 'Mika',
    focus: 'simple first-run, auto setup, first match path',
    mode: 'simple',
    size: [1280, 760],
    routes: ['Home', 'Auto Setup', 'Mic Check', 'Tune', 'Sound Match', 'Play Test', 'Fix Issue', 'Settings']
  },
  {
    id: 'expert-lab',
    name: 'Rowan',
    focus: 'expert pages, raw tools, system proof',
    mode: 'expert',
    size: [1440, 900],
    routes: ['Self Test', 'Audio DNA', 'Masking Lab', 'Calibration', 'EQ Studio', 'Game Profiles', 'Driver Layer', 'Hearing Model', 'System Info']
  },
  {
    id: 'mic-report',
    name: 'Chiefy',
    focus: 'mic analyzer, permissions, reports, replay readiness',
    mode: 'expert',
    size: [1366, 768],
    routes: ['Mic Lab', 'Beta Check-in', 'Report Lab', 'Auto Detect', 'System Info']
  },
  {
    id: 'tuning-hearing',
    name: 'Panda',
    focus: 'Sound Match, hearing model, masking, calibration',
    mode: 'expert',
    size: [1280, 760],
    routes: ['Blind Match', 'Hearing Model', 'Tactical Masking Lab', 'Auto Calibration', 'Player Trial', 'Gameplay Save']
  },
  {
    id: 'responsive-privacy',
    name: 'Nova',
    focus: 'mobile overflow, quiet mode, exports, privacy wording',
    mode: 'simple',
    size: [390, 844],
    routes: ['Home', 'Settings', 'Fix Issue', 'Auto Setup', 'Sound Match', 'Tune']
  }
];

app.commandLine.appendSwitch('disable-features', 'AutofillServerCommunication');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.disableHardwareAcceleration();

await mkdir(repairDir, { recursive: true });
await debugLog('boot');

process.on('unhandledRejection', async (error) => {
  await debugLog(`unhandled rejection: ${error?.stack || error}`);
  app.exit(1);
});

process.on('uncaughtException', async (error) => {
  await debugLog(`uncaught exception: ${error?.stack || error}`);
  app.exit(1);
});

setTimeout(async () => {
  await debugLog('hard timeout reached');
  app.exit(3);
}, Math.max(45000, durationMs * repeat + 90000));

await app.whenReady();
await debugLog('app ready');

try {
  const allRuns = [];
  for (let runIndex = 0; runIndex < repeat; runIndex += 1) {
    allRuns.push(await runSwarm({ runIndex }));
  }
  await writeOutputs(allRuns);
  const failedRuns = allRuns.filter((run) => run.summary.failures > 0 || run.summary.finalConsoleIssues > 0);
  await debugLog(`complete: ${allRuns.length}/${repeat} run(s)`);
  console.log(`Human swarm QA complete: ${allRuns.length}/${repeat} run(s).`);
  console.log(`Notes: ${allRuns.reduce((sum, run) => sum + run.notes.length, 0)}`);
  console.log(`Failures/friction routes: ${allRuns.reduce((sum, run) => sum + run.summary.failures, 0)}`);
  app.exit(failedRuns.length ? 2 : 0);
} catch (error) {
  await debugLog(`fatal: ${error?.stack || error}`);
  console.error(error);
  app.exit(1);
}

async function runSwarm({ runIndex }) {
  await debugLog(`run ${runIndex + 1} starting`);
  console.log(`Starting human swarm run ${runIndex + 1}/${repeat} for ${(durationMs / 60000).toFixed(2)} minute(s).`);
  const startedAt = new Date();
  const endAt = Date.now() + durationMs;
  const notes = [];
  const fallbackNotes = [];
  const personaResults = await Promise.all(personas.map((persona, personaIndex) => runPersona({
    persona,
    personaIndex,
    runIndex,
    endAt,
    notes,
    fallbackNotes
  })));

  const summary = {
    schema: 'cueforge.human-swarm-qa-run.v1',
    runIndex: runIndex + 1,
    startedAt: startedAt.toISOString(),
    completedAt: new Date().toISOString(),
    requestedDurationMs: durationMs,
    elapsedMs: Date.now() - startedAt.getTime(),
    personaCount: personas.length,
    routeRuns: personaResults.reduce((sum, result) => sum + result.routesRun, 0),
    failures: personaResults.reduce((sum, result) => sum + result.failures, 0),
    notesCreated: notes.length,
    notesSavedViaUi: personaResults.reduce((sum, result) => sum + result.notesSavedViaUi, 0),
    fallbackNoteSaveFailures: fallbackNotes.length,
    finalConsoleIssues: personaResults.reduce((sum, result) => sum + result.finalConsoleIssues, 0)
  };

  return {
    summary,
    personas: personaResults,
    notes,
    fallbackNotes
  };
}

async function runPersona({ persona, personaIndex, runIndex, endAt, notes, fallbackNotes }) {
  await debugLog(`persona ${persona.name} starting`);
  console.log(`Persona ${persona.name} starting: ${persona.focus}`);
  const userSession = session.fromPartition(`persist:cueforge-qa-${runIndex}-${persona.id}`);
  userSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(['media', 'audioCapture'].includes(permission));
  });

  const [width, height] = persona.size;
  const win = new BrowserWindow({
    width,
    height,
    show: false,
    backgroundColor: '#071314',
    webPreferences: {
      partition: `persist:cueforge-qa-${runIndex}-${persona.id}`,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  const result = {
    id: persona.id,
    name: persona.name,
    focus: persona.focus,
    mode: persona.mode,
    viewport: { width, height },
    routesRun: 0,
    failures: 0,
    notesSavedViaUi: 0,
    finalConsoleIssues: 0,
    actions: []
  };

  const consoleIssues = [];
  win.webContents.on('console-message', (_event, level, message) => {
    if (level >= 2 && !/Autofill|ERR_BLOCKED_BY_CLIENT/i.test(message)) consoleIssues.push(message);
  });

  await loadCueForge(win, `${sourceUrl}?qa=human-swarm-${runIndex + 1}-${persona.id}`);
  await debugLog(`persona ${persona.name} loaded`);
  console.log(`Persona ${persona.name} loaded.`);
  await wait(300);
  await setMode(win, persona.mode);

  let routeIndex = personaIndex;
  while (Date.now() < endAt) {
    const route = persona.routes[routeIndex % persona.routes.length];
    const action = await runRoute(win, persona, route);
    result.actions.push(action);
    result.routesRun += 1;
    if (!action.ok) result.failures += 1;
    for (const note of action.notes) {
      notes.push(note);
      if (await leavePandaNote(win, note)) {
        result.notesSavedViaUi += 1;
      } else {
        fallbackNotes.push(note);
      }
    }
    routeIndex += 1;
    if (result.routesRun % 8 === 0) console.log(`Persona ${persona.name}: ${result.routesRun} routes, ${result.failures} friction route(s).`);
    await wait(550 + personaIndex * 120);
  }

  result.finalConsoleIssues = consoleIssues.length;
  result.finalConsoleMessages = consoleIssues.slice(0, 10);
  win.close();
  await debugLog(`persona ${persona.name} complete: ${result.routesRun} routes, ${result.failures} friction routes`);
  return result;
}

async function loadCueForge(win, url) {
  try {
    await withTimeout(win.loadURL(url), 12000, `Timed out loading ${url}`);
  } catch {
    const distIndex = path.join(rootDir, 'dist', 'index.html');
    if (!existsSync(distIndex)) throw new Error(`Could not load ${url}, and dist/index.html is missing.`);
    await withTimeout(win.loadURL(`${pathToFileURL(distIndex).href}?qa=human-swarm-file`), 12000, 'Timed out loading dist/index.html');
  }
}

async function runRoute(win, persona, route) {
  const started = Date.now();
  const notes = [];
  const actionLog = [];
  await setMode(win, persona.mode);
  const nav = await clickRoute(win, route);
  if (!nav.ok) {
    notes.push(makeNote({ persona, page: route, tag: 'confusing', note: nav.reason, panel: 'Navigation' }));
    return { route, page: route, ok: false, durationMs: Date.now() - started, actionLog, notes };
  }

  await wait(160);
  const before = await pageHealth(win);
  notes.push(...healthNotes({ persona, page: nav.used, health: before, phase: 'Open' }));
  const actions = await routeActions(win);
  for (const button of actions.slice(0, 4)) {
    const click = await clickButton(win, button);
    actionLog.push(click.ok ? `clicked ${button}` : `skipped ${button}`);
    await wait(90);
  }
  const after = await pageHealth(win);
  notes.push(...healthNotes({ persona, page: nav.used, health: after, phase: 'After interaction' }));

  return {
    route,
    page: nav.used,
    ok: notes.length === 0,
    durationMs: Date.now() - started,
    actionLog,
    notes
  };
}

async function setMode(win, mode) {
  await win.webContents.executeJavaScript(`
    (() => {
      const desired = ${JSON.stringify(mode)};
      const buttonText = desired === 'expert' ? 'Expert' : 'Simple';
      const button = [...document.querySelectorAll('button')].find((item) => item.textContent.trim() === buttonText);
      if (button) button.click();
      return true;
    })()
  `);
  await wait(90);
}

async function clickRoute(win, route) {
  const aliases = routeAliases(route);
  return win.webContents.executeJavaScript(`
    (() => {
      const aliases = ${JSON.stringify(aliases)};
      const buttons = [...document.querySelectorAll('button')];
      for (const label of aliases) {
        const button = buttons.find((item) => item.textContent.trim() === label);
        if (button) {
          button.click();
          return { ok: true, used: label };
        }
      }
      return { ok: false, reason: 'Could not find route button: ' + aliases.join(' / ') };
    })()
  `);
}

async function clickButton(win, label) {
  return win.webContents.executeJavaScript(`
    (() => {
      const label = ${JSON.stringify(label)};
      const buttons = [...document.querySelectorAll('button')];
      const button = buttons.find((item) => item.textContent.trim() === label);
      if (!button || button.disabled) return { ok: false, reason: button ? 'disabled' : 'missing' };
      button.click();
      return { ok: true };
    })()
  `);
}

async function pageHealth(win) {
  return win.webContents.executeJavaScript(`
    (() => ({
      h1: document.querySelector('h1')?.textContent?.trim() || '',
      bodyLength: document.body.textContent.length,
      mounted: Boolean(document.querySelector('#root')?.children?.length),
      overlay: /vite|react|error overlay|stack trace/i.test(document.body.textContent),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
      mode: document.querySelector('.mode-badge')?.textContent?.trim() || '',
      buttonCount: document.querySelectorAll('button').length
    }))()
  `);
}

async function routeActions(win) {
  return win.webContents.executeJavaScript(`
    (() => {
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
    })()
  `);
}

async function leavePandaNote(win, note) {
  try {
    await setMode(win, 'expert');
    return await win.webContents.executeJavaScript(`
      (() => {
        const main = document.querySelector('main') || document.body;
        const target = document.querySelector('.panel') || main;
        target.dispatchEvent(new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          clientX: Math.round(window.innerWidth * 0.55),
          clientY: Math.round(window.innerHeight * 0.55)
        }));
        const textarea = document.querySelector('.ui-note-popover textarea');
        if (!textarea) return false;
        textarea.value = ${JSON.stringify(note.note)};
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        const select = document.querySelector('.ui-note-popover select');
        if (select) {
          select.value = ${JSON.stringify(note.tag)};
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const save = [...document.querySelectorAll('.ui-note-popover button')].find((button) => button.textContent.trim() === 'Save note');
        if (!save) return false;
        save.click();
        return true;
      })()
    `);
  } catch {
    return false;
  }
}

function healthNotes({ persona, page, health, phase }) {
  const notes = [];
  if (!health.mounted || health.bodyLength < 250) {
    notes.push(makeNote({ persona, page, tag: 'broken', note: `${phase}: app looked blank or not mounted.`, panel: 'Page health' }));
  }
  if (health.overlay) {
    notes.push(makeNote({ persona, page, tag: 'broken', note: `${phase}: possible framework error overlay text appeared.`, panel: 'Page health' }));
  }
  if (health.overflow) {
    notes.push(makeNote({ persona, page, tag: 'layout issue', note: `${phase}: horizontal overflow at ${persona.size[0]}x${persona.size[1]}.`, panel: 'Responsive layout' }));
  }
  return notes;
}

function makeNote({ persona, page, tag = 'confusing', note, panel }) {
  const [width, height] = persona.size;
  return {
    schema: 'cueforge.ui-feedback-note.v1',
    id: `swarm-${persona.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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
      tagName: 'automated-ui',
      panel: String(panel || '').slice(0, 80)
    },
    viewport: {
      width,
      height,
      xPercent: 55,
      yPercent: 55
    }
  };
}

function routeAliases(route) {
  return {
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

async function writeOutputs(runs) {
  await mkdir(repairDir, { recursive: true });
  const allNotes = runs.flatMap((run) => run.notes);
  const allFallbackNotes = runs.flatMap((run) => run.fallbackNotes);
  const resultsPath = path.join(repairDir, 'cueforge-human-swarm-qa-results.json');
  const notesPath = path.join(repairDir, 'cueforge-human-swarm-ui-feedback-notes.json');
  const markdownPath = path.join(repairDir, 'HUMAN_SWARM_QA_RUN.md');

  await writeFile(notesPath, JSON.stringify(allNotes, null, 2), 'utf8');
  await writeFile(resultsPath, JSON.stringify({
    schema: 'cueforge.human-swarm-qa.v1',
    generatedAt: new Date().toISOString(),
    repeat,
    durationMs,
    runs,
    allFallbackNotes
  }, null, 2), 'utf8');
  await writeFile(markdownPath, formatMarkdown(runs, {
    resultsPath,
    notesPath
  }), 'utf8');
}

function formatMarkdown(runs, files) {
  const totalNotes = runs.reduce((sum, run) => sum + run.notes.length, 0);
  const totalRoutes = runs.reduce((sum, run) => sum + run.summary.routeRuns, 0);
  const totalFailures = runs.reduce((sum, run) => sum + run.summary.failures, 0);
  const lines = [
    '# Human Swarm QA Run',
    '',
    `Runs: ${runs.length}`,
    `Duration per run: ${(durationMs / 60000).toFixed(2)} minutes`,
    `Personas per run: ${personas.length}`,
    `Route runs: ${totalRoutes}`,
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
    lines.push('');
    lines.push(`- Routes: ${run.summary.routeRuns}`);
    lines.push(`- Notes: ${run.notes.length}`);
    lines.push(`- Notes saved through UI: ${run.summary.notesSavedViaUi}`);
    lines.push(`- Final console issues: ${run.summary.finalConsoleIssues}`);
    lines.push('');
    for (const persona of run.personas) {
      lines.push(`- ${persona.name}: ${persona.routesRun} routes, ${persona.failures} friction route(s), ${persona.notesSavedViaUi} UI note(s).`);
    }
    lines.push('');
  }

  lines.push('## Notes');
  lines.push('');
  if (!totalNotes) {
    lines.push('No failures or friction notes were created.');
  } else {
    runs.flatMap((run) => run.notes).forEach((note, index) => {
      lines.push(`${index + 1}. [${note.tag}] ${note.page} / ${note.target.panel || note.target.label}: ${note.note}`);
    });
  }
  lines.push('', '## Files', '');
  lines.push(`- ${path.relative(rootDir, files.resultsPath).replaceAll('\\', '/')}`);
  lines.push(`- ${path.relative(rootDir, files.notesPath).replaceAll('\\', '/')}`);
  return `${lines.join('\n')}\n`;
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

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout(promise, ms, message) {
  let timeout;
  return Promise.race([
    promise.finally(() => clearTimeout(timeout)),
    new Promise((_resolve, reject) => {
      timeout = setTimeout(() => reject(new Error(message)), ms);
    })
  ]);
}

async function debugLog(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  try {
    await appendFile(debugLogPath, line, 'utf8');
  } catch {
    // Ignore debug log failures; the QA run should still report through stdout.
  }
}
