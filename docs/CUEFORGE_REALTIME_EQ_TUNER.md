# CueForge Realtime EQ Tuner

CueForge owns this feature. Any earlier working-name wording should be treated as outdated.

## Goal

The realtime EQ tuner listens to a short game-audio frame and produces safe preview suggestions:

- tame harshness around the upper cue edge
- reduce low-mid masking that hides footsteps and comms
- lift dialogue/cue clarity when the presence band is weak
- block trust in EQ if clipping or DC offset makes the capture unreliable

## Current Status

Implemented as a local-first contract in `src/core/realtimeEqTuner.js`.

The current module can:

- summarize frequency bands from analyzer data
- detect clipping, DC offset, harsh edge, and low-mid masking
- produce preview-only biquad suggestions
- export replay-safe `cueforge.filters.v1` payloads
- emit a dashboard/SDK event shape
- expose an SDK-style client where `apply()` is explicitly disabled

The current module does not:

- capture hidden system audio
- change Windows routing
- write APO, Peace, Sonar, mixer, or driver state
- silently apply presets
- store raw audio

## Live Budget

Default live settings:

- sample rate: `48000`
- FFT size: `512`
- hop size: `256`
- hop time: about `5.33 ms`
- target suggestion budget: `10 ms`

That leaves room for native capture overhead before the player feels delay.

## Event Contract

```js
{
  schema: 'cueforge.diagnostics.event.v1',
  type: 'analysis',
  productName: 'CueForge',
  source: 'cueforge.realtime-eq-tuner',
  mode: 'preview',
  spectrum: {},
  waveform: {},
  flags: [],
  suggestions: [],
  blockers: [],
  latency: {}
}
```

## Export Contract

```js
{
  schema: 'cueforge.filters.v1',
  source: 'cueforge.realtime-eq-tuner',
  productName: 'CueForge',
  mode: 'preview',
  runtimeApply: false,
  noHiddenNativeRouting: true,
  noSilentDriverChanges: true,
  noUnsafePresetBehavior: true,
  replaySafe: true,
  filters: []
}
```

## Next Build Step

Wire this into the Audio Support Hub as a visible "Realtime EQ Preview" panel:

1. take analyzer frames from the desktop capture path
2. show flags first if the capture cannot be trusted
3. show suggested EQ as preview cards
4. require Sound Match and a play-test note before direct apply is ever enabled
5. keep backup/undo visible before any native writer exists
