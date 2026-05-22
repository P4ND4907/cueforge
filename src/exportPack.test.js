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
      uiFeedbackNotes: [{ tag: 'layout issue', note: 'button text wraps badly' }]
    });

    expect(pack.files['equalizer-apo-config.txt']).toContain('Filter 1');
    expect(pack.files['calibration.json']).toContain('"eq"');
    expect(pack.files['audio-dna.json']).toContain('Tactical Cue Hunter');
    expect(pack.files['ui-feedback-notes.json']).toContain('layout issue');
    expect(pack.files['README.txt']).toContain('Open Equalizer APO');
    expect(pack.files['README.txt']).toContain('UI feedback notes included: 1');
  });

  it('summarizes missing optional profiles clearly', () => {
    const readme = buildSetupReadme({ apoConfig: 'Preamp: -4.5 dB', calibration: null, hearing: null, dna: null });

    expect(readme).toContain('Hearing profile included: no');
    expect(readme).toContain('Audio DNA included: no');
  });
});
