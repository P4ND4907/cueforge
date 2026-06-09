# Alpha.6 Auto Setup One Answer + WASAPI Proof Design

Date: June 9, 2026

## Goal

CueForge alpha.6 should make the first product loop feel complete:

```text
Start Auto Setup -> get one answer -> fix or test -> play one match -> report what changed
```

The release combines two approved development tracks:

1. Auto Setup One Answer: a player-facing verdict that explains whether the setup is ready, needs fixes, or is not safe to apply yet.
2. WASAPI Loopback Proof: a desktop-only proof lane that can report loopback availability and readiness without recording silently or changing Windows audio.

The two tracks should work together. The one-answer setup flow should use WASAPI proof when available, but it must still be useful in browser-only mode.

## Product Problem

Alpha.5 has the core ingredients: desktop scan, game audio settings, native spatial compatibility, Sound Match, conflict detection, backup/undo language, and match feedback. The remaining player problem is flow clarity. A tester can still ask:

```text
I scanned. Now what?
```

Alpha.6 should answer that directly.

## Design Decision

Use one combined release track, not two separate releases.

### Option A: Auto Setup Only

This is the fastest visible improvement, but it leaves the native proof lane disconnected from the product promise.

### Option B: WASAPI Proof Only

This improves technical credibility, but it is not enough for testers because most of them need a clear next action more than a new native capability badge.

### Option C: Combined Alpha.6 Track

Build the one-answer setup verdict and add WASAPI loopback as a supporting proof source. This is the recommended path because it improves the user flow while moving the desktop/native foundation forward safely.

## User-Facing Result

Auto Setup should end in one of three verdicts:

- `ready`: the setup is aligned enough for one real match test.
- `needs-fixes`: CueForge found fixable conflicts or missing proof.
- `do-not-apply-yet`: applying a tune would be unsafe or misleading.

Each verdict must show five plain-language answers:

- What CueForge found.
- What looks wrong or uncertain.
- What to do next.
- Why that step matters.
- How to undo or stay safe.

Example:

```text
Needs fixes

Found: SteelSeries Sonar, Discord processing, Windows spatial off, game HRTF on, desktop scan loaded.
Problem: EQ and spatial layers are not fully proven, and Sound Match is still preview-only.
Next: run Sound Match to 15 rounds, then play one match before applying the learned EQ.
Why: direct apply needs consistency proof so CueForge does not tune around shaky choices.
Undo: any starter profile apply must keep a visible backup and restore action.
```

## Auto Setup Verdict Model

Add a core model that computes a stable setup verdict from existing evidence.

Recommended file:

```text
src/core/autoSetupVerdict.js
```

Inputs:

- Auto Detect report.
- Chain graph and conflict detector output.
- Game Audio Settings Check.
- Native Spatial Compatibility result.
- Sound Match readiness.
- Desktop bridge status.
- WASAPI loopback proof state when available.
- Backup/undo availability.

Outputs:

```text
schema: cueforge.auto-setup-verdict.v1
status: ready | needs-fixes | do-not-apply-yet
confidence: 0-100
headline
found[]
problems[]
nextAction
why[]
undo
proof[]
blockers[]
safeToApply: boolean
safeToTestInMatch: boolean
```

Rules:

- `do-not-apply-yet` wins when there is clipping risk, missing limiter, unsafe boost/headroom, unclean Sound Match apply gate, or unhandled double-processing risk.
- `needs-fixes` wins when desktop proof is missing, game settings are incomplete, spatial/EQ layer state is uncertain, or WASAPI loopback proof is unavailable for a desktop-only proof request.
- `ready` requires enough evidence for one match test, not perfection. It can still recommend manual review before system-level apply.
- Browser-only mode can be `needs-fixes` or `ready`, but a browser-only `ready` verdict must say `Ready for web match test` in the headline and must not claim Windows endpoint proof.

## UI Flow

Use the existing Command Center and Auto Detect surfaces instead of creating a new page.

### Command Center

Primary CTA:

```text
Start Auto Setup
```

After evidence exists, the CTA advances to the verdict's `nextAction`.

The first screen should show:

- verdict status
- one next action button
- proof chips
- top blocker or top fix
- safe apply state
- match test state

### Auto Detect / Auto Setup Panel

Add a result panel titled:

```text
Auto Setup Answer
```

It should avoid raw lab language and show the plain verdict. Advanced detail can expand beneath it.

Button behavior:

- Browser mode: offer desktop build/link only when native evidence is needed.
- Desktop mode: run Windows scan, then show the verdict.
- Sound Match incomplete: send the player to Sound Match with the exact remaining requirement.
- Match feedback missing: send the player to Player Trial or Beta Check-in.
- Unsafe apply: keep apply disabled and explain the specific blocker.

## WASAPI Loopback Proof

Alpha.6 should not implement full audio capture or analysis. It should implement capability proof and a no-recording smoke contract.

Recommended file:

```text
src/core/wasapiLoopbackProof.js
```

Recommended desktop report field:

```text
bridgeReport.loopbackProof
```

Shape:

```text
schema: cueforge.wasapi-loopback-proof.v1
status: available | unavailable | blocked | unsupported | not-run
mode: endpoint-loopback
endpointLabel
endpointHash
defaultRenderMatchesScan: boolean
permissionRequired: boolean
protectedPlaybackBoundary: boolean
canRecord: false
rawAudioStored: false
reason
nextAction
```

Important boundary:

- `canRecord` remains `false` for alpha.6.
- No raw audio is stored.
- No capture starts automatically.
- No process-specific loopback is attempted.
- No protected playback bypass is attempted.
- No Windows routing, driver, APO, or system setting is modified.

The purpose is to answer:

```text
Can this desktop build prove that endpoint loopback is possible on this machine later?
```

not:

```text
Can CueForge listen to game audio automatically?
```

## Desktop Bridge Integration

The current Electron bridge can run `tools/Scan-AudioSetup.ps1` and return a local report. Alpha.6 should extend this conservatively.

Implementation options:

1. Add a PowerShell-only loopback capability check.
   - Best for alpha.6.
   - Can report OS/device capability and endpoint identity without native capture.
2. Add a native helper spike using miniaudio or a tiny Windows helper.
   - Better later.
   - Too much for alpha.6 if the user flow is also changing.
3. Add real loopback recording.
   - Not allowed in alpha.6.
   - Needs explicit consent, bounded duration, local file controls, redaction, and separate release gating.

Recommendation: use option 1 for alpha.6.

## Data Flow

```text
Browser scan
  -> Auto Detect report
  -> Chain graph
  -> conflict detector

Desktop scan
  -> bridge report
  -> loopback proof
  -> Auto Detect report

Game Audio Settings
  -> game settings check

Sound Match
  -> preference model
  -> apply readiness

All evidence
  -> auto setup verdict
  -> Command Center CTA
  -> Auto Setup Answer panel
  -> Player Trial / Beta Check-in
  -> redacted report/export
```

## Error Handling

- Missing desktop bridge: explain that browser mode cannot prove Windows endpoint routing.
- WASAPI unsupported or blocked: mark proof unavailable and fall back to scan, settings, Sound Match, and match feedback.
- Protected playback boundary: explain that loopback may not work for protected streams and CueForge will not bypass it.
- Endpoint mismatch: mark verdict `needs-fixes` and ask the player to confirm Windows output/default communications device.
- Sound Match not ready: keep direct apply locked and route to remaining rounds.
- No backup: prevent apply actions that need rollback.

## Testing Plan

Add or update tests for:

- Auto setup verdict status priority.
- Ready vs needs-fixes vs do-not-apply-yet.
- Browser-only verdict wording.
- Desktop scan verdict with loopback proof available.
- Loopback proof unavailable/blocked/protected playback states.
- Sound Match preview-only blocks direct apply.
- Native spatial + loopback proof does not create fake apply permission.
- Redaction: endpoint hash is allowed, raw endpoint IDs and paths are not.
- UI acceptance: one primary next action renders.

Minimum commands:

```powershell
npm.cmd test -- src/tests/commandCenterFlow.test.js src/tests/gameAudioSettingsCheck.test.js src/tests/nativeEngineManifest.test.js src/tests/nativeCaptureHarness.test.js
npm.cmd run test:ui
npm.cmd run export:redaction-check
npm.cmd run build
```

Release-gate commands before alpha.6 packaging:

```powershell
npm.cmd test
npm.cmd run validate:fixtures
npm.cmd run validate:manifest
npm.cmd run test:harness
npm.cmd run test:ui
npm.cmd run export:redaction-check
npm.cmd run build
npm.cmd run test:playwright:web
npm.cmd run test:desktop-smoke
```

## Non-Goals

- No real loopback recording in alpha.6.
- No hidden native capture.
- No process-specific game capture.
- No driver install.
- No APO write.
- No Windows routing change.
- No automatic Discord, Sonar, OBS, or game setting changes.
- No claim that CueForge can hear exact enemy positions.
- No upload of audio, device IDs, or private paths.

## Implementation Order

1. Add `wasapiLoopbackProof` core contract and fixture tests.
2. Add loopback proof fields to the desktop bridge fixture/report adapter.
3. Add `autoSetupVerdict` core model and tests.
4. Wire the verdict into Command Center and Auto Detect.
5. Update copy so the main answer is plain language, with advanced proof available below.
6. Add redaction coverage for loopback proof.
7. Run full web and desktop proof gates.

## Acceptance Criteria

- A tester can open CueForge and see one setup answer without reading docs.
- The answer always includes one next action.
- Unsafe apply states are visibly locked with a specific reason.
- Desktop mode can show WASAPI loopback proof status without recording audio.
- Browser mode does not claim desktop endpoint proof.
- Redacted exports never include raw endpoint IDs, local paths, or raw audio.
- Existing alpha.5 release behavior remains intact.
