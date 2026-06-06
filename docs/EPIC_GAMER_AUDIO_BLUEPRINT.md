# CueForge Epic Gamer Audio Blueprint

This document imports the uploaded `cueforge-epic-app-blueprint.zip` into CueForge as a tested product contract. It should not become a disconnected app or a second source of truth. The implementation contract lives in:

- `src/data/epicGamerAudioBlueprint.js`
- `src/tests/epicGamerAudioBlueprint.test.js`

## Product promise

CueForge should become a Windows-first gamer audio command center that can:

- detect devices, companion apps, enhancers, and risky routing layers;
- expose working channel controls for Game, Voice, Mic, Music, Browser, Stream Mix, and Headphones Output;
- recommend safe gamer presets without stacking hidden enhancers;
- explain conflicts such as double EQ, double spatial audio, stacked noise suppression, clipping, bass masking, and latency risk;
- prove changes through Machine Play Lab / Bench Center before asking users to trust the result;
- keep reports, diagnostics, device evidence, and audio evidence local and redacted unless the user exports them.

## Channel model

| Channel | Role | Default route | Main job |
|---|---|---|---|
| Game | Source | Headphones + Stream Mix | Prioritize game cues without damaging headroom, comfort, or stream safety. |
| Voice / Discord | Source | Headphones + Stream Mix | Keep teammate comms clear, centered, and separated from game impact. |
| Mic | Capture | Voice Apps + Stream Mix | Build a Discord/OBS-safe mic chain without stacking suppressors. |
| Music | Source | Headphones + Stream Mix | Keep music under game and voice while preserving vibe. |
| Browser | Source | Headphones + Stream Mix | Make guides, videos, clips, and web audio controllable. |
| Stream Mix | Bus | OBS | Produce a limiter-backed viewer-safe mix. |
| Headphones Output | Output | Player | Deliver the player mix with one clear spatial policy. |

Every visible control must either work, persist, and change a graph/state value, or be disabled with a clear reason. Do not ship fake enabled buttons.

## Control contract

Each channel should use the shared control contract in `epicGamerAudioBlueprint.js`:

- gain;
- mute;
- solo where useful;
- EQ;
- compressor;
- limiter;
- noise gate for mic;
- clipping indicator;
- latency meter where route timing matters;
- spatial policy on the output;
- loudness target on the stream bus.

## Starter presets

Starter presets:

- FPS Competitive;
- Battle Royale;
- Cinematic;
- Streamer;
- Night Mode;
- Safe Hearing Mode.

Rules:

- Every starter preset must require a limiter.
- Safe Hearing Mode must cap gain conservatively and keep limiter ceiling low.
- FPS Competitive must default to safe stereo until detection/testing proves a spatial layer is safe.
- Streamer mode must keep Stream Mix clipping protection active.
- Cinematic mode must not secretly enable competitive footstep boost.

## Enhancer detection targets

CueForge should detect and explain:

- Windows Sonic;
- Dolby Atmos;
- DTS Headphone:X;
- SteelSeries Sonar;
- Equalizer APO;
- Peace EQ;
- Voicemeeter;
- OBS;
- NVIDIA Broadcast;
- AMD Noise Suppression;
- Discord Noise Suppression.

Each target should be shown as one of:

- Not Detected;
- Detected;
- Linked;
- Recommended Routing;
- Manual Setup Needed;
- Conflict Warning.

## Conflict detector rules

The blueprint contract currently covers these warnings:

- double spatial audio;
- double EQ or wrong EQ ownership;
- stacked mic noise suppression;
- missing Stream Mix limiter;
- stream/output clipping risk;
- bass masking footsteps;
- latency budget risk.

A good warning says what was detected, why it matters, and the safest next action.

## Build path

### Phase 1: Working Gamer Audio Hub

Ship:

- dashboard;
- device selection;
- channel strips;
- preset engine;
- settings persistence.

Proof gate:

> User can pick devices, move channel controls, apply a safe preset, reload, and see persisted state.

### Phase 2: Chain Assessment

Ship:

- enhancer detector;
- conflict detector;
- headset profiles;
- OBS/Discord routing guide;
- latency meter.

Proof gate:

> Auto Detect explains what is detected, what is uncertain, what is risky, and the safest next action.

### Phase 3: Coach + Spatial Showcase

Ship:

- Game Audio Coach;
- spatial toggle;
- binaural mode;
- stereo fallback;
- Panda Soundwalk showcase.

Proof gate:

> Coach recommendations are tied to test evidence and every spatial mode has a fallback warning.

### Phase 4: Distribution Hardening

Ship:

- installer;
- auto-updater plan;
- profile sharing;
- advanced native routing research.

Proof gate:

> Release checklist, signing plan, privacy gate, and rollback path are documented.

## Release gates

Before this work is called user-ready, run:

```bash
npm test
npm run validate:fixtures
npm run validate:manifest
npm run test:harness
npm run test:ui
npm run export:redaction-check
npm run build
```

For desktop packaging, also run the Electron smoke path:

```bash
npm run test:desktop-smoke
npm run desktop:package
```

## What not to do yet

Do not jump straight into a virtual audio driver or hidden native routing. The next value jump comes from a provable hub, chain assessment, real tests, and a clean Command Center flow. Native routing can come later after the contracts, fixtures, and evidence reports prove the app is trustworthy.
