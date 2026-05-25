import { describe, expect, it, vi } from 'vitest';
import { createAudioDnaFromState } from './audioDna.js';
import { buildCommunityFeedbackPacket, summarizeCommunityFeedback } from './communityHub.js';
import { buildExportPack } from './exportPack.js';
import { createAudioProfileShare } from './profileShare.js';
import { buildIssueReport } from './reportPack.js';
import { buildCueForgeState } from './core/cueforgeState.js';
import { buildApoExportFromState } from './core/stateAdapters.js';
import { browserDeviceFixture, desktopBridgeFixture } from './data/testFixtures.js';

function buildStateV2() {
  return buildCueForgeState({
    devices: browserDeviceFixture,
    bridgeReport: desktopBridgeFixture,
    eq: [-1, 1, 0, -2, -1, 0, 2, 3, 1, 0],
    game: 'Rainbow Six Siege',
    apoConfig: 'Preamp: -4 dB',
    selfTests: [{ id: 'browser-audio', status: 'pass' }]
  }).stateV2;
}

describe('state-backed feature consumers', () => {
  it('routes Audio DNA, APO export, profile share, setup export, community packet, and reports through state v2', () => {
    const stateV2 = buildStateV2();
    const dna = createAudioDnaFromState(stateV2);
    const apo = buildApoExportFromState(stateV2);
    const profile = createAudioProfileShare({
      bands: [31, 62, 125, 250, 500, '1k', '2k', '4k', '8k', '16k'],
      appUrl: 'https://p4nd4907.github.io/cueforge/',
      cueforgeState: stateV2
    });
    const setupPack = buildExportPack({
      apoConfig: 'Preamp: -4 dB',
      calibration: { eq: stateV2.recommendedProfile.eq },
      dna,
      cueforgeState: stateV2
    });
    const community = buildCommunityFeedbackPacket({
      summary: summarizeCommunityFeedback([]),
      cueforgeState: stateV2,
      now: new Date('2026-05-23T00:00:00.000Z')
    });

    vi.stubGlobal('navigator', { userAgent: 'vitest', mediaDevices: {} });
    vi.stubGlobal('window', { innerWidth: 1280, innerHeight: 720, AudioContext: function AudioContext() {} });
    vi.stubGlobal('localStorage', { setItem: vi.fn(), removeItem: vi.fn() });
    const report = buildIssueReport({
      eq: stateV2.recommendedProfile.eq,
      apoConfig: 'Preamp: -4 dB',
      selectedGame: stateV2.selectedGame.title,
      selectedSourceProfile: stateV2.selectedGame.profileId,
      currentPage: 'reports',
      sample: 'footsteps changed',
      analysis: { clarity: 80 },
      cueforgeState: stateV2
    });
    vi.unstubAllGlobals();

    expect(dna.stateAnchor.consumer).toBe('audio-dna');
    expect(apo.stateAnchor.consumer).toBe('apo-export');
    expect(profile.stateAnchor.consumer).toBe('profile-recommendation');
    expect(setupPack.stateAnchor.consumer).toBe('release-pack');
    expect(setupPack.files['cueforge-state-v2.json']).toContain('recommendedProfile');
    expect(community.stateAnchor.consumer).toBe('discord-feedback-pack');
    expect(report.stateAnchor.consumer).toBe('report-lab');
    expect(report.reproducibleState.cueforgeStateV2.version).toBe('0.2.0-alpha.3');
    expect(report.reproducibleState.cueforgeStateV2.devices.outputType).toBe('dac');
  });
});
