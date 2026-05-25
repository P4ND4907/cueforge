# Pre-Release QA Run

Status: BLOCKED_ENVIRONMENT
Started: 2026-05-25T08:05:03.158Z
Completed: 2026-05-25T08:05:03.165Z

## Command Gates

| Gate | Status | Duration | Command |
| --- | --- | ---: | --- |
| Security and privacy release gate | BLOCKED | 2ms | `npm.cmd test -- src/securityPrivacyGate.test.js src/exportFingerprints.test.js src/privacyAudit.test.js src/electronHardening.test.js` |
| Release readiness matrix | BLOCKED | 1ms | `npm.cmd test -- src/tests/releaseReadinessMatrix.test.js` |
| Swarm manifest contract | BLOCKED | 0ms | `npm.cmd run validate:swarm` |
| Unit and regression tests | BLOCKED | 1ms | `npm.cmd test` |
| Production web build | BLOCKED | 0ms | `npm.cmd run build` |
| Panda Notes repair queue | BLOCKED | 1ms | `npm.cmd run notes:repair` |
| Dependency audit | BLOCKED | 0ms | `npm.cmd audit --audit-level=moderate` |

## Panda Notes Gate

- Status: no-notes-yet
- Notes scanned: 0
- Repair actions: 0
- Boundary: CueForge can auto-triage local notes and generate a repair packet. Source edits still need a developer or explicit desktop automation review.

## Privacy Gates

| Check | Status |
| --- | --- |
| Generated private report excluded: tools/cueforge-audio-setup-report.json | PASS |
| Generated private report excluded: release/win-unpacked/resources/tools/cueforge-audio-setup-report.json | PASS |
| Generated private report excluded: release/win-unpacked/resources/app.asar.unpacked/tools/cueforge-audio-setup-report.json | PASS |

## Human-Found Bug Standard

A tester-found issue is not considered fixed until it has:

1. A reproduction path written in plain player language.
2. A smallest-useful source fix.
3. A unit or data regression test when the behavior can be tested without a browser.
4. A live browser proof for the actual player flow.
5. No console errors, no offscreen UI, no privacy leak, and no hidden Windows/audio change.
6. A release-note or repair-queue entry if players already saw the bug.

## Live Browser Cases To Run Before Sharing

1. Open the app from a fresh browser state and confirm the first useful screen is clear.
2. Right-click the top-left, center, bottom-right, and mobile-width areas; Panda Note must stay inside the window and remain typeable.
3. Save one Panda Note, export notes, run `npm run notes:repair`, and verify the note becomes a repair queue item.
4. Run Self Test with mic permission allowed, denied, and skipped; each state needs clear recovery copy.
5. Open Auto Detect in browser mode and desktop mode; browser must explain the boundary, desktop must load the Windows bridge report.
6. Create a Report Lab packet, import it back, and confirm EQ/game/source/mic state is restored.
7. Sweep desktop, tablet, and mobile widths for horizontal overflow, clipped buttons, trapped popovers, and unreadable long text.
8. Confirm Settings starts quiet: background audio off, cinematic audio off, and no surprise playback.

## Logs

### Security and privacy release gate

```text
EPERM: spawnSync cmd.exe EPERM
```
_No output._

### Release readiness matrix

```text
EPERM: spawnSync cmd.exe EPERM
```
_No output._

### Swarm manifest contract

```text
EPERM: spawnSync cmd.exe EPERM
```
_No output._

### Unit and regression tests

```text
EPERM: spawnSync cmd.exe EPERM
```
_No output._

### Production web build

```text
EPERM: spawnSync cmd.exe EPERM
```
_No output._

### Panda Notes repair queue

```text
EPERM: spawnSync cmd.exe EPERM
```
_No output._

### Dependency audit

```text
EPERM: spawnSync cmd.exe EPERM
```
_No output._

