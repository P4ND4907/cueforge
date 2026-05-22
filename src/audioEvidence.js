export function createAudioEvidenceSummary({
  durationMs = 0,
  frames = 0,
  rmsTotal = 0,
  peak = 0,
  lowBandTotal = 0,
  voiceBandTotal = 0,
  highBandTotal = 0,
  recordedAt = new Date()
} = {}) {
  const safeFrames = Math.max(1, Number(frames) || 1);
  const avgRms = Number(rmsTotal || 0) / safeFrames;
  const avgLow = Number(lowBandTotal || 0) / safeFrames;
  const avgVoice = Number(voiceBandTotal || 0) / safeFrames;
  const avgHigh = Number(highBandTotal || 0) / safeFrames;
  const level = clamp(Math.round(avgRms * 220), 0, 100);
  const clipRisk = clamp(Math.round(Math.max(0, Number(peak || 0) - 0.72) * 360), 0, 100);
  const noise = clamp(Math.round((avgLow + avgHigh * 0.45) / 2.2), 0, 100);
  const voicePresence = clamp(Math.round(avgVoice / 2.1), 0, 100);

  return {
    schema: 'cueforge.audio-evidence.v1',
    recordedAt: recordedAt instanceof Date ? recordedAt.toISOString() : String(recordedAt),
    durationMs: Math.max(0, Math.round(Number(durationMs) || 0)),
    frames,
    level,
    voicePresence,
    noise,
    clipRisk,
    recommendation: buildEvidenceRecommendation({ level, voicePresence, noise, clipRisk }),
    suggestedTweak: buildSuggestedTweak({ level, voicePresence, noise, clipRisk }),
    privacy: {
      rawAudioIncluded: false,
      uploaded: false,
      localOnly: true
    }
  };
}

export function buildAudioEvidencePacket({ testerId, handle = '', game = '', gear = '', evidence = [], now = new Date() }) {
  return {
    schema: 'cueforge.audio-evidence-packet.v1',
    exportedAt: now.toISOString(),
    testerId,
    handle: String(handle || '').trim().slice(0, 48),
    game: String(game || '').trim().slice(0, 80),
    gear: String(gear || '').trim().slice(0, 140),
    evidence: evidence.slice(-20).map(stripUnsafeEvidenceFields),
    privacy: {
      rawAudioIncluded: false,
      uploaded: false,
      containsPassword: false,
      containsPhone: false,
      containsDob: false,
      containsRawDeviceIds: false
    }
  };
}

function stripUnsafeEvidenceFields(item) {
  return {
    schema: item.schema,
    recordedAt: item.recordedAt,
    durationMs: item.durationMs,
    frames: item.frames,
    level: item.level,
    voicePresence: item.voicePresence,
    noise: item.noise,
    clipRisk: item.clipRisk,
    recommendation: item.recommendation,
    suggestedTweak: item.suggestedTweak,
    privacy: {
      rawAudioIncluded: false,
      uploaded: false,
      localOnly: true
    }
  };
}

function buildEvidenceRecommendation({ level, voicePresence, noise, clipRisk }) {
  if (clipRisk > 20) return 'Mic is clipping. Lower Windows/app mic gain before trusting match feedback.';
  if (noise > 58) return 'Noise floor is high. Try lower gain, better mic placement, or light suppression.';
  if (voicePresence < 22 && level < 18) return 'Voice is too quiet for reliable comms. Raise input gain or move closer.';
  if (voicePresence > 38 && noise < 48 && clipRisk < 10) return 'Mic evidence looks clean enough for a real match check-in.';
  return 'Mic evidence is usable. Compare it with teammate feedback after one match.';
}

function buildSuggestedTweak({ level, voicePresence, noise, clipRisk }) {
  if (clipRisk > 20) return 'Reduce mic gain 5-10%, then record another evidence clip.';
  if (noise > 58) return 'Lower low-band rumble and avoid heavy suppression unless Discord still sounds noisy.';
  if (voicePresence < 22 && level < 18) return 'Increase input gain slightly or move the mic closer before changing EQ.';
  if (voicePresence < 28) return 'Add a small 2k-4k voice clarity lift and retest comms.';
  return 'Keep current mic chain and focus tuning on game cue masking.';
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
