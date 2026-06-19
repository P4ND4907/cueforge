import { describe, expect, it } from 'vitest';
import { createRunningGameDetector, parseTasklistCsv } from '../native/runningGameDetector.js';

describe('running game detector', () => {
  it('parses Windows tasklist CSV without exposing full process lists', () => {
    const game = parseTasklistCsv('"VALORANT-Win64-Shipping.exe","1234","Console","1","420,000 K"\n"Discord.exe","99","Console","1","10 K"');

    expect(game).toMatchObject({
      id: 'valorant',
      exe: 'VALORANT-Win64-Shipping.exe'
    });
  });

  it('throttles tasklist checks to keep game mode lightweight', async () => {
    let calls = 0;
    const detector = createRunningGameDetector({
      now: (() => {
        let value = 10000;
        return () => value;
      })(),
      exec: (command, options, callback) => {
        calls += 1;
        callback(null, '"cs2.exe","7","Console","1","80 K"');
      }
    });

    await expect(detector.detectRunningGame()).resolves.toMatchObject({ id: 'cs2' });
    await expect(detector.detectRunningGame()).resolves.toBe(null);
    expect(calls).toBe(1);
  });
});
