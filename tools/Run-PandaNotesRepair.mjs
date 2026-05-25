#!/usr/bin/env node
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import {
  buildPandaNotesRepairOutput,
  extractUiFeedbackNotesFromPayload,
  formatPandaNotesRepairMarkdown
} from '../src/pandaNotesRepairRunner.js';

const args = parseArgs(process.argv.slice(2));
const cwd = process.cwd();
const outDir = path.resolve(cwd, args.outDir || 'docs/repair');
const explicitInputs = args.input.length ? args.input.map((item) => path.resolve(cwd, item)) : [];
const inputFiles = explicitInputs.length ? explicitInputs : await findDefaultInputs(cwd);

const sources = [];
const allNotes = [];

for (const file of inputFiles) {
  try {
    const payload = JSON.parse(await readFile(file, 'utf8'));
    const notes = extractUiFeedbackNotesFromPayload(payload);
    if (!notes.length) continue;
    sources.push({ file: relativeOrFull(cwd, file), notes: notes.length });
    allNotes.push(...notes);
  } catch (error) {
    sources.push({ file: relativeOrFull(cwd, file), notes: 0, error: error.message });
  }
}

const output = buildPandaNotesRepairOutput({ notes: allNotes, sources });
await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, 'panda-notes-repair-check.json'), JSON.stringify(output.check, null, 2), 'utf8');
await writeFile(path.join(outDir, 'panda-notes-repair-run.json'), JSON.stringify(output, null, 2), 'utf8');
await writeFile(path.join(outDir, 'PANDA_NOTES_REPAIR_QUEUE.md'), formatPandaNotesRepairMarkdown(output), 'utf8');
await writeFile(path.join(outDir, 'PANDA_NOTES_REPAIR_PACKET.txt'), output.packet, 'utf8');

console.log([
  `Panda Notes repair run: ${output.check.status}`,
  `Notes scanned: ${output.check.totalNotes}`,
  `Repair actions: ${output.check.actionCount}`,
  `Output: ${relativeOrFull(cwd, outDir)}`
].join('\n'));

function parseArgs(argv) {
  const parsed = { input: [], outDir: '' };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--input' || arg === '-i') {
      parsed.input.push(argv[index + 1]);
      index += 1;
    } else if (arg === '--out-dir') {
      parsed.outDir = argv[index + 1];
      index += 1;
    }
  }
  return parsed;
}

async function findDefaultInputs(repoRoot) {
  const candidates = [];
  const userProfile = process.env.USERPROFILE || '';
  const downloads = userProfile ? path.join(userProfile, 'Downloads') : '';
  const repoRepair = path.join(repoRoot, 'docs', 'repair');
  const repoReports = path.join(repoRoot, 'docs', 'reports');
  const localAppData = process.env.APPDATA ? path.join(process.env.APPDATA, 'CueForge') : '';

  for (const folder of [downloads, repoRepair, repoReports, localAppData]) {
    if (!folder || !existsSync(folder)) continue;
    candidates.push(...await listCandidateJson(folder));
  }

  return dedupe(candidates).slice(0, 40);
}

async function listCandidateJson(folder) {
  const entries = await readdir(folder, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!/\.json$/i.test(entry.name)) continue;
    if (!/(cueforge|panda|ui-feedback|issue-report|repair)/i.test(entry.name)) continue;
    files.push(path.join(folder, entry.name));
  }
  return files;
}

function dedupe(items) {
  return [...new Set(items.map((item) => path.resolve(item)))];
}

function relativeOrFull(root, target) {
  const resolved = path.resolve(target);
  const relative = path.relative(root, resolved);
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative) ? relative.replaceAll('\\', '/') : resolved;
}

