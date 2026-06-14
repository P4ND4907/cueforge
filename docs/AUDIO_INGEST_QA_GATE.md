# Audio Ingest QA Gate

CueForge now has a CI-safe audio ingest contract in `src/core/audioIngestQaGate.js`.

It is meant for local files, generated fixtures, or CI artifacts. It reports metadata and derived metrics only; it does not upload raw audio, normalize files automatically, or change player settings.

## What It Gates

Metadata from `ffprobe`:

- codec
- sample rate
- channel count
- channel layout
- raw bit depth or inferred PCM bit depth

Per-channel metrics from a local probe:

- integrated LUFS
- RMS dBFS
- true peak dBFS
- silence percentage
- channel-pair correlation
- channel-order/pattern checks

Default CueForge policy:

- sample rate: `48000`
- channels: `2`
- allowed codecs: `pcm_s16le`, `pcm_s24le`, `pcm_s32le`, `pcm_f32le`
- bit depth: `16`, `24`, or `32`
- target loudness: `-18 LUFS +/-4`
- true peak ceiling: `-1 dBFS`
- max silence per channel: `35%`
- max stereo correlation: `0.98`

## Plan Command

```powershell
npm.cmd run qa:audio-ingest -- --plan --input captures/match.wav --output-dir qa/audio/tmp/match
```

This prints a `cueforge.audio-ingest-qa-plan.v1` packet with:

- `ffprobe` metadata command
- `ffmpeg` per-channel split commands
- Python loudness probe plan using `soundfile`, `numpy`, and `pyloudnorm`
- CueForge threshold gate
- optional `ffmpeg-normalize` command for explicit repair work

## Evaluation Command

```powershell
npm.cmd run qa:audio-ingest -- --ffprobe-json qa/audio/tmp/match/ffprobe.json --metrics-json qa/audio/tmp/match/metrics.json
```

The metrics JSON shape is:

```json
{
  "channelMetrics": [
    { "channel": "L", "integratedLufs": -18.2, "rmsDbfs": -19, "truePeakDbfs": -1.5, "silencePercent": 1 },
    { "channel": "R", "integratedLufs": -17.8, "rmsDbfs": -18.7, "truePeakDbfs": -1.3, "silencePercent": 1 }
  ],
  "correlations": [
    { "pair": "L/R", "value": 0.42 }
  ],
  "patternChecks": [
    { "id": "left-right-id", "expected": "L then R", "actual": "L then R", "ok": true }
  ]
}
```

The CLI exits `0` when the gate passes and `1` when any metadata or metrics gate fails.

## Tool Notes

- `ffprobe` is the metadata front door because it prints stream information in machine-readable formats.
- `pyloudnorm` is the Python reference path for ITU-R BS.1770-4 integrated loudness.
- `ffmpeg-normalize` is optional repair tooling. CueForge should not normalize automatically as part of QA; it should fail first, explain why, then let a reviewed repair task normalize if needed.

Sources:

- https://ffmpeg.org/ffprobe.html
- https://github.com/csteinmetz1/pyloudnorm
- https://github.com/slhck/ffmpeg-normalize
