# CueForge Test Matrix

## Core Proof Gates

The full evidence flow is mapped in `docs/QA_EVIDENCE_PIPELINE.md`. Treat that diagram as the release spine: evidence collection, merge, chain graph, warnings, readiness, lab harness, guided UI, redacted replay, then CI/browser/desktop artifacts.

- Full local release gate: `powershell -ExecutionPolicy Bypass -File .\tools\run-checks.ps1`
- Unit tests: `npm.cmd test`
- Production build: `npm.cmd run build`
- Native manifest validation: `npm.cmd run validate:manifest`
- Setup assessment snapshot and companion-integration contracts: `npm.cmd run validate:manifest`
- Fixture validation: `npm.cmd run validate:fixtures`
- Swarm manifest validation: `npm.cmd run validate:swarm`
- Browser/harness tests: `npm.cmd run test:harness`
- UI contract tests: `npm.cmd run test:ui`
- Playwright web smoke: `npm.cmd run test:playwright:web`
- Playwright Electron smoke: `npm.cmd run test:playwright:electron`
- Desktop package smoke: `npm.cmd run desktop:dir` then `npm.cmd run test:desktop-smoke`
- Dependency audit: `npm.cmd audit --audit-level=moderate`
- Export redaction gate: `npm.cmd run export:redaction-check`
- Audio fixture regression: `npm.cmd run qa:audio-fixture-regression`
- Tester feedback contract: `npm.cmd run qa:feedback-contract`
- Windows route graph lab: `npm.cmd run qa:route-graph-lab`
- Release readiness metadata: `npm.cmd run qa:release-readiness`
- Release candidate acceptance contract: `npm.cmd run validate:manifest`
- Screenshot smoke: `npm.cmd run screenshots:update -- --if-needed`
- Pre-release QA: `npm.cmd run qa:preflight`

## GitHub CI Gates

The GitHub workflow lives at `.github/workflows/release-gate.yml`. Nightly route graph proof is intentionally gated by the repo variable `CUEFORGE_ROUTE_GRAPH_LAB=true` and a self-hosted Windows runner with the `cueforge-route-lab` label, so the public workflow will not hang if the lab machine is offline.

| Job | Runner | Trigger | Pass criteria |
| --- | --- | --- | --- |
| `lint-and-unit` | `ubuntu-latest` | PR, push, tag, release-candidate dispatch | Unit tests pass. |
| `build-web` | `ubuntu-latest` | PR, push, tag, release-candidate dispatch | Vite production build succeeds. |
| `playwright-web` | `ubuntu-latest` | PR, push, tag, release-candidate dispatch | Setup/onboarding, Auto Detect mock, Report Lab, Player Trial, Settings, runtime-error, and overflow smoke checks pass in desktop and compact Chromium. |
| `electron-smoke` | `windows-latest` | PR, push, tag, release-candidate dispatch | Unpacked desktop app builds, Playwright launches Electron, the first CueForge screen renders, and the locked preload bridge exposes only allowed APIs. |
| `redaction-contract` | `ubuntu-latest` | PR, push, tag, release-candidate dispatch | Export packets do not leak raw IDs, paths, emails, phones, tokens, passwords, or recovery codes. |
| `feedback-contract` | `ubuntu-latest` | PR, push, nightly, tag, release | Tester, beta check-in, and community feedback packets match the safe schema. |
| `swarm-contract` | `ubuntu-latest` | PR, push, nightly, tag, release | Checked-in swarm routes, jobs, repair queues, route coverage, privacy locks, and no-system/no-public-post gates validate. |
| `audio-fixture-regression` | `windows-latest` | Nightly, release, tag, release-candidate dispatch | Loudness, clipping, spectral, phase, cue-region, and FFmpeg/libebur128 reference checks hold. |
| `route-graph-lab` | self-hosted Windows | Nightly or manual dispatch when enabled | Active endpoints, chain graph, desktop bridge evidence, and no-system-modification boundary are proven on the lab machine. |
| `release-readiness` | `windows-latest` | Tag, release, release-candidate dispatch | Required jobs are green, version metadata matches, and pre-release QA passes. |

## Required Scenarios

| Scenario | Expected |
| --- | --- |
| Clean beginner setup | Readiness is low/medium and next action is setup/output check. |
| APO setup | APO export is enabled only with explicit review. |
| Sonar + APO | Endpoint mismatch warning appears. |
| Voicemeeter + VB-CABLE | Chain graph warns about manual route verification. |
| Treble-sensitive player | Profile avoids aggressive 4k/8k boosts. |
| Night mode | Lower limiter ceiling and tamer spikes. |
| Incomplete hearing model | No strong hearing compensation is applied. |
| Report export | No raw IDs, paths, emails, phone numbers, tokens, or recovery codes. |

## Supported Lab Test Classes

| Test class | Purpose | Priority |
| --- | --- | --- |
| Unit | Deterministic logic: redaction, scoring, graph normalization, signal analysis. | immediate |
| Integration | PowerShell/Electron/native helper + UI wiring. | immediate |
| End-to-end | First-run setup, Auto Detect, report export, APO draft flow. | immediate |
| A/B audio render | Before/after cue-region change with deterministic render or loopback proof. | immediate |
| Blind-match automation | Seeded order, response consistency, preference stability. | next |
| Hearing-model automation | Safe threshold consistency and self-calibration proof, not clinical diagnosis. | next |
| Chain-graph verification | Detect wrong defaults, missing APO bind, duplicate enhancers. | immediate |
| Conflict detection | Sonar + APO + Discord + Windows enhancements overlap rules. | immediate |
| Latency regression | Impulse/chirp round-trip comparison. | immediate |
| Bit-exact DSP regression | Prove deterministic transforms where applicable. | next |
| Mic pipeline tests | Clipping, noise floor, AGC/suppression detection, RNNoise A/B planning. | immediate |

## Release Readiness Matrix

These are enforced by `src/tests/releaseReadinessMatrix.test.js` and should be treated as pre-release blockers.

| Area | Test case | Fixture type | Pass condition |
| --- | --- | --- | --- |
| Auto Detect | Browser only, permission denied | Browser snapshot | App reports partial confidence and asks for explicit scan/export. |
| Auto Detect | USB mic + DAC + APO only | Bridge manifest | Correct endpoint roles, APO detected, no double-EQ warning. |
| Auto Detect | Sonar + APO stacked | Bridge manifest | Double-processing or endpoint risk is flagged. |
| Auto Detect | Voicemeeter + VB-Cable routing | Bridge manifest | Virtual-route graph renders and manual verification is requested. |
| Auto Detect | Wireless headset with chat/game endpoints | Bridge manifest | Chat/game split is recognized and surfaced. |
| Hardware profiles | HyperX / Sonar sample profile | Hardware profile manifest | Expected companions and endpoint split match real evidence. |
| Hardware profiles | Missing expected or forbidden companions | Hardware profile manifest | Missing Sonar, forbidden Voicemeeter, and missing loopback proof are flagged. |
| Lab manifests | Setup Command Center smoke run | Lab manifest | Ordered tests map to the correct Machine Play Lab runners with privacy locked. |
| Lab manifests | Complex routing VM lab | Lab manifest | Route graph, latency, mic, privacy, and onboarding checks are described without raw audio export. |
| Lab manifests | Full Machine Play Lab coverage | Lab manifest | Every immediate and next lab class is represented by a valid run-plan entry. |
| Readiness | Missing mic permission but complete desktop evidence | Merged graph | Status remains blocked for player test. |
| Readiness | Multiple risky layers but all APIs present | Merged graph | Score is reduced and blockers explain route risk. |
| Hearing | Inconsistent repeated answers | Hearing fixture | Confidence drops and retest is recommended. |
| Hearing | Valid threshold ladder per ear | Hearing fixture | Overlay is generated with bounded safe compensation. |
| Personalization | Hearing + Blind Match + Masking + Player Trial | Lab input fixture | Formal lab input packet is generated with capped influence weights. |
| Personalization | Medical/audiometry wording | Claim-boundary fixture | Claim is rejected and self-calibration boundary is returned. |
| Blind Match | A/B render with deterministic cue deltas | Offline render | Learned curve shifts in the expected direction. |
| Audio Regression | `eq-render-a-b` with `cue_steps_reference.wav` | WASAPI loopback policy | Integrated loudness delta stays within +/-1.0 LUFS, phase average is greater than 0.95, cue-band gain increases +1.5 to +3.0 dB, no DC offset warning, no clipping, no output device switch, no communications endpoint hijack, and no double-processing signature. |
| Masking Lab | Explosion + footsteps masking fixture | Offline render | Anti-masking tune improves the target metric. |
| Signal Analyzer | Clipping, rumble, voice-too-quiet, usable-signal fixtures | Synthetic buffers | Correct probable-cause classification. |
| Export | Redacted issue report | Export fixture | No raw IDs, paths, emails, or phones appear. |
| Export | Native manifest export | Manifest fixture | Sensitive fields are excluded or hashed. |
| Evidence privacy | Audio evidence public packet | Export fixture | Raw audio, raw usernames, local paths, emails, phones, and raw device IDs are excluded. |
| Evidence privacy | Protected playback boundary | Native harness fixture | WASAPI loopback does not promise universal DRM/protected-stream capture. |
| Release tools | Candidate tool backlog | Data contract | WASAPI, FFmpeg/libebur128, and Playwright are required; miniaudio is primary; Steam Audio is scene-lab only. |
| Implementation backlog | Release-path task list | Data contract | The 14 current build tasks have effort, status, proof gates, next actions, and validated high-effort boundaries. |
| Release ship bars | Version contract | Data contract | v0.2.0, v0.3.0, and v0.4.0 have locked themes, minimum ship bars, and proof-gate lists. |
| Release candidate acceptance | RC checklist contract | Data contract | Tags, releases, and manual release-candidate runs are blocked until Setup Command Center, Auto Detect, desktop bridge, web/Electron smoke, real Windows loopback proof, redaction, explicit APO draft flow, common conflict rules, local evidence, build metadata, and honest Windows-first release notes are proven. |
| Desktop | Electron preload/API smoke | Desktop harness | Only allowed APIs are exposed. |
| Desktop | Playwright Electron first window | Electron harness | `Setup Command Center` renders from the built desktop app, desktop info resolves to CueForge app data, and startup has no console resource failures. |
| UI | Guided flow default | UI contract | New guided path is visible and actionable by default. |
| UI | Playwright web smoke | Chromium desktop and compact browser | Command Center, Auto Detect, Mic Lab, Player Trial, Report Lab, and Settings render with navigation, no runtime errors, and no horizontal overflow. |
| UI | Auto Detect summary panel | Canned manifest | Chain graph, warnings, and fixes render correctly. |
| UI | Report replay flow | Report fixture | Imported report reconstructs EQ state and replay notice. |
| Visual | Command Center, Auto Detect, Hearing, Blind Match, Masking Lab, Report Lab, compact Command Center | Golden screenshot contract | Screenshot smoke verifies expected acceptance text, rejects blank/runtime-error states, and checks horizontal overflow on desktop plus compact/mobile. |
| Contracts | Manifest schema validation | JSON fixtures | Invalid manifests are rejected with actionable errors. |
| Contracts | Setup assessment snapshot | State bundle fixture | Snapshot publishes to localStorage, window, and a namespaced event without raw audio, raw device IDs, or paths. |
| Contracts | Companion repo integration | Data contract | Autobot, Kalshi Scout, Feedback Automation, and Crypto Intelligence patterns stay read-only, redacted, and approval-gated. |
| Swarm | Route manifests | JSON fixtures | Setup Command Center, Auto Detect, Self Test, and Report Lab define selectors, transitions, native APIs, fixtures, thresholds, privacy, owners, safe repair actions, and escalation. |
| Swarm | Job manifests | JSON fixtures | Daily smoke, nightly audio regression, and release candidate jobs cover all checked-in routes and block public posting/system mutation. |
| Swarm | Repair manifests | JSON fixtures | Panda Notes and route-regression repairs allow only reviewed narrow fixes and block Windows/APO/raw/private-data actions. |

## Human-Swarm Standard

Bots passing is not enough. Each release candidate needs at least one human-style navigation pass that checks layout, obvious next action, right-click notes, export privacy, and setup recovery.
