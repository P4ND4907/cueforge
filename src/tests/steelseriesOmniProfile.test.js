import { describe, expect, it } from 'vitest';
import { buildApoConfigFromFilters, hardwareTargets, localSourceProfiles } from '../audioData.js';

describe('SteelSeries Arctis Nova Pro Omni profile', () => {
  it('keeps the Nova Pro Omni as a route-first starter profile', () => {
    const profile = localSourceProfiles.arctisNovaProOmni;

    expect(profile.name).toBe('SteelSeries Arctis Nova Pro Omni');
    expect(profile.description).toMatch(/GameHub\/Sonar source mix/i);
    expect(profile.description).toMatch(/spatial layer/i);
    expect(buildApoConfigFromFilters(profile)).toContain('Preamp: -1.5 dB');
  });

  it('marks the hardware target as routing proof before tuning', () => {
    const target = hardwareTargets.find((item) => item.name === 'SteelSeries Arctis Nova Pro Omni');

    expect(target).toBeTruthy();
    expect(target.aim).toMatch(/multi-source routing/i);
    expect(target.setup).toMatch(/Game, Chat, Bluetooth, and mic routes/i);
  });
});
