import { describe, expect, it } from 'vitest';
import { buildBetaTesterPacket, createBetaCheckIn, createTesterId, summarizeBetaActivity } from './betaCheckIn.js';

describe('beta check-in', () => {
  it('creates stable anonymous tester ids', () => {
    expect(createTesterId(() => 0.25)).toMatch(/^cf-[a-z0-9]{10}$/);
  });

  it('builds proofed check-ins without private fields', () => {
    const checkIn = createBetaCheckIn({
      testerId: 'cf-test00001',
      handle: 'P4ND4907',
      game: 'Tarkov',
      gear: 'IEM + HyperX mic',
      now: new Date('2026-05-22T01:02:03.000Z')
    });

    expect(checkIn.schema).toBe('cueforge.beta-checkin.v1');
    expect(checkIn.proof).toMatch(/^proof-/);
    expect(JSON.stringify(checkIn)).not.toMatch(/password|phone|dob/i);
  });

  it('summarizes real activity by check-ins and unique days', () => {
    const checkIns = [
      createBetaCheckIn({ testerId: 'cf-test00001', game: 'Siege', now: new Date('2026-05-20T01:00:00Z') }),
      createBetaCheckIn({ testerId: 'cf-test00001', game: 'Siege', now: new Date('2026-05-20T02:00:00Z') }),
      createBetaCheckIn({ testerId: 'cf-test00001', game: 'Warzone', now: new Date('2026-05-21T02:00:00Z') })
    ];

    const summary = summarizeBetaActivity(checkIns);
    expect(summary.totalCheckIns).toBe(3);
    expect(summary.uniqueDays).toBe(2);
    expect(summary.latestGame).toBe('Warzone');
  });

  it('exports a privacy-safe beta tester packet', () => {
    const packet = buildBetaTesterPacket({
      testerId: 'cf-test00001',
      checkIns: [
        createBetaCheckIn({ testerId: 'cf-test00001', game: 'CS2', now: new Date('2026-05-21T02:00:00Z') })
      ],
      notes: 'Felt useful for footsteps.',
      now: new Date('2026-05-22T00:00:00Z')
    });

    expect(packet.schema).toBe('cueforge.beta-tester-packet.v1');
    expect(packet.privacy.containsPassword).toBe(false);
    expect(packet.summary.totalCheckIns).toBe(1);
  });
});
