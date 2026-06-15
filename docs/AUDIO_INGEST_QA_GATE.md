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

## Manifest Command

Use the manifest mode when CueForge has multiple exports to gate:

```powershell
npm.cmd run qa:audio-ingest:manifest
```

Equivalent explicit command:

```powershell
npm.cmd run qa:audio-ingest -- --manifest qa/audio/export-manifest.json --output-dir qa/audio/ci --summary-json qa/audio/ci/audio-ingest-summary.json
```

The manifest lives at `qa/audio/export-manifest.json` and currently covers:

- required CI stereo fixture
- Sound Match preview exports
- learned EQ preview exports
- OBS or stream audio check exports
- headset/IEM test tones
- voice/comms test clips

Missing required files fail the run. Missing optional files are reported as skipped until a real export exists. Every checked file writes derived JSON under the selected output directory:

- `ffprobe.json`
- `metrics.json`
- `result.json`
- `audio-ingest-summary.json`

The reusable Python probe is `tools/Measure-AudioIngestMetrics.py`. It emits LUFS, RMS dBFS, true peak, silence percentage, channel correlation, and stereo distinctness checks without serializing raw audio.

## GitHub Actions Gate

The merge gate lives at `.github/workflows/audio-ingest-qa.yml`.

It runs on pull requests, pushes to `main`, and manual dispatch. The workflow:

- installs Node dependencies with `npm ci`
- installs FFmpeg and ffprobe with `FedericoCarboni/setup-ffmpeg@v3`
- installs Python audio metrics dependencies: `numpy`, `soundfile`, and `pyloudnorm`
- generates a deterministic stereo WAV fixture
- runs `npm run qa:audio-ingest -- --manifest qa/audio/export-manifest.json --output-dir qa/audio/ci --summary-json qa/audio/ci/audio-ingest-summary.json`
- uploads the JSON evidence as a GitHub Actions artifact

The fixture is synthetic and local to the runner. The artifact contains derived JSON only, not raw audio.

## Tool Notes

- `ffprobe` is the metadata front door because it prints stream information in machine-readable formats.
- `pyloudnorm` is the Python reference path for ITU-R BS.1770-4 integrated loudness.
- `ffmpeg-normalize` is optional repair tooling. CueForge should not normalize automatically as part of QA; it should fail first, explain why, then let a reviewed repair task normalize if needed.

Sources:

- https://ffmpeg.org/ffprobe.html
- https://github.com/marketplace/actions/setup-ffmpeg
- https://github.com/csteinmetz1/pyloudnorm
- https://github.com/slhck/ffmpeg-normalize
