# CueForge v0.2.0 Acceptance Checklist

Status: passing locally for `0.2.0-alpha.3`.

This checklist is the release gate for the Seamless Engine Foundation. A build is not considered done unless these items stay checked and the command gates pass.

Release-candidate note: `0.2.0-alpha.3` can pass the local alpha scaffold gates while a public release candidate is still blocked. The stricter RC contract lives in `src/data/releaseAcceptanceChecklist.js` and keeps real Windows loopback regression proof as a hard blocker until an actual endpoint loopback run is attached.

## Product Gates

- [x] Setup Command Center exists.
  - Evidence: `src/core/commandCenterFlow.js`, app command-center cards, `src/tests/v020Acceptance.test.js`.
- [x] CueForge state object exists.
  - Evidence: `src/core/cueforgeState.js`, `cueforgeStateV2.version = 0.2.0-alpha.3`.
- [x] CueForge Brain differentiator exists and is connected.
  - Evidence: `src/core/cueforgeBrain.js`, `cueforge-brain.json` in the release pack, Setup Command Center proof strip, and acceptance coverage for the audio chain verifier + personal sound engine promise.
- [x] Chain Graph builds from browser + bridge data.
  - Evidence: `src/core/chainGraph.js`, `buildChainGraph(...)`, acceptance and chain graph tests.
- [x] Conflict Detector returns warnings.
  - Evidence: `src/core/conflictDetector.js`, Sonar + APO and routing warnings.
- [x] Readiness Score v2 works.
  - Evidence: `src/core/readinessScore.js`, weighted score and next-action tests.
- [x] Profile Engine v2 recommends modes beyond FPS.
  - Evidence: `src/core/profileEngine.js`, `src/data/genreProfiles.js`, story/dialogue, night, comfort, racing, horror, creator, and accessibility modes.
- [x] Hearing Model v2 data structure exists.
  - Evidence: `src/core/hearingModelV2.js`, threshold-style bands from 125 Hz to 12 kHz.
- [x] Old hearing model still works or migrates safely.
  - Evidence: `src/hearingModel.js` migrates boolean heard/missed results into safe threshold entries.
- [x] This-or-That preference model updates player profile.
  - Evidence: `src/core/preferenceModel.js`, hidden weights, profile blending, and acceptance coverage.
- [x] Engine manifest export exists.
  - Evidence: `src/engines/nativeEngineManifest.js`, explicit native manifest with preamp, PEQ, limiter, dynamics, and spatial placeholders.
- [x] APO export still works.
  - Evidence: `src/core/exportSchema.js`, `src/exportPack.js`, `equalizer-apo-config.txt`, release scenario gate.
- [x] Report export remains redacted.
  - Evidence: `src/reportPack.js`, `src/privacyAudit.js`, release and acceptance tests.
- [x] No native action silently changes Windows settings.
  - Evidence: manifest boundary, `applyPath.explicit`, desktop shell review-only APO draft flow, and README safety boundary.
- [x] v0.2.0 scope guard blocks trust-breaking work.
  - Evidence: `src/core/scopeGuard.js`, `src/tests/scopeGuard.test.js`, and acceptance coverage for blocked driver, routing, cloud, game-hook, paid-unlock, and exact-enemy-position claims.
- [x] Post-v0.2 native engine direction is explicit.
  - Evidence: `src/data/nativeEngineRoadmap.js`, `docs/NATIVE_ENGINE_ROADMAP.md`, and acceptance coverage that the next move is v0.3.0 Native DSP Sandbox before any real-time or system-wide path.
- [x] Native capture/render harness boundary exists.
  - Evidence: `src/native/harness/nativeCaptureHarness.js`, `src/tests/nativeCaptureHarness.test.js`, and manifest coverage for miniaudio-first offline rendering, explicit WASAPI loopback measurement, explicit mic capture measurement, device enumeration, full-duplex experiments, bounded local capture, and no system writes.
- [x] Open-source stack choices have proof gates and guardrails.
  - Evidence: `src/data/openSourceStack.js`, `docs/OPEN_SOURCE_STACK.md`, and tests blocking hidden RNNoise processing, post-mix Steam Audio claims, and silent APO writes.
- [x] Security, privacy, CI, and Electron hardening are release-blocking.
  - Evidence: `src/securityPrivacyGate.js`, `src/exportFingerprints.js`, `src/security/electronPolicy.js`, `src/securityPrivacyGate.test.js`, and `.github/workflows/release-gate.yml`.
- [x] Release-candidate acceptance contract exists.
  - Evidence: `src/data/releaseAcceptanceChecklist.js`, `src/tests/releaseAcceptanceChecklist.test.js`, and `tools/Run-ReleaseReadiness.mjs`.
  - Boundary: a public release candidate remains blocked until `realWindowsLoopbackRegressionPassed` is true from a real Windows endpoint loopback run.

## Command Gates

Run before sharing a build:

```powershell
npm test -- src/tests/v020Acceptance.test.js
npm test -- src/tests/scopeGuard.test.js
npm test -- src/tests/cueforgeBrain.test.js
npm test -- src/tests/releaseScenarios.test.js
npm test -- src/tests/nativeCaptureHarness.test.js
npm test -- src/tests/releaseAcceptanceChecklist.test.js
npm test -- src/securityPrivacyGate.test.js src/exportFingerprints.test.js src/privacyAudit.test.js src/electronHardening.test.js
npm test
npm run build
npm audit --audit-level=moderate
```

Latest local proof:

- `npm.cmd test -- src/tests/v020Acceptance.test.js`: passing.
- `npm.cmd test -- src/tests/cueforgeBrain.test.js src/tests/cueforgeState.test.js src/tests/exportSchema.test.js src/tests/v020Acceptance.test.js`: passing.
- `npm.cmd test -- src/tests/scopeGuard.test.js src/tests/v020Acceptance.test.js`: passing.
- `npm.cmd test`: passing.
- `npm.cmd run test:ui`: passing, including the UI acceptance criteria contract.
- `npm.cmd run build`: passing.
- `npm.cmd run desktop:dir`: passing.
- `npm.cmd run test:playwright:electron`: passing, first desktop window rendered `Setup Command Center` and the preload bridge exposed only approved APIs.
- `npm.cmd run test:desktop-smoke`: passing, packaged app rendered `Setup Command Center`.
- `npm.cmd run screenshots:update -- --if-needed`: passing, 7/7 pages verified with expected acceptance text and no horizontal overflow.
- Browser live check at `http://127.0.0.1:5177/?qa=ui-acceptance-final`: default Command Center rendered, Auto Detect interaction showed confidence, risk, and recommendations, with no console errors.
- `npm.cmd audit --audit-level=moderate`: 0 vulnerabilities.

## Hard Stop Rules

- If a new feature does not flow through `cueforgeStateV2`, it is not accepted.
- If a major feature does not improve a CueForge Brain pillar or explain why it belongs outside the main flow, it is not accepted.
- If a native step can change Windows routing, drivers, or APO configs without a visible user action, it is not accepted.
- If a report/export contains raw device IDs, local paths, emails, phones, tokens, passwords, or recovery codes, it is not accepted.
- If a tester-found issue is fixed without a regression test or live QA proof, it is not accepted.
- If a feature asks for kernel drivers, a full custom APO installer, silent routing, always-on services, cloud personalization, aggressive pitch shifting, paid unlocks, game memory reads, anti-cheat-adjacent hooks, or exact enemy-position claims, it is not accepted for v0.2.0.
