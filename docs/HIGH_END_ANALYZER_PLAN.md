# CueForge Analyzer Plan

CueForge now has a local signal analyzer in `src/signalAnalyzer.js`. It runs on Web Audio `AnalyserNode` buffers and turns the live mic stream into a repeatable set of gaming-audio signals:

- level, peak, clipping risk, DC offset, crest factor, and zero-crossing rate
- rumble, bass, low-mid mask, voice body, presence, cue window, sharp edge, and air/noise bands
- spectral centroid, spectral rolloff, spectral flatness, FPS clarity, comms readiness, tuning confidence, and dynamic range
- likely source classification such as input clipping, low-end masking, sharpness fatigue, room/chain noise, voice too quiet, or buried game cue
- a small 10-band EQ nudge that can guide the next tuning step without pretending every issue is an EQ issue

This keeps the browser build useful today while leaving the heavier desktop analyzer path open.

## Open-Source Stack To Build Toward

These are the best-fit tools to study or integrate as CueForge grows:

- [Meyda](https://github.com/meyda/meyda) - MIT JavaScript audio feature extraction. Good candidate for browser-side MFCC, spectral flux, perceptual spread, chroma-style experiments, and validation against our current features.
- [Essentia.js](https://mtg.github.io/essentia.js/) - WebAssembly audio/music analysis with a large algorithm set. Powerful, but licensing must be reviewed carefully before bundling in a public app.
- [FFmpeg filters](https://ffmpeg.org/ffmpeg-filters.html) - desktop/offline reference for `astats`, `ebur128`, `loudnorm`, `silencedetect`, and comparison reports from saved clips.
- [librosa](https://librosa.org/doc/latest/feature.html) - Python research/reference toolkit for spectral centroid, RMS, rolloff, MFCC, mel spectrograms, and offline validation datasets.
- [RNNoise](https://github.com/xiph/rnnoise) - BSD-3-Clause neural noise suppression. Useful later as an optional desktop helper for noise profiling, not as a hidden auto-processing layer.
- [WebRTC VAD](https://chromium.googlesource.com/external/webrtc/stable/src/+/b34066b0ebe4a9adc6df603090afdf6a2b2a986b/common_audio/vad/vad_core.h) - BSD-style voice activity detection logic. Good fit for CPU-light voice/no-voice gating.
- [MDN AnalyserNode docs](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/getByteFrequencyData) - current browser foundation for live frequency buffers.

## CueForge-Specific Direction

The thing that should be ours is not simply "another spectrum analyzer." The unique CueForge analyzer should connect signal evidence to player action:

1. Capture local signal stats.
2. Tell the player whether the problem looks like mic gain, room noise, low-end masking, harshness, buried cue detail, game/server behavior, or routing.
3. Generate a conservative EQ or setup nudge.
4. Run a before/after match check.
5. Save a redacted report that can be replayed later.

That loop is the product: analyze, explain, tune, test, replay.

## Next Build Targets

- Move analyzer math into an AudioWorklet for steadier low-latency sampling.
- Add optional Meyda comparison in development builds to validate spectral features.
- Add desktop-only FFmpeg clip analysis for downloaded evidence clips.
- Add VAD gates so silence does not pollute mic statistics.
- Add analyzer-to-EQ handoff so `eqNudge` can be previewed before applying.
- Add game-session tags so tester reports separate tuning problems from game mix, server timing, Discord, Windows routing, or mic gain.
