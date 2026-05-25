import { createBlindMatchResult } from '../../blindMatch.js';

export function runBlindMatchFixture(baseEq: number[] = Array(10).fill(0)) {
  return createBlindMatchResult({
    footstep_vs_comfort: 'a',
    bass_vs_comms: 'b',
    wide_vs_center: 'b'
  }, baseEq);
}
