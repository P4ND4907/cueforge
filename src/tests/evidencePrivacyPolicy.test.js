import { describe, expect, it } from 'vitest';
import {
  evidencePrivacyBlock,
  findEvidencePrivacyLeaks,
  redactPublicEvidenceText,
  validateEvidencePrivacyPosture
} from '../core/evidencePrivacyPolicy.js';

describe('evidence privacy policy', () => {
  it('redacts public evidence text and blocks raw identity leaks', () => {
    const text = redactPublicEvidenceText(
      'handle: P4ND4907 email test@example.com phone 555-123-4567 path C:\\Users\\carls\\Audio\\clip.wav raw device id abc123 data:audio/wav;base64,abc'
    );

    expect(text).toContain('[redacted-username]');
    expect(text).toContain('[redacted-email]');
    expect(text).toContain('[redacted-phone]');
    expect(text).toContain('[redacted-path]');
    expect(text).toContain('[redacted-id]');
    expect(text).toContain('[redacted-audio]');
    expect(findEvidencePrivacyLeaks(text)).toEqual([]);
  });

  it('requires local summaries, opt-in uploads, and a protected playback boundary', () => {
    const packet = {
      schema: 'cueforge.public-evidence.v1',
      level: 70,
      clipRisk: 3,
      privacy: evidencePrivacyBlock()
    };

    expect(validateEvidencePrivacyPosture(packet)).toEqual({
      ok: true,
      failures: [],
      leaks: []
    });

    const unsafe = {
      ...packet,
      rawAudioUrl: 'data:audio/wav;base64,abc',
      privacy: {
        ...packet.privacy,
        uploadsOptInOnly: false,
        rawAudioIncluded: true,
        protectedPlaybackUniversalCapture: true
      }
    };

    expect(validateEvidencePrivacyPosture(unsafe).ok).toBe(false);
    expect(validateEvidencePrivacyPosture(unsafe).failures.join(' ')).toMatch(/opt-in|raw audio|Protected playback/i);
  });
});
