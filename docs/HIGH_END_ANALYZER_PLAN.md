# CueForge Analyzer Plan

CueForge now has a local signal analyzer in `src/signalAnalyzer.js` and an opt-in evidence recorder in `Beta Check-in`. The live analyzer runs on Web Audio `AnalyserNode` buffers and turns the mic stream into a repeatable set of gaming-audio signals:

- level, peak, clipping risk, DC offset, crest factor, and zero-crossing rate
- rumble, bass, low-mid mask, voice body, presence, cue window, sharp edge, and air/noise bands
- spectral centroid, spectral rolloff, spectral flatness, FPS clarity, comms readiness, tuning confidence, and dynamic range
- likely source classification such as input clipping, low-end masking, sharpness fatigue, room/chain noise, voice too quiet, or buried game cue
- a small 10-band EQ nudge that can guide the next tuning step without pretending every issue is an EQ issue

The evidence recorder captures a short local clip only after the tester presses record, stores capped metadata locally, and never uploads raw audio by itself. This keeps the browser build useful today while leaving the heavier desktop analyzer path open.

## Open-Source Stack To Build Toward

The product-level integration contract now lives in [Open-Source Stack](OPEN_SOURCE_STACK.md) and `src/data/openSourceStack.js`. That registry separates tools CueForge can use now from tools that belong in the browser DSP layer, native helper stage, or future game/middleware integration tier.

These are the best-fit tools to study or integrate as CueForge grows:

- [Equalizer APO](https://sourceforge.net/projects/equalizerapo/) - current Windows EQ handoff target. CueForge should keep exporting readable APO configs while using Chain Graph to verify the endpoint before a player applies anything.
- [AutoEq](https://github.com/jaakkopasanen/AutoEq) - baseline headphone/IEM data. Use as the hardware starting point before hearing model, Sound Match, masking, and safety clamps personalize the profile.
- [Playwright visual comparisons](https://playwright.dev/docs/test-snapshots) - default UI regression layer for the guided flow, command center, Chain Graph, Player Trial, and mobile/desktop overflow checks.
- [Meyda](https://github.com/meyda/meyda) - MIT JavaScript audio feature extraction. Good candidate for browser-side MFCC, spectral flux, perceptual spread, chroma-style experiments, and validation against our current features.
- [Essentia.js](https://mtg.github.io/essentia.js/) - WebAssembly audio/music analysis with a large algorithm set. Powerful, but licensing must be reviewed carefully before bundling in a public app.
- [FFmpeg filters](https://ffmpeg.org/ffmpeg-filters.html) - desktop/offline reference for `astats`, `ebur128`, `loudnorm`, `silencedetect`, and comparison reports from saved clips.
- [librosa](https://librosa.org/doc/latest/feature.html) - Python research/reference toolkit for spectral centroid, RMS, rolloff, MFCC, mel spectrograms, and offline validation datasets.
- [RNNoise](https://github.com/xiph/rnnoise) - BSD-3-Clause neural noise suppression. Useful later as an optional desktop helper for noise profiling, not as a hidden auto-processing layer.
- [NAudio](https://github.com/naudio/NAudio) - Windows-first helper candidate for endpoint/session/WASAPI evidence behind the native helper manifest.
- [miniaudio](https://github.com/mackron/miniaudio) - compact native DSP sandbox candidate for offline render, tone, PEQ, limiter, and latency experiments.
- [Steam Audio](https://valvesoftware.github.io/steam-audio/) - future spatial research or game/middleware integration tier. Do not claim true post-mix occlusion from a normal stereo mix.
- [WebRTC VAD](https://chromium.googlesource.com/external/webrtc/stable/src/+/b34066b0ebe4a9adc6df603090afdf6a2b2a986b/common_audio/vad/vad_core.h) - BSD-style voice activity detection logic. Good fit for CPU-light voice/no-voice gating.
- [MDN AnalyserNode docs](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/getByteFrequencyData) - current browser foundation for live frequency buffers.
- [MDN OfflineAudioContext](https://developer.mozilla.org/en-US/docs/Web/API/OfflineAudioContext) and [AudioWorkletGlobalScope](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletGlobalScope) - browser DSP infrastructure for deterministic render tests and future lower-latency analyzer processing.

## CueForge-Specific Direction

The thing that should be ours is not simply "another spectrum analyzer." The unique CueForge analyzer should connect signal evidence to player action:

1. Capture local signal stats.
2. Tell the player whether the problem looks like mic gain, room noise, low-end masking, harshness, buried cue detail, game/server behavior, or routing.
3. Generate a conservative EQ or setup nudge.
4. Run a before/after match check.
5. Save a redacted report that can be replayed later.

That loop is the product: analyze, explain, tune, test, replay.

## Audio Metrics Engine

`src/engine/audioMetricsEngine.js` is the shared proof layer for clips, fixtures, and future native captures. It splits analysis into four buckets so CueForge can prove a tuning change instead of merely making the sound louder:

| Metric bucket | What it proves | Recommended implementation |
| --- | --- | --- |
| Chain integrity | Signal present, no mute/silence, no obvious flattened/double-processing hint | FFmpeg `astats`, `silencedetect`, and CueForge sanity checks |
| Loudness / dynamics | Preamp safety, clipping risk, loudness consistency, crest factor | FFmpeg `ebur128`, `astats`, and `libebur128` reference behavior |
| Spectral / EQ behavior | Intended cue-region, masking, or comfort-band changes actually happened | FFT, spectral delta, and band energy analysis |
| Spatial / stereo health | Phase, mono collapse, channel inversion, balance, and latency skew | FFmpeg `aphasemeter`, `axcorrelate`, impulse/chirp correlation |

The current implementation has deterministic JS fallbacks for CI and browser-safe fixtures. FFmpeg/libebur128 stay as desktop/offline reference backends for user-selected clips and explicit bounded captures.

## v0.3 Real WAV Feature Extractor

The simulated/deterministic feature path is no longer enough by itself. CueForge now has a real WAV analysis foundation:

- `src/wavFeatureExtractor.js` parses RIFF/WAVE files and decodes PCM / IEEE float samples.
- The extractor runs STFT / FFT over PCM frames.
- It measures band energy, transient score, stereo pan, stereo width, spectral features, and signal-detector output.
- It feeds `src/echoSceneInference.js` and `src/engine/temporalEvidenceAccumulator.js`.
- It returns a coach packet with a conservative EQ decision.

This is still post-mix inference. It does not claim true game object position, source labels, map geometry, or engine occlusion values unless CueForge receives metadata, surround/object input, or validated inference.

## Next Build Targets

- Move analyzer math into an AudioWorklet for steadier low-latency sampling.
- Add optional Meyda comparison in development builds to validate spectral features.
- Add desktop-only FFmpeg clip analysis for downloaded evidence clips or local user-selected files.
- Wire optional local clips and native captures into `audioMetricsEngine` before they affect recommendations.
- Add VAD gates so silence does not pollute mic statistics.
- Add analyzer-to-EQ handoff so `eqNudge` can be previewed before applying.
- Add game-session tags so tester reports separate tuning problems from game mix, server timing, Discord, Windows routing, or mic gain.
- Add WAV Import UI using `extractWavFeatures`.
- Add golden WAV fixture labels, precision/recall, false positive rate, and latency p95.
- Add WASAPI endpoint loopback only after file analysis is stable.
