# CueForge Platform Notes

CueForge is a Windows-first gaming audio control center for IEMs, headsets, microphones, and Equalizer APO workflows.

## Product Pillars

- Fast self-test so the user knows what works before tuning.
- Live mic feedback for level, voice presence, noise, and clipping.
- IEM/headphone checks for channel balance, center image, and harsh frequency sweeps.
- Personal hearing model that creates a gentle compensation overlay.
- Autotune and Audio DNA so profiles become repeatable instead of random slider guessing.
- Explicit exports for Equalizer APO, Peace, Sonar, and future native desktop workflows.

## Platform Boundary

The browser build is intentionally controlled: it can detect, test, generate, and export. Native apply flows should live in a desktop shell with clear user approval before writing audio config.

## Current Decision

Keep the web build as the stable tester and GitHub version. Build a desktop shell only for native Windows actions such as endpoint scanning, config backup/write, and routing helpers.

## Sound-Scene Intelligence Direction

CueForge should become a local sound-scene intelligence engine, not just a gaming EQ panel.

The new file-analysis lane starts with WAV evidence:

```text
WAV -> PCM -> STFT / FFT -> band energy -> transient score -> stereo pan/width -> detector -> temporal evidence -> echo-scene inference -> coach
```

The next native lane is Windows WASAPI loopback. Endpoint loopback can capture the rendered output mix; process-specific loopback is the safer later target for game-only capture. Both must stay opt-in and local.
