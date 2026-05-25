import { describe, expect, it } from 'vitest';
import { buildExportPack, buildSetupReadme } from './exportPack.js';

describe('export pack', () => {
  it('builds setup instructions and config payloads', () => {
    const apoConfig = 'Preamp: -4.5 dB\nFilter 1: ON PK Fc 31 Hz Gain -1.0 dB Q 1.20';
    const pack = buildExportPack({
      apoConfig,
      calibration: { eq: [-1, 0, 1] },
      hearing: { score: { answered: 2 } },
      dna: { id: 'Tactical Cue Hunter' },
      uiFeedbackNotes: [{ tag: 'layout issue', note: 'button text wraps badly' }],
      shortcuts: [
        { label: 'Download alpha', kind: 'link', value: 'https://example.com/download' },
        { label: 'Private setup code', kind: 'code', value: 'super-secret-code' }
      ]
    });

    expect(pack.files['equalizer-apo-config.txt']).toContain('Filter 1');
    expect(pack.files['calibration.json']).toContain('"eq"');
    expect(pack.files['audio-dna.json']).toContain('Tactical Cue Hunter');
    expect(pack.files['export-fingerprints.json']).toContain('cueforge.export-fingerprints.v1');
    expect(pack.files['ui-feedback-notes.json']).toContain('layout issue');
    expect(pack.files['shortcuts.json']).toContain('Download alpha');
    expect(pack.files['shortcuts.json']).toContain('[locked]');
    expect(pack.files['shortcuts.json']).not.toContain('super-secret-code');
    expect(pack.files['README.txt']).toContain('Open Equalizer APO');
    expect(pack.files['README.txt']).toContain('hashed fingerprints');
    expect(pack.files['README.txt']).toContain('UI feedback notes included: 1');
    expect(pack.files['README.txt']).toContain('Locked code shortcuts redacted: 1');
    expect(pack.privacy).toMatchObject({ localFirst: true, noSilentUpload: true, rawAudioIncluded: false, hashedFingerprints: true });
  });

  it('summarizes missing optional profiles clearly', () => {
    const readme = buildSetupReadme({ apoConfig: 'Preamp: -4.5 dB', calibration: null, hearing: null, dna: null });

    expect(readme).toContain('Hearing profile included: no');
    expect(readme).toContain('Audio DNA included: no');
  });

  it('redacts canonical state exports while keeping hashed correlation', () => {
    const pack = buildExportPack({
      apoConfig: 'Preamp: -1.0 dB',
      calibration: {},
      cueforgeState: {
        devices: {
          output: { label: 'HyperX USB DAC', deviceId: 'USB\\VID_PRIVATE' },
          input: { label: 'USB mic', groupId: 'raw-group-id' }
        },
        chainGraph: {
          edges: [{ from: 'game', to: 'apo', relation: 'processed-by' }]
        }
      }
    });

    expect(pack.files['cueforge-state-v2.json']).toContain('[redacted]');
    expect(pack.files['cueforge-state-v2.json']).not.toContain('USB\\VID_PRIVATE');
    expect(pack.files['cueforge-state-v2.json']).not.toContain('raw-group-id');
    expect(pack.files['export-fingerprints.json']).toMatch(/cfp_[a-f0-9]{20}/);
  });
});
