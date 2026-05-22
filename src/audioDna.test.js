import { describe, expect, it } from 'vitest';
import { createAudioDna } from './audioDna.js';

describe('audio dna', () => {
  it('creates a fingerprint from eq and setup state', () => {
    const dna = createAudioDna({
      eq: [-2, -1.5, -0.5, -1, -0.5, 0, 2.8, 3.1, -1.2, -0.5],
      hearingScore: { complete: true },
      micProfile: 'hyperx',
      gameFocus: 'Valorant / CS2',
      deviceStatus: { bridgeLoaded: true, apoFound: true }
    });

    expect(dna.id).toContain('Tactical Cue Hunter');
    expect(dna.id).toContain('HyperX Voice Chain');
    expect(dna.confidence).toBeGreaterThan(80);
    expect(dna.snapshot.cueLift).toBeGreaterThan(2);
  });
});
