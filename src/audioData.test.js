import { describe, expect, it } from 'vitest';
import { buildApoConfigFromFilters, localSourceProfiles } from './audioData.js';

describe('local source audio profiles', () => {
  it('exports the Generic IEM FPS profile as Equalizer APO text', () => {
    const config = buildApoConfigFromFilters(localSourceProfiles.iemFps);

    expect(config).toContain('Preamp: -5.5 dB');
    expect(config).toContain('Filter 3: ON PK Fc 2200 Hz Gain 1.5 dB Q 1.10');
    expect(config).toContain('Filter 5: ON PK Fc 7800 Hz Gain -1.2 dB Q 2.00');
  });

  it('keeps Valorant process names available for future native detection', () => {
    expect(localSourceProfiles.valorant.processes).toContain('VALORANT-Win64-Shipping.exe');
    expect(localSourceProfiles.valorant.filters).toHaveLength(3);
  });
});
