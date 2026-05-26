# CueForge Native Engine Roadmap

Status: post-v0.2 direction.

CueForge should earn native processing one step at a time. The rule is simple: manifest first, offline proof second, real-time preview third, system integration last.

The ranked implementation backlog lives in `src/data/releaseToolBacklog.js`. It treats WASAPI loopback, miniaudio, PortAudio, RtAudio, RNNoise, FFmpeg/libebur128, Playwright, Puppeteer, and Steam Audio as explicit candidates with proof gates and blocked uses.

The minimum version ship bars live in `src/data/releaseShipBars.js`. Those bars define the short release contract:

| Release | Theme | Minimum ship bar |
| --- | --- | --- |
| v0.2.0 | Foundations | Setup Command Center default, feature modules extracted, Playwright web + Electron smoke, hardware profiles, and route graph schema. |
| v0.3.0 | Proof | WASAPI loopback helper, FFmpeg/libebur128 regression, conflict detector, latency/phase tests, and feedback ingestion. |
| v0.4.0 | Production readiness | Nightly Machine Play Lab on real Windows hardware, enforced release gates, checked-in swarm manifests, redaction audit, and trustworthy user-facing assessment summaries. |

## Principles

- Manifest first, processing second, system integration last.
- Offline DSP proof comes before real-time preview.
- Real-time preview comes before any system-wide apply path.
- Every native step needs visible approval, rollback, and proof.
- CueForge improves the final audio chain; it does not claim exact enemy positions without game-engine metadata.

## v0.3.0 - Native DSP Sandbox

Goal: prove CueForge can import the engine manifest and render safe audio offline before any real-time or system-wide path exists.

Build:

- miniaudio prototype
- native capture/render harness contract
- PEQ processor
- limiter
- test WAV renderer
- explicit WASAPI loopback measurement spike
- FFmpeg/libebur128 reference metrics for loudness, peak, phase, correlation, and channel health
- device enumeration and full-duplex experiment plan
- PortAudio and RtAudio benchmark notes only if miniaudio hits a blocker
- latency experiments
- engine manifest import

Proof gates:

- golden WAV render tests
- native harness request validation
- PEQ and limiter null/safety checks
- FFmpeg/libebur128 metrics match CueForge fallback thresholds or produce a documented missing-tool report
- latency experiment report
- loopback capture remains explicit, bounded, and local
- no Windows routing or driver writes

## v0.4.0 - Desktop Real-Time Preview

Goal: let a player hear A/B processing through the app without installing a driver or changing the system audio stack.

Build:

- local loopback or preview path
- NAudio sidecar evidence spike
- no driver install yet
- player-heard A/B through app
- manifest-controlled PEQ and limiter
- preview latency readout

Proof gates:

- helper manifest validates before any UI consumes native evidence
- A/B preview is opt-in and reversible
- preview latency stays documented
- failure mode returns to silence-safe bypass
- no hidden routing changes

## v0.5.0 - Windows User-Mode Engine Path

Goal: research the serious desktop path for low-latency Windows audio while keeping installer, signing, backup, and undo plans explicit.

Build:

- APO-like adapter research
- service-backed adapter research
- signed build planning
- installer hardening
- backup and rollback design

Proof gates:

- threat model written
- installer rollback tested
- signing plan documented
- user approval required before every system-level change

## v0.6.0 - Mic Enhancement Pack

Goal: add optional mic cleanup that respects Discord workflows and keeps raw mic audio local by default.

Build:

- RNNoise adapter
- Discord-safe mic profiles
- streamer mode
- input gain guard
- noise-floor before/after proof

Proof gates:

- raw audio remains local by default
- noise suppression is opt-in
- clip risk does not increase
- Discord-safe profile notes are exported

## v0.7.0 - Spatial Research Pack

Goal: explore spatial tools honestly without pretending a mixed stereo output contains true game-object positions.

Build:

- libmysofa HRTF loader
- Steam Audio research sandbox
- immersive mode experiments
- competitive width comparison
- scene-metadata integration notes

Proof gates:

- UI warning for mixed-stereo limits
- competitive mode avoids fake surround by default
- research mode is labeled experimental
- no exact enemy-position claim

## v1.0.0 - Signed Public Beta

Goal: ship a trusted local-first desktop build with enough proof, support, and polish to be worth public beta pressure.

Build:

- paid-ready desktop build
- stable setup health
- real player testing
- trusted local-first release
- signed installer and release notes

Proof gates:

- signed build verified
- setup health stable across tester cohorts
- privacy audit passes
- rollback and uninstall paths tested
- real player feedback closes the loop

## Hard Boundary

The native engine roadmap does not unlock hidden driver changes, silent routing changes, anti-cheat-adjacent hooks, game memory reads, hidden telemetry, or exact enemy-position claims. Any future system-level path must be explicit, reversible, signed when public, and proven with tester evidence.

Puppeteer is allowed only for small Chromium developer probes. Playwright remains the primary automation framework for release gates. Steam Audio remains scene-lab or partner-integration research only; it must not be used to claim true object-level occlusion from arbitrary mixed game output.
