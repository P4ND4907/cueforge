# CueForge State v2 Contract

CueForge v0.2.0-alpha.3 uses one canonical state object as the shared source of truth:

- `src/core/cueforgeState.js` exports `cueforgeStateV2`.
- `buildCueForgeState()` creates the live state from the normalized Auto Detect report, detected devices, bridge data, EQ, hearing data, game focus, conflicts, readiness, and export data.
- `src/core/cueforgeBrain.js` evaluates that live state into the product proof layer: chain verification, personal sound identity, conflict health, game intent, safe export/apply, local evidence, and native-engine readiness.
- `src/core/stateAdapters.js` creates feature-safe state anchors for every downstream feature.

## Rule

New features should not invent their own setup brain. They should read from `cueforgeStateV2` directly or include a `stateAnchor` built by `buildStateAnchor()`.

If a feature is meant to improve the main product promise, it should also feed or improve one CueForge Brain pillar. The release pack includes `cueforge-brain.json` so the proof layer is exportable with the rest of the setup packet.

## Required Consumers

- Setup Command Center: `setup-command-center`
- Native engine manifest: `native-engine`
- Mic engine plan: `mic-engine-plan`
- Spatial plan: `spatial-plan`
- Equalizer APO export: `apo-export`
- Profile recommendation/share: `profile-recommendation`
- Discord/community feedback pack: `discord-feedback-pack`
- Report Lab: `report-lab`
- Audio DNA: `audio-dna`
- Release/setup pack: `release-pack`

## Setup Command Center Contract

`buildCommandCenterSummary()` must derive the home cards and guided flow from the current CueForge state, saved trial/report evidence, readiness gates, and chain health.

The default operating surface must always answer five setup questions before a player starts tuning:

- What hardware and software are present?
- What route is active right now?
- What in the chain is conflicting or redundant?
- What tests passed, failed, or need replay?
- What is the safest next step for this exact user?

The six required home cards are Setup Health, Active Profile, Audio Chain, Next Best Action, Last Match Feedback, and Export / Apply Status. The guided flow should remain Start -> Setup Command Center -> Auto Detect -> Chain Graph -> Conflict Fix -> Output Check -> Mic Check -> Hearing Model -> Choose Game / Genre -> Blind Match -> Masking Lab -> Profile Recommendation -> Engine Preview -> Export / Apply -> Player Trial -> Report / Audio DNA.

## Auto Detect v2 Contract

`buildAutoDetectReport()` is the normalized setup-detection layer. It must keep this exported shape stable:

- `detectedAt`
- `source`
- `devices.browserInputs`
- `devices.browserOutputs`
- `devices.windowsRenderDevices`
- `devices.windowsCaptureDevices`
- `companions`
- `suspectedHardware`
- `risks`
- `recommendations`

The companion map must include Equalizer APO, Peace, Sonar, Voicemeeter, VB-CABLE, Dolby/DTS, Windows Sonic, Nahimic, and Razer THX with `detected` and `confidence` fields. Exported report data must not include raw device IDs, group IDs, serials, local paths, tokens, or account details.

## Preference Model Contract

`calibration.preferenceModel` is the shared home for Sound Match / This or That preference learning.

The stable fields are bounded numeric weights from `-5` to `5` plus `roundsCompleted`, `confidence`, and `updatedAt`. Current weights are:

- `footstepPriority`
- `harshnessTolerance`
- `bassImpact`
- `voiceClarity`
- `spatialWidth`
- `centerFocus`
- `detailPriority`
- `comfortPriority`
- `fatigueRisk`
- `presence`
- `treble`
- `bass`

The model should be updated through `src/core/preferenceModel.js`. Profile recommendations should consume it through `src/core/profileEngine.js` so EQ, dynamics, and spatial planning all reflect the same player preference identity.

## Personalization Lab Input Contract

`calibration.labInputs` is the formal bridge between the lab surfaces and the setup brain. It is built by `src/core/personalizationLabInputs.js` from:

- Hearing Model v2 self-calibration.
- Sound Match / Blind Match preference rounds.
- Masking Lab cue-separation evidence.
- Player Trial real-match feedback.

This layer exists so those tools are not side features. They become conservative, replayable inputs for profile recommendation, readiness, Audio DNA, report replay, and future native manifests.

Hard boundary:

- Hearing inputs are self-calibration and preference weighting only.
- CueForge must not call this a medical hearing test, diagnosis, audiogram, audiometry workflow, treatment, or clinical result.
- Test tones must remain amplitude-capped, click-to-play, and local.
- Inconsistent repeated threshold answers must lower confidence and ask for a retest.
- Influence weights must stay conservative until real Player Trial proof exists.

## Native Engine Manifest Contract

`buildNativeEngineManifest()` must accept the canonical app state or the legacy `{ state }` wrapper used by `buildCueForgeState()`.

The manifest should always include:

- Processing constants: sample rate, target block size, and channel count.
- A module list for preamp, PEQ, limiter, dynamics, and spatial stages.
- A mic plan that reports status, noise floor, clip risk, recommended action, and the disabled future RNNoise adapter.
- A spatial plan that keeps Safe Stereo, Competitive Width, Immersive HRTF Preview, and Developer Spatial SDK separate, with a hard warning that true occlusion needs game-engine support.
- Safety fields for boost caps, hearing boost caps, limiter requirement, clipping guard, and calculated preamp.
- A prototype backend plan that keeps miniaudio in offline/proof-of-concept mode until native apply work is reviewed separately.
- A native capture/render harness plan from `src/native/harness/nativeCaptureHarness.js` for miniaudio-first offline rendering, explicit WASAPI loopback measurement, explicit mic capture measurement, device enumeration, full-duplex experiments, and request validation.

No consumer should treat the manifest as permission to write drivers, change routing, or apply system-wide DSP silently.

## Privacy Boundary

Full local state can stay inside the app. Anything meant for sharing should use:

- `buildStateAnchor()` for a compact safe summary.
- `sanitizeStateForReport()` for redacted issue reports.

Reports and public-facing packs should not include raw device IDs, group IDs, serials, local paths, tokens, passwords, phone numbers, or recovery data.

## Test Gate

`src/stateConsumers.test.js` verifies that the main feature outputs still include the shared state anchor. If a future feature bypasses the shared state, add it to that test before release.
