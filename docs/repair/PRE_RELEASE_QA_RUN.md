# Pre-Release QA Run

Status: PASS
Started: 2026-07-12T05:05:44.215Z
Completed: 2026-07-12T05:05:55.044Z

## Command Gates

| Gate | Status | Duration | Command |
| --- | --- | ---: | --- |
| Security and privacy release gate | PASS | 1539ms | `npm.cmd test -- src/securityPrivacyGate.test.js src/exportFingerprints.test.js src/privacyAudit.test.js src/electronHardening.test.js` |
| Release readiness matrix | PASS | 2570ms | `npm.cmd test -- src/tests/releaseReadinessMatrix.test.js` |
| Swarm manifest contract | PASS | 793ms | `npm.cmd run validate:swarm` |
| Unit and regression tests | PASS | 3562ms | `npm.cmd test` |
| Production web build | PASS | 950ms | `npm.cmd run build` |
| Panda Notes repair queue | PASS | 361ms | `npm.cmd run notes:repair` |
| Dependency audit | PASS | 1052ms | `npm.cmd audit --audit-level=moderate` |

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
> cueforge@0.2.0-alpha.6 test
> vitest run src/securityPrivacyGate.test.js src/exportFingerprints.test.js src/privacyAudit.test.js src/electronHardening.test.js


 RUN  v4.1.7 C:/Users/khepr/Documents/Playground/_repos/active/cueforge


 Test Files  4 passed (4)
      Tests  11 passed (11)
   Start at  21:05:45
   Duration  543ms (transform 292ms, setup 0ms, import 433ms, tests 37ms, environment 0ms)
```

### Release readiness matrix

```text
> cueforge@0.2.0-alpha.6 test
> vitest run src/tests/releaseReadinessMatrix.test.js


 RUN  v4.1.7 C:/Users/khepr/Documents/Playground/_repos/active/cueforge


 Test Files  1 passed (1)
      Tests  17 passed (17)
   Start at  21:05:47
   Duration  911ms (transform 229ms, setup 0ms, import 352ms, tests 145ms, environment 0ms)
```

### Swarm manifest contract

```text
> cueforge@0.2.0-alpha.6 validate:swarm
> vitest run src/tests/swarmManifests.test.js


 RUN  v4.1.7 C:/Users/khepr/Documents/Playground/_repos/active/cueforge


 Test Files  1 passed (1)
      Tests  4 passed (4)
   Start at  21:05:48
   Duration  185ms (transform 30ms, setup 0ms, import 42ms, tests 9ms, environment 0ms)
```

### Unit and regression tests

```text
> cueforge@0.2.0-alpha.6 test
> vitest run


 RUN  v4.1.7 C:/Users/khepr/Documents/Playground/_repos/active/cueforge


 Test Files  98 passed (98)
      Tests  392 passed (392)
   Start at  21:05:49
   Duration  2.89s (transform 5.52s, setup 0ms, import 8.59s, tests 3.59s, environment 10ms)
```

### Production web build

```text
> cueforge@0.2.0-alpha.6 build
> vite build

vite v8.0.16 building client environment for production...
transforming...ok 1649 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                             3.53 kB | gzip:   1.15 kB
dist/assets/index-CgWRqwDl.css             69.07 kB | gzip:  13.40 kB
dist/assets/rolldown-runtime-QTnfLwEv.js    0.69 kB | gzip:   0.42 kB
dist/assets/index-C2DNY5qT.js             718.65 kB | gzip: 223.12 kB
dist/assets/three-CAFJ9an3.js             722.67 kB | gzip: 184.17 kB

ok built in 424ms
```

### Panda Notes repair queue

```text
> cueforge@0.2.0-alpha.6 notes:repair
> node tools/Run-PandaNotesRepair.mjs

Panda Notes repair run: no-notes-yet
Notes scanned: 0
Repair actions: 0
Output: docs/repair
```

### Dependency audit

```text
found 0 vulnerabilities
```

