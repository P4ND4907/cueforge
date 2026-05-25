# CueForge Alpha 2 Hardening Notes

Status: staged, not a public blast.

This update is about making CueForge easier to hand to real testers without babysitting every step.

## What Changed

- Setup now has a short summary of the player chain before they enter the main app.
- Blocked mic/device permission states now show plain recovery steps instead of vague warnings.
- Auto Detect explains exactly how to recover hidden device names and keeps the copy/paste setup summary redacted.
- Self Test now includes a privacy export audit.
- System Info now has a Privacy Export Audit panel for reports, setup summaries, self-test logs, Panda Notes, and export packs.
- Panda Notes now have review states: open, reviewed, fixed, needs retest, and archived.
- Issue Pattern Memory now groups recurring real-world problems into local debug playbooks for mic gain, Discord, Sonar/APO routing, game/server timing, footstep masking, IEM fatigue, UI flow, privacy, and performance.
- The release queue now treats open or needs-retest notes as proof gaps before broader updates.

## Proof From This Pass

- `npm.cmd test`: 25 files / 76 tests passed.
- `npm.cmd run build`: passed.
- GitHub Pages bundle refreshed from the production build.
- Live browser smoke: System Info, Issue Pattern Memory, Privacy Export Audit, Auto Detect, and Self Test opened with no console errors and no horizontal overflow.
- In-browser Self Test: 11 pass, 2 expected browser-mode warnings, 0 failures.

## Expected Warnings

Browser mode can still warn when:

- microphone permission is blocked or skipped,
- the desktop bridge is not active,
- native Windows scan/apply steps require the desktop shell.

Those are not bypassed silently. CueForge explains the recovery path and keeps the tester in control.

## Safe Tester Copy

CueForge hardening update:

No flashy feature today. This pass was about making the app easier to trust when real players test it.

New in this pass:

- clearer setup summary
- permission recovery when mic/device access is blocked
- privacy audit before exports or public updates
- Panda Notes review states for UI bugs
- release queue that waits for proof instead of hype
- issue pattern memory for recurring real-world setup problems

The goal is simple: open CueForge, run the setup, play one real match, and send feedback that can actually be reproduced.

App: https://p4nd4907.github.io/cueforge/
Feedback: https://github.com/P4ND4907/cueforge/issues/1
