import { exec as defaultExec } from 'node:child_process';

export const GAME_MAP = Object.freeze({
  'VALORANT-Win64-Shipping.exe': 'valorant',
  'cs2.exe': 'cs2',
  'EscapeFromTarkov.exe': 'tarkov',
  'Overwatch.exe': 'overwatch',
  'Overwatch2.exe': 'overwatch',
  'r5apex.exe': 'apex',
  'FortniteClient-Win64-Shipping.exe': 'fortnite',
  'RainbowSix.exe': 'rainbow-six',
  'cod.exe': 'call-of-duty'
});

const THROTTLE_MS = 10000;

export function parseTasklistCsv(stdout = '', gameMap = GAME_MAP) {
  const lowerOutput = String(stdout || '').toLowerCase();
  for (const [exe, id] of Object.entries(gameMap)) {
    if (lowerOutput.includes(exe.toLowerCase())) {
      return { id, exe };
    }
  }
  return null;
}

export function createRunningGameDetector({
  exec = defaultExec,
  now = () => Date.now(),
  throttleMs = THROTTLE_MS,
  gameMap = GAME_MAP
} = {}) {
  let lastCheck = 0;

  return {
    detectRunningGame() {
      const current = now();
      if (current - lastCheck < throttleMs) return Promise.resolve(null);
      lastCheck = current;

      return new Promise((resolve) => {
        exec('tasklist /fi "STATUS eq RUNNING" /fo csv /nh', { timeout: 1000, windowsHide: true }, (error, stdout) => {
          if (error) {
            resolve(null);
            return;
          }
          resolve(parseTasklistCsv(stdout, gameMap));
        });
      });
    }
  };
}

const detector = createRunningGameDetector();

export function detectRunningGame() {
  return detector.detectRunningGame();
}
