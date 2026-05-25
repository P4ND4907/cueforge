# Audio Manifests

Versioned input manifests for fixture runs, native harness requests, and regression-oracle expectations.

Current schema: `cueforge.lab-manifest.v1`.

Each manifest must define:

- `manifestId`: stable run name.
- `profileId`: one known file from `qa/hardware-profiles`.
- `tests`: ordered test IDs with a supported test type.
- `privacy`: raw audio export disabled, device IDs redacted, and local user paths redacted.

Audio regression tests can also attach:

- `fixture`: the local WAV or generated fixture name, such as `cue_steps_reference.wav`.
- `policy`: a versioned policy file from `qa/audio/policies`.
- `capture`: the intended capture path. For `eq-render-a-b`, this must be WASAPI loopback on the active default render endpoint with `allowSystemMutation: false`.

Supported test types map to lab runners:

- `unit` -> Vitest deterministic logic checks for redaction, scoring, graph normalization, and signal analysis.
- `integration` -> machine assessment and device scan.
- `e2e` -> Playwright/Electron first-run setup, Auto Detect, report export, and APO draft flow.
- `ab-audio-render` -> before/after cue-region render with deterministic or loopback proof.
- `blind-match-automation` -> seeded order, response consistency, and preference stability.
- `hearing-model-automation` -> safe threshold consistency and self-calibration proof, never clinical diagnosis.
- `chain-graph-verification` -> wrong defaults, missing APO bind, duplicate enhancers, and route uncertainty.
- `conflict-detection` -> Sonar, APO, Discord, Windows enhancements, spatial layers, and virtual route overlap rules.
- `latency-regression` -> impulse/chirp round-trip comparison and render/capture timing proof.
- `bit-exact-dsp-regression` -> deterministic transform proof where applicable.
- `mic-pipeline` -> mic analyzer path.
- `privacy` -> redaction gate.
- `visual` -> screenshot/visual regression.
- `desktop-smoke` -> packaged desktop smoke.
- `fixture` -> canned route or audio fixture.

Compatibility aliases are still accepted for older manifests: `chain-graph`, `latency`, and `audio-regression`.

These files are test descriptions only. They must not install drivers, change default Windows devices, change routing, or upload raw audio.
