import { describe, expect, it } from 'vitest';
import { buildAudioEvidencePacket, createAudioEvidenceSummary } from './audioEvidence.js';

describe('audio evidence', () => {
  it('summarizes mic evidence without raw audio', () => {
    const summary = createAudioEvidenceSummary({
      durationMs: 12000,
      frames: 10,
      rmsTotal: 1.2,
      peak: 0.95,
      lowBandTotal: 700,
      voiceBandTotal: 650,
      highBandTotal: 220,
      recordedAt: new Date('2026-05-22T01:02:03.000Z')
    });

    expect(summary.schema).toBe('cueforge.audio-evidence.v1');
    expect(summary.clipRisk).toBeGreaterThan(20);
    expect(summary.privacy.rawAudioIncluded).toBe(false);
    expect(summary.recommendation).toMatch(/clipping/i);
  });

  it('exports capped privacy-safe evidence packets', () => {
    const evidence = Array.from({ length: 24 }, (_, index) => createAudioEvidenceSummary({
      durationMs: 5000,
      frames: 4,
      rmsTotal: 0.4,
      peak: 0.55,
      recordedAt: new Date(`2026-05-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`)
    }));

    const packet = buildAudioEvidencePacket({
      testerId: 'cf-test00001',
      handle: 'P4ND4907',
      game: 'Siege',
      gear: 'IEM + HyperX mic',
      evidence,
      now: new Date('2026-05-30T00:00:00.000Z')
    });

    expect(packet.schema).toBe('cueforge.audio-evidence-packet.v1');
    expect(packet.evidence).toHaveLength(20);
    expect(packet.privacy.rawAudioIncluded).toBe(false);
    expect(JSON.stringify(packet)).not.toMatch(/blob:|data:audio|9075216032|12251996/i);
  });
});
