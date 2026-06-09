# Alpha.6 Auto Setup One Answer + WASAPI Proof Plan

> **For:** Codex implementing alpha.6 setup flow simplification
> **Created:** 2026-06-09

## Goal

Make CueForge feel simple on the surface while preserving the hard proof work underneath:

```text
Start Auto Setup -> one answer -> one next action -> safe test/apply boundary
```

The app should compute a clear verdict from scan evidence, game settings, Sound Match, conflicts, backup state, and WASAPI loopback proof. The loopback proof remains capability-only in alpha.6: no hidden capture, no raw audio storage, no driver/routing/APO changes.

## Implementation Tasks

### 1. WASAPI Loopback Proof Contract

- Add `src/core/wasapiLoopbackProof.js`.
- Add `src/tests/wasapiLoopbackProof.test.js` first and watch it fail before implementation.
- Normalize `available`, `unavailable`, `blocked`, `unsupported`, and `not-run` states.
- Redact raw endpoint IDs/paths into a stable hash.
- Keep `canRecord: false`, `rawAudioStored: false`, and `protectedPlaybackBoundary: true`.

### 2. Auto Setup Verdict Contract

- Add `src/core/autoSetupVerdict.js`.
- Add `src/tests/autoSetupVerdict.test.js` first and watch it fail before implementation.
- Return `ready`, `needs-fixes`, or `do-not-apply-yet`.
- Include `headline`, `found`, `problems`, `nextAction`, `why`, `undo`, `proof`, `blockers`, `safeToApply`, and `safeToTestInMatch`.
- Make unsafe apply blockers win over convenience.
- Keep browser-only ready language honest: ready for web match test, not Windows endpoint proof.

### 3. Existing Flow Integration

- Thread the verdict into `src/core/commandCenterFlow.js`.
- Add a Loopback Proof check to the guided setup checks.
- Make the guided result use the verdict status and next action.
- Keep existing Command Center routing and layout.

### 4. UI Copy + State Surface

- Update `src/ui/SetupCommandCenter.jsx` labels from "Final setup answer" to "Auto Setup Answer".
- Show loopback proof as a proof card/check, not a recording promise.
- Update styles if needed for clear ready/fix/locked states.

### 5. Fixtures + Release Evidence

- Add loopback proof to `desktopBridgeFixture` in `src/data/testFixtures.js`.
- Update privacy/redaction coverage if exports include the proof.
- Do not weaken existing tests or change Sound Match apply gating.

## Verification

Run these before completion:

```powershell
npm.cmd test -- src/tests/wasapiLoopbackProof.test.js src/tests/autoSetupVerdict.test.js
npm.cmd test -- src/tests/commandCenterFlow.test.js src/tests/gameAudioSettingsCheck.test.js src/tests/nativeEngineManifest.test.js src/tests/nativeCaptureHarness.test.js
npm.cmd run test:ui
npm.cmd run export:redaction-check
npm.cmd run build
```

If practical after the targeted pass:

```powershell
npm.cmd test
```

## Non-Negotiables

- No fake buttons.
- No hidden native routing.
- No silent driver changes.
- No automatic APO writes.
- No real loopback recording in alpha.6.
- No raw endpoint IDs, raw local paths, or raw audio in exportable proof.
